import { ToolUtils } from '../ToolUtils.js';
import { BitmapCommand } from '../../Edit/Commands/BitmapCommand.js';

export class BrightnessTool {
    constructor() {
        this.id = 'toolAdjustBrightness';
        this.options = { 
            brightness: 0, // -100 to 100
            apply: () => this.applyToLayer()
        };
        
        // Listen for Project Switching
        window.addEventListener('projectActivated', (e) => {
            if (!e.detail) {
                // No active project -> Reset
                this.options.brightness = 0;
                this.applyBrightness(0);
                 if (window.toolSystem && window.toolSystem.activeToolId === this.id) {
                     window.dispatchEvent(new CustomEvent('toolOptionsUpdated'));
                }
                return;
            }
            if (e.detail && e.detail.settings && e.detail.settings.adjustments) {
                const savedVal = e.detail.settings.adjustments.brightness || 0;
                this.options.brightness = savedVal;
                // Determine if we should trigger UI update?
                // If this tool is active, we should refresh the tool options panel
                if (window.toolSystem && window.toolSystem.activeToolId === this.id) {
                     window.dispatchEvent(new CustomEvent('toolOptionsUpdated'));
                }
                // Apply visual filter regardless (to keep view consistent)
                this.applyBrightness(savedVal); 
            }
        });
    }

    activate() {
        // This tool acts as a View Filter, not a Canvas Editor.
        // No specific layer activation needed.
        if (!window.layoutController || !window.layoutController.workspaceView) {
            console.warn("BrightnessTool: LayoutController or WorkspaceView not accessible.");
        }
    }

    deactivate() {
        // Filter persists after tool deactivation to allow drawing on "Filtered" view.
    }

    onOptionChanged(key, value) {
        if (key === 'brightness') {
            const val = parseFloat(value);
            // Clamp
            const clamped = Math.max(-100, Math.min(100, val));
            this.options.brightness = clamped;
            
            // Save to Project Model
            if (window.projectModel && window.projectModel.data && window.projectModel.data.settings.adjustments) {
                window.projectModel.data.settings.adjustments.brightness = clamped;
            }

            this.applyBrightness(clamped);
        }
    }

    applyBrightness(val) {
        // Map slider (-100 to 100) to CSS brightness (0% to 200%)
        // 0 -> 100% (Normal)
        // 100 -> 200% (Double Brightness)
        // -100 -> 0% (Black)
        const percent = 100 + val;
        
        // Construct CSS Filter String
        const filterVal = `${percent}%`;

        // Apply to Secondary View (Index 1) ONLY
        if (window.layoutController && window.layoutController.workspaceView) {
            window.layoutController.workspaceView.setViewFilter(1, 'brightness', filterVal);
        }
    }

    applyToLayer() {
        if (!window.projectModel) return;
        
        // 1. Get Active Canvas
        const canvas = window.projectModel.getActiveCanvas();
        if (!canvas) {
            alert(window.languageManager ? window.languageManager.t('Popup.Dialog.Common.SelectLayerAlert') : 'Please select a bitmap layer.');
            return;
        }

        // --- Prepare History Command ---
        const originalCtx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        const oldData = originalCtx.getImageData(0, 0, width, height);

        // 2. Prepare Filter
        const percent = 100 + this.options.brightness;
        const filterStr = `brightness(${percent}%)`;

        // 3. Bake Filter
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const ctx = tempCanvas.getContext('2d');
        
        ctx.filter = filterStr;
        ctx.drawImage(canvas, 0, 0);
        ctx.filter = 'none';

        // 4. Update Original
        const newData = ctx.getImageData(0, 0, width, height);
        originalCtx.putImageData(newData, 0, 0);

        // --- Add to History ---
        const layerId = window.projectModel.selectedLayerId;
        const frameIndex = window.projectModel.getCurrentFrame();
        
        if (window.editSystem) {
             const command = new BitmapCommand(layerId, oldData, newData, 0, 0, frameIndex);
             window.editSystem.addCommand(command);
        }

        // 5. Reset Tool & View
        this.options.brightness = 0;
        this.applyBrightness(0);
        
        // Sync to Project Model
        if (window.projectModel.data && window.projectModel.data.settings.adjustments) {
            window.projectModel.data.settings.adjustments.brightness = 0;
        }

        // Sync UI
        window.dispatchEvent(new CustomEvent('toolOptionsUpdated'));
        
        // 6. Notify Changes
        window.projectModel.setDirty(true);
        window.dispatchEvent(new CustomEvent('projectCanvasUpdated')); 
    }
}
