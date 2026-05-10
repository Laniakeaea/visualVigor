import { ColorUtils } from '../../../Controller/ColorUtils.js';
import { ToolUtils } from '../ToolUtils.js';

export class DropperTool {
    constructor() {
        this.id = 'toolBitmapDropper';
        this.options = {
            sampleSize: 1,       // 1, 3, 5, etc.
            sampleAllLayers: true,
            isCircular: false,   // true = Circle, false = Square
            includeAlpha: true
        };
        this.isPicking = false;
    }

    get cursor() {
        return {
            type: 'brush',
            size: this.options.sampleSize,
            shape: this.options.isCircular ? 'circle' : 'square'
        };
    }

    activate() {
        this.bindEvents();
        document.body.style.cursor = 'crosshair';
    }

    deactivate() {
        this.unbindEvents();
        document.body.style.cursor = '';
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

        // If sampling only current layer, ensure it's valid
        if (!this.options.sampleAllLayers) {
            if (!ToolUtils.validateActiveLayer()) return;
        }

        this.isPicking = true;
        this.pickColor(e);
    }

    onPointerMove(e) {
        if (this.isPicking) {
            this.pickColor(e);
        }
    }

    onPointerUp(e) {
        this.isPicking = false;
    }

    pickColor(e) {
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

        // Bounds Check
        const artboard = window.projectModel.data.settings.artboard;
        if (x < 0 || y < 0 || x >= artboard.width || y >= artboard.height) return;

        const size = this.options.sampleSize || 1;
        const half = Math.floor(size / 2);
        const startX = x - half;
        const startY = y - half;

        const layers = window.projectModel.data.timeline.bitmapLayers;
        const currentFrame = window.projectModel.data.timeline.currentFrame || 0;

        let layersToSample = [];
        if (this.options.sampleAllLayers) {
            // Filter visible layers. Order is 0 (Bottom) to N (Top).
            layersToSample = layers.filter(l => l.visible);
        } else {
            const selectedId = window.projectModel.selectedLayerId;
            const l = layers.find(l => l.id === selectedId);
            if (l && l.visible) layersToSample = [l];
        }

        if (layersToSample.length === 0) return;

        // Initialize Composite Buffer
        const len = size * size * 4;
        const compositeData = new Float32Array(len); // R, G, B, A(0-1)

        // Iterate Bottom-to-Top
        for (let i = 0; i < layersToSample.length; i++) {
            const layer = layersToSample[i];
            const canvas = layer.frames[currentFrame];
            if (!canvas) continue;

            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            const layerData = ctx.getImageData(startX, startY, size, size).data;

            for (let p = 0; p < len; p += 4) {
                const srcR = layerData[p];
                const srcG = layerData[p+1];
                const srcB = layerData[p+2];
                const srcA = layerData[p+3] / 255;

                if (srcA <= 0) continue;

                const destR = compositeData[p];
                const destG = compositeData[p+1];
                const destB = compositeData[p+2];
                const destA = compositeData[p+3];

                const outA = srcA + destA * (1 - srcA);
                if (outA > 0) {
                    const outR = (srcR * srcA + destR * destA * (1 - srcA)) / outA;
                    const outG = (srcG * srcA + destG * destA * (1 - srcA)) / outA;
                    const outB = (srcB * srcA + destB * destA * (1 - srcA)) / outA;

                    compositeData[p] = outR;
                    compositeData[p+1] = outG;
                    compositeData[p+2] = outB;
                    compositeData[p+3] = outA;
                }
            }
        }

        this._averageAndSet(compositeData, size);
    }

    _averageAndSet(data, size) {
        let r = 0, g = 0, b = 0, a = 0;
        let count = 0;
        const half = Math.floor(size / 2);

        for (let i = 0; i < data.length; i += 4) {
            const px = (i / 4) % size;
            const py = Math.floor((i / 4) / size);

            // Shape Check
            if (this.options.isCircular) {
                const dx = px - half;
                const dy = py - half;
                if (dx*dx + dy*dy > half*half) continue;
            }

            const alpha = data[i+3]; // 0..1
            if (alpha > 0) {
                r += data[i];
                g += data[i+1];
                b += data[i+2];
                a += alpha;
                count++;
            }
        }

        if (count === 0) return;

        let avgR = Math.round(r / count);
        let avgG = Math.round(g / count);
        let avgB = Math.round(b / count);
        let avgA = a / count; // 0..1

        if (!this.options.includeAlpha) {
            avgA = 1;
        }

        this.setColor(avgR, avgG, avgB, avgA);
    }

    setColor(r, g, b, a) {
        const hsl = ColorUtils.rgbToHsl(r, g, b);
        const event = new CustomEvent('colorPicked', {
            detail: { 
                h: hsl.h, 
                s: hsl.s, 
                l: hsl.l, 
                a: a 
            }
        });
        window.dispatchEvent(event);
    }
}