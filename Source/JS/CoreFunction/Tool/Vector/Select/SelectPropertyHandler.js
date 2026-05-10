import { VectorCommand } from '../../../Edit/Commands/VectorCommand.js';
import { CompositeCommand } from '../../../Edit/Commands/CompositeCommand.js';
import { ColorUtils } from '../../../../Controller/ColorUtils.js';
import paper from 'paper';

export class SelectPropertyHandler {
    constructor(tool) {
        this.tool = tool;
    }

    onColorChange(e) {
        if (this.tool.selectedItems.size === 0) return;
        const { value: colorState, isPreview } = e.detail;
        
        // Handle direct value or wrapped value struct
        let actualState = colorState;
        if (e.detail.h !== undefined) {
             actualState = e.detail; // Legacy or direct call support
        }

        let colorStr;
        let colorObj = null;

        if (actualState.h !== undefined && actualState.s !== undefined && actualState.l !== undefined) {
             const { h, s, l } = actualState;
             const a = (actualState.a !== undefined) ? actualState.a : 1;
             const { r, g, b } = ColorUtils.hslToRgb(h, s, l);
             colorStr = `rgba(${r},${g},${b},${a})`;
             colorObj = { r, g, b, a: Math.round(a * 255) };
        } else if (actualState.rgba) {
            colorStr = actualState.rgba;
        } else {
             // Fallback
             colorStr = 'rgba(0,0,0,1)';
        }

        if (this.tool.activeColorTarget === 'active-stroke') {
            if (colorObj) this.tool.options.stroke.color = colorObj;
            this.batchUpdateProperty('stroke', colorStr, isPreview);
        } else if (this.tool.activeColorTarget === 'active-fill') { // Explicit Fill Target
             // Check if we should allow auto-enable fill
             // For unclosed paths (lines/curves), we generally don't want to auto-fill them unless they already have fill
             let allowAutoFill = true;
             // Check first item
             const firstItem = this.tool.selectedItems.values().next().value.item;
             if (firstItem && firstItem.className === 'Path' && !firstItem.closed && !firstItem.fillColor) {
                 allowAutoFill = false;
             }
             
             // If we are actively targeting fill, receiving a color means we want to enable it
             if (!this.tool.options.fill.enabled) {
                 if (allowAutoFill) {
                    this.tool.options.fill.enabled = true;
                    if (colorObj) this.tool.options.fill.color = colorObj;
                    // Update UI to show color box instead of "None"
                    window.dispatchEvent(new Event('toolOptionsUpdated'));
                 } else {
                     // Block fill update for unclosed curves that don't have fill
                     return;
                 }
             } else {
                 if (colorObj) this.tool.options.fill.color = colorObj;
             }
             this.batchUpdateProperty('fill', colorStr, isPreview);
        }

        // Sync UI on commit (drag end) to ensure color swatch is correct
        if (!isPreview) {
            window.dispatchEvent(new Event('toolOptionsUpdated'));
        }
    }

    onStrokeWidthChange(e) {
        if (this.tool.selectedItems.size === 0) return;
        const { value, isPreview } = e.detail;
        // Handle direct value support if Detail is just number (not wrapped)
        const width = (typeof e.detail === 'number') ? e.detail : value;
        const isPrev = (isPreview !== undefined) ? isPreview : false;

        this.batchUpdateProperty('strokeWidth', width, isPrev);
    }

    batchUpdateProperty(key, value, isPreview) {
        const compositeCmd = new CompositeCommand(`Modify ${key}`);
        let hasChanges = false;

        this.tool.selectedItems.forEach(data => {
            if (this.processPropertyChange(data, key, value, compositeCmd, isPreview)) {
                hasChanges = true;
            }
        });

        if (hasChanges && !isPreview) {
            // Apply command ONLY on final commit (updates model history)
            if (window.editSystem) {
                window.editSystem.addCommand(compositeCmd);
            }
            // Trigger FULL update to ensure UI reflects model state
            window.dispatchEvent(new CustomEvent('projectLayersChanged'));
        }
        
        if (hasChanges && isPreview) {
            // Ensure paper view updates
            if (window.vectorSystem) {
                window.vectorSystem.update();
            }
        }
    }

