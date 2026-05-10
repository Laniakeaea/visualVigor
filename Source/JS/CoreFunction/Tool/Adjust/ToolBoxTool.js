
import { ToolUtils } from '../ToolUtils.js';

export class ToolBoxTool {
    constructor() {
        this.id = 'toolAdjustToolBox';
        this.options = { 
            mode: 'none', // none, binary, edge
            threshold: 128 // 0-255 for Binary
        };
        this.filterId = 'svg-filter-toolbox';
        
        // Define options UI metadata for InfoBar to auto-generate controls
        // This relies on the ToolManager/InfoBar reading this.optionsConfig if implemented
        // Or specific handling in InfoBarController.
        this.uiConfig = {
            mode: { type: 'select', options: ['none', 'binary', 'edge'], label: 'Effect' },
            threshold: { type: 'slider', min: 0, max: 255, label: 'Threshold', visibleWhen: { mode: 'binary' } }
        };
        
        this.ensureFilterExists();
    }

    activate() {
        this.ensureFilterExists();
        this.updateFilter();
    }

    deactivate() {
        // Keeps the filter active visually
    }

    onOptionChanged(key, value) {
        if (key === 'mode') {
            this.options.mode = value;
            // Update UI visibility if the system supported it, but mainly update filter
            // Trigger UI refresh?
            window.dispatchEvent(new CustomEvent('toolOptionsUpdated', { detail: this.id }));
        } else if (key === 'threshold') {
            this.options.threshold = parseInt(value);
        }
        
        this.updateFilter();
    }

    ensureFilterExists() {
        if (document.getElementById(this.filterId)) return;

        const svgNS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(svgNS, "svg");
        svg.style.position = 'absolute';
        svg.style.width = '0';
        svg.style.height = '0';
        svg.style.pointerEvents = 'none';

        const filter = document.createElementNS(svgNS, "filter");
        filter.setAttribute("id", this.filterId);
        filter.setAttribute("color-interpolation-filters", "sRGB");
        
        svg.appendChild(filter);
        document.body.appendChild(svg);
    }

