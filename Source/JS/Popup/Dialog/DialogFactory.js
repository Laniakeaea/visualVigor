import { PROJECT_DEFAULTS } from '../../Config/projectConfig.js';

/* =========================================
   Dialog Factory
   ========================================= */

export class DialogFactory {
    /**
     * Creates a standard Alert dialog configuration
     * @param {string} title 
     * @param {string} message 
     * @param {Function} [onConfirm] 
     */
    static createAlert(title, message, onConfirm) {
        const t = (k) => window.languageManager ? window.languageManager.t(k) : k;
        return {
            type: 'alert',
            title: title,
            content: message,
            buttons: [
                {
                    text: t('Popup.Dialog.Common.Confirm'),
                    type: 'recommend', // Primary style
                    onClick: onConfirm
                }
            ]
        };
    }

    /**
     * Creates a standard Confirmation dialog configuration
     * @param {string} title 
     * @param {string} message 
     * @param {Function} onConfirm 
     * @param {Function} [onCancel] 
     * @param {Object} [options] - Custom button texts, etc.
     */
    static createConfirm(title, message, onConfirm, onCancel, options = {}) {
        const t = (k) => window.languageManager ? window.languageManager.t(k) : k;
        return {
            type: 'confirm',
            title: title,
            content: message,
            buttons: [
                {
                    text: options.cancelText || t('Popup.Dialog.Common.Cancel'),
                    type: 'normal',
                    onClick: onCancel
                },
                {
                    text: options.confirmText || t('Popup.Dialog.Common.Confirm'),
                    type: 'recommend',
                    onClick: onConfirm
                }
            ]
        };
    }

    /**
     * Creates a Dangerous Action confirmation (Red button)
     */
    static createDangerConfirm(title, message, onConfirm, onCancel) {
        const t = (k) => window.languageManager ? window.languageManager.t(k) : k;
        return {
            type: 'danger',
            title: title,
            content: message,
            buttons: [
                {
                    text: t('Popup.Dialog.Common.Cancel'),
                    type: 'normal',
                    onClick: onCancel
                },
                {
                    text: t('Popup.Dialog.Common.Delete'), // Or generic 'Confirm'
                    type: 'danger',
                    onClick: onConfirm
                }
            ]
        };
    }

    /**
     * Creates a custom content dialog (e.g. for forms)
     * @param {string} title 
     * @param {HTMLElement} contentElement 
     * @param {Array} buttons 
     */
    static createCustom(title, contentElement, buttons) {
        return {
            type: 'custom',
            title: title,
            content: contentElement,
            buttons: buttons || []
        };
    }

