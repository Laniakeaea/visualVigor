import { ToolUtils } from '../ToolUtils.js';
import { BitmapCommand } from '../../Edit/Commands/BitmapCommand.js';
import fx from 'glfx';

export class SharpenTool {
    constructor() {
        this.id = 'toolBitmapSharpen';
        this.options = {
            size: 30,
            strength: 50, // 0-100
            preserveTransparency: true
        };
        
        this.isDrawing = false;
        this.lastPoint = null;
        this.activeViewport = null;
        
        // Temp canvas for processing the brush tip
        this.brushCanvas = document.createElement('canvas');
        this.brushCtx = this.brushCanvas.getContext('2d');

        // Initialize glfx canvas
        try {
            this.fxCanvas = fx.canvas();
        } catch (e) {
            console.error('SharpenTool: WebGL not supported or glfx failed', e);
            this.fxCanvas = null;
        }
    }

    get cursor() {
        return {
            type: 'brush',
            size: this.options.size
        };
    }

    activate() {
        this.bindEvents();
        document.body.style.cursor = 'crosshair';
    }

    deactivate() {
        this.unbindEvents();
        document.body.style.cursor = '';
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

        // Prepare Undo
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        this.oldData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        this._applySharpen(ctx, pt);
    }

    onPointerMove(e) {
        if (!this.activeViewport) return;
        
        const pt = this._getLogicalPoint(e, this.activeViewport);

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
                    this._applySharpen(ctx, {x: ix, y: iy});
                }
                this.lastPoint = pt;
            }
        }
    }

    onPointerUp(e) {
        if (!this.isDrawing) return;
        
        this.isDrawing = false;
        
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

    _applySharpen(ctx, pt) {
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

        // 2. Apply Sharpen to brush canvas
        // Map strength 0-100 to unsharpMask params
        // Radius: 2 (fixed for now, or small)
        // Strength: 0-5
        const radius = 2;
        const strength = this.options.strength / 20; // 0-5
        
        if (this.fxCanvas) {
            try {
                const texture = this.fxCanvas.texture(this.brushCanvas);
                this.fxCanvas.draw(texture).unsharpMask(radius, strength).update();
                
                // Draw WebGL canvas back to brush canvas
                bCtx.clearRect(0, 0, size, size);
                bCtx.drawImage(this.fxCanvas, 0, 0, size, size);
                
                texture.destroy();
            } catch (e) {
                console.error('SharpenTool: glfx error', e);
            }
        }

        // 3. Mask it to a circle (Soft edge?)
        bCtx.globalCompositeOperation = 'destination-in';
        
        const grad = bCtx.createRadialGradient(r, r, 0, r, r, r);
        grad.addColorStop(0, 'rgba(0,0,0,1)');
        grad.addColorStop(0.5, 'rgba(0,0,0,1)'); // Inner hard core
        grad.addColorStop(1, 'rgba(0,0,0,0)');   // Soft edge
        
        bCtx.fillStyle = grad;
        bCtx.fillRect(0, 0, size, size);
        
        bCtx.globalCompositeOperation = 'source-over';

        // 4. Draw back to main canvas
        ctx.save();
        if (this.options.preserveTransparency) {
            ctx.globalCompositeOperation = 'source-atop';
        } else {
            ctx.globalCompositeOperation = 'source-over';
        }
        ctx.drawImage(this.brushCanvas, x, y);
        ctx.restore();

        // 5. Update View Canvas (Real-time feedback)
        this._updateView(this.brushCanvas, x, y);
    }

    _updateView(brushCanvas, x, y) {
        if (!this.activeViewport || !window.projectModel) return;
        
        const layerId = window.projectModel.selectedLayerId;
        const renderList = window.projectModel.getRenderList();
        // WorkspaceView reverses the list for DOM order (Bottom to Top)
        const reversedList = [...renderList].reverse();
        
        // Filter visible layers to match DOM structure
        const visibleLayers = reversedList.filter(l => l.visible);
        const domIndex = visibleLayers.findIndex(l => l.id === layerId);
        
        if (domIndex === -1) return; // Layer not visible
        
        const layerContainer = this.activeViewport.querySelector('.workspace__canvas');
        if (!layerContainer) return;
        
        const viewCanvas = layerContainer.children[domIndex];
        if (viewCanvas && viewCanvas.tagName === 'CANVAS') {
            const ctx = viewCanvas.getContext('2d');
            ctx.save();
            if (this.options.preserveTransparency) {
                ctx.globalCompositeOperation = 'source-atop';
            } else {
                ctx.globalCompositeOperation = 'source-over';
            }
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
}
