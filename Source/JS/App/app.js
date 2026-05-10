import '/Source/JS/Basic/System/Theme/themeManager.js';
import '/Source/JS/Basic/System/Language/languageManager.js';
import { InfoSystem } from '/Source/JS/Basic/System/Info/infoSystem.js';
import { CommandManager } from '/Source/JS/Basic/System/Command/commandManager.js';
import { FileSystem } from '/Source/JS/CoreFunction/File/fileSystem.js';
import { ProjectModel } from '/Source/JS/CoreFunction/Project/projectModel.js';
import { EditSystem } from '/Source/JS/CoreFunction/Edit/editSystem.js';
import { ToolSystem } from '/Source/JS/CoreFunction/Tool/toolSystem.js';
import { VectorSystem } from '/Source/JS/CoreFunction/Vector/VectorSystem.js';
import { IndicatorSystem } from '/Source/JS/Controller/IndicatorSystem.js';
import { SelectionManager } from '/Source/JS/CoreFunction/Selection/SelectionManager.js';
import { PluginHost } from '/Source/JS/CoreFunction/Plugin/PluginHost.js';
import { ShortcutManager } from '/Source/JS/Basic/System/Input/ShortcutManager.js';
import '/Source/JS/Layout/MainArea/ToolBar/toolBarFactory.js';
import '/Source/JS/Layout/MainArea/PanelUni/panelFactory.js';
import { LayoutInitializer } from '/Source/JS/Layout/layoutInit.js';
import { LayoutController } from '/Source/JS/Layout/layoutController.js';
import { MenuBar } from '/Source/JS/Layout/MenuBar/menuBar.js';
import { InfoBar } from '/Source/JS/Layout/InfoBar/infoBar.js';
import { ToolTip } from '/Source/JS/Layout/Popup/ToolTip/toolTip.js';
import { DialogController } from '/Source/JS/Popup/Dialog/DialogController.js';
import { TutorialController } from '/Source/JS/Controller/TutorialController.js';
import { ShortcutGuideController } from '/Source/JS/Controller/ShortcutGuideController.js';
import { PluginGuideController } from '/Source/JS/Controller/PluginGuideController.js';
import { CppPluginGuideController } from '/Source/JS/Controller/CppPluginGuideController.js';
import { CollaborationManager } from '/Source/JS/CoreFunction/Collaboration/CollaborationManager.js';
import { CollabPanelController } from '/Source/JS/Controller/CollabPanelController.js';
import { registerCommands } from '/Source/JS/App/commandRegistry.js';

/* =========================================
   Application Core
   ========================================= */

export class App {
    constructor() {
        this.initialized = false;
    }

    /**
     * Initialize the application
     */
    init() {
        if (this.initialized) return;

        // 1. Initialize Core Systems (Managers & Factories)
        this.initCoreSystems();

        // 2. Register Commands
        registerCommands();

        // 3. Initialize UI when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initUI());
        } else {
            this.initUI();
        }

        this.initialized = true;
        
