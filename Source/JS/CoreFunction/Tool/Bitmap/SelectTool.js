import { SelectionManager } from '../../Selection/SelectionManager.js';
import { ToolUtils } from '../ToolUtils.js';
import { SelectionCommand } from '../../Edit/Commands/SelectionCommand.js';

export class SelectTool {
    constructor() {
        this.id = 'toolBitmapSelect';
        this.options = {
            mode: 'new',        // 'new', 'add', 'subtract', 'intersect'
        };
        this.isSelecting = false;
        this.startPoint = null;
        this.currentPoint = null;
    }

    activate() {
        this.bindEvents();
        document.body.style.cursor = 'crosshair';
    }

    deactivate() {
        this.unbindEvents();
        document.body.style.cursor = '';
        this._clearPreview();
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
        
        if (!ToolUtils.validateActiveLayer()) return;

        const viewport = e.target.closest('.workspace__viewport');
        if (!viewport) return;

        this.activeViewport = viewport;
        this.isSelecting = true;
        
        const pt = this._getLogicalPoint(e, viewport);
        this.startPoint = pt;
        this.currentPoint = pt;

        this._drawPreview();
    }

    onPointerMove(e) {
        if (!this.isSelecting) return;
        
        this.currentPoint = this._getLogicalPoint(e, this.activeViewport);
        this._drawPreview();
    }

    onPointerUp(e) {
        if (!this.isSelecting) return;
        
        this.isSelecting = false;
        this._clearPreview();
        
        if (!this.startPoint || !this.currentPoint) return;

        // Finalize Selection
        this._applySelection();
        
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

    _drawPreview() {
        if (!this.activeViewport) return;
        
        const previewCanvas = this.activeViewport.querySelector('.tool-preview-layer-canvas');
        if (!previewCanvas) return;
        
        const ctx = previewCanvas.getContext('2d');
        ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
        
        const x = Math.min(this.startPoint.x, this.currentPoint.x);
        const y = Math.min(this.startPoint.y, this.currentPoint.y);
        const w = Math.abs(this.currentPoint.x - this.startPoint.x);
        const h = Math.abs(this.currentPoint.y - this.startPoint.y);

        ctx.save();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        
        // Always Rectangle
        ctx.strokeRect(x, y, w, h);
        
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineDashOffset = 4;
        ctx.strokeRect(x, y, w, h);
        
        ctx.restore();
    }

    _clearPreview() {
        if (this.activeViewport) {
            const previewCanvas = this.activeViewport.querySelector('.tool-preview-layer-canvas');
            if (previewCanvas) {
                const ctx = previewCanvas.getContext('2d');
                ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
            }
        }
    }

    _applySelection() {
        if (!window.projectModel || !window.projectModel.data) return;
        
        const artboard = window.projectModel.data.settings.artboard;
        const width = artboard.width;
        const height = artboard.height;
        
        const x1 = Math.min(this.startPoint.x, this.currentPoint.x);
        const y1 = Math.min(this.startPoint.y, this.currentPoint.y);
        const x2 = Math.max(this.startPoint.x, this.currentPoint.x);
        const y2 = Math.max(this.startPoint.y, this.currentPoint.y);
        
        // Generate New Mask
        const newMask = new Uint8Array(width * height);
        
        // Always Rectangle
        const bx1 = Math.max(0, Math.floor(x1));
        const by1 = Math.max(0, Math.floor(y1));
        const bx2 = Math.min(width, Math.ceil(x2));
        const by2 = Math.min(height, Math.ceil(y2));
        
        for (let y = by1; y < by2; y++) {
            for (let x = bx1; x < bx2; x++) {
                newMask[y * width + x] = 1;
            }
        }
        
        // Combine with Existing Selection
        if (window.selectionManager) {
            const currentSel = window.selectionManager.getSelection();
            let finalMask = newMask;
            
            if (currentSel && currentSel.width === width && currentSel.height === height) {
                const oldMask = currentSel.mask;
                
                if (this.options.mode === 'add') {
                    for (let i = 0; i < width * height; i++) {
                        finalMask[i] = oldMask[i] | newMask[i];
                    }
                } else if (this.options.mode === 'subtract') {
                    for (let i = 0; i < width * height; i++) {
                        finalMask[i] = oldMask[i] & (newMask[i] ? 0 : 1);
                    }
                } else if (this.options.mode === 'intersect') {
                    for (let i = 0; i < width * height; i++) {
                        finalMask[i] = oldMask[i] & newMask[i];
                    }
                }
            }
            
            // Create Command
            if (window.editSystem) {
                const cmd = new SelectionCommand(
                    currentSel, 
                    { mask: finalMask, width, height }
                );
                window.editSystem.addCommand(cmd);
            }

            window.selectionManager.setSelection(finalMask, width, height);
        }
    }
}
