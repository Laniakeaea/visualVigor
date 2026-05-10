import paper from 'paper';

export class SelectPathEdit {

    _isInitialStateRectangle(initialSegments) {
        if (!initialSegments || initialSegments.length !== 4) {
            return false;
        }
        
        for (let i = 0; i < 4; i++) {
            const p0 = initialSegments[(i + 3) % 4];
            const p1 = initialSegments[i];
            const p2 = initialSegments[(i + 1) % 4];
            
            const v1 = new paper.Point(p0.x - p1.x, p0.y - p1.y);
            const v2 = new paper.Point(p2.x - p1.x, p2.y - p1.y);
            
            if (v1.length < 0.001 || v2.length < 0.001) return false;
            
            const dot = v1.normalize().dot(v2.normalize());
            if (Math.abs(dot) > 0.05) { 
                return false;
            }
        }
        return true;
    }

    handlePathEdit(tool, point, e) {
        // Mode: Dragging a Segment (Stroke)
        if (tool.mode === 'edit-path-segment') {
            if (!tool.activeCurveSegments || !tool.activeCurveSegmentsInitial) return;
            
            const data = tool.selectedItems.get(tool.activeItemId);
            
            // Convert to local space to handle rotated groups or paths without applyMatrix
            let localPoint = point;
            let localStart = tool.dragStartPoint;
            if (data && data.item) {
                localPoint = data.item.globalToLocal(new paper.Point(point.x, point.y));
                localStart = data.item.globalToLocal(new paper.Point(tool.dragStartPoint.x, tool.dragStartPoint.y));
            }

            let delta = {
                x: localPoint.x - localStart.x,
                y: localPoint.y - localStart.y
            };

            // Restrict movement to normal vector for rectangles
            if (data && data.item.closed && this._isInitialStateRectangle(data.initialSegmentsPos) && e && !e.ctrlKey) {
                const seg0 = tool.activeCurveSegmentsInitial[0];
                const seg1 = tool.activeCurveSegmentsInitial[1];
                const edgeVec = new paper.Point(seg1.x - seg0.x, seg1.y - seg0.y);
                if (edgeVec.length > 0.001) {
                    const normal = new paper.Point(-edgeVec.y, edgeVec.x).normalize();
                    const deltaVec = new paper.Point(delta.x, delta.y);
                    const proj = deltaVec.dot(normal);
                    delta.x = normal.x * proj;
                    delta.y = normal.y * proj;
                }
            }

            // Move both endpoints of the segment
            tool.activeCurveSegments.forEach((segment, index) => {
                const initial = tool.activeCurveSegmentsInitial[index];
                segment.point.x = initial.x + delta.x;
                segment.point.y = initial.y + delta.y;
            });
            return;
        }

        // Mode: Dragging a Node or Handle
        if (!tool.activeSegment) return;
        
        const data = tool.selectedItems.get(tool.activeItemId);
        if (!data || !data.item) return;

        // Convert global point to item's local coordinate space
        const globalPoint = new paper.Point(point.x, point.y);
        const localPoint = data.item.globalToLocal(globalPoint);
        
        if (tool.activeHandleType === 'node') {
            if (data && data.item.closed && this._isInitialStateRectangle(data.initialSegmentsPos) && e && !e.ctrlKey) {
                const i = tool.activeSegmentIndex;
                const oppIndex = (i + 2) % 4;
                const adj1Index = (i + 1) % 4;
                const adj2Index = (i + 3) % 4;
                
                const initialSegments = data.initialSegmentsPos;
                if (initialSegments) {
                    const opp = initialSegments[oppIndex];
                    const adj1_init = initialSegments[adj1Index];
                    const adj2_init = initialSegments[adj2Index];
                    
                    const v1 = new paper.Point(adj1_init.x - opp.x, adj1_init.y - opp.y);
                    const v2 = new paper.Point(adj2_init.x - opp.x, adj2_init.y - opp.y);
                    
                    if (v1.length > 0.001 && v2.length > 0.001) {
                        const u1 = v1.normalize();
                        const u2 = v2.normalize();
                        
                        const newVec = new paper.Point(localPoint.x - opp.x, localPoint.y - opp.y);
                        
                        const proj1 = newVec.dot(u1);
                        const proj2 = newVec.dot(u2);
                        
                        data.item.segments[adj1Index].point = new paper.Point(opp.x + u1.x * proj1, opp.y + u1.y * proj1);
                        data.item.segments[adj2Index].point = new paper.Point(opp.x + u2.x * proj2, opp.y + u2.y * proj2);
                        
                        tool.activeSegment.point = new paper.Point(opp.x + u1.x * proj1 + u2.x * proj2, opp.y + u1.y * proj1 + u2.y * proj2);
                        return;
                    }
                }
            }

            tool.activeSegment.point = localPoint;
        } else if (tool.activeHandleType === 'handle-in') {
            // Handle is a vector relative to point
            tool.activeSegment.handleIn = localPoint.subtract(tool.activeSegment.point);
        } else if (tool.activeHandleType === 'handle-out') {
            tool.activeSegment.handleOut = localPoint.subtract(tool.activeSegment.point);
        }
    }
}