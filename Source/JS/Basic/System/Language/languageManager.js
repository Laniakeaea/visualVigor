/* =========================================
   Language Manager Module
   ========================================= */

/*
 * LanguageManager - Internationalization System
 * 
 * Functionality:
 * - Manages language switching (en/zh).
 * - Loads JSON translation files dynamically.
 * - Updates UI elements with 'data-i18n' attributes.
 * - Persists user preference in localStorage.
 * 
 * Usage:
 * const languageManager = new LanguageManager();
 * languageManager.setLanguage('zh');
 */

class LanguageManager {
    constructor() {
        this.storageKey = 'visualvigor-lang';
        this.currentLang = 'en'; // Default
        this.translations = {};
        this.isLoaded = false;
        this.readyPromise = this.init();
    }

    /* Initialize Language */
    async init() {
        const savedLang = localStorage.getItem(this.storageKey);
        if (savedLang) {
            this.currentLang = savedLang;
        } else {
            /* Check browser language */
            const browserLang = navigator.language || navigator.userLanguage;
            if (browserLang.startsWith('zh')) {
                this.currentLang = 'zh';
            }
        }
        await this.loadLanguage(this.currentLang);
    }

    /* Load Language File */
    async loadLanguage(lang) {
        try {
            this.isLoaded = false;
            const response = await fetch(`/Source/JSON/Basic/System/Language/${lang}.json`);
            if (!response.ok) throw new Error(`Failed to load ${lang}.json`);
            
            this.translations = await response.json();
            this.currentLang = lang;
            this.isLoaded = true;
            localStorage.setItem(this.storageKey, lang);
            
            this.updateUI();
            
            /* Dispatch event */
            window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
            
        } catch (error) {
            console.error('LanguageManager Error:', error);
            /* Fallback to English if failed and not already English */
            if (lang !== 'en') {
                await this.loadLanguage('en');
            }
        }
    }

    /* Toggle Language */
    toggleLanguage() {
        const newLang = this.currentLang === 'en' ? 'zh' : 'en';
        this.loadLanguage(newLang);
        return newLang;
    }

    /* Update UI Elements */
    updateUI() {
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(el => {
            this.updateElement(el);
        });
    }

    /* Update Single Element */
    updateElement(el) {
        const key = el.getAttribute('data-i18n');
        if (key) {
            const translation = this.t(key);
            if (translation) {
                /* Handle inputs/placeholders if needed, currently just textContent */
                el.textContent = translation;
            }
        }

        /* Handle Title Attribute */
        const titleKey = el.getAttribute('data-i18n-title');
        if (titleKey) {
            const translation = this.t(titleKey);
            if (translation) {
                el.title = translation;
            }
        }
    }

    /* Translate Key */
    t(key, silent = false) {
        if (!key) return '';
        
        // If not loaded yet, return key but don't warn (unless we want to debug race conditions)
        if (!this.isLoaded) {
            return key; 
        }

        const keys = key.split('.');
        let value = this.translations;
        
        for (const k of keys) {
            if (value && value[k]) {
                value = value[k];
            } else {
                if (!silent) {
                    console.warn(`[i18n] Missing translation: ${key} (${this.currentLang})`);
                }
                return key; /* Return key if not found */
            }
        }
        return value;
    }
}

/* Export Global Instance */
window.LanguageManager = LanguageManager;
