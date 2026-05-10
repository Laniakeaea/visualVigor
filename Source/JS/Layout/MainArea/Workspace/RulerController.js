import { CanvasView } from './Common/CanvasView.js';

/* =========================================
   Ruler Controller
   ========================================= */

export class RulerController {
    /**
     * @param {HTMLElement} hContainer - Container for the horizontal ruler.
     * @param {HTMLElement} vContainer - Container for the vertical ruler.
     */
    constructor(hContainer, vContainer) {
        // Use CanvasView for canvas management
        this.hView = new CanvasView(hContainer);
        this.vView = new CanvasView(vContainer);

        // Override draw methods
        this.hView.draw = () => this._drawRuler(this.hView, true);
        this.vView.draw = () => this._drawRuler(this.vView, false);

        // State
        this.scale = 1;
        this.offsetX = 0;
        this.offsetY = 0;

        // Configuration
        this.fontString = '16px "Ubuntu", "HarmonyOS Sans", sans-serif'; 
        
        // Interaction State
        this.overlayController = null;
        this.isDragging = false;
        this.dragAxis = null; // 'x' or 'y'

        // Indicator State
        this.indicatorVisible = false;
        this._bindIndicatorEvents();

        this._initInteraction();
    }

    _bindIndicatorEvents() {
        const redraw = () => {
            if (this.indicatorVisible) {
                this.hView.draw();
                this.vView.draw();
            }
        };
        // Listen to selection and modification events
        window.addEventListener('elementsSelected', redraw);
        window.addEventListener('canvasSelectionChanged', redraw);
        window.addEventListener('vv-vector-modifying', redraw); 
        window.addEventListener('projectInputChanged', redraw);
    }

    setIndicatorVisible(visible) {
        this.indicatorVisible = visible;
        this.hView.draw();
        this.vView.draw();
    }

    setOverlayController(controller) {
        this.overlayController = controller;
    }

    _initInteraction() {
        // Mouse Down on Rulers
        // Top ruler (Horizontal) -> Dragging down creates a Horizontal Guide (Y-axis)
        this.hView.canvas.addEventListener('mousedown', (e) => this._handleMouseDown(e, 'y')); 
        // Left ruler (Vertical) -> Dragging right creates a Vertical Guide (X-axis)
        this.vView.canvas.addEventListener('mousedown', (e) => this._handleMouseDown(e, 'x')); 

        // Global Mouse Events
        window.addEventListener('mousemove', (e) => this._handleMouseMove(e));
        window.addEventListener('mouseup', (e) => this._handleMouseUp(e));
    }

    _handleMouseDown(e, axis) {
        if (!this.overlayController) return;
        // Only Left Click
        if (e.button !== 0) return;
        
        e.preventDefault();
        this.isDragging = true;
        this.dragAxis = axis;
        
        // Set Cursor
        document.body.style.cursor = axis === 'x' ? 'col-resize' : 'row-resize';

        // Initial update
        this._updateDrag(e);
    }

    _handleMouseMove(e) {
        if (!this.isDragging) return;
        e.preventDefault();
        this._updateDrag(e);
    }

    _handleMouseUp(e) {
        if (!this.isDragging) return;
        this.isDragging = false;
        document.body.style.cursor = ''; // Reset cursor
        
        // Check if dropped back onto the ruler (negative screen position)
        const viewportRect = this.overlayController.container.getBoundingClientRect();
        let isCancel = false;
        
        if (this.dragAxis === 'x') {
            if (e.clientX < viewportRect.left) isCancel = true;
        } else {
            if (e.clientY < viewportRect.top) isCancel = true;
        }

        // Commit Guide
        if (window.projectModel && !isCancel) {
            let pos = this._getLogicalPos(e);
            pos = Math.round(pos);
            window.projectModel.addGuide(this.dragAxis, pos);
        }

        // Clear Ghost
        if (this.overlayController) {
            this.overlayController.clearDragGuide();
        }
        this.dragAxis = null;
    }

    _computeSelectionAABB() {
         if (!window.toolSystem || !window.toolSystem.activeTool) return null;
         const tool = window.toolSystem.activeTool;
         
         if (tool.id !== 'toolVectorSelect' || !tool.selectedItems || tool.selectedItems.size === 0) return null;
         
         let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
         
         for (const [id, data] of tool.selectedItems) {
             const item = data.item; 
             if (item && item.bounds) {
                 minX = Math.min(minX, item.bounds.x);
                 minY = Math.min(minY, item.bounds.y);
                 maxX = Math.max(maxX, item.bounds.x + item.bounds.width);
                 maxY = Math.max(maxY, item.bounds.y + item.bounds.height);
             }
         }
         
         if (minX === Infinity) return null;
         
         return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    }

