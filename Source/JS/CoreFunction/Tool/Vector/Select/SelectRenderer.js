import paper from 'paper';

export class SelectRenderer {
    constructor() {
        this.NS = "http://www.w3.org/2000/svg";
        this.COLOR = 'var(--color-blue-100)';
        this.FILL_COLOR = 'var(--color-bg-main)';
        this.BASE_HANDLE_SIZE = 6;
        this.BASE_NODE_SIZE = 4;
        this.scale = 1;
    }

    updatePreview(tool, showBox = false, currentPoint = null) {
        if (!tool.activeViewport) return;
        
        // Update scale
        if (tool.activeViewport.cameraController) {
            this.scale = tool.activeViewport.cameraController.scale;
        } else {
            this.scale = 1;
        }

        const previewLayer = tool.activeViewport.querySelector('.tool-preview-layer-svg');
        if (!previewLayer) return;

        // Clear
        while (previewLayer.firstChild) {
            previewLayer.removeChild(previewLayer.firstChild);
        }

        // 1. Draw Selection Box (Marquee)
        if (showBox && tool.boxStart && currentPoint) {
            this._drawSelectionBox(previewLayer, tool.boxStart, currentPoint);
            return; // Don't draw item handles during box select
        }

        // 2. Draw Ghost of Selected Items (During Drag/Transform)
        if (!tool.isPathEditMode && tool.mode !== 'idle' && tool.mode !== 'box-select') {
             tool.selectedItems.forEach(data => {
                 this._drawItemGhost(data.item, previewLayer);
             });
        }

        // 3. Draw Selected Item Details (Nodes, Bezier)
        if (tool.isPathEditMode) {
            tool.selectedItems.forEach(data => {
                this._drawPathDetails(data.item, previewLayer);
            });
        }

        // 3. Draw Global Bounding Box & Transform Handles
        if (!tool.isPathEditMode && tool.selectedItems.size > 0) {
            const bounds = tool._getSelectionBounds();
            if (bounds) {
                // Use initial center during rotation to keep pivot stable
                let rotationCenter = bounds.center;
                if (tool.mode === 'rotate' && tool.initialCenter) {
                    rotationCenter = tool.initialCenter;
                }
                this._drawTransformControls(bounds, previewLayer, rotationCenter);
            }
        }
    }

    _drawSelectionBox(container, start, end) {
        const width = end.x - start.x;
        const height = end.y - start.y;
        
        const box = document.createElementNS(this.NS, "rect");
        box.setAttribute('x', Math.min(start.x, end.x));
        box.setAttribute('y', Math.min(start.y, end.y));
        box.setAttribute('width', Math.abs(width));
        box.setAttribute('height', Math.abs(height));
        
        // Style based on direction
        if (width > 0) {
            // Window (Left->Right): Blue, Solid
            box.setAttribute('fill', 'var(--color-blue-20)');
            box.setAttribute('stroke', 'var(--color-blue-50)');
        } else {
            // Crossing (Right->Left): Green, Dashed
            box.setAttribute('fill', 'var(--color-green-20)');
            box.setAttribute('stroke', 'var(--color-green-50)');
            box.setAttribute('stroke-dasharray', `${5/this.scale},${5/this.scale}`);
        }
        box.setAttribute('stroke-width', `${1/this.scale}`);
        container.appendChild(box);
    }

