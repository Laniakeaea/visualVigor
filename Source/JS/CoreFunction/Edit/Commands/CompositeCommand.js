/* =========================================
   Composite Command (Macro)
   ========================================= */

export class CompositeCommand {
    /**
     * @param {string} name - Name of the command (for UI/Logs)
     * @param {Array} commands - List of commands to execute together
     */
    constructor(name, commands = []) {
        this.name = name;
        this.commands = commands;
    }

    addCommand(command) {
        this.commands.push(command);
    }

    undo() {
        // Undo in reverse order
        for (let i = this.commands.length - 1; i >= 0; i--) {
            this.commands[i].undo();
        }
    }

    redo() {
        // Redo in original order
        for (let i = 0; i < this.commands.length; i++) {
            this.commands[i].redo();
        }
    }
}
