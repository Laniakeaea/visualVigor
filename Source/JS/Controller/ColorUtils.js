/* =========================================
   Color Utils
   ========================================= */

export class ColorUtils {
    static clamp(v, min, max) {
        return Math.min(max, Math.max(min, v));
    }

    /**
     * Converts HSL to RGB.
     * @param {number} h - Hue [0, 360)
     * @param {number} s - Saturation [0, 1]
     * @param {number} l - Lightness [0, 1]
     * @returns {Object} {r, g, b} [0, 255]
     */
    static hslToRgb(h, s, l) {
        const c = (1 - Math.abs(2 * l - 1)) * s;
        const hp = h / 60;
        const x = c * (1 - Math.abs(hp % 2 - 1));
        let r1 = 0, g1 = 0, b1 = 0;
        
        if (0 <= hp && hp < 1) [r1, g1, b1] = [c, x, 0];
        else if (1 <= hp && hp < 2) [r1, g1, b1] = [x, c, 0];
        else if (2 <= hp && hp < 3) [r1, g1, b1] = [0, c, x];
        else if (3 <= hp && hp < 4) [r1, g1, b1] = [0, x, c];
        else if (4 <= hp && hp < 5) [r1, g1, b1] = [x, 0, c];
        else if (5 <= hp && hp < 6) [r1, g1, b1] = [c, 0, x];
        
        const m = l - c / 2;
        return {
            r: Math.round((r1 + m) * 255),
            g: Math.round((g1 + m) * 255),
            b: Math.round((b1 + m) * 255)
        };
    }

    /**
     * Converts RGB to Hex string.
     * @param {number} r 
     * @param {number} g 
     * @param {number} b 
     * @returns {string} "#RRGGBB"
     */
    static rgbToHex(r, g, b) {
        const toHex = n => n.toString(16).padStart(2, '0').toUpperCase();
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }

    /**
     * Converts RGB to HSL.
     * @param {number} r [0, 255]
     * @param {number} g [0, 255]
     * @param {number} b [0, 255]
     * @returns {Object} {h, s, l}
     */
    static rgbToHsl(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h = 0, s = 0, l = (max + min) / 2;
        const d = max - min;
        
        if (d !== 0) {
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = ((g - b) / d + (g < b ? 6 : 0)); break;
                case g: h = ((b - r) / d + 2); break;
                case b: h = ((r - g) / d + 4); break;
            }
            h *= 60;
        }
        return { h: (h + 360) % 360, s, l };
    }

    /**
     * Converts HSV to RGB.
     * @param {number} h [0, 360)
     * @param {number} s [0, 1]
     * @param {number} v [0, 1]
     * @returns {Object} {r, g, b}
     */
    static hsvToRgb(h, s, v) {
        const c = v * s;
        const hp = h / 60;
        const x = c * (1 - Math.abs(hp % 2 - 1));
        let r1 = 0, g1 = 0, b1 = 0;
        
        if (0 <= hp && hp < 1) [r1, g1, b1] = [c, x, 0];
        else if (1 <= hp && hp < 2) [r1, g1, b1] = [x, c, 0];
        else if (2 <= hp && hp < 3) [r1, g1, b1] = [0, c, x];
        else if (3 <= hp && hp < 4) [r1, g1, b1] = [0, x, c];
        else if (4 <= hp && hp < 5) [r1, g1, b1] = [x, 0, c];
        else if (5 <= hp && hp < 6) [r1, g1, b1] = [c, 0, x];
        
        const m = v - c;
        return {
            r: Math.round((r1 + m) * 255),
            g: Math.round((g1 + m) * 255),
            b: Math.round((b1 + m) * 255)
        };
    }

    /**
     * Converts RGB to HSV.
     * @param {number} r 
     * @param {number} g 
     * @param {number} b 
     * @returns {Object} {h, s, v}
     */
    static rgbToHsv(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        const d = max - min;
        let h = 0;
        const v = max;
        const s = max === 0 ? 0 : d / max;
        
        if (d !== 0) {
            switch (max) {
                case r: h = ((g - b) / d + (g < b ? 6 : 0)); break;
                case g: h = ((b - r) / d + 2); break;
                case b: h = ((r - g) / d + 4); break;
            }
            h *= 60;
        }
        return { h: (h + 360) % 360, s, v };
    }

    static hslToHsv(h, s, l) {
        const { r, g, b } = this.hslToRgb(h, s, l);
        return this.rgbToHsv(r, g, b);
    }

    static hsvToHsl(h, s, v) {
        const { r, g, b } = this.hsvToRgb(h, s, v);
        return this.rgbToHsl(r, g, b);
    }

    static rgbaToHex8(r, g, b, a) {
        const toHex = n => n.toString(16).padStart(2, '0').toUpperCase();
        const alpha = Math.round(this.clamp(a, 0, 1) * 255);
        return `#${toHex(r)}${toHex(g)}${toHex(b)}${toHex(alpha)}`;
    }

    static toRgbaString(r, g, b, a) {
        return `rgba(${r}, ${g}, ${b}, ${parseFloat(a.toFixed(3))})`;
    }

    static toHslaString(h, s, l, a) {
        return `hsla(${Math.round(h)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%, ${parseFloat(a.toFixed(3))})`;
    }

    static toHsvaString(h, s, v, a) {
        return `hsva(${Math.round(h)}, ${Math.round(s * 100)}%, ${Math.round(v * 100)}%, ${parseFloat(a.toFixed(3))})`;
    }
}
