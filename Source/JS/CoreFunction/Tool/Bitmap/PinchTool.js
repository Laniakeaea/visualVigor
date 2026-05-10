import { ToolUtils } from '../ToolUtils.js';
import { BitmapCommand } from '../../Edit/Commands/BitmapCommand.js';
import fx from 'glfx';

export class PinchTool {
    constructor() {
        this.id = 'toolBitmapPinch';
        this.options = {
            size: 50,
            strength: 50, // 0-100
            mode: 'pinch' // 'pinch', 'bulge'
        };
        
        this.isDrawing = false;
        this.lastPoint = null;
        this.currentPoint = null;
        this.activeViewport = null;
        
        // Temp canvas for processing the brush tip
        this.brushCanvas = document.createElement('canvas');
        this.brushCtx = this.brushCanvas.getContext('2d');

        // Initialize glfx canvas
        try {
            this.fxCanvas = fx.canvas();
        } catch (e) {
            console.error('PinchTool: WebGL not supported or glfx failed', e);
            this.fxCanvas = null;
        }
    }

    activate() {
        this.bindEvents();
        document.body.style.cursor = 'crosshair';
    }

    deactivate() {
        this.unbindEvents();
        document.body.style.cursor = '';
        if (window.indicatorSystem) window.indicatorSystem.update();
        this.isDrawing = false;
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

        const canvas = ToolUtils.validateActiveLayer();
        if (!canvas) return;

        this.activeViewport = viewport;
        const pt = this._getLogicalPoint(e, viewport);

        this.isDrawing = true;
        this.lastPoint = pt;
        this.currentPoint = pt;

        // Prepare Undo
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        this.oldData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        this._applyPinch(ctx, pt);
        if (window.indicatorSystem) window.indicatorSystem.update();
    }

    onPointerMove(e) {
        if (!this.activeViewport) return;
        
        const pt = this._getLogicalPoint(e, this.activeViewport);
        this.currentPoint = pt;

        if (this.isDrawing) {
            const canvas = ToolUtils.validateActiveLayer();
            const ctx = canvas.getContext('2d');
            
            // Interpolate
            const dist = Math.sqrt(Math.pow(pt.x - this.lastPoint.x, 2) + Math.pow(pt.y - this.lastPoint.y, 2));
            const step = Math.max(1, this.options.size * 0.25); // 25% spacing
            
            if (dist > step) {
                const steps = Math.floor(dist / step);
                for (let i = 1; i <= steps; i++) {
                    const t = i / steps;
                    const ix = this.lastPoint.x + (pt.x - this.lastPoint.x) * t;
                    const iy = this.lastPoint.y + (pt.y - this.lastPoint.y) * t;
                    this._applyPinch(ctx, {x: ix, y: iy});
                }
                this.lastPoint = pt;
            }
        }

        if (window.indicatorSystem) window.indicatorSystem.update();
    }

    onPointerUp(e) {
        if (!this.isDrawing) return;
        
        this.isDrawing = false;
        if (window.indicatorSystem) window.indicatorSystem.update();
        
        const canvas = ToolUtils.validateActiveLayer();
        if (canvas && this.oldData) {
            const ctx = canvas.getContext('2d');
            const newData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            
            // Apply Selection Mask
            ToolUtils.applySelectionMask(newData, this.oldData, 0, 0);
            ctx.putImageData(newData, 0, 0);

            if (window.projectModel && window.projectModel.selectedLayerId && window.editSystem) {
                const currentFrame = window.projectModel.data.timeline.currentFrame || 0;
                const cmd = new BitmapCommand(
                    window.projectModel.selectedLayerId,
                    this.oldData,
                    newData,
                    0, 0,
                    currentFrame
                );
                window.editSystem.addCommand(cmd);
            }
            
            window.dispatchEvent(new CustomEvent('projectLayersChanged'));
        }
        
        this.oldData = null;
        this.activeViewport = null;
    }

    get cursor() {
        return {
            type: 'brush',
            size: this.options.size,
            shape: 'circle'
        };
    }

