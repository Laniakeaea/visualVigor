
import { ToolUtils } from '../ToolUtils.js';
import { BitmapCommand } from '../../Edit/Commands/BitmapCommand.js';

export class ExposureTool {
    constructor() {
        this.id = 'toolAdjustExposure';
        this.options = { 
            exposure: 0, // -100 to 100
            apply: () => this.applyToLayer()
        };

        // Persistent Listener for Project Switching
        window.addEventListener('projectActivated', (e) => {
            const project = e.detail;
            if (!project) {
                 // No active project -> Reset
                this.options.exposure = 0;
                this.applyExposure(0);
                 if (window.toolSystem && window.toolSystem.activeToolId === this.id) {
                     window.dispatchEvent(new CustomEvent('toolOptionsUpdated'));
                }
                return;
            }

            if (project && project.settings && project.settings.adjustments) {
                const savedVal = project.settings.adjustments.exposure || 0;
                this.options.exposure = savedVal;
                this.applyExposure(savedVal);

                if (window.toolSystem && window.toolSystem.activeToolId === this.id) {
                     window.dispatchEvent(new CustomEvent('toolOptionsUpdated'));
                }
            }
        });
    }

    activate() {
        this.applyExposure(this.options.exposure);
    }

    deactivate() {}

    onOptionChanged(key, value) {
        if (key === 'exposure') {
            const val = parseFloat(value);
            const clamped = Math.max(-100, Math.min(100, val));
            this.options.exposure = clamped;

            if (window.projectModel && window.projectModel.data && window.projectModel.data.settings.adjustments) {
                window.projectModel.data.settings.adjustments.exposure = clamped;
            }

            this.applyExposure(clamped);
        }
    }

    applyExposure(val) {
 
        const percent = 100 + val;
        
        if (window.layoutController && window.layoutController.workspaceView) {
            // Note: This overrides 'brightness' set by BrightnessTool due to CSS key collision
            window.layoutController.workspaceView.setViewFilter(1, 'brightness', `${percent}%`);
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

        const percent = 100 + this.options.exposure;
        // Use 'brightness' filter as per applyExposure logic
        const filterStr = `brightness(${percent}%)`;

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

        this.options.exposure = 0;
        this.applyExposure(0);
        
        if (window.projectModel.data && window.projectModel.data.settings.adjustments) {
            window.projectModel.data.settings.adjustments.exposure = 0;
        }

        window.dispatchEvent(new CustomEvent('toolOptionsUpdated'));
        window.projectModel.setDirty(true);
        window.dispatchEvent(new CustomEvent('projectCanvasUpdated')); 
    }
}
