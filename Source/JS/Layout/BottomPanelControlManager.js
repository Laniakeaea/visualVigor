/* =========================================
   Bottom Panel Control Manager
   Manages the specialized playback controls
   ========================================= */

export class BottomPanelControlManager {
    constructor(panel) {
        this.panel = panel;
        this.titleBar = panel ? panel.querySelector('.layout-panel__title') : null;
    }

    init() {
        if (!this.titleBar) return;
        this._applyLayoutBase();
        const controls = this._createControlsUI();
        this.titleBar.appendChild(controls);
        this._bindThemeEvents(controls);
    }

    _applyLayoutBase() {
        Object.assign(this.titleBar.style, {
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        });
    }

    _createControlsUI() {
        const container = document.createElement('div');
        container.className = 'title-bar-controls';
        Object.assign(container.style, {
            marginLeft: 'auto', display: 'flex', alignItems: 'center', 
            gap: '4px', marginRight: '4px', height: '100%'
        });

        const config = this._getControlConfig();
        const initialTheme = this._getCurrentTheme();

        config.forEach(item => {
            if (item.type === 'separator') {
                container.appendChild(this._createSeparator());
            } else {
                container.appendChild(this._createButton(item, initialTheme));
                if (item.showValue) {
                    container.appendChild(this._createValueDisplay(item));
                }
            }
        });

        return container;
    }

    _createValueDisplay(item) {
        const span = document.createElement('span');
        Object.assign(span.style, {
             fontSize: '20px', color: 'var(--color-font)', 
             marginLeft: '2px', marginRight: '6px', minWidth: '30px'
        });
        
        const update = () => {
            if (item.getValue) span.textContent = item.getValue();
        };
        
        update();
        
        if (item.icon === 'Speed') {
            window.addEventListener('playbackRateChanged', update);
        }
        
        return span;
    }

    _createButton(item, theme) {
        const btn = document.createElement('div');
        btn.className = 'title-control-btn';
        Object.assign(btn.style, {
            width: '36px', height: '36px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: '0.9', borderRadius: '4px', transition: 'all 0.2s'
        });

        btn.onmouseenter = () => { btn.style.opacity = '1'; btn.style.backgroundColor = 'var(--color-bg-hover, rgba(255,255,255,0.1))'; };
        btn.onmouseleave = () => { btn.style.opacity = '0.9'; btn.style.backgroundColor = 'transparent'; };

        const img = document.createElement('img');
        Object.assign(img.style, { width: '28px', height: '28px', display: 'block' });
        btn.appendChild(img);

        if (item.type === 'button') {
            this._setupSimpleButton(btn, img, item, theme);
        } else if (item.type === 'toggle') {
            this._setupToggleButton(btn, img, item);
        }

        return btn;
    }

    _setupSimpleButton(btn, img, item, theme) {
        if (window.languageManager && item.i18n) {
            btn.setAttribute('title', window.languageManager.t(item.i18n));
            btn.setAttribute('data-i18n-title', item.i18n);
        } else {
            btn.setAttribute('title', item.title);
        }
        img.src = this._getIconPath(item.icon, theme);
        img.dataset.iconName = item.icon;
        if (item.action) btn.addEventListener('click', item.action);
    }

    _setupToggleButton(btn, img, item) {
        let stateIndex = item.initialStateIndex || 0;
        
        const updateState = () => {
            const iconName = item.states[stateIndex];
            const theme = this._getCurrentTheme();
            
            // Text
            if (window.languageManager && item.i18nKeys) {
                const key = item.i18nKeys[stateIndex];
                btn.setAttribute('title', window.languageManager.t(key));
                btn.setAttribute('data-i18n-title', key);
            } else {
                btn.setAttribute('title', item.titles[stateIndex]);
            }
            
            // Icon
            img.src = this._getIconPath(iconName, theme);
            img.dataset.iconName = iconName;
        };

        updateState();
        btn.addEventListener('click', () => {
            stateIndex = (stateIndex + 1) % item.states.length;
            updateState();
            if (item.action) item.action(item.states[stateIndex]);
        });
    }

