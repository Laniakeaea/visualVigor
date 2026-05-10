export class ShortcutGuideController {
    constructor() {
        this.isActive = false;
        this.overlay = null;
    }

    show() {
        if (this.isActive) return;
        this.isActive = true;
        this.createOverlay();
        
        // Trigger animation
        requestAnimationFrame(() => {
            if (this.overlay) this.overlay.classList.add('is-visible');
        });
    }

    _getShortcutData() {
        if (window.shortcutManager) {
            const config = window.shortcutManager.getConfig();
            // Transform config for UI if needed (structure matches currently)
            return config.map(group => ({
                groupKey: group.group,
                items: group.items.map(item => ({
                    label: item.label,
                    keys: this._formatKeyString(item)
                }))
            }));
        }
        return [];
    }

    _formatKeyString(item) {
        const t = window.languageManager ? window.languageManager.t.bind(window.languageManager) : (s) => s;
        const keys = [];

        if (item.ctrl) keys.push(t('HelpMenu.Shortcuts.Ctrl') || 'Ctrl');
        if (item.shift) keys.push(t('HelpMenu.Shortcuts.Shift') || 'Shift');
        if (item.alt) keys.push(t('HelpMenu.Shortcuts.Alt') || 'Alt');
        
        // If it's a digit key, we show just the number
        let k = item.key.toUpperCase();
        if (item.code && item.code.startsWith('Digit')) {
           k = item.code.replace('Digit', '');
        }

        if (k === ' ') k = t('HelpMenu.Shortcuts.Space') || 'Space';
        keys.push(k);
        return keys;
    }

    hide() {
        if (this.overlay) {
            this.overlay.classList.remove('is-visible');
            setTimeout(() => {
                if (this.overlay) this.overlay.remove();
                this.overlay = null;
                this.isActive = false;
            }, 300);
        }
    }

    createOverlay() {
        const t = window.languageManager ? window.languageManager.t.bind(window.languageManager) : (s) => s;

        // Container
        this.overlay = document.createElement('div');
        this.overlay.className = 'shortcut-overlay';
        this.overlay.onclick = (e) => {
            if (e.target === this.overlay) this.hide();
        };

        const container = document.createElement('div');
        container.className = 'shortcut-container';

        // Header
        const header = document.createElement('div');
        header.className = 'shortcut-header';
        const title = document.createElement('div');
        title.className = 'shortcut-title';
        title.textContent = t('HelpMenu.Shortcuts.Title') || 'Keyboard Shortcuts';
        header.appendChild(title);
        container.appendChild(header);

        // Grid
        const grid = document.createElement('div');
        grid.className = 'shortcut-grid';

        const shortcutData = this._getShortcutData();

        shortcutData.forEach(group => {
            const groupEl = document.createElement('div');
            groupEl.className = 'shortcut-group';
            
            const groupTitle = document.createElement('div');
            groupTitle.className = 'shortcut-group-title';
            groupTitle.textContent = t(group.groupKey);
            groupEl.appendChild(groupTitle);

            group.items.forEach(item => {
                const itemEl = document.createElement('div');
                itemEl.className = 'shortcut-item';

                const label = document.createElement('span');
                label.className = 'shortcut-label';
                label.textContent = t(item.label) || item.label; // Fallback to raw string
                
                const keysContainer = document.createElement('div');
                keysContainer.className = 'shortcut-keys';
                
                item.keys.forEach((k, idx) => {
                    if (idx > 0) {
                        const sep = document.createElement('span');
                        sep.className = 'key-separator';
                        sep.textContent = '+';
                        keysContainer.appendChild(sep);
                    }
                    const keyCap = document.createElement('span');
                    keyCap.className = 'key-cap';
                    // Convert symbols if needed
                    keyCap.textContent = k;
                    keysContainer.appendChild(keyCap);
                });

                itemEl.appendChild(label);
                itemEl.appendChild(keysContainer);
                groupEl.appendChild(itemEl);
            });

            grid.appendChild(groupEl);
        });

        container.appendChild(grid);

        // Close Hint
        const hint = document.createElement('div');
        hint.className = 'shortcut-close-hint';
        hint.textContent = t('Popup.Dialog.NewProject.Cancel'); // "Cancel" or "Close"
        hint.onclick = () => this.hide();
        container.appendChild(hint);

        this.overlay.appendChild(container);
        document.body.appendChild(this.overlay);
    }
}
