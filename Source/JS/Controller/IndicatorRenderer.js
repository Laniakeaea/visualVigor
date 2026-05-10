
export class IndicatorRenderer {
    static projectToScreen(logicalPt, viewport) {
        if (!viewport.cameraController) return logicalPt;
        const { position, scale } = viewport.cameraController;
        return {
            x: logicalPt.x * scale + position.x,
            y: logicalPt.y * scale + position.y
        };
    }

    static drawCursor(ctx, cursor, point, scale = 1) {
        if (cursor.type === 'brush') {
            this.drawBrushCursor(ctx, cursor, point, scale);
        } else if (cursor.type === 'crosshair') {
            this.drawCrosshairCursor(ctx, point);
        }
    }

    static drawBrushCursor(ctx, cursor, point, scale) {
        const size = (cursor.size || 10) * scale;
        const r = size / 2;
        
        ctx.save();
        ctx.beginPath();

        if (cursor.shape === 'square') {
            ctx.rect(point.x - r, point.y - r, size, size);
        } else {
            // Default to circle
            ctx.arc(point.x, point.y, Math.max(0, r), 0, Math.PI * 2);
        }
        
        // Outer stroke (Contrast)
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Inner stroke (White)
        if (r > 1) {
            ctx.beginPath();
            if (cursor.shape === 'square') {
                ctx.rect(point.x - r + 1, point.y - r + 1, size - 2, size - 2);
            } else {
                ctx.arc(point.x, point.y, r - 1, 0, Math.PI * 2);
            }
            ctx.strokeStyle = '#FFFFFF';
            ctx.stroke();
        }
        
        ctx.restore();
    }

    static drawCrosshairCursor(ctx, point) {
        const size = 10;
        ctx.save();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        
        ctx.beginPath();
        ctx.moveTo(point.x - size, point.y);
        ctx.lineTo(point.x + size, point.y);
        ctx.moveTo(point.x, point.y - size);
        ctx.lineTo(point.x, point.y + size);
        ctx.stroke();
        
        ctx.strokeStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.moveTo(point.x - size, point.y + 1);
        ctx.lineTo(point.x + size, point.y + 1);
        ctx.moveTo(point.x + 1, point.y - size);
        ctx.lineTo(point.x + 1, point.y + size);
        ctx.stroke();
        
        ctx.restore();
    }

    static drawGradientIndicator(ctx, startPt, endPt, colors, type, reverse, opacity, viewport) {
        const p1 = this.projectToScreen(startPt, viewport);
        const p2 = this.projectToScreen(endPt, viewport);
        
        // Create Gradient
        let gradient;
        if (type === 'linear') {
            gradient = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
        } else {
            const r = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
            gradient = ctx.createRadialGradient(p1.x, p1.y, 0, p1.x, p1.y, r);
        }

        const c1 = colors.start;
        const c2 = colors.end;
        const startColor = `rgba(${c1.r}, ${c1.g}, ${c1.b}, ${c1.a / 255})`;
        const endColor = `rgba(${c2.r}, ${c2.g}, ${c2.b}, ${c2.a / 255})`;

        if (reverse) {
            gradient.addColorStop(0, endColor);
            gradient.addColorStop(1, startColor);
        } else {
            gradient.addColorStop(0, startColor);
            gradient.addColorStop(1, endColor);
        }

        // Draw Gradient (Clipped)
        ctx.save();
        if (window.projectModel && window.projectModel.data) {
            const pW = window.projectModel.data.width;
            const pH = window.projectModel.data.height;
            const tl = this.projectToScreen({x:0, y:0}, viewport);
            const scale = viewport.cameraController ? viewport.cameraController.scale : 1;
            
            ctx.beginPath();
            ctx.rect(tl.x, tl.y, pW * scale, pH * scale);
            ctx.clip();
        }
        
        ctx.fillStyle = gradient;
        ctx.globalAlpha = opacity / 100;
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.restore();

        // Draw Line
        ctx.save();
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        
        // Black solid
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // White dashed
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.setLineDash([]);
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
    }

    static drawShapeIndicator(ctx, rect, shapeType, sides, rotation, viewport) {
        const scale = viewport.cameraController ? viewport.cameraController.scale : 1;
        const center = this.projectToScreen({
            x: rect.x + rect.w / 2,
            y: rect.y + rect.h / 2
        }, viewport);
        
        const screenW = rect.w * scale;
        const screenH = rect.h * scale;

        ctx.save();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        
        ctx.translate(center.x, center.y);
        if (rotation !== 0) {
            ctx.rotate(rotation * Math.PI / 180);
        }
        
        ctx.beginPath();
        if (shapeType === 'ellipse') {
            ctx.ellipse(0, 0, screenW / 2, screenH / 2, 0, 0, Math.PI * 2);
        } else if (shapeType === 'polygon') {
            const n = Math.max(3, sides);
            const rx = screenW / 2;
            const ry = screenH / 2;
            ctx.moveTo(0, -ry);
            for (let i = 1; i < n; i++) {
                const angle = (i * 2 * Math.PI) / n;
                ctx.lineTo(Math.sin(angle) * rx, -Math.cos(angle) * ry);
            }
            ctx.closePath();
        } else {
            ctx.rect(-screenW / 2, -screenH / 2, screenW, screenH);
        }
        
        ctx.stroke();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineDashOffset = 4;
        ctx.stroke();
        ctx.restore();
    }

