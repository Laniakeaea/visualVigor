import { leftToolBarConfig, rightToolBarConfig, topToolBarConfig } from '/Source/JS/Config/toolBarConfig.js';
import customPluginManager from '/Source/JS/Controller/CustomPluginManager.js';
import { BitmapCommand } from '/Source/JS/CoreFunction/Edit/Commands/BitmapCommand.js';

/* =========================================
   Command Registry
   ========================================= */

export function registerCommands() {
    // 0. Initialize Custom Plugins (Before registering commands?)
    // Actually, CustomPluginManager registers its own commands on load.
    // We just need to ensure it's initialized.
    customPluginManager.init();

    const cm = window.commandManager;
    if (!cm) {
        console.error('CommandManager not initialized.');
        return;
    }

    // 1. System Commands
    cm.register('toggleTheme', () => {
        const newTheme = window.themeManager.toggleTheme();
        const msgKey = newTheme === 'dark' ? 'Layout.InfoBar.InfoContent.themeSwitchedToDark' : 'Layout.InfoBar.InfoContent.themeSwitchedToLight';
        const msg = window.languageManager.t(msgKey);
        window.infoSystem.showInfo('info', msg, 2000);
    });

    cm.register('toggleLanguage', () => {
        const newLang = window.languageManager.toggleLanguage();
        const msg = newLang === 'zh' ? '语言已切换为中文' : 'Language switched to English';
        window.infoSystem.showInfo('info', msg, 2000);
    });

    cm.register('toggleAutoSave', (enabled) => {
        if (window.editSystem) {
             window.editSystem.setAutoSave(enabled);
             const msg = enabled ? 
                (window.languageManager.t('Layout.InfoBar.InfoContent.AutoSaveEnabled') || 'Auto Save Enabled') : 
                (window.languageManager.t('Layout.InfoBar.InfoContent.AutoSaveDisabled') || 'Auto Save Disabled');
             window.infoSystem.showInfo('info', msg, 1000);
        }
    });

    // 2. File Menu Commands
    cm.register('fileNew', () => window.fileSystem.newFile());
    cm.register('fileOpen', () => window.fileSystem.openFile());
    cm.register('fileSave', () => window.fileSystem.saveFile());
    cm.register('fileSaveAs', () => window.fileSystem.saveAsFile());
    cm.register('fileExport', () => window.fileSystem.exportFile());

    // 3. Edit Menu Commands
    cm.register('editUndo', () => window.editSystem.undo());
    cm.register('editRedo', () => window.editSystem.redo());

    cm.register('editDelete', () => {
        // 1. Vector Deletion
        if (window.toolSystem && window.toolSystem.activeToolId === 'toolVectorSelect') {
            const tool = window.toolSystem.activeTool;
            if (tool.selectedItems && tool.selectedItems.size > 0) {
                const ids = Array.from(tool.selectedItems.keys());
                
                // Remove elements via VectorManager (accessed via ProjectModel)
                ids.forEach(id => {
                    window.projectModel.removeVectorElement(id);
                });

                // Clear Selection in Tool
                tool.clearSelection();
                
                window.infoSystem.showInfo('info', 'Deleted ' + ids.length + ' items', 1000);
                return;
            }
        }

        // 2. Fallback: Maybe delete active layer?
        // (Optional, user didn't ask for this yet, but good practice)
        /*
        if (window.projectModel && window.projectModel.selectedLayerId) {
             window.projectModel.removeBitmapLayer(window.projectModel.selectedLayerId);
        }
        */
    });

    // Grouping Commands
    cm.register('editGroup', () => {
        let ids = [];
        // 1. Try Vector Selection
        if (window.toolSystem && window.toolSystem.activeToolId === 'toolVectorSelect') {
            const tool = window.toolSystem.activeTool;
            if (tool.selectedItems) {
                ids = Array.from(tool.selectedItems.keys());
            }
        }
        
        if (ids.length > 0) {
            const groupId = window.projectModel.groupVectorElements(ids);
            if (groupId) {
                // Select the new group
                window.dispatchEvent(new CustomEvent('elementsSelected', { detail: { ids: [groupId] } }));
                window.infoSystem.showInfo('info', 'Layout.InfoBar.InfoContent.groupCreated', 1000);
            }
        }
    });

    cm.register('editUngroup', () => {
        let ids = [];
        if (window.toolSystem && window.toolSystem.activeToolId === 'toolVectorSelect') {
            const tool = window.toolSystem.activeTool;
            if (tool.selectedItems) {
                ids = Array.from(tool.selectedItems.keys());
            }
        }
        
        if (ids.length > 0) {
            const childIds = window.projectModel.ungroupVectorElements(ids);
            if (childIds.length > 0) {
                // Select the children
                window.dispatchEvent(new CustomEvent('elementsSelected', { detail: { ids: childIds } }));
                window.infoSystem.showInfo('info', 'Layout.InfoBar.InfoContent.ungrouped', 1000);
            }
        }
    });
    
    // Selection Commands
    cm.register('selectInvert', () => {
        if (window.selectionManager) {
            window.selectionManager.invertSelection();
            window.infoSystem.showInfo('info', 'Layout.InfoBar.InfoContent.selectionInverted', 1000);
        }
    });
    cm.register('selectDeselect', () => {
        if (window.selectionManager) {
            window.selectionManager.clearSelection();
            window.infoSystem.showInfo('info', 'Layout.InfoBar.InfoContent.deselected', 1000);
        }
    });

    // 4. View Menu Commands
    const viewCommands = {
        'viewToggleDualView': () => {
            const newState = window.layoutController.toggleDualView();
            const msgKey = newState ? 'Layout.InfoBar.InfoContent.dualViewEnabled' : 'Layout.InfoBar.InfoContent.dualViewDisabled';
            window.infoSystem.showInfo('info', msgKey, 1000);
        },
        'viewToggleLeftPanel': () => {
            const newState = window.layoutController.toggleLeftPanel();
            const msgKey = newState ? 'Layout.InfoBar.InfoContent.leftPanelShown' : 'Layout.InfoBar.InfoContent.leftPanelHidden';
            window.infoSystem.showInfo('info', msgKey, 1000);
        },
        'viewToggleRightPanel': () => {
            const newState = window.layoutController.toggleRightPanel();
            const msgKey = newState ? 'Layout.InfoBar.InfoContent.rightPanelShown' : 'Layout.InfoBar.InfoContent.rightPanelHidden';
            window.infoSystem.showInfo('info', msgKey, 1000);
        },
        'viewToggleBottomPanel': () => {
            const newState = window.layoutController.toggleBottomPanel();
            const msgKey = newState ? 'Layout.InfoBar.InfoContent.bottomPanelShown' : 'Layout.InfoBar.InfoContent.bottomPanelHidden';
            window.infoSystem.showInfo('info', msgKey, 1000);
        },
        'viewZoomIn': () => {
            const views = window.layoutController.workspaceView ? window.layoutController.workspaceView.views : [];
            if (views.length > 0 && views[0].camera) {
                views[0].camera.zoomIn();
                window.infoSystem.showInfo('info', 'Layout.MainArea.Workspace.ZoomIn', 500);
            }
        },
        'viewZoomOut': () => {
            const views = window.layoutController.workspaceView ? window.layoutController.workspaceView.views : [];
            if (views.length > 0 && views[0].camera) {
                views[0].camera.zoomOut();
                window.infoSystem.showInfo('info', 'Layout.MainArea.Workspace.ZoomOut', 500);
            }
        },
        'viewFit': () => {
             // Alias for viewFitToScreen logic, but finding camera automatically
            const views = window.layoutController.workspaceView ? window.layoutController.workspaceView.views : [];
            if (views.length > 0 && views[0].camera) {
                 if (window.projectModel) {
                    const artboard = window.projectModel.getArtboard();
                    if (artboard) {
                        views[0].camera.fitRect(artboard);
                        window.infoSystem.showInfo('info', 'Layout.MainArea.Workspace.FitToScreen', 1000);
                    }
                }
            }
        },
        'viewHand': () => {
             // Placeholder for Hand Tool / Pan Mode
             // In a real app, this might switch the active tool to a 'PanTool'
             // or toggle a temporary state. 
             // For now, we acknowledge the command to prevent errors.
             window.infoSystem.showInfo('info', 'Hand Tool (Not yet implemented)', 1000);
        },
        'viewFitToScreen': (cameraController) => {
            // Keep specific handler if needed, but viewFit is the generic command
            if (cameraController && typeof cameraController.fitRect === 'function') {
                 if (window.projectModel) {
                    const artboard = window.projectModel.getArtboard();
                    if (artboard) cameraController.fitRect(artboard);
                }
            }
        }
    };

    // Register View Commands
    Object.keys(viewCommands).forEach(cmd => {
        cm.register(cmd, viewCommands[cmd]);
    });

    // Special Case: Animation Tool toggles Bottom Panel
    cm.register('toolViewAnimation', () => {
        // Execute the same logic as viewToggleBottomPanel
        const newState = window.layoutController.toggleBottomPanel();
        const msgKey = newState ? 'Layout.InfoBar.InfoContent.bottomPanelShown' : 'Layout.InfoBar.InfoContent.bottomPanelHidden';
        window.infoSystem.showInfo('info', msgKey, 1000);
    });

    // 5. ToolBar Commands (Config Driven)
    const allToolConfigs = [
        ...leftToolBarConfig,
        ...rightToolBarConfig,
        ...topToolBarConfig
    ];

    allToolConfigs.forEach(item => {
        if (item.type !== 'button') return;

        const cmd = item.action;
        const category = item.category;

        // A. Standard Tools (Bitmap, Vector, Adjust)
        if (['bitmap', 'vector', 'adjust'].includes(category)) {
            cm.register(cmd, () => {
                window.toolSystem.activateTool(cmd);
                
                // Construct Translation Key
                let key = '';
                const name = cmd.replace('tool', '');
                
                if (name.startsWith('Bitmap')) {
                    key = `Layout.MainArea.ToolBar.LeftToolBar.Bitmap.${name.replace('Bitmap', '')}`;
                } else if (name.startsWith('Vector')) {
                    key = `Layout.MainArea.ToolBar.RightToolBar.Vector.${name.replace('Vector', '')}`;
                } else if (name.startsWith('Adjust')) {
                    key = `Layout.MainArea.ToolBar.TopToolBar.Adjust.${name.replace('Adjust', '')}`;
                }

                // Translate and Show Info
                if (window.languageManager) {
                    const prefix = window.languageManager.t('Layout.InfoBar.InfoContent.toolSelected');
                    const toolName = window.languageManager.t(key) || name;
                    window.infoSystem.showInfo('info', `${prefix}${toolName}`, 1000);
                } else {
                    window.infoSystem.showInfo('info', `Tool Selected: ${cmd}`, 1000);
                }
            });
        }
        
        // B. Assistant Toggles
        else if (category === 'assist') {
            // Special Case: Sync View
            if (cmd === 'toolAssistSyncView') {
                cm.register(cmd, () => {
                    const workspaceView = window.layoutController.workspaceView;
                    if (workspaceView) {
                        workspaceView.toggleViewCoupling();
                    }
                });
            } 
            // Standard Assistants (Grid, Snap, etc.)
            else {
                // Extract type from action ID (e.g., 'toolAssistGrid' -> 'grid')
                const type = cmd.replace('toolAssist', '').replace(/^\w/, c => c.toLowerCase());
                
                cm.register(cmd, () => {
                    const workspaceView = window.layoutController.workspaceView;
                    if (workspaceView) {
                        workspaceView.toggleAssistant(type);
                    }
                });
            }
        }
    });

    // Special Override: Script Tool (C++ Plugin)
    // This overrides the default generic handler registered in the loop above
    cm.register('toolAdjustScript', () => {
        // 1. Validation
        if (!window.projectModel || !window.projectModel.activeProjectId) {
            window.infoSystem.showInfo('warning', 'Layout.InfoBar.InfoContent.noActiveProject', 2000);
            return;
        }
        
        const canvas = window.projectModel.getActiveCanvas();
        if (!canvas) {
            window.infoSystem.showInfo('warning', 'Layout.InfoBar.InfoContent.selectBitmapLayer', 2000);
            return;
        }

        // 2. File Picker
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.wasm,.js'; // Allow JS fallback
        input.style.display = 'none';
        
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            window.infoSystem.showInfo('loading', 'Layout.InfoBar.InfoContent.scriptRunning', 0);

            try {
                // 3. Get Data
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                const width = canvas.width;
                const height = canvas.height;
                const imageData = ctx.getImageData(0, 0, width, height);

                // 4. Execute Plugin
                if (window.pluginHost) {
                    const result = await window.pluginHost.executeOneShot(file, imageData);
                    
                    // 5a. Apply Image Results
                    if (result.img) {
                        ctx.putImageData(result.img, 0, 0);
                        // Notify that canvas content changed
                        window.dispatchEvent(new CustomEvent('projectCanvasUpdated', { detail: { id: window.projectModel.selectedLayerId } }));
                    }
                    
                    // 5b. Apply Vector Results
                    if (result.vectors && result.vectors.length > 0) {
                        result.vectors.forEach(v => {
                            if (window.projectModel) {
                                window.projectModel.addVectorElement(v.type, v.properties);
                            }
                        });
                        const prefix = window.languageManager.t('Layout.InfoBar.InfoContent.scriptAddedVectors');
                        window.infoSystem.showInfo('success', `${prefix} ${result.vectors.length}`, 2000);
                    } else {
                        window.infoSystem.showInfo('success', 'Layout.InfoBar.InfoContent.scriptCompleted', 1000);
                    }
                } else {
                     throw new Error("PluginHost not initialized");
                }

            } catch (err) {
                console.error(err);
                const msg = err.message ? err.message : 'Unknown Error';
                const prefix = window.languageManager.t('Layout.InfoBar.InfoContent.scriptFailed');
                window.infoSystem.showInfo('error', `${prefix}${msg}`, 3000);
            } finally {
                input.remove();
            }
        };

        document.body.appendChild(input);
        input.click();
    });

    // Special Override: WASM Script Tool
    cm.register('toolAdjustWASMScript', () => {
        // 1. Validation
        if (!window.projectModel || !window.projectModel.activeProjectId) {
            window.infoSystem.showInfo('warning', 'Layout.InfoBar.InfoContent.noActiveProject', 2000);
            return;
        }

        const canvas = window.projectModel.getActiveCanvas();
        if (!canvas) {
            window.infoSystem.showInfo('warning', 'Layout.InfoBar.InfoContent.selectBitmapLayer', 2000);
            return;
        }

        // 2. File Picker
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.wasm'; 
        input.style.display = 'none';

        input.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            window.infoSystem.showInfo('loading', 'Layout.InfoBar.InfoContent.scriptRunning', 0);

            try {
                // 3. Get Data
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                const width = canvas.width;
                const height = canvas.height;
                const imageData = ctx.getImageData(0, 0, width, height);

                // 4. Execute Plugin
                if (window.pluginHost) {
                    const result = await window.pluginHost.executeOneShot(file, imageData);
                    
                    // 5a. Apply Image Results
                    if (result.img) {
                        ctx.putImageData(result.img, 0, 0);
                        // Record undo/redo command
                        if (window.editSystem && window.projectModel.selectedLayerId) {
                            const currentFrame = window.projectModel.data.timeline.currentFrame || 0;
                            const cmd = new BitmapCommand(
                                window.projectModel.selectedLayerId,
                                imageData,
                                result.img,
                                0, 0, currentFrame
                            );
                            window.editSystem.addCommand(cmd);
                        }
                        // Notify that canvas content changed
                        window.dispatchEvent(new CustomEvent('projectCanvasUpdated', { detail: { id: window.projectModel.selectedLayerId } }));
                    }
                    
                    // 5b. Apply Vector Results
                    if (result.vectors && result.vectors.length > 0) {
                        result.vectors.forEach(v => {
                            if (window.projectModel) {
                                window.projectModel.addVectorElement(v.type, v.properties);
                            }
                        });
                        const prefix = window.languageManager.t('Layout.InfoBar.InfoContent.scriptAddedVectors');
                        window.infoSystem.showInfo('success', `${prefix} ${result.vectors.length}`, 2000);
                    } else {
                        window.infoSystem.showInfo('success', 'Layout.InfoBar.InfoContent.scriptCompleted', 1000);
                    }
                } else {
                     throw new Error("PluginHost not initialized");
                }

            } catch (err) {
                console.error(err);
                const msg = err.message ? err.message : 'Unknown Error';
                const prefix = window.languageManager.t('Layout.InfoBar.InfoContent.scriptFailed');
                window.infoSystem.showInfo('error', `${prefix}${msg}`, 3000);
            } finally {
                input.remove();
            }
        });

        document.body.appendChild(input);
        input.click();
    });

    // Special Override: C++ Script Tool
    cm.register('toolAdjustCPPScript', () => {
        // 1. Validation
        if (!window.projectModel || !window.projectModel.activeProjectId) {
            window.infoSystem.showInfo('warning', 'Layout.InfoBar.InfoContent.noActiveProject', 2000);
            return;
        }
        
        const canvas = window.projectModel.getActiveCanvas();
        if (!canvas) {
            window.infoSystem.showInfo('warning', 'Layout.InfoBar.InfoContent.selectBitmapLayer', 2000);
            return;
        }

        // 2. File Picker
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.cpp,.c'; 
        input.style.display = 'none';
        
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            window.infoSystem.showInfo('loading', 'Layout.InfoBar.InfoContent.scriptRunning', 0); // Reuse running message

            try {
                // 3. Get Data
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                const width = canvas.width;
                const height = canvas.height;
                const imageData = ctx.getImageData(0, 0, width, height);

                // 4. Execute Plugin (Cpp)
                if (window.pluginHost) {
                    const result = await window.pluginHost.executeOneShot(file, imageData);
                    
                    if (result && result.img) {
                        ctx.putImageData(result.img, 0, 0);
                        // Record undo/redo command
                        if (window.editSystem && window.projectModel.selectedLayerId) {
                            const currentFrame = window.projectModel.data.timeline.currentFrame || 0;
                            const cmd = new BitmapCommand(
                                window.projectModel.selectedLayerId,
                                imageData,
                                result.img,
                                0, 0, currentFrame
                            );
                            window.editSystem.addCommand(cmd);
                        }
                        window.dispatchEvent(new CustomEvent('projectCanvasUpdated', { detail: { id: window.projectModel.selectedLayerId } }));
                        window.infoSystem.showInfo('success', 'Layout.InfoBar.InfoContent.scriptCompleted', 1000);
                    }
                }

            } catch (err) {
                console.error(err);
                const msg = err.message ? err.message : 'Unknown Error';
                const prefix = window.languageManager.t('Layout.InfoBar.InfoContent.scriptFailed'); // Reuse key or use a general one
                // Show more detailed error for compilation failures
                window.infoSystem.showInfo('error', `${prefix}\n${msg}`, 5000);
            } finally {
                input.remove();
            }
        };

        document.body.appendChild(input);
        input.click();
    });

    // 6. Help Menu Commands
    cm.register('helpSoftwareInfo', () => {
        if (window.tutorialController) {
            window.tutorialController.start();
        }
    });

    cm.register('helpShortcuts', () => {
        if (window.shortcutGuideController) {
            window.shortcutGuideController.show();
        }
    });

    cm.register('helpJSPluginGuide', () => {
        if (window.pluginGuideController) {
            window.pluginGuideController.show();
        }
    });

    cm.register('helpCppPluginGuide', () => {
        if (window.cppPluginGuideController) {
            window.cppPluginGuideController.show();
        }
    });

    // Custom Plugin Add Command
    cm.register('toolAddCustomPlugin', async () => {
        await customPluginManager.managePlugins();
    });

    // 7. Collaboration Commands
    cm.register('collabOpenDialog', () => {
        if (window.collabPanelController) {
            window.collabPanelController.showRoomDialog();
        }
    });

    cm.register('collabCreateRoom', () => {
        if (window.collabPanelController) {
            window.collabPanelController.showRoomDialog();
        }
    });

    cm.register('collabLeaveRoom', () => {
        if (window.collabManager) {
            window.collabManager.leaveRoom();
        }
    });

    cm.register('collabCommitChanges', () => {
        if (window.collabManager?.isActive) {
            window.collabManager.commitChanges();
        }
    });

    cm.register('collabAcceptChanges', () => {
        if (window.collabManager?.isActive) {
            window.collabManager.acceptAllChanges();
        }
    });
}

