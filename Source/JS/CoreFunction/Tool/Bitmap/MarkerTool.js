import { PenTool } from './PenTool.js';
import { BitmapCommand } from '../../Edit/Commands/BitmapCommand.js';
import { ToolUtils } from '../ToolUtils.js';

export class MarkerTool extends PenTool {
    constructor() {
        super();
        this.id = 'toolBitmapMarker';
        this.options = {
            ...this.options,
            size: 20,
            thinning: 0, // Markers usually have constant width
            smoothing: 0.5,
            advancedMode: true
        };
        this.opacity = 0.5;
    }

    get cursor() {
        return {
            type: 'brush',
            size: this.options.size
        };
    }

    getPreviewStyle(ctx) {
        return {
            fillStyle: this.getColor(),
            strokeStyle: null,
            lineWidth: 0,
            globalAlpha: this.opacity,
            globalCompositeOperation: 'source-over'
        };
    }

    _commitDraw(ctx, previewCtx, rect) {
        ctx.save();
        ctx.globalCompositeOperation = 'multiply';
        // Preview already has alpha applied, so we just draw it
        ctx.drawImage(previewCtx.canvas, rect.x, rect.y, rect.w, rect.h, rect.x, rect.y, rect.w, rect.h);
        ctx.restore();
    }
}