    _applyPinch(ctx, pt) {
        const size = this.options.size;
        const r = size / 2;
        const x = Math.floor(pt.x - r);
        const y = Math.floor(pt.y - r);
        
        // Ensure bounds
        if (x + size < 0 || y + size < 0 || x > ctx.canvas.width || y > ctx.canvas.height) return;

        // Resize brush canvas if needed
        if (this.brushCanvas.width !== size || this.brushCanvas.height !== size) {
            this.brushCanvas.width = size;
            this.brushCanvas.height = size;
        }

        const bCtx = this.brushCtx;
        bCtx.clearRect(0, 0, size, size);

        // 1. Copy area from main canvas to brush canvas
        bCtx.drawImage(ctx.canvas, x, y, size, size, 0, 0, size, size);

        // Fix: Premultiply alpha to prevent black halos on transparent edges during distortion
        let imageData = bCtx.getImageData(0, 0, size, size);
        this._premultiply(imageData);
        bCtx.putImageData(imageData, 0, 0);

        // 2. Apply Pinch/Bulge to brush canvas
        // Strength 0-100 maps to 0-1
        let strength = this.options.strength / 100;
        if (this.options.mode === 'pinch') {
            strength = -strength;
        }
        
        if (this.fxCanvas) {
            try {
                const texture = this.fxCanvas.texture(this.brushCanvas);
                // bulgePinch(centerX, centerY, radius, strength)
                // Center is relative to the texture (size x size) -> (r, r)
                this.fxCanvas.draw(texture).bulgePinch(r, r, r, strength).update();
                
                // Draw WebGL canvas back to brush canvas
                bCtx.clearRect(0, 0, size, size);
                bCtx.drawImage(this.fxCanvas, 0, 0, size, size);
                
                texture.destroy();
            } catch (e) {
                console.error('PinchTool: glfx error', e);
            }
        }

        // Fix: Un-premultiply alpha after distortion
        imageData = bCtx.getImageData(0, 0, size, size);
        this._unpremultiply(imageData);
        bCtx.putImageData(imageData, 0, 0);

        // 3. Mask it to a circle (Soft edge?)
        // For distortion, a hard edge might look weird, but a soft edge might also look weird (blending distorted with original).
        // Usually distortion brushes use a soft falloff for the strength, but glfx bulgePinch already has a radius.
        // However, we are pasting a square back. We need to mask it to a circle at least.
        
        bCtx.globalCompositeOperation = 'destination-in';
        
        const grad = bCtx.createRadialGradient(r, r, 0, r, r, r);
        grad.addColorStop(0, 'rgba(0,0,0,1)');
        grad.addColorStop(0.8, 'rgba(0,0,0,1)'); 
        grad.addColorStop(1, 'rgba(0,0,0,0)');   
        
        bCtx.fillStyle = grad;
        bCtx.fillRect(0, 0, size, size);
        
        bCtx.globalCompositeOperation = 'source-over';

        // 4. Draw back to main canvas
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(this.brushCanvas, x, y);
        ctx.restore();

        // 5. Update View Canvas (Real-time feedback)
        this._updateView(this.brushCanvas, x, y);
    }

    _updateView(brushCanvas, x, y) {
        if (!this.activeViewport || !window.projectModel) return;
        
        const layerId = window.projectModel.selectedLayerId;
        const renderList = window.projectModel.getRenderList();
        const reversedList = [...renderList].reverse();
        
        const visibleLayers = reversedList.filter(l => l.visible);
        const domIndex = visibleLayers.findIndex(l => l.id === layerId);
        
        if (domIndex === -1) return; 
        
        const layerContainer = this.activeViewport.querySelector('.workspace__canvas');
        if (!layerContainer) return;
        
        const viewCanvas = layerContainer.children[domIndex];
        if (viewCanvas && viewCanvas.tagName === 'CANVAS') {
            const ctx = viewCanvas.getContext('2d');
            ctx.save();
            ctx.globalCompositeOperation = 'source-over';
            ctx.drawImage(brushCanvas, x, y);
            ctx.restore();
        }
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

    _premultiply(imageData) {
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            const a = data[i + 3] / 255;
            if (a > 0 && a < 1) {
                data[i] = Math.round(data[i] * a);
                data[i + 1] = Math.round(data[i + 1] * a);
                data[i + 2] = Math.round(data[i + 2] * a);
            }
        }
        return imageData;
    }

    _unpremultiply(imageData) {
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            const a = data[i + 3];
            if (a > 0 && a < 255) {
                const factor = 255 / a;
                data[i] = Math.min(255, Math.round(data[i] * factor));
                data[i + 1] = Math.min(255, Math.round(data[i + 1] * factor));
                data[i + 2] = Math.min(255, Math.round(data[i + 2] * factor));
            }
        }
        return imageData;
    }
}
