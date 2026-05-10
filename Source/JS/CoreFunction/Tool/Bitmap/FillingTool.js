import { BitmapCommand } from '../../Edit/Commands/BitmapCommand.js';
import { ColorUtils } from '../../../Controller/ColorUtils.js';
import { ToolUtils } from '../ToolUtils.js';

export class FillingTool {
    constructor() {
        this.id = 'toolBitmapFilling';
        this.options = {
            tolerance: 32,       // 0-255
            contiguous: true,    // true = Flood Fill, false = Global Replace
            sampleAllLayers: true,
            includeAlpha: true,
            antiAlias: false     // Usually false for pixel fill
        };
        this.isProcessing = false;
    }

    activate() {
        this.bindEvents();
        document.body.style.cursor = 'cell'; // Bucket cursor
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
        
        this.isProcessing = true;
        
        // Use setTimeout to allow UI to update
        setTimeout(() => {
            this.performFill(e);
            this.isProcessing = false;
        }, 10);
    }

    performFill(e) {
        const viewport = e.target.closest('.workspace__viewport');
        if (!viewport) return;

        // Validate Layer
        const canvas = ToolUtils.validateActiveLayer();
        if (!canvas) return;

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

        const width = canvas.width;
        const height = canvas.height;

        if (x < 0 || y < 0 || x >= width || y >= height) return;

        // 2. Get Fill Color
        const fillColor = this._getFillColor(); // {r, g, b, a} 0-255

        // 3. Check for Selection (Logic moved to end)
        
        // 4. Prepare Undo State
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const originalImageData = ctx.getImageData(0, 0, width, height);
        
        // Create a copy for modification
        const newImageData = ctx.createImageData(width, height);
        newImageData.data.set(originalImageData.data);
        const pixelData = newImageData.data;

        // 5. Perform Fill
        let changed = false;

        // Get Target Color from (x,y)
        let targetR, targetG, targetB, targetA;

        if (this.options.sampleAllLayers) {
            const compositeData = this._getCompositePixel(x, y, width, height);
            targetR = compositeData[0];
            targetG = compositeData[1];
            targetB = compositeData[2];
            targetA = compositeData[3];
        } else {
            const idx = (y * width + x) * 4;
            targetR = pixelData[idx];
            targetG = pixelData[idx + 1];
            targetB = pixelData[idx + 2];
            targetA = pixelData[idx + 3];
        }

        // Don't fill if color is same
        if (!(targetR === fillColor.r && targetG === fillColor.g && targetB === fillColor.b && targetA === fillColor.a)) {
            if (this.options.contiguous) {
                changed = this._floodFill(x, y, width, height, pixelData, targetR, targetG, targetB, targetA, fillColor);
            } else {
                changed = this._globalReplace(width, height, pixelData, targetR, targetG, targetB, targetA, fillColor);
            }
        }

        if (changed) {
            // 5.5 Apply Selection Mask
            ToolUtils.applySelectionMask(newImageData, originalImageData, 0, 0);

            // 6. Apply Changes
            ctx.putImageData(newImageData, 0, 0);

            // 7. Create Command
            if (window.editSystem && window.projectModel.selectedLayerId) {
                const currentFrame = window.projectModel.data.timeline.currentFrame || 0;
                const cmd = new BitmapCommand(
                    window.projectModel.selectedLayerId,
                    originalImageData,
                    newImageData,
                    0, // x
                    0, // y
                    currentFrame
                );
                window.editSystem.addCommand(cmd);
            }
            
            // Notify Change
            window.dispatchEvent(new CustomEvent('projectLayersChanged'));
        }
    }
    
    _getFillColor() {
        if (window.projectModel && window.projectModel.data && window.projectModel.data.settings.color) {
            const c = window.projectModel.data.settings.color;
            const rgb = ColorUtils.hslToRgb(c.h, c.s, c.l);
            return { r: rgb.r, g: rgb.g, b: rgb.b, a: Math.round(c.a * 255) };
        }
        return { r: 0, g: 0, b: 0, a: 255 };
    }

