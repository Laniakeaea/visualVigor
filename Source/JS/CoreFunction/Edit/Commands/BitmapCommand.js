/* =========================================
   Bitmap Command
   ========================================= */

export class BitmapCommand {
    /**
     * @param {string} layerId 
     * @param {ImageData} oldImageData 
     * @param {ImageData} newImageData 
     * @param {number} x 
     * @param {number} y 
     * @param {number} frameIndex
     */
    constructor(layerId, oldImageData, newImageData, x, y, frameIndex = 0) {
        this.layerId = layerId;
        this.oldImageData = oldImageData;
        this.newImageData = newImageData;
        this.x = x;
        this.y = y;
        this.frameIndex = frameIndex;
    }

    _getCanvas() {
        const layer = window.projectModel.getLayerById(this.layerId);
        if (layer && layer.frames && layer.frames[this.frameIndex]) {
            return layer.frames[this.frameIndex];
        }
        return null;
    }

    undo() {
        const canvas = this._getCanvas();
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.putImageData(this.oldImageData, this.x, this.y);
            window.dispatchEvent(new CustomEvent('projectLayersChanged'));
        }
    }

    redo() {
        const canvas = this._getCanvas();
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.putImageData(this.newImageData, this.x, this.y);
            window.dispatchEvent(new CustomEvent('projectLayersChanged'));
        }
    }
}
