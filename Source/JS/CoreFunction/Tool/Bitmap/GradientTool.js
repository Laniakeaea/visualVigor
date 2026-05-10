import { ToolUtils } from '../ToolUtils.js';
import { BitmapCommand } from '../../Edit/Commands/BitmapCommand.js';
import { ColorUtils } from '../../../Controller/ColorUtils.js';

export class GradientTool {
    constructor() {
        this.id = 'toolBitmapGradient';
        this.options = {
            type: 'linear',     // 'linear', 'radial'
            opacity: 100,       // 0-100
            reverse: false,
            colors: {
                start: { r: 0, g: 0, b: 0, a: 255 },
                end: { r: 255, g: 255, b: 255, a: 0 }
            }
        };
        
        this.activeColorTarget = 'start'; // 'start' or 'end'
        this.isDrawing = false;
        this.startPoint = null;
        this.currentPoint = null;
        this.activeViewport = null;
        
        // Initialize with current project color if available
        if (window.projectModel && window.projectModel.data && window.projectModel.data.settings.color) {
            const c = window.projectModel.data.settings.color;
            const rgb = ColorUtils.hslToRgb(c.h, c.s, c.l);
            this.options.colors.start = { r: rgb.r, g: rgb.g, b: rgb.b, a: Math.round(c.a * 255) };
        }
    }

    activate() {
        this.bindEvents();
        document.body.style.cursor = 'crosshair';
        
        // Listen for color changes
        this.handleColorChange = this.onColorChanged.bind(this);
        window.addEventListener('projectColorChanged', this.handleColorChange);
    }

    deactivate() {
        this.unbindEvents();
        document.body.style.cursor = '';
        if (window.indicatorSystem) window.indicatorSystem.update();
        this.isDrawing = false;
        
        if (this.handleColorChange) {
            window.removeEventListener('projectColorChanged', this.handleColorChange);
            this.handleColorChange = null;
        }
    }

    onColorChanged(e) {
        if (!this.activeColorTarget) return;
        
        const c = e.detail.value || e.detail;
        if (!c) return;

        const rgb = ColorUtils.hslToRgb(c.h, c.s, c.l);
        this.options.colors[this.activeColorTarget] = { 
            r: rgb.r, 
            g: rgb.g, 
            b: rgb.b, 
            a: Math.round(c.a * 255) 
        };

        // If currently drawing, update the canvas preview immediately
        if (this.isDrawing && this.currentPoint) {
            if (window.indicatorSystem) window.indicatorSystem.update();
        }
    }

    onDrawIndicator(ctx, point, viewport) {
        if (!this.isDrawing || !this.startPoint || !this.currentPoint) return;

        if (window.indicatorSystem) {
            window.indicatorSystem.drawGradientIndicator(
                ctx, 
                this.startPoint, 
                this.currentPoint, 
                this.options.colors, 
                this.options.type, 
                this.options.reverse, 
                this.options.opacity, 
                viewport
            );
        }
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

    onPointerDown(e) {
        if (e.button !== 0) return;
        
        const viewport = e.target.closest('.workspace__viewport');
        if (!viewport) return;

        // Validate Layer
        if (!ToolUtils.validateActiveLayer()) return;

        this.activeViewport = viewport;
        this.isDrawing = true;
        
        const pt = this._getLogicalPoint(e, viewport);
        this.startPoint = pt;
        this.currentPoint = pt;

        if (window.indicatorSystem) window.indicatorSystem.update();
    }

    onPointerMove(e) {
        if (!this.isDrawing || !this.activeViewport) return;
        
        this.currentPoint = this._getLogicalPoint(e, this.activeViewport);
        if (window.indicatorSystem) window.indicatorSystem.update();
    }

    onPointerUp(e) {
        if (!this.isDrawing) return;
        
        this.isDrawing = false;
        if (window.indicatorSystem) window.indicatorSystem.update();
        
        if (!this.startPoint || !this.currentPoint) return;

        // Apply Gradient
        this._applyGradient();
        
        this.startPoint = null;
        this.currentPoint = null;
        this.activeViewport = null;
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


    _applyGradient() {
        const canvas = ToolUtils.validateActiveLayer();
        if (!canvas) return;

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const width = canvas.width;
        const height = canvas.height;

        // 1. Capture Old State
        const oldData = ctx.getImageData(0, 0, width, height);

        // 2. Generate Gradient on Temp Canvas
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d');

        const c1 = this.options.colors.start;
        const c2 = this.options.colors.end;
        
        const startColor = `rgba(${c1.r}, ${c1.g}, ${c1.b}, ${c1.a / 255})`;
        const endColor = `rgba(${c2.r}, ${c2.g}, ${c2.b}, ${c2.a / 255})`;

        let gradient;
        const x1 = this.startPoint.x;
        const y1 = this.startPoint.y;
        const x2 = this.currentPoint.x;
        const y2 = this.currentPoint.y;

        if (this.options.type === 'linear') {
            gradient = tempCtx.createLinearGradient(x1, y1, x2, y2);
        } else {
            const r = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
            gradient = tempCtx.createRadialGradient(x1, y1, 0, x1, y1, r);
        }

        if (this.options.reverse) {
            gradient.addColorStop(0, endColor);
            gradient.addColorStop(1, startColor);
        } else {
            gradient.addColorStop(0, startColor);
            gradient.addColorStop(1, endColor);
        }

        tempCtx.fillStyle = gradient;
        tempCtx.globalAlpha = this.options.opacity / 100;
        tempCtx.fillRect(0, 0, width, height);

        // 4. Merge Gradient (Canvas Compositing)
        // Draw gradient over current context
        ctx.save();
        ctx.drawImage(tempCanvas, 0, 0);
        ctx.restore();
        
        // 5. Apply Selection Mask
        const targetData = ctx.getImageData(0, 0, width, height);
        ToolUtils.applySelectionMask(targetData, oldData, 0, 0);
        
        // 6. Apply Final Result
        ctx.putImageData(targetData, 0, 0);

        // 7. Create Command
        if (window.projectModel && window.projectModel.selectedLayerId && window.editSystem) {
            const currentFrame = window.projectModel.data.timeline.currentFrame || 0;
            const cmd = new BitmapCommand(
                window.projectModel.selectedLayerId,
                oldData,
                targetData,
                0, 0,
                currentFrame
            );
            window.editSystem.addCommand(cmd);
        }

        // Notify Change
        window.dispatchEvent(new CustomEvent('projectLayersChanged'));
    }


}
