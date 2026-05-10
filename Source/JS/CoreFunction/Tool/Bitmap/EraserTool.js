import { PenTool } from './PenTool.js';
import { BitmapCommand } from '../../Edit/Commands/BitmapCommand.js';
import { getStroke } from 'perfect-freehand';
import { ToolUtils } from '../ToolUtils.js';

export class EraserTool extends PenTool {
    constructor() {
        super();
        this.id = 'toolBitmapEraser';
        // Default options for Eraser
        this.options = {
            ...this.options,
            size: 20,
            advancedMode: true, // Smooth eraser
            thinning: 0,        // Constant width usually better for eraser, but pressure is fine too
        };
    }

    get cursor() {
        return {
            type: 'brush',
            size: this.options.size
        };
    }

    // Override render to use a specific color for the preview (e.g., white or grey)
    // The color doesn't matter for the operation, just for what the user sees.
    getColor() {
        return '#ffffff'; 
    }

    getPreviewStyle(ctx) {
        // Create Pattern
        if (!this.pattern) {
             this.pattern = this._createEraserPattern(ctx);
        }

        return {
            fillStyle: this.pattern,
            strokeStyle: 'rgba(255, 255, 255, 0.8)',
            lineWidth: 1,
            globalAlpha: 0.5,
            globalCompositeOperation: 'source-over',
            preventAccumulation: true
        };
    }

    _createEraserPattern(ctx) {
        const patternCanvas = document.createElement('canvas');
        patternCanvas.width = 10;
        patternCanvas.height = 10;
        const pCtx = patternCanvas.getContext('2d');

        // Background: Black
        pCtx.fillStyle = '#000000';
        pCtx.fillRect(0, 0, 10, 10);
        
        // Stripes: White
        pCtx.strokeStyle = '#ffffff';
        pCtx.lineWidth = 2;
        pCtx.beginPath();
        pCtx.moveTo(-5, 5);
        pCtx.lineTo(5, 15);
        pCtx.moveTo(0, 0);
        pCtx.lineTo(10, 10);
        pCtx.moveTo(5, -5);
        pCtx.lineTo(15, 5);
        pCtx.stroke();

        return ctx.createPattern(patternCanvas, 'repeat');
    }

    _commitDraw(ctx, previewCtx, rect) {
        // Eraser needs to draw a solid stroke, not the striped preview
        const solidStyle = {
            fillStyle: '#000000',
            strokeStyle: null,
            lineWidth: 0,
            globalAlpha: 1,
            globalCompositeOperation: 'destination-out'
        };

        const mode = this.options.advancedMode ? 'advanced' : 'simple';
        this.renderer.render(ctx, this.points, this.options, solidStyle, mode);
    }
}