    updateFilter() {
        const filter = document.getElementById(this.filterId);
        if (!filter) return;
        
        // Clear existing primitives
        while (filter.firstChild) {
            filter.removeChild(filter.firstChild);
        }

        const mode = this.options.mode;
        const svgNS = "http://www.w3.org/2000/svg";

        if (mode === 'none') {
            // Remove filter from view
            if (window.layoutController && window.layoutController.workspaceView) {
                // Use 'url' key to clear it
                window.layoutController.workspaceView.setViewFilter(1, 'url', null);
            }
            return;
        }

        if (mode === 'binary') {
            // 1. Grayscale
            const feColorMatrix = document.createElementNS(svgNS, "feColorMatrix");
            feColorMatrix.setAttribute("type", "matrix");
            // Luminance weights
            feColorMatrix.setAttribute("values", `
                0.2126 0.7152 0.0722 0 0
                0.2126 0.7152 0.0722 0 0
                0.2126 0.7152 0.0722 0 0
                0      0      0      1 0
            `);
            feColorMatrix.setAttribute("result", "gray");
            filter.appendChild(feColorMatrix);

            // 2. Threshold via ComponentTransfer
            // Normalize threshold 0-255 to 0-1
            const th = this.options.threshold / 255;
            
            // We want step function: x < th ? 0 : 1
            // feFunc tableValues. 
            // discrete: maps equal chunks of input to values.
            // linear: interpolates.
            // discrete with 2 values splits at 0.5. Not adjustable?
            // "table" mode with tableValues="0 0 1 1"?
            // Using "discrete" with calculated values is tricky for variable threshold.
            
            // Better approach: Slope hack.
            // slope = 255, intercept = -(threshold * 255)
            // val = input * slope + intercept
            // result clamped 0-1.
            // effectively binarizes around threshold.
            
            const feComponentTransfer = document.createElementNS(svgNS, "feComponentTransfer");
            const feFuncR = document.createElementNS(svgNS, "feFuncR");
            const feFuncG = document.createElementNS(svgNS, "feFuncG");
            const feFuncB = document.createElementNS(svgNS, "feFuncB");
            
            // slope steepness defines hardness.
            const k = 1000; // very steep slope
            const intercept = 0.5 - (k * th); 
            // output = k*input + intercept
            // if input = th: k*th + 0.5 - k*th = 0.5
            // wait, usually linear func: type="linear" slope="k" intercept="b"
            // We want transition at th.
            // x < th -> < 0
            // x > th -> > 1
            // 0.5 at th.
            
            // Actually, simplified:
            // Input < Threshold -> 0
            // Input >= Threshold -> 1
            
            // Let's use `step` implementation via tableValues if possible or linear high contrast.
            // Using logic: if (val - th) * huge > 0
            
            // Standard SVG Binarization hack:
            // 1. Subtract Threshold from all channels
            // 2. Multiply by huge number
            // 3. Add 0.5 (optional)
            
            // Let's try separate component transfer
            // type="linear" slope="255" intercept="-(threshold * 255) + 128?"
            // Actually, if we just use a discrete transfer with TWO values, it splits at 0.5 input.
            // So we can shift the color values FIRST so that the desired threshold moves to 0.5.
            
            // Shift step: (val + (0.5 - th))
            // But values clamp.
            
            // Let's stick to the high contrast slope.
            // slope = 200, intercept = 0.5 - (200 * th)
            const slope = 255;
            const shift = 0.5 - (slope * th);

            const setLinear = (el) => {
                el.setAttribute("type", "linear");
                el.setAttribute("slope", slope);
                el.setAttribute("intercept", shift);
            };
            
            setLinear(feFuncR);
            setLinear(feFuncG);
            setLinear(feFuncB);

            feComponentTransfer.appendChild(feFuncR);
            feComponentTransfer.appendChild(feFuncG);
            feComponentTransfer.appendChild(feFuncB);
            
            // Need to apply to 'gray' result
            feComponentTransfer.setAttribute("in", "gray");
            
            filter.appendChild(feComponentTransfer);
        }

        if (mode === 'edge') {
             // Sobel Edge Detection
             // Convolve Matrix
             //  -1 -2 -1
             //   0  0  0
             //   1  2  1 
             // etc.
             
             // Simple Laplacian Edge:
             // -1 -1 -1
             // -1  8 -1
             // -1 -1 -1
             
             const feConvolve = document.createElementNS(svgNS, "feConvolveMatrix");
             feConvolve.setAttribute("order", "3");
             feConvolve.setAttribute("kernelMatrix", "-1 -1 -1 -1 8 -1 -1 -1 -1");
             feConvolve.setAttribute("preserveAlpha", "true");
             
             filter.appendChild(feConvolve);
             
             // Often edge detection results in dark image with white edges.
             // Maybe invert or grayscale?
             // Usually want white edges on black background.
             
             // Ideally we grayscale first
             const feColorMatrix = document.createElementNS(svgNS, "feColorMatrix");
             feColorMatrix.setAttribute("type", "matrix");
             feColorMatrix.setAttribute("values", "0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0 0 0 1 0");
             feColorMatrix.setAttribute("result", "gray");
             
             // Reorder: Gray -> Convolve
             filter.insertBefore(feColorMatrix, feConvolve);
             feConvolve.setAttribute("in", "gray");
        }
        
        // Apply
        if (window.layoutController && window.layoutController.workspaceView) {
            // Use 'url' key to override any active filter from Temperature/Curves.
            // WorkspaceView constructs "key(value)" so we pass the id with hash.
            window.layoutController.workspaceView.setViewFilter(1, 'url', `#${this.filterId}`);
        }
    }
}
