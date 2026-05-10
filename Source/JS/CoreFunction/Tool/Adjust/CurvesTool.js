
import { ToolUtils } from '../ToolUtils.js';
import { BitmapCommand } from '../../Edit/Commands/BitmapCommand.js';

export class ColorCurveTool {
    constructor() {
        this.id = 'toolAdjustColorCurve';
        // Format matches CurveEditor.js expectation
        this.defaultCurve = {
            all: [{x: 0, y: 0}, {x: 1, y: 1}],
            red: [{x: 0, y: 0}, {x: 1, y: 1}],
            green: [{x: 0, y: 0}, {x: 1, y: 1}],
            blue: [{x: 0, y: 0}, {x: 1, y: 1}]
        };
        this.options = { 
            curve: JSON.parse(JSON.stringify(this.defaultCurve)),
            apply: () => this.applyToLayer()
        };
        this.filterId = 'svg-filter-curves';
        this.ensureFilterExists();

        // Persistent Listener
        window.addEventListener('projectActivated', (e) => {
            const project = e.detail;
            if (!project) {
                 // No active project -> Reset
                this.options.curve = JSON.parse(JSON.stringify(this.defaultCurve));
                this.applyCurves();
                 if (window.toolSystem && window.toolSystem.activeToolId === this.id) {
                     window.dispatchEvent(new CustomEvent('toolOptionsUpdated'));
                }
                return;
            }

            if (project && project.settings && project.settings.adjustments) {
                // If saved value exists, use it. Otherwise use Default.
                // We must clone to avoid reference issues.
                const savedVal = project.settings.adjustments.curve 
                    ? JSON.parse(JSON.stringify(project.settings.adjustments.curve))
                    : JSON.parse(JSON.stringify(this.defaultCurve));
                
                this.options.curve = savedVal;
                this.applyCurves();

                if (window.toolSystem && window.toolSystem.activeToolId === this.id) {
                     window.dispatchEvent(new CustomEvent('toolOptionsUpdated'));
                }
            }
        });
    }

    activate() {
        this.ensureFilterExists();
        this.applyCurves();
    }

    deactivate() {
        // Keep filter active
    }

    ensureFilterExists() {
        if (document.getElementById(this.filterId)) return;

        const svgNS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(svgNS, "svg");
        svg.style.position = 'absolute';
        svg.style.width = '0';
        svg.style.height = '0';
        svg.style.pointerEvents = 'none';

        const filter = document.createElementNS(svgNS, "filter");
        filter.setAttribute("id", this.filterId);
        filter.setAttribute("color-interpolation-filters", "sRGB");

        const transfer = document.createElementNS(svgNS, "feComponentTransfer");
        
        ['R', 'G', 'B'].forEach(channel => {
            const func = document.createElementNS(svgNS, `feFunc${channel}`);
            func.setAttribute('type', 'table');
            // Values 0 1 default (Linear)
            func.setAttribute('tableValues', '0 1');
            transfer.appendChild(func);
        });

        filter.appendChild(transfer);
        svg.appendChild(filter);
        document.body.appendChild(svg);
    }

    onOptionChanged(key, value) {
        if (key === 'curve') {
            // Value is passed by reference usually from CurveEditor, but let's be safe.
            // this.options.curve is already updated by the UI potentially? 
            // Usually ToolOptionPanel calls tool.onOptionChanged(key, newValue)
            this.options.curve = value;

            if (window.projectModel && window.projectModel.data && window.projectModel.data.settings.adjustments) {
                 // Save Deep Copy
                 window.projectModel.data.settings.adjustments.curve = JSON.parse(JSON.stringify(value));
            }

            this.applyCurves();
        }
    }

    applyCurves() {
        const filter = document.getElementById(this.filterId);
        if (!filter) return;
        
        const curveData = this.options.curve;
        if (!curveData) return;


        const generateTable = (channelPoints, masterPoints) => {
            const steps = 256;
            const values = [];
            
            for (let i = 0; i < steps; i++) {
                let x = i / (steps - 1);
                
                // 1. Channel Map
                let y1 = this.interpolate(x, channelPoints);
                
                // 2. Master Map (Input is the result of Channel Map)
                let y2 = this.interpolate(y1, masterPoints);
                
                // Clamp
                y2 = Math.max(0, Math.min(1, y2));
                values.push(y2.toFixed(3));
            }
            return values.join(' ');
        };

        const master = curveData.all;
        const channels = { 'R': curveData.red, 'G': curveData.green, 'B': curveData.blue };

        Object.keys(channels).forEach(ch => {
            const func = filter.querySelector(`feFunc${ch}`);
            if (func) {
                const tableStr = generateTable(channels[ch], master);
                func.setAttribute('tableValues', tableStr);
            }
        });

        if (window.layoutController && window.layoutController.workspaceView) {
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

        // Reset
        this.options.curve = JSON.parse(JSON.stringify(this.defaultCurve));
        this.applyCurves();
        
        if (window.projectModel.data && window.projectModel.data.settings.adjustments) {
            window.projectModel.data.settings.adjustments.curve = JSON.parse(JSON.stringify(this.defaultCurve));
        }

        window.dispatchEvent(new CustomEvent('toolOptionsUpdated'));
        window.projectModel.setDirty(true);
        window.dispatchEvent(new CustomEvent('projectCanvasUpdated')); 
    }

    interpolate(x, points) {
        // Simple Linear Interpolation
        // points assumed sorted by x
        
        if (x <= points[0].x) return points[0].y;
        if (x >= points[points.length - 1].x) return points[points.length - 1].y;
        
        for (let i = 0; i < points.length - 1; i++) {
            const p0 = points[i];
            const p1 = points[i+1];
            
            if (x >= p0.x && x <= p1.x) {
                const t = (x - p0.x) / (p1.x - p0.x);
                return p0.y + t * (p1.y - p0.y);
            }
        }
        return x; // Should not reach
    }
}
