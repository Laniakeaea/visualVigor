/* =========================================
   Tool Options Controller
   ========================================= */

import { OptionFactory } from './ToolOptionSystem/OptionFactory.js';

export class ToolOptionsController {
    constructor() {
        this.container = document.createElement('div');
        this.container.className = 'tool-options-list';
        this.container.style.padding = '10px';
        this._bindEvents();
        this.update();
    }

    static create() {
        const controller = new ToolOptionsController();
        window.toolOptionsController = controller;
        return controller.container;
    }

    _bindEvents() {
        window.addEventListener('toolActivated', () => {
            this.update();
        });
        window.addEventListener('toolOptionsUpdated', () => {
            this.update();
        });
        window.addEventListener('languageChanged', () => {
            this.update();
        });
        window.addEventListener('projectColorChanged', () => {
            // Wait for the tool to update its internal state first
            setTimeout(() => {
                if (window.toolSystem && window.toolSystem.activeTool && window.toolSystem.activeTool.id === 'toolBitmapGradient') {
                    this.update();
                }
            }, 0);
        });
    }

    update() {

        
        this.container.innerHTML = '';
        
        if (!window.toolSystem || !window.toolSystem.activeTool) {
            const msg = document.createElement('div');
            msg.textContent = window.languageManager ? window.languageManager.t('Layout.Panel.ToolOptions.NoTool') : 'No active tool';
            msg.className = 'text text--muted text--small text--center';
            msg.style.fontStyle = 'italic';
            this.container.appendChild(msg);
            return;
        }

        const tool = window.toolSystem.activeTool;
        if (!tool.options) {
            const msg = document.createElement('div');
            msg.textContent = window.languageManager ? window.languageManager.t('Layout.Panel.ToolOptions.NoOptions') : 'No options';
            msg.className = 'text text--muted text--small text--center';
            msg.style.fontStyle = 'italic';
            this.container.appendChild(msg);
            return;
        }

        // Generate UI for options
        const isAdvanced = tool.options.advancedMode !== false; // Default to true if undefined, or check explicit value

        Object.keys(tool.options).forEach(key => {
            // Filter options based on Advanced Mode
            if (tool.options.advancedMode === false) {
                // If Advanced Mode is OFF, only show 'advancedMode' and 'size'
                if (key !== 'advancedMode' && key !== 'size') {
                    return;
                }
            }

            const value = tool.options[key];
            const control = OptionFactory.createControl(tool, key, value, this);
            
            if (control) {
                this.container.appendChild(control);
            }
        });
    }
}
