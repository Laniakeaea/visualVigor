export class ToolUtils {
    /**
     * Validates if there is an active project and an active bitmap layer.
     * @param {boolean} showWarning - Whether to show a warning message if validation fails.
     * @returns {HTMLCanvasElement|null} - The active canvas if valid, null otherwise.
     */
    static validateActiveLayer(showWarning = true) {
        if (!window.projectModel || !window.projectModel.data) {
            return null;
        }

        const canvas = window.projectModel.getActiveCanvas();
        if (!canvas) {
            if (showWarning && window.infoSystem) {
                // Try to determine why it failed for better error message
                if (!window.projectModel.selectedLayerId) {
                    window.infoSystem.showInfo('warning', 'Layout.InfoBar.InfoContent.noLayerSelected', 2000);
                } else {
                    const layer = window.projectModel.getLayerById(window.projectModel.selectedLayerId);
                    if (layer && layer.type !== 'bitmap') {
                        window.infoSystem.showInfo('warning', 'Layout.InfoBar.InfoContent.layerNotBitmap', 2000);
                    } else {
                        window.infoSystem.showInfo('warning', 'Layout.InfoBar.InfoContent.noActiveBitmapLayer', 2000);
                    }
                }
            }
            return null;
        }

        return canvas;
    }

    /**
     * Applies the current selection mask to the target image data.
     * Restores pixels from oldData where the mask is 0 (unselected).
     * @param {ImageData} targetData - The new image data (modified).
     * @param {ImageData} oldData - The original image data (backup).
     * @param {number} x - The x offset of the image data.
     * @param {number} y - The y offset of the image data.
     */
    static applySelectionMask(targetData, oldData, x = 0, y = 0) {
        if (!window.selectionManager || !window.selectionManager.currentSelection) {
            return;
        }

        const sel = window.selectionManager.currentSelection;
        const mask = sel.mask;
        const selW = sel.width;
        const selH = sel.height;

        // Ensure dimensions match active canvas/artboard
        // We assume targetData and oldData have same dimensions
        const w = targetData.width;
        const h = targetData.height;
        
        const dst = targetData.data;
        const src = oldData.data;

        // Optimization: If mask is all 1s, do nothing? (SelectionManager doesn't track this flag yet)

        for (let row = 0; row < h; row++) {
            const globalY = y + row;
            if (globalY < 0 || globalY >= selH) continue;

            for (let col = 0; col < w; col++) {
                const globalX = x + col;
                if (globalX < 0 || globalX >= selW) continue;

                const maskIndex = globalY * selW + globalX;
                
                // If not selected (0), restore original pixel
                if (mask[maskIndex] === 0) {
                    const i = (row * w + col) * 4;
                    dst[i] = src[i];
                    dst[i+1] = src[i+1];
                    dst[i+2] = src[i+2];
                    dst[i+3] = src[i+3];
                }
            }
        }
    }
}
