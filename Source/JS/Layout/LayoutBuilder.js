/* =========================================
   Layout Builder Module
   Handles DOM construction of the grid system
   ========================================= */

import { DragLine } from '/Source/JS/Layout/MainArea/DragLine/dragLine.js';
import { leftToolBarConfig, rightToolBarConfig, topToolBarConfig } from '/Source/JS/Config/toolBarConfig.js';

export class LayoutBuilder {
    constructor(container, toolBarFactory, panelFactory) {
        this.container = container;
        this.toolBarFactory = toolBarFactory;
        this.panelFactory = panelFactory;
    }

    clearExistingContent() {
        const existingWorkArea = this.container.querySelector('.work-area');
        if (existingWorkArea) existingWorkArea.remove();
    }

    buildLayout() {
        // 1. Left Layout (Toolbar + Panel)
        this._createToolBar('Left', leftToolBarConfig, 'position-left');
        const leftPanel = this._createResizablePanel('vertical', {
            position: 'left', title: 'Left Panel', i18n: 'Layout.MainArea.PanelUni.left'
        }, 'vertical', false);

        // 2. Center Layout (Main + Bottom)
        const centerContainer = document.createElement('div');
        centerContainer.className = 'centerContainer';
        
        this._createToolBar('Top', topToolBarConfig, 'position-top', centerContainer);

        const mainPanel = this.panelFactory.createPanel('main', {
            title: 'Work Space', i18n: 'Layout.MainArea.PanelUni.workspace'
        });
        if (mainPanel) centerContainer.appendChild(mainPanel);

        const bottomPanel = this.panelFactory.createPanel('horizontal', {
            position: 'bottom', title: 'Bottom Panel', i18n: 'Layout.MainArea.PanelUni.bottom'
        });
        
        if (bottomPanel) {
            // DragLine for Bottom Panel
            const bottomDragLine = document.createElement('div');
            bottomDragLine.className = 'drag-line drag-line--horizontal';
            centerContainer.appendChild(bottomDragLine);
            new DragLine(bottomDragLine, 'horizontal', bottomPanel, true);
            centerContainer.appendChild(bottomPanel);
        }

        this.container.appendChild(centerContainer);

        // 3. Right Layout (Panel + Toolbar)
        const rightPanel = this._createResizablePanel('vertical', {
            position: 'right', title: 'Right Panel', i18n: 'Layout.MainArea.PanelUni.right'
        }, 'vertical', true);
        
        this._createToolBar('Right', rightToolBarConfig, 'position-right');

        return { leftPanel, rightPanel, mainPanel, bottomPanel };
    }

    _createToolBar(side, config, positionClass, parent = this.container) {
        const toolBar = this.toolBarFactory.createToolBar(side, config);
        if (toolBar) {
            if (positionClass) toolBar.classList.add(positionClass);
            parent.appendChild(toolBar);
        }
        return toolBar;
    }

    _createResizablePanel(type, config, dragOrientation, isReverse) {
        const panel = this.panelFactory.createPanel(type, config);
        if (!panel) return null;

        const dragLine = document.createElement('div');
        dragLine.className = dragOrientation === 'vertical' ? 'drag-line drag-line--vertical' : 'drag-line drag-line--horizontal';
        
        // DragLine positioning logic
        if (isReverse) { // Right Panel: DragLine -> Panel
            this.container.appendChild(dragLine);
            this.container.appendChild(panel);
        } else { // Left Panel: Panel -> DragLine
            this.container.appendChild(panel);
            this.container.appendChild(dragLine);
        }
        
        new DragLine(dragLine, dragOrientation, panel, isReverse);
        return panel;
    }
}
