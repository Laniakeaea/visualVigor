import { ElementView } from './ElementView.js';

/* =========================================
   Element Controller
   ========================================= */

export class ElementController {
    constructor() {
        this.selectedElementIds = new Set();
        this.lastInteractId = null; // Anchor for Shift selection
        this.view = new ElementView(this);
        this._bindEvents();
    }

    /**
     * Creates the element list component.
     * @returns {HTMLElement}
     */
    static create() {
        const instance = new ElementController();
        // Defer initial update to ensure container is ready? Not strictly necessary but safe.
        // Actually, projectModel might not be ready.
        if (window.projectModel) {
            instance.update();
        }
        return instance.view.getContainer();
    }

    _bindEvents() {
        window.addEventListener('projectLayersChanged', () => {
            this.update();
        });
        
        // Listen for selection changes from the canvas (SelectTool)
        window.addEventListener('canvasSelectionChanged', (e) => {
             const ids = e.detail.ids || [];
             this.selectedElementIds = new Set(ids);
             if (ids.length > 0) {
                 this.lastInteractId = ids[ids.length - 1];
             } else {
                 this.lastInteractId = null;
             }
             this._updateSelectionOnly();
        });
    }

    update() {
        if (!window.projectModel) return;
        const elements = window.projectModel.getVectorElements();
        this.view.render(elements, this.selectedElementIds);
    }
    
    _updateSelectionOnly() {
        this.view.updateSelection(this.selectedElementIds);
    }

    // --- Actions ---

    handleAddElement() {
        const newElem = window.projectModel.addVectorElement();
        if (newElem) {
            this.selectedElementIds.clear();
            this.selectedElementIds.add(newElem.id);
            this.lastInteractId = newElem.id;
            this.update();
            this._notifySelection();
        }
    }

    handleDeleteElement(id) {
        if (!id) return;
        window.projectModel.removeVectorElement(id);
        if (this.selectedElementIds.has(id)) {
            this.selectedElementIds.delete(id);
        }
        if (this.lastInteractId === id) {
            this.lastInteractId = null;
        }
        this.update();
        this._notifySelection();
    }

    handleSelectElement(id, modifiers = { ctrl: false, shift: false }) {
        if (modifiers.shift && this.lastInteractId) {
            // Range Selection
            this._handleShiftSelect(id);
        } else if (modifiers.ctrl) {
            // Toggle Selection
            if (this.selectedElementIds.has(id)) {
                this.selectedElementIds.delete(id);
                // If we deselect the anchor, do we move anchor? 
                // Standard behavior: lastInteractId becomes the clicked one even if deselected.
                this.lastInteractId = id; 
            } else {
                this.selectedElementIds.add(id);
                this.lastInteractId = id;
            }
        } else {
            // Single Selection
            this.selectedElementIds.clear();
            this.selectedElementIds.add(id);
            this.lastInteractId = id;
        }

        this._updateSelectionOnly();
        this._notifySelection();
    }

    _handleShiftSelect(targetId) {
        const elements = window.projectModel.getVectorElements();
        // Flatten visible list
        const flatList = this._getFlatList(elements);
        
        const startIndex = flatList.indexOf(this.lastInteractId);
        const endIndex = flatList.indexOf(targetId);

        if (startIndex === -1 || endIndex === -1) {
            // Fallback if IDs not found
            this.selectedElementIds.add(targetId);
            this.lastInteractId = targetId;
            return;
        }

        const start = Math.min(startIndex, endIndex);
        const end = Math.max(startIndex, endIndex);

        // Standard Range: Clear everything, select range [Anchor, Current]
        this.selectedElementIds.clear();
        for (let i = start; i <= end; i++) {
            this.selectedElementIds.add(flatList[i]);
        }
        // Anchor (lastInteractId) remains unchanged
    }

    _getFlatList(elements, list = []) {
        elements.forEach(el => {
            list.push(el.id);
            if (el.children && el.children.length > 0 && el.expanded) {
                this._getFlatList(el.children, list);
            }
        });
        return list;
    }

    handleToggleExpand(id) {
        window.projectModel.toggleElementExpand(id);
        this.update();
    }

    handleToggleVisibility(id) {
        window.projectModel.toggleElementVisibility(id);
        this.update(); // Update view to show hidden state
    }

    handleRenameElement(id, name) {
        window.projectModel.renameVectorElement(id, name);
        this.update();
    }

    _notifySelection() {
        const ids = Array.from(this.selectedElementIds);
        
        // Use 'elementsSelected' plural
        window.dispatchEvent(new CustomEvent('elementsSelected', { detail: { ids: ids } }));

        if (window.toolSystem && window.toolSystem.activeToolId !== 'toolVectorSelect') {
            window.toolSystem.activateTool('toolVectorSelect');
        }
    }
}
