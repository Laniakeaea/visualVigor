/* =========================================
   Element View
   ========================================= */

import { ICONS, ICON_PATH, createDeleteControl } from './ViewUtils.js';

export class ElementView {
    constructor(controller) {
        this.controller = controller;
        this.container = document.createElement('div');
        this.container.className = 'element-list';
        // Initialize theme based on current state
        const isLight = document.documentElement.classList.contains('light-theme');
        this.currentTheme = isLight ? 'L' : 'D';
        this.searchTerm = '';
        this.itemMap = new Map(); // Store id -> DOM element
        
        // Listen for theme changes
        window.addEventListener('themeChanged', (e) => {
            this.currentTheme = e.detail.theme === 'light' ? 'L' : 'D';
            this.controller.update(); // Re-render
        });

        // Listen for language changes
        window.addEventListener('languageChanged', () => {
            this.controller.update();
        });
    }

    getContainer() {
        return this.container;
    }

    _getIcon(name) {
        return `${ICON_PATH}${name}${this.currentTheme}.svg`;
    }

    render(elements, activeId) {
        // Detect if search input was focused before clearing
        const oldInput = this.container.querySelector('.element-search__input');
        const wasFocused = oldInput && document.activeElement === oldInput;

        this.container.innerHTML = '';
        this.itemMap.clear();
        
        const root = document.createElement('div');
        root.className = 'liststack-combo';

        // 1. Search Bar
        const searchContainer = document.createElement('div');
        searchContainer.className = 'element-search';

        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.className = 'element-search__input';
        
        // i18n
        const key = 'Layout.Panel.Elements.Search';
        const placeholder = window.languageManager ? window.languageManager.t(key) : 'Search elements...';
        searchInput.placeholder = (placeholder === key) ? 'Search elements...' : placeholder;
        
        searchInput.value = this.searchTerm;
        searchInput.oninput = (e) => {
            this.searchTerm = e.target.value;
            // Debounce or just re-render
            this.render(elements, activeId); 
            // Ensure focus is kept after re-render in the new input
            // Handled after append
        };

        searchContainer.appendChild(searchInput);
        root.appendChild(searchContainer);

        // 2. Body
        const body = document.createElement('div'); 
        body.className = 'liststack__body';
        
        const tray = document.createElement('div'); 
        tray.className = 'liststack__tray';
        
        const list = document.createElement('div'); 
        list.className = 'liststack__list';

        // Filter Elements
        const filteredElements = this._filterElements(elements);

        if (elements.length === 0) {
            const msg = document.createElement('div');
            msg.setAttribute('data-i18n', 'Layout.Panel.Elements.NoElements');
            msg.textContent = window.languageManager ? window.languageManager.t('Layout.Panel.Elements.NoElements') : 'No elements';
            msg.className = 'text text--muted text--small text--center';
            msg.style.fontStyle = 'italic';
            msg.style.padding = '20px 0';
            list.appendChild(msg);
        } else if (filteredElements.length === 0 && this.searchTerm) {
            const msg = document.createElement('div');
            msg.textContent = 'No matching results';
            msg.className = 'text text--muted text--small text--center';
            msg.style.padding = '20px 0';
            list.appendChild(msg);
        } else {
            // Render Elements Recursively
            this._renderTree(list, filteredElements, activeId, 0);
        }

        tray.appendChild(list);
        body.appendChild(tray);

        root.appendChild(body);
        
        this.container.appendChild(root);
        
        // Restore focus only if it was focused before re-render
        if (wasFocused) {
             const input = root.querySelector('input');
             if (input) {
                 // Move cursor to end
                 input.selectionStart = input.selectionEnd = input.value.length;
                 // Focus immediately as we are in sync execution (though obscure focus issues happen)
                 input.focus();
                 // Double check with raf
                 requestAnimationFrame(() => {
                      if (document.activeElement !== input) input.focus();
                 });
             }
        }
    }

    _filterElements(elements) {
        if (!this.searchTerm) return elements;
        
        const term = this.searchTerm.toLowerCase();
        const result = [];
        
        for (const el of elements) {
            const matches = el.name && el.name.toLowerCase().includes(term);
            
            if (matches) {
                // If parent matches, show it and ALL its children content (context)
                // We create a clone to force expansion without modifying original model
                const newEl = { ...el }; // Shallow copy
                newEl.expanded = true;
                // Keep original children (unfiltered) to show full context of the matched item
                result.push(newEl);
            } else {
                // If parent doesn't match, check if any descendants match
                if (el.children && el.children.length > 0) {
                    const filteredChildren = this._filterElements(el.children);
                    if (filteredChildren.length > 0) {
                        const newEl = { ...el };
                        newEl.children = filteredChildren; // Only show matching paths
                        newEl.expanded = true; // Expand path to match
                        result.push(newEl);
                    }
                }
            }
        }
        return result;
    }

