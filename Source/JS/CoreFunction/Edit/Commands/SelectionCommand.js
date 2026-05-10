/* =========================================
   Selection Command
   ========================================= */

export class SelectionCommand {
    /**
     * @param {Object|null} oldSelection - { mask, width, height }
     * @param {Object|null} newSelection - { mask, width, height }
     */
    constructor(oldSelection, newSelection) {
        this.oldSelection = oldSelection;
        this.newSelection = newSelection;
    }

    undo() {
        if (window.selectionManager) {
            if (this.oldSelection) {
                window.selectionManager.setSelection(this.oldSelection.mask, this.oldSelection.width, this.oldSelection.height);
            } else {
                window.selectionManager.clearSelection();
            }
        }
    }

    redo() {
        if (window.selectionManager) {
            if (this.newSelection) {
                window.selectionManager.setSelection(this.newSelection.mask, this.newSelection.width, this.newSelection.height);
            } else {
                window.selectionManager.clearSelection();
            }
        }
    }
}
