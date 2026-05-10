/* =========================================
   ToolTip Module
   ========================================= */

/*
 * ToolTip
 * File: toolTip.js
 * Purpose: Global handler for internationalized tooltips.
 * Usage: Automatically attaches to elements with 'data-i18n-tooltip' or 'title'.
 *        Enforces i18n lookup for the content.
 */

export class ToolTip {
    constructor() {
        this.tooltip = null;
        this.activeElement = null;
        this.rafId = null;
        this.init();
    }

    init() {
        // Create tooltip element
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'tooltip';
        document.body.appendChild(this.tooltip);

        // Bind events
        document.addEventListener('mouseover', this.handleMouseOver.bind(this));
        document.addEventListener('mouseout', this.handleMouseOut.bind(this));
    }

    handleMouseOver(e) {
        // Find closest element with tooltip data
        const target = e.target.closest('[title], [data-i18n-tooltip]');
        if (!target) return;

        let key = target.getAttribute('data-i18n-tooltip');

        // If using title, treat it as a key and migrate to data attribute
        if (target.hasAttribute('title')) {
            const titleVal = target.getAttribute('title');
            if (titleVal) {
                key = titleVal;
                target.setAttribute('data-i18n-tooltip', key);
                target.removeAttribute('title');
            }
        }

        if (!key) return;

        this.activeElement = target;
        this.show(target, key);
    }

    handleMouseOut(e) {
        if (this.activeElement) {
             // Check if moving to a child element or staying within active element
             // e.relatedTarget is null when moving out of the window
             if (!e.relatedTarget || !this.activeElement.contains(e.relatedTarget)) {
                 this.hide();
                 this.activeElement = null;
             }
        }
    }

    show(target, key) {
        // Enforce Internationalization
        const text = this.translate(key);
        
        this.tooltip.textContent = text;
        this.tooltip.className = 'tooltip'; // Reset classes

        // Measure dimensions
        const rect = target.getBoundingClientRect();
        const ttRect = this.tooltip.getBoundingClientRect();
        
        const gap = 10;
        let top = rect.top - ttRect.height - gap;
        let left = rect.left + (rect.width - ttRect.width) / 2;
        let posClass = 'tooltip--top';

        // Boundary Checks
        if (top < 10) {
            top = rect.bottom + gap;
            posClass = 'tooltip--bottom';
        }

        if (left < 10) left = 10;
        if (left + ttRect.width > window.innerWidth - 10) {
            left = window.innerWidth - ttRect.width - 10;
        }
        
        this.tooltip.style.top = `${top}px`;
        this.tooltip.style.left = `${left}px`;
        this.tooltip.classList.add(posClass);
        
        if (this.rafId) cancelAnimationFrame(this.rafId);
        this.rafId = requestAnimationFrame(() => {
            this.tooltip.classList.add('show');
        });
    }

    hide() {
        if (this.rafId) cancelAnimationFrame(this.rafId);
        this.tooltip.classList.remove('show');
    }

    translate(key) {
        if (window.languageManager && typeof window.languageManager.t === 'function') {
            return window.languageManager.t(key);
        }
        return key; // Fallback if manager not ready
    }
}
