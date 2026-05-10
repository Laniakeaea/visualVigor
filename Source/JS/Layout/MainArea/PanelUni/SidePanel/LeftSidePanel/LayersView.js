import { GroupController } from '/Source/JS/Controller/GroupController.js';
import { LayerController } from '/Source/JS/Controller/LayerController.js';
import { ElementController } from '/Source/JS/Controller/ElementController.js';
import { ToolOptionsController } from '/Source/JS/Controller/ToolOptionsController.js';

/* =========================================
   Layers View
   ========================================= */

export function createLayersView() {
    const container = document.createElement('div');
    container.className = 'layers-view';
    
    // 0. Tool Options Group
    const toolOptionsContent = document.createElement('div');
    toolOptionsContent.className = 'group-content';
    toolOptionsContent.appendChild(ToolOptionsController.create());
    container.appendChild(GroupController.createGroup('ToolOptions', 'Layout.Panel.ToolOptions.Title', toolOptionsContent));

    // 1. Layers Group
    const layerContent = document.createElement('div');
    layerContent.className = 'group-content';
    layerContent.appendChild(LayerController.create());
    container.appendChild(GroupController.createGroup('Layers', 'Layout.Panel.Layers.Title', layerContent));

    // 2. Elements Group
    const elementContent = document.createElement('div');
    elementContent.className = 'group-content';
    elementContent.appendChild(ElementController.create());
    container.appendChild(GroupController.createGroup('Elements', 'Layout.Panel.Elements.Title', elementContent));

    return container;
}
