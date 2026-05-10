/* =========================================
   Workspace Tab Manager Module
   Handles Tab Bar creation and events
   ========================================= */

import { TabBar } from '../PanelUni/MainPanel/TabBar/TabBar.js';

export class WorkspaceTabManager {
    constructor(mainView) {
        this.mainView = mainView;
        this.tabBar = null;
    }

    init(container) {
        const panelTitle = container.previousElementSibling;
        if (panelTitle && panelTitle.classList.contains('layout-panel__title')) {
            const tabsContainer = document.createElement('div');
            Object.assign(tabsContainer.style, {
                flex: '1', minWidth: '0', marginLeft: '16px', height: '100%'
            });
            panelTitle.appendChild(tabsContainer);
            
            this.tabBar = new TabBar(tabsContainer);
            this._bindTabEvents();
        }
    }

    _bindTabEvents() {
        if (!this.tabBar) return;

        window.addEventListener('projectCreated', (e) => {
            const project = e.detail;
            this.tabBar.addTab({
                id: project.id,
                title: project.meta.name || 'Untitled',
                onClose: (id) => {
                    const project = window.projectModel && window.projectModel.projects.get(id);
                    if (project && project.isDirty) {
                        const title = window.languageManager.t('Popup.Dialog.Common.UnsavedTitle') || 'Unsaved Changes';
                        const msg = window.languageManager.t('Popup.Dialog.Common.UnsavedMessage') || 'This project has unsaved changes. Do you want to close it?';
                        
                        window.dialogSystem.showConfirm(title, msg, 
                            () => { window.projectModel.closeProject(id); },
                            () => {} 
                        );
                   } else {
                       window.projectModel && window.projectModel.closeProject(id);
                   }
                },
                onActivate: (id) => window.projectModel && window.projectModel.activateProject(id)
            });
            this.tabBar.activateTab(project.id);
        });

        window.addEventListener('projectClosed', (e) => this.tabBar.removeTab(e.detail));

        window.addEventListener('projectDirtyStateChanged', (e) => {
            const { project, isDirty } = e.detail;
            if (project && project.id) {
                this.tabBar.setTabDirty(project.id, isDirty);
            }
        });

        window.addEventListener('projectActivated', (e) => {
            const project = e.detail;
            if (!project || !project.settings) return;
            
            // Restore View Settings
            this.mainView.views.forEach(view => {
                // Restore Camera (uses WorkspaceViewport API)
                if (project.settings.camera && view.camera) {
                    const {scale, x, y} = project.settings.camera;
                    view.camera.setTransform(scale, x, y);
                }
                
                // Restore Artboard (Visual)
                if (project.settings.artboard) {
                    const { width, height } = project.settings.artboard;
                    view.setArtboardSize(width, height);
                }

                // Restore Guides
                if (project.settings.guides && view.overlay) {
                    view.overlay.guides = project.settings.guides;
                    view.overlay.draw();
                }
            });
        });
    }
}
