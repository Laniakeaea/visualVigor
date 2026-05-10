import { ToolUtils } from '../CoreFunction/Tool/ToolUtils.js';
import { IndicatorRenderer } from './IndicatorRenderer.js';

export class IndicatorSystem {
    constructor() {
        this.activeToolId = null;
        this.activeTool = null;
        this.lastPointerState = null; // { clientX, clientY, viewport }
        
        this.bindEvents();
    }

    bindEvents() {
        window.addEventListener('toolActivated', this.onToolActivated.bind(this));
        window.addEventListener('projectArtboardChanged', this.onArtboardChanged.bind(this));
        window.addEventListener('workspaceCameraChanged', this.onCameraChanged.bind(this));
        
        // Bind to document to catch events across all viewports
        document.addEventListener('pointermove', this.onPointerMove.bind(this));
        document.addEventListener('pointerleave', this.onPointerLeave.bind(this), true);
    }

    onToolActivated(e) {
        this.activeToolId = e.detail.toolId;
        if (window.toolSystem) {
            this.activeTool = window.toolSystem.tools[this.activeToolId];
        }
        this.clearAllIndicators();
    }

    onArtboardChanged(e) {
        // No longer need to resize based on artboard, as it's viewport-sized
        // But we might want to clear
        this.clearAllIndicators();
    }

    onCameraChanged(e) {
        // Redraw cursor if we have a valid pointer state
        if (this.lastPointerState && this.activeTool) {
            this._updateIndicator(this.lastPointerState.clientX, this.lastPointerState.clientY, this.lastPointerState.viewport);
        }
    }

    onPointerMove(e) {
        if (!this.activeTool) return;

        const viewport = e.target.closest('.workspace__viewport');
        if (!viewport) {
            // If we are not over a viewport, clear indicators
            this.clearAllIndicators();
            this.lastPointerState = null;
            return;
        }

        // Store state for camera updates
        this.lastPointerState = {
            clientX: e.clientX,
            clientY: e.clientY,
            viewport: viewport
        };

        this._updateIndicator(e.clientX, e.clientY, viewport);
    }

    _updateIndicator(clientX, clientY, viewport) {
        const indicatorCanvas = viewport.querySelector('.tool-indicator-layer');
        if (!indicatorCanvas) return;

        // Ensure canvas resolution matches display size (Screen Space)
        if (indicatorCanvas.width !== indicatorCanvas.clientWidth || 
            indicatorCanvas.height !== indicatorCanvas.clientHeight) {
            indicatorCanvas.width = indicatorCanvas.clientWidth;
            indicatorCanvas.height = indicatorCanvas.clientHeight;
        }

        // Clear this canvas (and others to be safe, or just this one?)
        // If we move from one viewport to another, the old one should be cleared.
        this.clearAllIndicators();

        const ctx = indicatorCanvas.getContext('2d');
        
        // Get Screen Point (relative to viewport)
        const rect = viewport.getBoundingClientRect();
        const screenX = clientX - rect.left;
        const screenY = clientY - rect.top;
        
        // Get Scale for sizing
        let scale = 1;
        if (viewport.cameraController) {
            scale = viewport.cameraController.scale;
        }

        const point = { x: screenX, y: screenY };

        // 1. Check for declarative cursor
        if (this.activeTool.cursor) {
            this.drawCursor(ctx, this.activeTool.cursor, point, scale);
        } 
        // 2. Check for legacy/custom delegation
        else if (this.activeTool.onDrawIndicator) {
            this.activeTool.onDrawIndicator(ctx, point, viewport);
        }
    }

    onPointerLeave(e) {
        // If leaving a viewport
        if (e.target.classList && e.target.classList.contains('workspace__viewport')) {
            if (this.activeTool && this.activeTool.requiresPersistentOverlay) {
                // Do not clear, just reset pointer state
                this.lastPointerState = null;
                // Trigger redraw with null point to let tool handle "no mouse" state (e.g. hide cursor but keep grid)
                const viewport = e.target;
                this._updateIndicator(null, null, viewport);
            } else {
                this.clearAllIndicators();
                this.lastPointerState = null;
            }
        }
    }

