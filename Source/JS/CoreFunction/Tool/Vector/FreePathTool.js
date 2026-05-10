import { ToolUtils } from '../ToolUtils.js';
import { VectorCommand } from '../../Edit/Commands/VectorCommand.js';
import paper from 'paper';

export class FreePathTool {
    constructor() {
        this.id = 'toolVectorFreePath';
        this.isDrawing = false;
        this.path = null;
        this.options = {
            size: 2,
            smoothing: 0.5
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
        
        const point = this.getCanvasPoint(e, viewport);
        
        // Start Paper.js Path
        const scope = window.vectorSystem.scope;
        this.path = new scope.Path();
        this.path.strokeColor = this.getColor();
        this.path.strokeWidth = this.options.size;
        this.path.strokeCap = 'round';
        this.path.strokeJoin = 'round';
        this.path.add(new scope.Point(point.x, point.y));
    }

    getPreviewLayer(viewport) {
        if (!viewport) return null;
        return viewport.querySelector('.tool-preview-layer-svg');
    }

    onPointerMove(e) {
        if (!this.isDrawing || !this.activeViewport || !this.path) return;
        
        const point = this.getCanvasPoint(e, this.activeViewport);
        const scope = window.vectorSystem.scope;
        this.path.add(new scope.Point(point.x, point.y));
        
        // Update SVG Preview
        const previewLayer = this.getPreviewLayer(this.activeViewport);
        if (previewLayer) {
            let pathEl = previewLayer.firstChild;
            if (!pathEl) {
                pathEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
                pathEl.setAttribute('fill', 'none');
                pathEl.setAttribute('stroke-linecap', 'round');
                pathEl.setAttribute('stroke-linejoin', 'round');
                previewLayer.appendChild(pathEl);
            }
            
            pathEl.setAttribute('d', this.path.pathData);
            pathEl.setAttribute('stroke', this.path.strokeColor.toCSS(true));
            pathEl.setAttribute('stroke-width', this.path.strokeWidth);
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

        if (this.path) {
            // Simplify path
            this.path.simplify(2.5); // Adjust tolerance as needed

            // Sync to ProjectModel
            this.createVectorElement(this.path);
            
            // Remove the temporary path from Paper.js
            this.path.remove(); 
            this.path = null;
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
                strokeLinejoin: paperPath.strokeJoin
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
