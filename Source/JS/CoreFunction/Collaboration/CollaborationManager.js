/* =========================================
   Collaboration Manager (v5 — Delta Commit-Accept)
   =========================================
   Top-level orchestrator for collaboration.
   
   Key design principles: 
   1. Track `collabProjectId` — only sync events from this project
   2. Creator pushes their project to Yjs on room creation
   3. Joiner waits for Yjs initial sync, then creates a NEW local 
      project from received Yjs data (never overwrites existing)
   4. ALL changes use delta commit / accept — only changed items are 
      sent and merged, preserving independent work on both sides
   5. Bitmap layer locks prevent simultaneous edits on the same layer
   ========================================= */

import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { COLLAB_DEFAULTS } from '../../Config/collabConfig.js';
import { SyncAdapter } from './SyncAdapter.js';
import { AwarenessManager } from './AwarenessManager.js';

export class CollaborationManager {
    constructor() {
        /** @type {Y.Doc|null} */
        this.ydoc = null;

        /** @type {WebsocketProvider|null} */
        this.provider = null;

        /** @type {SyncAdapter|null} */
        this.syncAdapter = null;

        /** @type {AwarenessManager|null} */
        this.awarenessManager = null;

        /** Current room name */
        this.roomName = null;

        /** Current user identity */
        this.localUser = null;

        /** 
         * The local projectModel project ID being collaborated on.
         * ALL sync operations are scoped to this project only.
         * @type {string|null} 
         */
        this.collabProjectId = null;

        /** Connection state: 'disconnected' | 'connecting' | 'connected' */
        this.connectionState = 'disconnected';

        /** Server URL */
        this.serverUrl = COLLAB_DEFAULTS.SERVER_URL;

        /** Whether collaboration is active and syncing */
        this.isActive = false;

        /** Whether this user created the room */
        this.isOwner = false;

        this._boundHandlers = {};
    }

    /**
     * Check if the currently active project is the collab project.
     * Used by event handlers to filter out unrelated project events.
     */
    isCollabProject() {
        if (!this.isActive || !this.collabProjectId) return false;
        return window.projectModel?.activeProjectId === this.collabProjectId;
    }

