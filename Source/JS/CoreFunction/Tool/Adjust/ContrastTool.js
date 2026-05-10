
import { ToolUtils } from '../ToolUtils.js';
import { BitmapCommand } from '../../Edit/Commands/BitmapCommand.js';

export class ContrastTool {
    constructor() {
        this.id = 'toolAdjustContrast';
        this.options = { 
            contrast: 0, // -100 to 100
            apply: () => this.applyToLayer()
        };

        // Listen for Project Switching
        window.addEventListener('projectActivated', (e) => {
            if (!e.detail) {
                // No active project -> Reset
                this.options.contrast = 0;
                this.applyContrast(0);
                 if (window.toolSystem && window.toolSystem.activeToolId === this.id) {
                     window.dispatchEvent(new CustomEvent('toolOptionsUpdated'));
                }
                return;
            }
            if (e.detail && e.detail.settings && e.detail.settings.adjustments) {
                const savedVal = e.detail.settings.adjustments.contrast || 0;
                this.options.contrast = savedVal;
                
                if (window.toolSystem && window.toolSystem.activeToolId === this.id) {
                     window.dispatchEvent(new CustomEvent('toolOptionsUpdated'));
                }
                this.applyContrast(savedVal);
            }
        });
    }

    activate() {
        this.applyContrast(this.options.contrast);
    }

    deactivate() {}

    onOptionChanged(key, value) {
        if (key === 'contrast') {
            const val = parseFloat(value);
            const clamped = Math.max(-100, Math.min(100, val));
            this.options.contrast = clamped;

            if (window.projectModel && window.projectModel.data && window.projectModel.data.settings.adjustments) {
                window.projectModel.data.settings.adjustments.contrast = clamped;
            }

            this.applyContrast(clamped);
        }
    }

    applyContrast(val) {
        // -100 -> 0%
        // 0 -> 100%
        // 100 -> 200%
        const percent = 100 + val;
        
        if (window.layoutController && window.layoutController.workspaceView) {
            window.layoutController.workspaceView.setViewFilter(1, 'contrast', `${percent}%`);
        }
    }

    applyToLayer() {
        if (!window.projectModel) return;
        
        const canvas = window.projectModel.getActiveCanvas();
        if (!canvas) {
            alert(window.languageManager ? window.languageManager.t('Popup.Dialog.Common.SelectLayerAlert') : 'Please select a bitmap layer.');
            return;
        }

        // History: Old Data
        const originalCtx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        const oldData = originalCtx.getImageData(0, 0, width, height);

        const percent = 100 + this.options.contrast;
        const filterStr = `contrast(${percent}%)`;

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const ctx = tempCanvas.getContext('2d');
        
        ctx.filter = filterStr;
        ctx.drawImage(canvas, 0, 0);
        ctx.filter = 'none';

        // History: New Data
        const newData = ctx.getImageData(0, 0, width, height);
        originalCtx.putImageData(newData, 0, 0);

        // Add Command
        const layerId = window.projectModel.selectedLayerId;
        const frameIndex = window.projectModel.getCurrentFrame();
        if (window.editSystem) {
             const command = new BitmapCommand(layerId, oldData, newData, 0, 0, frameIndex);
             window.editSystem.addCommand(command);
        }

        this.options.contrast = 0;
        this.applyContrast(0);
        
        if (window.projectModel.data && window.projectModel.data.settings.adjustments) {
            window.projectModel.data.settings.adjustments.contrast = 0;
        }

        window.dispatchEvent(new CustomEvent('toolOptionsUpdated'));
        window.projectModel.setDirty(true);
        window.dispatchEvent(new CustomEvent('projectCanvasUpdated')); 
    }
}