    _updateDrag(e) {
        if (!this.overlayController) return;
        let pos = this._getLogicalPos(e);
        pos = Math.round(pos);
        
        // Calculate cross position for dimension display
        // When dragging from ruler, the mouse position on the cross axis is relevant
        const viewportRect = this.overlayController.container.getBoundingClientRect();
        const crossPos = this.dragAxis === 'x' ? (e.clientY - viewportRect.top) : (e.clientX - viewportRect.left);
        
        this.overlayController.setDragGuide(this.dragAxis, pos, crossPos);
    }

    _getLogicalPos(e) {
        // We need the viewport rect to calculate relative position
        const viewportRect = this.overlayController.container.getBoundingClientRect();
        
        let screenPos;
        if (this.dragAxis === 'x') {
            // Vertical Guide (X axis): Position is relative to viewport left
            screenPos = e.clientX - viewportRect.left;
            return (screenPos - this.offsetX) / this.scale;
        } else {
            // Horizontal Guide (Y axis): Position is relative to viewport top
            screenPos = e.clientY - viewportRect.top;
            return (screenPos - this.offsetY) / this.scale;
        }
    }

    /**
     * Updates the ruler based on camera transform.
     * @param {number} scale - Current zoom level.
     * @param {number} x - Current pan X (translation).
     * @param {number} y - Current pan Y (translation).
     */
    update(scale, x, y) {
        this.scale = scale;
        this.offsetX = x;
        this.offsetY = y;
        this.hView.draw();
        this.vView.draw();
    }

