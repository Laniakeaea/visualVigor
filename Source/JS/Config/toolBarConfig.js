/* =========================================
   ToolBar Configuration
   ========================================= */

export const leftToolBarConfig = [
    // Top Panel (Bitmap Tools)
    { type: 'button', iconName: 'bitmapPencil', category: 'bitmap', title: 'Layout.MainArea.ToolBar.LeftToolBar.Bitmap.Pencil', action: 'toolBitmapPencil' },
    { type: 'button', iconName: 'bitmapMarker', category: 'bitmap', title: 'Layout.MainArea.ToolBar.LeftToolBar.Bitmap.Marker', action: 'toolBitmapMarker' },
    { type: 'button', iconName: 'bitmapEraser', category: 'bitmap', title: 'Layout.MainArea.ToolBar.LeftToolBar.Bitmap.Eraser', action: 'toolBitmapEraser' },
    { type: 'button', iconName: 'bitmapDropper', category: 'bitmap', title: 'Layout.MainArea.ToolBar.LeftToolBar.Bitmap.Dropper', action: 'toolBitmapDropper' },
    { type: 'button', iconName: 'bitmapMagicStick', category: 'bitmap', title: 'Layout.MainArea.ToolBar.LeftToolBar.Bitmap.MagicStick', action: 'toolBitmapMagicStick' },
    { type: 'button', iconName: 'bitmapFilling', category: 'bitmap', title: 'Layout.MainArea.ToolBar.LeftToolBar.Bitmap.Filling', action: 'toolBitmapFilling' },
    { type: 'button', iconName: 'bitmapSelect', category: 'bitmap', title: 'Layout.MainArea.ToolBar.LeftToolBar.Bitmap.Select', action: 'toolBitmapSelect' },
    { type: 'button', iconName: 'bitmapImage', category: 'bitmap', title: 'Layout.MainArea.ToolBar.LeftToolBar.Bitmap.Image', action: 'toolBitmapImage' },
    { type: 'button', iconName: 'bitmapGradient', category: 'bitmap', title: 'Layout.MainArea.ToolBar.LeftToolBar.Bitmap.Gradient', action: 'toolBitmapGradient' },
    { type: 'button', iconName: 'bitmapClone', category: 'bitmap', title: 'Layout.MainArea.ToolBar.LeftToolBar.Bitmap.Clone', action: 'toolBitmapClone' },
    { type: 'button', iconName: 'bitmapBlur', category: 'bitmap', title: 'Layout.MainArea.ToolBar.LeftToolBar.Bitmap.Blur', action: 'toolBitmapBlur' },
    { type: 'button', iconName: 'bitmapDesaturate', category: 'bitmap', title: 'Layout.MainArea.ToolBar.LeftToolBar.Bitmap.Desaturate', action: 'toolBitmapDesaturate' },
    { type: 'button', iconName: 'bitmapShape', category: 'bitmap', title: 'Layout.MainArea.ToolBar.LeftToolBar.Bitmap.Shape', action: 'toolBitmapShape' },
    { type: 'button', iconName: 'bitmapSharp', category: 'bitmap', title: 'Layout.MainArea.ToolBar.LeftToolBar.Bitmap.Sharpen', action: 'toolBitmapSharpen' },
    { type: 'button', iconName: 'bitmapPinch', category: 'bitmap', title: 'Layout.MainArea.ToolBar.LeftToolBar.Bitmap.Pinch', action: 'toolBitmapPinch' },
    { type: 'button', iconName: 'bitmapCrop', category: 'bitmap', title: 'Layout.MainArea.ToolBar.LeftToolBar.Bitmap.Crop', action: 'toolBitmapCrop' },
    
    // (View Controls)
    { type: 'button', iconName: 'viewAnimation', category: 'view', position: 'bottom', title: 'Layout.MainArea.ToolBar.LeftToolBar.View.Animation', action: 'toolViewAnimation' },
    { type: 'button', iconName: 'viewDual', category: 'view', position: 'bottom', title: 'Layout.MainArea.ToolBar.LeftToolBar.View.DualView', action: 'viewToggleDualView' }
];

