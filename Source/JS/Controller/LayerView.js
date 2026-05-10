/* =========================================
   Layer View
   ========================================= */

import { ICONS, ICON_PATH, createDeleteControl } from './ViewUtils.js';
import { LAYER_TYPES } from '../CoreFunction/Project/projectModel.js';

export class LayerView {
    constructor(controller) {
        this.controller = controller;
        this.container = document.createElement('div');
        this.container.className = 'layer-list';
        // Initialize theme based on current state
        const isLight = document.documentElement.classList.contains('light-theme');
        this.currentTheme = isLight ? 'L' : 'D';
        
        // Listen for theme changes
        window.addEventListener('themeChanged', (e) => {
            this.currentTheme = e.detail.theme === 'light' ? 'L' : 'D';
            this.controller.update(); // Re-render
        });
    }

    getContainer() {
        return this.container;
    }

    _getIcon(name) {
        return `${ICON_PATH}${name}${this.currentTheme}.svg`;
    }

    /**
     * Renders the layer list.
     * @param {Array} layerList 
     * @param {string} activeLayerId 
     */
    render(layerList, activeLayerId) {
        this.container.innerHTML = '';
        
        const root = document.createElement('div');
        root.className = 'liststack-combo';

        // 1. Header Toolbar
        const head = document.createElement('div'); 
        head.className = 'liststack__head';

        // Helper to create buttons
        const createBtn = (iconName, title, onClick) => {
            const btn = document.createElement('button');
            btn.className = 'liststack__btn';
            btn.onclick = onClick;
            
            const img = document.createElement('img');
            img.src = this._getIcon(iconName);
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.pointerEvents = 'none';
            btn.appendChild(img);
            
            return btn;
        };

        // Group 1: Add / Delete
        const g1 = document.createElement('div'); 
        g1.className = 'liststack__group';
        const addBtn = createBtn('layerAdd', 'New Layer', () => this.controller.handleAddLayer());
        const delBtn = createBtn('layerDelete', 'Delete Layer', () => this.controller.handleDeleteLayer(activeLayerId));
        g1.append(addBtn, delBtn);

        // Group 2: Up / Down
        const g2 = document.createElement('div'); 
        g2.className = 'liststack__group';
        const upBtn = createBtn('layerMoveUp', 'Move Up', () => this.controller.handleMoveLayer(activeLayerId, 1));
        const downBtn = createBtn('layerMoveDown', 'Move Down', () => this.controller.handleMoveLayer(activeLayerId, -1));
        g2.append(upBtn, downBtn);

        // Group 3: Copy / Paste
        const g3 = document.createElement('div'); 
        g3.className = 'liststack__group';
        const copyBtn = createBtn('layerCopy', 'Copy', () => this.controller.handleCopyLayer(activeLayerId));
        const pasteBtn = createBtn('layerPaste', 'Paste', () => this.controller.handlePasteLayer());
        g3.append(copyBtn, pasteBtn);

        head.append(g1, g2, g3);

        // 2. Body / List
        const body = document.createElement('div'); 
        body.className = 'liststack__body';
        
        const tray = document.createElement('div'); 
        tray.className = 'liststack__tray';
        
        const list = document.createElement('div'); 
        list.className = 'liststack__list';

        if (layerList.length === 0) {
            const msg = document.createElement('div');
            msg.setAttribute('data-i18n', 'Layout.Panel.Layers.NoLayers');
            msg.textContent = window.languageManager ? window.languageManager.t('Layout.Panel.Layers.NoLayers') : 'No layers';
            msg.className = 'text text--muted text--small text--center';
            msg.style.fontStyle = 'italic';
            msg.style.padding = '20px 0';
            list.appendChild(msg);
        } else {
            // Render Items
            // Calculate bitmap count for indexing
            const bitmapLayersCount = layerList.filter(l => l.type === LAYER_TYPES.BITMAP).length;
            let currentBitmapIndex = bitmapLayersCount - 1;

            layerList.forEach(layer => {
                const isVector = layer.type === LAYER_TYPES.VECTOR;
                const isBackground = layer.type === LAYER_TYPES.BACKGROUND;
                let index = -1;

                if (!isVector && !isBackground) {
                    index = currentBitmapIndex--;
                }

                list.appendChild(this._createLayerItem(layer, isVector, activeLayerId, index));
            });
        }

        tray.appendChild(list);
        body.appendChild(tray);

        // 3. Assemble
        root.appendChild(head);
        root.appendChild(body);
        
        this.container.appendChild(root);
    }

