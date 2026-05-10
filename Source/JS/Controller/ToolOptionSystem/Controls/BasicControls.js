export class BooleanControl {
    static create(tool, key, value, controller) {
        const row = document.createElement('div');
        row.className = 'option-row';
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.justifyContent = 'space-between';
        row.style.marginBottom = '8px';

        const label = document.createElement('label');
        label.className = 'toggle-label';
        label.style.width = '100%';
        label.style.justifyContent = 'space-between';

        const textSpan = document.createElement('span');
        const i18nKey = `Tool.Options.${key}`;
        textSpan.textContent = window.languageManager ? (window.languageManager.t(i18nKey) !== i18nKey ? window.languageManager.t(i18nKey) : key) : key;
        textSpan.className = 'text text--muted text--small';

        const input = document.createElement('input');
        input.type = 'checkbox';
        input.className = 'toggle__input';
        input.checked = value;
        
        input.onchange = (e) => {
            tool.options[key] = e.target.checked;
            if (tool.onOptionChanged) tool.onOptionChanged(key, e.target.checked);
            // If this is the Advanced Mode toggle, refresh the UI
            if (key === 'advancedMode') {
                controller.update();
            }
        };

        const track = document.createElement('span');
        track.className = 'toggle__track';
        
        const thumb = document.createElement('span');
        thumb.className = 'toggle__thumb';
        
        track.appendChild(thumb);

        label.appendChild(textSpan);
        label.appendChild(input);
        label.appendChild(track);

        row.appendChild(label);
        return row;
    }
}

export class ActionControl {
    static create(tool, key, callback) {
        const container = document.createElement('div');
        container.className = 'option-group';
        container.style.marginBottom = '10px';

        const btn = document.createElement('button');
        btn.className = 'btn btn--secondary btn--full';
        // Capitalize first letter for fallback
        const fallback = key.charAt(0).toUpperCase() + key.slice(1);
        const i18nKey = `Tool.Options.${key}`;
        btn.textContent = window.languageManager ? (window.languageManager.t(i18nKey) !== i18nKey ? window.languageManager.t(i18nKey) : fallback) : fallback;
        
        btn.onclick = () => {
            callback();
        };

        container.appendChild(btn);
        return container;
    }
}

