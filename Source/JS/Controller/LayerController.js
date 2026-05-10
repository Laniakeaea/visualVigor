import { LayerView } from './LayerView.js';

/* =========================================
   Layer Controller
   ========================================= */

export class LayerController {
    constructor() {
        this.clipboardLayerId = null;
        this.view = new LayerView(this);
        this._bindEvents();
    }

    /**
     * Creates the layer list component.
     * @returns {HTMLElement}
     */
    static create() {
        const instance = new LayerController();
        instance.update();
        return instance.view.getContainer();
    }

    _bindEvents() {
        window.addEventListener('projectLayersChanged', () => {
            this.update();
        });
        window.addEventListener('projectLayerSelected', () => {
            this.update();
        });
    }

    update() {
        const layerList = window.projectModel.getRenderList();
        const activeLayerId = window.projectModel.selectedLayerId;
        this.view.render(layerList, activeLayerId);
    }

    // --- Actions ---

    handleToggleVisibility(id) {
        window.projectModel.toggleLayerVisibility(id);
    }

    handleToggleLock(id) {
        window.projectModel.toggleLayerLock(id);
    }

    handleDeleteLayer(id) {
        if (!id) return;
        
        const layer = window.projectModel.getLayerById(id);

        // Check if undeletable
        if (layer && layer.undeletable) {
            const msg = window.languageManager.t('Layout.InfoBar.InfoContent.layerCannotDelete') || 'This layer cannot be deleted.';
            window.infoSystem.showInfo('warning', msg, 3000);
            return;
        }
        
        // If we get here, it's a deletable layer.
        // Currently only bitmap layers are deletable.
        if (layer) {
            window.projectModel.removeBitmapLayer(id);
            this.activeLayerId = null; // Reset selection
        }
    }

    handleSelectLayer(id) {
        this.activeLayerId = id;
        this.update();
    }

    handleAddLayer() {
        const newLayer = window.projectModel.addBitmapLayer();
        if (newLayer) {
            this.activeLayerId = newLayer.id; // Auto-select new layer
            this.update();
        }
    }

    handleMoveLayer(id, direction) {
        if (!id) return;
        window.projectModel.moveBitmapLayer(id, direction);
    }

    handleCopyLayer(id) {
        if (!id) return;

        const layer = window.projectModel.getLayerById(id);
        if (layer && layer.uncopyable) {
            const msg = window.languageManager.t('Layout.InfoBar.InfoContent.layerCannotCopy') || 'This layer cannot be copied.';
            window.infoSystem.showInfo('warning', msg, 3000);
            return;
        }

        this.clipboardLayerId = id;
        // Optional: Visual feedback
        const msg = window.languageManager.t('Layout.InfoBar.InfoContent.layerCopied') || 'Layer copied to clipboard.';
        window.infoSystem.showInfo('info', msg, 2000);
    }

    handlePasteLayer() {
        if (!this.clipboardLayerId) return;
        const newLayer = window.projectModel.duplicateBitmapLayer(this.clipboardLayerId);
        if (newLayer) {
            this.activeLayerId = newLayer.id;
            this.update();
        }
    }

    handleReorderLayer(id, newIndex) {
        window.projectModel.reorderBitmapLayer(id, newIndex);
    }

    handleSelectLayer(id) {
        window.projectModel.selectLayer(id);
    }
}
