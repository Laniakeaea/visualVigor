import { ToolUtils } from '../ToolUtils.js';
import { VectorCommand } from '../../Edit/Commands/VectorCommand.js';
import { CompositeCommand } from '../../Edit/Commands/CompositeCommand.js';
import paper from 'paper';
import { SelectRenderer } from './Select/SelectRenderer.js';
import { SelectTransform } from './Select/SelectTransform.js';
import { SelectPathEdit } from './Select/SelectPathEdit.js';
import { SelectPropertyHandler } from './Select/SelectPropertyHandler.js';
import { ColorUtils } from '../../../Controller/ColorUtils.js';
import { SnapManager } from '../../Assist/SnapManager.js';

export class SelectTool {
    constructor() {
        this.id = 'toolVectorSelect';
        this.selectedItems = new Map(); // id -> { item, element, initialPos, oldProperties }
        this.mode = 'idle'; // 'idle', 'drag', 'box-select', 'rotate', 'scale', 'edit-path'
        this.isPathEditMode = false;
        this.boxStart = null;
        this.activeViewport = null;
        
        // Modules
        this.renderer = new SelectRenderer();
        this.transform = new SelectTransform();
        this.pathEdit = new SelectPathEdit();
        this.propertyHandler = new SelectPropertyHandler(this);
        this.snapManager = new SnapManager();

        this.options = {
            mode: 'transform',
            strokeWidth: 1,
            stroke: {
                color: { r: 0, g: 0, b: 0, a: 255 } 
            },
            fill: {
                enabled: true,
                color: { r: 100, g: 100, b: 100, a: 255 },
                toggle: false // Disable UI Toggle for Select Tool
            }
        };
        this.activeColorTarget = null; // 'active-fill' or 'active-stroke'
    }

    onOptionInput(key, value) {
        if (key === 'strokeWidth') {
            this.propertyHandler.batchUpdateProperty('strokeWidth', value, true);
        }
    }

    onOptionChanged(key, value) {
        if (key === 'mode') {
            this.isPathEditMode = (value === 'node');
            this.updatePreview();
        } else if (key === 'strokeWidth') {
            this.propertyHandler.batchUpdateProperty('strokeWidth', value, false);
        } else if (key === 'fill') {
             // Logic delegated to PropertyHandler if needed, but primarily handled via onColorChange
             // If we ever re-enable the toggle, logic goes here.
             if (!value.enabled) {
                 this.propertyHandler.batchUpdateProperty('fill', null, false);
             }
        }
    }

    _updateOptionsFromSelection() {
        this.propertyHandler.updateOptionsFromSelection();
    }

    get cursor() {
        return { type: 'default' };
    }

    activate() {
        this.bindEvents();
        // Sync VectorSystem with ProjectModel
        if (window.projectModel && window.projectModel.data && window.vectorSystem) {
            window.vectorSystem.importData(window.projectModel.data.timeline.vectorLayer);
        }
    }

    deactivate() {
        this.unbindEvents();
        this.clearSelection();
    }

    bindEvents() {
        this.handleDown = this.onPointerDown.bind(this);
        this.handleMove = this.onPointerMove.bind(this);
        this.handleUp = this.onPointerUp.bind(this);
        this.handleDblClick = this.onDblClick.bind(this);
        this.handleProjectChange = this._onProjectChange.bind(this);
        this.handleElementsSelected = this._onElementsSelected.bind(this);
        this.handleColorChange = this._onColorChange.bind(this);
        this.handleStrokeWidthChange = this._onStrokeWidthChange.bind(this);
        this.handleCameraChange = this._onCameraChange.bind(this);

        document.addEventListener('pointerdown', this.handleDown);
        document.addEventListener('pointermove', this.handleMove);
        document.addEventListener('pointerup', this.handleUp);
        document.addEventListener('dblclick', this.handleDblClick);
        window.addEventListener('projectLayersChanged', this.handleProjectChange);
        window.addEventListener('elementsSelected', this.handleElementsSelected);
        window.addEventListener('projectColorChanged', this.handleColorChange);
        window.addEventListener('projectStrokeWidthChanged', this.handleStrokeWidthChange);
        window.addEventListener('workspaceCameraChanged', this.handleCameraChange);
    }

