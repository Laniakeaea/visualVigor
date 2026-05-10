import { ColorUtils } from '../../../Controller/ColorUtils.js';
import { ToolUtils } from '../ToolUtils.js';
import { SelectionCommand } from '../../Edit/Commands/SelectionCommand.js';

export class MagicStickTool {
    constructor() {
        this.id = 'toolBitmapMagicStick';
        this.options = {
            tolerance: 32,       // 0-255
            contiguous: true,    // true = Flood Fill, false = Select All Matching
            sampleAllLayers: true,
            includeAlpha: true,  // Include transparency in matching
            antiAlias: true      // Optional
        };
        this.isProcessing = false;
    }

    activate() {
        this.bindEvents();
        document.body.style.cursor = 'crosshair'; // Or a magic wand cursor
    }

    deactivate() {
        this.unbindEvents();
        document.body.style.cursor = '';
    }

    bindEvents() {
        this.handleDown = this.onPointerDown.bind(this);
        document.addEventListener('pointerdown', this.handleDown);
    }

    unbindEvents() {
        document.removeEventListener('pointerdown', this.handleDown);
    }

    onPointerDown(e) {
        if (e.button !== 0) return;
        if (this.isProcessing) return;

        if (!ToolUtils.validateActiveLayer()) return;
        
        this.isProcessing = true;
        
        // Use setTimeout to allow UI to update (show loading cursor?)
        setTimeout(() => {
            this.performSelection(e);
            this.isProcessing = false;
        }, 10);
    }

    performSelection(e) {
        const viewport = e.target.closest('.workspace__viewport');
        if (!viewport) return;

        if (!window.projectModel || !window.projectModel.data) return;

        const rect = viewport.getBoundingClientRect();
        let x = e.clientX - rect.left;
        let y = e.clientY - rect.top;

        // Convert to Logical Coordinates
        if (viewport.cameraController) {
            const { position, scale } = viewport.cameraController;
            x = (x - position.x) / scale;
            y = (y - position.y) / scale;
        }

        x = Math.floor(x);
        y = Math.floor(y);

        const artboard = window.projectModel.data.settings.artboard;
        const width = artboard.width;
        const height = artboard.height;

        if (x < 0 || y < 0 || x >= width || y >= height) return;

        // 1. Get Image Data
        const pixelData = this._getImageData(width, height);
        if (!pixelData) return;

        // 2. Get Target Color
        const targetIndex = (y * width + x) * 4;
        const targetR = pixelData[targetIndex];
        const targetG = pixelData[targetIndex + 1];
        const targetB = pixelData[targetIndex + 2];
        const targetA = pixelData[targetIndex + 3];

        // 3. Perform Flood Fill or Global Search
        const selectionMask = new Uint8Array(width * height); // 0 = unselected, 1 = selected
        const tolerance = this.options.tolerance;

        if (this.options.contiguous) {
            this._floodFill(x, y, width, height, pixelData, targetR, targetG, targetB, targetA, tolerance, selectionMask);
        } else {
            this._globalSearch(width, height, pixelData, targetR, targetG, targetB, targetA, tolerance, selectionMask);
        }

        // 4. Update Selection Manager
        if (window.selectionManager) {
            const currentSel = window.selectionManager.getSelection();
            
            // Create Command
            if (window.editSystem) {
                const cmd = new SelectionCommand(
                    currentSel, 
                    { mask: selectionMask, width, height }
                );
                window.editSystem.addCommand(cmd);
            }

            window.selectionManager.setSelection(selectionMask, width, height);
        } else {
            // Fallback
            window.dispatchEvent(new CustomEvent('selectionChanged', {
                detail: {
                    mask: selectionMask,
                    width: width,
                    height: height,
                    type: 'bitmap'
                }
            }));
        }
    }