    /**
     * Internal method to draw a single ruler.
     * @param {CanvasView} view 
     * @param {boolean} isHorizontal 
     */
    _drawRuler(view, isHorizontal) {
        const { width, height } = view.clear();
        const ctx = view.ctx;

        // Draw Indicator (if enabled)
        if (this.indicatorVisible) {
             const bbox = this._computeSelectionAABB();
             if (bbox) {
                 const color = view.getThemeColor('--color-orange-100') || '#ff9000';
                 ctx.save();
                 ctx.fillStyle = color;

                 // Check if tool is modifying (drag, rotate, scale)
                 if (window.toolSystem && window.toolSystem.activeTool) {
                     const mode = window.toolSystem.activeTool.mode;
                     if (mode === 'drag' || mode === 'rotate' || mode === 'scale') {
                         ctx.globalAlpha = 0.4; // Low opacity during modification
                     }
                 }
                 
                 const indicatorSize = 4;
                 const start = isHorizontal ? bbox.x : bbox.y;
                 const length = isHorizontal ? bbox.width : bbox.height;
                 
                 const screenStart = (start * this.scale) + (isHorizontal ? this.offsetX : this.offsetY);
                 const screenLen = length * this.scale;
                 const screenEnd = screenStart + screenLen;
                 
                 const viewLength = isHorizontal ? width : height;

                 if (isHorizontal) {
                     // Top Ruler
                     ctx.fillRect(screenStart, height - indicatorSize, screenLen, indicatorSize);
                     
                     // Out of bounds hints
                     // Ensure arrows are solid / or check if they should be transparent too? 
                     // Usually hints should be visible, but matching opacity is consistent.
                     ctx.fillStyle = color; 
                     if (screenEnd < 0) {
                         // Arrow Pointing Left at left edge
                         ctx.beginPath();
                         ctx.moveTo(0, height - indicatorSize);
                         ctx.lineTo(6, height - indicatorSize - 4);
                         ctx.lineTo(6, height - indicatorSize + 4);
                         ctx.fill();
                     } else if (screenStart > viewLength) {
                         // Arrow Pointing Right at right edge
                         ctx.beginPath();
                         ctx.moveTo(viewLength, height - indicatorSize);
                         ctx.lineTo(viewLength - 6, height - indicatorSize - 4);
                         ctx.lineTo(viewLength - 6, height - indicatorSize + 4);
                         ctx.fill();
                     }
                 } else {
                     // Left Ruler
                     ctx.fillRect(width - indicatorSize, screenStart, indicatorSize, screenLen);
                     
                      // Out of bounds hints
                     if (screenEnd < 0) {
                         // Arrow Pointing Up at top edge
                         ctx.beginPath();
                         ctx.moveTo(width - indicatorSize, 0);
                         ctx.lineTo(width - indicatorSize - 4, 6);
                         ctx.lineTo(width - indicatorSize + 4, 6);
                         ctx.fill();
                     } else if (screenStart > viewLength) {
                         // Arrow Pointing Down at bottom edge
                         ctx.beginPath();
                         ctx.moveTo(width - indicatorSize, viewLength);
                         ctx.lineTo(width - indicatorSize - 4, viewLength - 6);
                         ctx.lineTo(width - indicatorSize + 4, viewLength - 6);
                         ctx.fill();
                     }
                 }
                 ctx.restore();
             }
        }
        
        // Get Colors
        const colorFont = view.getThemeColor('--color-font');
        const colorMajor = view.getThemeColor('--color-accent-50');
        const colorMinor = view.getThemeColor('--color-accent-20');

        // Settings
        ctx.font = this.fontString;
        ctx.lineWidth = 1;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top'; // Unified baseline

        const textPaddingAlong = 4;
        const textPaddingCross = 2;

        // Calculate step
        // Use shared helper from CanvasView (via this.hView or this.vView)
        // Since RulerController wraps CanvasView, we need to access it through one of the views or duplicate the logic.
        // Actually, RulerController does NOT extend CanvasView. It HAS CanvasViews.
        // So we should use this.hView.getNiceStep(...)
        const step = this.hView.getNiceStep(100, this.scale);
        
        // Adaptive Subdivision (Match Grid Logic)
        let subStep;
        if (step <= 2) {
            subStep = 1; 
        } else if (step <= 10) {
            subStep = 1; 
        } else {
            subStep = step / 5;
        }
        
        // Start and End in logical coordinates
        const startPos = isHorizontal ? -this.offsetX / this.scale : -this.offsetY / this.scale;
        const viewLength = isHorizontal ? width : height;
        const endPos = startPos + viewLength / this.scale;

        // Find the first multiple of step >= startPos
        const firstTick = Math.floor(startPos / step) * step;

        // Tick Sizes
        const rulerSize = isHorizontal ? height : width;
        const majorTickLen = rulerSize * 0.6;
        const minorTickLen = rulerSize * 0.3;

        // --- Pass 1: Minor Ticks ---
        ctx.beginPath();
        ctx.strokeStyle = colorMinor;

        for (let val = firstTick; val <= endPos + step; val += step) {
            const count = Math.round(step / subStep);
            for (let i = 1; i < count; i++) {
                const subVal = val + (subStep * i);
                const subScreenPos = (subVal * this.scale) + (isHorizontal ? this.offsetX : this.offsetY);
                const subPos = Math.round(subScreenPos) + 0.5;
                
                if (isHorizontal) {
                    ctx.moveTo(subPos, height);
                    ctx.lineTo(subPos, height - minorTickLen);
                } else {
                    ctx.moveTo(width, subPos);
                    ctx.lineTo(width - minorTickLen, subPos);
                }
            }
        }
        ctx.stroke();

        // --- Pass 2: Major Ticks ---
        ctx.beginPath();
        ctx.strokeStyle = colorMajor;

        for (let val = firstTick; val <= endPos + step; val += step) {
            // Major Tick Position
            const screenPos = (val * this.scale) + (isHorizontal ? this.offsetX : this.offsetY);
            const pos = Math.round(screenPos) + 0.5; 

            // Draw Major Tick
            if (isHorizontal) {
                ctx.moveTo(pos, height);
                ctx.lineTo(pos, height - majorTickLen);
            } else {
                ctx.moveTo(width, pos);
                ctx.lineTo(width - majorTickLen, pos);
            }
        }
        ctx.stroke();

        // --- Pass 3: Text ---
        ctx.fillStyle = colorFont;
        for (let val = firstTick; val <= endPos + step; val += step) {
            const screenPos = (val * this.scale) + (isHorizontal ? this.offsetX : this.offsetY);
            const pos = Math.round(screenPos) + 0.5; 

            if (isHorizontal) {
                ctx.fillText(Math.round(val).toString(), pos + textPaddingAlong, textPaddingCross);
            } else {
                ctx.save();
                ctx.translate(textPaddingCross, pos - textPaddingAlong);
                ctx.rotate(-Math.PI / 2);
                ctx.fillText(Math.round(val).toString(), 0, 0); 
                ctx.restore();
            }
        }
    }
}
