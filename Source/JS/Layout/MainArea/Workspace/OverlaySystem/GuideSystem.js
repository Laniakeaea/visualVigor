/**
 * Handles Interaction, Hit-Testing and Rendering of Guides.
 */
export class GuideSystem {
    constructor(controller) {
        this.controller = controller;
        this.guides = []; // Changed to Array to match new ProjectModel
        this.snapGuides = [];
        this.dragState = null; // { axis, pos, crossPos }

        this._initInteraction();
    }

    setGuides(guides) {
        // Adapt to new structure (Array) or Legacy ({x:[], y:[]})
        if (Array.isArray(guides)) {
            this.guides = guides;
        } else if (guides && (guides.x || guides.y)) {
             // Migration/Fallback mainly for development transition
            this.guides = [];
            if (guides.x) guides.x.forEach(p => this.guides.push({ axis: 'x', position: p, visible: true }));
            if (guides.y) guides.y.forEach(p => this.guides.push({ axis: 'y', position: p, visible: true }));
        } else {
            this.guides = [];
        }
    }

    setSnapGuides(lines) {
        this.snapGuides = lines || [];
    }

    /**
     * Sets a temporary guide being dragged (e.g. from Ruler).
     */
    setDragGuide(axis, pos, crossPos) {
        this.dragState = { axis, pos, crossPos, isDragging: true };
        this.controller.draw();
    }

    /**
     * Clears the temporary drag guide.
     */
    clearDragGuide() {
        this.dragState = null;
        this.controller.draw();
    }

    _initInteraction() {
        // Use container for mouse events
        const target = this.controller.container;
        target.addEventListener('mousedown', (e) => this._onMouseDown(e), { capture: true });
        window.addEventListener('mousemove', (e) => this._onMouseMove(e));
        window.addEventListener('mouseup', (e) => this._onMouseUp(e));
    }

    _getLogicalPos(e) {
        const rect = this.controller.container.getBoundingClientRect();
        const t = this.controller.transform;
        const axis = this.dragState ? this.dragState.axis : 'x'; // Default
        
        if (axis === 'x') {
            return (e.clientX - rect.left - t.x) / t.scale;
        } else {
            return (e.clientY - rect.top - t.y) / t.scale;
        }
    }

    hitTest(clientX, clientY) {
        const t = this.controller.transform;
        const rect = this.controller.container.getBoundingClientRect();
        const mx = clientX - rect.left;
        const my = clientY - rect.top;
        const tolerance = 6;

        for (const guide of this.guides) {
            // Check visibility if property exists
            if (guide.visible === false) continue;

            const axis = guide.axis;
            const pos = guide.position;

            if (axis === 'x') {
                const screenPos = (pos * t.scale) + t.x;
                if (Math.abs(screenPos - mx) <= tolerance) {
                    return { axis: 'x', pos: pos, id: guide.id };
                }
            } else {
                const screenPos = (pos * t.scale) + t.y;
                if (Math.abs(screenPos - my) <= tolerance) {
                    return { axis: 'y', pos: pos, id: guide.id };
                }
            }
        }
        return null;
    }

    _onMouseDown(e) {
        if (e.button !== 0) return;
        const hit = this.hitTest(e.clientX, e.clientY);
        
        if (hit) {
            e.stopImmediatePropagation();
            e.preventDefault();
            
            // Remove from model temporarily
            if (window.projectModel) {
                if (hit.id) {
                    window.projectModel.removeGuide(hit.id);
                } else if (window.projectModel.removeGuideByPos) {
                    window.projectModel.removeGuideByPos(hit.axis, hit.pos);
                }
            }

            this.dragState = { axis: hit.axis, pos: hit.pos, isDragging: true };
            document.body.style.cursor = hit.axis === 'x' ? 'col-resize' : 'row-resize';
            this.controller.draw();
        }
    }

    _onMouseMove(e) {
        if (this.dragState && this.dragState.isDragging) {
            e.preventDefault();
            
            const rect = this.controller.container.getBoundingClientRect();
            let pos = this._getLogicalPos(e);
            pos = Math.round(pos);
            
            // Update Drag State
            this.dragState.pos = pos;
            this.dragState.crossPos = this.dragState.axis === 'x' ? (e.clientY - rect.top) : (e.clientX - rect.left);
            
            this.controller.draw();
        } else {
            // Hover
            const hit = this.hitTest(e.clientX, e.clientY);
            this.controller.container.style.cursor = hit ? (hit.axis === 'x' ? 'col-resize' : 'row-resize') : '';
        }
    }

    _onMouseUp(e) {
        if (!this.dragState || !this.dragState.isDragging) return;

        this.dragState.isDragging = false;
        document.body.style.cursor = '';
        this.controller.container.style.cursor = '';

        // Check if dropped outside
        const rect = this.controller.container.getBoundingClientRect();
        const isOutside = e.clientX < rect.left || e.clientX > rect.right || 
                          e.clientY < rect.top || e.clientY > rect.bottom;

        if (!isOutside && window.projectModel) {
            window.projectModel.addGuide(this.dragState.axis, Math.round(this.dragState.pos));
        }

        this.dragState = null;
        this.controller.draw();
    }

