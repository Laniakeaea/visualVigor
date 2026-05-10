import { getStroke } from 'perfect-freehand';

export class StrokeRenderer {
    constructor() {
        this.proxyCanvas = null;
    }

    render(ctx, points, options, style, mode = 'advanced') {
        if (mode === 'advanced') {
            this._renderAdvanced(ctx, points, options, style);
        } else {
            this._renderSimple(ctx, points, options, style);
        }
    }

    _renderAdvanced(ctx, points, options, style) {
        ctx.save();
        if (style.globalAlpha !== undefined) ctx.globalAlpha = style.globalAlpha;
        if (style.globalCompositeOperation) ctx.globalCompositeOperation = style.globalCompositeOperation;

        // Advanced Mode: Use perfect-freehand
        const stroke = getStroke(points, options);
        const pathData = this.getSvgPathFromStroke(stroke);
        
        ctx.fillStyle = style.fillStyle;
        const path = new Path2D(pathData);
        ctx.fill(path);

        if (style.strokeStyle) {
            ctx.strokeStyle = style.strokeStyle;
            ctx.lineWidth = style.lineWidth || 1;
            ctx.stroke(path);
        }

        ctx.restore();
    }

    _renderSimple(ctx, points, options, style) {
        // Handle accumulation prevention (for semi-transparent previews like Eraser)
        if (style.preventAccumulation && style.globalAlpha < 1) {
            this._renderSimpleNoAccumulation(ctx, points, options, style);
            return;
        }

        ctx.save();
        if (style.globalAlpha !== undefined) ctx.globalAlpha = style.globalAlpha;
        if (style.globalCompositeOperation) ctx.globalCompositeOperation = style.globalCompositeOperation;

        // Simple Mode: Pixel Perfect
        const size = Math.max(1, Math.floor(options.size));
        ctx.fillStyle = style.fillStyle;
        
        if (points.length === 0) {
            ctx.restore();
            return;
        }

        // Draw points with interpolation
        if (points.length === 1) {
            this._drawPixel(ctx, points[0][0], points[0][1], size);
        } else {
            for (let i = 0; i < points.length - 1; i++) {
                let x0 = points[i][0];
                let y0 = points[i][1];
                let x1 = points[i+1][0];
                let y1 = points[i+1][1];

                const dx = x1 - x0;
                const dy = y1 - y0;
                const steps = Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)));

                for (let s = 0; s <= steps; s++) {
                    const t = steps === 0 ? 0 : s / steps;
                    this._drawPixel(ctx, x0 + dx * t, y0 + dy * t, size);
                }
            }
        }

        ctx.restore();
    }

    _renderSimpleNoAccumulation(ctx, points, options, style) {
        // Create or resize proxy canvas
        if (!this.proxyCanvas) {
            this.proxyCanvas = document.createElement('canvas');
        }
        if (this.proxyCanvas.width !== ctx.canvas.width || this.proxyCanvas.height !== ctx.canvas.height) {
            this.proxyCanvas.width = ctx.canvas.width;
            this.proxyCanvas.height = ctx.canvas.height;
        }

        const pCtx = this.proxyCanvas.getContext('2d');
        pCtx.clearRect(0, 0, this.proxyCanvas.width, this.proxyCanvas.height);

        // Draw to proxy with full opacity
        const proxyStyle = { ...style, globalAlpha: 1, preventAccumulation: false };
        this._renderSimple(pCtx, points, options, proxyStyle);

        // Draw proxy to main context with desired alpha
        ctx.save();
        if (style.globalAlpha !== undefined) ctx.globalAlpha = style.globalAlpha;
        if (style.globalCompositeOperation) ctx.globalCompositeOperation = style.globalCompositeOperation;
        ctx.drawImage(this.proxyCanvas, 0, 0);
        ctx.restore();
    }

    _drawPixel(ctx, x, y, size) {
        const px = Math.floor(x);
        const py = Math.floor(y);
        // Center the brush
        const offset = Math.floor(size / 2);
        ctx.fillRect(px - offset, py - offset, size, size);
    }

    getSvgPathFromStroke(stroke) {
        if (!stroke.length) return '';
        const d = stroke.reduce(
            (acc, [x0, y0], i, arr) => {
                const [x1, y1] = arr[(i + 1) % arr.length];
                acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
                return acc;
            },
            ['M', ...stroke[0], 'Q']
        );
        d.push('Z');
        return d.join(' ');
    }
}
