import { BitmapCommand } from '../../Edit/Commands/BitmapCommand.js';
import { ToolUtils } from '../ToolUtils.js';
import { StrokeRenderer } from './StrokeRenderer.js';

export class PenTool {
    constructor() {
        this.id = 'toolBitmapPen';
        this.points = [];
        this.isDrawing = false;
        this.renderer = new StrokeRenderer();
        this.options = {
            advancedMode: true,
            size: 5,
            thinning: 0.5,
            smoothing: 0.5,
            streamline: 0.5,
            easing: (t) => t,
            start: {
                taper: 0,
                easing: (t) => t,
                cap: true
            },
            end: {
                taper: 0,
                easing: (t) => t,
                cap: true
            }
        };
    }

    get cursor() {
        return {
            type: 'brush',
            size: this.options.size
        };
    }

    activate() {
        this.bindEvents();
    }

    deactivate() {
        this.unbindEvents();
    }

    bindEvents() {
        this.handleDown = this.onPointerDown.bind(this);
        this.handleMove = this.onPointerMove.bind(this);
        this.handleUp = this.onPointerUp.bind(this);

        // Bind to document to handle multiple viewports and dynamic creation
        document.addEventListener('pointerdown', this.handleDown);
        document.addEventListener('pointermove', this.handleMove);
        document.addEventListener('pointerup', this.handleUp);
    }

    unbindEvents() {
        document.removeEventListener('pointerdown', this.handleDown);
        document.removeEventListener('pointermove', this.handleMove);
        document.removeEventListener('pointerup', this.handleUp);
    }

    getCanvasPoint(e, viewport) {
        if (!viewport) return { x: e.clientX, y: e.clientY, pressure: e.pressure };

        const rect = viewport.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        if (viewport.cameraController) {
            const { position, scale } = viewport.cameraController;
            return {
                x: (x - position.x) / scale,
                y: (y - position.y) / scale,
                pressure: e.pressure
            };
        }
        
        return {
            x: x,
            y: y,
            pressure: e.pressure
        };
    }

    getPreviewContext(viewport) {
        if (!viewport) return null;
        const previewCanvas = viewport.querySelector('.tool-preview-layer-canvas');
        if (previewCanvas) {
            return previewCanvas.getContext('2d');
        }
        return null;
    }

    getColor() {
        if (window.projectModel && window.projectModel.data && window.projectModel.data.settings.color) {
            const c = window.projectModel.data.settings.color;
            return `hsla(${c.h}, ${c.s * 100}%, ${c.l * 100}%, ${c.a})`;
        }
        return '#000000';
    }

    onPointerDown(e) {
        if (e.button !== 0) return; // Left click only
        
        const viewport = e.target.closest('.workspace__viewport');
        if (!viewport) return; // Not clicking in a workspace

        // Validate Layer
        if (!ToolUtils.validateActiveLayer()) return;

        this.activeViewport = viewport; // Track which viewport we are drawing in
        this.isDrawing = true;
        
        const point = this.getCanvasPoint(e, viewport);
        this.points = [[point.x, point.y, e.pressure]];
        
        this.render();
    }

    onPointerMove(e) {
        if (!this.isDrawing || !this.activeViewport) return;
        
        const point = this.getCanvasPoint(e, this.activeViewport);
        this.points.push([point.x, point.y, e.pressure]);
        
        this.render();
    }

    onPointerUp(e) {
        if (!this.isDrawing) return;
        
        this.isDrawing = false;
        
        const ctx = this.getActiveContext();
        const previewCtx = this.getPreviewContext(this.activeViewport);
        
        if (ctx && previewCtx) {
            // --- History Logic ---
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            
            if (this.points.length > 0) {
                for (const p of this.points) {
                    if (p[0] < minX) minX = p[0];
                    if (p[0] > maxX) maxX = p[0];
                    if (p[1] < minY) minY = p[1];
                    if (p[1] > maxY) maxY = p[1];
                }
                
                const padding = Math.ceil(this.options.size) + 2;
                minX = Math.floor(minX - padding);
                minY = Math.floor(minY - padding);
                maxX = Math.ceil(maxX + padding);
                maxY = Math.ceil(maxY + padding);
                
                const w = ctx.canvas.width;
                const h = ctx.canvas.height;
                
                minX = Math.max(0, minX);
                minY = Math.max(0, minY);
                maxX = Math.min(w, maxX);
                maxY = Math.min(h, maxY);
                
                const rectW = maxX - minX;
                const rectH = maxY - minY;
                
                if (rectW > 0 && rectH > 0) {
                    // 1. Capture Old State
                    const oldData = ctx.getImageData(minX, minY, rectW, rectH);
                    
                    // 2. Commit Draw
                    this._commitDraw(ctx, previewCtx, { x: minX, y: minY, w: rectW, h: rectH });
                    
                    // 3. Capture New State
                    const newData = ctx.getImageData(minX, minY, rectW, rectH);
                    
                    // 3.5 Apply Selection Mask
                    ToolUtils.applySelectionMask(newData, oldData, minX, minY);
                    ctx.putImageData(newData, minX, minY);

                    // 4. Create Command
                    if (window.projectModel && window.projectModel.selectedLayerId && window.editSystem) {
                        const currentFrame = window.projectModel.data.timeline.currentFrame || 0;
                        const cmd = new BitmapCommand(
                            window.projectModel.selectedLayerId,
                            oldData,
                            newData,
                            minX,
                            minY,
                            currentFrame
                        );
                        window.editSystem.addCommand(cmd);
                    }
                }
            } else {
                this._commitDraw(ctx, previewCtx, { x: 0, y: 0, w: ctx.canvas.width, h: ctx.canvas.height });
            }
            
            // Clear preview
            previewCtx.clearRect(0, 0, previewCtx.canvas.width, previewCtx.canvas.height);
            
            // Notify change so UI updates
            window.dispatchEvent(new CustomEvent('projectLayersChanged'));
        }
        
        this.activeViewport = null;
    }

    _commitDraw(ctx, previewCtx, rect) {
        // Default: Draw the preview canvas onto the main canvas
        ctx.drawImage(previewCtx.canvas, rect.x, rect.y, rect.w, rect.h, rect.x, rect.y, rect.w, rect.h);
    }

    render() {
        const ctx = this.getActiveContext();
        const previewCtx = this.getPreviewContext(this.activeViewport);
        
        if (!ctx || !previewCtx) return;

        // Clear preview
        previewCtx.clearRect(0, 0, previewCtx.canvas.width, previewCtx.canvas.height);

        const style = this.getPreviewStyle(previewCtx);
        const mode = this.options.advancedMode ? 'advanced' : 'simple';
        
        this.renderer.render(previewCtx, this.points, this.options, style, mode);
    }

    getPreviewStyle(ctx) {
        return {
            fillStyle: this.getColor(),
            strokeStyle: null,
            lineWidth: 0,
            globalAlpha: 1,
            globalCompositeOperation: 'source-over'
        };
    }

    getActiveContext() {
        // This needs to be implemented in ProjectModel or passed in
        if (window.projectModel && window.projectModel.getActiveCanvas) {
            const canvas = window.projectModel.getActiveCanvas();
            if (canvas) return canvas.getContext('2d', { willReadFrequently: true });
        }
        return null;
    }
}

