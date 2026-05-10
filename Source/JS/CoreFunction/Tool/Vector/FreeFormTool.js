import { ToolUtils } from '../ToolUtils.js';
import { VectorCommand } from '../../Edit/Commands/VectorCommand.js';
import { ColorUtils } from '../../../Controller/ColorUtils.js';
import paper from 'paper';

export class FreeFormTool {
    constructor() {
        this.id = 'toolVectorFreeForm';
        this.isDrawing = false;
        this.path = null;
        this.activeColorTarget = 'stroke'; // Default to stroke
        this.options = {
            mode: 'freehand', // 'freehand' | 'polyline'
            size: 2,
            smoothing: 0.5,
            stroke: {
                color: { r: 0, g: 0, b: 0, a: 255 }
            },
            fill: {
                enabled: true, // Default to filled for FreeForm
                color: { r: 200, g: 200, b: 200, a: 255 }
            }
        };

        // Initialize colors from project if possible
        if (window.projectModel && window.projectModel.data && window.projectModel.data.settings.color) {
            const c = window.projectModel.data.settings.color;
            const rgb = ColorUtils.hslToRgb(c.h, c.s, c.l);
            this.options.stroke.color = { r: rgb.r, g: rgb.g, b: rgb.b, a: Math.round(c.a * 255) };
            this.options.fill.color = { r: rgb.r, g: rgb.g, b: rgb.b, a: Math.round(c.a * 255) }; // Use same color for fill initially
        }
    }

    get cursor() {
        return {
            type: 'crosshair'
        };
    }

    activate() {
        this.bindEvents();
        this.handleColorChange = this.onColorChanged.bind(this);
        window.addEventListener('projectColorChanged', this.handleColorChange);
    }

    deactivate() {
        this.unbindEvents();
        if (this.handleColorChange) {
            window.removeEventListener('projectColorChanged', this.handleColorChange);
            this.handleColorChange = null;
        }
        // Clean up any pending polyline
        if (this.path) {
            this.path.remove();
            this.path = null;
        }
        this.isDrawing = false;
        if (this.activeViewport) {
            this.clearPreview(this.activeViewport);
            this.activeViewport = null;
        }
    }

    bindEvents() {
        this.handleDown = this.onPointerDown.bind(this);
        this.handleMove = this.onPointerMove.bind(this);
        this.handleUp = this.onPointerUp.bind(this);
        this.handleDbClick = this.onDoubleClick.bind(this);
        this.handleKeyDown = this.onKeyDown.bind(this);

        document.addEventListener('pointerdown', this.handleDown);
        document.addEventListener('pointermove', this.handleMove);
        document.addEventListener('pointerup', this.handleUp);
        document.addEventListener('dblclick', this.handleDbClick);
        document.addEventListener('keydown', this.handleKeyDown);
    }

    unbindEvents() {
        document.removeEventListener('pointerdown', this.handleDown);
        document.removeEventListener('pointermove', this.handleMove);
        document.removeEventListener('pointerup', this.handleUp);
        document.removeEventListener('dblclick', this.handleDbClick);
        document.removeEventListener('keydown', this.handleKeyDown);
    }

    getCanvasPoint(e, viewport) {
        if (!viewport) return { x: e.clientX, y: e.clientY };

        const rect = viewport.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        if (viewport.cameraController) {
            const { position, scale } = viewport.cameraController;
            return {
                x: (x - position.x) / scale,
                y: (y - position.y) / scale
            };
        }
        
        return { x, y };
    }

    getStrokeColor() {
        const c = this.options.stroke.color;
        return `rgba(${c.r}, ${c.g}, ${c.b}, ${c.a / 255})`;
    }

    getFillColor() {
        if (!this.options.fill.enabled) return 'none';
        const c = this.options.fill.color;
        return `rgba(${c.r}, ${c.g}, ${c.b}, ${c.a / 255})`;
    }

    onColorChanged(e) {
        const c = e.detail.value || e.detail;
        const rgb = ColorUtils.hslToRgb(c.h, c.s, c.l);
        const colorObj = { r: rgb.r, g: rgb.g, b: rgb.b, a: Math.round(c.a * 255) };

        if (this.activeColorTarget === 'stroke' || this.activeColorTarget === 'active-stroke') {
            this.options.stroke.color = colorObj;
            window.dispatchEvent(new CustomEvent('toolOptionsUpdated'));
        } else if (this.activeColorTarget === 'fill' || this.activeColorTarget === 'active-fill') {
            this.options.fill.color = colorObj;
            window.dispatchEvent(new CustomEvent('toolOptionsUpdated'));
        }
    }

    getPreviewLayer(viewport) {
        if (!viewport) return null;
        return viewport.querySelector('.tool-preview-layer-svg');
    }

    clearPreview(viewport) {
        const previewLayer = this.getPreviewLayer(viewport);
        if (previewLayer) {
            while (previewLayer.firstChild) {
                previewLayer.removeChild(previewLayer.firstChild);
            }
        }
    }

    updatePreview(viewport) {
        const previewLayer = this.getPreviewLayer(viewport);
        if (!previewLayer || !this.path) return;

        let pathEl = previewLayer.firstChild;
        if (!pathEl) {
            pathEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
            pathEl.setAttribute('fill', 'none'); // Don't fill while drawing
            pathEl.setAttribute('stroke-linecap', 'round');
            pathEl.setAttribute('stroke-linejoin', 'round');
            previewLayer.appendChild(pathEl);
        }
        
        pathEl.setAttribute('d', this.path.pathData);
        pathEl.setAttribute('stroke', this.getStrokeColor());
        pathEl.setAttribute('stroke-width', this.options.size);
    }

