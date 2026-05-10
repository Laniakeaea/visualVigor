/* =========================================
   Awareness Manager
   =========================================
   Manages user presence information:
   - Cursor position on canvas
   - Active tool
   - Active layer
   - Selection area
   - Viewport (camera) state
   
   Uses Yjs Awareness protocol for lightweight, 
   ephemeral state broadcasting.
   ========================================= */

import { COLLAB_DEFAULTS } from '../../Config/collabConfig.js';

export class AwarenessManager {
    /**
     * @param {import('y-protocols/awareness').Awareness} awareness
     * @param {{ name: string, color: string, isOwner: boolean }} localUser
     */
    constructor(awareness, localUser) {
        this.awareness = awareness;
        this.localUser = localUser;

        /** Throttle timer for awareness updates */
        this._throttleTimer = null;
        this._pendingState = null;

        /** Cursor overlay elements: clientId -> HTMLElement */
        this._cursorElements = new Map();

        /** Container for cursor overlays */
        this._cursorContainer = null;

        // Set initial local awareness state
        this.awareness.setLocalStateField('user', {
            name: localUser.name,
            color: localUser.color,
            isOwner: localUser.isOwner
        });

        // Listen for awareness changes
        this._onAwarenessChange = this._onAwarenessChange.bind(this);
        this.awareness.on('change', this._onAwarenessChange);

        // Listen for local events to broadcast
        this._bindLocalEvents();

        // Create cursor overlay container
        this._createCursorContainer();
    }

    /**
     * Get all connected users.
     * @returns {Array<{ clientId: number, name: string, color: string, isOwner: boolean, cursor?: {x,y}, activeTool?: string, activeLayer?: string }>}
     */
    getUsers() {
        const users = [];
        this.awareness.getStates().forEach((state, clientId) => {
            if (state.user) {
                users.push({
                    clientId,
                    isLocal: clientId === this.awareness.clientID,
                    ...state.user,
                    cursor: state.cursor,
                    activeTool: state.activeTool,
                    activeLayer: state.activeLayer,
                    selection: state.selection,
                    viewport: state.viewport
                });
            }
        });
        return users;
    }

    /**
     * Update local cursor position (throttled).
     * @param {number} x - Canvas coordinate X
     * @param {number} y - Canvas coordinate Y
     */
    updateCursor(x, y) {
        this._throttledUpdate({ cursor: { x, y } });
    }

    /**
     * Update local active tool.
     * @param {string} toolId
     */
    updateActiveTool(toolId) {
        this.awareness.setLocalStateField('activeTool', toolId);
    }

    /**
     * Update local active layer.
     * @param {string} layerId
     */
    updateActiveLayer(layerId) {
        this.awareness.setLocalStateField('activeLayer', layerId);
    }

    /**
     * Update local selection area.
     * @param {{ x: number, y: number, w: number, h: number }|null} selection
     */
    updateSelection(selection) {
        this.awareness.setLocalStateField('selection', selection);
    }

    /**
     * Update local viewport (camera).
     * @param {{ scale: number, x: number, y: number }} viewport
     */
    updateViewport(viewport) {
        this._throttledUpdate({ viewport });
    }

    // ========================
    // Private
    // ========================

    _throttledUpdate(fields) {
        this._pendingState = { ...this._pendingState, ...fields };

        if (this._throttleTimer) return;

        this._throttleTimer = setTimeout(() => {
            if (this._pendingState) {
                Object.entries(this._pendingState).forEach(([key, value]) => {
                    this.awareness.setLocalStateField(key, value);
                });
                this._pendingState = null;
            }
            this._throttleTimer = null;
        }, COLLAB_DEFAULTS.AWARENESS_THROTTLE);
    }

    _onAwarenessChange({ added, updated, removed }) {
        // Update cursor overlays for other users
        const allChangedIds = [...added, ...updated, ...removed];

        allChangedIds.forEach(clientId => {
            if (clientId === this.awareness.clientID) return; // Skip self

            const state = this.awareness.getStates().get(clientId);

            if (!state || removed.includes(clientId)) {
                this._removeCursorElement(clientId);
                return;
            }

            if (state.cursor && state.user) {
                this._updateCursorElement(clientId, state.user, state.cursor, state.activeTool);
            }
        });

        // Dispatch user list update event
        window.dispatchEvent(new CustomEvent('collabUsersChanged', {
            detail: { users: this.getUsers() }
        }));
    }

    _bindLocalEvents() {
        // Track tool activation
        this._onToolActivated = (e) => {
            this.updateActiveTool(e.detail?.toolId);
        };
        window.addEventListener('toolActivated', this._onToolActivated);

        // Track layer selection
        this._onLayerSelected = (e) => {
            this.updateActiveLayer(e.detail);
        };
        window.addEventListener('projectLayerSelected', this._onLayerSelected);

        // Track camera/viewport changes
        this._onCameraChanged = (e) => {
            if (e.detail) {
                this.updateViewport(e.detail);
            }
        };
        window.addEventListener('workspaceCameraChanged', this._onCameraChanged);
    }

    // ========================
    // Cursor Overlay Rendering
    // ========================

    _createCursorContainer() {
        // Defer creation until DOM is ready
        const create = () => {
            this._cursorContainer = document.createElement('div');
            this._cursorContainer.className = 'collab-cursor-container';
            this._cursorContainer.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;overflow:hidden;';

            // Attach to workspace area if it exists
            const workspace = document.querySelector('.workspace-canvas-area') ||
                              document.querySelector('.workspace') ||
                              document.body;
            workspace.appendChild(this._cursorContainer);
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', create);
        } else {
            create();
        }
    }

    _updateCursorElement(clientId, user, cursor, activeTool) {
        if (!this._cursorContainer) return;

        let el = this._cursorElements.get(clientId);

        if (!el) {
            el = document.createElement('div');
            el.className = 'collab-cursor';
            el.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 16 16" fill="${user.color}" style="filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));">
                    <path d="M0 0 L0 14 L4 10 L8 16 L10 15 L6 9 L12 9 Z"/>
                </svg>
                <span class="collab-cursor-label" style="background:${user.color};">${user.name}</span>
            `;
            el.style.cssText = 'position:absolute;transition:transform 80ms ease-out;pointer-events:none;';
            this._cursorContainer.appendChild(el);
            this._cursorElements.set(clientId, el);
        }

        // Position cursor (canvas coords → viewport coords)
        // This needs to account for camera transform
        const camera = window.projectModel?.data?.settings?.camera || { scale: 1, x: 0, y: 0 };
        const screenX = (cursor.x + camera.x) * camera.scale;
        const screenY = (cursor.y + camera.y) * camera.scale;
        el.style.transform = `translate(${screenX}px, ${screenY}px)`;
    }

    _removeCursorElement(clientId) {
        const el = this._cursorElements.get(clientId);
        if (el) {
            el.remove();
            this._cursorElements.delete(clientId);
        }
    }

    /**
     * Cleanup.
     */
    destroy() {
        // Remove event listeners
        this.awareness.off('change', this._onAwarenessChange);
        window.removeEventListener('toolActivated', this._onToolActivated);
        window.removeEventListener('projectLayerSelected', this._onLayerSelected);
        window.removeEventListener('workspaceCameraChanged', this._onCameraChanged);

        if (this._throttleTimer) {
            clearTimeout(this._throttleTimer);
        }

        // Remove cursor elements
        this._cursorElements.forEach(el => el.remove());
        this._cursorElements.clear();

        if (this._cursorContainer) {
            this._cursorContainer.remove();
            this._cursorContainer = null;
        }
    }
}