    /**
     * Creates a New File dialog configuration
     * @param {Function} onConfirm - Called with { name, width, height }
     * @param {Function} onCancel 
     */
    static createNewFile(onConfirm, onCancel) {
        const t = (k) => window.languageManager ? window.languageManager.t(k) : k;
        const container = document.createElement('div');
        container.className = 'dialog-form';
        Object.assign(container.style, {
            display: 'flex',
            flexDirection: 'column',
            gap: '15px',
            padding: '10px 0',
            minWidth: '350px'
        });

        // 0. Banner for validation errors
        const banner = document.createElement('div');
        banner.className = 'banner';
        Object.assign(banner.style, {
            display: 'none',
            borderRadius: 'var(--radius-basic)',
            marginBottom: '5px',
            border: '1px solid var(--color-red-20)',
            backgroundColor: 'color-mix(in srgb, var(--color-red-100) 10%, transparent)'
        });
        
        // Icon (Simulated or Image)
        const bannerIcon = document.createElement('div');
        bannerIcon.className = 'banner__icon';
        bannerIcon.style.backgroundColor = 'var(--color-red-100)';
        
        // Content
        const bannerContent = document.createElement('div');
        bannerContent.className = 'banner__content';
        const bannerDesc = document.createElement('div');
        bannerDesc.className = 'banner__desc';
        bannerContent.appendChild(bannerDesc);

        banner.appendChild(bannerIcon);
        banner.appendChild(bannerContent);
        container.appendChild(banner);

        const showBanner = (msg) => {
            bannerDesc.textContent = msg;
            banner.style.display = 'grid';
        };

        // 1. Name Input
        const nameInput = document.createElement('input');
        nameInput.className = 'text-input text-input--field';
        nameInput.type = 'text';
        nameInput.placeholder = t('Popup.Dialog.NewProject.NamePlaceholder');
        nameInput.value = '';
        nameInput.style.width = '100%';
        container.appendChild(nameInput);

        // 2. Dimensions
        const widthGroup = this._createInputGroup(t('Popup.Dialog.NewProject.Width'), 'number', PROJECT_DEFAULTS.WIDTH);
        container.appendChild(widthGroup.group);

        const heightGroup = this._createInputGroup(t('Popup.Dialog.NewProject.Height'), 'number', PROJECT_DEFAULTS.HEIGHT);
        container.appendChild(heightGroup.group);

        // 3. Aspect Ratio Logic
        let aspectRatio = PROJECT_DEFAULTS.WIDTH / PROJECT_DEFAULTS.HEIGHT;
        let keepRatio = true;

        const updateHeight = () => {
            if (!keepRatio) return;
            const w = parseInt(widthGroup.input.value) || 0;
            if (w > 0) heightGroup.input.value = Math.round(w / aspectRatio);
        };

        const updateWidth = () => {
            if (!keepRatio) return;
            const h = parseInt(heightGroup.input.value) || 0;
            if (h > 0) widthGroup.input.value = Math.round(h * aspectRatio);
        };

        widthGroup.input.addEventListener('input', updateHeight);
        heightGroup.input.addEventListener('input', updateWidth);

        const ratioToggle = this._createToggle(t('Popup.Dialog.NewProject.KeepRatio'), true, (checked) => {
            keepRatio = checked;
            if (checked) {
                const w = parseInt(widthGroup.input.value) || 0;
                const h = parseInt(heightGroup.input.value) || 0;
                if (h > 0) aspectRatio = w / h;
            }
        });
        container.appendChild(ratioToggle.group);

        // 4. Total Frames
        const frameGroup = this._createInputGroup(t('Popup.Dialog.NewProject.Duration'), 'number', PROJECT_DEFAULTS.DURATION);
        container.appendChild(frameGroup.group);

        // 5. Background Color
        const bgGroup = this._createSegmentedGroup(t('Popup.Dialog.NewProject.Background'), [
            { label: t('Popup.Dialog.NewProject.BgNone'), value: 'transparent' },
            { label: t('Popup.Dialog.NewProject.BgBlack'), value: '#000000' },
            { label: t('Popup.Dialog.NewProject.BgWhite'), value: '#ffffff' }
        ], PROJECT_DEFAULTS.BACKGROUND_COLOR);
        container.appendChild(bgGroup.group);

        // 6. Save Immediately & Path
        const pathRow = document.createElement('div');
        Object.assign(pathRow.style, {
            display: 'none',
            flexDirection: 'row',
            alignItems: 'center',
            gap: '10px'
        });

        const pathInput = document.createElement('input');
        pathInput.className = 'text-input text-input--field';
        pathInput.type = 'text';
        pathInput.placeholder = t('Popup.Dialog.NewProject.SelectFolder');
        pathInput.readOnly = true;
        Object.assign(pathInput.style, { flex: '1', textAlign: 'left' });

        const browseBtn = document.createElement('button');
        browseBtn.className = 'dialog-btn is-recommend';
        browseBtn.textContent = t('Popup.Dialog.NewProject.Browse');
        Object.assign(browseBtn.style, { height: '30px', padding: '0 15px' });
        
        let selectedDirHandle = null;

        const triggerFolderSelect = async () => {
            try {
                if (window.showDirectoryPicker) {
                    const handle = await window.showDirectoryPicker();
                    selectedDirHandle = handle;
                    pathInput.value = handle.name;
                } else {
                    // Fallback for non-supported browsers or testing
                    pathInput.value = 'D:/Projects/MyAnimation';
                }
            } catch (err) {
                console.warn('Folder selection cancelled', err);
            }
        };

        browseBtn.onclick = triggerFolderSelect;
        pathInput.onclick = triggerFolderSelect;
        pathInput.style.cursor = 'pointer';

        pathRow.appendChild(pathInput);
        pathRow.appendChild(browseBtn);

        const saveToggle = this._createToggle(t('Popup.Dialog.NewProject.SaveImmediately'), false, (checked) => {
            pathRow.style.display = checked ? 'flex' : 'none';
        });
        
        container.appendChild(saveToggle.group);
        container.appendChild(pathRow);

        return {
            type: 'custom',
            title: t('Popup.Dialog.NewProject.Title'),
            content: container,
            buttons: [
                {
                    text: t('Popup.Dialog.NewProject.Cancel'),
                    type: 'normal',
                    onClick: onCancel
                },
                {
                    text: t('Popup.Dialog.NewProject.Create'),
                    type: 'recommend',
                    onClick: () => {
                        // Validation
                        if (saveToggle.input.checked) {
                            if (!pathInput.value || pathInput.value.trim() === '') {
                                showBanner(t('Popup.Dialog.NewProject.ErrorPathRequired') || 'Please select a valid folder path.');
                                return false; // Prevent dialog close
                            }
                        }

                        const data = {
                            name: nameInput.value,
                            width: parseInt(widthGroup.input.value, 10),
                            height: parseInt(heightGroup.input.value, 10),
                            duration: parseInt(frameGroup.input.value, 10),
                            backgroundColor: bgGroup.getValue(),
                            saveImmediately: saveToggle.input.checked,
                            savePath: saveToggle.input.checked ? pathInput.value : null,
                            saveHandle: selectedDirHandle
                        };
                        if (onConfirm) onConfirm(data);
                    }
                }
            ]
        };
    }

