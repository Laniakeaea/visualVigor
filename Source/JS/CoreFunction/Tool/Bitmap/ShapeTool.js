import { ToolUtils } from '../ToolUtils.js';
import { BitmapCommand } from '../../Edit/Commands/BitmapCommand.js';

export class ShapeTool {
    constructor() {
        this.id = 'toolBitmapShape';
        this.options = {
            shape: 'rectangle', // 'rectangle', 'ellipse', 'polygon'
            sides: 5,           // For polygon
            size: 5,            // Stroke width
            fill: false,        // Fill shape?
            keepRatio: false    // 1:1 aspect ratio
        };
        
        this.state = 'IDLE'; // 'IDLE', 'SIZING', 'ROTATING'
        this.rect = { x: 0, y: 0, w: 0, h: 0, rotation: 0 };
        
        this.startPoint = null;
        this.currentPoint = null;
        this.activeViewport = null;
    }

    activate() {
        this.bindEvents();
        document.body.style.cursor = 'crosshair';
    }

    deactivate() {
        this.unbindEvents();
        document.body.style.cursor = '';
        if (window.indicatorSystem) window.indicatorSystem.update();
        this.state = 'IDLE';
    }

    bindEvents() {
        this.handleDown = this.onPointerDown.bind(this);
        this.handleMove = this.onPointerMove.bind(this);
        this.handleUp = this.onPointerUp.bind(this);

        document.addEventListener('pointerdown', this.handleDown);
        document.addEventListener('pointermove', this.handleMove);
        document.addEventListener('pointerup', this.handleUp);
        
        // Modifier keys
        this.handleKeyDown = this.onKeyDown.bind(this);
        this.handleKeyUp = this.onKeyUp.bind(this);
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

    onKeyDown(e) {
        if (e.key === 'Shift') {
            this.shiftPressed = true;
            if (this.state !== 'IDLE' && window.indicatorSystem) window.indicatorSystem.update();
        }
    }

    onKeyUp(e) {
        if (e.key === 'Shift') {
            this.shiftPressed = false;
            if (this.state !== 'IDLE' && window.indicatorSystem) window.indicatorSystem.update();
        }
    }

    onDrawIndicator(ctx, point, viewport) {
        if (this.state === 'IDLE' || !this.rect) return;

        if (window.indicatorSystem) {
            window.indicatorSystem.drawShapeIndicator(
                ctx,
                this.rect,
                this.options.shape,
                this.options.sides,
                (this.rect.rotation !== undefined) ? this.rect.rotation : 0,
                viewport
            );
        }
    }

    onPointerDown(e) {
        if (e.button !== 0) return;
        
        const viewport = e.target.closest('.workspace__viewport');
        if (!viewport) return;

        if (!ToolUtils.validateActiveLayer()) return;

        this.activeViewport = viewport;
        const pt = this._getLogicalPoint(e, viewport);

        if (this.state === 'IDLE') {
            this.state = 'SIZING';
            this.startPoint = pt;
            this.currentPoint = pt;
            this.rect = { x: pt.x, y: pt.y, w: 0, h: 0, rotation: 0 };
            if (window.indicatorSystem) window.indicatorSystem.update();
        } else if (this.state === 'ROTATING') {
            this._commitShape();
            this.state = 'IDLE';
            if (window.indicatorSystem) window.indicatorSystem.update();
        }
    }

    onPointerMove(e) {
        if (!this.activeViewport) return;
        
        const pt = this._getLogicalPoint(e, this.activeViewport);
        
        if (this.state === 'SIZING') {
            this.currentPoint = pt;
            this.rect = this._getShapeRect();
            this.rect.rotation = 0; // Reset rotation during sizing
            if (window.indicatorSystem) window.indicatorSystem.update();
        } else if (this.state === 'ROTATING') {
            const cx = this.rect.x + this.rect.w / 2;
            const cy = this.rect.y + this.rect.h / 2;
            const dx = pt.x - cx;
            const dy = pt.y - cy;
            const angle = Math.atan2(dy, dx) * 180 / Math.PI;
            
            // Snap to 15 degrees if Shift is pressed
            if (this.shiftPressed) {
                this.rect.rotation = Math.round(angle / 15) * 15;
            } else {
                this.rect.rotation = angle;
            }
            if (window.indicatorSystem) window.indicatorSystem.update();
        }
    }

    onPointerUp(e) {
        if (this.state === 'SIZING') {
            // If width/height is tiny, maybe just a click?
            if (this.rect.w < 2 && this.rect.h < 2) {
                // Just a click, maybe create default size?
                // For now, let's just switch to rotating or cancel if too small
            }
            this.state = 'ROTATING';
        }
    }

    _commitShape() {
        const canvas = ToolUtils.validateActiveLayer();
        if (canvas) {
            const ctx = canvas.getContext('2d');
            
            // Use stored rect
            const rect = this.rect;
            
            // Expand bounds for stroke width and rotation
            // Simple bounding box for rotation is complex, let's take a safe margin
            const diag = Math.sqrt(rect.w * rect.w + rect.h * rect.h);
            const padding = Math.ceil(this.options.size / 2) + Math.ceil(diag / 2) + 2;
            
            const cx = rect.x + rect.w / 2;
            const cy = rect.y + rect.h / 2;
            
            const x = Math.floor(cx - padding);
            const y = Math.floor(cy - padding);
            const w = Math.ceil(padding * 2);
            const h = Math.ceil(padding * 2);
            
            // Capture Old Data
            const oldData = ctx.getImageData(x, y, w, h);
            
            // Draw Shape
            this._drawShape(ctx, rect);
            
            // Capture New Data
            const newData = ctx.getImageData(x, y, w, h);
            
            // Apply Selection Mask
            ToolUtils.applySelectionMask(newData, oldData, x, y);
            ctx.putImageData(newData, x, y);

            // Command
            if (window.projectModel && window.projectModel.selectedLayerId && window.editSystem) {
                const currentFrame = window.projectModel.data.timeline.currentFrame || 0;
                const cmd = new BitmapCommand(
                    window.projectModel.selectedLayerId,
                    oldData,
                    newData,
                    x, y,
                    currentFrame
                );
                window.editSystem.addCommand(cmd);
            }
            
            window.dispatchEvent(new CustomEvent('projectLayersChanged'));
        }
        
        this.startPoint = null;
        this.currentPoint = null;
        this.activeViewport = null;
    }

    _getShapeRect() {
        let x = Math.min(this.startPoint.x, this.currentPoint.x);
        let y = Math.min(this.startPoint.y, this.currentPoint.y);
        let w = Math.abs(this.currentPoint.x - this.startPoint.x);
        let h = Math.abs(this.currentPoint.y - this.startPoint.y);
        
        if (this.options.keepRatio || this.shiftPressed) {
            const size = Math.max(w, h);
            w = size;
            h = size;
            
            // Adjust x/y based on direction
            if (this.currentPoint.x < this.startPoint.x) x = this.startPoint.x - w;
            if (this.currentPoint.y < this.startPoint.y) y = this.startPoint.y - h;
        }
        
        return { x, y, w, h };
    }

    _drawShape(ctx, rect) {
        ctx.save();
        
        // Style
        const color = window.projectModel ? window.projectModel.data.settings.color : { h:0, s:0, l:0, a:1 };
        // Convert color to string (assuming helper exists or manual)
        // TODO: Use ColorUtils if available, or simple HSL
        const colorStr = this._getColorString(color);
        
        ctx.strokeStyle = colorStr;
        ctx.fillStyle = colorStr;
        ctx.lineWidth = this.options.size;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        ctx.beginPath();
        
        // Apply Rotation
        const cx = rect.x + rect.w / 2;
        const cy = rect.y + rect.h / 2;
        
        ctx.translate(cx, cy);
        // Use rect.rotation if available
        const rotation = (rect.rotation !== undefined) ? rect.rotation : 0;
        if (rotation !== 0) {
            ctx.rotate(rotation * Math.PI / 180);
        }
        
        // Draw centered at 0,0
        const w = rect.w;
        const h = rect.h;
        
        if (this.options.shape === 'ellipse') {
            // Ellipse
            ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
        } else if (this.options.shape === 'polygon') {
            // Polygon (Inscribed)
            const sides = Math.max(3, this.options.sides);
            const rx = w / 2;
            const ry = h / 2;
            
            ctx.moveTo(0, -ry); // Start at top
            for (let i = 1; i < sides; i++) {
                const angle = (i * 2 * Math.PI) / sides;
                ctx.lineTo(Math.sin(angle) * rx, -Math.cos(angle) * ry);
            }
            ctx.closePath();
        } else {
            // Rectangle
            ctx.rect(-w / 2, -h / 2, w, h);
        }
        
        if (this.options.fill) {
            ctx.fill();
        } else {
            ctx.stroke();
        }
        
        ctx.restore();
    }

    _getColorString(color) {
        if (color && typeof color.h === 'number') {
            return `hsla(${color.h}, ${color.s * 100}%, ${color.l * 100}%, ${color.a})`;
        }
        return '#000000';
    }



    _getLogicalPoint(e, viewport) {
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
}
