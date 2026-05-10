import { ActionControl, BooleanControl, NumberControl, SelectControl } from './Controls/BasicControls.js';
import { CurveControl, FillControl, GradientControl, StrokeControl } from './Controls/StyleControls.js';

export class OptionFactory {
    static createControl(tool, key, value, controller) {
        const type = typeof value;

        if (type === 'number') {
            // Special handling for 'sides' - only show if shape is polygon OR tool is PolygonTool
            if (key === 'sides') {
                if (tool.id === 'toolBitmapShape' && tool.options.shape !== 'polygon') {
                    return null;
                }
                // For Vector Polygon Tool, always show (implied)
            }
            
            // Special handling for 'threshold' - only show if mode is binary
            if (key === 'threshold') {
                if (tool.id === 'toolAdjustToolBox' && tool.options.mode !== 'binary') {
                    return null;
                }
            }

            return NumberControl.create(tool, key, value);
        } else if (type === 'boolean') {
            return BooleanControl.create(tool, key, value, controller);
        } else if (type === 'string') {
            return SelectControl.create(tool, key, value, controller);
        } else if (key === 'colors' && typeof value === 'object') {
            return GradientControl.create(tool, key, value, controller);
        } else if (key === 'stroke' && typeof value === 'object') {
            return StrokeControl.create(tool, key, value, controller);
        } else if (key === 'fill' && typeof value === 'object') {
            return FillControl.create(tool, key, value, controller);
        } else if (key === 'curve' && typeof value === 'object') {
            return CurveControl.create(tool, key, value, controller);
        } else if (type === 'function') {
            // Skip configuration functions like 'easing'
            if (key === 'easing') return null;
            return ActionControl.create(tool, key, value);
        }
        
        return null;
    }
}
