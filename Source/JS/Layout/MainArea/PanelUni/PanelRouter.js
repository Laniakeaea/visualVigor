/* =========================================
   Panel Router Module
   ========================================= */

export class PanelRouter {
    constructor() {
        this.panels = {}; // { left: element, right: element }
        this.routes = { left: {}, right: {} }; // { left: { 'layers': factory }, right: { 'props': factory } }
        this.activeRoutes = { left: null, right: null };
    }

    /**
     * Registers a panel DOM element.
     * @param {string} id - 'left' or 'right'
     * @param {HTMLElement} element - The panel element
     */
    registerPanel(id, element) {
        this.panels[id] = element;
        // Ensure content container exists
        if (!element.querySelector('.layout-panel__content')) {
            const content = document.createElement('div');
            content.className = 'layout-panel__content';
            // Move existing children (except title) to content? 
            // For now, assume clean panel or handled by factory
            element.appendChild(content);
        }
    }

    /**
     * Registers a route (view) for a panel.
     * @param {string} panelId - 'left' or 'right'
     * @param {string} routeName - Unique name for the route
     * @param {Function} contentFactory - Function returning HTMLElement
     */
    registerRoute(panelId, routeName, contentFactory) {
        if (!this.routes[panelId]) this.routes[panelId] = {};
        this.routes[panelId][routeName] = contentFactory;
    }

    /**
     * Navigates a panel to a specific route.
     * @param {string} panelId - 'left' or 'right'
     * @param {string} routeName - The route to show
     */
    navigate(panelId, routeName) {
        if (!this.panels[panelId]) {
            console.warn(`PanelRouter: Panel '${panelId}' not registered.`);
            return;
        }
        if (!this.routes[panelId] || !this.routes[panelId][routeName]) {
            console.warn(`PanelRouter: Route '${routeName}' not found for panel '${panelId}'.`);
            return;
        }

        const panel = this.panels[panelId];
        const contentContainer = panel.querySelector('.layout-panel__content');
        
        if (!contentContainer) return;

        // Clear existing
        contentContainer.innerHTML = '';
        
        // Create new content
        try {
            const content = this.routes[panelId][routeName]();
            if (content instanceof HTMLElement) {
                contentContainer.appendChild(content);
            } else {
                console.error(`PanelRouter: Factory for '${routeName}' did not return an HTMLElement.`);
            }
        } catch (e) {
            console.error(`PanelRouter: Error rendering route '${routeName}':`, e);
        }
        
        this.activeRoutes[panelId] = routeName;
        
        // Dispatch Event
        window.dispatchEvent(new CustomEvent('panelRouteChanged', {
            detail: { panelId, routeName }
        }));
    }
}
