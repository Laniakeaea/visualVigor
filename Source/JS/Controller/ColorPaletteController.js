import { ColorUtils } from './ColorUtils.js';
import { ColorPaletteView } from './ColorPaletteView.js';

/* =========================================
   Color Palette Controller
   ========================================= */

export class ColorPaletteController {
    constructor() {
        // Internal State (HSL based)
        this.state = {
            h: 0,   // 0-360
            s: 1,   // 0-1
            l: 0.5, // 0-1
            a: 1,   // 0-1
            mode: 'HEXA', // Default mode
            recentColors: [] // Array of { hex8, rgba, r, g, b, a }
        };

        this.modes = ['HEXA', 'RGBA', 'HSLA', 'HSVA'];
        this.view = new ColorPaletteView();
        this.isDragging = null;
        
        this._bindEvents();
    }

    /**
     * Creates and initializes the color palette component.
     * @returns {HTMLElement} The color palette container.
     */
    static create() {
        const instance = new ColorPaletteController();
        instance.update(); // Initial render
        return instance.view.getContainer();
    }

    update() {
        this.view.render(this.state);
    }

    _bindEvents() {
        const elements = this.view.elements;

        // Listen for Project Activation (Unified Restoration)
        window.addEventListener('projectActivated', (e) => {
            const project = e.detail;
            if (project && project.settings && project.settings.color) {
                const colorState = project.settings.color;
                this.state = {
                    ...this.state,
                    h: colorState.h,
                    s: colorState.s,
                    l: colorState.l,
                    a: colorState.a,
                    mode: colorState.mode
                };
                this.update();
            }
        });

        // Listen for Color Picked (Dropper Tool)
        window.addEventListener('colorPicked', (e) => {
            const colorState = e.detail;
            this.state = {
                ...this.state,
                h: colorState.h,
                s: colorState.s,
                l: colorState.l,
                a: colorState.a
            };
            this.update();
            this._addToRecent();
        });

        // Dragging Logic
        const handleDown = (e, type) => {
            e.preventDefault();
            this.isDragging = type;
            this._handleInput(e);
            window.addEventListener('mousemove', handleMove);
            window.addEventListener('mouseup', handleUp);
        };

        const handleMove = (e) => {
            if (this.isDragging) {
                this._handleInput(e);
            }
        };

        const handleUp = () => {
            if (this.isDragging) {
                // Add to recent colors on drag end
                this._addToRecent();
                if (window.projectModel) window.projectModel.updateSetting('color', this.state, false);
            }
            this.isDragging = null;
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleUp);
        };

        elements.svSquare.addEventListener('mousedown', (e) => handleDown(e, 'sv'));
        elements.hueBar.addEventListener('mousedown', (e) => handleDown(e, 'hue'));
        elements.alphaBar.addEventListener('mousedown', (e) => handleDown(e, 'alpha'));

        // Mode Switch
        elements.modeBtn.addEventListener('click', () => {
            const idx = this.modes.indexOf(this.state.mode);
            const next = this.modes[(idx + 1) % this.modes.length];
            this.state.mode = next;
            this.update();
            if (window.projectModel) window.projectModel.updateSetting('color', this.state, false);
        });

        // Input Changes (Delegation)
        elements.fieldsContainer.addEventListener('change', (e) => {
            if (e.target.tagName === 'INPUT') {
                this._handleTextInput(e.target);
                if (window.projectModel) window.projectModel.updateSetting('color', this.state, false);
            }
        });

        // Recent Colors Click & Keyboard
        elements.recentColors.addEventListener('click', (e) => {
            const item = e.target.closest('.recent-colors__item');
            if (item && item.dataset.hex8) {
                this._applyRecentColor(item.dataset.hex8);
                if (window.projectModel) window.projectModel.updateSetting('color', this.state, false);
            }
        });
        
        elements.recentColors.addEventListener('keydown', (e) => {
            const item = e.target.closest('.recent-colors__item');
            if (e.key === 'Enter' || e.key === ' ') {
                if (item && item.dataset.hex8) {
                    e.preventDefault();
                    this._applyRecentColor(item.dataset.hex8);
                    if (window.projectModel) window.projectModel.updateSetting('color', this.state, false);
                }
            }
        });

