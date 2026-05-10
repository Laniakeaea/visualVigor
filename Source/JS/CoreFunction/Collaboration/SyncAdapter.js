/* =========================================
   Sync Adapter (v5 — Delta Commit-Accept)
   =========================================
   Bridges Yjs shared document ←→ ProjectModel.

   Sync strategy — ALL changes use commit / accept with DELTA tracking:
   • A "baseline" snapshot is captured after each push / join / commit / accept
   • On "Commit" → only items that CHANGED since baseline are included
   • On "Accept" → only the incoming delta is MERGED into local state,
     preserving the acceptor's own unrelated work

   Delta granularity:
   • Bitmap pixels — per-layer per-frame (only changed canvases)
   • Layer structure — added / removed / property-changed / reordered
   • Vector tree — full replacement only IF changed
   • Settings — per-property (color, artboard, duration, etc.)
   • Guides — full replacement only IF changed
   • Current frame — only IF changed

   Real-time (non-commit):
   • Awareness (user cursors / presence) — via AwarenessManager
   • Bitmap layer locks — via yBitmapLocks
   • Commit notifications — via yCommits observer (badge count only)

   Key design principles:
   1. Remote observers skip local transactions (no echo)
   2. All remote writes target the collab project only
   3. createProjectFromYjs() for joiner initial pull
   4. Delta commits preserve independent work on both sides
   ========================================= */

import * as Y from 'yjs';
import { COLLAB_DEFAULTS } from '../../Config/collabConfig.js';
import { LAYER_TYPES } from '../Project/projectModel.js';

export class SyncAdapter {
    /**
     * @param {Y.Doc} ydoc
     * @param {import('./CollaborationManager.js').CollaborationManager} collabManager
     */
    constructor(ydoc, collabManager) {
        this.ydoc = ydoc;
        this.collabManager = collabManager;

        this._isRemoteUpdate = false;
        this._remoteObserversEnabled = false;

        // --- Shared Yjs Types ---
        this.yMeta = ydoc.getMap('meta');
        this.ySettings = ydoc.getMap('settings');
        this.yBitmapLayers = ydoc.getArray('bitmapLayers');
        this.yBitmapLocks = ydoc.getMap('bitmapLocks');
        this.yVectorLayer = ydoc.getMap('vectorLayer');
        this.yTimeline = ydoc.getMap('timeline');

        // Baseline bitmap data (initial project state, applied on join)
        this.yBitmapData = ydoc.getMap('bitmapData');

        // Commit-accept queue for bitmap changes
        this.yCommits = ydoc.getMap('commits');

        // Guides
        this.yGuides = ydoc.getArray('guides');

        this._observers = [];

        // --- Track already-accepted commits to prevent re-application ---
        this._acceptedCommitIds = new Set();

        // --- Baseline tracking for delta commits ---
        this._baselineBitmapDataUrls = new Map();  // key → dataUrl
        this._baselineLayerDescriptors = [];       // serialized layer descriptors
        this._baselineVectorJSON = '[]';           // JSON of vector children
        this._baselineSettings = {};               // settings snapshot
        this._baselineGuidesJSON = '[]';           // JSON of guides
        this._baselineCurrentFrame = 0;
    }

    // ========================
    // Helpers
    // ========================

    _getCollabProject() {
        const pm = window.projectModel;
        if (!pm || !this.collabManager.collabProjectId) return null;
        return pm.projects.get(this.collabManager.collabProjectId) || null;
    }

    _isCollabActive() {
        return this.collabManager.isCollabProject();
    }

    // ========================
    // Baseline Snapshot (for delta detection)
    // ========================

    /**
     * Capture the current project state as the baseline.
     * Future commits will be computed as deltas from this baseline.
     * Called after: pushProjectToYjs, createProjectFromYjs, commitChanges, acceptCommit.
     */
    _captureBaseline(project) {
        // Layer descriptors
        this._baselineLayerDescriptors = project.timeline.bitmapLayers.map(
            l => this._serializeLayerDescriptor(l)
        );

        // Bitmap pixel data (dataURL per canvas)
        this._baselineBitmapDataUrls.clear();
        const captureFrames = (layer) => {
            if (!layer?.frames) return;
            for (const [frameIdx, canvas] of Object.entries(layer.frames)) {
                if (canvas instanceof HTMLCanvasElement) {
                    const key = `${layer.id}_frame_${frameIdx}`;
                    this._baselineBitmapDataUrls.set(key, canvas.toDataURL('image/png'));
                }
            }
        };
        for (const layer of project.timeline.bitmapLayers) captureFrames(layer);
        captureFrames(project.timeline.backgroundLayer);

        // Vector tree
        this._baselineVectorJSON = JSON.stringify(
            project.timeline.vectorLayer?.children || []
        );

        // Settings
        this._baselineSettings = {
            fps: project.settings.fps,
            duration: project.settings.duration,
            artboard: JSON.parse(JSON.stringify(project.settings.artboard)),
            camera: JSON.parse(JSON.stringify(project.settings.camera)),
            adjustments: JSON.parse(JSON.stringify(project.settings.adjustments)),
            color: project.settings.color !== undefined
                ? JSON.parse(JSON.stringify(project.settings.color)) : undefined,
            strokeWidth: project.settings.strokeWidth
        };

        // Guides
        this._baselineGuidesJSON = JSON.stringify(project.settings.guides || []);

        // Current frame
        this._baselineCurrentFrame = project.timeline.currentFrame || 0;
    }

