import { rightToolBarConfig } from '/Source/JS/Config/toolBarConfig.js';
import { BitmapCommand } from '/Source/JS/CoreFunction/Edit/Commands/BitmapCommand.js';

class CustomPluginManager {
    constructor() {
        this.plugins = [];
        this.storageKey = 'visualvigor_custom_plugins';
        this.STORAGE_LIMIT = 5 * 1024 * 1024; // 5MB Limit
        
        // Bind methods
        this.addPlugin = this.addPlugin.bind(this);
        this.executePlugin = this.executePlugin.bind(this);
    }

    /**
     * Initialize the plugin manager.
     * Should be called after LayoutController is ready.
     */
    init() {
        this.loadPlugins();
        this.integratePlugins();
    }

    loadPlugins() {
        const stored = localStorage.getItem(this.storageKey);
        if (stored) {
            try {
                this.plugins = JSON.parse(stored);
                // Validate plugin data structure
                this.plugins = this.plugins.filter(p => p.id && p.type && p.script);
                
                // Re-register commands
                if (window.commandManager) {
                    this.plugins.forEach(p => this.registerPluginCommand(p));
                }
            } catch (e) {
                console.error('Failed to load custom plugins', e);
                this.plugins = [];
            }
        }
    }

    savePlugins() {
        try {
            const data = JSON.stringify(this.plugins);
            if (data.length > this.STORAGE_LIMIT) {
                throw new Error('Storage limit exceeded');
            }
            localStorage.setItem(this.storageKey, data);
        } catch (e) {
            console.error('Failed to save plugins:', e);
            if (window.infoSystem) {
                window.infoSystem.showInfo('error', 'Failed to save plugin: Storage limit reached.', 3000);
            }
            throw e;
        }
    }

    /**
     * Integrate plugins into the right toolbar config
     */
    integratePlugins() {
        // 1. Remove existing custom plugins (keep the "Add" button and standard tools)
        // We identify user plugins by action starting with 'customPlugin_'
        const cleanConfig = rightToolBarConfig.filter(item => !item.action || !item.action.startsWith('customPlugin_'));
        
        // 2. Clear array in place
        rightToolBarConfig.length = 0;
        rightToolBarConfig.push(...cleanConfig);

        // 3. Insert user plugins before the "Add" button
        const addIndex = rightToolBarConfig.findIndex(item => item.action === 'toolAddCustomPlugin');
        
        const defaultIconPath = '/Asset/Icon/Layout/MainArea/ToolBar/RightToolBar/RightToolBottomBar/default_plugin.svg';

        const pluginEntries = this.plugins.map(p => ({
            type: 'button',
            iconName: 'default_plugin', // Just metadata 
            customIcon: p.iconData || defaultIconPath,   // Use custom Data URI if available, or default
            category: 'custom',
            position: 'bottom',
            title: p.name, 
            tooltip: p.name,
            action: p.id 
        }));

        if (addIndex !== -1) {
            rightToolBarConfig.splice(addIndex, 0, ...pluginEntries);
        } else {
            rightToolBarConfig.push(...pluginEntries);
        }

        // 4. Trigger UI Update
        if (window.layoutController && typeof window.layoutController.reloadRightToolbar === 'function') {
            window.layoutController.reloadRightToolbar();
        }
    }

    /**
     * Prompt user to add a new plugin with Custom Dialog
     */
    registerPluginCommand(plugin) {
        if (!window.commandManager) return;
        
        // Prevent duplicate registration warning
        // CommandManager usually warns, so we might check if exists (not exposed though)
        // We just register and let it overwrite.
        window.commandManager.register(plugin.id, () => {
             this.executePlugin(plugin.id);
        });
    }

    /**
     * Helper to get translated string
     */
    _t(key, params = {}) {
        if (!window.languageManager) return key;
        let text = window.languageManager.t(key);
        // Fallback if key returned
        if (text === key) return key.split('.').pop();
        
        // Parameter substitution
        Object.keys(params).forEach(k => {
            text = text.replace(`{${k}}`, params[k]);
        });
        return text;
    }

