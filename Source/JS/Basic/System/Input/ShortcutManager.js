import { shortcutConfig } from '/Source/JS/Config/shortcutConfig.js';

/* =========================================
   Shortcut Manager
   ========================================= */

export class ShortcutManager {
    constructor(commandManager) {
        this.commandManager = commandManager;
        this.isEnabled = true;
        this._bindHandler = this._handleKeyDown.bind(this);
    }

    init() {
        document.addEventListener('keydown', this._bindHandler);
    }

    destroy() {
        document.removeEventListener('keydown', this._bindHandler);
    }

    disable() {
        this.isEnabled = false;
    }

    enable() {
        this.isEnabled = true;
    }

    _handleKeyDown(e) {
        if (!this.isEnabled) return;
        
        // Ignore if focus is in an input field (unless modifiers are used, maybe?)
        const tag = e.target.tagName.toLowerCase();
        if (tag === 'input' || tag === 'textarea' || e.target.isContentEditable) {
            return;
        }

        const key = e.key.toLowerCase();
        const code = e.code;
        const isCtrl = e.ctrlKey || e.metaKey;
        const isShift = e.shiftKey;
        const isAlt = e.altKey;

        let matchFound = false;

        // Iterate through config to find match
        for (const group of shortcutConfig) {
            for (const item of group.items) {
                // Check key match
                let isKeyMatch = false;

                // Priority to 'code' for position-independent or shift-sensitive keys (like digits)
                if (item.code) {
                    if (item.code === code) {
                        isKeyMatch = true;
                    }
                } else if (item.key.toLowerCase() === key) {
                     isKeyMatch = true;
                }

                if (!isKeyMatch) continue;
                
                // Check modifiers
                const itemCtrl = !!item.ctrl;
                const itemShift = !!item.shift;
                const itemAlt = !!item.alt;

                if (isCtrl === itemCtrl && isShift === itemShift && isAlt === itemAlt) {
                    // Match found!
                    e.preventDefault();
                    e.stopPropagation(); // Stop bubbling
                    matchFound = true;

                    if (this.commandManager) {
                        this.commandManager.execute(item.action);
                    }
                    return; // Stop after first match
                }
            }
        }

        if (!matchFound) {
             if (isCtrl && !isAlt && !isShift) {
                 if (['s', 'o', 'n', 'p'].includes(key)) {
                     e.preventDefault();
                 }
             }
        }
    }

    /**
     * Returns the config structure for UI display
     */
    getConfig() {
        return shortcutConfig;
    }
}
