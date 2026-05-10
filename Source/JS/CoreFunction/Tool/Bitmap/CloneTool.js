import { ToolUtils } from '../ToolUtils.js';
import { BitmapCommand } from '../../Edit/Commands/BitmapCommand.js';

export class CloneTool {
    constructor() {
        this.id = 'toolBitmapClone';
        this.options = {
            size: 20,
            aligned: false,
            sampleAllLayers: false
        };
        
        this.sourcePoint = null;
        this.offset = null; // {dx, dy}
        this.isDrawing = false;
        this.lastPoint = null;
        this.activeViewport = null;
        
        // Temp canvas for stamp generation
        this.stampCanvas = document.createElement('canvas');
        this.stampCtx = this.stampCanvas.getContext('2d');

        // Accumulator for the current stroke (to show in preview)
        this.strokeMask = document.createElement('canvas');
        this.strokeMaskCtx = this.strokeMask.getContext('2d');
    }

    get cursor() {
        return {
            type: 'brush',
            size: this.options.size,
            shape: 'circle'
        };
    }

    onDrawIndicator(ctx, point, viewport) {
        // 1. Draw Source Crosshair
        let sourcePt = null;
        const scale = viewport.cameraController ? viewport.cameraController.scale : 1;
        
        if (point && this.offset && (this.isDrawing || this.options.aligned)) {
            // If drawing OR (aligned and offset exists), show relative source
            // Logical Coords
            const logicalX = (point.x - (viewport.cameraController ? viewport.cameraController.position.x : 0)) / scale;
            const logicalY = (point.y - (viewport.cameraController ? viewport.cameraController.position.y : 0)) / scale;
            
            const srcLogicalX = logicalX - this.offset.dx;
            const srcLogicalY = logicalY - this.offset.dy;
            
            sourcePt = { x: srcLogicalX, y: srcLogicalY };
        } else if (this.sourcePoint) {
            sourcePt = this.sourcePoint;
        }

        if (sourcePt && window.indicatorSystem) {
            window.indicatorSystem.drawCloneSourceIndicator(ctx, sourcePt, viewport);
        }

        // 2. Draw Accumulator (Current Stroke)
        if (this.isDrawing && this.strokeMask) {
            ctx.save();
            if (viewport.cameraController) {
                const { position, scale } = viewport.cameraController;
                ctx.translate(position.x, position.y);
                ctx.scale(scale, scale);
            }
            this._renderStroke(ctx);
            ctx.restore();
        }
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
        this.handleKeyDown = this.onKeyDown.bind(this);
        this.handleKeyUp = this.onKeyUp.bind(this);

        document.addEventListener('pointerdown', this.handleDown);
        document.addEventListener('pointermove', this.handleMove);
        document.addEventListener('pointerup', this.handleUp);
        document.addEventListener('keydown', this.handleKeyDown);
        document.addEventListener('keyup', this.handleKeyUp);
    }

    unbindEvents() {
        document.removeEventListener('pointerdown', this.handleDown);
        document.removeEventListener('pointermove', this.handleMove);
        document.removeEventListener('pointerup', this.handleUp);
        document.removeEventListener('keydown', this.handleKeyDown);
        document.removeEventListener('keyup', this.handleKeyUp);
    }

    onKeyDown(e) {
        if (e.key === 'Alt') {
            document.body.style.cursor = 'copy';
        }
    }

    onKeyUp(e) {
        if (e.key === 'Alt') {
            document.body.style.cursor = 'crosshair';
        }
    }

    onPointerDown(e) {
        if (e.button !== 0) return;
        
        const viewport = e.target.closest('.workspace__viewport');
        if (!viewport) return;

        // Validate Layer
        const canvas = ToolUtils.validateActiveLayer();
        if (!canvas) return;

        this.activeViewport = viewport;
        const pt = this._getLogicalPoint(e, viewport);

        // 1. Set Source Mode
        if (e.altKey) {
            this.sourcePoint = pt;
            this.offset = null; // Reset offset when source is manually set
            
            if (window.infoSystem) {
                const msg = window.languageManager ? window.languageManager.t('Tool.Clone.SourceSet') : 'Clone source set';
                window.infoSystem.showInfo('success', msg, 1000);
            }
            // Force update to show new source crosshair
            if (window.indicatorSystem) window.indicatorSystem.update();
            return;
        }

        // 2. Check if Source is Set
        if (!this.sourcePoint) {
            if (window.infoSystem) {
                const msg = window.languageManager ? window.languageManager.t('Tool.Clone.SetSourceHint') : 'Alt+Click to set source point';
                window.infoSystem.showInfo('warning', msg, 2000);
            }
            return;
        }

        // 3. Start Drawing
        this.isDrawing = true;
        this.lastPoint = pt;

        // Calculate Offset
        if (this.options.aligned) {
            if (!this.offset) {
                this.offset = {
                    dx: pt.x - this.sourcePoint.x,
                    dy: pt.y - this.sourcePoint.y
                };
            }
        } else {
            this.offset = {
                dx: pt.x - this.sourcePoint.x,
                dy: pt.y - this.sourcePoint.y
            };
        }

        // Prepare Source Image (Snapshot)
        // This prevents feedback loops and handles 'Sample All Layers'
        this.sourceImage = document.createElement('canvas');
        this.sourceImage.width = canvas.width;
        this.sourceImage.height = canvas.height;
        const sCtx = this.sourceImage.getContext('2d');

        if (this.options.sampleAllLayers && window.projectModel) {
            // Draw all visible layers
            // We need to iterate layers in order.
            // Assuming projectModel.data.timeline.bitmapLayers + backgroundLayer
            // This is a simplified composite.
            
            const data = window.projectModel.data;
            const currentFrame = data.timeline.currentFrame || 0;

            // 1. Background
            if (data.timeline.backgroundLayer && data.timeline.backgroundLayer.visible) {
                let bgCanvas = data.timeline.backgroundLayer.frames[currentFrame];
                // Fallback to frame 0 for background
                if (!bgCanvas) bgCanvas = data.timeline.backgroundLayer.frames[0];
                
                if (bgCanvas) sCtx.drawImage(bgCanvas, 0, 0);
            }

            // 2. Bitmap Layers (Bottom to Top)
            // Assuming bitmapLayers is ordered? Usually array order matches stack order?
            // Need to check how they are rendered. Usually index 0 is bottom.
            if (data.timeline.bitmapLayers) {
                data.timeline.bitmapLayers.forEach(layer => {
                    if (layer.visible && layer.frames[currentFrame]) {
                        sCtx.globalAlpha = layer.opacity / 100;
                        // Blend mode? For now assume normal.
                        sCtx.drawImage(layer.frames[currentFrame], 0, 0);
                    }
                });
            }
            sCtx.globalAlpha = 1;
        } else {
            // Just the active layer
            sCtx.drawImage(canvas, 0, 0);
        }

        // Prepare Undo
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        this.oldData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // Initialize Accumulator
        this.strokeMask.width = canvas.width;
        this.strokeMask.height = canvas.height;
        this.strokeMaskCtx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw first stamp to accumulator
        this._drawStamp(this.strokeMaskCtx, pt);
    }

