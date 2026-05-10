/* =========================================
   Selection Manager
   ========================================= */

export class SelectionManager {
    constructor() {
        this.currentSelection = null; // { mask: Uint8Array, width, height }
    }

    /**
     * Sets the current selection mask.
     * @param {Uint8Array} mask - 0 or 1 per pixel.
     * @param {number} width 
     * @param {number} height 
     */
    setSelection(mask, width, height) {
        this.currentSelection = { mask, width, height };
        this._dispatchChange();
    }

    /**
     * Clears the current selection.
     */
    clearSelection() {
        this.currentSelection = null;
        this._dispatchChange();
    }

    /**
     * Inverts the current selection.
     */
    invertSelection() {
        if (!window.projectModel) return;
        const artboard = window.projectModel.getArtboard();
        if (!artboard) return;

        const width = artboard.width;
        const height = artboard.height;

        if (!this.currentSelection) {
            // If no selection, select all
            const mask = new Uint8Array(width * height).fill(1);
            this.setSelection(mask, width, height);
            return;
        }

        const { mask } = this.currentSelection;
        // Ensure dimensions match (in case artboard resized, though we should handle that separately)
        if (this.currentSelection.width !== width || this.currentSelection.height !== height) {
            this.clearSelection();
            return;
        }

        const newMask = new Uint8Array(mask.length);
        for (let i = 0; i < mask.length; i++) {
            newMask[i] = mask[i] ? 0 : 1;
        }
        this.setSelection(newMask, width, height);
    }

    /**
     * Returns the current selection mask.
     * @returns {Object|null}
     */
    getSelection() {
        return this.currentSelection;
    }

    _dispatchChange() {
        window.dispatchEvent(new CustomEvent('selectionChanged', {
            detail: this.currentSelection
        }));
    }
}
