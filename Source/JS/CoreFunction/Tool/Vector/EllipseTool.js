import { ToolUtils } from '../ToolUtils.js';
import { VectorCommand } from '../../Edit/Commands/VectorCommand.js';
import { ColorUtils } from '../../../Controller/ColorUtils.js';
import paper from 'paper';

export class EllipseTool {
    constructor() {
        this.id = 'toolVectorEllipse';
        this.isDrawing = false;
        this.startPoint = null;
        this.activeColorTarget = 'stroke'; // Default to stroke
        this.options = {
            size: 2,
            stroke: {
                color: { r: 0, g: 0, b: 0, a: 255 }
            },
            fill: {
                enabled: false,
                color: { r: 200, g: 200, b: 200, a: 255 }
            }
        };

        // Initialize stroke color from project if possible
        if (window.projectModel && window.projectModel.data && window.projectModel.data.settings.color) {
            const c = window.projectModel.data.settings.color;
            const rgb = ColorUtils.hslToRgb(c.h, c.s, c.l);
            this.options.stroke.color = { r: rgb.r, g: rgb.g, b: rgb.b, a: Math.round(c.a * 255) };
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
    }

    bindEvents() {
        this.handleDown = this.onPointerDown.bind(this);
        this.handleMove = this.onPointerMove.bind(this);
        this.handleUp = this.onPointerUp.bind(this);
        this.handleKeyDown = this.onKeyDown.bind(this);
        this.handleKeyUp = this.onKeyUp.bind(this);

        document.addEventListener('pointerdown', this.handleDown);
        document.addEventListener('pointermove', this.handleMove);
        document.addEventListener('pointerup', this.handleUp);
        document.addEventListener('keydown', this.handleKeyDown);
        document.addEventListener('keyup', this.handleKeyUp);
    }

    unbindEvents() {
        document.removeEventListener('pointerdown', this.handleDown);
        document.removeEventListener('pointermove', this.handleMove);
        document.removeEventListener('pointerup', this.handleUp);
        document.removeEventListener('keydown', this.handleKeyDown);
        document.removeEventListener('keyup', this.handleKeyUp);
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

    getColor() {
        // Deprecated: Use getStrokeColor or getFillColor
        return this.getStrokeColor();
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

    onPointerDown(e) {
        if (e.button !== 0) return;
        
        const viewport = e.target.closest('.workspace__viewport');
        if (!viewport) return;

        if (!window.projectModel || !window.projectModel.data) return;
        if (!window.vectorSystem) return;

        this.activeViewport = viewport;
        this.isDrawing = true;
        this.startPoint = this.getCanvasPoint(e, viewport);
    }

    onPointerMove(e) {
        if (!this.isDrawing || !this.activeViewport || !this.startPoint) return;
        
        const currentPoint = this.getCanvasPoint(e, this.activeViewport);
        this.updatePreview(currentPoint, e.shiftKey, e.altKey);
    }

    onPointerUp(e) {
        if (!this.isDrawing) return;
        
        this.isDrawing = false;
        
        // Clear Preview
        const previewLayer = this.getPreviewLayer(this.activeViewport);
        if (previewLayer) {
            while (previewLayer.firstChild) {
                previewLayer.removeChild(previewLayer.firstChild);
            }
        }

        if (this.startPoint) {
            const endPoint = this.getCanvasPoint(e, this.activeViewport);
            this.createVectorElement(this.startPoint, endPoint, e.shiftKey, e.altKey);
            this.startPoint = null;
        }
        
        this.activeViewport = null;
    }

    onKeyDown(e) {
        if (this.isDrawing && (e.key === 'Shift' || e.key === 'Alt')) {
            // Force update preview to reflect constraint changes
        }
    }

    onKeyUp(e) {
        // Same as KeyDown
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

    calculateRect(start, end, isSquare, isCenter) {
        let x = start.x;
        let y = start.y;
        let w = end.x - start.x;
        let h = end.y - start.y;

        if (isCenter) {
            x = start.x - w;
            y = start.y - h;
            w *= 2;
            h *= 2;
        }

        if (isSquare) {
            const size = Math.max(Math.abs(w), Math.abs(h));
            w = w < 0 ? -size : size;
            h = h < 0 ? -size : size;
            
            if (isCenter) {
                // Re-adjust origin if it was centered
                x = start.x - w / 2;
                y = start.y - h / 2;
            }
        }

        // Normalize negative width/height for SVG/Paper
        if (w < 0) {
            x += w;
            w = Math.abs(w);
        }
        if (h < 0) {
            y += h;
            h = Math.abs(h);
        }

        return { x, y, width: w, height: h };
    }

    updatePreview(currentPoint, isSquare, isCenter) {
        const previewLayer = this.getPreviewLayer(this.activeViewport);
        if (!previewLayer) return;

        let ellipseEl = previewLayer.firstChild;
        if (!ellipseEl || ellipseEl.tagName !== 'ellipse') {
            while (previewLayer.firstChild) {
                previewLayer.removeChild(previewLayer.firstChild);
            }
            ellipseEl = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
            ellipseEl.setAttribute('fill', 'none');
            previewLayer.appendChild(ellipseEl);
        }

        const rect = this.calculateRect(this.startPoint, currentPoint, isSquare, isCenter);
        
        const cx = rect.x + rect.width / 2;
        const cy = rect.y + rect.height / 2;
        const rx = rect.width / 2;
        const ry = rect.height / 2;

        ellipseEl.setAttribute('cx', cx);
        ellipseEl.setAttribute('cy', cy);
        ellipseEl.setAttribute('rx', rx);
        ellipseEl.setAttribute('ry', ry);
        
        ellipseEl.setAttribute('stroke', this.getStrokeColor());
        ellipseEl.setAttribute('stroke-width', this.options.size);
        ellipseEl.setAttribute('fill', this.getFillColor());
    }

    createVectorElement(start, end, isSquare, isCenter) {
        if (!window.projectModel) return;

        const rect = this.calculateRect(start, end, isSquare, isCenter);
        
        // Don't create zero-size ellipses
        if (rect.width < 0.1 || rect.height < 0.1) return;

        const element = window.projectModel.addVectorElement('ellipse');
        if (element) {
            element.properties = {
                cx: rect.x + rect.width / 2,
                cy: rect.y + rect.height / 2,
                rx: rect.width / 2,
                ry: rect.height / 2,
                stroke: this.getStrokeColor(),
                strokeWidth: this.options.size,
                fill: this.getFillColor()
            };
            
            window.dispatchEvent(new CustomEvent('projectLayersChanged'));

            if (window.editSystem) {
                window.editSystem.addCommand(new VectorCommand('add', element));
            }
        }
    }
}