    unbindEvents() {
        document.removeEventListener('pointerdown', this.handleDown);
        document.removeEventListener('pointermove', this.handleMove);
        document.removeEventListener('pointerup', this.handleUp);
        document.removeEventListener('dblclick', this.handleDblClick);
        window.removeEventListener('projectLayersChanged', this.handleProjectChange);
        window.removeEventListener('elementsSelected', this.handleElementsSelected);
        window.removeEventListener('projectColorChanged', this.handleColorChange);
        window.removeEventListener('projectStrokeWidthChanged', this.handleStrokeWidthChange);
        window.removeEventListener('workspaceCameraChanged', this.handleCameraChange);
    }

    _onColorChange(e) {
        this.propertyHandler.onColorChange(e);
    }
    
    _onStrokeWidthChange(e) {
        this.propertyHandler.onStrokeWidthChange(e);
    }

    _onCameraChange(e) {
        this.updatePreview();
    }


    _onElementsSelected(e) {
        const ids = e.detail.ids;
        if (!ids) return;

        this.clearSelection();
        
        // Find Viewport first to ensure activeViewport is set for rendering
        const viewports = document.querySelectorAll('.workspace__viewport');
        if (viewports.length > 0) {
            this.activeViewport = viewports[0]; // Default to first viewport
        }

        const scope = window.vectorSystem.scope;
        if (!scope.project || !scope.project.activeLayer) return;

        ids.forEach(id => {
            // Use recursive getItem to find nested elements (groups)
            const item = scope.project.getItem({ data: { id: id } });
            if (item) {
                this._addToSelection(item);
            }
        });
        
        this.updatePreview();
    }

    _onProjectChange() {
        // Wait for VectorSystem to be updated by WorkspaceView
        setTimeout(() => {
            this._refreshSelection();
        }, 0);
    }

    getCanvasPoint(e, viewport) {
        if (!viewport) return { x: e.clientX, y: e.clientY };
        const rect = viewport.getBoundingClientRect();
        // Subtract border width (clientLeft/Top) to get coordinates relative to the content box
        const x = e.clientX - rect.left - viewport.clientLeft;
        const y = e.clientY - rect.top - viewport.clientTop;
        
        if (viewport.cameraController) {
            const { position, scale } = viewport.cameraController;
            return {
                x: (x - position.x) / scale,
                y: (y - position.y) / scale
            };
        }
        return { x, y };
    }

    clearSelection() {
        this.selectedItems.clear();
        // Respect the persistent mode option
        this.isPathEditMode = (this.options.mode === 'node');
        this.updatePreview();
    }

