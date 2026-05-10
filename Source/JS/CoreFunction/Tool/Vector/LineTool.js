import { ToolUtils } from '../ToolUtils.js';
import { VectorCommand } from '../../Edit/Commands/VectorCommand.js';
import paper from 'paper';

export class LineTool {
    constructor() {
        this.id = 'toolVectorLine';
        this.isDrawing = false;
        this.startPoint = null;
        this.options = {
            size: 2
        };
    }

    get cursor() {
        return {
            type: 'crosshair'
        };
    }

    activate() {
        this.bindEvents();
    }

    deactivate() {
        this.unbindEvents();
    }

    bindEvents() {
        this.handleDown = this.onPointerDown.bind(this);
        this.handleMove = this.onPointerMove.bind(this);
        this.handleUp = this.onPointerUp.bind(this);

        document.addEventListener('pointerdown', this.handleDown);
        document.addEventListener('pointermove', this.handleMove);
        document.addEventListener('pointerup', this.handleUp);
    }

    unbindEvents() {
        document.removeEventListener('pointerdown', this.handleDown);
        document.removeEventListener('pointermove', this.handleMove);
        document.removeEventListener('pointerup', this.handleUp);
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
        if (window.projectModel && window.projectModel.data && window.projectModel.data.settings.color) {
            const c = window.projectModel.data.settings.color;
            return `hsla(${c.h}, ${c.s * 100}%, ${c.l * 100}%, ${c.a})`;
        }
        return '#000000';
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

    getPreviewLayer(viewport) {
        if (!viewport) return null;
        return viewport.querySelector('.tool-preview-layer-svg');
    }

    onPointerMove(e) {
        if (!this.isDrawing || !this.activeViewport || !this.startPoint) return;
        
        const currentPoint = this.getCanvasPoint(e, this.activeViewport);
        
        // Update SVG Preview
        const previewLayer = this.getPreviewLayer(this.activeViewport);
        if (previewLayer) {
            let lineEl = previewLayer.firstChild;
            if (!lineEl || lineEl.tagName !== 'line') {
                // Clear if it was something else (e.g. path from another tool)
                while (previewLayer.firstChild) {
                    previewLayer.removeChild(previewLayer.firstChild);
                }
                lineEl = document.createElementNS("http://www.w3.org/2000/svg", "line");
                lineEl.setAttribute('stroke-linecap', 'round');
                previewLayer.appendChild(lineEl);
            }
            
            lineEl.setAttribute('x1', this.startPoint.x);
            lineEl.setAttribute('y1', this.startPoint.y);
            lineEl.setAttribute('x2', currentPoint.x);
            lineEl.setAttribute('y2', currentPoint.y);
            
            const color = this.getColor();
            lineEl.setAttribute('stroke', color);
            lineEl.setAttribute('stroke-width', this.options.size);
        }
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
            
            // Create Paper.js Path to get SVG data
            // We use Paper.js here to ensure consistency with how other paths are generated
            // and to easily get the 'd' attribute.
            const scope = window.vectorSystem.scope;
            const path = new scope.Path.Line(
                new scope.Point(this.startPoint.x, this.startPoint.y),
                new scope.Point(endPoint.x, endPoint.y)
            );
            
            path.strokeColor = this.getColor();
            path.strokeWidth = this.options.size;
            path.strokeCap = 'round';

            // Sync to ProjectModel
            this.createVectorElement(path);
            
            // Remove the temporary path from Paper.js
            path.remove(); 
            this.startPoint = null;
        }
        
        this.activeViewport = null;
    }

    createVectorElement(paperPath) {
        if (!window.projectModel) return;

        const d = paperPath.pathData;

        const element = window.projectModel.addVectorElement('path');
        if (element) {
            // element.name is already set by addVectorElement (e.g., "path 1")
            element.properties = {
                d: d,
                stroke: paperPath.strokeColor.toCSS(true),
                strokeWidth: paperPath.strokeWidth,
                fill: 'none',
                strokeLinecap: paperPath.strokeCap,
                strokeLinejoin: 'miter'
            };
            
            // Dispatch update
            window.dispatchEvent(new CustomEvent('projectLayersChanged'));

            // Add to History
            if (window.editSystem) {
                window.editSystem.addCommand(new VectorCommand('add', element));
            }
        }
    }
}
