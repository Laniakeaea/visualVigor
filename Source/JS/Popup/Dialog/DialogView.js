/* =========================================
   Dialog View
   ========================================= */

export class DialogView {
    constructor(controller) {
        this.controller = controller;
        this.container = null;
        this.mask = null;
        this.window = null;
        this.header = null;
        this.body = null;
        this.footer = null;
        
        this._buildStructure();
    }

    _buildStructure() {
        // 1. Container
        this.container = document.createElement('div');
        this.container.className = 'dialog-container';

        // 2. Mask
        this.mask = document.createElement('div');
        this.mask.className = 'dialog-mask';
        this.mask.onclick = () => this.controller.close(); // Click mask to close
        this.container.appendChild(this.mask);

        // 3. Window
        this.window = document.createElement('div');
        this.window.className = 'dialog-window';
        this.container.appendChild(this.window);

        // 4. Header
        this.header = document.createElement('div');
        this.header.className = 'dialog-header';
        
        this.title = document.createElement('span');
        this.title.className = 'dialog-title';
        
        this.header.appendChild(this.title);
        this.window.appendChild(this.header);

        // 5. Body
        this.body = document.createElement('div');
        this.body.className = 'dialog-body';
        this.window.appendChild(this.body);

        // 6. Footer
        this.footer = document.createElement('div');
        this.footer.className = 'dialog-footer';
        this.window.appendChild(this.footer);

        // Append to body
        document.body.appendChild(this.container);
    }

    show(config) {
        // Set Title
        this.title.textContent = config.title || 'Dialog';

        // Set Content
        this.body.innerHTML = '';
        if (typeof config.content === 'string') {
            this.body.textContent = config.content;
        } else if (config.content instanceof HTMLElement) {
            this.body.appendChild(config.content);
        }

        // Set Buttons
        this.footer.innerHTML = '';
        if (config.buttons && Array.isArray(config.buttons)) {
            config.buttons.forEach(btnConfig => {
                const btn = document.createElement('button');
                btn.className = `dialog-btn is-${btnConfig.type || 'normal'}`;
                btn.textContent = btnConfig.text || 'Button';
                btn.onclick = () => {
                    if (btnConfig.onClick) btnConfig.onClick();
                    // Auto close if not specified otherwise? 
                    // Usually better to let the callback handle closing or return true to close.
                    // For now, let's assume callback handles logic, and we might close if it returns true?
                    // Or just let controller handle it.
                };
                this.footer.appendChild(btn);
            });
        }

        // Show
        this.container.classList.add('is-visible');
    }

    hide() {
        this.container.classList.remove('is-visible');
    }
}