        window.addEventListener('beforeunload', (e) => {
            let hasDirty = false;
            if (window.projectModel && window.projectModel.projects) {
                for (const project of window.projectModel.projects.values()) {
                    if (project.isDirty) {
                        hasDirty = true;
                        break;
                    }
                }
            }
            
            if (hasDirty) {
                e.preventDefault();
                e.returnValue = '';
            }
        });
    }

    initCoreSystems() {
        // Attach to window for global access (legacy support)
        window.themeManager = new ThemeManager();
        window.languageManager = new LanguageManager();
        window.infoSystem = new InfoSystem();
        window.commandManager = new CommandManager();
        window.fileSystem = new FileSystem();
        window.projectModel = new ProjectModel();
        window.editSystem = new EditSystem();
        window.vectorSystem = new VectorSystem();
        window.toolSystem = new ToolSystem();
        window.indicatorSystem = new IndicatorSystem();
        window.selectionManager = new SelectionManager();
        window.pluginHost = new PluginHost();
        window.toolBarFactory = new ToolBarFactory();
        window.panelFactory = new PanelFactory();
        window.toolTip = new ToolTip();
        window.dialogSystem = new DialogController();
        window.tutorialController = new TutorialController();
        window.shortcutGuideController = new ShortcutGuideController();
        window.pluginGuideController = new PluginGuideController();
        window.cppPluginGuideController = new CppPluginGuideController();
        window.collabManager = new CollaborationManager();
        window.collabPanelController = new CollabPanelController();
        window.layoutController = new LayoutController();
        
        // Initialize Shortcut Manager (After CommandManager)
        window.shortcutManager = new ShortcutManager(window.commandManager);
        window.shortcutManager.init();
        window.shortcutManager.init();
    }

    initUI() {
        // Wait for LanguageManager to be ready before rendering UI to avoid flash of untranslated content
        // However, since initUI is called from DOMContentLoaded, we can't easily await here without making initUI async
        // and potentially delaying the UI. 
        // Instead, we rely on LanguageManager.updateUI() to fix things when loaded.
        // But to prevent console warnings, LanguageManager.t() now checks isLoaded.

        // 1. Initialize Layout (ToolBars & Panels)
        const layoutInit = new LayoutInitializer(window.toolBarFactory, window.panelFactory);
        layoutInit.init();

        // 2. Initialize Controllers
        this.menuBar = new MenuBar();
        this.infoBar = new InfoBar(window.infoSystem);

        // 3. Initialize Collaboration UI
        if (window.collabPanelController) {
            window.collabPanelController.init();
        }

        // 4. Bind State Listeners (Sync UI with Logic)
        this.bindStateListeners();
        this.bindGlobalEvents();

        // Force UI update to translate newly created elements
        if (window.languageManager) {
            window.languageManager.updateUI();
        }
    }

    bindGlobalEvents() {
        // Prevent default context menu
        document.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });

        // Prevent image dragging globally
        document.addEventListener('dragstart', (e) => {
            if (e.target.tagName === 'IMG') {
                e.preventDefault();
            }
        });

        // Keyboard Shortcuts are now handled by window.shortcutManager
    }

    bindStateListeners() {
        // Listen for Layout State Changes
        window.addEventListener('layoutStateChanged', (e) => {
            const { dualView, leftPanel, rightPanel, bottomPanel } = e.detail;
            this.updateToggleState('viewToggleDualView', dualView);
            this.updateToggleState('viewToggleLeftPanel', leftPanel);
            this.updateToggleState('viewToggleRightPanel', rightPanel);
            this.updateToggleState('viewToggleBottomPanel', bottomPanel);
            // Sync Animation button with Bottom Panel state
            this.updateToggleState('toolViewAnimation', bottomPanel);
        });

        // Listen for Tool Activation
        window.addEventListener('toolActivated', (e) => {
            const { toolId } = e.detail;
            this.updateToolState(toolId);
        });

        // Listen for Workspace View Coupling Changes
        window.addEventListener('workspaceViewCouplingChanged', (e) => {
            const { isCoupled } = e.detail;
            this.updateToggleState('toolAssistSyncView', isCoupled);
        });

        // Listen for Workspace Assistant Changes
        window.addEventListener('workspaceAssistantChanged', (e) => {
            const { type, isActive } = e.detail;
            // Map assistant type back to command ID
            const cmdMap = {
                'grid': 'toolAssistGrid',
                'snap': 'toolAssistSnap',
                'indicator': 'toolAssistIndicator',
                'mousePos': 'toolAssistMousePos'
            };
            if (cmdMap[type]) {
                this.updateToggleState(cmdMap[type], isActive);
            }
        });

        // Initial Sync
        if (window.layoutController) {
            this.updateToggleState('viewToggleDualView', window.layoutController.isDualView);
            this.updateToggleState('viewToggleLeftPanel', window.layoutController.isLeftPanelVisible);
            this.updateToggleState('viewToggleRightPanel', window.layoutController.isRightPanelVisible);
            this.updateToggleState('viewToggleBottomPanel', window.layoutController.isBottomPanelVisible);
            // Sync Animation button with Bottom Panel state
            this.updateToggleState('toolViewAnimation', window.layoutController.isBottomPanelVisible);
            
            // Sync View Coupling Button
            if (window.layoutController.workspaceView) {
                this.updateToggleState('toolAssistSyncView', window.layoutController.workspaceView.isViewCoupled);
                
                // Sync Assistant Buttons
                const assistants = window.layoutController.workspaceView.assistants;
                if (assistants) {
                    this.updateToggleState('toolAssistGrid', assistants.grid);
                    this.updateToggleState('toolAssistSnap', assistants.snap);
                    this.updateToggleState('toolAssistIndicator', assistants.indicator);
                    this.updateToggleState('toolAssistMousePos', assistants.mousePos);
                }
            }
        }
    }

    /**
     * Update the visual state of buttons bound to a specific action
     * @param {string} action - The action ID (e.g., 'viewToggleDualView')
     * @param {boolean} isActive - Whether the state is active
     */
    updateToggleState(action, isActive) {
        const buttons = document.querySelectorAll(`[data-action="${action}"]`);
        buttons.forEach(btn => {
            // 1. Handle MenuBar Toggle Buttons
            if (btn.classList.contains('menu-bar__btn--capsule')) {
                if (isActive) btn.classList.add('active');
                else btn.classList.remove('active');
            }
            
            // 2. Handle ToolBar Buttons
            else if (btn.classList.contains('verticalToolBar_button') || btn.classList.contains('horizontalToolBar_button')) {
                const isVertical = btn.classList.contains('verticalToolBar_button');
                const activeClass = isVertical ? 'verticalToolBar_button--active' : 'horizontalToolBar_button--active';
                
                if (isActive) btn.classList.add(activeClass);
                else btn.classList.remove(activeClass);
            }
        });
    }

    /**
     * Update the visual state of tool buttons (Radio behavior)
     * @param {string} activeToolId - The ID of the activated tool
     */
    updateToolState(activeToolId) {
        const allButtons = document.querySelectorAll('[data-action]');
        allButtons.forEach(btn => {
            const action = btn.dataset.action;
            
            // Only affect tool commands
            if (!action || !action.startsWith('tool')) return;

            // Skip Toggle Buttons (Assistants & View Toggles)
            // These are managed by updateToggleState and should not be cleared by tool selection
            if (action.startsWith('toolAssist') || action === 'toolViewAnimation') return;

            const isVertical = btn.classList.contains('verticalToolBar_button');
            const isHorizontal = btn.classList.contains('horizontalToolBar_button');
            const activeClass = isVertical ? 'verticalToolBar_button--active' : 
                                isHorizontal ? 'horizontalToolBar_button--active' : null;

            if (!activeClass) return; // Not a toolbar button we recognize

            if (action === activeToolId) {
                btn.classList.add(activeClass);
            } else {
                btn.classList.remove(activeClass);
            }
        });
    }
}
