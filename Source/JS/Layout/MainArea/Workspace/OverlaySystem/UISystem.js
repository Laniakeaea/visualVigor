/**
 * Handles HTML UI Overlay Elements (Mouse Position, Zoom Label).
 */
export class UISystem {
    constructor(controller, container) {
        this.controller = controller;
        this.container = container;
        this.enabled = false;

        // Labels
        this.mouseLabel = this._createLabel('workspace__mouse-pos-label');
        this.zoomLabel = this._createLabel('workspace__zoom-label');
        this.zoomTimer = null;

        window.addEventListener('mousemove', (e) => this._onMouseMove(e));
    }

    _createLabel(className) {
        const el = document.createElement('div');
        el.className = `workspace__overlay-label ${className}`;
        el.style.display = className.includes('mouse') ? 'none' : 'block';
        if (className.includes('zoom')) el.style.opacity = '0';
        this.container.appendChild(el);
        return el;
    }

    setMousePosEnabled(enabled) {
        this.enabled = enabled;
        this.mouseLabel.style.display = enabled ? 'block' : 'none';
    }

    showZoomLabel(scale) {
        const percentage = Math.round(scale * 100);
        this.zoomLabel.textContent = `${percentage}%`;
        this.zoomLabel.classList.add('show');
        this.zoomLabel.style.opacity = '1';
        
        if (this.zoomTimer) clearTimeout(this.zoomTimer);
        this.zoomTimer = setTimeout(() => {
            this.zoomLabel.classList.remove('show');
            this.zoomLabel.style.opacity = '0';
        }, 500);
    }

    _onMouseMove(e) {
        if (!this.enabled) return;
        
        const rect = this.container.getBoundingClientRect();
        if (e.clientX < rect.left || e.clientX > rect.right || 
            e.clientY < rect.top || e.clientY > rect.bottom) {
            this.mouseLabel.style.display = 'none';
            return;
        }
        this.mouseLabel.style.display = 'block';

        const t = this.controller.transform;
        const x = (e.clientX - rect.left - t.x) / t.scale;
        const y = (e.clientY - rect.top - t.y) / t.scale;

        this.mouseLabel.textContent = `X: ${Math.round(x)} Y: ${Math.round(y)}`;
        this.mouseLabel.style.left = `${e.clientX - rect.left + 15}px`;
        this.mouseLabel.style.top = `${e.clientY - rect.top + 15}px`;
    }
}