import { GroupController } from '/Source/JS/Controller/GroupController.js';
import { PreviewController } from '/Source/JS/Controller/PreviewController.js';
import { ColorPaletteController } from '/Source/JS/Controller/ColorPaletteController.js';

/* =========================================
   Properties View
   ========================================= */

export function createPropertiesView() {
    const container = document.createElement('div');
    container.className = 'properties-view';

    // --- Group 1: Preview ---
    const previewContent = document.createElement('div');
    previewContent.className = 'control-group__content';
    previewContent.appendChild(PreviewController.create(''));

    container.appendChild(GroupController.createGroup('Preview', 'Layout.Panel.Preview', previewContent));

    // --- Group 2: Color Palette ---
    const colorContent = document.createElement('div');
    colorContent.className = 'control-group__content';
    colorContent.appendChild(ColorPaletteController.create());

    container.appendChild(GroupController.createGroup('Color Palette', 'Layout.Panel.ColorPalette', colorContent));

    return container;
}
