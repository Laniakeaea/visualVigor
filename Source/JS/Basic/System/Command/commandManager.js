/* =========================================
   Command Manager Module
   ========================================= */

export class CommandManager {
    constructor() {
        this.commands = new Map();
    }

    /**
     * Register a command handler
     * @param {string} id - Command ID (e.g., 'fileNew')
     * @param {Function} handler - The function to execute
     */
    register(id, handler) {
        if (this.commands.has(id)) {
            console.warn(`CommandManager: Overwriting command '${id}'`);
        }
        this.commands.set(id, handler);
    }

    /**
     * Execute a command
     * @param {string} id - Command ID
     * @param {...any} args - Arguments to pass to the handler
     */
    execute(id, ...args) {
        const handler = this.commands.get(id);
        if (handler) {
            try {
                handler(...args);
            } catch (error) {
                console.error(`CommandManager: Error executing '${id}':`, error);
            }
        } else {
            console.warn(`CommandManager: Command '${id}' not found.`);
        }
    }
}
