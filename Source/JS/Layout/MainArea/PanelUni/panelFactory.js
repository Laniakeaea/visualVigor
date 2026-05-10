/* =========================================
   Panel Factory Module
   ========================================= */

class PanelFactory {
    /**
     * Create a Panel component
     * @param {string} type - 'vertical' or 'horizontal' (formerly side/bottom)
     * @param {Object} config - Configuration object
     * @param {string} [config.position] - 'left', 'right', 'bottom', 'top'
     * @param {string} [config.title] - Title text (optional)
     * @param {HTMLElement} [config.content] - Content element (optional)
     * @returns {HTMLElement} The panel DOM element
     */
    createPanel(type, config = {}) {
        const panel = document.createElement('div');
        
        // Base Class
        panel.className = 'layout-panel';
        
        // Orientation Modifier
        if (type === 'vertical' || type === 'side') {
            panel.classList.add('layout-panel--vertical');
        } else if (type === 'horizontal' || type === 'bottom') {
            panel.classList.add('layout-panel--horizontal');
        } else if (type === 'main' || type === 'center') {
            panel.classList.add('layout-panel--main');
        } else {
            console.warn(`PanelFactory: Unknown type '${type}', defaulting to vertical.`);
            panel.classList.add('layout-panel--vertical');
        }

        // Position Modifier
        if (config.position) {
            panel.classList.add(`layout-panel--${config.position}`);
        }

        // Title Bar (Optional)
        if (config.title || config.i18n) {
            const titleBar = document.createElement('div');
            titleBar.className = 'layout-panel__title';
            
            const label = document.createElement('span');
            label.className = 'layout-panel__title-label';
            
            if (config.i18n) {
                label.setAttribute('data-i18n', config.i18n);
            }
            
            // Set initial text (fallback or static)
            if (config.title) {
                label.textContent = config.title;
            }
            
            titleBar.appendChild(label);
            panel.appendChild(titleBar);
        }

        // Content Container
        const container = document.createElement('div');
        container.className = 'layout-panel__container';
        
        if (config.content) {
            container.appendChild(config.content);
        }
        
        panel.appendChild(container);

        return panel;
    }
}

window.PanelFactory = PanelFactory;