    draw(ctx, transform, artboard) {
        const { scale, x, y } = transform;
        const { width, height } = this.controller.canvas; // Canvas dimensions
        const guideColor = this.controller.getThemeColor('--color-guide');

        ctx.lineWidth = 1;
        ctx.setLineDash([]);

        const drawLine = (axis, pos, color) => {
            ctx.strokeStyle = color;
            const offset = axis === 'x' ? x : y;
            const sp = Math.round((pos * scale) + offset) + 0.5;
            
            ctx.beginPath();
            if (axis === 'x') { ctx.moveTo(sp, 0); ctx.lineTo(sp, height); }
            else { ctx.moveTo(0, sp); ctx.lineTo(width, sp); }
            ctx.stroke();
        };

        // Static Guides
        for (const guide of this.guides) {
            if (guide.visible !== false) {
                drawLine(guide.axis, guide.position, guideColor);
            }
        }

        // Snap Guides
        if (this.snapGuides.length) {
            const snapColor = '#ff0000'; 
            this.snapGuides.forEach(l => drawLine(l.axis, l.pos, snapColor));
        }

        // Active Dragging Guide
        if (this.dragState) {
            const activeColor = this.controller.getThemeColor('--color-guide-active');
            drawLine(this.dragState.axis, this.dragState.pos, activeColor);
            this._drawDistances(ctx, transform, artboard, activeColor);
        }
    }

    // Encapsulated Distance Graphics
    _drawDistances(ctx, transform, artboard, color) {
        if (!this.dragState) return;
        const { axis, pos, crossPos } = this.dragState;
        const { scale, x, y } = transform;
        const { width, height } = this.controller.canvas;

        // Collect positions
        let points = [0];
        if (axis === 'x') {
            points.push(artboard.width);
            for (const g of this.guides) {
                if (g.axis === 'x' && g.visible !== false) points.push(g.position);
            }
        } else {
            points.push(artboard.height);
            for (const g of this.guides) {
                if (g.axis === 'y' && g.visible !== false) points.push(g.position);
            }
        }
        
        points = points.filter(p => Math.abs(p - pos) > 0.1).sort((a,b) => a-b);
        
        // Find Nearest
        let prev = null, next = null;
        for (let p of points) {
            if (p < pos) prev = p;
            else if (p > pos) { next = p; break; }
        }

        // Drawing Helper
        const cp = crossPos !== undefined ? crossPos : (axis === 'x' ? height/2 : width/2);
        const fontSize = 16;
        ctx.font = `bold ${fontSize}px "Ubuntu", "HarmonyOS Sans", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeStyle = color;
        ctx.fillStyle = color;

        const drawDim = (p1, p2) => {
             const dist = Math.abs(p2 - p1);
             const mid = (p1 + p2)/2;
             const offset = axis === 'x' ? x : y;
             const sP1 = Math.round((p1 * scale) + offset) + 0.5;
             const sP2 = Math.round((p2 * scale) + offset) + 0.5;
             const sMid = Math.round((mid * scale) + offset);

             ctx.beginPath();
             ctx.setLineDash([3, 5]);
             if (axis === 'x') {
                 ctx.moveTo(sP1, cp); ctx.lineTo(sP2, cp);
                 ctx.stroke();
                 // Ticks
                 ctx.setLineDash([]); ctx.beginPath();
                 ctx.moveTo(sP1, cp-3); ctx.lineTo(sP1, cp+3);
                 ctx.moveTo(sP2, cp-3); ctx.lineTo(sP2, cp+3);
                 ctx.stroke();
             } else {
                 ctx.moveTo(cp, sP1); ctx.lineTo(cp, sP2);
                 ctx.stroke();
                 // Ticks
                 ctx.setLineDash([]); ctx.beginPath();
                 ctx.moveTo(cp-3, sP1); ctx.lineTo(cp+3, sP1);
                 ctx.moveTo(cp-3, sP2); ctx.lineTo(cp+3, sP2);
                 ctx.stroke();
             }

             // Label
             const text = Math.round(dist).toString();
             const metrics = ctx.measureText(text);
             const tw = metrics.width + 16;
             const th = fontSize + 8;
             
             // Box
             let bx = (axis === 'x') ? sMid - tw/2 : cp + 16;
             let by = (axis === 'x') ? cp - th/2 - 16 : sMid - th/2;
             
             ctx.save();
             ctx.fillStyle = this.controller.getThemeColor('--color-bg-panel');
             ctx.beginPath();
             if (ctx.roundRect) {
                 ctx.roundRect(bx, by, tw, th, 4);
             } else {
                 // Polyfill for roundRect
                 const x = bx, y = by, w = tw, h = th, r = 4;
                 ctx.moveTo(x + r, y);
                 ctx.lineTo(x + w - r, y);
                 ctx.quadraticCurveTo(x + w, y, x + w, y + r);
                 ctx.lineTo(x + w, y + h - r);
                 ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
                 ctx.lineTo(x + r, y + h);
                 ctx.quadraticCurveTo(x, y + h, x, y + h - r);
                 ctx.lineTo(x, y + r);
                 ctx.quadraticCurveTo(x, y, x + r, y);
             }
             ctx.fill();
             ctx.restore();
             
             ctx.fillText(text, bx + tw/2, by + th/2);
        };

        if (prev !== null) drawDim(prev, pos);
        if (next !== null) drawDim(pos, next);
    }
}