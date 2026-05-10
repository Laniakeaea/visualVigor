import { CurveEditor } from '../../Widget/CurveEditor.js';

export class GradientControl {
    static create(tool, key, value, controller) {
        const container = document.createElement('div');
        container.className = 'option-group';
        container.style.marginBottom = '10px';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '8px';

        // Label
        const label = document.createElement('span');
        const i18nKey = `Tool.Options.${key}`;
        label.textContent = window.languageManager ? (window.languageManager.t(i18nKey) !== i18nKey ? window.languageManager.t(i18nKey) : 'Gradient Colors') : 'Gradient Colors';
        label.className = 'text text--muted text--small';
        container.appendChild(label);

        // Preview Bar
        const previewContainer = document.createElement('div');
        previewContainer.className = 'pattern-checkerboard';
        previewContainer.style.width = '100%';
        previewContainer.style.height = '24px';
        previewContainer.style.borderRadius = '10px';
        previewContainer.style.border = '1px solid var(--border-color)';
        previewContainer.style.overflow = 'hidden';
        previewContainer.style.position = 'relative';
        // Fallback background if class not loaded
        previewContainer.style.backgroundColor = '#fff';
        previewContainer.style.backgroundImage = 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)';
        previewContainer.style.backgroundSize = '10px 10px';
        previewContainer.style.backgroundPosition = '0 0, 0 5px, 5px -5px, -5px 0px';

        const previewGradient = document.createElement('div');
        previewGradient.style.width = '100%';
        previewGradient.style.height = '100%';
        
        const c1 = value.start;
        const c2 = value.end;
        const startStr = `rgba(${c1.r}, ${c1.g}, ${c1.b}, ${c1.a / 255})`;
        const endStr = `rgba(${c2.r}, ${c2.g}, ${c2.b}, ${c2.a / 255})`;
        
        previewGradient.style.background = `linear-gradient(to right, ${startStr}, ${endStr})`;
        previewContainer.appendChild(previewGradient);
        container.appendChild(previewContainer);

        // Buttons Container
        const btnContainer = document.createElement('div');
        btnContainer.style.display = 'flex';
        btnContainer.style.gap = '5px';

        // Helper to create button
        const createBtn = (target, text) => {
            const btn = document.createElement('button');
            btn.className = 'btn btn--small';
            btn.style.flex = '1';
            btn.textContent = text;
            
            // Check if active
            if (tool.activeColorTarget === target) {
                btn.classList.add('btn--primary');
            } else {
                btn.classList.add('btn--secondary');
            }

            btn.onclick = () => {
                tool.activeColorTarget = target;
                controller.update(); // Re-render to update button states
            };
            return btn;
        };

        const startBtn = createBtn('start', window.languageManager ? window.languageManager.t('Tool.Options.Gradient.Start') : 'Start');
        const endBtn = createBtn('end', window.languageManager ? window.languageManager.t('Tool.Options.Gradient.End') : 'End');

        btnContainer.appendChild(startBtn);
        btnContainer.appendChild(endBtn);
        container.appendChild(btnContainer);

        return container;
    }
}

export class StrokeControl {
    static create(tool, key, value, controller) {
        const container = document.createElement('div');
        container.className = 'option-group';
        container.style.marginBottom = '10px';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '8px';

        // Label
        const label = document.createElement('span');
        const i18nKey = `Tool.Options.${key}`;
        label.textContent = window.languageManager ? (window.languageManager.t(i18nKey) !== i18nKey ? window.languageManager.t(i18nKey) : 'Stroke') : 'Stroke';
        label.className = 'text text--muted text--small';
        container.appendChild(label);

        // Color Button
        const btn = document.createElement('button');
        btn.className = 'btn btn--small';
        btn.style.width = '100%';
        btn.style.display = 'flex';
        btn.style.alignItems = 'center';
        btn.style.justifyContent = 'space-between';
        btn.style.padding = '4px 8px';
        
        // Check active state
        const isActive = tool.activeColorTarget === 'active-stroke' || tool.activeColorTarget === 'stroke';
        if (isActive) {
            btn.classList.add('btn--primary');
        } else {
            btn.classList.add('btn--secondary');
        }

        // Color Preview Box
        const c = value.color;
        const colorBox = document.createElement('div');
        colorBox.style.width = '20px';
        colorBox.style.height = '20px';
        colorBox.style.borderRadius = '4px';
        colorBox.style.backgroundColor = `rgba(${c.r}, ${c.g}, ${c.b}, ${c.a / 255})`;
        colorBox.style.border = '1px solid rgba(0,0,0,0.1)';
        
        const btnText = document.createElement('span');
        const editKey = 'Tool.Options.EditColor';
        const editingKey = 'Tool.Options.EditingColor';
        const editText = window.languageManager ? (window.languageManager.t(editKey) !== editKey ? window.languageManager.t(editKey) : 'Edit Color') : 'Edit Color';
        const editingText = window.languageManager ? (window.languageManager.t(editingKey) !== editingKey ? window.languageManager.t(editingKey) : 'Editing Color...') : 'Editing Color...';
        
        btnText.textContent = isActive ? editingText : editText;

        btn.appendChild(btnText);
        btn.appendChild(colorBox);

        btn.onclick = () => {
            // Toggle active state
            tool.activeColorTarget = isActive ? null : 'active-stroke';
            controller.update();
        };

        container.appendChild(btn);
        return container;
    }
}