    /**
     * Remove a plugin by ID
     */
    removePlugin(id) {
        const pluginIndex = this.plugins.findIndex(p => p.id === id);
        if (pluginIndex > -1) {
            const plugin = this.plugins[pluginIndex];
            this.plugins.splice(pluginIndex, 1);
            this.savePlugins();
            this.integratePlugins();
            
            const msg = this._t('Layout.Panel.CustomPlugin.SuccessRemoved', { name: plugin.name });
            if (window.infoSystem) window.infoSystem.showInfo('success', msg, 2000);
        }
    }

    /**
     * Manage Plugins Dialog
     */
    async managePlugins() {
        return new Promise((resolve) => {
            const DialogFactory = window.dialogSystem ? window.dialogSystem.factory : null;
            if (!DialogFactory) return resolve(false);

            const container = document.createElement('div');
            container.className = 'dialog-form';
            Object.assign(container.style, {
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                padding: '10px 0',
                minWidth: '400px',
                height: '400px'
            });

            // 1. List Container
            const listContainer = document.createElement('div');
            Object.assign(listContainer.style, {
                flex: '1',
                display: 'flex',
                flexDirection: 'column',
                overflowY: 'auto',
                border: '1px solid var(--color-border)',
                borderRadius: '4px',
                backgroundColor: 'var(--color-bg-2)'
            });

            const renderList = () => {
                listContainer.innerHTML = '';
                if (this.plugins.length === 0) {
                    const empty = document.createElement('div');
                    empty.textContent = this._t('Layout.Panel.CustomPlugin.NoPlugins');
                    empty.className = 'text text--muted text--center';
                    Object.assign(empty.style, {
                        padding: '40px 20px',
                        fontStyle: 'italic',
                        color: 'var(--color-font-tertiary)'
                    });
                    listContainer.appendChild(empty);
                } else {
                    this.plugins.forEach(p => {
                        const item = document.createElement('div');
                        item.className = 'list-item'; // Use simplified class or mimic listToolbar
                        Object.assign(item.style, {
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 12px',
                            borderBottom: '1px solid var(--color-border-subtle)',
                            gap: '12px',
                            transition: 'background-color 0.2s'
                        });

                        item.onmouseenter = () => item.style.backgroundColor = 'var(--color-hover)';
                        item.onmouseleave = () => item.style.backgroundColor = 'transparent';

                        // Left: Icon + Name
                        const left = document.createElement('div');
                        Object.assign(left.style, { display: 'flex', alignItems: 'center', gap: '12px', flex: '1', overflow: 'hidden' });
                        
                        const defaultIconPath = '/Asset/Icon/Layout/MainArea/ToolBar/RightToolBar/RightToolBottomBar/default_plugin.svg';

                        const icon = document.createElement('div');
                        Object.assign(icon.style, {
                            width: '24px', 
                            height: '24px',
                            flexShrink: '0',
                            backgroundColor: 'currentColor', // Use font color
                            webkitMaskImage: `url('${p.iconData || defaultIconPath}')`,
                            maskImage: `url('${p.iconData || defaultIconPath}')`,
                            webkitMaskSize: 'contain', 
                            maskSize: 'contain',
                            webkitMaskRepeat: 'no-repeat',
                            maskRepeat: 'no-repeat',
                            webkitMaskPosition: 'center',
                            maskPosition: 'center'
                        });
                        
                        if (!p.iconData && !defaultIconPath) {
                             icon.style.maskImage = 'none';
                             icon.style.backgroundColor = 'transparent';
                             icon.textContent = '🧩';
                             icon.style.fontSize = '20px';
                        }

                        const nameInfo = document.createElement('div');
                        Object.assign(nameInfo.style, { display: 'flex', flexDirection: 'column', overflow: 'hidden', justifyContent: 'center' });

                        const name = document.createElement('span');
                        name.textContent = p.name;
                        name.className = 'text';
                        Object.assign(name.style, { fontWeight: 'normal', fontStyle: 'normal', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' });

                        // Removed type display since only WASM is supported

                        nameInfo.appendChild(name);

                        left.appendChild(icon);
                        left.appendChild(nameInfo);

                        // Right: Delete Button
                        const delBtn = document.createElement('button');
                        delBtn.textContent = this._t('Layout.Panel.CustomPlugin.Remove');
                        delBtn.className = 'dialog-btn is-danger'; 
                        
                        delBtn.onclick = (e) => {
                            e.stopPropagation();
                            const confirmMsg = this._t('Layout.Panel.CustomPlugin.ConfirmRemove', { name: p.name });
                            if (confirm(confirmMsg)) {
                                this.removePlugin(p.id);
                                renderList(); // Re-render list
                            }
                        };

                        item.appendChild(left);
                        item.appendChild(delBtn);
                        listContainer.appendChild(item);
                    });
                }
            };

            renderList();
            container.appendChild(listContainer);

            // Dialog Config
            const config = {
                type: 'custom',
                title: this._t('Layout.Panel.CustomPlugin.Title'),
                content: container,
                buttons: [
                    {
                        text: '+ ' + this._t('Layout.Panel.CustomPlugin.AddPlugin'),
                        type: 'recommend', 
                        onClick: async () => {
                             const added = await this.promptAddPlugin();
                             this.managePlugins();
                             return false; 
                        }
                    },
                    {
                        text: this._t('Layout.Panel.CustomPlugin.Close'),
                        type: 'normal',
                        onClick: () => resolve(true)
                    }
                ]
            };

            window.dialogSystem.show(config);
        });
    }

    /**
     * Prompt user to add a new plugin with Custom Dialog
     */
    async promptAddPlugin() {
        return new Promise((resolve) => {
            const DialogFactory = window.dialogSystem ? window.dialogSystem.factory : null;
            if (!DialogFactory) {
                 console.error("DialogSystem not available");
                 return resolve(false);
            }

            // Create UI Elements
            const container = document.createElement('div');
            container.className = 'dialog-form';
            Object.assign(container.style, {
                display: 'flex',
                flexDirection: 'column',
                gap: '15px',
                padding: '10px 0',
                minWidth: '350px'
            });

            // 1. Name Input
            const nameGroup = this._createInputGroup(this._t('Layout.Panel.CustomPlugin.Name'), 'text', '');
            container.appendChild(nameGroup.group);

            // 2. Script File Input
            const scriptGroup = this._createFileInputGroup(this._t('Layout.Panel.CustomPlugin.ScriptFile'), '.wasm', this._t('Layout.Panel.CustomPlugin.NoFile'), this._t('Layout.Panel.CustomPlugin.Browse'));
            container.appendChild(scriptGroup.group);

            // 3. Icon File Input
            const iconGroup = this._createFileInputGroup(this._t('Layout.Panel.CustomPlugin.IconFile'), '.svg', this._t('Layout.Panel.CustomPlugin.NoIcon'), this._t('Layout.Panel.CustomPlugin.Browse'));
            container.appendChild(iconGroup.group);

            // 4. Preview Area
            const previewGroup = document.createElement('div');
            Object.assign(previewGroup.style, {
                 display: 'flex',
                 flexDirection: 'row',
                 alignItems: 'center',
                 gap: '20px'
            });
            const previewLabel = document.createElement('span');
            previewLabel.className = 'text text--muted';
            previewLabel.textContent = this._t('Layout.Panel.CustomPlugin.Preview');
            Object.assign(previewLabel.style, { whiteSpace: 'nowrap', flexShrink: '0', minWidth: '80px' }); 

            const previewContainer = document.createElement('div');
            previewContainer.className = 'text-input text-input--field'; 
            Object.assign(previewContainer.style, {
                flex: '1',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '120px',
                backgroundColor: 'var(--color-bg-panel)'
            });
            
            const previewImg = document.createElement('img');
            previewImg.style.width = '100px';
            previewImg.style.height = '100px';
            previewImg.style.display = 'none';
            
            const previewInfo = document.createElement('span');
            previewInfo.textContent = this._t('Layout.Panel.CustomPlugin.NoIcon');
            previewInfo.style.color = 'var(--color-font-tertiary)';
            
            previewContainer.appendChild(previewInfo);
            previewContainer.appendChild(previewImg);
            
            previewGroup.appendChild(previewLabel);
            previewGroup.appendChild(previewContainer);
            container.appendChild(previewGroup);

            // Icon Validator
            let iconDataUri = null;
            
            iconGroup.input.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) {
                    iconDataUri = null;
                    previewImg.style.display = 'none';
                    previewInfo.style.display = 'block';
                    return;
                }

                const reader = new FileReader();
                reader.onload = (evt) => {
                    const content = evt.target.result;
                    // Validate Dimensions via Image check
                    const img = new Image();
                    img.onload = () => {
                         if (img.width !== 100 || img.height !== 100) {
                             if (window.infoSystem) window.infoSystem.showInfo('warning', this._t('Layout.Panel.CustomPlugin.InvalidIcon'), 3000);
                         }
                         previewImg.src = content;
                         previewImg.style.display = 'block';
                         previewInfo.style.display = 'none';
                         iconDataUri = content;
                    };
                    img.onerror = () => {
                         if (window.infoSystem) window.infoSystem.showInfo('error', this._t('Layout.Panel.CustomPlugin.InvalidImage'), 2000);
                         iconGroup.input.value = '';
                    };
                    img.src = content;
                };
                reader.readAsDataURL(file);
            });

            // Dialog Config
            const config = {
                type: 'custom',
                title: this._t('Layout.Panel.CustomPlugin.AddPlugin'),
                content: container,
                buttons: [
                    {
                        text: this._t('Layout.Panel.CustomPlugin.Close'), // Or Cancel
                        type: 'normal',
                        onClick: () => resolve(false)
                    },
                    {
                        text: this._t('Layout.Panel.CustomPlugin.AddPlugin'),
                        type: 'recommend',
                        onClick: async () => {
                            const name = nameGroup.input.value.trim();
                            const scriptFile = scriptGroup.input.files[0];
                            
                            if (!name) {
                                if (window.infoSystem) window.infoSystem.showInfo('warning', this._t('Layout.Panel.CustomPlugin.EnterName'), 2000);
                                return false; // Prevent close
                            }
                            if (!scriptFile) {
                                if (window.infoSystem) window.infoSystem.showInfo('warning', this._t('Layout.Panel.CustomPlugin.SelectScript'), 2000);
                                return false;
                            }
                            
                            try {
                                await this.addPlugin(scriptFile, name, iconDataUri);
                                const successMsg = this._t('Layout.Panel.CustomPlugin.SuccessAdded', { name: name });
                                if (window.infoSystem) window.infoSystem.showInfo('success', successMsg, 2000);
                                resolve(true);
                            } catch (err) {
                                let errMsg;
                                if (err.message === 'Storage limit exceeded') {
                                    errMsg = this._t('Layout.Panel.CustomPlugin.StorageLimit');
                                } else {
                                    errMsg = err.message;
                                }
                                if (window.infoSystem) window.infoSystem.showInfo('error', errMsg, 3000);
                                resolve(false);
                            }
                        }
                    }
                ]
            };

            window.dialogSystem.show(config);
        });
    }

    _createInputGroup(label, type, defaultValue) {
        const group = document.createElement('div');
        Object.assign(group.style, {
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: '20px'
        });
        
        const lbl = document.createElement('span');
        lbl.className = 'text text--muted';
        lbl.textContent = label;
        Object.assign(lbl.style, { whiteSpace: 'nowrap', flexShrink: '0', minWidth: '80px' });
        
        const input = document.createElement('input');
        input.type = type;
        input.className = 'text-input text-input--field'; 
        input.value = defaultValue;
        input.style.flex = '1';
        
        group.appendChild(lbl);
        group.appendChild(input);
        
        return { group, input };
    }

    _createFileInputGroup(label, accept, placeholder = 'No file selected', btnText = 'Browse') {
         const group = document.createElement('div');
         Object.assign(group.style, {
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: '20px'
        });
         
         const lbl = document.createElement('span');
         lbl.className = 'text text--muted';
         lbl.textContent = label;
         Object.assign(lbl.style, { whiteSpace: 'nowrap', flexShrink: '0', minWidth: '80px' });
         
         // Wrapper (Input + Button)
         const wrapper = document.createElement('div');
         Object.assign(wrapper.style, {
             display: 'flex',
             flexDirection: 'row',
             alignItems: 'center',
             gap: '10px',
             flex: '1'
         });

         // Hidden File Input
         const fileInput = document.createElement('input');
         fileInput.type = 'file';
         fileInput.accept = accept;
         fileInput.style.display = 'none';

         // Visible Text Input (Read-only)
         const textInput = document.createElement('input');
         textInput.type = 'text';
         textInput.className = 'text-input text-input--field'; 
         textInput.placeholder = placeholder;
         textInput.readOnly = true;
         textInput.style.flex = '1';
         
         // Browse Button
         const browseBtn = document.createElement('button');
         browseBtn.className = 'dialog-btn is-normal'; 
         browseBtn.textContent = btnText;
         Object.assign(browseBtn.style, { height: '30px', padding: '0 15px', whiteSpace: 'nowrap' });

         // Logic
         browseBtn.onclick = (e) => {
             e.preventDefault(); 
             fileInput.click();
         };
         textInput.onclick = () => fileInput.click();

         fileInput.addEventListener('change', (e) => {
             if (fileInput.files && fileInput.files.length > 0) {
                 textInput.value = fileInput.files[0].name;
             } else {
                 textInput.value = '';
             }
         });
         
         wrapper.appendChild(fileInput);
         wrapper.appendChild(textInput);
         wrapper.appendChild(browseBtn);

         group.appendChild(lbl);
         group.appendChild(wrapper);
         
         return { group, input: fileInput }; // Return hidden input for reading files
    }

    /**
     * Add a new plugin from a file
     * @param {File} file 
     * @param {string} name 
     * @param {string} [iconDataUri] Optional base64 SVG icon
     */
    async addPlugin(file, name, iconDataUri) {
        return new Promise((resolve, reject) => {
            if (!file.name.endsWith('.wasm')) {
                 return reject(new Error('Only .wasm plugins are supported'));
            }

            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const content = e.target.result; // Data URL for WASM

                    const newPlugin = {
                        id: 'customPlugin_' + Date.now(),
                        name: name,
                        type: 'wasm',
                        script: content,
                        iconData: iconDataUri, // Store custom icon
                        timestamp: Date.now()
                    };

                    this.plugins.push(newPlugin);
                    this.savePlugins();
                    this.registerPluginCommand(newPlugin);
                    this.integratePlugins(); // Re-render toolbar
                    resolve(newPlugin);
                } catch (err) {
                    reject(err);
                }
            };

            reader.onerror = () => reject(new Error('Failed to read file'));

            reader.readAsDataURL(file); // Store as Base64 for LocalStorage
        });
    }

    async executePlugin(id) {
        const plugin = this.plugins.find(p => p.id === id);
        if (!plugin) return;

        console.log(`Executing plugin: ${plugin.name} (${plugin.type})`);

        try {
            if (plugin.type === 'js') {
                // Execute JS
                // Allow async scripts
                const func = new Function('app', 'window', `(async () => { 
                    try {
                        ${plugin.script}
                    } catch (e) {
                        console.error("Plugin Error:", e);
                        alert("Plugin Error: " + e.message);
                    }
                })()`);
                func(window.app, window); 
            } else if (plugin.type === 'wasm') {
                // Execute WASM
                let buffer;
                if (plugin.script.startsWith('data:')) {
                     const response = await fetch(plugin.script);
                     buffer = await response.arrayBuffer();
                } else {
                     throw new Error('Invalid WASM script format');
                }

                // --- Integration with Visual Vigor Canvas ---
                // We need to pass the active layer's image data to the WASM function
                
                const project = window.projectModel ? window.projectModel.activeProject : null;
                const canvas = window.projectModel ? window.projectModel.getActiveCanvas() : null;
                
                if (!project || !canvas) {
                    console.warn('WASM Plugin executed but no active canvas found.');
                    // If no canvas, we might just run the function if it doesn't need data (void run())
                    // But assuming most plugins want data.
                }

                let ctx = null; 
                let imageData = null;
                let originalData = null;

                if (canvas) {
                    // Assuming canvas is the HTMLCanvasElement or has a context
                    // In VisualVigor, getActiveCanvas may return a layer wrapper
                    ctx = canvas.ctx || canvas.getContext('2d');
                    if (ctx) {
                        imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                        originalData = imageData.data;
                    }
                }

                const module = await WebAssembly.compile(buffer);
                
                // Memory setup logic (from PluginHost.js pattern)
                let memory;
                let offset = 0;
                
                if (imageData) {
                    // Create enough memory for the image + stack
                    const imageByteSize = imageData.width * imageData.height * 4;
                    const requiredPages = Math.ceil(imageByteSize / (64 * 1024)) + 16; // +1MB Safety
                    memory = new WebAssembly.Memory({ initial: requiredPages, maximum: requiredPages + 100 });
                } else {
                    // Default fallback
                    memory = new WebAssembly.Memory({ initial: 256, maximum: 256 });
                }

                // Provide minimal import object
                const importObject = {
                    env: {
                        consoleLog: (arg) => console.log(arg),
                        alert: (msgPtr, len) => alert('WASM Alert'),
                        __linear_memory: memory, 
                        memory: memory,          
                        __indirect_function_table: new WebAssembly.Table({ initial: 0, element: 'anyfunc' }), 
                    }
                };
                
                const instance = await WebAssembly.instantiate(module, importObject);
                const exports = instance.exports;
                console.log('Available WASM Exports:', Object.keys(exports));

                // EXECUTION STRATEGY
                if (exports.applyFilter && imageData) {
                    // 1. Copy Data In
                    const heap = new Uint8ClampedArray(memory.buffer);
                    heap.set(originalData, offset);

                    // 2. Run Function (pointer, width, height)
                    exports.applyFilter(offset, imageData.width, imageData.height);

                    // 3. Copy Data Out
                    const resultData = new Uint8ClampedArray(heap.slice(offset, offset + (imageData.width * imageData.height * 4)));
                    const resultImage = new ImageData(resultData, imageData.width, imageData.height);
                    
                    // 4. Update Canvas
                    ctx.putImageData(resultImage, 0, 0);
                    
                    // 5. Record undo/redo command
                    if (window.editSystem && window.projectModel && window.projectModel.selectedLayerId) {
                        const currentFrame = window.projectModel.data.timeline.currentFrame || 0;
                        const cmd = new BitmapCommand(
                            window.projectModel.selectedLayerId,
                            imageData,
                            resultImage,
                            0, 0, currentFrame
                        );
                        window.editSystem.addCommand(cmd);
                    }
                    
                    // 6. Notify System
                    if (window.projectModel) {
                        // Dispatch event to update viewports
                        window.dispatchEvent(new CustomEvent('projectCanvasUpdated', { 
                            detail: { id: window.projectModel.selectedLayerId } 
                        }));
                    }

                    console.log('WASM Filter Applied Successfully');
                    if (window.infoSystem) window.infoSystem.showInfo('success', 'Filter Applied', 1000);

                } else if (exports.run) {
                    exports.run();
                } else if (exports._start) { // WASI default
                    exports._start(); 
                } else if (exports.main) {
                    exports.main();
                } else {
                    const keys = Object.keys(exports).join(', ');
                    console.warn(`WASM plugin loaded but no entry point found (applyFilter, run, _start, main). Available: ${keys}`);
                    if (window.infoSystem) window.infoSystem.showInfo('warning', `WASM loaded. No 'run' found. Available: ${keys}`, 5000);
                }
            }
        } catch (e) {
            console.error(`Error executing plugin ${plugin.name}:`, e);
            if (window.infoSystem) window.infoSystem.showInfo('error', `Plugin Execution Failed: ${e.message}`, 3000);
        }
    }
}

// Export singleton
const customPluginManager = new CustomPluginManager();
export default customPluginManager;