    _drawPathDetails(item, container) {
        if (item.className === 'Group') {
            if (item.children) {
                item.children.forEach(child => this._drawPathDetails(child, container));
            }
            return;
        }

        if (item.className !== 'Path') return;

        let pathData = "";
        const segments = item.segments;
        const nodesFragment = document.createDocumentFragment();

        if (segments.length > 0) {
            const firstGlobal = item.localToGlobal(segments[0].point);
            pathData += `M ${firstGlobal.x} ${firstGlobal.y}`;

            segments.forEach((segment, index) => {
                const p = item.localToGlobal(segment.point);
                
                // Draw Bezier Handles
                const handleRadius = 2 / this.scale;
                if (!segment.handleIn.isZero()) {
                    const hIn = item.localToGlobal(segment.point.add(segment.handleIn));
                    this._createSvgLine(nodesFragment, p, hIn, this.COLOR);
                    const circle = this._createSvgCircle(nodesFragment, hIn, handleRadius, this.COLOR, this.COLOR);
                    circle.setAttribute('data-handle-type', 'handle-in');
                    circle.setAttribute('data-segment-index', index);
                    circle.setAttribute('data-item-id', item.data.id);
                    circle.style.pointerEvents = 'all';
                    circle.style.cursor = 'crosshair';
                }
                if (!segment.handleOut.isZero()) {
                    const hOut = item.localToGlobal(segment.point.add(segment.handleOut));
                    this._createSvgLine(nodesFragment, p, hOut, this.COLOR);
                    const circle = this._createSvgCircle(nodesFragment, hOut, handleRadius, this.COLOR, this.COLOR);
                    circle.setAttribute('data-handle-type', 'handle-out');
                    circle.setAttribute('data-segment-index', index);
                    circle.setAttribute('data-item-id', item.data.id);
                    circle.style.pointerEvents = 'all';
                    circle.style.cursor = 'crosshair';
                }

                // Draw Anchor Point (Node)
                const nodeSize = this.BASE_NODE_SIZE / this.scale;
                const rect = this._createSvgRect(nodesFragment, p.x - nodeSize/2, p.y - nodeSize/2, nodeSize, nodeSize, this.FILL_COLOR, this.COLOR);
                rect.setAttribute('data-handle-type', 'node');
                rect.setAttribute('data-segment-index', index);
                rect.setAttribute('data-item-id', item.data.id);
                rect.style.pointerEvents = 'all';
                rect.style.cursor = 'move';

                // Build Path Data
                if (index < segments.length - 1) {
                    const nextSeg = segments[index + 1];
                    const pNext = item.localToGlobal(nextSeg.point);
                    const hOut = item.localToGlobal(segment.point.add(segment.handleOut));
                    const hIn = item.localToGlobal(nextSeg.point.add(nextSeg.handleIn));
                    pathData += ` C ${hOut.x} ${hOut.y} ${hIn.x} ${hIn.y} ${pNext.x} ${pNext.y}`;
                } else if (item.closed) {
                    const nextSeg = segments[0];
                    const pNext = item.localToGlobal(nextSeg.point);
                    const hOut = item.localToGlobal(segment.point.add(segment.handleOut));
                    const hIn = item.localToGlobal(nextSeg.point.add(nextSeg.handleIn));
                    pathData += ` C ${hOut.x} ${hOut.y} ${hIn.x} ${hIn.y} ${pNext.x} ${pNext.y} Z`;
                }
            });
        }

        // Draw Outline
        const outline = document.createElementNS(this.NS, "path");
        outline.setAttribute('d', pathData);
        outline.setAttribute('fill', 'none');
        outline.setAttribute('stroke', this.COLOR);
        outline.setAttribute('stroke-width', `${1/this.scale}`);
        outline.style.pointerEvents = 'none';
        container.appendChild(outline);

        // Append Nodes/Handles
        container.appendChild(nodesFragment);
    }

    _drawTransformControls(bounds, container, rotationCenter = null) {
        // 1. Bounding Box Rect
        const rect = document.createElementNS(this.NS, "rect");
        rect.setAttribute('x', bounds.x);
        rect.setAttribute('y', bounds.y);
        rect.setAttribute('width', bounds.width);
        rect.setAttribute('height', bounds.height);
        rect.setAttribute('fill', 'none');
        rect.setAttribute('stroke', this.COLOR);
        rect.setAttribute('stroke-width', `${1/this.scale}`);
        rect.style.pointerEvents = 'none'; // Let clicks pass through the box itself
        container.appendChild(rect);

        // 2. Rotation Handle (Top Center + Offset)
        const rotationOffset = 20 / this.scale;
        const topCenter = new paper.Point(bounds.center.x, bounds.top);
        const rotHandlePos = topCenter.subtract(new paper.Point(0, rotationOffset));
        
        // Line to rotation handle
        this._createSvgLine(container, topCenter, rotHandlePos, this.COLOR);
        // Rotation Handle Circle
        const rotHandleRadius = 4 / this.scale;
        this._createSvgCircle(container, rotHandlePos, rotHandleRadius, this.FILL_COLOR, this.COLOR, 'rotate');
        
        // Rotation Center Crosshair
        const center = rotationCenter || bounds.center;
        const crosshairSize = 4 / this.scale;
        this._createSvgCrosshair(container, center, crosshairSize, this.COLOR);

        // 3. Scale Handles (8 points)
        const positions = [
            { pos: bounds.topLeft, type: 'top-left' },
            { pos: bounds.topCenter, type: 'top-center' },
            { pos: bounds.topRight, type: 'top-right' },
            { pos: bounds.rightCenter, type: 'right-center' },
            { pos: bounds.bottomRight, type: 'bottom-right' },
            { pos: bounds.bottomCenter, type: 'bottom-center' },
            { pos: bounds.bottomLeft, type: 'bottom-left' },
            { pos: bounds.leftCenter, type: 'left-center' }
        ];

        const handleSize = this.BASE_HANDLE_SIZE / this.scale;
        positions.forEach(p => {
            this._createSvgRect(container, p.pos.x - handleSize/2, p.pos.y - handleSize/2, handleSize, handleSize, this.FILL_COLOR, this.COLOR, 'scale', p.type);
        });
    }

