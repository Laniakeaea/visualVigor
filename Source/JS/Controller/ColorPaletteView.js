import { ColorUtils } from './ColorUtils.js';

/* =========================================
   Color Palette View
   ========================================= */

export class ColorPaletteView {
    constructor() {
        this.elements = {};
        this.container = this._createDOM();
        this.lastState = null;
        
        this._initResizeObserver();
    }

    getContainer() {
        return this.container;
    }

    /**
     * Updates the view with the new state.
     * @param {Object} state - { h, s, l, a, mode, recentColors }
     */
    render(state) {
        // Check if mode changed to rebuild inputs
        if (!this.lastState || this.lastState.mode !== state.mode) {
            this._rebuildInputs(state.mode);
        }
        
        this.lastState = state;
        this._drawSV(state);
        this._drawAlpha(state);
        this._updateIndicators(state);
        this._updateInputs(state);
        this._renderRecentColors(state.recentColors, state);
    }

    _rebuildInputs(mode) {
        const container = this.elements.fieldsContainer;
        container.innerHTML = '';
        this.elements.inputs = [];

        const createInput = (type, label, max) => {
            const input = document.createElement('input');
            input.type = 'text'; // Use text for better control
            input.dataset.type = type;
            input.dataset.max = max;
            // input.placeholder = label; // Optional
            container.appendChild(input);
            this.elements.inputs.push(input);
        };

        if (mode === 'HEXA') {
            // Reference uses 4 inputs for HEXA: RR GG BB AA
            createInput('hex_r', 'RR', 255);
            createInput('hex_g', 'GG', 255);
            createInput('hex_b', 'BB', 255);
            createInput('hex_a', 'AA', 255);
        } else if (mode === 'RGBA') {
            createInput('r', 'R', 255);
            createInput('g', 'G', 255);
            createInput('b', 'B', 255);
            createInput('a', 'A', 1);
        } else if (mode === 'HSLA') {
            createInput('h', 'H', 360);
            createInput('s', 'S', 100);
            createInput('l', 'L', 100);
            createInput('a', 'A', 1);
        } else if (mode === 'HSVA') {
            createInput('h', 'H', 360);
            createInput('s', 'S', 100);
            createInput('v', 'V', 100);
            createInput('a', 'A', 1);
        }
    }

    _updateInputs(state) {
        // Don't update if active element is one of our inputs
        if (this.elements.inputs.includes(document.activeElement)) return;

        const inputs = this.elements.inputs;
        const { mode } = state;

        if (mode === 'HEXA') {
            const { r, g, b } = ColorUtils.hslToRgb(state.h, state.s, state.l);
            const hex8 = ColorUtils.rgbaToHex8(r, g, b, state.a); // #RRGGBBAA
            // hex8 is #RRGGBBAA, slice(1) gives RRGGBBAA
            const val = hex8.slice(1);
            if (inputs[0]) inputs[0].value = val.slice(0, 2);
            if (inputs[1]) inputs[1].value = val.slice(2, 4);
            if (inputs[2]) inputs[2].value = val.slice(4, 6);
            if (inputs[3]) inputs[3].value = val.slice(6, 8);
        } else if (mode === 'RGBA') {
            const { r, g, b } = ColorUtils.hslToRgb(state.h, state.s, state.l);
            if (inputs[0]) inputs[0].value = r;
            if (inputs[1]) inputs[1].value = g;
            if (inputs[2]) inputs[2].value = b;
            if (inputs[3]) inputs[3].value = state.a.toFixed(2);
        } else if (mode === 'HSLA') {
            if (inputs[0]) inputs[0].value = Math.round(state.h);
            if (inputs[1]) inputs[1].value = Math.round(state.s * 100);
            if (inputs[2]) inputs[2].value = Math.round(state.l * 100);
            if (inputs[3]) inputs[3].value = state.a.toFixed(2);
        } else if (mode === 'HSVA') {
            const hsv = ColorUtils.hslToHsv(state.h, state.s, state.l);
            if (inputs[0]) inputs[0].value = Math.round(hsv.h);
            if (inputs[1]) inputs[1].value = Math.round(hsv.s * 100);
            if (inputs[2]) inputs[2].value = Math.round(hsv.v * 100);
            if (inputs[3]) inputs[3].value = state.a.toFixed(2);
        }
    }

