import { WorkspaceView } from '/Source/JS/Layout/MainArea/Workspace/WorkspaceView.js';
import { PanelRouter } from '/Source/JS/Layout/MainArea/PanelUni/PanelRouter.js';
import { createLayersView } from '/Source/JS/Layout/MainArea/PanelUni/SidePanel/LeftSidePanel/LayersView.js';
import { createPropertiesView } from '/Source/JS/Layout/MainArea/PanelUni/SidePanel/RightSidePanel/PropertiesView.js';
import { AnimationController } from '/Source/JS/Controller/AnimationController.js';
import { LayoutBuilder } from './LayoutBuilder.js';
import { BottomPanelControlManager } from './BottomPanelControlManager.js';

/* =========================================
   Layout Initialization Module
   ========================================= */

/**
 * Facade class that orchestrates layout creation and initialization.
 */
export class LayoutInitializer {
    constructor(toolBarFactory, panelFactory) {
        this.mainWindow = document.querySelector('.mainwindow');
        // Dependencies
        this.builder = new LayoutBuilder(this.mainWindow, toolBarFactory, panelFactory);
        this.workspaceView = new WorkspaceView();
        this.panelRouter = new PanelRouter();
    }

    init() {
        if (!this.mainWindow) {
            console.error('LayoutInitializer: .mainwindow not found.');
            return;
        }

        this.builder.clearExistingContent();
        
        // Build the physical layout
        const layout = this.builder.buildLayout();

        // Initialize Components
        this._initWorkspace(layout.mainPanel);
        this._initBottomPanel(layout.bottomPanel);
        this._initPanelRouter(layout.leftPanel, layout.rightPanel);

        // Assign controllers to global scope
        if (window.layoutController) {
            window.layoutController.workspaceView = this.workspaceView;
            window.layoutController.panelRouter = this.panelRouter;
        }
    }

    _initWorkspace(mainPanel) {
        if (!mainPanel) return;
        const container = mainPanel.querySelector('.layout-panel__container');
        if (container) {
            this.workspaceView.init(container);
        }
    }

    _initBottomPanel(bottomPanel) {
        if (!bottomPanel) return;
        
        // 1. Inject Animation Panel content
        const container = bottomPanel.querySelector('.layout-panel__container');
        if (container) {
            // Add compatibility classes
            bottomPanel.classList.add('bottomSidePanel');
            container.classList.add('panelContainer');
            
            const animationPanel = AnimationController.create();
            container.appendChild(animationPanel);
        }

        // 2. Initialize Control System
        const controlManager = new BottomPanelControlManager(bottomPanel);
        controlManager.init();
    }

    _initPanelRouter(leftPanel, rightPanel) {
        // Register Containers
        if (leftPanel) {
            const container = leftPanel.querySelector('.layout-panel__container');
            if (container) this.panelRouter.registerPanel('left', container);
        }
        if (rightPanel) {
            const container = rightPanel.querySelector('.layout-panel__container');
            if (container) this.panelRouter.registerPanel('right', container);
        }

        // Register Routes
        this.panelRouter.registerRoute('left', 'layers', createLayersView);
        this.panelRouter.registerRoute('right', 'properties', createPropertiesView);

        // Initial Navigation
        this.panelRouter.navigate('left', 'layers');
        this.panelRouter.navigate('right', 'properties');
    }
}
