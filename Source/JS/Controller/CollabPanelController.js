/* =========================================
   Collaboration Panel Controller
   =========================================
   Manages the collaboration UI:
   - Connection status indicator (in InfoBar)
   - User list panel
   - Room create/join dialog
   - Layer lock indicators
   ========================================= */

export class CollabPanelController {
    constructor() {
        /** @type {HTMLElement|null} */
        this.statusIndicator = null;

        /** @type {HTMLButtonElement[]} */
        this._userBtns = [];

        /** @type {HTMLElement|null} */
        this.changesBtn = null;

        /** @type {HTMLElement|null} */
        this._infoBarRight = null;

        /** @type {HTMLElement|null} */
        this.userListPanel = null;

        /** @type {HTMLElement|null} */
        this.dialogOverlay = null;

        /** Incoming commit count badge */
        this._incomingCount = 0;

        this._boundHandlers = {};
    }

    /**
     * Initialize the UI elements. Called after DOM is ready.
     */
    init() {
        this._createStatusIndicator();
        this._createUserListPanel();
        this._bindEvents();
    }

    /**
     * Show the create/join room dialog.
     */
    showRoomDialog() {
        if (this.dialogOverlay) {
            this.dialogOverlay.remove();
            this.dialogOverlay = null;
        }

        const isConnected = window.collabManager?.isActive;

        // Create dialog container (reuse standard dialog structure)
        this.dialogOverlay = document.createElement('div');
        this.dialogOverlay.className = 'dialog-container';

        // Mask
        const mask = document.createElement('div');
        mask.className = 'dialog-mask';
        mask.onclick = () => this._closeDialog();
        this.dialogOverlay.appendChild(mask);

        // Window
        const win = document.createElement('div');
        win.className = 'dialog-window collab-dialog-window';
        this.dialogOverlay.appendChild(win);

        // Header
        const header = document.createElement('div');
        header.className = 'dialog-header';
        const title = document.createElement('span');
        title.className = 'dialog-title';
        title.setAttribute('data-i18n', 'Collaboration.Dialog.Title');
        title.textContent = window.languageManager?.t('Collaboration.Dialog.Title') || 'Collaboration';
        header.appendChild(title);
        win.appendChild(header);

        // Body
        const body = document.createElement('div');
        body.className = 'dialog-body';
        body.innerHTML = isConnected ? this._renderConnectedView() : this._renderDisconnectedView();
        win.appendChild(body);

        // Footer
        const footer = document.createElement('div');
        footer.className = 'dialog-footer';
        footer.innerHTML = isConnected ? this._renderConnectedFooter() : this._renderDisconnectedFooter();
        win.appendChild(footer);

        document.body.appendChild(this.dialogOverlay);

        // Show with animation
        requestAnimationFrame(() => {
            this.dialogOverlay?.classList.add('is-visible');
        });

        // Bind dialog events
        if (isConnected) {
            this._bindConnectedDialogEvents();
        } else {
            this._bindDisconnectedDialogEvents();
        }

        // Translate
        if (window.languageManager) {
            window.languageManager.updateUI();
        }
    }

    /**
     * Close the dialog with fade-out animation.
     */
    _closeDialog() {
        if (!this.dialogOverlay) return;
        this.dialogOverlay.classList.remove('is-visible');
        const overlay = this.dialogOverlay;
        this.dialogOverlay = null;
        setTimeout(() => overlay.remove(), 200);
    }

    // ========================
    // Status Indicator (InfoBar)
    // ========================

    _createStatusIndicator() {
        const infoBar = document.querySelector('.info-bar');
        if (!infoBar) return;
        this._infoBarRight = infoBar.querySelector('.info-bar__right');
        if (!this._infoBarRight) return;

        // Only create the status button; user buttons and changes button
        // are added/removed from DOM dynamically so :last-child corner works.
        this.statusIndicator = document.createElement('button');
        this.statusIndicator.className = 'info-bar__btn info-bar__btn--state-ready collab-status-btn';
        this.statusIndicator.innerHTML = `
            <span class="collab-status-dot collab-status-dot--disconnected"></span>
            <span class="collab-status-text" data-i18n="Collaboration.Status.Offline">Offline</span>
        `;
        this.statusIndicator.onclick = () => this.showRoomDialog();
        this._infoBarRight.appendChild(this.statusIndicator);
    }

