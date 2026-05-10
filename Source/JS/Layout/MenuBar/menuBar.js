import { menuLeftBarConfig, menuRightBarConfig } from '/Source/JS/Config/menuBarConfig.js';

/* =========================================
   MenuBar Module
   ========================================= */

export class MenuBar {
    constructor() {
        this.leftBar = document.querySelector('.menu-bar__section--left');
        this.midBar = document.querySelector('.menu-bar__section--center');
        this.rightBar = document.querySelector('.menu-bar__section--right');
        
        this.activeMenuBtn = null; // Track currently active menu button

        this.init();
    }

    init() {
        this.render();
        this.bindGlobalEvents();
    }

    render() {
        // Render Left Bar
        if (this.leftBar) {
            this.leftBar.innerHTML = '';
            menuLeftBarConfig.forEach(item => {
                this.leftBar.appendChild(this.createItem(item, 'left'));
            });
        }

        // Render Right Bar
        if (this.rightBar) {
            this.rightBar.innerHTML = '';
            menuRightBarConfig.forEach(item => {
                this.rightBar.appendChild(this.createItem(item, 'right'));
            });
        }
        
        // Initial icon update
        if (window.themeManager) {
            this.updateIcons(window.themeManager.currentTheme);
        }
    }

    createItem(config, side) {
        const btn = document.createElement('button');
        
        if (config.id) btn.id = config.id;
        if (config.title) btn.title = config.title;

        // Type Handling
        if (config.type === 'switch') {
             return this.createSwitch(config);
        } 
        
        if (config.type === 'icon' || config.type === 'icon-circle') {
            btn.className = 'menu-bar__btn--circle';
            this.appendIcon(btn, config);
        } else {
            // Default to capsule button (text or toggle)
            btn.className = 'menu-bar__btn--capsule';
            if (config.text) btn.textContent = config.text;
            if (config.i18n) {
                btn.setAttribute('data-i18n', config.i18n);
                // Translate immediately if LanguageManager is available
                if (window.languageManager) {
                    window.languageManager.updateElement(btn);
                }
            }
            
            if (config.type === 'toggle') {
                btn.dataset.toggle = 'true';
                if (config.active) btn.classList.add('active');
                
                // Special handling for menus with submenus (regardless of side)
                if (config.submenu) {
                    btn.addEventListener('click', (e) => this.handleMenuToggle(btn, config));
                } else {
                    // Standard toggle behavior
                    btn.addEventListener('click', () => {
                        btn.classList.toggle('active');
                    });
                }
            }
        }

        // Action Handling (only if not a menu toggle, or if it has a specific action)
        if (config.action) {
            btn.dataset.action = config.action; // Store action for state syncing
            
            if (!config.submenu) {
                btn.addEventListener('click', (e) => {
                    if (window.commandManager) {
                        window.commandManager.execute(config.action, e);
                    } else {
                        console.warn('CommandManager not initialized');
                    }
                });
            }
        }

        return btn;
    }

    createSwitch(config) {
        /*
        <label class="toggle-label">
            <span class="toggle-text">Label</span>
            <input type="checkbox" class="toggle__input">
            <div class="toggle__track">
                <div class="toggle__thumb"></div>
            </div>
        </label>
        */
        const label = document.createElement('label');
        label.className = 'toggle-label menu-bar__toggle';
        
        // Tooltip
        if (config.title) {
            label.title = config.title; // Default fallback
            if (config.title.startsWith('Layout.')) {
                 // Try translate
                 if (window.languageManager) {
                     label.title = window.languageManager.t(config.title) || config.title;
                     // Listen for changes? 
                     // Since we don't have a direct attribute binder for 'title' in generic way without messing up,
                     // we can add a custom attribute for our icon updater or listener.
                     label.dataset.i18nTitle = config.title;
                     label.classList.add('has-i18n-title');
                 }
            }
        }

        // 2. Input
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.className = 'toggle__input';
        if (config.active) input.checked = true;
        label.appendChild(input);

        // 3. Track
        const track = document.createElement('div');
        track.className = 'toggle__track';
        // Thumb
        const thumb = document.createElement('div');
        thumb.className = 'toggle__thumb';
        track.appendChild(thumb);
        label.appendChild(track);

        // Action
        if (config.action) {
            const action = config.action;
            input.addEventListener('change', (e) => {
                if (window.commandManager) {
                    // Pass specific state if needed, or just let command handle toggle
                    window.commandManager.execute(action, input.checked);
                }
            });

            // Initialize state from existing command state or settings if applicable?
            // For now, config.active is the source of truth, but we might want to sync.
        }

        return label;
    }

