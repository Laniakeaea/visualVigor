/* =========================================
   ToolBar Factory Module
   ========================================= */

/**
 * Configuration for ToolBar styles and structures
 */
const TOOLBAR_CONFIG = {
    vertical: {
        container: 'verticalToolBar',
        separator: 'verticalToolBar_separator',
        button: 'verticalToolBar_button',
        panels: ['verticalToolBar_top_panel', 'verticalToolBar_bottom_panel']
    },
    horizontal: {
        container: 'horizontalToolBar',
        separator: 'horizontalToolBar_separator',
        button: 'horizontalToolBar_button',
        panels: ['horizontalToolBarLeft', 'horizontalToolBarCenter', 'horizontalToolBarRight']
    }
};

const BASE_ICON_PATH = '/Asset/Icon/Layout/MainArea/ToolBar/';

class ToolBarFactory {
    constructor() {
        // Listen for theme changes to update icons
        window.addEventListener('themeChanged', (e) => this.updateAllIcons(e.detail.theme));
    }

    /**
     * Update all icons when theme changes
     * @param {string} theme - 'light' or 'dark'
     */
    updateAllIcons(theme) {
        const suffix = theme === 'light' ? 'L' : 'D';
        const icons = document.querySelectorAll('img[data-tb-icon]');
        
        icons.forEach(img => {
            const { side, category, name, position } = img.dataset;
            img.src = this._getIconPath(side, category, name, suffix, position);
        });
    }

    /**
     * Create a ToolBar component
     * @param {string} side - 'Left' | 'Right' | 'Top'
     * @param {Array} items - Array of item configs
     * @returns {HTMLElement} The toolbar DOM element
     */
    createToolBar(side, items = []) {
        const type = (side === 'Top' || side === 'Bottom') ? 'horizontal' : 'vertical';
        const config = TOOLBAR_CONFIG[type];

        // 1. Create Container
        const container = document.createElement('div');
        container.className = config.container;
        container.dataset.side = side;

        // 2. Create Panels
        const panels = {};
        config.panels.forEach(cls => {
            const panel = document.createElement('div');
            panel.className = cls;
            // Special handling for Horizontal Center inner panel
            if (cls === 'horizontalToolBarCenter') {
                const inner = document.createElement('div');
                inner.className = 'horizontalToolBar_inner_panel';
                panel.appendChild(inner);
                panels[cls] = inner;
            } else {
                panels[cls] = panel;
            }
            container.appendChild(panel);
        });

        // 3. Populate Items
        this._populateItems(items, panels, config, side, type);

        return container;
    }

    /**
     * Internal: Populate items into panels
     */
    _populateItems(items, panels, config, side, type) {
        items.forEach(item => {
            const element = this._createItem(item, side, type);
            if (element) {
                let targetPanel;
                
                if (type === 'vertical') {
                    // Vertical Logic: View -> Bottom, Others -> Top
                    const isBottom = item.category === 'view' || item.position === 'bottom';
                    targetPanel = isBottom ? panels[config.panels[1]] : panels[config.panels[0]];
                } else {
                    // Horizontal Logic: Position Right -> Right Panel, Others -> Left
                    if (item.position === 'right') {
                        targetPanel = panels[config.panels[2]]; // Right
                    } else if (item.position === 'center') {
                        targetPanel = panels[config.panels[1]]; // Center
                    } else {
                        targetPanel = panels[config.panels[0]]; // Left
                    }
                }
                
                if (targetPanel) targetPanel.appendChild(element);
            }
        });
    }

    /**
     * Create a single item (Button or Separator)
     */
    _createItem(item, side, type) {
        const config = TOOLBAR_CONFIG[type];
        if (item.type === 'separator') {
            const sep = document.createElement('div');
            sep.className = config.separator;
            return sep;
        } else if (item.type === 'button') {
            return this._createButton(item, side, config.button);
        }
        return null;
    }

    /**
     * Internal: Create a Button
     */
    _createButton(config, side, btnClass) {
        const btn = document.createElement('button');
        btn.className = btnClass;
        
        if (config.id) btn.id = config.id;
        if (config.title) btn.title = config.title; // Will be picked up by ToolTip.js
        if (config.active) btn.classList.add(`${btnClass}--active`);
        if (config.action) btn.dataset.action = config.action; // Store action for state syncing

        // Icon Handling
        if (config.iconName) {
            this._appendIcon(btn, config, side, btnClass);
        } else if (config.text) {
            this._appendText(btn, config);
        }

        // Event Handling
        if (config.action) {
            btn.addEventListener('click', (e) => {
                if (window.commandManager) {
                    window.commandManager.execute(config.action, e, btn);
                } else if (typeof config.action === 'function') {
                    // Fallback for direct function references (legacy)
                    config.action(e, btn);
                } else {
                    console.warn(`ToolBarFactory: CommandManager not found or action '${config.action}' invalid.`);
                }
            });
        }

        return btn;
    }

    /**
     * Internal: Append Icon Image
     */
    _appendIcon(btn, config, side, btnClass) {
        let iconEl;
        const currentTheme = window.themeManager ? window.themeManager.currentTheme : 'dark';
        const suffix = currentTheme === 'light' ? 'L' : 'D';

        if (config.customIcon) {
            // Use mask-image for custom icons to inherit font color (currentColor)
            iconEl = document.createElement('div');
            iconEl.className = `${btnClass}-img custom-plugin-icon`;
            
            Object.assign(iconEl.style, {
                webkitMaskImage: `url('${config.customIcon}')`,
                maskImage: `url('${config.customIcon}')`,
                webkitMaskSize: 'contain',
                maskSize: 'contain',
                webkitMaskRepeat: 'no-repeat',
                maskRepeat: 'no-repeat',
                webkitMaskPosition: 'center',
                maskPosition: 'center',
                backgroundColor: 'currentColor', // This makes it use the font color
                width: '100%',
                height: '100%'
            });

        } else {
            // Standard Icon
            iconEl = document.createElement('img');
            iconEl.className = `${btnClass}-img`;
            iconEl.src = this._getIconPath(side, config.category, config.iconName, suffix, config.position);
            iconEl.alt = config.title || 'Tool';
            
            // Store metadata for theme switching
            iconEl.dataset.tbIcon = 'true';
            iconEl.dataset.side = side;
            iconEl.dataset.category = config.category;
            iconEl.dataset.name = config.iconName;
            if (config.position) iconEl.dataset.position = config.position;
        }
        
        btn.appendChild(iconEl);
    }

    /**
     * Internal: Construct Icon Path
     */
    _getIconPath(side, category, name, suffix, position) {
        const folder = `${side}ToolBar`;
        let subFolder = '';

        if (side === 'Left' || side === 'Right') {
            // Vertical Logic
            if (category === 'view' || category === 'custom') {
                subFolder = `${side}ToolBottomBar`;
            } else {
                subFolder = `${side}ToolTopBar`;
            }
        } else {
            // Horizontal Logic (Top)
            if (position === 'right') {
                subFolder = `${side}ToolRightBar`;
            } else {
                subFolder = `${side}ToolLeftBar`;
            }
        }

        return `${BASE_ICON_PATH}${folder}/${subFolder}/${name}${suffix}.svg`;
    }

    /**
     * Internal: Append Text Label
     */
    _appendText(btn, config) {
        const span = document.createElement('span');
        span.textContent = config.text;
        span.style.fontSize = '14px';
        span.style.fontWeight = 'bold';
        span.style.color = 'var(--color-font)';
        btn.appendChild(span);
    }
}

/* Export Global Instance */
window.ToolBarFactory = ToolBarFactory;