export class NumberControl {
    static create(tool, key, value) {
        const container = document.createElement('div');
        container.className = 'option-group';
        container.style.marginBottom = '10px';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '5px';

        // 1. Label Row
        const labelRow = document.createElement('div');
        labelRow.style.display = 'flex';
        labelRow.style.justifyContent = 'space-between';
        labelRow.style.alignItems = 'center';

        const label = document.createElement('span');
        const i18nKey = `Tool.Options.${key}`;
        label.textContent = window.languageManager ? (window.languageManager.t(i18nKey) !== i18nKey ? window.languageManager.t(i18nKey) : key) : key;
        label.className = 'text text--muted text--small';
        labelRow.appendChild(label);

        container.appendChild(labelRow);

        // 2. Slider Combo
        const combo = document.createElement('div');
        combo.className = 'slider-combo';

        // Determine Range
        let min = 0;
        let max = 100;
        let step = 1;
        let useSlider = true;

        if (key === 'size') {
            min = 1;
            max = 100;
            step = 1;
        } else if (key === 'sampleSize') {
            min = 1;
            max = 31;
            step = 2;
        } else if (key === 'tolerance' || key === 'threshold') {
            min = 0;
            max = 255;
            step = 1;
        } else if (key === 'opacity') {
            min = 0;
            max = 100;
            step = 1;
        } else if (key === 'brightness' || key === 'contrast' || key === 'exposure' || key === 'temperature') {
            min = -100;
            max = 100;
            step = 1;
        } else if (key === 'gamma' || key === 'red' || key === 'green' || key === 'blue') {
            min = 0.1;
            max = 3.0;
            step = 0.1;
        } else if (key === 'strength') {
            min = 0;
            max = 100;
            step = 1;
        } else if (key === 'sides') {
            min = 3;
            max = 20;
            step = 1;
        } else if (key === 'strokeWidth') {
            min = 1;
            max = 50;
            step = 0.5;
        } else if (key === 'angle') {
            min = 0;
            max = 360;
            step = 1;
        } else if (key === 'x' || key === 'y' || key === 'width' || key === 'height') {
            // Dimensions - No Slider, Large Range
            min = -100000;
            max = 100000;
            step = 1;
            useSlider = false;
        } else {
            // Assume 0-1 factor for other properties like smoothing, thinning
            min = 0;
            max = 1;
            step = 0.01;
        }

        // Slider
        let slider;
        if (useSlider) {
            slider = document.createElement('input');
            slider.type = 'range';
            slider.className = 'slider';
            slider.min = min;
            slider.max = max;
            slider.step = step;
            slider.value = value;
        }

        // Number Input
        const input = document.createElement('input');
        input.type = 'number';
        input.className = 'text-input text-input--field';
        input.min = min;
        input.max = max;
        input.step = step;
        input.value = value;
        input.style.width = useSlider ? '60px' : '100%'; // Full width if no slider
        input.style.flex = useSlider ? '0 0 60px' : '1';

        // Sync Logic
        const updateProgress = (val) => {
            if (!useSlider) return;
            const percentage = ((val - min) / (max - min)) * 100;
            slider.style.setProperty('--slider-progress', `${percentage}%`);
        };

        // Init progress
        updateProgress(value);

        if (useSlider) {
            slider.oninput = (e) => {
                const val = parseFloat(e.target.value);
                input.value = val;
                tool.options[key] = val;
                updateProgress(val);
                // Prefer onOptionInput for live preview, fallback to onOptionChanged
                if (tool.onOptionInput) {
                    tool.onOptionInput(key, val);
                } else if (tool.onOptionChanged) {
                    tool.onOptionChanged(key, val);
                }
            };

            slider.onchange = (e) => {
                const val = parseFloat(e.target.value);
                // On commit (release), call onOptionChanged
                if (tool.onOptionChanged) tool.onOptionChanged(key, val);
            };
        }

        input.onchange = (e) => {
            let val = parseFloat(e.target.value);
            if (val < min) val = min;
            if (val > max) val = max;
            
            input.value = val;
            if (useSlider) {
                slider.value = val;
                updateProgress(val);
            }
            tool.options[key] = val;
            if (tool.onOptionChanged) tool.onOptionChanged(key, val);
        };

        if (useSlider) {
            combo.appendChild(slider);
        }
        combo.appendChild(input);
        container.appendChild(combo);

        return container;
    }
}

export class SelectControl {
    static create(tool, key, value, controller) {
        if (key === 'mode' || key === 'type' || key === 'shape') {
            return this._createSegmented(tool, key, value, controller);
        } else {
            return this._createSelect(tool, key, value);
        }
    }

