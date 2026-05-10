/* =========================================
   Vector Command
   ========================================= */

export class VectorCommand {
    /**
     * @param {string} action - 'add', 'remove', 'modify'
     * @param {Object} element - The vector element object
     * @param {Object} [oldProperties] - For 'modify' action
     * @param {Object} [newProperties] - For 'modify' action
     */
    constructor(action, element, oldProperties = null, newProperties = null) {
        this.action = action;
        this.element = element;
        this.oldProperties = oldProperties;
        this.newProperties = newProperties;
    }

    undo() {
        if (this.action === 'add') {
            window.projectModel.removeVectorElement(this.element.id);
        } else if (this.action === 'remove') {
            window.projectModel.restoreVectorElement(this.element);
        } else if (this.action === 'modify') {
            this._applyProperties(this.oldProperties);
        }
    }

    redo() {
        if (this.action === 'add') {
            window.projectModel.restoreVectorElement(this.element);
        } else if (this.action === 'remove') {
            window.projectModel.removeVectorElement(this.element.id);
        } else if (this.action === 'modify') {
            this._applyProperties(this.newProperties);
        }
    }

    _applyProperties(props) {
        if (!this.element || !props) return;
        
        // Handle Type Change (Special property _type)
        // We clone props to avoid mutating the history state
        const propsToApply = { ...props };
        
        if (propsToApply._type) {
            this.element.type = propsToApply._type;
            delete propsToApply._type;
        }

        this.element.properties = propsToApply;
        window.dispatchEvent(new CustomEvent('projectLayersChanged'));
    }
}
