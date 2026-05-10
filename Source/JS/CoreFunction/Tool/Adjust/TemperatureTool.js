
import { ToolUtils } from '../ToolUtils.js';
import { BitmapCommand } from '../../Edit/Commands/BitmapCommand.js';

export class TemperatureTool {
    constructor() {
        this.id = 'toolAdjustTemperature';
        this.options = { 
            temperature: 0, // -100 (Cool) to 100 (Warm)
            apply: () => this.applyToLayer()
        };
        this.filterId = 'svg-filter-temperature';
        this.ensureFilterExists();

        // Persistent Listener
        window.addEventListener('projectActivated', (e) => {
            const project = e.detail;
            if (!project) {
                 // No active project -> Reset
                this.options.temperature = 0;
                this.applyTemperature(0);
                 if (window.toolSystem && window.toolSystem.activeToolId === this.id) {
                     window.dispatchEvent(new CustomEvent('toolOptionsUpdated'));
                }
                return;
            }
            if (project && project.settings && project.settings.adjustments) {
                const savedVal = project.settings.adjustments.temperature || 0;
                this.options.temperature = savedVal;
                this.applyTemperature(savedVal);

                if (window.toolSystem && window.toolSystem.activeToolId === this.id) {
                     window.dispatchEvent(new CustomEvent('toolOptionsUpdated'));
                }
            }
        });
    }

    activate() {
        this.ensureFilterExists();
        this.applyTemperature(this.options.temperature);
    }

    deactivate() {
        // We do not remove the filter effect on deactivate, allowing persistence.
    }

    ensureFilterExists() {
        if (document.getElementById(this.filterId)) return;

        // Create SVG Filter Container hidden
        const svgNS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(svgNS, "svg");
        svg.style.position = 'absolute';
        svg.style.width = '0';
        svg.style.height = '0';
        svg.style.pointerEvents = 'none';

        const filter = document.createElementNS(svgNS, "filter");
        filter.setAttribute("id", this.filterId);
        filter.setAttribute("color-interpolation-filters", "sRGB");

        const feColorMatrix = document.createElementNS(svgNS, "feColorMatrix");
        feColorMatrix.setAttribute("type", "matrix");
        feColorMatrix.setAttribute("values", "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0"); // Identity
        
        filter.appendChild(feColorMatrix);
        svg.appendChild(filter);
        document.body.appendChild(svg);
        
        this.filterElement = feColorMatrix;
    }

    onOptionChanged(key, value) {
        if (key === 'temperature') {
            const val = parseFloat(value);
            const clamped = Math.max(-100, Math.min(100, val));
            this.options.temperature = clamped;

            if (window.projectModel && window.projectModel.data && window.projectModel.data.settings.adjustments) {
                window.projectModel.data.settings.adjustments.temperature = clamped;
            }

            this.applyTemperature(clamped);
        }
    }

    applyTemperature(val) {
        if (!this.filterElement && document.getElementById(this.filterId)) {
            this.filterElement = document.getElementById(this.filterId).querySelector('feColorMatrix');
        }
        if (!this.filterElement) return;

        // Matrix Logic:
        // Warm (Positive): Boost Red, Reduce Blue slightly
        // Cool (Negative): Boost Blue, Reduce Red slightly
        
        // Normalized intensity 0.0 - 0.2 seems enough for "tinting"
        const intensity = val / 100; 
        
        let r = 1;
        let g = 1;
        let b = 1;

        if (intensity > 0) {
            // Warm: Add Red, Remove Blue
            r = 1 + (intensity * 0.4);
            g = 1 + (intensity * 0.05);
            b = 1 - (intensity * 0.2);
        } else {
            // Cool: Add Blue, Remove Red
            // intensity is negative
            r = 1 + (intensity * 0.2); // reduces red
            g = 1;
            b = 1 - (intensity * 0.4); // adds blue (doubled negative)
        }

        const matrix = `
            ${r} 0 0 0 0
            0 ${g} 0 0 0
            0 0 ${b} 0 0
            0 0 0 1 0
        `;
        
        this.filterElement.setAttribute('values', matrix);

        if (window.layoutController && window.layoutController.workspaceView) {
            // Key 'url' maps to url(...) syntax in WorkspaceView
            window.layoutController.workspaceView.setViewFilter(1, 'url', `#${this.filterId}`);
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

        const filterStr = `url('#${this.filterId}')`;

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

        this.options.temperature = 0;
        this.applyTemperature(0);
        
        if (window.projectModel.data && window.projectModel.data.settings.adjustments) {
            window.projectModel.data.settings.adjustments.temperature = 0;
        }

        window.dispatchEvent(new CustomEvent('toolOptionsUpdated'));
        window.projectModel.setDirty(true);
        window.dispatchEvent(new CustomEvent('projectCanvasUpdated')); 
    }
}