    update() {
        if (this.lastPointerState && this.activeTool) {
            this._updateIndicator(this.lastPointerState.clientX, this.lastPointerState.clientY, this.lastPointerState.viewport);
        } else if (this.activeTool && this.activeTool.requiresPersistentOverlay) {
            // Try to find a viewport to draw into?
            // We don't know which viewport is active if no pointer.
            // Maybe iterate all?
            const viewports = document.querySelectorAll('.workspace__viewport');
            viewports.forEach(vp => {
                this._updateIndicator(null, null, vp);
            });
        }
    }

    _updateIndicator(clientX, clientY, viewport) {
        const indicatorCanvas = viewport.querySelector('.tool-indicator-layer');
        if (!indicatorCanvas) return;

        // Ensure canvas resolution matches display size (Screen Space)
        if (indicatorCanvas.width !== indicatorCanvas.clientWidth || 
            indicatorCanvas.height !== indicatorCanvas.clientHeight) {
            indicatorCanvas.width = indicatorCanvas.clientWidth;
            indicatorCanvas.height = indicatorCanvas.clientHeight;
        }

        // Clear this canvas
        const ctx = indicatorCanvas.getContext('2d');
        ctx.clearRect(0, 0, indicatorCanvas.width, indicatorCanvas.height);

        // Get Screen Point (relative to viewport)
        let point = null;
        if (clientX !== null && clientY !== null) {
            const rect = viewport.getBoundingClientRect();
            const screenX = clientX - rect.left;
            const screenY = clientY - rect.top;
            point = { x: screenX, y: screenY };
        }
        
        // Get Scale for sizing
        let scale = 1;
        if (viewport.cameraController) {
            scale = viewport.cameraController.scale;
        }

        // 1. Check for declarative cursor (Only if point exists)
        if (this.activeTool.cursor && point) {
            this.drawCursor(ctx, this.activeTool.cursor, point, scale);
        } 
        
        // 2. Check for custom delegation (Allow both)
        if (this.activeTool.onDrawIndicator) {
            this.activeTool.onDrawIndicator(ctx, point, viewport);
        }
    }

    clearAllIndicators() {
        const canvases = document.querySelectorAll('.tool-indicator-layer');
        canvases.forEach(canvas => {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        });
    }

    getLogicalPoint(e, viewport) {
        // Deprecated for internal use, but kept if needed by other systems
        const rect = viewport.getBoundingClientRect();
        let x = e.clientX - rect.left;
        let y = e.clientY - rect.top;

        if (viewport.cameraController) {
            const { position, scale } = viewport.cameraController;
            x = (x - position.x) / scale;
            y = (y - position.y) / scale;
        }
        return { x, y };
    }

    drawCursor(ctx, cursor, point, scale = 1) {
        IndicatorRenderer.drawCursor(ctx, cursor, point, scale);
    }

    // --- Unified Indicator Helpers ---

    projectToScreen(logicalPt, viewport) {
        return IndicatorRenderer.projectToScreen(logicalPt, viewport);
    }

    drawGradientIndicator(ctx, startPt, endPt, colors, type, reverse, opacity, viewport) {
        IndicatorRenderer.drawGradientIndicator(ctx, startPt, endPt, colors, type, reverse, opacity, viewport);
    }

    drawShapeIndicator(ctx, rect, shapeType, sides, rotation, viewport) {
        IndicatorRenderer.drawShapeIndicator(ctx, rect, shapeType, sides, rotation, viewport);
    }

    drawCropIndicator(ctx, rect, handleSize, viewport) {
        IndicatorRenderer.drawCropIndicator(ctx, rect, handleSize, viewport);
    }

    drawImageIndicator(ctx, image, rect, opacity, rotation, viewport) {
        IndicatorRenderer.drawImageIndicator(ctx, image, rect, opacity, rotation, viewport);
    }

    drawCloneSourceIndicator(ctx, sourcePt, viewport) {
        IndicatorRenderer.drawCloneSourceIndicator(ctx, sourcePt, viewport);
    }
}
