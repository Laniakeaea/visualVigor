/* =========================================
   Group Controller
   ========================================= */

export class GroupController {
    /**
     * Creates a collapsible group header.
     * @param {string} titleText - The text to display (fallback).
     * @param {string} i18nKey - The i18n key for the title.
     * @param {HTMLElement} contentElement - The DOM element to toggle.
     * @param {boolean} [isCollapsed=false] - Initial state.
     * @returns {HTMLElement} The header element.
     */
    static createHeader(titleText, i18nKey, contentElement, isCollapsed = false) {
        const header = document.createElement('div');
        header.className = 'control-group__title';
        if (i18nKey) {
            header.setAttribute('data-i18n', i18nKey);
        }
        header.textContent = titleText; 
        
        // State
        let collapsed = isCollapsed;

        // Sync initial state
        const updateState = () => {
            if (collapsed) {
                header.classList.add('control-group__title--collapsed');
                contentElement.style.display = 'none';
            } else {
                header.classList.remove('control-group__title--collapsed');
                contentElement.style.display = ''; // Restore default
            }
        };

        updateState();

        // Click Handler
        header.addEventListener('click', () => {
            collapsed = !collapsed;
            updateState();
        });

        return header;
    }

    /**
     * Creates a complete collapsible group (Header + Content).
     * @param {string} titleText - The text to display.
     * @param {string} i18nKey - The i18n key.
     * @param {HTMLElement} contentElement - The content element.
     * @param {boolean} [isCollapsed=false] - Initial state.
     * @returns {DocumentFragment} Fragment containing header and content.
     */
    static createGroup(titleText, i18nKey, contentElement, isCollapsed = false) {
        const fragment = document.createDocumentFragment();
        const header = this.createHeader(titleText, i18nKey, contentElement, isCollapsed);
        fragment.appendChild(header);
        fragment.appendChild(contentElement);
        return fragment;
    }
}
