/* =========================================
   Edit System
   ========================================= */

export class EditSystem {
    constructor() {
        this.history = [];
        this.historyIndex = -1;
        this.maxHistory = Infinity; // Practically infinite
        
        // Auto Save
        this.autoSaveEnabled = false;
        this.autoSaveTimer = null;
    }

    setAutoSave(enabled) {
        this.autoSaveEnabled = enabled;
        if (enabled && window.projectModel && window.projectModel.isDirty) {
             this._triggerAutoSave();
        }
    }

    _triggerAutoSave() {
        if (!this.autoSaveEnabled) return;
        
        // Debounce simple save
        if (this.autoSaveTimer) clearTimeout(this.autoSaveTimer);
        this.autoSaveTimer = setTimeout(() => {
            if (window.fileSystem) window.fileSystem.saveFile();
        }, 1000); // 1-second delay after last action
    }

    /**
     * Adds a command to the history stack.
     * @param {Object} command - Must implement undo() and redo().
     */
    addCommand(command) {
        // Remove any redo history
        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }

        this.history.push(command);
        this.historyIndex++;

        // Limit history size
        if (this.history.length > this.maxHistory) {
            this.history.shift();
            this.historyIndex--;
        }

        if (window.projectModel) {
            window.projectModel.setDirty(true);
        }

        this._dispatchStateChange();
        this._triggerAutoSave();
    }

    undo() {
        if (this.historyIndex >= 0) {
            const command = this.history[this.historyIndex];
            command.undo();
            this.historyIndex--;
            
            if (window.projectModel) {
                window.projectModel.setDirty(true);
            }

            this._dispatchStateChange();
            this._triggerAutoSave();
            
            if (window.infoSystem) {
                window.infoSystem.showInfo('info', 'Layout.InfoBar.InfoContent.undoPerformed', 1000);
            }
        } else {
            if (window.infoSystem) {
                window.infoSystem.showInfo('info', 'Layout.InfoBar.InfoContent.nothingToUndo', 1000);
            }
        }
    }

    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            const command = this.history[this.historyIndex];
            command.redo();

            if (window.projectModel) {
                window.projectModel.setDirty(true);
            }

            this._dispatchStateChange();
            this._triggerAutoSave();
            
            if (window.infoSystem) {
                window.infoSystem.showInfo('info', 'Layout.InfoBar.InfoContent.redoPerformed', 1000);
            }
        } else {
            if (window.infoSystem) {
                window.infoSystem.showInfo('info', 'Layout.InfoBar.InfoContent.nothingToRedo', 1000);
            }
        }
    }

    _dispatchStateChange() {
        window.dispatchEvent(new CustomEvent('historyChanged', {
            detail: {
                canUndo: this.historyIndex >= 0,
                canRedo: this.historyIndex < this.history.length - 1
            }
        }));
    }

    cut() {
        console.log('EditSystem: Cut');
    }

    copy() {
        console.log('EditSystem: Copy');
    }

    paste() {
        console.log('EditSystem: Paste');
    }
}
