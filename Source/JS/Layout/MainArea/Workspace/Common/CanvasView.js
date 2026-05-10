/* =========================================
   Canvas View
   ========================================= */

export class CanvasView {
    /**
     * @param {HTMLElement} container - The parent element for the canvas.
     * @param {Object} options - Optional settings.
     * @param {boolean} options.transparent - If true, pointer-events: none.
     * @param {string} options.zIndex - CSS z-index.
     */
    constructor(container, options = {}) {
        this.container = container;
        this.canvas = document.createElement('canvas');
        
        // Default Styles
        this.canvas.style.display = 'block';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        
        if (options.transparent) {
            this.canvas.style.position = 'absolute';
            this.canvas.style.top = '0';
            this.canvas.style.left = '0';
            this.canvas.style.pointerEvents = 'none';
        }
        
        if (options.zIndex) {
            this.canvas.style.zIndex = options.zIndex;
        }

        this.container.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');

        // Lifecycle Observers
        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(this.container);
        
        this.themeHandler = () => this.draw();
        window.addEventListener('themeChanged', this.themeHandler);
        
        // Initial sizing
        // We use requestAnimationFrame to ensure container has layout
        requestAnimationFrame(() => this.resize());
    }

    /**
     * Handles resizing and DPI scaling.
     * Automatically calls draw().
     */
    resize() {
        const rect = this.container.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;

        const dpr = window.devicePixelRatio || 1;
        
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        
        // Reset transform matrix to handle DPI
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.scale(dpr, dpr);
        
        this.draw();
    }

    /**
     * Abstract method to implement drawing logic.
     */
    draw() {
        // To be implemented by subclass
    }

    /**
     * Clears the canvas and returns logical dimensions.
     * @returns {Object} { width, height } in logical pixels.
     */
    clear() {
        const dpr = window.devicePixelRatio || 1;
        const width = this.canvas.width / dpr;
        const height = this.canvas.height / dpr;
        this.ctx.clearRect(0, 0, width, height);
        return { width, height };
    }

    /**
     * Helper to get a CSS variable color.
     * @param {string} varName - e.g., '--color-accent-100'
     * @returns {string}
     */
    getThemeColor(varName) {
        const style = getComputedStyle(this.container);
        return style.getPropertyValue(varName).trim();
    }

    /**
     * Calculates the nearest "nice" step size for grids and rulers.
     * @param {number} desiredMajorPx - Target pixel distance for major ticks (e.g., 100px).
     * @param {number} scale - Current zoom scale.
     * @returns {number} The calculated step size in logical units.
     */
    getNiceStep(desiredMajorPx, scale) {
        const logicalDesiredStep = desiredMajorPx / scale;
        
        const power = Math.pow(10, Math.floor(Math.log10(logicalDesiredStep)));
        const fraction = logicalDesiredStep / power;

        let niceFraction;
        if (fraction < 1.5) niceFraction = 1;
        else if (fraction < 3.5) niceFraction = 2;
        else if (fraction < 7.5) niceFraction = 5;
        else niceFraction = 10;

        return niceFraction * power;
    }

    /**
     * Cleanup listeners.
     */
    dispose() {
        this.resizeObserver.disconnect();
        window.removeEventListener('themeChanged', this.themeHandler);
        this.canvas.remove();
    }
}