    onPointerDown(e) {
        if (e.button !== 0) return;
        
        // IMPORTANT: Only intercept events inside the workspace viewport
        const viewport = e.target.closest('.workspace__viewport');
        if (!viewport) return; // Allow events (clicks, drags) on UI panels to pass through

        // Prevent default browser behavior (text selection, native drag) ONLY for canvas interactions
        e.preventDefault();
        // Stop propagation to prevent CameraController from panning while we interact with items
        e.stopPropagation();

        this.activeViewport = viewport;
        const point = this.getCanvasPoint(e, viewport);
        const scope = window.vectorSystem.scope;

        // Check for Handle Click first
        const handleType = e.target.getAttribute('data-handle-type');
        if (handleType) {
            // Check for Node/Bezier Edit
            if (handleType === 'node' || handleType === 'handle-in' || handleType === 'handle-out') {
                this.mode = 'edit-path';
                this.activeHandleType = handleType;
                this.activeSegmentIndex = parseInt(e.target.getAttribute('data-segment-index'));
                // IDs might be strings, don't parse as int
                this.activeItemId = e.target.getAttribute('data-item-id');
                
                const data = this.selectedItems.get(this.activeItemId);
                if (data && data.item) {
                    this.activeSegment = data.item.segments[this.activeSegmentIndex];
                    this.dragStartPoint = point;
                    
                    // Store initial state for Undo
                    this.selectedItems.forEach(d => {
                        if (d.item.className === 'Path') {
                            d.initialPathData = d.item.pathData;                            d.initialSegmentsPos = d.item.segments.map(s => s.point.clone());                        }
                        if (d.element) {
                            d.oldProperties = { ...d.element.properties };
                        }
                    });
                }
                return;
            }

            this.mode = handleType; // 'scale' or 'rotate'
            this.activeHandle = e.target.getAttribute('data-handle-pos');
            this.dragStartPoint = point;
            
            // Store initial state for transformation
            this.initialBounds = this._getSelectionBounds();
            this.initialCenter = this.initialBounds.center.clone();
            
            this.selectedItems.forEach(data => {
                data.initialPos = data.item.position.clone();
                data.initialBounds = data.item.bounds.clone();
                data.initialScaling = data.item.scaling.clone();
                data.initialRotation = data.item.rotation;
                // Store path data for robust restoration
                if (data.item.className === 'Path') {
                    data.initialPathData = data.item.pathData;
                }
                if (data.element) {
                    data.oldProperties = { ...data.element.properties };
                }
            });
            return;
        }
        
        // Hit Test
        const hitResult = scope.project.hitTest(new scope.Point(point.x, point.y), {
            fill: true,
            stroke: true,
            segments: true,
            tolerance: 5
        });

        if (hitResult && hitResult.item) {
            let item = hitResult.item;
            
            // Walk up hierarchy to find the top-most selectable group (child of Layer)
            // or the nested group that represents a logical element.
            while (item.parent && item.parent.className !== 'Layer') {
                if (item.parent.data && item.parent.data.id) {
                    item = item.parent;
                } else {
                    item = item.parent;
                }
            }

            const id = item.data.id;
            const isSelected = this.selectedItems.has(id);

            // Special Case: Path Edit Mode - Dragging a Segment (Stroke)
            if (this.isPathEditMode && isSelected && hitResult.type === 'stroke') {
                this.mode = 'edit-path-segment';
                this.activeItemId = id;
                this.dragStartPoint = point;
                
                // Identify the curve and its segments
                const curve = hitResult.location.curve;
                this.activeCurveSegments = [curve.segment1, curve.segment2];
                
                // Store initial state
                this.activeCurveSegmentsInitial = this.activeCurveSegments.map(s => s.point.clone());
                
                // Store for Undo
                const data = this.selectedItems.get(id);
                if (data) {
                    data.initialPathData = item.pathData;
                    data.initialSegmentsPos = item.segments.map(s => s.point.clone());
                    if (data.element) data.oldProperties = { ...data.element.properties };
                }
                return;
            }

            this.mode = 'drag';
            
            if (e.shiftKey) {
                if (isSelected) {
                    this.selectedItems.delete(id);
                    this.mode = 'idle'; // Don't drag if we just deselected
                } else {
                    this._addToSelection(item);
                }
            } else {
                if (!isSelected) {
                    this.clearSelection();
                    this._addToSelection(item);
                }
                // If already selected, keep it (and others) selected for dragging
            }

            // Prepare for Drag: Store initial positions
            this.initialBounds = this._getSelectionBounds(); // Calc composite bounds for snap
            this.selectedItems.forEach(data => {
                data.initialPos = data.item.position.clone();
                // Store old properties for Undo
                if (data.element) {
                    data.oldProperties = { ...data.element.properties };
                }
            });
            
            this.dragStartPoint = point;

        } else {
            // Box Selection Start
            this.mode = 'box-select';
            this.boxStart = point;
            
            if (!e.shiftKey) {
                this.clearSelection();
            }
        }
        
        this.updatePreview();
        this._notifySelectionChange();
    }

    _addToSelection(item) {
        const id = item.data.id;
        const element = window.projectModel.getVectorElementById(id);
        if (element) {
            this.selectedItems.set(id, {
                item: item,
                element: element,
                initialPos: item.position.clone(),
                oldProperties: null
            });
        }
    }