    _renderRecentColors(colors, state) {
        const container = this.elements.recentColors;
        container.innerHTML = '';
        
        // Max 10 items
        const MAX = 10;
        
        // Calculate current hex8 for active comparison
        let currentHex8 = null;
        if (state) {
            const { r, g, b } = ColorUtils.hslToRgb(state.h, state.s, state.l);
            currentHex8 = ColorUtils.rgbaToHex8(r, g, b, state.a);
        }

        colors.forEach(color => {
            const div = document.createElement('div');
            div.className = 'recent-colors__item';
            div.style.backgroundColor = color.rgba;
            
            // Tooltip based on current mode
            let tooltip = color.hex8;
            if (state && state.mode) {
                const { r, g, b, a } = color;
                switch (state.mode) {
                    case 'HEXA':
                        tooltip = color.hex8;
                        break;
                    case 'RGBA':
                        tooltip = ColorUtils.toRgbaString(r, g, b, a);
                        break;
                    case 'HSLA':
                        const hsl = ColorUtils.rgbToHsl(r, g, b);
                        tooltip = ColorUtils.toHslaString(hsl.h, hsl.s, hsl.l, a);
                        break;
                    case 'HSVA':
                        const hsv = ColorUtils.rgbToHsv(r, g, b);
                        tooltip = ColorUtils.toHsvaString(hsv.h, hsv.s, hsv.v, a);
                        break;
                }
            }
            div.title = tooltip;

            div.dataset.hex8 = color.hex8;
            div.tabIndex = 0; // Make focusable
            
            // Check transparency for pattern
            if (color.a < 1) {
                div.dataset.alpha = 'partial';
            }
            
            // Active state
            if (currentHex8 && color.hex8 === currentHex8) {
                div.dataset.active = 'true';
            }
            
            container.appendChild(div);
        });

        // Fill empty slots
        for (let i = colors.length; i < MAX; i++) {
            const div = document.createElement('div');
            div.className = 'recent-colors__item--empty';
            div.setAttribute('aria-hidden', 'true');
            container.appendChild(div);
        }
    }

    _createDOM() {
        const container = document.createElement('div');
        container.className = 'color-palette';

        const pickerContainer = document.createElement('div');
        pickerContainer.className = 'color-palette__picker';

        this._createSVSquare(pickerContainer);
        this._createHueBar(pickerContainer);
        this._createAlphaBar(pickerContainer);
        this._createModeInputs(pickerContainer);
        this._createRecentColorsSection(pickerContainer);

        container.appendChild(pickerContainer);
        return container;
    }

    _createSVSquare(parent) {
        const svSquare = document.createElement('div');
        svSquare.className = 'color-palette__sv-square';
        
        const svCanvas = document.createElement('canvas');
        svCanvas.className = 'color-palette__sv';
        
        const thumb = document.createElement('div');
        thumb.className = 'color-palette__thumb';

        svSquare.appendChild(svCanvas);
        svSquare.appendChild(thumb);
        
        this.elements.svSquare = svSquare;
        this.elements.svCanvas = svCanvas;
        this.elements.svThumb = thumb;
        parent.appendChild(svSquare);
    }

    _createHueBar(parent) {
        const hueBar = document.createElement('div');
        hueBar.className = 'color-palette__bar color-palette__bar--hue';
        
        const hueCanvas = document.createElement('canvas');
        hueCanvas.className = 'color-palette__hue';
        
        const hueIndicator = document.createElement('div');
        hueIndicator.className = 'color-palette__bar-indicator';

        hueBar.appendChild(hueCanvas);
        hueBar.appendChild(hueIndicator);

        this.elements.hueBar = hueBar;
        this.elements.hueCanvas = hueCanvas;
        this.elements.hueIndicator = hueIndicator;
        parent.appendChild(hueBar);
    }

    _createAlphaBar(parent) {
        const alphaBar = document.createElement('div');
        alphaBar.className = 'color-palette__bar color-palette__bar--alpha';
        
        const alphaCanvas = document.createElement('canvas');
        alphaCanvas.className = 'color-palette__alpha pattern-checkerboard';

        const alphaIndicator = document.createElement('div');
        alphaIndicator.className = 'color-palette__bar-indicator';

        alphaBar.appendChild(alphaCanvas);
        alphaBar.appendChild(alphaIndicator);

        this.elements.alphaBar = alphaBar;
        this.elements.alphaCanvas = alphaCanvas;
        this.elements.alphaIndicator = alphaIndicator;
        parent.appendChild(alphaBar);
    }

    _createModeInputs(parent) {
        const modeRow = document.createElement('div');
        modeRow.className = 'color-palette__mode-row';

        const modeBtn = document.createElement('button');
        modeBtn.className = 'color-palette__mode-btn';
        
        const fields = document.createElement('div');
        fields.className = 'color-palette__fields';
        
        modeRow.appendChild(modeBtn);
        modeRow.appendChild(fields);

        this.elements.modeBtn = modeBtn;
        this.elements.fieldsContainer = fields;
        this.elements.inputs = [];
        parent.appendChild(modeRow);
    }

