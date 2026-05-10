import paper from 'paper';

export class SelectTransform {
    handleRotate(tool, point) {
        const center = tool.initialCenter;
        const startVector = new paper.Point(tool.dragStartPoint.x, tool.dragStartPoint.y).subtract(center);
        const currentVector = new paper.Point(point.x, point.y).subtract(center);
        
        const angle = currentVector.angle - startVector.angle;

        tool.selectedItems.forEach(data => {
            // 1. Restore Initial State
            data.item.position = data.initialPos.clone();
            data.item.rotation = data.initialRotation;
            data.item.scaling = data.initialScaling.clone();
            if (data.item.className === 'Path' && data.initialPathData) {
                data.item.pathData = data.initialPathData;
            }

            // 2. Apply Rotation around the selection center
            data.item.rotate(angle, center);
        });
    }

    handleScale(tool, point) {
        const bounds = tool.initialBounds;
        const pivot = this._getPivot(tool.activeHandle, bounds);
        const handlePoint = this._getHandlePoint(tool.activeHandle, bounds);
        
        // Calculate Scale Factors
        let sx = 1;
        let sy = 1;
        
        // X-Axis
        if (tool.activeHandle.includes('left') || tool.activeHandle.includes('right')) {
            const startWidth = handlePoint.x - pivot.x;
            const currentWidth = point.x - pivot.x;
            if (Math.abs(startWidth) > 0.1) {
                sx = currentWidth / startWidth;
            }
        }
        
        // Y-Axis
        if (tool.activeHandle.includes('top') || tool.activeHandle.includes('bottom')) {
            const startHeight = handlePoint.y - pivot.y;
            const currentHeight = point.y - pivot.y;
            if (Math.abs(startHeight) > 0.1) {
                sy = currentHeight / startHeight;
            }
        }
        
        tool.selectedItems.forEach(data => {
            // 1. Restore Initial State
            data.item.position = data.initialPos.clone();
            data.item.rotation = data.initialRotation;
            data.item.scaling = new paper.Point(1, 1);
            if (data.item.className === 'Path' && data.initialPathData) {
                data.item.pathData = data.initialPathData;
            }
            
            // 2. Apply Scale
            data.item.scale(sx, sy, pivot);
        });
    }

    _getPivot(handle, bounds) {
        switch(handle) {
            case 'top-left': return bounds.bottomRight;
            case 'top-center': return bounds.bottomCenter;
            case 'top-right': return bounds.bottomLeft;
            case 'right-center': return bounds.leftCenter;
            case 'bottom-right': return bounds.topLeft;
            case 'bottom-center': return bounds.topCenter;
            case 'bottom-left': return bounds.topRight;
            case 'left-center': return bounds.rightCenter;
            default: return bounds.center;
        }
    }

    _getHandlePoint(handle, bounds) {
        switch(handle) {
            case 'top-left': return bounds.topLeft;
            case 'top-center': return bounds.topCenter;
            case 'top-right': return bounds.topRight;
            case 'right-center': return bounds.rightCenter;
            case 'bottom-right': return bounds.bottomRight;
            case 'bottom-center': return bounds.bottomCenter;
            case 'bottom-left': return bounds.bottomLeft;
            case 'left-center': return bounds.leftCenter;
            default: return bounds.center;
        }
    }
}