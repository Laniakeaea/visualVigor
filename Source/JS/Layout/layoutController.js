/* =========================================
   Layout Controller
   ========================================= */

export class LayoutController {
    constructor() {
        this.isDualView = true;
        this.isLeftPanelVisible = true;
        this.isRightPanelVisible = true;
        this.isBottomPanelVisible = true;
        
        this.bindEvents();
    }

    bindEvents() {
        // Listen for layout initialization to ensure we can grab elements
        // Or just grab them lazily
    }

    /**
     * Toggle Dual View Mode
     */
    toggleDualView(forceState) {
        if (typeof forceState === 'boolean') {
            this.isDualView = forceState;
        } else {
            this.isDualView = !this.isDualView;
        }
        this.updateLayout('dualView');
        this.dispatchStateChange();
        return this.isDualView;
    }

    /**
     * Toggle Left Panel
     */
    toggleLeftPanel(forceState) {
        if (typeof forceState === 'boolean') {
            this.isLeftPanelVisible = forceState;
        } else {
            this.isLeftPanelVisible = !this.isLeftPanelVisible;
        }
        this.updateLayout('leftPanel');
        this.dispatchStateChange();
        return this.isLeftPanelVisible;
    }

    /**
     * Toggle Right Panel
     */
    toggleRightPanel(forceState) {
        if (typeof forceState === 'boolean') {
            this.isRightPanelVisible = forceState;
        } else {
            this.isRightPanelVisible = !this.isRightPanelVisible;
        }
        this.updateLayout('rightPanel');
        this.dispatchStateChange();
        return this.isRightPanelVisible;
    }

    /**
     * Re-render the right toolbar with updated config
     */
    reloadRightToolbar() {
        const side = 'Right';
        const oldBar = document.querySelector(`.verticalToolBar[data-side="${side}"]`);
        
        if (oldBar && window.toolBarFactory) {
            // Import dynamically or assume global import of config
            import('/Source/JS/Config/toolBarConfig.js').then(module => {
                const config = module.rightToolBarConfig;
                const parent = oldBar.parentNode;
                
                // Preserve position in DOM
                const nextSibling = oldBar.nextSibling;
                
                oldBar.remove();
                
                const newBar = window.toolBarFactory.createToolBar(side, config);
                // LayoutBuilder adds 'position-right' class manually
                newBar.classList.add('position-right');
                
                if (nextSibling) {
                    parent.insertBefore(newBar, nextSibling);
                } else {
                    parent.appendChild(newBar);
                }
                
                console.log('Right Toolbar re-rendered with new plugins.');
            });
        }
    }


    /**
     * Toggle Bottom Panel
     */
    toggleBottomPanel(forceState) {
        if (typeof forceState === 'boolean') {
            this.isBottomPanelVisible = forceState;
        } else {
            this.isBottomPanelVisible = !this.isBottomPanelVisible;
        }
        this.updateLayout('bottomPanel');
        this.dispatchStateChange();
        return this.isBottomPanelVisible;
    }

    updateLayout(target) {
        // Handle Dual View
        if (!target || target === 'dualView') {
            const workspace = document.querySelector('.workspace');
            if (workspace) {
                const views = workspace.querySelectorAll('.workspace__split-view');
                if (views.length >= 2) {
                    views[1].style.display = this.isDualView ? '' : 'none';
                }
            }
        }

        // Handle Left Panel
        if (!target || target === 'leftPanel') {
            const panel = document.querySelector('.layout-panel.layout-panel--left');
            if (panel) {
                panel.style.display = this.isLeftPanelVisible ? '' : 'none';
                // Hide associated drag line (next sibling)
                const dragLine = panel.nextElementSibling;
                if (dragLine && dragLine.classList.contains('drag-line--vertical')) {
                    dragLine.style.display = this.isLeftPanelVisible ? '' : 'none';
                }
            }
        }

        // Handle Right Panel
        if (!target || target === 'rightPanel') {
            const panel = document.querySelector('.layout-panel.layout-panel--right');
            if (panel) {
                panel.style.display = this.isRightPanelVisible ? '' : 'none';
                // Hide associated drag line (previous sibling)
                const dragLine = panel.previousElementSibling;
                if (dragLine && dragLine.classList.contains('drag-line--vertical')) {
                    dragLine.style.display = this.isRightPanelVisible ? '' : 'none';
                }
            }
        }

        // Handle Bottom Panel
        if (!target || target === 'bottomPanel') {
            const panel = document.querySelector('.layout-panel.layout-panel--bottom');
            if (panel) {
                panel.style.display = this.isBottomPanelVisible ? '' : 'none';
                // Hide associated drag line (previous sibling)
                const dragLine = panel.previousElementSibling;
                if (dragLine && dragLine.classList.contains('drag-line--horizontal')) {
                    dragLine.style.display = this.isBottomPanelVisible ? '' : 'none';
                }
            }
        }
    }

    dispatchStateChange() {
        const event = new CustomEvent('layoutStateChanged', { 
            detail: { 
                dualView: this.isDualView,
                leftPanel: this.isLeftPanelVisible,
                rightPanel: this.isRightPanelVisible,
                bottomPanel: this.isBottomPanelVisible
            } 
        });
        window.dispatchEvent(event);
    }
}
