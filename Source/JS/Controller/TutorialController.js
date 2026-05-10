export class TutorialController {
    constructor() {
        this.isActive = false;
        this.currentStep = 0;
        
        // Define Tutorial Steps
        // Each step has: title, message, targetSelector (to highlight)
        this.steps = [
            {
                title: 'HelpMenu.Tutorial.Welcome.Title',
                message: 'HelpMenu.Tutorial.Welcome.Message',
                target: null // Center screen
            },
            // Menu Bar
            {
                title: 'HelpMenu.Tutorial.MenuBarLeft.Title',
                message: 'HelpMenu.Tutorial.MenuBarLeft.Message',
                target: '.menu-bar__section--left'
            },
            {
                title: 'HelpMenu.Tutorial.MenuBarRight.Title',
                message: 'HelpMenu.Tutorial.MenuBarRight.Message',
                target: '.menu-bar__section--right'
            },
            // Left Toolbar (Bitmap + View)
            {
                title: 'HelpMenu.Tutorial.LeftToolBarBitmap.Title',
                message: 'HelpMenu.Tutorial.LeftToolBarBitmap.Message',
                target: '.position-left .verticalToolBar_top_panel'
            },
            {
                title: 'HelpMenu.Tutorial.LeftToolBarView.Title',
                message: 'HelpMenu.Tutorial.LeftToolBarView.Message',
                target: '.position-left .verticalToolBar_bottom_panel'
            },
            // Top Toolbar (Adjust + Assist)
            {
                title: 'HelpMenu.Tutorial.TopToolBarAdjust.Title',
                message: 'HelpMenu.Tutorial.TopToolBarAdjust.Message',
                target: '.position-top .horizontalToolBarLeft'
            },
            {
                title: 'HelpMenu.Tutorial.TopToolBarAssist.Title',
                message: 'HelpMenu.Tutorial.TopToolBarAssist.Message',
                target: '.position-top .horizontalToolBarRight'
            },
            // Workspace
            {
                title: 'HelpMenu.Tutorial.Workspace.Title',
                message: 'HelpMenu.Tutorial.Workspace.Message',
                target: '.layout-panel--main'
            },
            // Right Toolbar (Vector)
            {
                title: 'HelpMenu.Tutorial.RightToolBarVector.Title',
                message: 'HelpMenu.Tutorial.RightToolBarVector.Message',
                target: '.position-right .verticalToolBar_top_panel'
            },
            // Panels
            {
                title: 'HelpMenu.Tutorial.LeftPanel.Title',
                message: 'HelpMenu.Tutorial.LeftPanel.Message',
                target: '.layout-panel--left'
            },
            {
                title: 'HelpMenu.Tutorial.RightPanel.Title',
                message: 'HelpMenu.Tutorial.RightPanel.Message',
                target: '.layout-panel--right'
            },
            {
                title: 'HelpMenu.Tutorial.AnimationPanel.Title',
                message: 'HelpMenu.Tutorial.AnimationPanel.Message',
                target: '.layout-panel--bottom'
            },
            // Info Bar
            {
                title: 'HelpMenu.Tutorial.InfoBar.Title',
                message: 'HelpMenu.Tutorial.InfoBar.Message',
                target: '.info-bar'
            }
        ];
    }

    start() {
        if (this.isActive) return;
        this.isActive = true;
        this.currentStep = 0;
        this.createOverlay();
        // Wait for next frame to ensure DOM is ready for transition
        requestAnimationFrame(() => this.showStep(0));
    }

    end() {
        this.isActive = false;
        this.removeOverlay();
    }

    createOverlay() {
        // 1. Overlay Container
        this.overlay = document.createElement('div');
        this.overlay.className = 'tutorial-overlay-container';
        Object.assign(this.overlay.style, {
            position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
            zIndex: '9999', pointerEvents: 'none' // Let clicks pass to the blockers
        });

        // 2. Blockers (Top, Bottom, Left, Right) - creates the "hole"
        this.blockers = [];
        for(let i=0; i<4; i++) {
            const el = document.createElement('div');
            Object.assign(el.style, {
                position: 'absolute',
                backgroundColor: 'var(--color-mask-35)',
                backdropFilter: 'blur(20px)',
                transition: 'all 0.3s ease-out',
                pointerEvents: 'auto' // Block clicks
            });
            this.overlay.appendChild(el);
            this.blockers.push(el);
        }

        // 3. Highlight Border (The hole visual boundary)
        this.highlight = document.createElement('div');
        Object.assign(this.highlight.style, {
            position: 'absolute',
            boxSizing: 'border-box',
            border: '2px solid var(--color-accent-100)',
            borderRadius: '4px',
            boxShadow: '0 0 10px var(--color-accent-50)',
            transition: 'all 0.3s ease-out',
            pointerEvents: 'none',
            zIndex: '10000',
            opacity: '0'
        });
        this.overlay.appendChild(this.highlight);

        // 4. Info Card (Using Standard Dialog Structure)
        this.card = document.createElement('div');
        this.card.className = 'dialog-window tutorial-card'; 
        Object.assign(this.card.style, {
            position: 'absolute',
            zIndex: '10001',
            width: '400px', // Standard min-width
            transition: 'all 0.3s ease-out',
            pointerEvents: 'auto'
        });
        
        // 4a. Header
        const header = document.createElement('div');
        header.className = 'dialog-header';
        
        this.titleEl = document.createElement('span');
        this.titleEl.className = 'dialog-title';
        // Override font size if needed for tutorial, but standard is 24px
        this.titleEl.style.fontSize = '20px'; // Slightly smaller for tutorial
        
        header.appendChild(this.titleEl);
        this.card.appendChild(header);

        // 4b. Body
        const body = document.createElement('div');
        body.className = 'dialog-body';
        
        this.msgEl = document.createElement('p');
        this.msgEl.style.margin = '0';
        this.msgEl.style.lineHeight = '1.5';
        this.msgEl.style.fontSize = '16px';
        
        body.appendChild(this.msgEl);
        this.card.appendChild(body);

        // 4c. Footer
        const footer = document.createElement('div');
        footer.className = 'dialog-footer';
        
        // Skip Button
        this.skipBtn = document.createElement('button');
        this.skipBtn.className = 'dialog-btn is-ghost'; 
        this.skipBtn.textContent = 'Skip'; 
        this.skipBtn.onclick = () => this.end();
        // Removed manual overrides in favor of class 'is-ghost'

        // Next/Finish Button
        this.nextBtn = document.createElement('button');
        this.nextBtn.className = 'dialog-btn is-recommend'; 
        // Removed manual overrides in favor of class 'is-recommend'
        this.nextBtn.onclick = () => this.nextStep();

        footer.appendChild(this.skipBtn);
        footer.appendChild(this.nextBtn);
        this.card.appendChild(footer);

        this.overlay.appendChild(this.card);

        document.body.appendChild(this.overlay);
        window.addEventListener('resize', this._handleResize.bind(this));
    }

    removeOverlay() {
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
        window.removeEventListener('resize', this._handleResize.bind(this));
    }

    _handleResize() {
        if (this.isActive) {
            this.showStep(this.currentStep);
        }
    }

    nextStep() {
        if (this.currentStep < this.steps.length - 1) {
            this.currentStep++;
            this.showStep(this.currentStep);
        } else {
            this.end();
        }
    }

    showStep(index) {
        const step = this.steps[index];
        const t = window.languageManager ? window.languageManager.t.bind(window.languageManager) : (s) => s;
        
        this.titleEl.textContent = t(step.title);
        this.msgEl.textContent = t(step.message);
        
        if (index === this.steps.length - 1) {
            this.nextBtn.textContent = t('Popup.Dialog.NewProject.Finish') || 'Finish';
        } else {
            this.nextBtn.textContent = t('Popup.Dialog.Common.Next') || 'Next'; 
        }

        if (this.skipBtn) {
            this.skipBtn.textContent = t('Popup.Dialog.Common.Skip') || 'Skip';
        }

        if (step.target) {
            const targetEl = document.querySelector(step.target);
            if (targetEl) {
                const rect = targetEl.getBoundingClientRect();
                this._placeHighlight(rect);
                this._placeCard(rect);
                return;
            }
        }
        // Fallback or No Target
        this._showIntroduction();
    }

    _showIntroduction() {
        // Full screen blocking
        const winW = window.innerWidth;
        const winH = window.innerHeight;
        
        // 4 Blockers cover everything. 
        // We can just set Top blocker to full screen.
        this.blockers[0].style.width = '100%';
        this.blockers[0].style.height = '100%';
        this.blockers[0].style.top = '0';
        this.blockers[0].style.left = '0';
        
        // Hide others
        for(let i=1; i<4; i++) {
            this.blockers[i].style.width = '0';
            this.blockers[i].style.height = '0';
        }

        this.highlight.style.opacity = '0';

        // Center Card
        this.card.style.top = '50%';
        this.card.style.left = '50%';
        this.card.style.transform = 'translate(-50%, -50%)';
    }

    _placeHighlight(rect) {
        const winW = window.innerWidth;
        const winH = window.innerHeight;
        const padding = 6;
        
        // 1. Top Blocker
        const top = this.blockers[0];
        top.style.top = '0';
        top.style.left = '0';
        top.style.width = '100%';
        top.style.height = `${Math.max(0, rect.top - padding)}px`;

        // 2. Bottom Blocker
        const bottom = this.blockers[1];
        bottom.style.top = `${rect.bottom + padding}px`;
        bottom.style.left = '0';
        bottom.style.width = '100%';
        bottom.style.height = `${Math.max(0, winH - (rect.bottom + padding))}px`;

        // 3. Left Blocker (between top/bottom)
        const left = this.blockers[2];
        left.style.top = `${rect.top - padding}px`;
        left.style.left = '0';
        left.style.width = `${Math.max(0, rect.left - padding)}px`;
        left.style.height = `${rect.height + padding * 2}px`;

        // 4. Right Blocker
        const right = this.blockers[3];
        right.style.top = `${rect.top - padding}px`;
        right.style.left = `${rect.right + padding}px`;
        right.style.width = `${Math.max(0, winW - (rect.right + padding))}px`;
        right.style.height = `${rect.height + padding * 2}px`;

        // Highlight Border
        this.highlight.style.opacity = '1';
        this.highlight.style.top = `${rect.top - padding}px`;
        this.highlight.style.left = `${rect.left - padding}px`;
        this.highlight.style.width = `${rect.width + padding * 2}px`;
        this.highlight.style.height = `${rect.height + padding * 2}px`;
    }

    _placeCard(targetRect) {
        const cardWidth = 420; // 400px width + ~20px padding/margin considerations if not using box-sizing border-box correctly, but it's flex.
        // Dialog width is 400px fixed min-width.
        const cardHeight = 250; // Approximated. Content can grow.
        const margin = 20;
        const winW = window.innerWidth;
        const winH = window.innerHeight;

        let top, left;

        // Reset Transform
        this.card.style.transform = 'none';

        // Prefer Bottom
        if (targetRect.bottom + cardHeight + margin < winH) {
            top = targetRect.bottom + margin;
            left = targetRect.left;
        }
        // Prefer Top (if bottom is blocked)
        else if (targetRect.top - cardHeight - margin > 0) {
            top = targetRect.top - cardHeight - margin;
            left = targetRect.left;
        }
        // Prefer Right
        else if (targetRect.right + cardWidth + margin < winW) {
            left = targetRect.right + margin;
            top = targetRect.top;
        }
        // Prefer Left
        else {
            left = Math.max(margin, targetRect.left - cardWidth - margin);
            top = targetRect.top;
        }

        // Clamp to screen
        if (left + cardWidth > winW) left = winW - cardWidth - margin;
        if (left < margin) left = margin;
        if (top + cardHeight > winH) top = winH - cardHeight - margin;
        if (top < margin) top = margin;

        this.card.style.top = `${top}px`;
        this.card.style.left = `${left}px`;
    }
}
