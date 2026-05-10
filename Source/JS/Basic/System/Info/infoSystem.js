/* =========================================
   Info System Module (Logic Layer)
   ========================================= */

/*
 * InfoSystem - Information Status Management Service
 * 
 * Functionality:
 * - Manages message queue, priority, and state transitions.
 * - Emits events when state changes, decoupling logic from UI.
 * - Does NOT manipulate DOM directly.
 */

export class InfoSystem extends EventTarget {
    constructor() {
        super();
        
        /* Priority Definitions (Lower value = Higher priority) */
        this.statePriority = {
            'error': 1,     // Highest priority
            'warning': 2,   // High priority
            'loading': 2,   // Same as warning
            'info': 3,      // Medium priority
            'success': 4,   // Low priority
            'ready': 5      // Lowest priority (Default)
        };

        /* State Management */
        this.messageQueue = [];
        this.currentState = 'ready';
        this.currentMessages = [];
        this.displayTimer = null;
    }

    /*
     * Show Information
     * @param {string} type - 'ready', 'error', 'warning', 'info', 'success'
     * @param {string|Array} messages - Message content
     * @param {number} duration - Display duration in ms (0 = permanent)
     * @param {boolean} interrupt - Whether it can be interrupted
     */
    showInfo(type, messages = [], duration = 0, interrupt = true) {
        /* Compatibility for 'warn' */
        if (type === 'warn') type = 'warning';

        /* Validate type */
        if (!this.statePriority.hasOwnProperty(type)) {
            console.warn(`InfoSystem: Unknown info type '${type}'`);
            return;
        }

        /* Auto-Translate Messages */
        if (window.languageManager) {
            const msgs = Array.isArray(messages) ? messages : [messages];
            messages = msgs.map(msg => {
                if (typeof msg !== 'string') return msg;

                // Case 1: Compound Key (contains dots and NO spaces) -> Expect translation
                if (msg.includes('.') && !/\s/.test(msg)) {
                    return window.languageManager.t(msg);
                } 
                
                // Case 2: Simple String -> Try to translate silently, use if found
                const translated = window.languageManager.t(msg, true); // silent
                return translated !== msg ? translated : msg;
            });
            // If original was string, return string. If array, return array.
            if (!Array.isArray(arguments[1])) {
                messages = messages[0];
            }
        }

        /* Ensure messages is array */
        if (typeof messages === 'string') messages = [messages];

        /* Create message object */
        const messageObj = {
            id: Date.now() + Math.random(),
            type: type,
            messages: messages,
            duration: duration,
            interrupt: interrupt,
            priority: this.statePriority[type],
            timestamp: Date.now()
        };

        /* Add to queue */
        this.messageQueue.push(messageObj);

        /* Sort by priority */
        this.messageQueue.sort((a, b) => {
            if (a.priority === b.priority) {
                return a.timestamp - b.timestamp;
            }
            return a.priority - b.priority;
        });

        /* Process queue */
        this.processQueue();
    }

    /* Process Message Queue */
    processQueue() {
        if (this.messageQueue.length === 0) {
            this.setState('ready', []);
            return;
        }

        const nextMessage = this.messageQueue[0];
        
        /* Check interruption */
        if (this.currentState !== 'ready' && !this.shouldInterrupt(nextMessage)) {
            return;
        }

        /* Display new message */
        this.displayMessage(nextMessage);
    }

    /* Check if should interrupt current message */
    shouldInterrupt(newMessage) {
        const currentPriority = this.statePriority[this.currentState];
        return newMessage.priority < currentPriority || newMessage.interrupt;
    }

    /* Display Message */
    displayMessage(messageObj) {
        /* Clear current timer */
        if (this.displayTimer) {
            clearTimeout(this.displayTimer);
            this.displayTimer = null;
        }

        /* Update state */
        this.setState(messageObj.type, messageObj.messages);

        /* Remove from queue */
        this.messageQueue = this.messageQueue.filter(msg => msg.id !== messageObj.id);

        /* Set auto-clear timer */
        if (messageObj.duration > 0) {
            this.displayTimer = setTimeout(() => {
                this.processQueue();
            }, messageObj.duration);
        }
    }

    /* Set State and Emit Event */
    setState(state, messages) {
        this.currentState = state;
        this.currentMessages = messages;
        
        /* Emit event for UI to handle */
        this.dispatchEvent(new CustomEvent('stateChanged', {
            detail: {
                state: this.currentState,
                messages: this.currentMessages
            }
        }));
    }

    /* Clear All */
    clear() {
        this.messageQueue = [];
        if (this.displayTimer) {
            clearTimeout(this.displayTimer);
            this.displayTimer = null;
        }
        this.setState('ready', []);
    }
}