    // ========================
    // Creator → Yjs (one-time initial push)
    // ========================

    pushProjectToYjs(project) {
        this.ydoc.transact(() => {
            // Meta
            this.yMeta.set('version', project.meta.version);
            this.yMeta.set('name', project.meta.name);
            this.yMeta.set('author', project.meta.author);
            this.yMeta.set('created', project.meta.created);

            // Settings
            this.ySettings.set('fps', project.settings.fps);
            this.ySettings.set('duration', project.settings.duration);
            this.ySettings.set('artboard', JSON.parse(JSON.stringify(project.settings.artboard)));
            this.ySettings.set('camera', JSON.parse(JSON.stringify(project.settings.camera)));
            this.ySettings.set('adjustments', JSON.parse(JSON.stringify(project.settings.adjustments)));
            if (project.settings.color !== undefined) {
                this.ySettings.set('color', project.settings.color);
            }
            if (project.settings.strokeWidth !== undefined) {
                this.ySettings.set('strokeWidth', project.settings.strokeWidth);
            }

            // Timeline
            this.yTimeline.set('currentFrame', project.timeline.currentFrame);

            // Guides
            if (project.settings.guides && project.settings.guides.length > 0) {
                this.yGuides.push(project.settings.guides.map(g => JSON.parse(JSON.stringify(g))));
            }

            // Bitmap layer descriptors
            project.timeline.bitmapLayers.forEach(layer => {
                this.yBitmapLayers.push([this._serializeLayerDescriptor(layer)]);
            });

            // Baseline bitmap pixel data (for joiners)
            project.timeline.bitmapLayers.forEach(layer => {
                this._pushBitmapFrames(layer);
            });
            if (project.timeline.backgroundLayer) {
                this._pushBitmapFrames(project.timeline.backgroundLayer);
            }

            // Vector layer tree
            this._pushVectorTree(project.timeline.vectorLayer);
        });

        // Capture baseline so future commits are delta-only
        this._captureBaseline(project);
    }

    // ========================
    // Joiner: Yjs → New Local Project
    // ========================

    createProjectFromYjs() {
        const pm = window.projectModel;
        if (!pm) return null;

        const name = this.yMeta.get('name') || 'Collab Project';
        const artboard = this.ySettings.get('artboard');
        if (!artboard || !artboard.width) {
            console.error('[SyncAdapter] No artboard data in Yjs — room may be empty');
            return null;
        }

        const projectId = pm.createProject({
            name: `${name} (Collab)`,
            width: artboard.width,
            height: artboard.height,
            fps: this.ySettings.get('fps') || 24,
            duration: this.ySettings.get('duration') || 100,
            backgroundColor: artboard.backgroundColor || 'transparent'
        });

        if (!projectId) return null;
        const project = pm.projects.get(projectId);
        if (!project) return null;

        // Replace auto-created layers with Yjs layer structure
        project.timeline.bitmapLayers = [];

        const layerCount = this.yBitmapLayers.length;
        for (let i = 0; i < layerCount; i++) {
            const desc = this.yBitmapLayers.get(i);
            if (!desc) continue;
            project.timeline.bitmapLayers.push({
                id: desc.id,
                type: desc.type || LAYER_TYPES.BITMAP,
                name: desc.name,
                visible: desc.visible !== false,
                locked: desc.locked || false,
                opacity: desc.opacity ?? 1,
                blendingMode: desc.blendingMode || 'normal',
                startFrame: desc.startFrame || 0,
                duration: desc.duration || project.settings.duration,
                frames: {}
            });
        }

        // Reconstruct vector layer
        const vecChildren = this.yVectorLayer.get('children');
        if (vecChildren) {
            project.timeline.vectorLayer.children = JSON.parse(JSON.stringify(vecChildren));
        }

        // Pull settings
        const color = this.ySettings.get('color');
        if (color !== undefined) project.settings.color = color;
        const strokeWidth = this.ySettings.get('strokeWidth');
        if (strokeWidth !== undefined) project.settings.strokeWidth = strokeWidth;

        // Pull guides
        if (this.yGuides.length > 0) {
            const guides = [];
            for (let i = 0; i < this.yGuides.length; i++) {
                guides.push(JSON.parse(JSON.stringify(this.yGuides.get(i))));
            }
            project.settings.guides = guides;
        }

        // Load baseline bitmap pixel data
        this.yBitmapData.forEach((dataUrl, key) => {
            if (!dataUrl) return;
            this._applyBitmapDataToProject(project, key, dataUrl, false);
        });

        // Apply all existing commits (in order) so joiner gets the latest state
        const allCommits = [];
        this.yCommits.forEach((commit) => {
            if (commit) allCommits.push(commit);
        });
        allCommits.sort((a, b) => a.timestamp - b.timestamp);
        for (const commit of allCommits) {
            this._applyCommitToProject(project, commit, false);
            // Mark as already-applied so they don't appear as incoming
            this._acceptedCommitIds.add(commit.id);
        }

        if (project.timeline.bitmapLayers.length > 0) {
            pm.selectLayer(project.timeline.bitmapLayers[0].id);
        }

        pm._dispatchLayersChanged();
        pm._dispatchFrameChanged();
        pm.setDirty(false);

        // Capture baseline so future commits are delta-only
        this._captureBaseline(project);

        return projectId;
    }