    /**
     * Create a new collaboration room for the active project.
     * @param {string} userName
     * @param {string} [serverUrl]
     * @returns {string|null} roomName code to share
     */
    createRoom(userName, serverUrl) {
        if (this.isActive) {
            this.leaveRoom();
        }

        if (serverUrl) this.serverUrl = serverUrl;

        const project = window.projectModel?.data;
        if (!project) {
            window.infoSystem?.showInfo('warning', 'Collaboration.NoActiveProject', 2000);
            return null;
        }

        // Lock which project we're collaborating on
        this.collabProjectId = project.id;
        this.isOwner = true;

        this.roomName = `vv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
        this.localUser = {
            name: userName || 'User',
            color: this._pickUserColor(),
            isOwner: true,
            joinedAt: Date.now()
        };

        this._connect(() => {
            // Push current project state into Yjs (one-time baseline)
            if (this.syncAdapter) {
                this.syncAdapter.pushProjectToYjs(project);
                console.log('[Collab] Room created, project pushed:', this.collabProjectId);
            }
            // Start listening for remote commit notifications + locks
            this.syncAdapter.enableRemoteObservers();
        });

        return this.roomName;
    }

    /**
     * Join an existing collaboration room.
     * Will create a NEW local project from the Yjs data.
     * @param {string} roomName
     * @param {string} userName
     * @param {string} [serverUrl]
     */
    joinRoom(roomName, userName, serverUrl) {
        if (this.isActive) {
            this.leaveRoom();
        }

        if (serverUrl) this.serverUrl = serverUrl;

        this.roomName = roomName;
        this.isOwner = false;
        this.localUser = {
            name: userName || 'User',
            color: this._pickUserColor(),
            isOwner: false,
            joinedAt: Date.now()
        };

        this._connect(() => {
            // Wait for initial Yjs document sync, then build local project
            const doJoin = () => {
                this._onJoinSynced();
            };

            if (this.provider.synced) {
                doJoin();
            } else {
                this.provider.once('synced', doJoin);
            }
        });
    }

    /**
     * Called once Yjs has synced — creates a local project from shared data.
     */
    _onJoinSynced() {
        if (!this.syncAdapter) return;

        const localProjectId = this.syncAdapter.createProjectFromYjs();
        if (localProjectId) {
            this.collabProjectId = localProjectId;
            console.log('[Collab] Joined room, local project:', this.collabProjectId);

            // Start listening for remote commit notifications + locks
            this.syncAdapter.enableRemoteObservers();

            window.infoSystem?.showInfo('success', 'Collaboration.JoinedRoom', 2000);
        } else {
            window.infoSystem?.showInfo('error', 'Collaboration.JoinFailed', 3000);
            this.leaveRoom();
        }
    }

    /**
     * Leave the current collaboration room. Collab project stays open locally.
     */
    leaveRoom() {
        if (!this.isActive && !this.provider) return;

        if (this.awarenessManager) {
            this.awarenessManager.destroy();
            this.awarenessManager = null;
        }

        if (this.syncAdapter) {
            this.syncAdapter.destroy();
            this.syncAdapter = null;
        }

        if (this.provider) {
            this.provider.disconnect();
            this.provider.destroy();
            this.provider = null;
        }

        if (this.ydoc) {
            this.ydoc.destroy();
            this.ydoc = null;
        }

        this.roomName = null;
        this.localUser = null;
        this.collabProjectId = null;
        this.isActive = false;
        this.isOwner = false;
        this._setConnectionState('disconnected');

        window.dispatchEvent(new CustomEvent('collabStateChanged', {
            detail: { active: false, room: null, users: [] }
        }));

        window.infoSystem?.showInfo('info', 'Collaboration.Disconnected', 2000);
    }

    getActiveUsers() {
        if (!this.awarenessManager) return [];
        return this.awarenessManager.getUsers();
    }

    // ========================
    // Commit / Accept API
    // ========================

    /**
     * Commit all current project changes to share with remote users.
     * @param {string} [description]
     * @returns {string|null} commitId
     */
    commitChanges(description) {
        if (!this.syncAdapter) return null;
        const commitId = this.syncAdapter.commitChanges(description);
        if (commitId) {
            window.infoSystem?.showInfo('success',
                window.languageManager?.t('Collaboration.CommitSent') || 'Changes committed', 2000);
        } else {
            window.infoSystem?.showInfo('warning',
                window.languageManager?.t('Collaboration.CommitEmpty') || 'No changes to commit', 2000);
        }
        return commitId;
    }

    /**
     * Accept all incoming commits from remote users.
     * @returns {number} number of commits accepted
     */
    acceptAllChanges() {
        if (!this.syncAdapter) return 0;
        const count = this.syncAdapter.acceptAllCommits();
        if (count > 0) {
            window.infoSystem?.showInfo('success',
                `${window.languageManager?.t('Collaboration.AcceptedChanges') || 'Accepted'} (${count})`, 2000);
        } else {
            window.infoSystem?.showInfo('info',
                window.languageManager?.t('Collaboration.NoIncomingChanges') || 'No incoming changes', 2000);
        }
        return count;
    }

    /**
     * Get count of incoming commits from remote users.
     */
    getIncomingCommitCount() {
        if (!this.syncAdapter) return 0;
        return this.syncAdapter.getIncomingCommitCount();
    }

    requestBitmapLock(layerId) {
        if (!this.syncAdapter) return true;
        return this.syncAdapter.requestBitmapLock(layerId);
    }

    releaseBitmapLock(layerId) {
        if (!this.syncAdapter) return;
        this.syncAdapter.releaseBitmapLock(layerId);
    }

    getBitmapLockState(layerId) {
        if (!this.syncAdapter) return { locked: false, lockedBy: null };
        return this.syncAdapter.getBitmapLockState(layerId);
    }

    // ========================
    // Private
    // ========================

    /**
     * @param {Function} onReady - Called once WebSocket is connected
     */
    _connect(onReady) {
        this.ydoc = new Y.Doc();
        this._setConnectionState('connecting');

        this.provider = new WebsocketProvider(
            this.serverUrl,
            this.roomName,
            this.ydoc,
            {
                connect: true,
                resyncInterval: 5000,
                maxBackoffTime: COLLAB_DEFAULTS.RECONNECT_INTERVAL * COLLAB_DEFAULTS.MAX_RECONNECT_ATTEMPTS
            }
        );

        let readyCalled = false;

        this.provider.on('status', ({ status }) => {
            if (status === 'connected') {
                this._setConnectionState('connected');
                this.isActive = true;

                window.dispatchEvent(new CustomEvent('collabStateChanged', {
                    detail: {
                        active: true,
                        room: this.roomName,
                        user: this.localUser,
                        users: this.getActiveUsers()
                    }
                }));

                window.infoSystem?.showInfo('success', 'Collaboration.Connected', 2000);

                if (!readyCalled && onReady) {
                    readyCalled = true;
                    onReady();
                }
            } else if (status === 'disconnected') {
                this._setConnectionState('disconnected');
            }
        });

        this.provider.on('connection-error', () => {
            window.infoSystem?.showInfo('error', 'Collaboration.ConnectionError', 3000);
        });

        // Create SyncAdapter (sets up Yjs shared types but does NOT observe yet)
        this.syncAdapter = new SyncAdapter(this.ydoc, this);

        // Create AwarenessManager
        this.awarenessManager = new AwarenessManager(this.provider.awareness, this.localUser);
    }

    _setConnectionState(state) {
        this.connectionState = state;
        window.dispatchEvent(new CustomEvent('collabConnectionStateChanged', {
            detail: { state }
        }));
    }

    /**
     * Bind local project events → Yjs.
     * In v4, no real-time forwarding — all changes go through commit/accept.
     * This is kept as a no-op for structural compatibility.
     */
    _bindProjectEvents() {
        // No-op: all sync is via explicit commit/accept
    }

    _unbindProjectEvents() {
        // No-op
    }

    _pickUserColor() {
        const colors = COLLAB_DEFAULTS.USER_COLORS;
        return colors[Math.floor(Math.random() * colors.length)];
    }
}