    onPointerMove(e) {
        if (this.mode === 'idle' || !this.activeViewport) return;

        const point = this.getCanvasPoint(e, this.activeViewport);

        if (this.mode === 'drag') {
            let delta = {
                x: point.x - this.dragStartPoint.x,
                y: point.y - this.dragStartPoint.y
            };

            // Implement Snapping
            if (window.layoutController && window.layoutController.workspaceView && 
                window.layoutController.workspaceView.assistants.snap) {
                
                const scale = this.activeViewport && this.activeViewport.cameraController 
                              ? this.activeViewport.cameraController.scale : 1;
                
                if (this.initialBounds) {
                    const currentBounds = {
                        x: this.initialBounds.x + delta.x,
                        y: this.initialBounds.y + delta.y,
                        width: this.initialBounds.width,
                        height: this.initialBounds.height
                    };

                    const snapResult = this.snapManager.snap(currentBounds, scale, {
                        grid: window.layoutController.workspaceView.assistants.grid, // Use grid state
                        guides: true
                    });
                    
                    delta.x += snapResult.dx;
                    delta.y += snapResult.dy;
                    
                    // Update visuals
                    if (this.activeViewport && this.activeViewport.overlay) {
                        this.activeViewport.overlay.setSnapGuides(this.snapManager.getVisuals());
                    }
                }
            } else {
                 if (this.activeViewport && this.activeViewport.overlay) {
                     this.activeViewport.overlay.setSnapGuides([]);
                 }
            }

            this.selectedItems.forEach(data => {
                data.item.position.x = data.initialPos.x + delta.x;
                data.item.position.y = data.initialPos.y + delta.y;
            });
            
            this.updatePreview(false); 
            window.dispatchEvent(new CustomEvent('vv-vector-modifying', { detail: { mode: 'drag' } }));

        } else if (this.mode === 'box-select') {
            this.updateBoxSelection(point);
            this.updatePreview(true, point); 
        } else if (this.mode === 'rotate') {
            this.transform.handleRotate(this, point);
            this.updatePreview(false);
            window.dispatchEvent(new CustomEvent('vv-vector-modifying', { detail: { mode: 'rotate' } }));
        } else if (this.mode === 'scale') {
            let targetPoint = { ...point };

            // Implement Snapping for Scale
            if (window.layoutController && window.layoutController.workspaceView && 
                window.layoutController.workspaceView.assistants.snap) {
                
                const scale = this.activeViewport && this.activeViewport.cameraController 
                              ? this.activeViewport.cameraController.scale : 1;
                
                const frame = this.initialBounds;
                if (frame) {
                    const h = this.activeHandle;

                    // Determine if flipped relative to initial bounds
                    // Note: point is current mouse, frame is initial.
                    // If we cross over, the normalized box flips logic.
                    const isFlippedX = (h.includes('right') && point.x < frame.x) || 
                                       (h.includes('left') && point.x > (frame.x + frame.width));
                    const isFlippedY = (h.includes('bottom') && point.y < frame.y) || 
                                       (h.includes('top') && point.y > (frame.y + frame.height));

                    const edgesToCheck = [];
                    if (h.includes('left')) edgesToCheck.push(isFlippedX ? 'right' : 'left');
                    if (h.includes('right')) edgesToCheck.push(isFlippedX ? 'left' : 'right');
                    if (h.includes('top')) edgesToCheck.push(isFlippedY ? 'bottom' : 'top');
                    if (h.includes('bottom')) edgesToCheck.push(isFlippedY ? 'top' : 'bottom');


                    if (edgesToCheck.length > 0) {
                        // Construct Normalized "Current" Bounds based on point
                        let rawLeft = (h.includes('left')) ? point.x : frame.x;
                        let rawRight = (h.includes('right')) ? point.x : (frame.x + frame.width);
                        
                        // Handle Center handles where other dimension is preserved
                        // e.g. top-center: left/right are unchanged from frame
                        if (!h.includes('left') && !h.includes('right')) {
                            // strictly maintain vertical visual, but for bounds snap:
                            rawLeft = frame.x;
                            rawRight = frame.x + frame.width;
                        }

                        let rawTop = (h.includes('top')) ? point.y : frame.y;
                        let rawBottom = (h.includes('bottom')) ? point.y : (frame.y + frame.height);

                        if (!h.includes('top') && !h.includes('bottom')) {
                            rawTop = frame.y;
                            rawBottom = frame.y + frame.height;
                        }

                        const normBounds = {
                            x: Math.min(rawLeft, rawRight),
                            y: Math.min(rawTop, rawBottom),
                            width: Math.abs(rawRight - rawLeft),
                            height: Math.abs(rawBottom - rawTop)
                        };

                        const snapResult = this.snapManager.snap(normBounds, scale, {
                            grid: window.layoutController.workspaceView.assistants.grid,
                            guides: true,
                            activeEdges: edgesToCheck
                        });

                        targetPoint.x += snapResult.dx;
                        targetPoint.y += snapResult.dy;

                        if (this.activeViewport && this.activeViewport.overlay) {
                            this.activeViewport.overlay.setSnapGuides(this.snapManager.getVisuals());
                        }
                    }
                }
            } else {
                 if (this.activeViewport && this.activeViewport.overlay) {
                     this.activeViewport.overlay.setSnapGuides([]);
                 }
            }
            
            this.transform.handleScale(this, targetPoint);
            this.updatePreview(false);
            window.dispatchEvent(new CustomEvent('vv-vector-modifying', { detail: { mode: 'scale' } }));
        } else if (this.mode === 'edit-path' || this.mode === 'edit-path-segment') {
            this.pathEdit.handlePathEdit(this, point, e);
            this.updatePreview(false);
            window.dispatchEvent(new CustomEvent('vv-vector-modifying', { detail: { mode: 'edit-path' } }));
        }
    }