    handleMenuToggle(btn, config) {
        // If clicking the already active button, deactivate it
        if (this.activeMenuBtn === btn) {
            btn.classList.remove('active');
            this.activeMenuBtn = null;
            this.clearMidBar();
            return;
        }

        // Deactivate previous button
        if (this.activeMenuBtn) {
            this.activeMenuBtn.classList.remove('active');
        }

        // Activate new button
        btn.classList.add('active');
        this.activeMenuBtn = btn;

        // Render Submenu
        this.renderSubmenu(config.submenu);
    }

    renderSubmenu(items) {
        if (!this.midBar) return;
        this.midBar.innerHTML = ''; // Clear existing
        this.midBar.classList.remove('has-content');

        if (!items || items.length === 0) return;

        items.forEach(item => {
            // Submenu items are typically simple buttons
            const btn = this.createItem(item, 'mid');
            this.midBar.appendChild(btn);

            // Sync toggle state from layoutController (not static config)
            if (item.type === 'toggle' && item.action && window.layoutController) {
                const stateMap = {
                    'viewToggleLeftPanel': 'isLeftPanelVisible',
                    'viewToggleRightPanel': 'isRightPanelVisible',
                    'viewToggleBottomPanel': 'isBottomPanelVisible',
                    'viewToggleDualView': 'isDualView'
                };
                const prop = stateMap[item.action];
                if (prop !== undefined) {
                    const isActive = window.layoutController[prop];
                    if (isActive) btn.classList.add('active');
                    else btn.classList.remove('active');
                }
            }
        });

        this.midBar.classList.add('has-content');
    }

    clearMidBar() {
        if (this.midBar) {
            this.midBar.innerHTML = '';
            this.midBar.classList.remove('has-content');
        }
    }

    appendIcon(btn, config) {
        const img = document.createElement('img');
        img.dataset.iconName = config.iconName; // Store for updates
        btn.appendChild(img);
    }

    bindGlobalEvents() {
        window.addEventListener('themeChanged', (e) => {
            this.updateIcons(e.detail.theme);
        });
        window.addEventListener('languageChanged', () => {
             // Re-run title update logic
             if (window.themeManager) this.updateIcons(window.themeManager.currentTheme);
        });
    }

    updateIcons(theme) {
        const suffix = theme === 'light' ? 'L' : 'D';
        const basePath = '/Asset/Icon/Layout/MenuBar/MenuRightBar/';
        
        const imgs = document.querySelectorAll('.menu-bar img[data-icon-name]');
        imgs.forEach(img => {
            const name = img.dataset.iconName;
            img.src = `${basePath}${name}${suffix}.svg`;
            
            // Translate existing titles on parent buttons if they look like keys
            // This is a bit of a patch since icons didn't store keys explicitly
            if (img.parentElement.title && img.parentElement.title.startsWith('Layout.')) {
                 if (window.languageManager) img.parentElement.title = window.languageManager.t(img.parentElement.title) || img.parentElement.title;
            }
            if (img.parentElement.title) img.alt = img.parentElement.title;
        });
        
        // Update Titles (Toggles)
        if (window.languageManager) {
            document.querySelectorAll('.has-i18n-title').forEach(el => {
                const key = el.dataset.i18nTitle;
                if (key) el.title = window.languageManager.t(key);
            });
        }
    }
}
