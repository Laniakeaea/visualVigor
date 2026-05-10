import { ToolUtils } from '../ToolUtils.js';
import { VectorCommand } from '../../Edit/Commands/VectorCommand.js';
import { ColorUtils } from '../../../Controller/ColorUtils.js';
import paper from 'paper';

export class TextTool {
    constructor() {
        this.id = 'toolVectorText';
        this.activeInput = null;
        this.inputPos = null;
        
        // Options: Only size is required by user
        // We remove explicit 'fill' option so it doesn't show in ToolOptions panel
        // Color is taken directly from the global palette (ProjectModel)
        this.options = {
            size: 24
        };
        this.editingElement = null; // Track element being edited
    }

    get cursor() {
        return {
            type: 'text'
        };
    }

    activate() {
        this.bindEvents();
        this.handleColorChange = this.onColorChanged.bind(this);
        window.addEventListener('projectColorChanged', this.handleColorChange);
    }

    startEditing(element) {
        if (!element || element.type !== 'text') return;
        
        this.editingElement = element;
        this.options.size = element.properties.fontSize || 24;
        
        // Find viewport (Assume primary or active)
        const viewport = document.querySelector('.workspace__viewport');
        if (!viewport) return;
        
        const canvasContainer = viewport.querySelector('.workspace__canvas');
        if (!canvasContainer) return;

        // Calculate Input Position
        // Text properties x/y are roughly baseline. Input requires Top-Left.
        const fontSize = this.options.size;
        const baselineOffset = fontSize * 0.8; 
        
        const x = element.properties.x;
        const y = element.properties.y - baselineOffset;

        this.createInput(canvasContainer, x, y);
        this.activeInput.value = element.properties.text;
        
        // Restore color
        if (element.properties.fill) {
            this.activeInput.style.color = element.properties.fill;
        }

        // Trigger resize
        requestAnimationFrame(() => {
             const event = new Event('input');
             this.activeInput.dispatchEvent(event);
        });

        // Hide original element while editing?
        // element.visible = false; 
        // We'd need to re-enable it if cancelled.
    }

    deactivate() {
        this.commitText(); // Commit any pending text on tool switch
        this.editingElement = null; // Clear editing state
        this.unbindEvents();
        if (this.handleColorChange) {
            window.removeEventListener('projectColorChanged', this.handleColorChange);
            this.handleColorChange = null;
        }
    }

    bindEvents() {
        this.handleDown = this.onPointerDown.bind(this);
        document.addEventListener('pointerdown', this.handleDown);
    }

    unbindEvents() {
        document.removeEventListener('pointerdown', this.handleDown);
    }

    getCanvasPoint(e, viewport) {
        if (!viewport) return { x: e.clientX, y: e.clientY };

        const rect = viewport.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        if (viewport.cameraController) {
            const { position, scale } = viewport.cameraController;
            return {
                x: (x - position.x) / scale,
                y: (y - position.y) / scale
            };
        }
        
        return { x, y };
    }

    getFillColor() {
        if (window.projectModel && window.projectModel.data && window.projectModel.data.settings.color) {
            const c = window.projectModel.data.settings.color;
            // Use HSLA which is standard for CSS and supported by SVG/Paper in many cases, 
            // or convert if needed. Text Area needs CSS compatible string.
            return `hsla(${c.h}, ${c.s * 100}%, ${c.l * 100}%, ${c.a})`;
        }
        return 'rgba(0, 0, 0, 1)';
    }

    onColorChanged(e) {
        // If input is active, update its color live
        // We don't need to update options since we read from ProjectModel directly
        if (this.activeInput) {
            this.activeInput.style.color = this.getFillColor();
        }
    }

    onPointerDown(e) {
        // If clicking inside the active input, do nothing (allow typing/selecting)
        if (this.activeInput && e.target === this.activeInput) {
            return;
        }

        // If clicking outside, commit first
        if (this.activeInput) {
            this.commitText();
            // Standard behavior: click outside commits text, but doesn't immediately start new text 
            // unless we handle it carefully. 
            // For now, let's allow starting new text immediately at new position
        }
        
        const viewport = e.target.closest('.workspace__viewport');
        if (!viewport) return; // Must click on viewport

        const canvasContainer = viewport.querySelector('.workspace__canvas');
        if (!canvasContainer) return;

        const point = this.getCanvasPoint(e, viewport);
        this.createInput(canvasContainer, point.x, point.y);
    }