    _createRecentColorsSection(parent) {
        const recentColors = document.createElement('div');
        recentColors.className = 'recent-colors';
        this.elements.recentColors = recentColors;
        parent.appendChild(recentColors);
    }

    _initResizeObserver() {
        const resizeObserver = new ResizeObserver(() => {
            this._resizeCanvases();
            if (this.lastState) {
                this.render(this.lastState);
            }
        });
        resizeObserver.observe(this.elements.svSquare);
    }

    _resizeCanvases() {
        const dpr = window.devicePixelRatio || 1;
        const svRect = this.elements.svSquare.getBoundingClientRect();
        const hueRect = this.elements.hueBar.getBoundingClientRect();
        const alphaRect = this.elements.alphaBar.getBoundingClientRect();

        if (svRect.width === 0) return;

        this._setCanvasSize(this.elements.svCanvas, svRect.width, svRect.height, dpr);
        this._setCanvasSize(this.elements.hueCanvas, hueRect.width, hueRect.height, dpr);
        this._setCanvasSize(this.elements.alphaCanvas, alphaRect.width, alphaRect.height, dpr);
    }

    _setCanvasSize(canvas, w, h, dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
    }

    _drawSV(state) {
        const canvas = this.elements.svCanvas;
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;

        if (state.mode === 'HSLA') {
            this._drawSV_HSL(ctx, w, h, state.h);
        } else {
            this._drawSV_HSV(ctx, w, h, state.h);
        }
    }

    _drawSV_HSL(ctx, w, h, hue) {
        const img = ctx.createImageData(w, h);
        const data = img.data;
        for (let y = 0; y < h; y++) {
            const l = 1 - y / (h - 1);
            for (let x = 0; x < w; x++) {
                const s = x / (w - 1);
                const { r, g, b } = ColorUtils.hslToRgb(hue, s, l);
                const index = (y * w + x) * 4;
                data[index] = r;
                data[index + 1] = g;
                data[index + 2] = b;
                data[index + 3] = 255;
            }
        }
        ctx.putImageData(img, 0, 0);
    }

    _drawSV_HSV(ctx, w, h, hue) {
        ctx.clearRect(0, 0, w, h);

        // 1. Fill with Hue Color
        const { r, g, b } = ColorUtils.hslToRgb(hue, 1, 0.5);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(0, 0, w, h);

        // 2. Horizontal Gradient (White -> Transparent)
        const gradH = ctx.createLinearGradient(0, 0, w, 0);
        gradH.addColorStop(0, '#FFF');
        gradH.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = gradH;
        ctx.fillRect(0, 0, w, h);

        // 3. Vertical Gradient (Transparent -> Black)
        const gradV = ctx.createLinearGradient(0, 0, 0, h);
        gradV.addColorStop(0, 'rgba(0,0,0,0)');
        gradV.addColorStop(1, '#000');
        ctx.fillStyle = gradV;
        ctx.fillRect(0, 0, w, h);
    }

    _drawAlpha(state) {
        const canvas = this.elements.alphaCanvas;
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;

        ctx.clearRect(0, 0, w, h);

        const { r, g, b } = ColorUtils.hslToRgb(state.h, state.s, state.l);
        const grad = ctx.createLinearGradient(0, 0, w, 0);
        grad.addColorStop(0, `rgba(${r},${g},${b},0)`);
        grad.addColorStop(1, `rgba(${r},${g},${b},1)`);
        
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
    }

    _updateIndicators(state) {
        // SV Thumb
        let x, y;
        if (state.mode === 'HSLA') {
            x = state.s * 100;
            y = (1 - state.l) * 100;
        } else {
            const hsv = ColorUtils.hslToHsv(state.h, state.s, state.l);
            x = hsv.s * 100;
            y = (1 - hsv.v) * 100;
        }
        this.elements.svThumb.style.left = `${x}%`;
        this.elements.svThumb.style.top = `${y}%`;
        
        const { r, g, b } = ColorUtils.hslToRgb(state.h, state.s, state.l);
        this.elements.svThumb.style.backgroundColor = `rgb(${r},${g},${b})`;

        // Hue Indicator
        this.elements.hueIndicator.style.left = `${(state.h / 360) * 100}%`;

        // Alpha Indicator
        this.elements.alphaIndicator.style.left = `${state.a * 100}%`;
        
        // Mode Button
        this.elements.modeBtn.textContent = state.mode.replace('A', ''); // Display HEX, RGB, HSL, HSV
    }

    _updateInput(state) {
        // Deprecated, handled by _updateInputs
    }
}