        // Context Menu (Right Click) - Copy Color Code
        const handleContextMenu = (e, colorState) => {
            e.preventDefault();
            e.stopPropagation();
            
            const { r, g, b, a } = colorState || ColorUtils.hslToRgb(this.state.h, this.state.s, this.state.l);
            const alpha = colorState ? colorState.a : this.state.a;
            
            const code = this._getColorString(r, g, b, alpha, this.state.mode);
            
            if (code) {
                navigator.clipboard.writeText(code).then(() => {
                    // Optional: Show feedback
                    if (window.ToolMessageCenter?.success) {
                        window.ToolMessageCenter.success(`Copied: ${code}`);
                    }
                }).catch(err => console.error('Failed to copy:', err));
            }
        };

        // 1. Mode Button
        elements.modeBtn.addEventListener('contextmenu', (e) => handleContextMenu(e));

        // 2. SV Square (Current Color)
        elements.svSquare.addEventListener('contextmenu', (e) => handleContextMenu(e));

        // 3. Recent Colors
        elements.recentColors.addEventListener('contextmenu', (e) => {
            const item = e.target.closest('.recent-colors__item');
            if (item && item.dataset.hex8) {
                // Find the color in recent list to get exact values
                const color = this.state.recentColors.find(c => c.hex8 === item.dataset.hex8);
                if (color) {
                    handleContextMenu(e, color);
                }
            }
        });
    }

    _getColorString(r, g, b, a, mode) {
        switch (mode) {
            case 'HEXA':
                return ColorUtils.rgbaToHex8(r, g, b, a);
            case 'RGBA':
                return ColorUtils.toRgbaString(r, g, b, a);
            case 'HSLA':
                const hsl = ColorUtils.rgbToHsl(r, g, b);
                return ColorUtils.toHslaString(hsl.h, hsl.s, hsl.l, a);
            case 'HSVA':
                const hsv = ColorUtils.rgbToHsv(r, g, b);
                return ColorUtils.toHsvaString(hsv.h, hsv.s, hsv.v, a);
            default:
                return '';
        }
    }

    _handleTextInput(input) {
        const type = input.dataset.type;
        const val = input.value.trim();
        const num = parseFloat(val);
        
        switch (this.state.mode) {
            case 'HEXA':
                this._handleHexInput();
                break;
            case 'RGBA':
                this._handleRgbInput(type, num);
                break;
            case 'HSLA':
                this._handleHslInput(type, num);
                break;
            case 'HSVA':
                this._handleHsvInput(type, num);
                break;
        }

        this.update();
        this._addToRecent();
        this._dispatchChange();
    }

    _handleHexInput() {
        const inputs = this.view.elements.inputs;
        const rr = inputs[0].value.padStart(2, '0');
        const gg = inputs[1].value.padStart(2, '0');
        const bb = inputs[2].value.padStart(2, '0');
        const aa = inputs[3].value.padStart(2, '0');
        
        const r = parseInt(rr, 16);
        const g = parseInt(gg, 16);
        const b = parseInt(bb, 16);
        const a = parseInt(aa, 16) / 255;
        
        if (!isNaN(r) && !isNaN(g) && !isNaN(b) && !isNaN(a)) {
            this._setRGB(r, g, b);
            this.state.a = ColorUtils.clamp(a, 0, 1);
        }
    }

    _handleRgbInput(type, num) {
        const { r: curR, g: curG, b: curB } = ColorUtils.hslToRgb(this.state.h, this.state.s, this.state.l);
        let r = curR, g = curG, b = curB;
        
        if (type === 'r') r = num;
        if (type === 'g') g = num;
        if (type === 'b') b = num;
        if (type === 'a') this.state.a = ColorUtils.clamp(num, 0, 1);
        
        this._setRGB(ColorUtils.clamp(r, 0, 255), ColorUtils.clamp(g, 0, 255), ColorUtils.clamp(b, 0, 255));
    }

    _handleHslInput(type, num) {
        if (type === 'h') this.state.h = (num % 360 + 360) % 360;
        if (type === 's') this.state.s = ColorUtils.clamp(num / 100, 0, 1);
        if (type === 'l') this.state.l = ColorUtils.clamp(num / 100, 0, 1);
        if (type === 'a') this.state.a = ColorUtils.clamp(num, 0, 1);
    }

    _handleHsvInput(type, num) {
        const hsv = ColorUtils.hslToHsv(this.state.h, this.state.s, this.state.l);
        let h = hsv.h, s = hsv.s, v = hsv.v;
        
        if (type === 'h') h = (num % 360 + 360) % 360;
        if (type === 's') s = ColorUtils.clamp(num / 100, 0, 1);
        if (type === 'v') v = ColorUtils.clamp(num / 100, 0, 1);
        if (type === 'a') this.state.a = ColorUtils.clamp(num, 0, 1);
        
        const hsl = ColorUtils.hsvToHsl(h, s, v);
        this.state.h = hsl.h;
        this.state.s = hsl.s;
        this.state.l = hsl.l;
    }

    _setRGB(r, g, b) {
        const hsl = ColorUtils.rgbToHsl(r, g, b);
        this.state.h = hsl.h;
        this.state.s = hsl.s;
        this.state.l = hsl.l;
    }

    _addToRecent() {
        const { r, g, b } = ColorUtils.hslToRgb(this.state.h, this.state.s, this.state.l);
        const hex8 = ColorUtils.rgbaToHex8(r, g, b, this.state.a);
        const rgba = `rgba(${r},${g},${b},${this.state.a})`;

        // Deduplicate
        this.state.recentColors = this.state.recentColors.filter(c => c.hex8 !== hex8);
        
        // Add to front
        this.state.recentColors.unshift({
            hex8, rgba, r, g, b, a: this.state.a
        });

        // Limit to 10
        if (this.state.recentColors.length > 10) {
            this.state.recentColors.length = 10;
        }

        this.update();
    }

    _applyRecentColor(hex8) {
        const color = this.state.recentColors.find(c => c.hex8 === hex8);
        if (color) {
            const hsl = ColorUtils.rgbToHsl(color.r, color.g, color.b);
            this.state.h = hsl.h;
            this.state.s = hsl.s;
            this.state.l = hsl.l;
            this.state.a = color.a;
            this.update();
            this._dispatchChange();
        }
    }

    _handleInput(e) {
        const { clientX, clientY } = e;
        const elements = this.view.elements;
        
        if (this.isDragging === 'sv') {
            const rect = elements.svSquare.getBoundingClientRect();
            const x = ColorUtils.clamp((clientX - rect.left) / rect.width, 0, 1);
            const y = ColorUtils.clamp((clientY - rect.top) / rect.height, 0, 1);
            
            if (this.state.mode === 'HSLA') {
                this.state.s = x;
                this.state.l = 1 - y;
            } else {
                // HSV Interaction Model
                const s_hsv = x;
                const v_hsv = 1 - y;
                const hsl = ColorUtils.hsvToHsl(this.state.h, s_hsv, v_hsv);
                
                this.state.s = hsl.s;
                this.state.l = hsl.l;
            }
        } else if (this.isDragging === 'hue') {
            const rect = elements.hueBar.getBoundingClientRect();
            const x = ColorUtils.clamp((clientX - rect.left) / rect.width, 0, 1);
            this.state.h = x * 360;
        } else if (this.isDragging === 'alpha') {
            const rect = elements.alphaBar.getBoundingClientRect();
            const x = ColorUtils.clamp((clientX - rect.left) / rect.width, 0, 1);
            this.state.a = x;
        }

        this.update();
        if (window.projectModel) window.projectModel.updateSetting('color', this.state, true);
        this._dispatchChange();
    }

    _dispatchChange() {
        const { h, s, l, a, mode } = this.state;
        const { r, g, b } = ColorUtils.hslToRgb(h, s, l);
        const hsv = ColorUtils.hslToHsv(h, s, l);
        const hex = ColorUtils.rgbToHex(r, g, b);
        const hex8 = ColorUtils.rgbaToHex8(r, g, b, a);
        const rgba = `rgba(${r},${g},${b},${a.toFixed(3)})`;

        const detail = {
            mode,
            h, s, l,
            v: hsv.v,
            a,
            r, g, b,
            hex, hex8, rgba
        };

        const event = new CustomEvent('colorchange', { detail });
        this.view.getContainer().dispatchEvent(event);
        
        // Optional: Dispatch to window if needed globally
        // window.dispatchEvent(new CustomEvent('global-color-change', { detail }));
    }
}