    _createSvgLine(container, p1, p2, color) {
        const line = document.createElementNS(this.NS, "line");
        line.setAttribute('x1', p1.x);
        line.setAttribute('y1', p1.y);
        line.setAttribute('x2', p2.x);
        line.setAttribute('y2', p2.y);
        line.setAttribute('stroke', color);
        line.setAttribute('stroke-width', `${1/this.scale}`);
        line.style.pointerEvents = 'none';
        container.appendChild(line);
        return line;
    }

    _createSvgRect(container, x, y, w, h, fill, stroke, handleType = null, handlePos = null) {
        const rect = document.createElementNS(this.NS, "rect");
        rect.setAttribute('x', x);
        rect.setAttribute('y', y);
        rect.setAttribute('width', w);
        rect.setAttribute('height', h);
        rect.setAttribute('fill', fill);
        rect.setAttribute('stroke', stroke);
        rect.setAttribute('stroke-width', `${1/this.scale}`);
        
        if (handleType) {
            rect.setAttribute('data-handle-type', handleType);
            rect.style.pointerEvents = 'all';
            rect.style.cursor = this._getCursorForHandle(handlePos);
        }
        if (handlePos) {
            rect.setAttribute('data-handle-pos', handlePos);
        }
        
        container.appendChild(rect);
        return rect;
    }

    _createSvgCircle(container, p, r, fill, stroke, handleType = null) {
        const circle = document.createElementNS(this.NS, "circle");
        circle.setAttribute('cx', p.x);
        circle.setAttribute('cy', p.y);
        circle.setAttribute('r', r);
        circle.setAttribute('fill', fill);
        circle.setAttribute('stroke', stroke);
        circle.setAttribute('stroke-width', `${1/this.scale}`);
        
        if (handleType) {
            circle.setAttribute('data-handle-type', handleType);
            circle.style.pointerEvents = 'all';
            circle.style.cursor = 'grab'; // Rotation cursor
        }
        
        container.appendChild(circle);
        return circle;
    }

    _createSvgCrosshair(container, p, size, color) {
        this._createSvgLine(container, {x: p.x - size, y: p.y}, {x: p.x + size, y: p.y}, color);
        this._createSvgLine(container, {x: p.x, y: p.y - size}, {x: p.x, y: p.y + size}, color);
    }

    _getCursorForHandle(pos) {
        switch(pos) {
            case 'top-left': return 'nwse-resize';
            case 'top-center': return 'ns-resize';
            case 'top-right': return 'nesw-resize';
            case 'right-center': return 'ew-resize';
            case 'bottom-right': return 'nwse-resize';
            case 'bottom-center': return 'ns-resize';
            case 'bottom-left': return 'nesw-resize';
            case 'left-center': return 'ew-resize';
            default: return 'default';
        }
    }

    _drawItemGhost(item, container) {
        // Draw a lightweight representation of the item
        let el;
        if (item.className === 'PointText') {
            el = document.createElementNS(this.NS, "text");
            el.setAttribute('x', item.point.x);
            el.setAttribute('y', item.point.y);
            el.textContent = item.content;
            el.setAttribute('font-family', item.fontFamily);
            el.setAttribute('font-size', item.fontSize);
            el.setAttribute('fill', 'rgba(0,0,0,0.5)'); // Ghost look
            el.setAttribute('stroke', 'var(--color-blue-100)');
            el.setAttribute('stroke-width', `${1/this.scale}`);
        } else {
            // Path, Shape, etc. - use Path Data
            el = document.createElementNS(this.NS, "path");
            el.setAttribute('d', item.pathData);
            el.setAttribute('fill', 'none');
            el.setAttribute('stroke', 'var(--color-blue-50)');
            el.setAttribute('stroke-width', `${1/this.scale}`);
        }
        
        if (el) {
            el.style.pointerEvents = 'none';
            container.insertBefore(el, container.firstChild); // Draw behind controls
        }
    }
}