    _updateStatusIndicator(state) {
        if (!this.statusIndicator) return;

        const dot = this.statusIndicator.querySelector('.collab-status-dot');
        const text = this.statusIndicator.querySelector('.collab-status-text');

        // Remove old state classes
        this.statusIndicator.classList.remove(
            'info-bar__btn--state-ready',
            'info-bar__btn--state-success',
            'info-bar__btn--state-warning',
            'info-bar__btn--state-error'
        );

        dot.className = 'collab-status-dot';

        switch (state) {
            case 'connected':
                this.statusIndicator.classList.add('info-bar__btn--state-success');
                dot.classList.add('collab-status-dot--connected');
                text.setAttribute('data-i18n', 'Collaboration.Status.Online');
                text.textContent = window.languageManager?.t('Collaboration.Status.Online') || 'Online';
                break;
            case 'connecting':
                this.statusIndicator.classList.add('info-bar__btn--state-warning');
                dot.classList.add('collab-status-dot--connecting');
                text.setAttribute('data-i18n', 'Collaboration.Status.Connecting');
                text.textContent = window.languageManager?.t('Collaboration.Status.Connecting') || 'Connecting...';
                break;
            default:
                this.statusIndicator.classList.add('info-bar__btn--state-ready');
                dot.classList.add('collab-status-dot--disconnected');
                text.setAttribute('data-i18n', 'Collaboration.Status.Offline');
                text.textContent = window.languageManager?.t('Collaboration.Status.Offline') || 'Offline';
        }
    }

    _updateUserAvatars(users) {
        if (!this._infoBarRight) return;

        // Remove old user buttons from DOM
        this._userBtns.forEach(btn => btn.remove());
        this._userBtns = [];

        const remoteUsers = users.filter(u => !u.isLocal);
        if (remoteUsers.length === 0) return;

        const maxShow = 3;
        const toShow = remoteUsers.slice(0, maxShow);

        // Insert before changesBtn if present, otherwise append
        const refNode = this.changesBtn?.parentNode ? this.changesBtn : null;

        toShow.forEach(user => {
            const btn = document.createElement('button');
            btn.className = 'info-bar__btn collab-user-btn';
            btn.style.backgroundColor = user.color;
            btn.textContent = user.name.charAt(0).toUpperCase();
            btn.title = user.name;
            btn.onclick = () => this.showRoomDialog();
            if (refNode) {
                this._infoBarRight.insertBefore(btn, refNode);
            } else {
                this._infoBarRight.appendChild(btn);
            }
            this._userBtns.push(btn);
        });

        if (remoteUsers.length > maxShow) {
            const moreBtn = document.createElement('button');
            moreBtn.className = 'info-bar__btn collab-user-btn collab-user-btn--more';
            moreBtn.textContent = `+${remoteUsers.length - maxShow}`;
            moreBtn.onclick = () => this.showRoomDialog();
            if (refNode) {
                this._infoBarRight.insertBefore(moreBtn, refNode);
            } else {
                this._infoBarRight.appendChild(moreBtn);
            }
            this._userBtns.push(moreBtn);
        }
    }

    // ========================
    // User List Panel
    // ========================

    _createUserListPanel() {
        this.userListPanel = document.createElement('div');
        this.userListPanel.className = 'collab-user-list-panel';
        this.userListPanel.style.display = 'none';
    }

