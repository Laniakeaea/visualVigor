/* =========================================
   Snap Manager
   ========================================= */

export class SnapManager {
    constructor() {
        this.tolerance = 8; // Screen pixels
        this.snapLines = []; // { x1, y1, x2, y2, type: 'grid'|'guide'|'object' }
    }

    /**
     * Calculates the snapped position for a given set of bounds.
     * @param {Object} currentBounds - { x, y, width, height, center: {x,y} }
     * @param {number} scale - Current viewport zoom scale (to adjust tolerance).
     * @param {Object} options - { grid: boolean, guides: boolean, objects: boolean, activeEdges: Array<string> }
     * @returns {Object} { dx, dy } - The adjustment delta to apply.
     */
    snap(currentBounds, scale, options = { grid: true, guides: true, objects: false }) {
        this.snapLines = [];
        const threshold = this.tolerance / scale;
        const activeEdges = options.activeEdges || ['left', 'center_x', 'right', 'top', 'center_y', 'bottom'];
        
        let dx = 0;
        let dy = 0;
        let minDx = Infinity;
        let minDy = Infinity;

        // Candidate edges from the moving selection
        const edges = {
            left: currentBounds.x,
            center_x: currentBounds.x + currentBounds.width / 2,
            right: currentBounds.x + currentBounds.width,
            top: currentBounds.y,
            center_y: currentBounds.y + currentBounds.height / 2,
            bottom: currentBounds.y + currentBounds.height
        };

        const xKeys = ['left', 'center_x', 'right'].filter(k => activeEdges.includes(k));
        const yKeys = ['top', 'center_y', 'bottom'].filter(k => activeEdges.includes(k));

        // --- 1. Grid Snapping ---
        if (options.grid) {
            // Get Grid Step (Assuming standard 10/100 logic relative to power of 10)
            const step = this._getGridStep(scale); 
            
            // X-Axis Snap
            xKeys.forEach(key => {
                const val = edges[key];
                const nearest = Math.round(val / step) * step;
                const diff = nearest - val;
                if (Math.abs(diff) < threshold && Math.abs(diff) < Math.abs(minDx)) {
                    minDx = diff;
                    this._addSnapLine('x', nearest, currentBounds); // Note: Visual might need update to point to specific edge?
                }
            });

            // Y-Axis Snap
            yKeys.forEach(key => {
                const val = edges[key];
                const nearest = Math.round(val / step) * step;
                const diff = nearest - val;
                if (Math.abs(diff) < threshold && Math.abs(diff) < Math.abs(minDy)) {
                    minDy = diff;
                    this._addSnapLine('y', nearest, currentBounds);
                }
            });
        }

        // --- 2. Guide Snapping ---
        if (options.guides && window.projectModel) {
            const guides = window.projectModel.getGuides();
            if (guides && Array.isArray(guides)) {
                guides.forEach(g => {
                     if (g.visible === false) return;
                     const gVal = g.position;

                     if (g.axis === 'x') {
                        xKeys.forEach(key => {
                            const val = edges[key];
                            const diff = gVal - val;
                            if (Math.abs(diff) < threshold && Math.abs(diff) < Math.abs(minDx)) {
                                minDx = diff;
                                this._addSnapLine('x', gVal, currentBounds, 'guide');
                            }
                        });
                     } else if (g.axis === 'y') {
                        yKeys.forEach(key => {
                            const val = edges[key];
                            const diff = gVal - val;
                            if (Math.abs(diff) < threshold && Math.abs(diff) < Math.abs(minDy)) {
                                minDy = diff;
                                this._addSnapLine('y', gVal, currentBounds, 'guide');
                            }
                        });
                     }
                });
            } else if (guides && (guides.x || guides.y)) {
                // Fallback for legacy structure
                if (guides.x) {
                    guides.x.forEach(gVal => {
                        xKeys.forEach(key => {
                            const val = edges[key];
                            const diff = gVal - val;
                            if (Math.abs(diff) < threshold && Math.abs(diff) < Math.abs(minDx)) {
                                minDx = diff;
                                this._addSnapLine('x', gVal, currentBounds, 'guide');
                            }
                        });
                    });
                }
                if (guides.y) {
                    guides.y.forEach(gVal => {
                        yKeys.forEach(key => {
                            const val = edges[key];
                            const diff = gVal - val;
                            if (Math.abs(diff) < threshold && Math.abs(diff) < Math.abs(minDy)) {
                                minDy = diff;
                                this._addSnapLine('y', gVal, currentBounds, 'guide');
                            }
                        });
                    });
                }
            }
        }

        // Apply Snap if found
        if (minDx !== Infinity) {
            dx = minDx;
        } else {
            this.snapLines = this.snapLines.filter(l => l.axis !== 'x'); // Remove unused candidates
        }

        if (minDy !== Infinity) {
            dy = minDy;
        } else {
            this.snapLines = this.snapLines.filter(l => l.axis !== 'y'); // Remove unused candidates
        }

        // Filter lines to only match the winning snap
        this._filterSnapLines(dx, dy, currentBounds);

        return { dx, dy };
    }
    
    getVisuals() {
        return this.snapLines;
    }

    _getGridStep(scale) {
        // Simple adaptive grid logic mimicking standard editors
        let step = 100;
        while (step * scale > 100) step /= 10;
        while (step * scale < 10) step *= 10;
        return step;
    }

    _addSnapLine(axis, pos, bounds, type = 'grid') {
        // Just store candidate. We'll refine visual coords later.
        this.snapLines.push({ axis, pos, type });
    }

    _filterSnapLines(dx, dy, bounds) {
        // Only keep lines that align with the snapped position
        const snappedX_left = bounds.x + dx;
        const snappedX_right = bounds.x + bounds.width + dx;
        const snappedX_center = bounds.x + bounds.width / 2 + dx;
        
        const snappedY_top = bounds.y + dy;
        const snappedY_bottom = bounds.y + bounds.height + dy;
        const snappedY_center = bounds.y + bounds.height / 2 + dy;
        
        const epsilon = 0.001;

        this.snapLines = this.snapLines.filter(line => {
            if (line.axis === 'x') {
                return Math.abs(line.pos - snappedX_left) < epsilon || 
                       Math.abs(line.pos - snappedX_right) < epsilon ||
                       Math.abs(line.pos - snappedX_center) < epsilon;
            } else {
                return Math.abs(line.pos - snappedY_top) < epsilon || 
                       Math.abs(line.pos - snappedY_bottom) < epsilon ||
                       Math.abs(line.pos - snappedY_center) < epsilon;
            }
        });
    }
}
