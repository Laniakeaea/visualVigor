export class VectorManager {
    constructor(model) {
        this.model = model;
    }

    get data() { return this.model.data; }

    addElement(type = 'Shape', properties = {}) {
        if (!this.data) return null;
        const id = this.model._generateUniqueId('elem_vec_');
        const newElement = {
            id: id,
            type: type,
            name: `${type} ${this._getNextElementNumber(type)}`,
            visible: true,
            locked: false,
            children: [],
            expanded: true, 
            properties: properties 
        };
        this.data.timeline.vectorLayer.children.push(newElement);
        this.model._dispatchLayersChanged();
        return newElement;
    }

    removeElement(id) {
        if (!this.data) return;
        if (this._recursiveRemove(this.data.timeline.vectorLayer.children, id)) {
            this.model._dispatchLayersChanged();
        }
    }

    groupElements(ids) {
        if (!this.data || !ids || ids.length < 1) return null;

        const targets = [];
        for (const id of ids) {
            const result = this._findElementAndParent(this.data.timeline.vectorLayer.children, id);
            if (result) targets.push(result);
        }

        if (targets.length === 0) return null;

        const parentList = targets[0].parent;
        const siblings = targets.filter(t => t.parent === parentList);

        if (siblings.length === 0) return null;

        siblings.sort((a, b) => a.index - b.index);
        const insertIndex = siblings[0].index;

        const groupId = this.model._generateUniqueId('elem_group_');
        const groupElement = {
            id: groupId,
            type: 'group',
            name: `Group ${this._getNextElementNumber('group')}`,
            visible: true,
            locked: false,
            children: [],
            expanded: true,
            properties: {}
        };

        for (let i = siblings.length - 1; i >= 0; i--) {
            const t = siblings[i];
            t.parent.splice(t.index, 1);
            groupElement.children.unshift(t.element);
        }

        parentList.splice(insertIndex, 0, groupElement);
        this.model._dispatchLayersChanged();
        return groupId;
    }

    ungroupElements(ids) {
        if (!this.data || !ids || ids.length === 0) return [];

        const releasedIds = [];
        for (const id of ids) {
            const result = this._findElementAndParent(this.data.timeline.vectorLayer.children, id);
            if (!result) continue;

            const { element, parent, index } = result;
            if (element.children && element.children.length > 0) {
                let currentInsert = index;
                for (const child of element.children) {
                    parent.splice(currentInsert, 0, child);
                    releasedIds.push(child.id);
                    currentInsert++;
                }
                parent.splice(index + element.children.length, 1);
            }
        }

        if (releasedIds.length > 0) {
            this.model._dispatchLayersChanged();
        }
        return releasedIds;
    }

    restoreElement(element) {
        if (!this.data || !element) return;
        this.data.timeline.vectorLayer.children.push(element);
        this.model._dispatchLayersChanged();
    }

    getElementById(id) {
        if (!this.data) return null;
        return this._findVectorElement(this.data.timeline.vectorLayer.children, id);
    }

    toggleExpand(id) {
        if (!this.data) return;
        const element = this._findVectorElement(this.data.timeline.vectorLayer.children, id);
        if (element) {
            element.expanded = !element.expanded;
            this.model._dispatchLayersChanged();
        }
    }

    toggleVisibility(id) {
        if (!this.data) return;
        const element = this._findVectorElement(this.data.timeline.vectorLayer.children, id);
        if (element) {
            element.visible = !element.visible;
            this.model._dispatchLayersChanged();
        }
    }

    renameElement(id, newName) {
        if (!this.data) return;
        const element = this._findVectorElement(this.data.timeline.vectorLayer.children, id);
        if (element) {
            element.name = newName;
            this.model._dispatchLayersChanged();
        }
    }

    getElements() {
        return this.data ? this.data.timeline.vectorLayer.children : [];
    }

    /* Internal Helpers */

    _getNextElementNumber(type) {
        if (!this.data) return 1;
        const count = this.data.timeline.vectorLayer.children.filter(e => e.type === type).length;
        return count + 1;
    }

    _findElementAndParent(list, id) {
        for (let i = 0; i < list.length; i++) {
            if (list[i].id === id) {
                return { element: list[i], parent: list, index: i };
            }
            if (list[i].children && list[i].children.length > 0) {
                const result = this._findElementAndParent(list[i].children, id);
                if (result) return result;
            }
        }
        return null;
    }

    _recursiveRemove(list, id) {
        const index = list.findIndex(e => e.id === id);
        if (index > -1) {
            list.splice(index, 1);
            return true;
        }
        for (const item of list) {
            if (item.children && item.children.length > 0) {
                if (this._recursiveRemove(item.children, id)) return true;
            }
        }
        return false;
    }

    _findVectorElement(list, id) {
        for (const item of list) {
            if (item.id === id) return item;
            if (item.children && item.children.length > 0) {
                const found = this._findVectorElement(item.children, id);
                if (found) return found;
            }
        }
        return null;
    }
}