    _createLayerItem(layer, isVector, activeLayerId, index) {
        const item = document.createElement('div');
        item.className = 'layer-item';
        if (activeLayerId === layer.id) {
            item.classList.add('layer-item--active');
        }

        // Drag and Drop Logic
        // Only enable for Bitmap Layers that are NOT undeletable (Background)
        const isDraggable = !isVector && !layer.undeletable;

        if (isDraggable) {
            item.draggable = true;
            
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', layer.id);
                e.dataTransfer.setData('application/json', JSON.stringify({ index: index }));
                e.dataTransfer.effectAllowed = 'move';
                item.classList.add('dragging');
            });

            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
                this.container.querySelectorAll('.drop-target-top, .drop-target-bottom').forEach(el => {
                    el.classList.remove('drop-target-top', 'drop-target-bottom');
                });
            });

            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                if (item.classList.contains('dragging')) return; // Don't drop on self

                const rect = item.getBoundingClientRect();
                const midY = rect.top + rect.height / 2;
                
                item.classList.remove('drop-target-top', 'drop-target-bottom');

                if (e.clientY < midY) {
                    item.classList.add('drop-target-top');
                } else {
                    // Prevent dropping below undeletable layer (Background)
                    if (!layer.undeletable) {
                        item.classList.add('drop-target-bottom');
                    }
                }
            });

            item.addEventListener('dragleave', () => {
                item.classList.remove('drop-target-top', 'drop-target-bottom');
            });

            item.addEventListener('drop', (e) => {
                e.preventDefault();
                const draggedId = e.dataTransfer.getData('text/plain');
                if (draggedId === layer.id) return;

                const draggedData = JSON.parse(e.dataTransfer.getData('application/json'));
                const draggedIndex = draggedData.index;

                const rect = item.getBoundingClientRect();
                const midY = rect.top + rect.height / 2;
                const isAbove = e.clientY < midY;

                // Prevent dropping below undeletable layer (Background)
                if (!isAbove && layer.undeletable) return;

                // Calculate target index
                // Visual Top = Higher Array Index
                // Visual Bottom = Lower Array Index
                let targetIndex = index;
                if (isAbove) {
                    targetIndex = index + 1;
                }

                // Adjust for removal of dragged item
                if (draggedIndex < targetIndex) {
                    targetIndex--;
                }

                this.controller.handleReorderLayer(draggedId, targetIndex);
            });
        }

        // Visibility Toggle
        const visBtn = document.createElement('div');
        visBtn.className = `layer-vis ${layer.visible ? 'visible' : 'hidden'}`;
        
        const visIcon = document.createElement('img');
        visIcon.src = this._getIcon(layer.visible ? 'layerShow' : 'layerHide');
        visIcon.style.width = '100%';
        visIcon.style.height = '100%';
        visBtn.appendChild(visIcon);

        visBtn.onclick = (e) => {
            e.stopPropagation();
            this.controller.handleToggleVisibility(layer.id);
        };

        // Name
        const nameSpan = document.createElement('div');
        nameSpan.className = 'layer-name';
        nameSpan.textContent = layer.name;
        if (isVector) {
            nameSpan.style.fontStyle = 'italic';
        }

        // Lock Toggle
        const lockBtn = document.createElement('div');
        lockBtn.className = `layer-lock ${layer.locked ? 'locked' : 'unlocked'}`;
        
        const lockIcon = document.createElement('img');
        lockIcon.src = this._getIcon(layer.locked ? 'layerLock' : 'layerUnlock');
        lockIcon.style.width = '100%';
        lockIcon.style.height = '100%';
        lockBtn.appendChild(lockIcon);

        lockBtn.onclick = (e) => {
            e.stopPropagation();
            this.controller.handleToggleLock(layer.id);
        };

        item.appendChild(visBtn);
        item.appendChild(nameSpan);
        item.appendChild(lockBtn);

        // Delete Button (Only for deletable layers)
        if (!layer.undeletable) {
            item.appendChild(createDeleteControl(() => this.controller.handleDeleteLayer(layer.id)));
        }

        // Selection Logic
        item.onclick = () => {
            this.controller.handleSelectLayer(layer.id);
        };

        return item;
    }
}