    _renderTree(container, elements, activeId, depth) {
        elements.forEach(el => {
            const item = this._createElementItem(el, activeId, depth);
            container.appendChild(item);

            if (el.children && el.children.length > 0 && el.expanded) {
                const childContainer = document.createElement('div');
                childContainer.className = 'element-children';
                this._renderTree(childContainer, el.children, activeId, depth + 1);
                container.appendChild(childContainer);
            }
        });
    }

    _createElementItem(element, activeIds, depth) {
        const item = document.createElement('div');
        this.itemMap.set(element.id, item);
        
        item.className = 'element-item';
        if (activeIds && (activeIds === element.id || (activeIds.has && activeIds.has(element.id)))) {
            item.classList.add('element-item--active');
        }
        
        // Indentation
        item.style.paddingLeft = `${depth * 15}px`;

        // Expand/Collapse Arrow
        const arrow = document.createElement('div');
        arrow.className = 'element-arrow';
        if (element.children && element.children.length > 0) {
            arrow.innerHTML = ICONS.ARROW;
            if (element.expanded) {
                arrow.classList.add('expanded');
            }
            arrow.onclick = (e) => {
                e.stopPropagation();
                this.controller.handleToggleExpand(element.id);
            };
        }
        item.appendChild(arrow);

        // Visibility
        const visBtn = document.createElement('div');
        visBtn.className = `element-vis ${element.visible ? 'visible' : 'hidden'}`;
        const visIcon = document.createElement('img');
        visIcon.src = this._getIcon(element.visible ? 'layerShow' : 'layerHide');
        visIcon.style.width = '100%';
        visIcon.style.height = '100%';
        visBtn.appendChild(visIcon);
        
        visBtn.onclick = (e) => {
            e.stopPropagation();
            this.controller.handleToggleVisibility(element.id);
        };
        
        // Name
        const nameSpan = document.createElement('div');
        nameSpan.className = 'element-name';
        
        // Highlight logic (All occurrences)
        if (this.searchTerm) {
            const term = this.searchTerm.toLowerCase();
            const text = element.name;
            const textLower = text.toLowerCase();
            
            if (textLower.includes(term)) {
                nameSpan.innerHTML = '';
                let cursor = 0;
                let index = textLower.indexOf(term, cursor);
                
                while (index !== -1) {
                    // Text before match
                    if (index > cursor) {
                        nameSpan.appendChild(document.createTextNode(text.substring(cursor, index)));
                    }
                    
                    // Match
                    const matchText = text.substring(index, index + term.length);
                    const highlight = document.createElement('span');
                    highlight.textContent = matchText;
                    highlight.style.color = 'var(--color-accent-100)';
                    highlight.style.fontWeight = 'bold';
                    nameSpan.appendChild(highlight);
                    
                    cursor = index + term.length;
                    index = textLower.indexOf(term, cursor);
                }
                
                // Remaining text
                if (cursor < text.length) {
                    nameSpan.appendChild(document.createTextNode(text.substring(cursor)));
                }
            } else {
                nameSpan.textContent = element.name;
            }
        } else {
            nameSpan.textContent = element.name;
        }
        
        // Renaming
        nameSpan.ondblclick = (e) => {
            e.stopPropagation();
            
            const input = document.createElement('input');
            input.type = 'text';
            input.value = element.name;
            input.className = 'element-rename-input'; // Standardize CSS if needed
            input.style.width = '100%';
            input.style.height = '100%';
            input.style.border = '1px solid var(--color-accent-100)';
            input.style.background = 'var(--color-bg-1)';
            input.style.color = 'var(--color-font)';
            input.style.fontSize = 'inherit';
            input.style.padding = '0 4px';
            input.style.boxSizing = 'border-box';
            
            const commit = () => {
                 const newName = input.value.trim();
                 if (newName && newName !== element.name) {
                     this.controller.handleRenameElement(element.id, newName);
                 } else {
                     // Cancel / No Change -> Re-render to restore
                     this.controller.update();
                 }
            };
            
            input.onblur = commit;
            input.onkeydown = (ev) => {
                if (ev.key === 'Enter') {
                    input.blur(); // Triggers commit
                } else if (ev.key === 'Escape') {
                    this.controller.update(); // Cancel
                }
                ev.stopPropagation(); // Prevent shortcuts
            };
            
            // Swap
            item.replaceChild(input, nameSpan);
            input.focus();
            input.select();
        };

        item.appendChild(visBtn);
        item.appendChild(nameSpan);

        // Delete Control
        item.appendChild(createDeleteControl(() => this.controller.handleDeleteElement(element.id)));

        item.onclick = (e) => {
            this.controller.handleSelectElement(element.id, {
                ctrl: e.ctrlKey || e.metaKey,
                shift: e.shiftKey
            });
        };

        return item;
    }

    updateSelection(activeIds) {
        this.itemMap.forEach((item, id) => {
             const isActive = activeIds && (activeIds === id || (activeIds.has && activeIds.has(id)));
             if (isActive) {
                 item.classList.add('element-item--active');
             } else {
                 item.classList.remove('element-item--active');
             }
        });
    }
}