    processPropertyChange(data, key, value, compositeCmd, isPreview) {
        const element = data.element;
        const item = data.item;

        if (element.type === 'group') {
            let changes = false;
            if (item.children) {
                 item.children.forEach(childItem => {
                     const childId = childItem.data.id;
                     const childElement = window.projectModel.getVectorElementById(childId);
                     if (childElement) {
                         const childData = { element: childElement, item: childItem };
                         if (this.processPropertyChange(childData, key, value, compositeCmd, isPreview)) {
                             changes = true;
                         }
                     }
                 });
            }
            return changes;
        }

        // Apply to leaf
        
        // Safety check: Don't fill open paths that don't have fill, 
        // unless specific override logic is added later.
        if (key === 'fill' && value !== null) {
            // Check if item is an open path and has no existing fill
            // Note: If item.fillColor is set (even transparent), it implies intent.
            // But usually 'no fill' means fillColor is null.
            if (item.className === 'Path' && !item.closed && !item.fillColor) {
                return false;
            }
        }

        // 1. Live Preview (Paper.js)
        if (isPreview) {
            if (key === 'fill') item.fillColor = value ? new paper.Color(value) : null;
            if (key === 'stroke') item.strokeColor = new paper.Color(value);
            if (key === 'strokeWidth') item.strokeWidth = value;
            return true;
        }

        // 2. Final Commit (Model)
        // Note: element.properties might be undefined for some objects, fallback to {}
        element.properties = element.properties || {};
        if (element.properties[key] === value) return false;

        const oldProps = { ...element.properties };
        const newProps = { ...element.properties };
        newProps[key] = value;
        
        // Sync Paper.js
        if (key === 'fill') item.fillColor = value ? new paper.Color(value) : null;
        if (key === 'stroke') item.strokeColor = new paper.Color(value);
        if (key === 'strokeWidth') item.strokeWidth = value;

        element.properties = newProps;
        compositeCmd.addCommand(new VectorCommand('modify', element, oldProps, newProps));
        return true;
    }

    updateOptionsFromSelection() {
        if (this.tool.selectedItems.size === 0) return;
        
        let preferredTarget = this.tool.activeColorTarget;
        // Reset to re-evaluate based on new selection
        this.tool.activeColorTarget = null;
        
        let commonWidth = null;

        // Take properties from the first item
        const firstItem = this.tool.selectedItems.values().next().value.item;
        
        // Stroke Width
        if (firstItem.strokeWidth) commonWidth = firstItem.strokeWidth;
        
        let hasFill = false;
        let hasStroke = false;

        // Fill Color
        if (firstItem.fillColor) {
            hasFill = true;
            const fc = firstItem.fillColor;
            // paper.Color to rgba object
            if (fc.type === 'rgb' || fc.type === 'gray') {
                 this.tool.options.fill.enabled = true;
                 this.tool.options.fill.color = { 
                     r: Math.round(fc.red * 255), 
                     g: Math.round(fc.green * 255), 
                     b: Math.round(fc.blue * 255), 
                     a: Math.round(fc.alpha * 255) 
                 };
            }
        } else {
            this.tool.options.fill.enabled = false;
        }

        // Stroke Color
        if (firstItem.strokeColor) {
            hasStroke = true;
            const sc = firstItem.strokeColor;
            if (sc.type === 'rgb' || sc.type === 'gray') {
                this.tool.options.stroke.color = { 
                    r: Math.round(sc.red * 255), 
                    g: Math.round(sc.green * 255), 
                    b: Math.round(sc.blue * 255), 
                    a: Math.round(sc.alpha * 255) 
                };
            }
        }

        // Smart Target Logic
        if (hasFill && preferredTarget === 'active-fill') {
             this.tool.activeColorTarget = 'active-fill';
        } else if (hasStroke && preferredTarget === 'active-stroke') {
             this.tool.activeColorTarget = 'active-stroke';
        }

        // Fallback or Initial Selection
        if (!this.tool.activeColorTarget) {
            // Priority: If open path, prefer stroke. If closed, prefer fill (if active).
            const isClosed = (firstItem.className === 'Path' && firstItem.closed) || firstItem.className !== 'Path'; // Shapes are usually closed or compound
            
            if (hasFill) {
                this.tool.activeColorTarget = 'active-fill';
            } else if (hasStroke) {
                this.tool.activeColorTarget = 'active-stroke';
            } else if (!isClosed) {
                this.tool.activeColorTarget = 'active-stroke'; // Force stroke for lines
            }
        }

        if (commonWidth !== null) {
            this.tool.options.strokeWidth = commonWidth;
        }
        
        // Refresh UI
        window.dispatchEvent(new Event('toolOptionsUpdated'));
    }
}