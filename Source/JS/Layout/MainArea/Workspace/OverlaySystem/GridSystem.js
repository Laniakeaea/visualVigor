/**
 * Handles Grid Rendering with adaptive step calculation.
 */
export class GridSystem {
    constructor(controller) {
        this.controller = controller;
        this.enabled = false;
    }

    setEnabled(enabled) {
        this.enabled = enabled;
    }

    draw(ctx, transform, artboard) {
        if (!this.enabled) return;

        const { scale, x, y } = transform;
        const { width, height } = artboard;

        // 1. Adaptive Step Calculation
        const step = this.controller.getNiceStep(100, scale);
        
        let subStep;
        if (step <= 2) subStep = 1;
        else if (step <= 10) subStep = 1;
        else subStep = step / 5;

        // 2. Colors
        const colorMajor = this.controller.getThemeColor('--color-gray-25');
        const colorMinor = this.controller.getThemeColor('--color-gray-15');

        ctx.save();
        ctx.beginPath();
        // Use rect path for clipping
        const screenW = width * scale;
        const screenH = height * scale;
        ctx.rect(x, y, screenW, screenH);
        ctx.clip();
        ctx.lineWidth = 1;

        // Draw Helper
        const drawGridLines = (interval, color) => {
            ctx.strokeStyle = color;
            ctx.beginPath();
            
            // Vertical
            for (let lx = 0; lx <= width; lx += interval) {
                const sx = Math.round((lx * scale) + x) + 0.5;
                ctx.moveTo(sx, y);
                ctx.lineTo(sx, y + screenH);
            }
            // Horizontal
            for (let ly = 0; ly <= height; ly += interval) {
                const sy = Math.round((ly * scale) + y) + 0.5;
                ctx.moveTo(x, sy);
                ctx.lineTo(x + screenW, sy);
            }
            ctx.stroke();
        };

        if (subStep * scale > 4) {
            drawGridLines(subStep, colorMinor);
        }
        drawGridLines(step, colorMajor);

        ctx.restore();
    }
}