    onPointerMove(e) {
        if (!this.activeViewport) return;
        
        const pt = this._getLogicalPoint(e, this.activeViewport);

        if (this.isDrawing) {
            // Interpolate
            const dist = Math.sqrt(Math.pow(pt.x - this.lastPoint.x, 2) + Math.pow(pt.y - this.lastPoint.y, 2));
            const step = Math.max(1, this.options.size * 0.25); // 25% spacing
            
            if (dist > step) {
                const steps = Math.floor(dist / step);
                for (let i = 1; i <= steps; i++) {
                    const t = i / steps;
                    const ix = this.lastPoint.x + (pt.x - this.lastPoint.x) * t;
                    const iy = this.lastPoint.y + (pt.y - this.lastPoint.y) * t;
                    this._drawStamp(this.strokeMaskCtx, {x: ix, y: iy});
                }
                this.lastPoint = pt;
            }
            if (window.indicatorSystem) window.indicatorSystem.update();
        }
    }

    onPointerUp(e) {
        if (!this.isDrawing) return;
        
        this.isDrawing = false;
        
        // Commit Stroke to Active Layer
        const canvas = ToolUtils.validateActiveLayer();
        if (canvas && this.oldData) {
            const ctx = canvas.getContext('2d');
            
            // Draw Accumulator to Active Layer
            this._renderStroke(ctx);
            
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
                    0, 0, // Full canvas update for simplicity, could optimize bounds
                    currentFrame
                );
                window.editSystem.addCommand(cmd);
            }
            
            // Notify Change
            window.dispatchEvent(new CustomEvent('projectLayersChanged'));
        }
        
        this.oldData = null;
        this.activeViewport = null;
        this.sourceImage = null; // Clear snapshot to free memory
        
        // Clear Accumulator
        if (this.strokeMask) {
            this.strokeMask.width = 1;
            this.strokeMask.height = 1;
        }

        // If not aligned, clear offset so preview shows static source
        if (!this.options.aligned) {
            this.offset = null;
        }
    }

    _drawStamp(ctx, pt) {
        // Draw white circle on mask
        const r = this.options.size / 2;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
        ctx.fillStyle = 'white';
        ctx.fill();
    }

    _renderStroke(targetCtx) {
        if (!this.sourceImage || !this.offset) return;

        // 1. Create Temp Composition
        // We need to composite Source + Mask
        // Since we can't easily do "Source In Mask" directly onto targetCtx without affecting existing pixels
        // (unless we use a temp canvas)
        
        // Optimization: If targetCtx is the main canvas, we can't just use globalCompositeOperation 'destination-in'
        // because that would erase the rest of the canvas.
        
        // So we must use a temp canvas to build the "Cloned Patch"
        if (this.stampCanvas.width !== this.strokeMask.width || this.stampCanvas.height !== this.strokeMask.height) {
            this.stampCanvas.width = this.strokeMask.width;
            this.stampCanvas.height = this.strokeMask.height;
        }
        const tCtx = this.stampCtx; // Reuse stampCanvas as temp composition buffer
        tCtx.clearRect(0, 0, this.stampCanvas.width, this.stampCanvas.height);
        
        // A. Draw Source Image (Shifted)
        tCtx.drawImage(this.sourceImage, this.offset.dx, this.offset.dy);
        
        // B. Apply Mask
        tCtx.globalCompositeOperation = 'destination-in';
        tCtx.drawImage(this.strokeMask, 0, 0);
        tCtx.globalCompositeOperation = 'source-over';
        
        // C. Draw Result to Target
        targetCtx.drawImage(this.stampCanvas, 0, 0);
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