    // ========================
    // Commit (delta — only changed items)
    // ========================

    /**
     * Commit only CHANGED items to Yjs (delta from baseline).
     * Compares current project state with the last-captured baseline and
     * includes only the items that actually differ.
     * @param {string} [description]
     * @returns {string|null} commitId or null
     */
    commitChanges(description) {
        if (!this.ydoc || !this._isCollabActive()) {
            console.warn('[SyncAdapter] commitChanges aborted: ydoc=', !!this.ydoc, 'isCollabActive=', this._isCollabActive());
            return null;
        }

        const project = this._getCollabProject();
        const pm = window.projectModel;
        if (!project || !pm) {
            console.warn('[SyncAdapter] commitChanges aborted: project=', !!project, 'pm=', !!pm);
            return null;
        }

        const currentFrame = project.timeline.currentFrame || 0;

        // ---- 1. Bitmap pixel data: only changed canvases ----
        const bitmapEntries = [];
        const collectChanged = (layer) => {
            if (!layer?.frames) return;
            for (const [frameIdx, canvas] of Object.entries(layer.frames)) {
                if (!(canvas instanceof HTMLCanvasElement)) continue;
                const key = `${layer.id}_frame_${frameIdx}`;
                const dataUrl = canvas.toDataURL('image/png');
                if (dataUrl !== this._baselineBitmapDataUrls.get(key)) {
                    bitmapEntries.push({ key, layerId: layer.id, frame: parseInt(frameIdx, 10), dataUrl });
                }
            }
        };
        for (const layer of project.timeline.bitmapLayers) collectChanged(layer);
        collectChanged(project.timeline.backgroundLayer);
        const hasBitmapChanges = bitmapEntries.length > 0;

        // ---- 2. Layer structure: compare with baseline ----
        const currentLayerDescs = project.timeline.bitmapLayers.map(l => this._serializeLayerDescriptor(l));
        const baselineLayerIds = this._baselineLayerDescriptors.map(d => d.id);
        const hasLayerChanges = JSON.stringify(currentLayerDescs) !== JSON.stringify(this._baselineLayerDescriptors);

        // ---- 3. Vector tree: compare with baseline ----
        const currentVectorJSON = JSON.stringify(project.timeline.vectorLayer?.children || []);
        const hasVectorChanges = currentVectorJSON !== this._baselineVectorJSON;

        // ---- 4. Settings: per-property comparison ----
        const settingsChanged = {};
        let hasSettingsChanges = false;
        const settingsKeys = ['fps', 'duration', 'artboard', 'camera', 'adjustments', 'color', 'strokeWidth'];
        for (const key of settingsKeys) {
            const cur = JSON.stringify(project.settings[key]);
            const base = JSON.stringify(this._baselineSettings[key]);
            if (cur !== base) {
                settingsChanged[key] = JSON.parse(JSON.stringify(project.settings[key]));
                hasSettingsChanges = true;
            }
        }

        // ---- 5. Guides ----
        const currentGuidesJSON = JSON.stringify(project.settings.guides || []);
        const hasGuideChanges = currentGuidesJSON !== this._baselineGuidesJSON;

        // ---- 6. Frame ----
        const hasFrameChange = currentFrame !== this._baselineCurrentFrame;

        // Log delta detection results
        console.log('[SyncAdapter] Delta detection:', {
            layers: hasLayerChanges,
            bitmaps: hasBitmapChanges,
            vectors: hasVectorChanges,
            settings: hasSettingsChanges,
            guides: hasGuideChanges,
            frame: hasFrameChange,
            baselineVecLen: this._baselineVectorJSON.length,
            currentVecLen: currentVectorJSON.length
        });

        // Nothing changed?
        if (!hasLayerChanges && !hasBitmapChanges && !hasVectorChanges &&
            !hasSettingsChanges && !hasGuideChanges && !hasFrameChange) {
            console.warn('[SyncAdapter] No changes detected, skipping commit');
            return null;
        }

        const commitId = `commit_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
        const userName = this.collabManager.localUser?.name || 'Unknown';

        const commit = {
            id: commitId,
            userId: userName,
            userName,
            timestamp: Date.now(),
            description: description || '',
            // Category flags (v5 delta format marker)
            hasLayerChanges,
            hasBitmapChanges,
            hasVectorChanges,
            hasSettingsChanges,
            hasGuideChanges,
            hasFrameChange
        };

        // Only include data for categories that changed
        if (hasLayerChanges) {
            commit.baselineLayerIds = baselineLayerIds;
            commit.layerDescriptors = currentLayerDescs;
        }
        if (hasBitmapChanges) {
            commit.bitmapEntries = bitmapEntries;
        }
        if (hasVectorChanges) {
            commit.vectorChildren = JSON.parse(currentVectorJSON);
        }
        if (hasSettingsChanges) {
            commit.settingsChanged = settingsChanged;
        }
        if (hasGuideChanges) {
            commit.guides = JSON.parse(currentGuidesJSON);
        }
        if (hasFrameChange) {
            commit.currentFrame = currentFrame;
        }

        // Push to Yjs (commit + update Yjs baseline for future joiners)
        this.ydoc.transact(() => {
            this.yCommits.set(commitId, commit);

            if (hasBitmapChanges) {
                for (const entry of bitmapEntries) {
                    this.yBitmapData.set(entry.key, entry.dataUrl);
                }
            }
            if (hasLayerChanges) {
                if (this.yBitmapLayers.length > 0) this.yBitmapLayers.delete(0, this.yBitmapLayers.length);
                currentLayerDescs.forEach(d => this.yBitmapLayers.push([d]));
            }
            if (hasVectorChanges) {
                this._pushVectorTree(project.timeline.vectorLayer);
            }
            if (hasSettingsChanges) {
                for (const [key, value] of Object.entries(settingsChanged)) {
                    this.ySettings.set(key, value);
                }
            }
            if (hasGuideChanges) {
                if (this.yGuides.length > 0) this.yGuides.delete(0, this.yGuides.length);
                const guides = JSON.parse(currentGuidesJSON);
                if (guides.length > 0) this.yGuides.push(guides);
            }
            if (hasFrameChange) {
                this.yTimeline.set('currentFrame', currentFrame);
            }
        });

        // Update local baseline
        this._captureBaseline(project);

        // Mark own commit as accepted (won't appear in incoming)
        this._acceptedCommitIds.add(commitId);

        console.log(`[SyncAdapter] Delta commit ${commitId}: layers=${hasLayerChanges} bitmaps=${hasBitmapChanges} vectors=${hasVectorChanges} settings=${hasSettingsChanges} guides=${hasGuideChanges} frame=${hasFrameChange}`);

        window.dispatchEvent(new CustomEvent('collabCommitSent', {
            detail: { commitId }
        }));

        return commitId;
    }

    /**
     * Get all incoming commits from other users (not yet accepted locally).
     * @returns {Array} commits from other users
     */
    getIncomingCommits() {
        const commits = [];
        const localUserId = this.collabManager.localUser?.name;

        this.yCommits.forEach((commit, commitId) => {
            if (!commit) return;
            if (commit.userId === localUserId) return;
            if (this._acceptedCommitIds.has(commitId)) return;
            commits.push(commit);
        });

        commits.sort((a, b) => a.timestamp - b.timestamp);
        return commits;
    }

    /**
     * Get count of incoming commits from remote users.
     */
    getIncomingCommitCount() {
        return this.getIncomingCommits().length;
    }

    /**
     * Accept a specific commit — MERGE its delta into the local project.
     * Only items included in the commit are applied; local-only work is preserved.
     * @param {string} commitId
     * @returns {boolean}
     */
    acceptCommit(commitId) {
        if (this._acceptedCommitIds.has(commitId)) return false;

        const commit = this.yCommits.get(commitId);
        if (!commit) return false;

        const project = this._getCollabProject();
        if (!project) return false;

        this._isRemoteUpdate = true;
        this._applyCommitToProject(project, commit, true);
        this._isRemoteUpdate = false;

        // Mark as accepted to prevent re-application
        this._acceptedCommitIds.add(commitId);

        // Update baseline to reflect merged state
        this._captureBaseline(project);

        console.log(`[SyncAdapter] Accepted commit ${commitId}, flags:`, {
            layers: commit.hasLayerChanges, vectors: commit.hasVectorChanges,
            bitmaps: commit.hasBitmapChanges, settings: commit.hasSettingsChanges
        });

        window.dispatchEvent(new CustomEvent('collabCommitAccepted', {
            detail: { commitId }
        }));

        return true;
    }

    /**
     * Accept all incoming commits from other users.
     * @returns {number} number of commits accepted
     */
    acceptAllCommits() {
        const incoming = this.getIncomingCommits();
        let count = 0;
        for (const commit of incoming) {
            if (this.acceptCommit(commit.id)) count++;
        }

        if (count > 0) {
            window.dispatchEvent(new CustomEvent('collabCommitsChanged', {
                detail: { count: 0 }
            }));
        }

        return count;
    }

    // ========================
    // Bitmap Layer Locking (real-time)
    // ========================

    requestBitmapLock(layerId) {
        const existing = this.yBitmapLocks.get(layerId);

        if (existing) {
            if (existing.userId === this.collabManager.localUser?.name) {
                return true;
            }
            if (Date.now() - existing.timestamp > COLLAB_DEFAULTS.BITMAP_LOCK_TIMEOUT) {
                // Expired
            } else {
                window.infoSystem?.showInfo('warning',
                    `Layer locked by ${existing.userName}`, 2000);
                return false;
            }
        }

        this.yBitmapLocks.set(layerId, {
            userId: this.collabManager.localUser?.name,
            userName: this.collabManager.localUser?.name,
            timestamp: Date.now()
        });

        window.dispatchEvent(new CustomEvent('collabBitmapLockChanged', {
            detail: { layerId, locked: true, lockedBy: this.collabManager.localUser?.name }
        }));

        return true;
    }

    releaseBitmapLock(layerId) {
        const existing = this.yBitmapLocks.get(layerId);
        if (existing && existing.userId === this.collabManager.localUser?.name) {
            this.yBitmapLocks.delete(layerId);
            window.dispatchEvent(new CustomEvent('collabBitmapLockChanged', {
                detail: { layerId, locked: false, lockedBy: null }
            }));
        }
    }

    getBitmapLockState(layerId) {
        const existing = this.yBitmapLocks.get(layerId);
        if (!existing) return { locked: false, lockedBy: null };
        if (Date.now() - existing.timestamp > COLLAB_DEFAULTS.BITMAP_LOCK_TIMEOUT) {
            return { locked: false, lockedBy: null };
        }
        return { locked: true, lockedBy: existing.userName };
    }

    // ========================
    // Remote Observers (minimal — commit badge + locks only)
    // ========================

    enableRemoteObservers() {
        if (this._remoteObserversEnabled) return;
        this._remoteObserversEnabled = true;

        // Bitmap locks (real-time)
        this._observe(this.yBitmapLocks, (event) => {
            event.keys.forEach((change, layerId) => {
                const lockData = this.yBitmapLocks.get(layerId);
                window.dispatchEvent(new CustomEvent('collabBitmapLockChanged', {
                    detail: {
                        layerId,
                        locked: !!lockData,
                        lockedBy: lockData?.userName || null
                    }
                }));
            });
        });

        // Commits observer — notify UI about new incoming commits (badge count)
        this._observe(this.yCommits, (event) => {
            const localUserId = this.collabManager.localUser?.name;
            let hasNewIncoming = false;

            event.keys.forEach((change, commitId) => {
                if (change.action !== 'add' && change.action !== 'update') return;
                const commit = this.yCommits.get(commitId);
                if (!commit) return;
                if (commit.userId === localUserId) return;
                hasNewIncoming = true;
            });

            if (hasNewIncoming) {
                const count = this.getIncomingCommitCount();
                window.dispatchEvent(new CustomEvent('collabCommitsChanged', {
                    detail: { count }
                }));
            }
        });
    }

    // ========================
    // Observer helpers
    // ========================

    _observe(yType, handler) {
        const wrappedHandler = (event, transaction) => {
            if (transaction.local) return;
            handler(event, transaction);
        };
        yType.observe(wrappedHandler);
        this._observers.push({ yType, handler: wrappedHandler });
    }

    // ========================
    // Apply commit to project (delta merge)
    // ========================

    /**
     * Apply a commit to a project.
     * v5 (delta) commits: merges only changed items, preserving local work.
     * v4 (legacy snapshot) commits: falls back to full replacement.
     * @param {object} project
     * @param {object} commit
     * @param {boolean} triggerUI  Whether to dispatch UI update events
     */
    _applyCommitToProject(project, commit, triggerUI) {
        // Detect v5 delta format (has category flags) vs v4 legacy (has `settings` object)
        const isDelta = commit.hasLayerChanges !== undefined;
        if (!isDelta) {
            this._applyFullSnapshotCommit(project, commit, triggerUI);
            return;
        }

        const pm = window.projectModel;
        const isActive = this._isCollabActive();

        // ---- 1. Layer structure MERGE ----
        if (commit.hasLayerChanges && commit.layerDescriptors) {
            const baselineIds = new Set(commit.baselineLayerIds || []);
            const commitLayerMap = new Map(commit.layerDescriptors.map(d => [d.id, d]));
            const commitLayerIds = new Set(commit.layerDescriptors.map(d => d.id));

            // Layers committer removed (in their baseline, not in their result)
            const removedByCommitter = [...baselineIds].filter(id => !commitLayerIds.has(id));

            // Remove those from local project
            project.timeline.bitmapLayers = project.timeline.bitmapLayers.filter(
                l => !removedByCommitter.includes(l.id)
            );

            // Build map of remaining local layers
            const existingMap = new Map(project.timeline.bitmapLayers.map(l => [l.id, l]));

            // Update properties for layers that exist in both commit and local
            for (const desc of commit.layerDescriptors) {
                const existing = existingMap.get(desc.id);
                if (existing) {
                    existing.name = desc.name;
                    existing.visible = desc.visible;
                    existing.locked = desc.locked;
                    existing.opacity = desc.opacity;
                    existing.blendingMode = desc.blendingMode;
                    existing.startFrame = desc.startFrame;
                    existing.duration = desc.duration;
                }
            }

            // Add layers that were added by committer (in commit, not in their baseline)
            const addedByCommitter = commit.layerDescriptors.filter(d => !baselineIds.has(d.id));
            for (const desc of addedByCommitter) {
                if (!existingMap.has(desc.id)) {
                    project.timeline.bitmapLayers.push({
                        id: desc.id,
                        type: desc.type || LAYER_TYPES.BITMAP,
                        name: desc.name,
                        visible: desc.visible !== false,
                        locked: desc.locked || false,
                        opacity: desc.opacity ?? 1,
                        blendingMode: desc.blendingMode || 'normal',
                        startFrame: desc.startFrame || 0,
                        duration: desc.duration || project.settings.duration,
                        frames: {}
                    });
                }
            }

            // Reorder: commit's order for shared layers, local-only layers appended
            const localOnlyLayers = project.timeline.bitmapLayers.filter(
                l => !commitLayerIds.has(l.id)
            );
            const orderedLayers = [];
            for (const desc of commit.layerDescriptors) {
                const layer = project.timeline.bitmapLayers.find(l => l.id === desc.id);
                if (layer) orderedLayers.push(layer);
            }
            orderedLayers.push(...localOnlyLayers);
            project.timeline.bitmapLayers = orderedLayers;
        }

        // ---- 2. Vector tree (full replace if changed) ----
        if (commit.hasVectorChanges && commit.vectorChildren) {
            project.timeline.vectorLayer.children = JSON.parse(JSON.stringify(commit.vectorChildren));
            if (triggerUI && isActive) {
                if (window.vectorSystem?.importData) {
                    window.vectorSystem.importData(project.timeline.vectorLayer);
                }
                window.dispatchEvent(new CustomEvent('projectCanvasUpdated'));
            }
        }

        // ---- 3. Settings MERGE (only changed keys) ----
        if (commit.hasSettingsChanges && commit.settingsChanged) {
            const s = commit.settingsChanged;
            if (s.fps !== undefined) project.settings.fps = s.fps;
            if (s.duration !== undefined) {
                project.settings.duration = s.duration;
                if (triggerUI && isActive) {
                    window.dispatchEvent(new CustomEvent('projectDurationChanged', {
                        detail: s.duration
                    }));
                }
            }
            if (s.artboard !== undefined) {
                project.settings.artboard = { ...s.artboard };
                if (triggerUI && isActive) {
                    window.dispatchEvent(new CustomEvent('projectArtboardChanged', {
                        detail: project.settings.artboard
                    }));
                }
            }
            if (s.camera !== undefined) project.settings.camera = { ...s.camera };
            if (s.adjustments !== undefined) project.settings.adjustments = JSON.parse(JSON.stringify(s.adjustments));
            if (s.color !== undefined) {
                project.settings.color = s.color;
                if (triggerUI && isActive) {
                    window.dispatchEvent(new CustomEvent('projectColorChanged', {
                        detail: { value: s.color, isPreview: false }
                    }));
                }
            }
            if (s.strokeWidth !== undefined) {
                project.settings.strokeWidth = s.strokeWidth;
                if (triggerUI && isActive) {
                    window.dispatchEvent(new CustomEvent('projectStrokeWidthChanged', {
                        detail: { value: s.strokeWidth, isPreview: false }
                    }));
                }
            }
        }

        // ---- 4. Guides (full replace if changed) ----
        if (commit.hasGuideChanges && commit.guides) {
            project.settings.guides = JSON.parse(JSON.stringify(commit.guides));
            if (triggerUI && isActive) {
                window.dispatchEvent(new CustomEvent('projectGuidesChanged', {
                    detail: project.settings.guides
                }));
            }
        }

        // ---- 5. Current frame ----
        if (commit.hasFrameChange && commit.currentFrame !== undefined) {
            project.timeline.currentFrame = commit.currentFrame;
        }

        // ---- 6. Bitmap pixel data (only changed canvases) ----
        if (commit.hasBitmapChanges && commit.bitmapEntries) {
            for (const entry of commit.bitmapEntries) {
                this._applyBitmapDataToProject(project, entry.key, entry.dataUrl, triggerUI);
            }
        }

        // Dispatch UI updates
        if (triggerUI && isActive) {
            this._isRemoteUpdate = true;
            if (commit.hasLayerChanges || commit.hasVectorChanges) {
                pm._dispatchLayersChanged();
            }
            pm._dispatchFrameChanged();
            this._isRemoteUpdate = false;
        }
    }

    /**
     * Legacy v4 full-snapshot commit application (backward compatibility).
     * Replaces entire project state — no merge.
     */
    _applyFullSnapshotCommit(project, commit, triggerUI) {
        const pm = window.projectModel;
        const isActive = this._isCollabActive();

        // Layer structure
        if (commit.layerDescriptors) {
            const existingMap = new Map();
            project.timeline.bitmapLayers.forEach(l => existingMap.set(l.id, l));

            project.timeline.bitmapLayers = commit.layerDescriptors.map(desc => {
                const existing = existingMap.get(desc.id);
                if (existing) {
                    existing.name = desc.name;
                    existing.visible = desc.visible;
                    existing.locked = desc.locked;
                    existing.opacity = desc.opacity;
                    existing.blendingMode = desc.blendingMode;
                    existing.startFrame = desc.startFrame;
                    existing.duration = desc.duration;
                    return existing;
                } else {
                    return {
                        id: desc.id,
                        type: desc.type || LAYER_TYPES.BITMAP,
                        name: desc.name,
                        visible: desc.visible !== false,
                        locked: desc.locked || false,
                        opacity: desc.opacity ?? 1,
                        blendingMode: desc.blendingMode || 'normal',
                        startFrame: desc.startFrame || 0,
                        duration: desc.duration || project.settings.duration,
                        frames: {}
                    };
                }
            });
        }

        if (commit.vectorChildren) {
            project.timeline.vectorLayer.children = JSON.parse(JSON.stringify(commit.vectorChildren));
            if (triggerUI && isActive) {
                if (window.vectorSystem?.importData) {
                    window.vectorSystem.importData(project.timeline.vectorLayer);
                }
                window.dispatchEvent(new CustomEvent('projectCanvasUpdated'));
            }
        }

        if (commit.settings) {
            const s = commit.settings;
            if (s.fps !== undefined) project.settings.fps = s.fps;
            if (s.duration !== undefined) {
                project.settings.duration = s.duration;
                if (triggerUI && isActive) {
                    window.dispatchEvent(new CustomEvent('projectDurationChanged', {
                        detail: s.duration
                    }));
                }
            }
            if (s.artboard) {
                project.settings.artboard = { ...s.artboard };
                if (triggerUI && isActive) {
                    window.dispatchEvent(new CustomEvent('projectArtboardChanged', {
                        detail: project.settings.artboard
                    }));
                }
            }
            if (s.camera) project.settings.camera = { ...s.camera };
            if (s.adjustments) project.settings.adjustments = JSON.parse(JSON.stringify(s.adjustments));
            if (s.color !== undefined) {
                project.settings.color = s.color;
                if (triggerUI && isActive) {
                    window.dispatchEvent(new CustomEvent('projectColorChanged', {
                        detail: { value: s.color, isPreview: false }
                    }));
                }
            }
            if (s.strokeWidth !== undefined) {
                project.settings.strokeWidth = s.strokeWidth;
                if (triggerUI && isActive) {
                    window.dispatchEvent(new CustomEvent('projectStrokeWidthChanged', {
                        detail: { value: s.strokeWidth, isPreview: false }
                    }));
                }
            }
        }

        if (commit.guides) {
            project.settings.guides = JSON.parse(JSON.stringify(commit.guides));
            if (triggerUI && isActive) {
                window.dispatchEvent(new CustomEvent('projectGuidesChanged', {
                    detail: project.settings.guides
                }));
            }
        }

        if (commit.currentFrame !== undefined) {
            project.timeline.currentFrame = commit.currentFrame;
        }

        if (commit.bitmapEntries) {
            for (const entry of commit.bitmapEntries) {
                this._applyBitmapDataToProject(project, entry.key, entry.dataUrl, triggerUI);
            }
        }
        if (!commit.bitmapEntries && commit.entries) {
            for (const entry of commit.entries) {
                this._applyBitmapDataToProject(project, entry.key, entry.dataUrl, triggerUI);
            }
        }

        if (triggerUI && isActive) {
            this._isRemoteUpdate = true;
            pm._dispatchLayersChanged();
            pm._dispatchFrameChanged();
            this._isRemoteUpdate = false;
        }
    }

    // ========================
    // Bitmap data helpers
    // ========================
    _applyBitmapDataToProject(project, key, dataUrl, triggerUI) {
        const frameMarker = '_frame_';
        const frameIdx = key.lastIndexOf(frameMarker);
        if (frameIdx === -1) return;

        const layerId = key.substring(0, frameIdx);
        const frame = parseInt(key.substring(frameIdx + frameMarker.length), 10);
        if (isNaN(frame)) return;

        const layer = this._findLayerInProject(project, layerId);
        if (!layer) return;
        if (!layer.frames) layer.frames = {};

        const img = new Image();
        img.onload = () => {
            let canvas = layer.frames[frame];
            if (!canvas) {
                canvas = document.createElement('canvas');
                canvas.width = project.settings.artboard.width;
                canvas.height = project.settings.artboard.height;
                layer.frames[frame] = canvas;
            }
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);

            if (triggerUI && this._isCollabActive()) {
                this._isRemoteUpdate = true;
                window.dispatchEvent(new CustomEvent('projectCanvasUpdated', {
                    detail: { id: layerId }
                }));
                this._isRemoteUpdate = false;
            }
        };
        img.src = dataUrl;
    }

    _findLayerInProject(project, layerId) {
        if (!project) return null;
        const bmp = project.timeline.bitmapLayers.find(l => l.id === layerId);
        if (bmp) return bmp;
        if (project.timeline.backgroundLayer?.id === layerId) return project.timeline.backgroundLayer;
        if (project.timeline.vectorLayer?.id === layerId) return project.timeline.vectorLayer;
        return null;
    }

    // ========================
    // Serialization
    // ========================

    _serializeLayerDescriptor(layer) {
        return {
            id: layer.id,
            name: layer.name,
            type: layer.type,
            visible: layer.visible,
            locked: layer.locked,
            opacity: layer.opacity ?? 1,
            blendingMode: layer.blendingMode || 'normal',
            startFrame: layer.startFrame || 0,
            duration: layer.duration
        };
    }

    _pushBitmapFrames(layer) {
        if (!layer.frames) return;
        for (const [frameIdx, canvas] of Object.entries(layer.frames)) {
            if (canvas instanceof HTMLCanvasElement) {
                const key = `${layer.id}_frame_${frameIdx}`;
                const dataUrl = canvas.toDataURL('image/png');
                this.yBitmapData.set(key, dataUrl);
            }
        }
    }

    _pushVectorTree(vectorLayer) {
        if (!vectorLayer) return;
        this.yVectorLayer.set('id', vectorLayer.id);
        this.yVectorLayer.set('name', vectorLayer.name);
        this.yVectorLayer.set('visible', vectorLayer.visible);
        this.yVectorLayer.set('locked', vectorLayer.locked);
        this.yVectorLayer.set('children', JSON.parse(JSON.stringify(vectorLayer.children || [])));
    }

    destroy() {
        this._observers.forEach(({ yType, handler }) => {
            yType.unobserve(handler);
        });
        this._observers = [];
        this._remoteObserversEnabled = false;
        this.ydoc = null;
        this.collabManager = null;
    }
}