export const rightToolBarConfig = [
    // Top Panel (Vector Tools)
    { type: 'button', iconName: 'vectorSelect', category: 'vector', title: 'Layout.MainArea.ToolBar.RightToolBar.Vector.Select', action: 'toolVectorSelect' },
    { type: 'button', iconName: 'vectorFreePath', category: 'vector', title: 'Layout.MainArea.ToolBar.RightToolBar.Vector.FreePath', action: 'toolVectorFreePath' },
    { type: 'button', iconName: 'vectorLine', category: 'vector', title: 'Layout.MainArea.ToolBar.RightToolBar.Vector.Line', action: 'toolVectorLine' },
    { type: 'button', iconName: 'vectorCurve', category: 'vector', title: 'Layout.MainArea.ToolBar.RightToolBar.Vector.Curve', action: 'toolVectorCurve' },
    { type: 'button', iconName: 'vectorRectangle', category: 'vector', title: 'Layout.MainArea.ToolBar.RightToolBar.Vector.Rectangle', action: 'toolVectorRectangle' },
    { type: 'button', iconName: 'vectorEllipse', category: 'vector', title: 'Layout.MainArea.ToolBar.RightToolBar.Vector.Ellipse', action: 'toolVectorEllipse' },
    { type: 'button', iconName: 'vectorPolygon', category: 'vector', title: 'Layout.MainArea.ToolBar.RightToolBar.Vector.Polygon', action: 'toolVectorPolygon' },
    { type: 'button', iconName: 'vectorFreeForm', category: 'vector', title: 'Layout.MainArea.ToolBar.RightToolBar.Vector.FreeForm', action: 'toolVectorFreeForm' },
    { type: 'button', iconName: 'vectorText', category: 'vector', title: 'Layout.MainArea.ToolBar.RightToolBar.Vector.Text', action: 'toolVectorText' },

    // Custom Plugin Add Button (Bottom)
    { type: 'button', iconName: 'vectorAddPlugin', category: 'custom', position: 'bottom', title: 'Layout.MainArea.ToolBar.RightToolBar.Custom.Add', action: 'toolAddCustomPlugin' }
];

export const topToolBarConfig = [
    // Left Side (Image Adjustment)
    { type: 'button', iconName: 'adjustBrightness', category: 'adjust', title: 'Layout.MainArea.ToolBar.TopToolBar.Adjust.Brightness', action: 'toolAdjustBrightness' },
    { type: 'button', iconName: 'adjustColorCurve', category: 'adjust', title: 'Layout.MainArea.ToolBar.TopToolBar.Adjust.ColorCurve', action: 'toolAdjustColorCurve' },
    { type: 'button', iconName: 'adjustTemperature', category: 'adjust', title: 'Layout.MainArea.ToolBar.TopToolBar.Adjust.Temperature', action: 'toolAdjustTemperature' },
    { type: 'button', iconName: 'adjustContrast', category: 'adjust', title: 'Layout.MainArea.ToolBar.TopToolBar.Adjust.Contrast', action: 'toolAdjustContrast' },
    { type: 'button', iconName: 'adjustExposure', category: 'adjust', title: 'Layout.MainArea.ToolBar.TopToolBar.Adjust.Exposure', action: 'toolAdjustExposure' },
    { type: 'separator' },
    { type: 'button', iconName: 'adjustToolBox', category: 'adjust', title: 'Layout.MainArea.ToolBar.TopToolBar.Adjust.ToolBox', action: 'toolAdjustToolBox' },
    { type: 'separator' },
    { type: 'button', iconName: 'adjustScript', category: 'adjust', title: 'Layout.MainArea.ToolBar.TopToolBar.Adjust.Script', action: 'toolAdjustScript' },
    { type: 'button', iconName: 'adjustCPPScript', category: 'adjust', title: 'Layout.MainArea.ToolBar.TopToolBar.Adjust.CPPScript', action: 'toolAdjustCPPScript' },
    { type: 'button', iconName: 'adjustWASMScript', category: 'adjust', title: 'Layout.MainArea.ToolBar.TopToolBar.Adjust.WASMScript', action: 'toolAdjustWASMScript' },

    // Right Side (View Assistants)
    { type: 'button', iconName: 'assistGrid', category: 'assist', position: 'right', title: 'Layout.MainArea.ToolBar.TopToolBar.Assist.Grid', action: 'toolAssistGrid' },
    { type: 'button', iconName: 'assistIndicator', category: 'assist', position: 'right', title: 'Layout.MainArea.ToolBar.TopToolBar.Assist.Indicator', action: 'toolAssistIndicator' },
    { type: 'button', iconName: 'assistSnap', category: 'assist', position: 'right', title: 'Layout.MainArea.ToolBar.TopToolBar.Assist.Snap', action: 'toolAssistSnap' },
    { type: 'button', iconName: 'assistMousePos', category: 'assist', position: 'right', title: 'Layout.MainArea.ToolBar.TopToolBar.Assist.MousePos', action: 'toolAssistMousePos' },
    { type: 'button', iconName: 'assistSyncView', category: 'assist', position: 'right', title: 'Layout.MainArea.ToolBar.TopToolBar.Assist.SyncView', action: 'toolAssistSyncView' }
];
