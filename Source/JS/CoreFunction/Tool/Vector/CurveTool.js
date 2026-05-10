import { ToolUtils } from '../ToolUtils.js';
import { VectorCommand } from '../../Edit/Commands/VectorCommand.js';
import paper from 'paper';

export class CurveTool {
    constructor() {
        this.id = 'toolVectorCurve';
        this.path = null;
        this.activeSegment = null;
        this.isDragging = false;
        this.options = {
            size: 2
        };
    }

    get cursor() {
        return {
            type: 'pen' // Assuming we have a pen cursor, or fallback to default
        };
    }

    activate() {
        this.bindEvents();
    }

    deactivate() {
        this.finishPath(false); // Cancel if deactivated mid-drawing
        this.unbindEvents();
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

    getColor() {
        if (window.projectModel && window.projectModel.data && window.projectModel.data.settings.color) {
            const c = window.projectModel.data.settings.color;
            return `hsla(${c.h}, ${c.s * 100}%, ${c.l * 100}%, ${c.a})`;
        }
        return '#000000';
    }

    onPointerDown(e) {
        const viewport = e.target.closest('.workspace__viewport');
        if (!viewport) return;

        // Right Click: Undo Last Point
        if (e.button === 2) {
            this.activeViewport = viewport;
            this.undoLastPoint(e);
            return;
        }

        if (e.button !== 0) return;

        if (!window.projectModel || !window.projectModel.data) return;
        if (!window.vectorSystem) return;

        this.activeViewport = viewport;
        const point = this.getCanvasPoint(e, viewport);
        const scope = window.vectorSystem.scope;

        // 1. Start new path if none exists
        if (!this.path) {
            this.path = new scope.Path();
            this.path.strokeColor = this.getColor();
            this.path.strokeWidth = this.options.size;
            this.path.strokeCap = 'round';
            this.path.strokeJoin = 'round';
        }

        // 2. Check for closing (click on start point)
        if (this.path.segments.length > 0) {
            const firstPoint = this.path.firstSegment.point;
            // Hit test tolerance (e.g., 10px screen space -> converted to logical)
            const tolerance = 10 / (viewport.cameraController ? viewport.cameraController.scale : 1);
            
            if (firstPoint.getDistance(new scope.Point(point.x, point.y)) < tolerance) {
                this.path.closed = true;
                this.finishPath(true);
                return;
            }
        }

        // 3. Add new segment
        this.path.add(new scope.Point(point.x, point.y));
        this.activeSegment = this.path.lastSegment;
        this.isDragging = true;

        this.updatePreview();
    }

    onPointerMove(e) {
        if (!this.activeViewport) return;
        const point = this.getCanvasPoint(e, this.activeViewport);
        const scope = window.vectorSystem.scope;

        if (this.isDragging && this.activeSegment && this.path) {
            // Dragging handles
            const currentPoint = new scope.Point(point.x, point.y);
            const delta = currentPoint.subtract(this.activeSegment.point);
            
            this.activeSegment.handleOut = delta;
            this.activeSegment.handleIn = delta.multiply(-1);
            
            this.updatePreview(false, null); // false = dragging handles
        } else if (this.path && this.path.segments.length > 0) {
            // Hovering (Rubber band)
            this.updatePreview(true, point); // true = rubber band, point = cursor
        }
    }

    onPointerUp(e) {
        this.isDragging = false;
        this.activeSegment = null;
        
        // Immediately switch to rubber band preview
        if (this.activeViewport) {
             const point = this.getCanvasPoint(e, this.activeViewport);
             this.updatePreview(true, point);
        }
    }

    onDoubleClick(e) {
        // Double click finishes the path
        // Note: Double click triggers Down -> Up -> Down -> Up -> DblClick
        // So we likely just added a point.
        this.finishPath(true);
    }

    onKeyDown(e) {
        if (e.key === 'Enter') {
            this.finishPath(true);
        } else if (e.key === 'Escape') {
            this.finishPath(false);
        }
    }

    getPreviewLayer(viewport) {
        if (!viewport) return null;
        return viewport.querySelector('.tool-preview-layer-svg');
    }

    updatePreview(isRubberBand = false, cursorPoint = null) {
        if (!this.activeViewport || !this.path) return;

        const previewLayer = this.getPreviewLayer(this.activeViewport);
        if (!previewLayer) return;

        // 1. Main Path Preview
        let pathEl = previewLayer.querySelector('path.curve-preview');
        if (!pathEl) {
            pathEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
            pathEl.classList.add('curve-preview');
            pathEl.setAttribute('fill', 'none');
            pathEl.setAttribute('stroke-linecap', 'round');
            pathEl.setAttribute('stroke-linejoin', 'round');
            previewLayer.appendChild(pathEl);
        }
        
        let d = this.path.pathData;

        // Add Rubber Band Segment
        if (isRubberBand && cursorPoint) {
            const lastSegment = this.path.lastSegment;
            const p0 = lastSegment.point;
            const h0 = lastSegment.handleOut; // Vector
            
            // If last point has a handleOut, we draw a curve.
            // Since the new point (cursor) has no handleIn yet, we treat it as a simple endpoint.
            // Bezier: P0, P0+H0, P1, P1
            
            if (!h0.isZero()) {
                const c1 = p0.add(h0);
                d += ` C ${c1.x} ${c1.y}, ${cursorPoint.x} ${cursorPoint.y}, ${cursorPoint.x} ${cursorPoint.y}`;
            } else {
                d += ` L ${cursorPoint.x} ${cursorPoint.y}`;
            }
        }

        pathEl.setAttribute('d', d);
        pathEl.setAttribute('stroke', this.path.strokeColor.toCSS(true));
        pathEl.setAttribute('stroke-width', this.path.strokeWidth);

        // 2. Handle Previews (Only when dragging)
        this.updateHandlePreviews(previewLayer, !isRubberBand);
    }

    updateHandlePreviews(previewLayer, show) {
        // Helper to manage handle lines
        let group = previewLayer.querySelector('g.handle-preview-group');
        if (!show) {
            if (group) group.remove();
            return;
        }

        if (!group) {
            group = document.createElementNS("http://www.w3.org/2000/svg", "g");
            group.classList.add('handle-preview-group');
            previewLayer.appendChild(group);
        }

        // Clear existing lines in group
        while (group.firstChild) {
            group.removeChild(group.firstChild);
        }

        if (this.activeSegment) {
            const p = this.activeSegment.point;
            const hIn = this.activeSegment.handleIn;
            const hOut = this.activeSegment.handleOut;

            const createLine = (p1, p2) => {
                const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
                line.setAttribute('x1', p1.x);
                line.setAttribute('y1', p1.y);
                line.setAttribute('x2', p2.x);
                line.setAttribute('y2', p2.y);
                line.setAttribute('stroke', '#00a8ff'); // Standard selection blue
                line.setAttribute('stroke-width', '1');
                return line;
            };

            const createCircle = (c) => {
                const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                circle.setAttribute('cx', c.x);
                circle.setAttribute('cy', c.y);
                circle.setAttribute('r', '3');
                circle.setAttribute('fill', '#fff');
                circle.setAttribute('stroke', '#00a8ff');
                circle.setAttribute('stroke-width', '1');
                return circle;
            }

            if (!hIn.isZero()) {
                const pIn = p.add(hIn);
                group.appendChild(createLine(p, pIn));
                group.appendChild(createCircle(pIn));
            }
            if (!hOut.isZero()) {
                const pOut = p.add(hOut);
                group.appendChild(createLine(p, pOut));
                group.appendChild(createCircle(pOut));
            }
        }
    }

    undoLastPoint(e) {
        if (!this.path) return;

        // Remove last segment
        this.path.removeSegment(this.path.segments.length - 1);

        if (this.path.segments.length === 0) {
            this.path.remove();
            this.path = null;
            this.activeSegment = null;
            
            // Clear Preview
            const previewLayer = this.getPreviewLayer(this.activeViewport);
            if (previewLayer) {
                const pathEl = previewLayer.querySelector('path.curve-preview');
                if (pathEl) pathEl.remove();
                const group = previewLayer.querySelector('g.handle-preview-group');
                if (group) group.remove();
            }
        } else {
            this.activeSegment = this.path.lastSegment;
            // Update preview (Rubber band)
            const point = this.getCanvasPoint(e, this.activeViewport);
            this.updatePreview(true, point);
        }
    }

    finishPath(commit) {
        // Clear Preview
        if (this.activeViewport) {
            const previewLayer = this.getPreviewLayer(this.activeViewport);
            if (previewLayer) {
                const pathEl = previewLayer.querySelector('path.curve-preview');
                if (pathEl) pathEl.remove();
                const group = previewLayer.querySelector('g.handle-preview-group');
                if (group) group.remove();
            }
        }

        if (this.path) {
            if (commit && this.path.segments.length > 1) {
                this.createVectorElement(this.path);
            }
            this.path.remove(); // Remove from Paper.js scope
            this.path = null;
        }

        this.activeSegment = null;
        this.isDragging = false;
        this.activeViewport = null;
    }

    createVectorElement(paperPath) {
        if (!window.projectModel) return;

        const d = paperPath.pathData;

        const element = window.projectModel.addVectorElement('path');
        if (element) {
            element.properties = {
                d: d,
                stroke: paperPath.strokeColor.toCSS(true),
                strokeWidth: paperPath.strokeWidth,
                fill: paperPath.closed ? '#cccccc' : 'none', // Default fill if closed? Or just none.
                strokeLinecap: paperPath.strokeCap,
                strokeLinejoin: paperPath.strokeJoin
            };
            
            // If closed, maybe default fill to none for now to match other tools, 
            // or let user decide. Keeping 'none' is safer.
            element.properties.fill = 'none';

            window.dispatchEvent(new CustomEvent('projectLayersChanged'));

            if (window.editSystem) {
                window.editSystem.addCommand(new VectorCommand('add', element));
            }
        }
    }
}
