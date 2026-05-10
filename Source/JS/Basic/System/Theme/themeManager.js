/* =========================================
   Theme Manager Module
   ========================================= */

/*
 * ThemeManager - Theme Switching System
 * 
 * Functionality:
 * - Manages Light/Dark theme switching.
 * - Persists user preference in localStorage.
 * - Toggles the '.light-theme' class on the document root.
 * 
 * Usage:
 * const themeManager = new ThemeManager();
 * themeManager.toggleTheme();
 */

class ThemeManager {
    constructor() {
        this.storageKey = 'visualvigor-theme';
        this.currentTheme = 'dark'; // Default
        this.init();
    }

    /* Initialize Theme */
    init() {
        const savedTheme = localStorage.getItem(this.storageKey);
        if (savedTheme) {
            this.currentTheme = savedTheme;
        } else {
            /* Check system preference */
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
                this.currentTheme = 'light';
            }
        }
        this.applyTheme(this.currentTheme);
    }

    /* Apply Theme */
    applyTheme(theme) {
        const html = document.documentElement;
        if (theme === 'light') {
            html.classList.add('light-theme');
        } else {
            html.classList.remove('light-theme');
        }
        this.currentTheme = theme;
        localStorage.setItem(this.storageKey, theme);
        
        /* Dispatch event for other components */
        window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme } }));
    }

    /* Toggle Theme */
    toggleTheme() {
        const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        this.applyTheme(newTheme);
        return newTheme;
    }
}

/* Export Global Instance */
window.ThemeManager = ThemeManager;
