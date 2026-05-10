/* =========================================
   Camera Controller
   ========================================= */

export class CameraController {
    /**
     * @param {HTMLElement} viewport - The container element (overflow hidden).
     * @param {HTMLElement} content - The content element to be transformed (canvas/layers).
     * @param {Object} options - Optional configuration.
     */
    constructor(viewport, content, options = {}) {
        this.viewport = viewport;
        this.content = content;

        // State
        this.scale = 1;
        this.position = { x: 0, y: 0 };
        
        // Configuration
        this.minScale = options.minScale !== undefined ? options.minScale : 0.1;
        this.maxScale = options.maxScale !== undefined ? options.maxScale : 50;
        this.zoomSensitivity = options.zoomSensitivity !== undefined ? options.zoomSensitivity : 0.001;
        
        // Drag State
        this.isDragging = false;
        this.lastMousePos = { x: 0, y: 0 };

        // Callbacks
        this.onTransformChange = options.onTransformChange !== undefined ? options.onTransformChange : null;

        this._initEvents();
        this.updateTransform();
    }

    _initEvents() {
        // Wheel Zoom
        this.viewport.addEventListener('wheel', (e) => this._handleWheel(e), { passive: false });

        // Panning (Middle Mouse or Space+Left)
        this.viewport.addEventListener('mousedown', (e) => this._handleMouseDown(e));
        window.addEventListener('mousemove', (e) => this._handleMouseMove(e));
        window.addEventListener('mouseup', (e) => this._handleMouseUp(e));
    }

    /**
     * Handles mouse wheel events for zooming.
     * Zooms towards the mouse cursor position.
     */
    _handleWheel(e) {
        e.preventDefault();

        // Calculate zoom factor
        // Negative deltaY means scrolling up (zooming in)
        const delta = -e.deltaY;
        const zoomFactor = Math.exp(delta * this.zoomSensitivity);

        // Calculate new scale clamped to limits
        const newScale = Math.min(Math.max(this.scale * zoomFactor, this.minScale), this.maxScale);
        
        // Calculate mouse position relative to the content's current transform
        const rect = this.viewport.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Adjust position to zoom towards mouse
        // Formula: newPos = mouse - (mouse - oldPos) * (newScale / oldScale)
        this.position.x = mouseX - (mouseX - this.position.x) * (newScale / this.scale);
        this.position.y = mouseY - (mouseY - this.position.y) * (newScale / this.scale);

        this.scale = newScale;
        this.updateTransform();
    }

    _handleMouseDown(e) {
        // Middle Mouse Button (1) or Spacebar held (handled by tool manager usually, but here we check generic)
        // For now, let's enable pan on Middle Click
        if (e.button === 1 || (e.button === 0 && e.altKey)) { // Middle click or Alt+Left
            this.isDragging = true;
            this.lastMousePos = { x: e.clientX, y: e.clientY };
            this.viewport.style.cursor = 'grabbing';
            e.preventDefault();
        }
    }

    _handleMouseMove(e) {
        if (!this.isDragging) return;

        const dx = e.clientX - this.lastMousePos.x;
        const dy = e.clientY - this.lastMousePos.y;

        this.position.x += dx;
        this.position.y += dy;

        this.lastMousePos = { x: e.clientX, y: e.clientY };
        this.updateTransform();
    }

    _handleMouseUp(e) {
        if (this.isDragging) {
            this.isDragging = false;
            this.viewport.style.cursor = ''; // Revert to default (or let tool manager handle it)
        }
    }

    /**
     * Applies the current transform to the content element.
     */
    updateTransform() {
        // Use CSS Transform
        // translate3d for hardware acceleration
        this.content.style.transform = `translate3d(${this.position.x}px, ${this.position.y}px, 0) scale(${this.scale})`;
        this.content.style.transformOrigin = '0 0'; // Important: Transform from top-left

        // Notify listeners (e.g., Rulers, Grid)
        if (this.onTransformChange) {
            this.onTransformChange({
                scale: this.scale,
                x: this.position.x,
                y: this.position.y
            }, this);
        }
    }

    /**
     * Resets the view to center the content or fit to screen.
     * @param {number} scale 
     * @param {number} x 
     * @param {number} y 
     */
    setTransform(scale, x, y) {
        this.scale = scale;
        this.position.x = x;
        this.position.y = y;
        this.updateTransform();
    }

    /**
     * Fits the specified rectangle within the viewport.
     * @param {Object} rect - { x, y, width, height } of the content area to fit.
     * @param {number} padding - Padding in pixels.
     */
    fitRect(rect, padding = 50) {
        const viewportRect = this.viewport.getBoundingClientRect();
        if (viewportRect.width === 0 || viewportRect.height === 0) return;

        const availableWidth = viewportRect.width - padding * 2;
        const availableHeight = viewportRect.height - padding * 2;

        const scaleX = availableWidth / rect.width;
        const scaleY = availableHeight / rect.height;
        
        // Calculate scale, clamped to limits
        let newScale = Math.min(scaleX, scaleY);
        newScale = Math.min(Math.max(newScale, this.minScale), this.maxScale);

        this.scale = newScale;
        
        // Calculate center of the target rect in content space
        const contentCenterX = rect.x + rect.width / 2;
        const contentCenterY = rect.y + rect.height / 2;

        // Calculate center of the viewport
        const viewportCenterX = viewportRect.width / 2;
        const viewportCenterY = viewportRect.height / 2;

        // Calculate translation to align centers
        // formula: translate = viewportCenter - (contentCenter * scale)
        this.position.x = viewportCenterX - (contentCenterX * newScale);
        this.position.y = viewportCenterY - (contentCenterY * newScale);

        this.updateTransform();
    }

    /**
     * Legacy support or simple usage.
     * Fits a rect at (0,0) with given dimensions.
     */
    fitToScreen(contentWidth, contentHeight, padding = 50) {
        this.fitRect({ x: 0, y: 0, width: contentWidth, height: contentHeight }, padding);
    }

    /**
     * Programmatic Zoom In (Center)
     */
    zoomIn(factor = 1.2) {
        this._zoomCenter(factor);
    }

    /**
     * Programmatic Zoom Out (Center)
     */
    zoomOut(factor = 0.8) { // 1 / 1.2 ~= 0.833
        this._zoomCenter(1 / 1.2);
    }

    _zoomCenter(factor) {
        const newScale = Math.min(Math.max(this.scale * factor, this.minScale), this.maxScale);
        
        // Zoom relative to viewport center
        const rect = this.viewport.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        this.position.x = centerX - (centerX - this.position.x) * (newScale / this.scale);
        this.position.y = centerY - (centerY - this.position.y) * (newScale / this.scale);

        this.scale = newScale;
        this.updateTransform();
    }
}