    // =========================================================================
    // Event Handlers
    // =========================================================================

    onPointerDown(e) {
        if (e.button !== 0) return;
        
        const viewport = e.target.closest('.workspace__viewport');
        if (!viewport) return;

        if (!window.projectModel || !window.projectModel.data) return;
        if (!window.vectorSystem) return;

        this.activeViewport = viewport;
        
        if (this.options.mode === 'polyline') {
            this.handlePolylineDown(e, viewport);
        } else {
            this.handleFreehandDown(e, viewport);
        }
    }

    onPointerMove(e) {
        if (!this.activeViewport) return;
        
        if (this.options.mode === 'polyline') {
            this.handlePolylineMove(e, this.activeViewport);
        } else {
            this.handleFreehandMove(e, this.activeViewport);
        }
    }

    onPointerUp(e) {
        if (this.options.mode === 'polyline') {
            // Polyline doesn't finish on Up
        } else {
            this.handleFreehandUp(e);
        }
    }

    onDoubleClick(e) {
        if (this.options.mode === 'polyline') {
            this.finishPolyline();
        }
    }

    onKeyDown(e) {
        if (this.options.mode === 'polyline' && this.isDrawing) {
            if (e.key === 'Enter') {
                this.finishPolyline();
            } else if (e.key === 'Escape') {
                this.cancelPolyline();
            }
        }
    }

    // =========================================================================
    // Freehand Mode
    // =========================================================================

    handleFreehandDown(e, viewport) {
        this.isDrawing = true;
        const point = this.getCanvasPoint(e, viewport);
        const scope = window.vectorSystem.scope;
        
        this.path = new scope.Path();
        this.path.strokeColor = this.getStrokeColor();
        this.path.strokeWidth = this.options.size;
        this.path.strokeCap = 'round';
        this.path.strokeJoin = 'round';
        this.path.add(new scope.Point(point.x, point.y));
    }

    handleFreehandMove(e, viewport) {
        if (!this.isDrawing || !this.path) return;
        
        const point = this.getCanvasPoint(e, viewport);
        const scope = window.vectorSystem.scope;
        this.path.add(new scope.Point(point.x, point.y));
        
        this.updatePreview(viewport);
    }

    handleFreehandUp(e) {
        if (!this.isDrawing) return;
        this.isDrawing = false;
        
        this.clearPreview(this.activeViewport);

        if (this.path) {
            this.path.closed = true;
            this.path.simplify(2.5);
            this.createVectorElement(this.path);
            this.path.remove(); 
            this.path = null;
        }
        this.activeViewport = null;
    }

    // =========================================================================
    // Polyline Mode
    // =========================================================================

    handlePolylineDown(e, viewport) {
        const point = this.getCanvasPoint(e, viewport);
        const scope = window.vectorSystem.scope;

        if (!this.isDrawing) {
            // Start new polyline
            this.isDrawing = true;
            this.path = new scope.Path();
            this.path.strokeColor = this.getStrokeColor();
            this.path.strokeWidth = this.options.size;
            this.path.strokeCap = 'round';
            this.path.strokeJoin = 'round';
            this.path.add(new scope.Point(point.x, point.y));
            // Add a second point that will follow the mouse
            this.path.add(new scope.Point(point.x, point.y));
        } else {
            // Add point to existing polyline
            // The last point is currently following the mouse (from move event)
            // So we just need to "commit" it by adding a NEW point for the next segment
            
            // Check if closing (clicked near start)
            if (this.path.segments.length > 2) {
                const firstPoint = this.path.firstSegment.point;
                const dist = firstPoint.getDistance(new scope.Point(point.x, point.y));
                if (dist < 10 / (viewport.cameraController ? viewport.cameraController.scale : 1)) {
                    this.finishPolyline();
                    return;
                }
            }

            this.path.lastSegment.point = new scope.Point(point.x, point.y);
            this.path.add(new scope.Point(point.x, point.y)); // Add new floating point
        }
        
        this.updatePreview(viewport);
    }

    handlePolylineMove(e, viewport) {
        if (!this.isDrawing || !this.path) return;

        const point = this.getCanvasPoint(e, viewport);
        const scope = window.vectorSystem.scope;
        
        // Update the last point (floating point) to cursor position
        this.path.lastSegment.point = new scope.Point(point.x, point.y);
        
        this.updatePreview(viewport);
    }

    finishPolyline() {
        if (!this.isDrawing || !this.path) return;

        this.isDrawing = false;
        this.clearPreview(this.activeViewport);

        // Remove the last "floating" segment as it's just the cursor position
        this.path.removeSegment(this.path.segments.length - 1);

        if (this.path.segments.length > 2) {
            this.path.closed = true;
            // No simplify for polyline to keep straight lines
            this.createVectorElement(this.path);
        }
        
        this.path.remove();
        this.path = null;
        this.activeViewport = null;
    }

    cancelPolyline() {
        this.isDrawing = false;
        if (this.activeViewport) {
            this.clearPreview(this.activeViewport);
        }
        if (this.path) {
            this.path.remove();
            this.path = null;
        }
        this.activeViewport = null;
    }

    // =========================================================================
    // Common
    // =========================================================================

    createVectorElement(paperPath) {
        if (!window.projectModel) return;

        const d = paperPath.pathData;

        const properties = {
            d: d,
            stroke: this.getStrokeColor(),
            strokeWidth: this.options.size,
            fill: this.getFillColor(),
            strokeLinecap: 'round',
            strokeLinejoin: 'round'
        };

        const element = window.projectModel.addVectorElement('path', properties);
        if (element) {
            if (window.editSystem) {
                window.editSystem.addCommand(new VectorCommand('add', element));
            }
        }
    }
}