    updateBoxSelection(currentPoint) {
        const scope = window.vectorSystem.scope;
        const start = this.boxStart;
        const end = currentPoint;
        
        // Determine Direction
        // Left->Right (Window): width > 0
        // Right->Left (Crossing): width < 0
        const isWindowSelect = (end.x - start.x) > 0;
        
        // Create Selection Rect
        const rect = new scope.Rectangle(
            new scope.Point(Math.min(start.x, end.x), Math.min(start.y, end.y)),
            new scope.Point(Math.max(start.x, end.x), Math.max(start.y, end.y))
        );

        // Create a Path for precise intersection testing
        const selectionPath = new scope.Path.Rectangle(rect);
        selectionPath.remove(); // Don't add to scene

        // Check all items
        const children = scope.project.activeLayer.children;
        
        // We don't want to clear previous selection if Shift is held? 
        // For now, let's assume box select re-evaluates the *current* box area.
        // If we want to add to existing selection, we should have stored it.
        // But typically box select is dynamic.
        
        // Temporary Set for this box operation
        const inBoxIds = new Set();

        children.forEach(item => {
            let selected = false;
            if (isWindowSelect) {
                // Window: Fully Inside
                if (item.isInside(rect)) {
                    selected = true;
                }
            } else {
                // Crossing: Inside OR Intersects
                // 1. Fast Check: Bounds Intersection
                if (item.bounds && rect.intersects(item.bounds)) {
                    // 2. Precise Check: Geometry Intersection
                    // - Intersects path?
                    // - Is fully inside selection?
                    // - Is selection fully inside item (and item is filled)?
                    if (item.intersects(selectionPath) || item.isInside(rect)) {
                        selected = true;
                    } else if (item.fillColor && item.contains(rect.center)) {
                        selected = true;
                    }
                }
            }
            
            if (selected) {
                inBoxIds.add(item.data.id);
                if (!this.selectedItems.has(item.data.id)) {
                    this._addToSelection(item);
                }
            } else {
                // If it was in selection but NOT in this box...
                // If Shift was NOT held at start, we should remove it?
                // Complex logic. Simple version:
                // If not Shift, clear everything first (done in onPointerDown).
                // So here we just add.
                // But if we drag back and forth, we need to remove items that are no longer in box.
                if (this.selectedItems.has(item.data.id)) {
                    // Only remove if it was added *during this box select*?
                    // Or just sync selectedItems with inBoxIds?
                    // Let's sync.
                    this.selectedItems.delete(item.data.id);
                }
            }
        });
    }

    updatePreview(showBox = false, currentPoint = null) {
        this.renderer.updatePreview(this, showBox, currentPoint);
        // Force Paper.js view update to render item transformations immediately
        if (window.vectorSystem) {
            window.vectorSystem.update();
        }
    }

    _notifySelectionChange() {
        this._updateOptionsFromSelection();
        const ids = Array.from(this.selectedItems.keys());
        window.dispatchEvent(new CustomEvent('canvasSelectionChanged', { detail: { ids: ids } }));
    }

    _getSelectionBounds() {
        let bounds = null;
        this.selectedItems.forEach(data => {
            if (!bounds) {
                bounds = data.item.bounds.clone();
            } else {
                bounds = bounds.unite(data.item.bounds);
            }
        });
        return bounds;
    }



