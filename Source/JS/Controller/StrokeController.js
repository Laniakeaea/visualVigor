/* =========================================
   Stroke Controller
   ========================================= */

import { ElementController } from './ElementController.js';

export class StrokeController {
    constructor() {
        this.width = 1;
        this.container = this._createView();
        this._bindEvents();
    }

    static create() {
        const instance = new StrokeController();
        return instance.container;
    }

    _createView() {
        const container = document.createElement('div');
        container.className = 'val-control';
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        container.style.gap = '10px';
        container.style.padding = '10px 0';

        // Label
        const label = document.createElement('span');
        label.className = 'val-control__label';
        label.textContent = 'Width';
        label.style.minWidth = '50px';
        label.style.fontSize = '12px';
        label.style.color = '#ccc';

        // Input Wrapper
        const inputWrap = document.createElement('div');
        inputWrap.style.flex = '1';
        inputWrap.style.display = 'flex';
        inputWrap.style.alignItems = 'center';
        inputWrap.style.gap = '8px';

        // Slider
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = '0';
        slider.max = '50';
        slider.step = '0.5';
        slider.value = this.width;
        slider.className = 'val-control__slider';
        slider.style.flex = '1';
        slider.style.cursor = 'pointer';

        // Number Input
        const input = document.createElement('input');
        input.type = 'number';
        input.min = '0';
        input.step = '0.5';
        input.value = this.width;
        input.className = 'val-control__input';
        input.style.width = '60px';
        input.style.height = '24px';
        input.style.padding = '0 6px';
        input.style.background = '#2a2a2a';
        input.style.border = '1px solid #444';
        input.style.borderRadius = '3px';
        input.style.color = '#fff';
        input.style.fontSize = '12px';

        inputWrap.appendChild(slider);
        inputWrap.appendChild(input);

        container.appendChild(label);
        container.appendChild(inputWrap);

        this.input = input;
        this.slider = slider;

        return container;
    }

    _bindEvents() {
        const update = (val, isPreview = false) => {
            const num = parseFloat(val);
            if (!isNaN(num)) {
                this.width = num;
                this.input.value = num;
                this.slider.value = num;
                
                if (window.projectModel) {
                     window.projectModel.updateSetting('strokeWidth', this.width, isPreview);
                }
            }
        };

        this.input.addEventListener('change', (e) => update(e.target.value, false));
        this.input.addEventListener('input', (e) => {
            // Optional: Live update logic if needed
        });

        this.slider.addEventListener('input', (e) => update(e.target.value, true));
        this.slider.addEventListener('change', (e) => update(e.target.value, false));

        window.addEventListener('elementsSelected', (e) => {
             const ids = e.detail.ids;
             if (!ids || ids.length === 0) return;
             
             // Get first element to sync for now
             const firstId = ids[ids.length - 1]; // "Active" one is usually last
             const el = window.projectModel.getVectorElementById(firstId);
             if (el && el.properties && el.properties.strokeWidth !== undefined) {
                 const w = parseFloat(el.properties.strokeWidth);
                 this.input.value = w;
                 this.slider.value = Math.min(w, 50); // Clamp slider for display
                 this.width = w;
             }
        });
    }
}
