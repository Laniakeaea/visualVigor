/* =========================================
   Info Bar Controller (View Layer)
   ========================================= */

import { InfoBarView } from './InfoBarView.js';

export class InfoBar {
    constructor(infoSystem) {
        this.infoSystem = infoSystem;
        
        // Initialize View with callbacks
        this.view = new InfoBarView({
            onMessageClick: (msg) => this.handleMessageClick(msg)
        });

        this.init();
    }

    init() {
        /* Wait for DOM */
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.view.bindElements());
        } else {
            this.view.bindElements();
        }

        /* Listen for InfoSystem events */
        this.infoSystem.addEventListener('stateChanged', (e) => {
            this.view.updateStatusButton(e.detail.state);
            this.view.updateMessageButtons(e.detail.messages);
        });

        /* Listen for language changes */
        window.addEventListener('languageChanged', () => {
            if (this.view.statusButton) {
                const currentState = this.infoSystem.currentState;
                this.view.updateStatusButton(currentState);
            }
        });
    }

    handleMessageClick(message) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(message).then(() => {
                const successMessage = this.translate('Layout.InfoBar.InfoContent.messageCopied') || 'Message copied';
                this.infoSystem.showInfo('success', successMessage, 2000);
            }).catch(() => {
                const failMessage = this.translate('Layout.InfoBar.InfoContent.copyFailed') || 'Failed to copy';
                this.infoSystem.showInfo('error', failMessage, 2000);
            });
        }
    }

    translate(key) {
        const languageManager = window.SoftWareApp?.languageManager || window.languageManager;
        if (languageManager && typeof languageManager.t === 'function') {
            return languageManager.t(key) || key;
        }
        return key;
    }
}