    static _createSegmented(tool, key, value, controller) {
        const container = document.createElement('div');
        container.className = 'option-group';
        container.style.marginBottom = '10px';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '5px';

        // Label
        const label = document.createElement('span');
        const i18nKey = `Tool.Options.${key}`;
        label.textContent = window.languageManager ? (window.languageManager.t(i18nKey) !== i18nKey ? window.languageManager.t(i18nKey) : key) : key;
        label.className = 'text text--muted text--small';
        container.appendChild(label);

        // Segmented Button
        const segBtn = document.createElement('div');
        segBtn.className = 'segmented-btn';
        segBtn.style.width = '100%';

        const btnContainer = document.createElement('div');
        btnContainer.className = 'segmented-btn__container';
        
        const mask = document.createElement('div');
        mask.className = 'segmented-btn__mask';
        
        const track = document.createElement('div');
        track.className = 'segmented-btn__track';
        
        let options = [];
        if (key === 'mode') {
            if (tool.id === 'toolBitmapGradient') {
                options = ['fg-transparent', 'fg-bg'];
            } else if (tool.id === 'toolBitmapPinch') {
                options = ['pinch', 'bulge'];
            } else if (tool.id === 'toolVectorSelect') {
                options = ['transform', 'node'];
            } else if (tool.id === 'toolVectorFreeForm') {
                options = ['freehand', 'polyline'];
            } else if (tool.id === 'toolAdjustToolBox') {
                options = ['none', 'binary', 'edge'];
            } else {
                options = ['new', 'add', 'subtract', 'intersect'];
            }
        } else if (key === 'type') {
            options = ['linear', 'radial'];
        } else if (key === 'shape') {
            options = ['rectangle', 'ellipse', 'polygon'];
        } else {
            options = [value];
        }
        
        track.style.setProperty('--seg-count', options.length);

        const updateVisuals = (index) => {
            const percent = 100 / options.length;
            mask.style.width = `calc(${percent}% - 4px)`;
            mask.style.left = `calc(${percent * index}% + 2px)`;
            
            Array.from(track.children).forEach((child, i) => {
                if (i === index) child.classList.add('is-active');
                else child.classList.remove('is-active');
            });
        };

        const updateSelection = (index) => {
            updateVisuals(index);
            tool.options[key] = options[index];
            if (tool.onOptionChanged) tool.onOptionChanged(key, options[index]);
            
            // Refresh UI if shape changes (to show/hide sides)
            if (key === 'shape') {
                controller.update();
            }
        };

        options.forEach((opt, index) => {
            const btn = document.createElement('button');
            btn.className = 'segmented-btn__item';
            
            // Use short keys for mode
            let labelText = opt;
            if (key === 'mode') {
                const shortKey = `Tool.Options.mode_${opt}`;
                labelText = window.languageManager ? (window.languageManager.t(shortKey) !== shortKey ? window.languageManager.t(shortKey) : opt) : opt;
            } else {
                const optKey = `Tool.Options.${opt}`;
                labelText = window.languageManager ? (window.languageManager.t(optKey) !== optKey ? window.languageManager.t(optKey) : opt) : opt;
            }
            
            btn.textContent = labelText;
            btn.onclick = () => updateSelection(index);
            track.appendChild(btn);
            
            if (opt === value) {
                setTimeout(() => updateVisuals(index), 0);
            }
        });

        btnContainer.appendChild(mask);
        btnContainer.appendChild(track);
        segBtn.appendChild(btnContainer);
        container.appendChild(segBtn);
        
        return container;
    }

    static _createSelect(tool, key, value) {
        const container = document.createElement('div');
        container.className = 'option-group';
        container.style.marginBottom = '10px';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '5px';

        // Label
        const label = document.createElement('span');
        const i18nKey = `Tool.Options.${key}`;
        label.textContent = window.languageManager ? (window.languageManager.t(i18nKey) !== i18nKey ? window.languageManager.t(i18nKey) : key) : key;
        label.className = 'text text--muted text--small';
        container.appendChild(label);

        // Select
        const select = document.createElement('select');
        select.className = 'text-input'; // Reuse text input style
        select.style.width = '100%';
        
        // Define options based on key
        let options = [];
        if (key === 'shape') {
            options = ['rectangle', 'ellipse'];
        } else if (key === 'mode') {
            options = ['new', 'add', 'subtract', 'intersect'];
        } else {
            options = [value]; // Fallback
        }

        options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt;
            const optKey = `Tool.Options.${opt}`;
            option.textContent = window.languageManager ? (window.languageManager.t(optKey) !== optKey ? window.languageManager.t(optKey) : opt) : opt;
            if (opt === value) option.selected = true;
            select.appendChild(option);
        });

        select.onchange = (e) => {
            tool.options[key] = e.target.value;
            if (tool.onOptionChanged) tool.onOptionChanged(key, e.target.value);
        };

        container.appendChild(select);
        return container;
    }
}