    _refreshSelection() {
        const selectedIds = Array.from(this.selectedItems.keys());
        this.selectedItems.clear();
        
        const scope = window.vectorSystem.scope;
        if (!scope.project || !scope.project.activeLayer) return;

        const children = scope.project.activeLayer.children;
        
        children.forEach(item => {
            if (selectedIds.includes(item.data.id)) {
                this._addToSelection(item);
            }
        });
        
        this.updatePreview();
    }

    onPointerUp(e) {
        if (this.mode === 'drag' || this.mode === 'rotate' || this.mode === 'scale' || this.mode === 'edit-path' || this.mode === 'edit-path-segment') {
            // Commit Changes
            if (this.selectedItems.size > 0) {
                const compositeCmd = new CompositeCommand('Transform Vectors');
                let hasChanges = false;

                this.selectedItems.forEach(data => {
                    if (this._processItemChanges(data.item, compositeCmd)) {
                        hasChanges = true;
                    }
                });

                if (hasChanges) {
                    window.dispatchEvent(new CustomEvent('projectLayersChanged'));
                    if (window.editSystem) {
                        window.editSystem.addCommand(compositeCmd);
                    }
                    // _refreshSelection will be called by the event listener
                }
            }
        } else if (this.mode === 'box-select') {
            // Selection is already updated in onPointerMove
            // Just clear the box visual
            this.updatePreview(false);
            this._notifySelectionChange();
        }

        this.mode = 'idle';
        this.boxStart = null;
        this.dragStartPoint = null;
        this.activeHandle = null;
        this.activeSegment = null;
        this.activeHandleType = null;
        
        // Ensure UI is updated
        this.updatePreview();
    }

    onDblClick(e) {
        // Only trigger if we have a single selection
        if (this.selectedItems.size !== 1) return;
        
        const selection = this.selectedItems.values().next().value;
        const element = selection.element;
        
        if (element.type === 'text') {
            if (window.toolSystem) {
                // Switch to Text Tool and Start Editing
                window.toolSystem.activateTool('toolVectorText');
                const textTool = window.toolSystem.tools['toolVectorText'];
                if (textTool && typeof textTool.startEditing === 'function') {
                    textTool.startEditing(element);
                }
            }
        }
    }

    _processItemChanges(item, compositeCmd) {
        if (item.className === 'Group') {
            let changes = false;
            if (item.children) {
                item.children.forEach(child => {
                    if (this._processItemChanges(child, compositeCmd)) changes = true;
                });
            }
            return changes;
        }

        const id = item.data.id;
        if (!id) return false;
        
        // Use cached element if available to avoid lookup? 
        // No, look up fresh to be safe, or use what we have.
        // For nested items, we must look up.
        const element = window.projectModel.getVectorElementById(id);
        if (!element) return false;

        const oldProperties = element.properties; // Current state in model
        const newProperties = { ...oldProperties };
        let isTypeChange = false;
        const currentType = element.type;
        
        // Update properties based on Paper.js item
        if (item.className === 'Path' || item.className === 'CompoundPath') {
            newProperties.d = item.pathData;

            // Convert Primitives to Path if transformed
            if (['rect', 'circle', 'ellipse', 'polygon'].includes(currentType)) {
                isTypeChange = true;
                delete newProperties.x;
                delete newProperties.y;
                delete newProperties.width;
                delete newProperties.height;
                delete newProperties.cx;
                delete newProperties.cy;
                delete newProperties.r;
                delete newProperties.rx;
                delete newProperties.ry;
                delete newProperties.points;
                delete newProperties.sides;
            }
        } else if (item.className === 'PointText') {
            newProperties.x = item.point.x;
            newProperties.y = item.point.y;
        }
        
        // Check if actually changed
        // Note: For primitive->path conversion, strict comparison fails as props keys changed.
        // We use JSON stringify for comparison which is okay.
        
        if (JSON.stringify(newProperties) !== JSON.stringify(oldProperties) || isTypeChange) {
            
            const cmdOld = isTypeChange ? { ...oldProperties, _type: currentType } : oldProperties;
            const cmdNew = isTypeChange ? { ...newProperties, _type: 'path' } : newProperties;

            if (isTypeChange) {
                element.type = 'path';
            }

            element.properties = newProperties;
            compositeCmd.addCommand(new VectorCommand('modify', element, cmdOld, cmdNew));
            return true;
        }
        return false;
    }
}
