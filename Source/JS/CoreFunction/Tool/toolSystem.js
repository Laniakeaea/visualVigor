/* =========================================
   Tool System
   ========================================= */

import { PenTool } from './Bitmap/PenTool.js';
import { MarkerTool } from './Bitmap/MarkerTool.js';
import { EraserTool } from './Bitmap/EraserTool.js';
import { DropperTool } from './Bitmap/DropperTool.js';
import { MagicStickTool } from './Bitmap/MagicStickTool.js';
import { FillingTool } from './Bitmap/FillingTool.js';
import { SelectTool } from './Bitmap/SelectTool.js';
import { ImageTool } from './Bitmap/ImageTool.js';
import { GradientTool } from './Bitmap/GradientTool.js';
import { CloneTool } from './Bitmap/CloneTool.js';
import { BlurTool } from './Bitmap/BlurTool.js';
import { SharpenTool } from './Bitmap/SharpenTool.js';
import { DesaturateTool } from './Bitmap/DesaturateTool.js';
import { ShapeTool } from './Bitmap/ShapeTool.js';
import { PinchTool } from './Bitmap/PinchTool.js';
import { CropTool } from './Bitmap/CropTool.js';
import { FreePathTool } from './Vector/FreePathTool.js';
import { LineTool } from './Vector/LineTool.js';
import { CurveTool } from './Vector/CurveTool.js';
import { RectangleTool } from './Vector/RectangleTool.js';
import { EllipseTool } from './Vector/EllipseTool.js';
import { PolygonTool } from './Vector/PolygonTool.js';
import { FreeFormTool } from './Vector/FreeFormTool.js';
import { TextTool } from './Vector/TextTool.js';
import { SelectTool as VectorSelectTool } from './Vector/SelectTool.js';
import { BrightnessTool } from './Adjust/BrightnessTool.js';
import { ContrastTool } from './Adjust/ContrastTool.js';
import { ExposureTool } from './Adjust/ExposureTool.js';
import { TemperatureTool } from './Adjust/TemperatureTool.js';
import { ColorCurveTool } from './Adjust/CurvesTool.js';
import { ToolBoxTool } from './Adjust/ToolBoxTool.js';

export class ToolSystem {
    constructor() {
        this.activeToolId = null;
        this.activeTool = null;
        
        this.tools = {
            'toolBitmapPencil': new PenTool(),
            'toolBitmapMarker': new MarkerTool(),
            'toolBitmapEraser': new EraserTool(),
            'toolBitmapDropper': new DropperTool(),
            'toolBitmapMagicStick': new MagicStickTool(),
            'toolBitmapFilling': new FillingTool(),
            'toolBitmapSelect': new SelectTool(),
            'toolBitmapImage': new ImageTool(),
            'toolBitmapGradient': new GradientTool(),
            'toolBitmapClone': new CloneTool(),
            'toolBitmapBlur': new BlurTool(),
            'toolBitmapSharpen': new SharpenTool(),
            'toolBitmapDesaturate': new DesaturateTool(),
            'toolBitmapShape': new ShapeTool(),
            'toolBitmapPinch': new PinchTool(),
            'toolBitmapCrop': new CropTool(),
            'toolVectorFreePath': new FreePathTool(),
            'toolVectorLine': new LineTool(),
            'toolVectorCurve': new CurveTool(),
            'toolVectorRectangle': new RectangleTool(),
            'toolVectorEllipse': new EllipseTool(),
            'toolVectorPolygon': new PolygonTool(),
            'toolVectorFreeForm': new FreeFormTool(),
            'toolVectorText': new TextTool(),
            'toolVectorSelect': new VectorSelectTool(),
            'toolAdjustBrightness': new BrightnessTool(),
            'toolAdjustContrast': new ContrastTool(),
            'toolAdjustExposure': new ExposureTool(),
            'toolAdjustTemperature': new TemperatureTool(),
            'toolAdjustColorCurve': new ColorCurveTool(),
            'toolAdjustToolBox': new ToolBoxTool()
        };
    }

    /**
     * Activates a tool by its ID.
     * @param {string} toolId - The ID of the tool to activate.
     */
    activateTool(toolId) {
        if (this.activeToolId === toolId) {
            return;
        }

        // Deactivate current tool
        if (this.activeTool) {
            this.activeTool.deactivate();
            this.activeTool = null;
        }

        this.activeToolId = toolId;

        // Activate new tool
        const tool = this.tools[toolId];
        if (tool) {
            this.activeTool = tool;
            this.activeTool.activate();
        } else {
            console.warn(`ToolSystem: Tool implementation for ${toolId} not found.`);
        }

        // Dispatch a custom event so the UI can update
        const event = new CustomEvent('toolActivated', { 
            detail: { toolId: this.activeToolId } 
        });
        window.dispatchEvent(event);
    }

    getActiveTool() {
        return this.activeToolId;
    }
}