    static drawCropIndicator(ctx, rect, handleSize, viewport) {
        const tl = this.projectToScreen({x: rect.x, y: rect.y}, viewport);
        const scale = viewport.cameraController ? viewport.cameraController.scale : 1;
        const w = rect.w * scale;
        const h = rect.h * scale;
        
        const width = ctx.canvas.width;
        const height = ctx.canvas.height;

        ctx.save();
        // Dark Overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.beginPath();
        ctx.rect(0, 0, width, height);
        ctx.rect(tl.x, tl.y, w, h);
        ctx.fill('evenodd');
        
        // Border
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.strokeRect(tl.x, tl.y, w, h);
        ctx.strokeStyle = '#fff';
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(tl.x, tl.y, w, h);
        ctx.setLineDash([]);
        
        // Handles
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = '#000';
        const s = handleSize;
        const hs = s / 2;
        
        const handles = [
            {x: tl.x, y: tl.y}, {x: tl.x + w/2, y: tl.y}, {x: tl.x + w, y: tl.y},
            {x: tl.x + w, y: tl.y + h/2}, {x: tl.x + w, y: tl.y + h},
            {x: tl.x + w/2, y: tl.y + h}, {x: tl.x, y: tl.y + h}, {x: tl.x, y: tl.y + h/2}
        ];
        
        handles.forEach(p => {
            ctx.fillRect(p.x - hs, p.y - hs, s, s);
            ctx.strokeRect(p.x - hs, p.y - hs, s, s);
        });
        
        // Dimensions
        ctx.font = '12px sans-serif';
        ctx.textBaseline = 'bottom';
        const text1 = `${Math.round(rect.w)} x ${Math.round(rect.h)}`;
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#000';
        ctx.strokeText(text1, tl.x + 5, tl.y - 5);
        ctx.fillStyle = '#fff';
        ctx.fillText(text1, tl.x + 5, tl.y - 5);
        
        ctx.textBaseline = 'top';
        const text2 = `X: ${Math.round(rect.x)}, Y: ${Math.round(rect.y)}`;
        ctx.strokeText(text2, tl.x + 5, tl.y + h + 5);
        ctx.fillText(text2, tl.x + 5, tl.y + h + 5);
        
        ctx.restore();
    }

    static drawImageIndicator(ctx, image, rect, opacity, rotation, viewport) {
        const scale = viewport.cameraController ? viewport.cameraController.scale : 1;
        const center = this.projectToScreen({
            x: rect.x + rect.w / 2,
            y: rect.y + rect.h / 2
        }, viewport);
        
        const screenW = rect.w * scale;
        const screenH = rect.h * scale;

        ctx.save();
        ctx.globalAlpha = (opacity / 100) * 0.8;
        
        ctx.translate(center.x, center.y);
        if (rotation !== 0) ctx.rotate(rotation * Math.PI / 180);
        
        ctx.drawImage(image, -screenW/2, -screenH/2, screenW, screenH);
        
        // Bounding Box
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#000';
        ctx.strokeRect(-screenW/2, -screenH/2, screenW, screenH);
        
        ctx.strokeStyle = '#fff';
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(-screenW/2, -screenH/2, screenW, screenH);
        ctx.setLineDash([]);
        
        // Center Cross
        ctx.beginPath();
        ctx.moveTo(-5, 0); ctx.lineTo(5, 0);
        ctx.moveTo(0, -5); ctx.lineTo(0, 5);
        ctx.strokeStyle = '#000';
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(-5, 0); ctx.lineTo(5, 0);
        ctx.moveTo(0, -5); ctx.lineTo(0, 5);
        ctx.strokeStyle = '#fff';
        ctx.setLineDash([2, 2]);
        ctx.stroke();
        ctx.setLineDash([]);
        
        ctx.restore();
    }

    static drawCloneSourceIndicator(ctx, sourcePt, viewport) {
        const pt = this.projectToScreen(sourcePt, viewport);
        const crossSize = 10;
        
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(pt.x - crossSize, pt.y);
        ctx.lineTo(pt.x + crossSize, pt.y);
        ctx.moveTo(pt.x, pt.y - crossSize);
        ctx.lineTo(pt.x, pt.y + crossSize);
        ctx.strokeStyle = '#000';
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(pt.x - crossSize, pt.y + 1);
        ctx.lineTo(pt.x + crossSize, pt.y + 1);
        ctx.moveTo(pt.x + 1, pt.y - crossSize);
        ctx.lineTo(pt.x + 1, pt.y + crossSize);
        ctx.strokeStyle = '#fff';
        ctx.stroke();
        ctx.restore();
    }
}