    _createSeparator() {
        const sep = document.createElement('div');
        Object.assign(sep.style, {
            width: '1px', height: '18px', backgroundColor: 'var(--color-border-main, #333)', margin: '0 8px'
        });
        return sep;
    }

    _bindThemeEvents(container) {
        window.addEventListener('themeChanged', (e) => {
            const theme = e.detail.theme;
            container.querySelectorAll('img').forEach(img => {
                if (img.dataset.iconName) img.src = this._getIconPath(img.dataset.iconName, theme);
            });
        });
    }

    _getCurrentTheme() {
        return document.documentElement.classList.contains('light-theme') ? 'light' : 'dark';
    }

    _getIconPath(name, theme) {
        const suffix = theme === 'light' ? 'L' : 'D';
        return `/Asset/Icon/Layout/MainArea/PanelUni/SidePanel/BottomSidePanel/view${name}${suffix}.svg`;
    }

    _getControlConfig() {
        return [
            { 
                type: 'toggle', states: ['AllLayers', 'VisibleLayer'], 
                i18nKeys: ['Layout.Panel.Animation.Control.ShowAllLayers', 'Layout.Panel.Animation.Control.ShowVisibleOnly'],
                titles: ['Show All Layers', 'Show Visible Only'],
                action: (state) => window.animationController && window.animationController.setLayerViewMode(state === 'VisibleLayer' ? 'visible' : 'all')
            },
            { type: 'separator' },
            { 
                type: 'button', icon: 'ToStart', i18n: 'Layout.Panel.Animation.Control.GoToStart', title: 'Go to Start',
                action: () => window.animationController && window.animationController.toStart()
            },
            { 
                type: 'button', icon: 'Last', i18n: 'Layout.Panel.Animation.Control.PreviousFrame', title: 'Previous Frame',
                action: () => window.animationController && window.animationController.prevFrame()
            },
            { 
                type: 'toggle', states: ['Play', 'Pause'], 
                i18nKeys: ['Layout.Panel.Animation.Control.Play', 'Layout.Panel.Animation.Control.Pause'],
                titles: ['Play', 'Pause'],
                action: (state) => window.animationController && (state === 'Pause' ? window.animationController.play() : window.animationController.pause())
            },
            { 
                type: 'button', icon: 'Next', i18n: 'Layout.Panel.Animation.Control.NextFrame', title: 'Next Frame',
                action: () => window.animationController && window.animationController.nextFrame()
            },
            { 
                type: 'button', icon: 'ToEnd', i18n: 'Layout.Panel.Animation.Control.GoToEnd', title: 'Go to End',
                action: () => window.animationController && window.animationController.toEnd()
            },
            { type: 'separator' },
            { 
                type: 'toggle', states: ['Repeat', 'Nonrepeat'], 
                i18nKeys: ['Layout.Panel.Animation.Control.Loop', 'Layout.Panel.Animation.Control.NoLoop'],
                titles: ['Loop', 'No Loop'], initialStateIndex: 1,
                action: (state) => window.animationController && window.animationController.setLoop(state === 'Repeat')
            },
            { 
                type: 'button', icon: 'Speed', i18n: 'Layout.Panel.Animation.Control.PlaybackSpeed', title: 'Playback Speed',
                showValue: true,
                getValue: () => window.animationController ? window.animationController.playbackRate.toFixed(1) + 'x' : '1.0x',
                action: () => {
                    if(!window.animationController) return;
                    const rates = [0.25, 0.5, 1.0, 1.5, 2.0, 4.0];
                    const current = window.animationController.playbackRate;
                    // Find next rate
                    let next = rates.find(r => r > current);
                    if (!next) next = rates[0];
                    window.animationController.setPlaybackRate(next);
                }
            }
        ];
    }
}