    createInput(parent, x, y) {
        const input = document.createElement('textarea');
        input.style.position = 'absolute';
        input.style.left = `${x}px`;
        input.style.top = `${y}px`;
        input.style.fontFamily = 'Ubuntu, sans-serif';
        input.style.fontSize = `${this.options.size}px`;
        input.style.lineHeight = '1.2'; 
        input.style.color = this.getFillColor();
        input.style.background = 'transparent';
        input.style.border = '1px dashed rgba(0, 168, 255, 0.5)';
        input.style.outline = 'none';
        input.style.padding = '2px';
        input.style.margin = '0';
        input.style.overflow = 'hidden';
        input.style.resize = 'none';
        input.style.whiteSpace = 'pre';
        input.style.zIndex = '1000'; // Ensure on top

        // Initial size
        input.style.width = '100px'; 
        input.style.height = `${this.options.size * 1.5}px`;

        input.value = '';
        
        // Auto-expand logic
        const updateSize = () => {
            input.style.width = '0px';
            input.style.height = '0px';
            input.style.width = (input.scrollWidth + 10) + 'px';
            input.style.height = (input.scrollHeight + 5) + 'px';
        };

        input.addEventListener('input', updateSize);

        input.onkeydown = (e) => {
            // Shift+Enter for new line, Enter to finish
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.commitText();
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                this.cancelText();
            }
        };
        
        parent.appendChild(input);
        
        // Wait a tick for render
        requestAnimationFrame(() => {
            input.focus();
            updateSize();
        });
        
        this.activeInput = input;
        this.inputPos = { x, y };
    }

    commitText() {
        if (!this.activeInput) return;

        const text = this.activeInput.value;
        const x = this.inputPos.x;
        const y = this.inputPos.y; // Top-Left of the input

        // Capture color *before* removing input
        const fillColor = this.activeInput.style.color || this.getFillColor();

        this.activeInput.remove();
        this.activeInput = null;
        this.inputPos = null;

        if (window.projectModel) {
            // Visual Correction:
            // Ubuntu font baseline adjustment
            const fontSize = this.options.size;
            const baselineOffset = fontSize * 0.8; 
            
            if (this.editingElement) {
                // Update Existing
                if (!text || text.trim() === '') {
                    // Empty text -> Remove element
                     window.projectModel.removeVectorElement(this.editingElement.id);
                     window.editSystem.addCommand(new VectorCommand('remove', this.editingElement));
                } else {
                    const oldProps = { ...this.editingElement.properties };
                    const newProps = {
                        ...oldProps,
                        text: text,
                        x: x, // Position might not change if we didn't support dragging input, but if it did...
                        y: y + baselineOffset, // Re-apply baseline offset
                        fontSize: fontSize,
                        fill: fillColor
                    };
                    
                    // Only update if changed
                    if (JSON.stringify(oldProps) !== JSON.stringify(newProps)) {
                         this.editingElement.properties = newProps; // Optimistic update
                         window.dispatchEvent(new CustomEvent('projectLayersChanged'));
                         window.editSystem.addCommand(new VectorCommand('modify', this.editingElement, oldProps, newProps));
                    }
                }
                this.editingElement = null;
            } else {
                // Create New
                if (!text || text.trim() === '') return;

                const properties = {
                    x: x,
                    y: y + baselineOffset,
                    text: text,
                    fontSize: fontSize,
                    fontFamily: 'Ubuntu',
                    fill: fillColor
                };
                
                const element = window.projectModel.addVectorElement('text', properties);
                if (element && window.editSystem) {
                    window.editSystem.addCommand(new VectorCommand('add', element));
                }
            }
        }
    }

    cancelText() {
        if (this.activeInput) {
            this.activeInput.remove();
            this.activeInput = null;
            this.inputPos = null;
            this.editingElement = null;
        }
    }
}
