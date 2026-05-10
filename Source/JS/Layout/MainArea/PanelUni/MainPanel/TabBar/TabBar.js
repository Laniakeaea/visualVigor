/* =========================================
   Tab Bar Component
   ========================================= */

export class TabBar {
    constructor(container) {
        this.container = container;
        this.container.classList.add('workspace__tabs');
        
        // Scroll Container
        this.scrollContainer = document.createElement('div');
        this.scrollContainer.className = 'workspace__tabs-scroll';
        this.container.appendChild(this.scrollContainer);

        this.tabs = []; // { id, element, config }
        this.activeTabId = null;
        
        // Drag State
        this.draggedItem = null;
        
        this._bindEvents();
    }

    _bindEvents() {
        this.scrollContainer.addEventListener('dragover', (e) => {
            e.preventDefault(); // Allow drop
            e.dataTransfer.dropEffect = 'move';
            const afterElement = this._getDragAfterElement(e.clientX);
            const draggable = this.draggedItem; // Use instance property
            if (draggable) {
                if (afterElement == null) {
                    this.scrollContainer.appendChild(draggable);
                } else {
                    this.scrollContainer.insertBefore(draggable, afterElement);
                }
            }
        });
        
        // Horizontal Scroll with Wheel
        this.scrollContainer.addEventListener('wheel', (e) => {
            if (e.deltaY !== 0) {
                e.preventDefault();
                this.scrollContainer.scrollLeft += e.deltaY;
            }
        });
    }

    _getDragAfterElement(x) {
        const draggableElements = [...this.scrollContainer.querySelectorAll('.workspace__tab:not(.dragging)')];

        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = x - box.left - box.width / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    /**
     * Add a new tab
     * @param {Object} config - { id, title, onClose, onActivate }
     */
    addTab(config) {
        const tab = document.createElement('div');
        tab.className = 'workspace__tab';
        tab.draggable = true;
        tab.dataset.id = config.id;
        tab.dataset.dirty = "false"; // Default dirty state

        // Dirty Indicator
        const dirty = document.createElement('span');
        dirty.className = 'workspace__tab-dirty';
        dirty.textContent = '●';
        tab.appendChild(dirty);

        // Title
        const title = document.createElement('span');
        title.className = 'workspace__tab-name';
        title.textContent = config.title || 'Untitled';
        tab.appendChild(title);

        // Close Button
        const closeBtn = document.createElement('div');
        closeBtn.className = 'workspace__tab-close';
        closeBtn.textContent = '×';
        closeBtn.onclick = (e) => {
            e.stopPropagation(); // Prevent activation
            this.removeTab(config.id);
            if (config.onClose) config.onClose(config.id);
        };
        tab.appendChild(closeBtn);

        // Click to Activate
        tab.onclick = () => {
            this.activateTab(config.id);
            if (config.onActivate) config.onActivate(config.id);
        };

        // Drag Events
        tab.addEventListener('dragstart', (e) => {
            tab.classList.add('dragging');
            this.draggedItem = tab;
            e.dataTransfer.effectAllowed = 'move';
        });

        tab.addEventListener('dragend', () => {
            tab.classList.remove('dragging');
            this.draggedItem = null;
        });

        this.scrollContainer.appendChild(tab);
        this.tabs.push({ id: config.id, element: tab, config });

        // Activate if first
        if (this.tabs.length === 1) {
            this.activateTab(config.id);
            if (config.onActivate) config.onActivate(config.id);
        }
    }

    removeTab(id) {
        const index = this.tabs.findIndex(t => t.id === id);
        if (index > -1) {
            const tab = this.tabs[index];
            tab.element.remove();
            this.tabs.splice(index, 1);

            // If active was removed, activate another
            if (this.activeTabId === id && this.tabs.length > 0) {
                // Try next, or prev (index is now next because of splice, or last if index was last)
                const nextIndex = Math.min(index, this.tabs.length - 1);
                const nextTab = this.tabs[nextIndex];
                if (nextTab) {
                    this.activateTab(nextTab.id);
                    if (nextTab.config.onActivate) nextTab.config.onActivate(nextTab.id);
                }
            } else if (this.tabs.length === 0) {
                this.activeTabId = null;
            }
        }
    }

    activateTab(id) {
        this.tabs.forEach(t => {
            if (t.id === id) {
                t.element.classList.add('active');
                this.activeTabId = id;
            } else {
                t.element.classList.remove('active');
            }
        });
    }

    setTabDirty(id, isDirty) {
        const tab = this.tabs.find(t => t.id === id);
        if (tab) {
            tab.element.dataset.dirty = isDirty.toString();
        }
    }
}
