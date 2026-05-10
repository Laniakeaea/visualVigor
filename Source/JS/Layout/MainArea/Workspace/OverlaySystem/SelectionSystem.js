/**
 * Handles Selection (Marching Ants) Animation and Path Generation.
 */
export class SelectionSystem {
    constructor(controller) {
        this.controller = controller;
        this.path = null;
        this.dashOffset = 0;
        this.animating = false;
        this.animId = null;
    }

    updateSelection(detail) {
        if (!detail || !detail.mask) {
            this._stop();
            this.path = null;
            return;
        }
        this.path = this._generatePath(detail.mask, detail.width, detail.height);
        if (!this.animating) this._start();
    }

    _start() {
        this.animating = true;
        const loop = () => {
            if (!this.animating) return;
            this.dashOffset -= 0.5;
            if (this.dashOffset < -8) this.dashOffset = 0;
            this.controller.draw();
            this.animId = requestAnimationFrame(loop);
        };
        loop();
    }

    _stop() {
        this.animating = false;
        if (this.animId) cancelAnimationFrame(this.animId);
    }

    _generatePath(mask, w, h) {
        const path = new Path2D();
        // Optimization: Use 1D array access
        for (let y = 0; y < h; y++) {
            const yw = y * w;
            for (let x = 0; x < w; x++) {
                const idx = yw + x;
                if (mask[idx]) {
                    // Check edges (Top, Bottom, Left, Right)
                    if (y === 0 || !mask[idx - w]) { path.moveTo(x, y); path.lineTo(x + 1, y); }
                    if (y === h - 1 || !mask[idx + w]) { path.moveTo(x, y + 1); path.lineTo(x + 1, y + 1); }
                    if (x === 0 || !mask[idx - 1]) { path.moveTo(x, y); path.lineTo(x, y + 1); }
                    if (x === w - 1 || !mask[idx + 1]) { path.moveTo(x + 1, y); path.lineTo(x + 1, y + 1); }
                }
            }
        }
        return path;
    }

    draw(ctx, transform) {
        if (!this.path) return;
        
        ctx.save();
        ctx.translate(transform.x, transform.y);
        ctx.scale(transform.scale, transform.scale);
        
        const lw = 1 / transform.scale;
        ctx.lineWidth = lw;
        
        // 1. Black Contrast Line
        ctx.strokeStyle = '#000000';
        ctx.setLineDash([4/transform.scale, 4/transform.scale]);
        ctx.lineDashOffset = this.dashOffset / transform.scale;
        ctx.stroke(this.path);
        
        // 2. White Line
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineDashOffset = (this.dashOffset + 4) / transform.scale;
        ctx.stroke(this.path);
        
        ctx.restore();
    }
}