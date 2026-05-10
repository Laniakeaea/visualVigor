import { CanvasView } from './Common/CanvasView.js';
import { GridSystem } from './OverlaySystem/GridSystem.js';
import { GuideSystem } from './OverlaySystem/GuideSystem.js';
import { SelectionSystem } from './OverlaySystem/SelectionSystem.js';
import { UISystem } from './OverlaySystem/UISystem.js';

/* =========================================
   Viewport Overlay Controller
   ========================================= */

/**
 * Main Controller for the Viewport Overlay.
 * 
 * Optimization & Architecture:
 * - Uses a Component-based architecture (Systems) to separate concerns.
 * - Delegate specific rendering/interaction logic to GridSystem, GuideSystem, etc.
 * - Centralizes Event Handling and Drawing scheduling.
 */
export class ViewportOverlayController extends CanvasView {
    /**
     * @param {HTMLElement} container - The viewport container.
     */
    constructor(container) {
        super(container, { transparent: true, zIndex: '100' });
        this.canvas.className = 'workspace__viewport-overlay';
        
        // --- Shared State ---
        this.transform = { scale: 1, x: 0, y: 0 };
        this.artboard = null; 

        // --- Sub-Systems ---
        // Passing 'this' allows systems to access the CanvasContext and Shared State
        this.gridSystem = new GridSystem(this);
        this.guideSystem = new GuideSystem(this);
        this.selectionSystem = new SelectionSystem(this);
        this.uiSystem = new UISystem(this, container);

        this._bindGlobalEvents();
    }

    // --- Public API ---

    /**
     * Update Viewport Transform (Zoom/Pan).
     */
    update(scale, x, y) {
        if (this.transform.scale !== scale) {
            this.uiSystem.showZoomLabel(scale);
        }
        this.transform = { scale, x, y };
        this.draw();
    }

    setArtboard(width, height) {
        this.artboard = (width === 0 && height === 0) ? null : { width, height };
        this.draw();
    }

    setGridEnabled(enabled) {
        this.gridSystem.setEnabled(enabled);
        this.draw();
    }

    setMousePosEnabled(enabled) {
        this.uiSystem.setMousePosEnabled(enabled);
    }
    
    setSnapGuides(lines) {
        this.guideSystem.setSnapGuides(lines);
        this.draw(); // Redraw immediately
    }

    /**
     * Sets a temporary guide being dragged.
     * Proxy to GuideSystem.
     */
    setDragGuide(axis, pos, crossPos) {
        this.guideSystem.setDragGuide(axis, pos, crossPos);
    }

    /**
     * Clears the temporary drag guide.
     * Proxy to GuideSystem.
     */
    clearDragGuide() {
        this.guideSystem.clearDragGuide();
    }

    // --- Internal Logic ---

    _bindGlobalEvents() {
        // Project Events
        window.addEventListener('projectGuidesChanged', (e) => {
            this.guideSystem.setGuides(e.detail);
            this.draw();
        });

        window.addEventListener('projectActivated', (e) => {
            if (e.detail && e.detail.settings && e.detail.settings.guides) {
                this.guideSystem.setGuides(e.detail.settings.guides);
            } else {
                this.guideSystem.setGuides([]);
            }
            this.draw();
        });
        
        window.addEventListener('selectionChanged', (e) => {
            this.selectionSystem.updateSelection(e.detail);
            this.draw();
        });

        // Initialize Data
        if (window.projectModel) {
             this.guideSystem.setGuides(window.projectModel.getGuides());
        }
    }

    /**
     * Main Render Loop.
     * Clears canvas and orchestrates sub-system rendering.
     */
    draw() {
        this.clear();
        if (!this.artboard) return;

        const ctx = this.ctx;
        const { scale, x, y } = this.transform;
        
        // 1. Draw Artboard Border
        const screenX = x;
        const screenY = y;
        const screenW = this.artboard.width * scale;
        const screenH = this.artboard.height * scale;

        ctx.strokeStyle = this.getThemeColor('--color-accent-100');
        ctx.lineWidth = 2; 
        ctx.strokeRect(screenX, screenY, screenW, screenH);

        // 2. Component Layers
        this.gridSystem.draw(ctx, this.transform, this.artboard);
        this.selectionSystem.draw(ctx, this.transform);
        this.guideSystem.draw(ctx, this.transform, this.artboard);
    }
}
