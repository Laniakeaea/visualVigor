import { DialogView } from './DialogView.js';
import { DialogFactory } from './DialogFactory.js';

/* =========================================
   Dialog Manager (Controller)
   ========================================= */

export class DialogController {
    constructor() {
        this.view = new DialogView(this);
        this.activeDialog = null;
        // Expose Factory for easy access
        this.factory = DialogFactory;
    }

    /**
     * Shows a dialog based on configuration.
     * @param {Object} config - Configuration object (usually from DialogFactory)
     */
    show(config) {
        // Wrap callbacks to ensure close() is called
        if (config.buttons) {
            config.buttons.forEach(btn => {
                const originalClick = btn.onClick;
                btn.onClick = async () => {
                    if (originalClick) {
                         // Check if the callback returns false (meaning "wait, don't close")
                         const result = await originalClick();
                         if (result === false) return;
                    }
                    this.close();
                };
            });
        }

        this.activeDialog = config;
        this.view.show(config);
    }

    close() {
        this.view.hide();
        this.activeDialog = null;
    }

    // --- Convenience Methods (Delegating to Factory) ---

    showConfirm(title, message, onConfirm, onCancel) {
        const config = DialogFactory.createConfirm(title, message, onConfirm, onCancel);
        this.show(config);
    }

    showAlert(title, message, onConfirm) {
        const config = DialogFactory.createAlert(title, message, onConfirm);
        this.show(config);
    }

    showNewFileDialog(onConfirm, onCancel) {
        const config = DialogFactory.createNewFile(onConfirm, onCancel);
        this.show(config);
    }
}