    // --- Internal Helpers ---

    static _createInputGroup(labelText, inputType, defaultValue, placeholder) {
        const group = document.createElement('div');
        Object.assign(group.style, {
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: '20px'
        });

        const label = document.createElement('span');
        label.className = 'text text--muted';
        label.textContent = labelText;
        Object.assign(label.style, { whiteSpace: 'nowrap', flexShrink: '0' });
        
        const input = document.createElement('input');
        input.className = 'text-input text-input--field';
        input.style.flex = '1';
        input.type = inputType;
        input.value = defaultValue || '';
        if (placeholder) input.placeholder = placeholder;

        group.appendChild(label);
        group.appendChild(input);
        return { group, input };
    }

    static _createSegmentedGroup(labelText, options, defaultValue) {
        const group = document.createElement('div');
        Object.assign(group.style, {
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: '20px'
        });

        const label = document.createElement('span');
        label.className = 'text text--muted';
        label.textContent = labelText;
        Object.assign(label.style, { whiteSpace: 'nowrap', flexShrink: '0' });

        const segBtn = document.createElement('div');
        segBtn.className = 'segmented-btn';
        segBtn.style.flex = '1';

        const container = document.createElement('div');
        container.className = 'segmented-btn__container';
        
        const mask = document.createElement('div');
        mask.className = 'segmented-btn__mask';
        
        const track = document.createElement('div');
        track.className = 'segmented-btn__track';
        track.style.setProperty('--seg-count', options.length);

        let currentValue = defaultValue;

        const updateSelection = (index) => {
            const percent = 100 / options.length;
            mask.style.width = `calc(${percent}% - 4px)`;
            mask.style.left = `calc(${percent * index}% + 2px)`;
            
            Array.from(track.children).forEach((child, i) => {
                if (i === index) child.classList.add('is-active');
                else child.classList.remove('is-active');
            });
            
            currentValue = options[index].value;
        };

        options.forEach((opt, index) => {
            const btn = document.createElement('button');
            btn.className = 'segmented-btn__item';
            btn.textContent = opt.label;
            btn.onclick = () => updateSelection(index);
            track.appendChild(btn);
            
            if (opt.value === defaultValue) {
                setTimeout(() => updateSelection(index), 0);
            }
        });

        container.appendChild(mask);
        container.appendChild(track);
        segBtn.appendChild(container);
        group.appendChild(label);
        group.appendChild(segBtn);

        return { group, getValue: () => currentValue };
    }

    static _createToggle(labelText, defaultValue, onChange) {
        const group = document.createElement('div');
        Object.assign(group.style, {
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: '20px'
        });

        const label = document.createElement('label');
        label.className = 'toggle-label';
        Object.assign(label.style, {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            cursor: 'pointer'
        });

        const textSpan = document.createElement('span');
        textSpan.className = 'text text--muted';
        textSpan.textContent = labelText;
        
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.className = 'toggle__input';
        input.checked = defaultValue;
        if (onChange) input.onchange = (e) => onChange(e.target.checked);

        const track = document.createElement('span');
        track.className = 'toggle__track';
        
        const thumb = document.createElement('span');
        thumb.className = 'toggle__thumb';
        
        track.appendChild(thumb);
        
        label.appendChild(textSpan);
        label.appendChild(input);
        label.appendChild(track);
        
        group.appendChild(label);
        
        return { group, input };
    }
}
