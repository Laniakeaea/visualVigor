/* =========================================
   Shortcut Configuration
   ========================================= */

export const shortcutConfig = [
    // --- Column 1: System & General ---
    { 
        group: 'HelpMenu.Shortcuts.GroupGeneral', // Merged group
        items: [
            // File
            { key: 'o', ctrl: true, action: 'fileOpen', label: 'HelpMenu.Shortcuts.Open' },
            { key: 's', ctrl: true, action: 'fileSave', label: 'HelpMenu.Shortcuts.Save' },
            // Edit
            { key: 'z', ctrl: true, action: 'editUndo', label: 'HelpMenu.Shortcuts.Undo' },
            { key: 'y', ctrl: true, action: 'editRedo', label: 'HelpMenu.Shortcuts.Redo' },
            { key: 'g', ctrl: true, action: 'editGroup', label: 'HelpMenu.Shortcuts.Group' },
            { key: 'g', ctrl: true, shift: true, action: 'editUngroup', label: 'HelpMenu.Shortcuts.Ungroup' },
            // View
            { key: '=', ctrl: true, action: 'viewZoomIn', label: 'HelpMenu.Shortcuts.ZoomIn' },
            { key: '-', ctrl: true, action: 'viewZoomOut', label: 'HelpMenu.Shortcuts.ZoomOut' },
            { key: '0', ctrl: true, action: 'viewFit', label: 'HelpMenu.Shortcuts.Fit' },
            // Delete (General)
            { key: 'Delete', code: 'Delete', action: 'editDelete', label: 'Delete' },
            { key: 'Backspace', code: 'Backspace', action: 'editDelete', label: 'Delete' }
        ]
    },

    // --- Column 2: Bitmap Tools (Ctrl / Ctrl+Shift) ---
    {
        group: 'HelpMenu.Shortcuts.GroupToolsBitmap',
        items: [
            // Basic (Ctrl + 1-9)
            { key: '1', code: 'Digit1', ctrl: true, action: 'toolBitmapPencil', label: 'Layout.MainArea.ToolBar.LeftToolBar.Bitmap.Pencil' },
            { key: '2', code: 'Digit2', ctrl: true, action: 'toolBitmapMarker', label: 'Layout.MainArea.ToolBar.LeftToolBar.Bitmap.Marker' },
            { key: '3', code: 'Digit3', ctrl: true, action: 'toolBitmapEraser', label: 'Layout.MainArea.ToolBar.LeftToolBar.Bitmap.Eraser' },
            { key: '4', code: 'Digit4', ctrl: true, action: 'toolBitmapDropper', label: 'Layout.MainArea.ToolBar.LeftToolBar.Bitmap.Dropper' },
            { key: '5', code: 'Digit5', ctrl: true, action: 'toolBitmapMagicStick', label: 'Layout.MainArea.ToolBar.LeftToolBar.Bitmap.MagicStick' },
            { key: '6', code: 'Digit6', ctrl: true, action: 'toolBitmapFilling', label: 'Layout.MainArea.ToolBar.LeftToolBar.Bitmap.Filling' },
            { key: '7', code: 'Digit7', ctrl: true, action: 'toolBitmapSelect', label: 'Layout.MainArea.ToolBar.LeftToolBar.Bitmap.Select' },
            { key: '8', code: 'Digit8', ctrl: true, action: 'toolBitmapImage', label: 'Layout.MainArea.ToolBar.LeftToolBar.Bitmap.Image' },
            { key: '9', code: 'Digit9', ctrl: true, action: 'toolBitmapGradient', label: 'Layout.MainArea.ToolBar.LeftToolBar.Bitmap.Gradient' },
            
            // Extended (Ctrl + Shift + 1-7)
            { key: '1', code: 'Digit1', ctrl: true, shift: true, action: 'toolBitmapClone', label: 'Layout.MainArea.ToolBar.LeftToolBar.Bitmap.Clone' },
            { key: '2', code: 'Digit2', ctrl: true, shift: true, action: 'toolBitmapBlur', label: 'Layout.MainArea.ToolBar.LeftToolBar.Bitmap.Blur' },
            { key: '3', code: 'Digit3', ctrl: true, shift: true, action: 'toolBitmapDesaturate', label: 'Layout.MainArea.ToolBar.LeftToolBar.Bitmap.Desaturate' },
            { key: '4', code: 'Digit4', ctrl: true, shift: true, action: 'toolBitmapShape', label: 'Layout.MainArea.ToolBar.LeftToolBar.Bitmap.Shape' },
            { key: '5', code: 'Digit5', ctrl: true, shift: true, action: 'toolBitmapSharpen', label: 'Layout.MainArea.ToolBar.LeftToolBar.Bitmap.Sharpen' },
            { key: '6', code: 'Digit6', ctrl: true, shift: true, action: 'toolBitmapPinch', label: 'Layout.MainArea.ToolBar.LeftToolBar.Bitmap.Pinch' },
            { key: '7', code: 'Digit7', ctrl: true, shift: true, action: 'toolBitmapCrop', label: 'Layout.MainArea.ToolBar.LeftToolBar.Bitmap.Crop' }
        ]
    },

    // --- Column 3: Vector Tools (Alt + Number) ---
    {
        group: 'HelpMenu.Shortcuts.GroupToolsVector',
        items: [
            { key: '1', code: 'Digit1', alt: true, action: 'toolVectorSelect', label: 'Layout.MainArea.ToolBar.RightToolBar.Vector.Select' },
            { key: '2', code: 'Digit2', alt: true, action: 'toolVectorFreePath', label: 'Layout.MainArea.ToolBar.RightToolBar.Vector.FreePath' },
            { key: '3', code: 'Digit3', alt: true, action: 'toolVectorLine', label: 'Layout.MainArea.ToolBar.RightToolBar.Vector.Line' },
            { key: '4', code: 'Digit4', alt: true, action: 'toolVectorCurve', label: 'Layout.MainArea.ToolBar.RightToolBar.Vector.Curve' },
            { key: '5', code: 'Digit5', alt: true, action: 'toolVectorRectangle', label: 'Layout.MainArea.ToolBar.RightToolBar.Vector.Rectangle' },
            { key: '6', code: 'Digit6', alt: true, action: 'toolVectorEllipse', label: 'Layout.MainArea.ToolBar.RightToolBar.Vector.Ellipse' },
            { key: '7', code: 'Digit7', alt: true, action: 'toolVectorPolygon', label: 'Layout.MainArea.ToolBar.RightToolBar.Vector.Polygon' },
            { key: '8', code: 'Digit8', alt: true, action: 'toolVectorFreeForm', label: 'Layout.MainArea.ToolBar.RightToolBar.Vector.FreeForm' },
            { key: '9', code: 'Digit9', alt: true, action: 'toolVectorText', label: 'Layout.MainArea.ToolBar.RightToolBar.Vector.Text' }
        ]
    }
];
