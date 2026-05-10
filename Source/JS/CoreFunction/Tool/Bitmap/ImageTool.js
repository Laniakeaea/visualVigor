import { ToolUtils } from '../ToolUtils.js';
import { BitmapCommand } from '../../Edit/Commands/BitmapCommand.js';

export class ImageTool {
    constructor() {
        this.id = 'toolBitmapImage';
        this.options = {
            opacity: 100,   // 0-100%
            keepRatio: true // Toggle
        };
        
        // State Machine: 'IDLE', 'SIZING', 'ROTATING'
        this.state = 'IDLE';
        
        this.startPoint = null;   // Center Point
        this.currentPoint = null; // Current Mouse Point
        this.image = null;        // Loaded Image
        
        this.rect = { x: 0, y: 0, w: 0, h: 0, rotation: 0 };

        this._fileInput = this._createFileInput();
    }

    onDrawIndicator(ctx, point, viewport) {
        if (!this.image || (this.state !== 'SIZING' && this.state !== 'ROTATING')) return;

        if (window.indicatorSystem) {
            window.indicatorSystem.drawImageIndicator(
                ctx,
                this.image,
                this.rect,
                this.options.opacity,
                this.rect.rotation,
                viewport
            );
        }
    }

    _createFileInput() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.style.display = 'none';
        input.addEventListener('change', (e) => this._onFileSelected(e));
        document.body.appendChild(input);
        return input;
    }

    activate() {
        this.bindEvents();
        document.body.style.cursor = 'crosshair';
    }

    deactivate() {
        this.unbindEvents();
        document.body.style.cursor = '';
        if (window.indicatorSystem) window.indicatorSystem.update();
        this.state = 'IDLE';
        this.image = null;
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
        this.activeViewport = viewport;

        // Validate Layer
        if (!ToolUtils.validateActiveLayer()) return;

        if (this.state === 'IDLE') {
            // Step 1: Open File Dialog
            this._fileInput.click();
        } else if (this.state === 'READY') {
            // Step 2: Start Sizing (Set Center)
            this.startPoint = this._getLogicalPoint(e, viewport);
            this.currentPoint = this.startPoint;
            this.state = 'SIZING';
            if (window.indicatorSystem) window.indicatorSystem.update();
        } else if (this.state === 'ROTATING') {
            // Step 4: Commit
            this._insertImage();
            this.state = 'IDLE';
            this.image = null;
            if (window.indicatorSystem) window.indicatorSystem.update();
        }
    }

    onPointerMove(e) {
        if (!this.activeViewport) return;
        
        const pt = this._getLogicalPoint(e, this.activeViewport);
        this.currentPoint = pt;

        if (this.state === 'SIZING') {
            // Update Width/Height based on distance from Center
            const dx = Math.abs(pt.x - this.startPoint.x);
            const dy = Math.abs(pt.y - this.startPoint.y);
            
            let w = dx * 2;
            let h = dy * 2;
            
            if (this.options.keepRatio && this.image) {
                const ratio = this.image.naturalWidth / this.image.naturalHeight;
                if (w / h > ratio) {
                    w = h * ratio;
                } else {
                    h = w / ratio;
                }
            }
            
            this.rect.w = w;
            this.rect.h = h;
            this.rect.x = this.startPoint.x - w / 2;
            this.rect.y = this.startPoint.y - h / 2;
            this.rect.rotation = 0;
            
            if (window.indicatorSystem) window.indicatorSystem.update();
        } else if (this.state === 'ROTATING') {
            // Update Rotation based on angle from Center
            const dx = pt.x - this.startPoint.x;
            const dy = pt.y - this.startPoint.y;
            const angle = Math.atan2(dy, dx) * 180 / Math.PI;
            
            // Snap to 45 degrees if Shift is pressed? (Optional)
            this.rect.rotation = angle;
            
            if (window.indicatorSystem) window.indicatorSystem.update();
        }
    }

    onPointerUp(e) {
        if (this.state === 'SIZING') {
            // Step 3: Switch to Rotating
            this.state = 'ROTATING';
        }
    }

    _onFileSelected(e) {
        const file = e.target.files[0];
        if (!file) {
            this.state = 'IDLE';
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                this.image = img;
                this.state = 'READY';
                // Optional: Show cursor hint "Click to place center"
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
        
        // Reset input
        this._fileInput.value = '';
    }

    _insertImage() {
        if (!this.image) return;
        
        const canvas = ToolUtils.validateActiveLayer();
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        
        // Calculate Bounding Box for Undo
        const bbox = this._getBoundingBox(this.rect);
        
        // Clip to Canvas
        const x = Math.max(0, bbox.x);
        const y = Math.max(0, bbox.y);
        const w = Math.min(canvas.width - x, bbox.w);
        const h = Math.min(canvas.height - y, bbox.h);
        
        if (w <= 0 || h <= 0) return;

        // 1. Capture Old State
        const oldData = ctx.getImageData(x, y, w, h);

        ctx.save();
        
        // Apply Opacity
        ctx.globalAlpha = this.options.opacity / 100;
        
        // Transform
        const cx = this.rect.x + this.rect.w / 2;
        const cy = this.rect.y + this.rect.h / 2;
        
        ctx.translate(cx, cy);
        ctx.rotate(this.rect.rotation * Math.PI / 180);
        ctx.translate(-cx, -cy);
        
        // Draw
        ctx.drawImage(this.image, this.rect.x, this.rect.y, this.rect.w, this.rect.h);
        
        ctx.restore();
        
        // 2. Capture New State
        const newData = ctx.getImageData(x, y, w, h);

        // Apply Selection Mask
        ToolUtils.applySelectionMask(newData, oldData, x, y);
        ctx.putImageData(newData, x, y);

        // 3. Create Command
        if (window.projectModel && window.projectModel.selectedLayerId && window.editSystem) {
            const currentFrame = window.projectModel.data.timeline.currentFrame || 0;
            const cmd = new BitmapCommand(
                window.projectModel.selectedLayerId,
                oldData,
                newData,
                x,
                y,
                currentFrame
            );
            window.editSystem.addCommand(cmd);
        }

        // Notify change
        window.dispatchEvent(new CustomEvent('projectLayersChanged'));
    }

    _getBoundingBox(rect) {
        const cx = rect.x + rect.w / 2;
        const cy = rect.y + rect.h / 2;
        const w = rect.w;
        const h = rect.h;
        const r = rect.rotation * Math.PI / 180;
        
        const corners = [
            { x: -w/2, y: -h/2 },
            { x: w/2, y: -h/2 },
            { x: w/2, y: h/2 },
            { x: -w/2, y: h/2 }
        ];
        
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        
        corners.forEach(p => {
            const rx = p.x * Math.cos(r) - p.y * Math.sin(r);
            const ry = p.x * Math.sin(r) + p.y * Math.cos(r);
            const x = rx + cx;
            const y = ry + cy;
            
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
        });
        
        return {
            x: Math.floor(minX),
            y: Math.floor(minY),
            w: Math.ceil(maxX - minX),
            h: Math.ceil(maxY - minY)
        };
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