    _getCompositePixel(x, y, width, height) {
        // Simplified composite for single pixel
        const layers = window.projectModel.data.timeline.bitmapLayers;
        const currentFrame = window.projectModel.data.timeline.currentFrame || 0;
        
        // Bottom to Top
        let r=0, g=0, b=0, a=0; // Background (Transparent)

        for (let i = 0; i < layers.length; i++) {
            const layer = layers[i];
            if (!layer.visible) continue;
            
            const frame = layer.frames[currentFrame];
            if (frame) {
                const ctx = frame.getContext('2d', { willReadFrequently: true });
                const data = ctx.getImageData(x, y, 1, 1).data;
                const srcR = data[0];
                const srcG = data[1];
                const srcB = data[2];
                const srcA = data[3] / 255;

                if (srcA > 0) {
                    // Simple Alpha Blending
                    const outA = srcA + a * (1 - srcA);
                    r = (srcR * srcA + r * a * (1 - srcA)) / outA;
                    g = (srcG * srcA + g * a * (1 - srcA)) / outA;
                    b = (srcB * srcA + b * a * (1 - srcA)) / outA;
                    a = outA;
                }
            }
        }
        return [Math.round(r), Math.round(g), Math.round(b), Math.round(a * 255)];
    }

    _fillSelection(data, mask, width, height, color) {
        let changed = false;
        for (let i = 0; i < width * height; i++) {
            if (mask[i]) {
                const idx = i * 4;
                data[idx] = color.r;
                data[idx + 1] = color.g;
                data[idx + 2] = color.b;
                data[idx + 3] = color.a;
                changed = true;
            }
        }
        return changed;
    }

    _floodFill(startX, startY, width, height, data, tR, tG, tB, tA, color) {
        // If target color is same as fill color, return false (already handled, but safety check)
        if (tR === color.r && tG === color.g && tB === color.b && tA === color.a) return false;

        const stack = [[startX, startY]];
        const visited = new Uint8Array(width * height); // To prevent loops if tolerance is high
        
        const getIndex = (x, y) => (y * width + x);
        const getDataIndex = (x, y) => (y * width + x) * 4;
        
        const tolerance = this.options.tolerance;

        let changed = false;

        while (stack.length > 0) {
            const [cx, cy] = stack.pop();
            const idx = getIndex(cx, cy);
            
            if (visited[idx]) continue;
            visited[idx] = 1;

            // Check Color Match
            const dIdx = getDataIndex(cx, cy);
            const r = data[dIdx];
            const g = data[dIdx + 1];
            const b = data[dIdx + 2];
            const a = data[dIdx + 3];

            if (this._colorMatch(r, g, b, a, tR, tG, tB, tA, tolerance)) {
                // Fill
                data[dIdx] = color.r;
                data[dIdx + 1] = color.g;
                data[dIdx + 2] = color.b;
                data[dIdx + 3] = color.a;
                changed = true;

                // Add Neighbors
                if (cx + 1 < width) stack.push([cx + 1, cy]);
                if (cx - 1 >= 0) stack.push([cx - 1, cy]);
                if (cy + 1 < height) stack.push([cx, cy + 1]);
                if (cy - 1 >= 0) stack.push([cx, cy - 1]);
            }
        }
        return changed;
    }

    _globalReplace(width, height, data, tR, tG, tB, tA, color) {
        const tolerance = this.options.tolerance;
        let changed = false;
        for (let i = 0; i < width * height; i++) {
            const idx = i * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const a = data[idx + 3];

            if (this._colorMatch(r, g, b, a, tR, tG, tB, tA, tolerance)) {
                data[idx] = color.r;
                data[idx + 1] = color.g;
                data[idx + 2] = color.b;
                data[idx + 3] = color.a;
                changed = true;
            }
        }
        return changed;
    }

    _colorMatch(r1, g1, b1, a1, r2, g2, b2, a2, tolerance) {
        if (a2 === 0 && a1 === 0) return true;
        
        const dr = r1 - r2;
        const dg = g1 - g2;
        const db = b1 - b2;
        let da = 0;

        if (this.options.includeAlpha) {
            da = a1 - a2;
        }

        return Math.abs(dr) <= tolerance && 
               Math.abs(dg) <= tolerance && 
               Math.abs(db) <= tolerance && 
               Math.abs(da) <= tolerance;
    }
}