    _updateUserList(users) {
        if (!this.userListPanel) return;

        this.userListPanel.innerHTML = `
            <div class="collab-user-list-header">
                <span data-i18n="Collaboration.UserList.Title">Users (${users.length})</span>
            </div>
            <div class="collab-user-list-body">
                ${users.map(user => `
                    <div class="collab-user-item ${user.isLocal ? 'collab-user-item--local' : ''}">
                        <div class="collab-user-avatar" style="background-color:${user.color}">
                            ${user.name.charAt(0).toUpperCase()}
                        </div>
                        <div class="collab-user-info">
                            <span class="collab-user-name">${this._escapeHtml(user.name)}${user.isLocal ? ' (You)' : ''}${user.isOwner ? ' ★' : ''}</span>
                            <span class="collab-user-tool">${user.activeTool || ''}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // ========================
    // Dialog Views
    // ========================

    _renderDisconnectedView() {
        return `
            <div class="collab-form">
                <div class="collab-form-field">
                    <label class="collab-form-label" data-i18n="Collaboration.Dialog.YourName">Your Name</label>
                    <input type="text" id="collab-username" class="text-input text-input--field"
                           placeholder="Enter your name" maxlength="32"
                           value="${this._escapeHtml(localStorage.getItem('collab_username') || '')}">
                </div>
                <div class="collab-form-field">
                    <label class="collab-form-label" data-i18n="Collaboration.Dialog.ServerURL">Server URL</label>
                    <input type="text" id="collab-server-url" class="text-input text-input--field"
                           placeholder="ws://localhost:4444"
                           value="${this._escapeHtml(localStorage.getItem('collab_server_url') || 'ws://localhost:4444')}">
                </div>
                <div class="collab-divider">
                    <span data-i18n="Collaboration.Dialog.Or">OR</span>
                </div>
                <div class="collab-form-field">
                    <label class="collab-form-label" data-i18n="Collaboration.Dialog.RoomCode">Room Code</label>
                    <input type="text" id="collab-room-code" class="text-input text-input--field"
                           placeholder="Enter room code to join" maxlength="128">
                </div>
            </div>
        `;
    }

    _renderDisconnectedFooter() {
        return `
            <button id="collab-join-btn" class="dialog-btn is-normal" data-i18n="Collaboration.Dialog.Join">Join Room</button>
            <button id="collab-create-btn" class="dialog-btn is-recommend" data-i18n="Collaboration.Dialog.Create">Create Room</button>
        `;
    }

    _renderConnectedView() {
        const manager = window.collabManager;
        const users = manager?.getActiveUsers() || [];
        const incomingCount = manager?.getIncomingCommitCount() || 0;

        return `
            <div class="collab-connected">
                <div class="collab-form-field">
                    <label class="collab-form-label" data-i18n="Collaboration.Dialog.RoomCode">Room Code</label>
                    <div class="collab-room-code">
                        <code id="collab-room-display">${this._escapeHtml(manager?.roomName || '')}</code>
                        <button id="collab-copy-btn" class="dialog-btn is-ghost collab-copy-btn" data-i18n="Collaboration.Dialog.Copy">Copy</button>
                    </div>
                </div>

                <div class="collab-sync-actions">
                    <button id="collab-commit-btn" class="dialog-btn is-recommend" data-i18n="Collaboration.Dialog.Commit">
                        Commit Changes
                    </button>
                    <button id="collab-accept-btn" class="dialog-btn is-normal" data-i18n="Collaboration.Dialog.Accept">
                        Accept Changes
                        ${incomingCount > 0 ? `<span class="collab-badge">${incomingCount}</span>` : ''}
                    </button>
                </div>

                <div class="collab-form-field">
                    <label class="collab-form-label" data-i18n="Collaboration.Dialog.ConnectedUsers">Connected Users</label>
                    <div class="collab-user-list">
                        ${users.map(u => `
                            <div class="collab-user-item">
                                <div class="collab-user-avatar" style="background-color:${u.color}">${u.name.charAt(0).toUpperCase()}</div>
                                <span class="collab-user-name">${this._escapeHtml(u.name)}${u.isLocal ? ' (You)' : ''}${u.isOwner ? ' ★' : ''}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    _renderConnectedFooter() {
        return `
            <button id="collab-leave-btn" class="dialog-btn is-danger" data-i18n="Collaboration.Dialog.Leave">Leave Room</button>
        `;
    }

    _bindDisconnectedDialogEvents() {
        const createBtn = this.dialogOverlay.querySelector('#collab-create-btn');
        const joinBtn = this.dialogOverlay.querySelector('#collab-join-btn');

        createBtn?.addEventListener('click', () => {
            const username = this.dialogOverlay.querySelector('#collab-username')?.value?.trim();
            const serverUrl = this.dialogOverlay.querySelector('#collab-server-url')?.value?.trim();

            if (!username) {
                window.infoSystem?.showInfo('warning', 'Collaboration.EnterName', 2000);
                return;
            }

            // Validate server URL format
            if (serverUrl && !serverUrl.match(/^wss?:\/\/.+/)) {
                window.infoSystem?.showInfo('warning', 'Collaboration.InvalidServerURL', 2000);
                return;
            }

            // Save preferences
            localStorage.setItem('collab_username', username);
            if (serverUrl) localStorage.setItem('collab_server_url', serverUrl);

            const roomName = window.collabManager?.createRoom(username, serverUrl || undefined);
            if (roomName) {
                // Refresh dialog to show connected view
                setTimeout(() => this.showRoomDialog(), 500);
            }
        });

        joinBtn?.addEventListener('click', () => {
            const username = this.dialogOverlay.querySelector('#collab-username')?.value?.trim();
            const roomCode = this.dialogOverlay.querySelector('#collab-room-code')?.value?.trim();
            const serverUrl = this.dialogOverlay.querySelector('#collab-server-url')?.value?.trim();

            if (!username) {
                window.infoSystem?.showInfo('warning', 'Collaboration.EnterName', 2000);
                return;
            }
            if (!roomCode) {
                window.infoSystem?.showInfo('warning', 'Collaboration.EnterRoomCode', 2000);
                return;
            }

            // Validate server URL format
            if (serverUrl && !serverUrl.match(/^wss?:\/\/.+/)) {
                window.infoSystem?.showInfo('warning', 'Collaboration.InvalidServerURL', 2000);
                return;
            }

            localStorage.setItem('collab_username', username);
            if (serverUrl) localStorage.setItem('collab_server_url', serverUrl);

            window.collabManager?.joinRoom(roomCode, username, serverUrl || undefined);
            setTimeout(() => this.showRoomDialog(), 500);
        });
    }

    _bindConnectedDialogEvents() {
        const copyBtn = this.dialogOverlay.querySelector('#collab-copy-btn');
        const leaveBtn = this.dialogOverlay.querySelector('#collab-leave-btn');
        const commitBtn = this.dialogOverlay.querySelector('#collab-commit-btn');
        const acceptBtn = this.dialogOverlay.querySelector('#collab-accept-btn');

        copyBtn?.addEventListener('click', () => {
            const roomCode = window.collabManager?.roomName;
            if (roomCode) {
                navigator.clipboard.writeText(roomCode).then(() => {
                    window.infoSystem?.showInfo('success', 'Collaboration.RoomCodeCopied', 1500);
                });
            }
        });

        commitBtn?.addEventListener('click', () => {
            window.collabManager?.commitChanges();
        });

        acceptBtn?.addEventListener('click', () => {
            window.collabManager?.acceptAllChanges();
            // Refresh badge
            this._refreshAcceptBadge();
        });

        leaveBtn?.addEventListener('click', () => {
            window.collabManager?.leaveRoom();
            this._closeDialog();
        });
    }

    // ========================
    // Event Bindings
    // ========================

    _bindEvents() {
        this._boundHandlers.onConnectionState = (e) => {
            this._updateStatusIndicator(e.detail.state);
        };

        this._boundHandlers.onUsersChanged = (e) => {
            const users = e.detail.users || [];
            this._updateUserAvatars(users);
            this._updateUserList(users);
        };

        this._boundHandlers.onCollabState = (e) => {
            if (e.detail.active) {
                this._updateStatusIndicator('connected');
                this._updateUserAvatars(e.detail.users || []);
            } else {
                this._updateStatusIndicator('disconnected');
                this._updateUserAvatars([]);  // removes user buttons from DOM
                this._incomingCount = 0;
                this._updateBadge(0);          // removes changes button from DOM
            }
        };

        this._boundHandlers.onCommitsChanged = (e) => {
            const count = e.detail?.count ?? (window.collabManager?.getIncomingCommitCount() || 0);
            this._incomingCount = count;
            this._updateBadge(count);
        };

        window.addEventListener('collabConnectionStateChanged', this._boundHandlers.onConnectionState);
        window.addEventListener('collabUsersChanged', this._boundHandlers.onUsersChanged);
        window.addEventListener('collabStateChanged', this._boundHandlers.onCollabState);
        window.addEventListener('collabCommitsChanged', this._boundHandlers.onCommitsChanged);
    }

    /**
     * Update the badge count on the status indicator and the accept button.
     */
    _updateBadge(count) {
        if (!this._infoBarRight) return;

        if (count > 0) {
            // Create changes button if needed
            if (!this.changesBtn) {
                this.changesBtn = document.createElement('button');
                this.changesBtn.className = 'info-bar__btn info-bar__btn--state-info collab-changes-btn';
                this.changesBtn.onclick = () => this.showRoomDialog();
            }
            const label = (window.languageManager?.t('Collaboration.IncomingCount') || 'Incoming: {0}').replace('{0}', count);
            this.changesBtn.textContent = label;
            // Ensure it's in the DOM (always last)
            if (!this.changesBtn.parentNode) {
                this._infoBarRight.appendChild(this.changesBtn);
            }
        } else {
            // Remove from DOM so :last-child falls to the previous button
            if (this.changesBtn?.parentNode) {
                this.changesBtn.remove();
            }
        }

        // Dialog accept button badge (if dialog is open)
        this._refreshAcceptBadge();
    }

    /**
     * Refresh the accept button badge in the dialog (if open).
     */
    _refreshAcceptBadge() {
        if (!this.dialogOverlay) return;
        const acceptBtn = this.dialogOverlay.querySelector('#collab-accept-btn');
        if (!acceptBtn) return;

        const count = window.collabManager?.getIncomingCommitCount() || 0;
        let badge = acceptBtn.querySelector('.collab-badge');
        if (count > 0) {
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'collab-badge';
                acceptBtn.appendChild(badge);
            }
            badge.textContent = count;
        } else if (badge) {
            badge.remove();
        }
    }

    // ========================
    // Utils
    // ========================

    _escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
}
