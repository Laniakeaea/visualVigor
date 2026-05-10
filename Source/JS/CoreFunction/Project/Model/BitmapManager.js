import { LAYER_TYPES } from '../projectModel.js';

export class BitmapManager {
    constructor(model) {
        this.model = model;
    }

    get data() { return this.model.data; }

    addLayer(name) {
        if (!this.data) return null;
        const layerName = name || this._generateNewLayerName();
        const id = this.model._generateUniqueId('layer_bmp_');
        const newLayer = {
            id: id,
            type: LAYER_TYPES.BITMAP,
            name: layerName,
            visible: true,
            locked: false,
            blendingMode: 'normal',
            startFrame: 0,
            duration: this.data.settings.duration,
            frames: {}
        };
        this.data.timeline.bitmapLayers.push(newLayer);
        this.model._dispatchLayersChanged();
        return newLayer;
    }

    removeLayer(id) {
        if (!this.data) return;
        const index = this.data.timeline.bitmapLayers.findIndex(l => l.id === id);
        if (index > -1) {
            this.data.timeline.bitmapLayers.splice(index, 1);
            this.model._dispatchLayersChanged();
        }
    }

    moveLayer(id, direction) {
        if (!this.data) return;
        const layers = this.data.timeline.bitmapLayers;
        const index = layers.findIndex(l => l.id === id);
        if (index === -1) return;

        const newIndex = index + direction;
        this.reorderLayer(id, newIndex);
    }

    reorderLayer(id, newIndex) {
        if (!this.data) return;
        const layers = this.data.timeline.bitmapLayers;
        const oldIndex = layers.findIndex(l => l.id === id);
        if (oldIndex === -1) return;

        const layer = layers[oldIndex];

        // Clamp index
        if (newIndex < 0) newIndex = 0;
        if (newIndex >= layers.length) newIndex = layers.length - 1;

        if (oldIndex === newIndex) return;

        layers.splice(oldIndex, 1);
        layers.splice(newIndex, 0, layer);
        this.model._dispatchLayersChanged();
    }

    duplicateLayer(id) {
        if (!this.data) return;
        const layers = this.data.timeline.bitmapLayers;
        const index = layers.findIndex(l => l.id === id);
        if (index === -1) return;

        const source = layers[index];
        const newLayer = typeof structuredClone === 'function' 
            ? structuredClone(source) 
            : JSON.parse(JSON.stringify(source));
            
        newLayer.id = this.model._generateUniqueId('layer_bmp_');
        newLayer.name = this._generateCopyLayerName(source.name);
        newLayer.undeletable = false;
        delete newLayer.uncopyable;

        layers.splice(index + 1, 0, newLayer);
        this.model._dispatchLayersChanged();
        return newLayer;
    }

    /* Internal Helpers */

    _generateNewLayerName() {
        if (!this.data) return 'Layer 1';
        const layers = this.data.timeline.bitmapLayers;
        let maxNum = 0;
        const regex = /^Layer (\d+)$/;

        for (const layer of layers) {
            const match = layer.name.match(regex);
            if (match) {
                const num = parseInt(match[1], 10);
                if (num > maxNum) {
                    maxNum = num;
                }
            }
        }
        return `Layer ${maxNum + 1}`;
    }

    _generateCopyLayerName(originalName) {
        if (!this.data) return originalName + ' Copy';
        let baseName = originalName;
        const copyRegex = /^(.*) Copy(?: (\d+))?$/;
        const match = originalName.match(copyRegex);
        
        if (match) {
            baseName = match[1];
        }

        const layers = this.data.timeline.bitmapLayers;
        const names = new Set(layers.map(l => l.name));
        
        let candidate = `${baseName} Copy`;
        if (!names.has(candidate)) return candidate;
        
        let i = 2;
        while (true) {
            candidate = `${baseName} Copy ${i}`;
            if (!names.has(candidate)) return candidate;
            i++;
        }
    }
}