export class FillControl {
    static create(tool, key, value, controller) {
        const container = document.createElement('div');
        container.className = 'option-group';
        container.style.marginBottom = '10px';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '8px';

        const showToggle = (value.toggle !== false);

        // 1. Toggle Row (Conditiona)
        if (showToggle) {
            const toggleRow = document.createElement('div');
            toggleRow.style.display = 'flex';
            toggleRow.style.alignItems = 'center';
            toggleRow.style.justifyContent = 'space-between';

            const label = document.createElement('span');
            const i18nKey = `Tool.Options.${key}`;
            label.textContent = window.languageManager ? (window.languageManager.t(i18nKey) !== i18nKey ? window.languageManager.t(i18nKey) : 'Fill') : 'Fill';
            label.className = 'text text--muted text--small';
            
            // Toggle Switch
            const toggleLabel = document.createElement('label');
            toggleLabel.className = 'toggle-label';
            const input = document.createElement('input');
            input.type = 'checkbox';
            input.className = 'toggle__input';
            input.checked = value.enabled;
            input.onchange = (e) => {
                tool.options[key].enabled = e.target.checked;
                if (tool.onOptionChanged) tool.onOptionChanged(key, tool.options[key]);
                controller.update(); // Re-render to enable/disable color button
            };
            const track = document.createElement('span');
            track.className = 'toggle__track';
            const thumb = document.createElement('span');
            thumb.className = 'toggle__thumb';
            track.appendChild(thumb);
            toggleLabel.appendChild(input);
            toggleLabel.appendChild(track);

            toggleRow.appendChild(label);
            toggleRow.appendChild(toggleLabel);
            container.appendChild(toggleRow);
        } else {
            // No toggle, just label
            const label = document.createElement('span');
            const i18nKey = `Tool.Options.${key}`;
            label.textContent = window.languageManager ? (window.languageManager.t(i18nKey) !== i18nKey ? window.languageManager.t(i18nKey) : 'Fill') : 'Fill';
            label.className = 'text text--muted text--small';
            container.appendChild(label);
        }

        // 2. Color Button (If enabled OR toggle is hidden/forced)
        // If showToggle is false, we always show the button
        if (value.enabled || !showToggle) {
            const btn = document.createElement('button');
            btn.className = 'btn btn--small';
            btn.style.width = '100%';
            btn.style.display = 'flex';
            btn.style.alignItems = 'center';
            btn.style.justifyContent = 'space-between';
            btn.style.padding = '4px 8px';
            
            // Check active state
            const isActive = tool.activeColorTarget === 'active-fill' || tool.activeColorTarget === 'fill';
            if (isActive) {
                btn.classList.add('btn--primary');
            } else {
                btn.classList.add('btn--secondary');
            }

            // Color Preview Box
            const c = value.color;
            const colorBox = document.createElement('div');
            colorBox.style.width = '20px';
            colorBox.style.height = '20px';
            colorBox.style.borderRadius = '4px';
            
            // Show transparent/slash if disabled?
            if (!value.enabled && !showToggle) {
                 // Special styling for "No Fill" in Select Tool
                 colorBox.style.background = 'linear-gradient(45deg, transparent 48%, red 48%, red 52%, transparent 52%)';
                 colorBox.style.border = '1px solid #666';
            } else {
                 colorBox.style.backgroundColor = `rgba(${c.r}, ${c.g}, ${c.b}, ${c.a / 255})`;
                 colorBox.style.border = '1px solid rgba(0,0,0,0.1)';
            }
            
            const btnText = document.createElement('span');
            const editKey = 'Tool.Options.EditColor';
            const editingKey = 'Tool.Options.EditingColor';
            let editText = window.languageManager ? (window.languageManager.t(editKey) !== editKey ? window.languageManager.t(editKey) : 'Edit Color') : 'Edit Color';
            
            if (!value.enabled && !showToggle) {
                const noneKey = 'Tool.Options.NoneClickToAdd';
                editText = window.languageManager ? (window.languageManager.t(noneKey) !== noneKey ? window.languageManager.t(noneKey) : 'None (Click to Add)') : 'None (Click to Add)';
            }

            const editingText = window.languageManager ? (window.languageManager.t(editingKey) !== editingKey ? window.languageManager.t(editingKey) : 'Editing Color...') : 'Editing Color...';
            
            btnText.textContent = isActive ? editingText : editText;

            btn.appendChild(btnText);
            btn.appendChild(colorBox);

            btn.onclick = () => {
                // If it was disabled, auto-enable on click?
                // Or just set target and let color change enable it.
                
                // Toggle active state
                tool.activeColorTarget = isActive ? null : 'active-fill';
                controller.update();
            };

            container.appendChild(btn);
        }

        return container;
    }
}

export class CurveControl {
    static create(tool, key, value, controller) {
        const container = document.createElement('div');
        container.className = 'option-group';
        container.style.marginBottom = '10px';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        // Allow container to stretch so canvas can fill it
        container.style.width = '100%'; 

        const label = document.createElement('div');
        const i18nKey = `Tool.Options.${key}`;
        label.textContent = window.languageManager ? (window.languageManager.t(i18nKey) !== i18nKey ? window.languageManager.t(i18nKey) : key) : key;
        label.className = 'text text--muted text--small';
        label.style.marginBottom = '5px';
        container.appendChild(label);

        // CurveEditor without fixed size
        const editor = new CurveEditor();
        editor.setData(value);
        editor.onChange = (newData) => {
             tool.options[key] = newData;
             if (tool.onOptionChanged) tool.onOptionChanged(key, newData);
        };
        
        container.appendChild(editor.container);
        return container;
    }
}