    _getImageData(width, height) {
        // If sampleAllLayers is true, we need to composite.
        // If false, just get the active layer.
        
        if (!this.options.sampleAllLayers) {
            const canvas = window.projectModel.getActiveCanvas();
            if (!canvas) return null;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            return ctx.getImageData(0, 0, width, height).data;
        }

        // Composite Logic
        const layers = window.projectModel.data.timeline.bitmapLayers;
        const currentFrame = window.projectModel.data.timeline.currentFrame || 0;
        
        // Create a temporary canvas for composition
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const ctx = tempCanvas.getContext('2d', { willReadFrequently: true });

        
        for (let i = 0; i < layers.length; i++) {
            const layer = layers[i];
            if (!layer.visible) continue;
            
            const frame = layer.frames[currentFrame];
            if (frame) {
                ctx.globalAlpha = 1; // Layer opacity? We don't have layer opacity yet in the model, assuming 1.
                ctx.globalCompositeOperation = layer.blendingMode || 'source-over';
                ctx.drawImage(frame, 0, 0);
            }
        }

        return ctx.getImageData(0, 0, width, height).data;
    }

    _floodFill(startX, startY, width, height, data, tR, tG, tB, tA, tolerance, mask) {
        const stack = [[startX, startY]];
        const visited = new Uint8Array(width * height); // 0 or 1
        
        const getIndex = (x, y) => (y * width + x);
        const getDataIndex = (x, y) => (y * width + x) * 4;

        // Mark start as visited
        visited[getIndex(startX, startY)] = 1;

        while (stack.length > 0) {
            const [cx, cy] = stack.pop();
            const idx = getIndex(cx, cy);
            
            mask[idx] = 1; // Select it

            // Check neighbors (4-way)
            const neighbors = [
                [cx + 1, cy],
                [cx - 1, cy],
                [cx, cy + 1],
                [cx, cy - 1]
            ];

            for (const [nx, ny] of neighbors) {
                if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
                
                const nIdx = getIndex(nx, ny);
                if (visited[nIdx]) continue;

                // Check Color Match
                const dIdx = getDataIndex(nx, ny);
                const r = data[dIdx];
                const g = data[dIdx + 1];
                const b = data[dIdx + 2];
                const a = data[dIdx + 3];

                if (this._colorMatch(r, g, b, a, tR, tG, tB, tA, tolerance)) {
                    visited[nIdx] = 1;
                    stack.push([nx, ny]);
                }
            }
        }
    }

    _globalSearch(width, height, data, tR, tG, tB, tA, tolerance, mask) {
        for (let i = 0; i < width * height; i++) {
            const r = data[i * 4];
            const g = data[i * 4 + 1];
            const b = data[i * 4 + 2];
            const a = data[i * 4 + 3];

            if (this._colorMatch(r, g, b, a, tR, tG, tB, tA, tolerance)) {
                mask[i] = 1;
            }
        }
    }

    _colorMatch(r1, g1, b1, a1, r2, g2, b2, a2, tolerance) {
        // Simple Euclidean distance or Max difference
        // Let's use Max difference for simplicity, or Euclidean.
        // Euclidean: sqrt(dr^2 + dg^2 + db^2 + da^2)
        // Tolerance is usually 0-255.
        
        // If target is transparent (a=0), we only match alpha?
        if (a2 === 0 && a1 === 0) return true;
        
        // If includeAlpha is false, we ignore alpha channel differences (treat everything as opaque)
        // But if the pixel is fully transparent, it shouldn't match a color unless target is also transparent?
        // Let's say: if includeAlpha is false, we only compare RGB.
        
        const dr = r1 - r2;
        const dg = g1 - g2;
        const db = b1 - b2;
        let da = 0;

        if (this.options.includeAlpha) {
            da = a1 - a2;
        }

        // Distance squared
        const distSq = dr*dr + dg*dg + db*db + da*da;
        const tolSq = tolerance * tolerance * 4; // Scale tolerance?
        
        // Photoshop style tolerance usually applies to each channel or luminance.
        // Let's use a simple sum of diffs or max diff.
        // "Tolerance" in PS: 0-255. If diff in RGB is within range.
        
        // Let's use: Max(abs(dr), abs(dg), abs(db), abs(da)) <= tolerance
        return Math.abs(dr) <= tolerance && 
               Math.abs(dg) <= tolerance && 
               Math.abs(db) <= tolerance && 
               Math.abs(da) <= tolerance;
    }
}
