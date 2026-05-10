/* =========================================
   Workspace View Module
   Refactored for Modularization & Encapsulation
   ========================================= */

import { WorkspaceRenderer } from './WorkspaceRenderer.js';
import { WorkspaceViewport } from './WorkspaceViewport.js';
import { WorkspaceTabManager } from './WorkspaceTabManager.js';
import { WorkspaceEventManager } from './WorkspaceEventManager.js';

/**
 * Main entry point for the Workspace View.
 * Acts as a Facade and Manager for Viewports, Rendering, and Tabs.
 */
export class WorkspaceView {
    constructor() {
        // Core Components
        this.views = []; // Array of WorkspaceViewport
        this.renderer = new WorkspaceRenderer(this);
        this.tabManager = new WorkspaceTabManager(this);
        this.eventManager = new WorkspaceEventManager(this);

        // State
        this.isViewCoupled = false;
        this.isSyncing = false;
        this.assistants = {
            grid: false,
            snap: false,
            indicator: false,
            mousePos: false
        };
        
        // Filter config: Array of Maps per view
        this.viewFilters = [new Map(), new Map()]; 
    }

    /**
     * Initializes the workspace UI in the container.
     */
    init(container) {
        if (!container) return;
        container.classList.add('workspace');
        
        // 1. Initialize Tab Bar (in panel title area)
        this.tabManager.init(container);
        
        // 2. Create Split Viewports
        this.createViewport(container, 0);
        this.createViewport(container, 1);
        
        // 3. Bind Global Events
        this.eventManager.bindGlobalEvents();
    }

    createViewport(parent, index) {
        const viewport = new WorkspaceViewport(parent, index, this);
        this.views.push(viewport);
    }

    /**
     * Rebuilds DOM structure (Proxy to Renderer).
     */
    renderStructure() {
        this.renderer.renderStructure(this.views);
    }

    /**
     * Updates content (Proxy to Renderer).
     */
    updateFrameView() {
        this.renderer.renderFrame(this.views, this.viewFilters);
    }

    /**
     * Set a defined filter on a specific view.
     */
    setViewFilter(viewIndex, filterName, filterValue) {
        if (viewIndex >= 0 && viewIndex < 2) {
            const map = this.viewFilters[viewIndex];
            if (filterValue === null) {
                map.delete(filterName);
            } else {
                map.set(filterName, filterValue);
            }
            // Trigger visual update
            this.updateFrameView();
        }
    }

    /**
     * Handles view coupling (Called by Viewport's Camera).
     */
    handleViewCoupling(sourceCamera, transform) {
        if (!this.isViewCoupled || this.isSyncing) return;
        this.isSyncing = true;
        this.views.forEach(view => {
            if (view.camera !== sourceCamera) {
                view.camera.setTransform(transform.scale, transform.x, transform.y);
            }
        });
        this.isSyncing = false;
    }

    toggleViewCoupling() {
        this.isViewCoupled = !this.isViewCoupled;
        
        // Feedback
        const msgKey = this.isViewCoupled ? 'Layout.InfoBar.InfoContent.viewCoupled' : 'Layout.InfoBar.InfoContent.viewDecoupled';
        if (window.infoSystem) window.infoSystem.showInfo('info', msgKey, 1000);

        // Sync immediately
        if (this.isViewCoupled && this.views.length > 0) {
            const primary = this.views[0].camera;
            this.handleViewCoupling(primary, { scale: primary.scale, x: primary.position.x, y: primary.position.y });
        }
        
        window.dispatchEvent(new CustomEvent('workspaceViewCouplingChanged', { detail: { isCoupled: this.isViewCoupled } }));
        return this.isViewCoupled;
    }

    toggleAssistant(type) {
        if (this.assistants.hasOwnProperty(type)) {
            this.assistants[type] = !this.assistants[type];
            // Propagate to all viewports
            this.views.forEach(view => view.updateAssistant(type, this.assistants[type]));
            
            window.dispatchEvent(new CustomEvent('workspaceAssistantChanged', {
                detail: { type: type, isActive: this.assistants[type], allAssistants: { ...this.assistants } }
            }));
            return this.assistants[type];
        }
        return false;
    }

    // Alias for compatibility
    renderLayers() { this.renderStructure(); }
}
