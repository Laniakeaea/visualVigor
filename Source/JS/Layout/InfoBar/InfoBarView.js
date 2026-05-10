import { INFO_BAR_STATE_CLASSES, INFO_BAR_DEFAULT_TEXTS } from './InfoBarConfig.js';

export class InfoBarView {
    constructor(callbacks) {
        this.callbacks = callbacks || {};
        this.infoLeftBar = null;
        this.statusButton = null;
    }

    bindElements() {
        this.infoLeftBar = document.querySelector('.info-bar__left');
        if (this.infoLeftBar) {
            this.statusButton = this.infoLeftBar.querySelector('.info-bar__btn:first-child');
            if (this.statusButton) {
                // Initialize to default state
                this.updateStatusButton('ready');

                // Re-translate after language loads (handles race condition)
                const lm = window.SoftWareApp?.languageManager || window.languageManager;
                if (lm && lm.readyPromise) {
                    lm.readyPromise.then(() => this.updateStatusButton('ready'));
                }
            }
        }
    }

    updateStatusButton(state) {
        if (!this.statusButton) return;

        /* Remove old classes */
        Object.values(INFO_BAR_STATE_CLASSES).forEach(className => {
            this.statusButton.classList.remove(className);
        });

        /* Add new class */
        const newClass = INFO_BAR_STATE_CLASSES[state];
        if (newClass) {
            this.statusButton.classList.add(newClass);
        }

        /* Set i18n attribute */
        this.statusButton.setAttribute('data-i18n', `Layout.InfoBar.InfoState.${state}`);

        /* Update text */
        const languageManager = window.SoftWareApp?.languageManager || window.languageManager;
        if (languageManager && typeof languageManager.updateElement === 'function') {
            languageManager.updateElement(this.statusButton);
        } else {
            this.statusButton.textContent = INFO_BAR_DEFAULT_TEXTS[state] || state;
        }
    }

    updateMessageButtons(messages) {
        if (!this.infoLeftBar) return;

        /* Remove existing message buttons */
        const messageButtons = this.infoLeftBar.querySelectorAll('.info-bar__btn:not(:first-child)');
        messageButtons.forEach(btn => btn.remove());

        if (!messages || messages.length === 0) return;

        /* Create new buttons */
        messages.forEach((message) => {
            const button = document.createElement('button');
            button.className = 'info-bar__btn info-bar__message-btn';
            
            // InfoSystem already translates messages, so we use it directly
            button.textContent = message;
            
            /* Add data-i18n if it looks like a key (alphanumeric+dots, no spaces/Chinese) */
            // Fix: Avoid treating "Running..." or Chinese text as keys
            const keyRegex = /^[a-zA-Z0-9_]+(\.[a-zA-Z0-9_]+)+$/;
            
            if (typeof message === 'string' && keyRegex.test(message)) {
                button.setAttribute('data-i18n', message);
                
                // Attempt immediate translation
                const languageManager = window.SoftWareApp?.languageManager || window.languageManager;
                if (languageManager && typeof languageManager.updateElement === 'function') {
                    languageManager.updateElement(button);
                }
            }
            
            /* Click handler */
            button.addEventListener('click', () => {
                if (this.callbacks.onMessageClick) {
                    this.callbacks.onMessageClick(message);
                }
            });

            this.infoLeftBar.appendChild(button);
        });
    }
}
