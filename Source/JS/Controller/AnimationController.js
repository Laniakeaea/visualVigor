import { AnimationView } from '/Source/JS/Layout/MainArea/PanelUni/SidePanel/BottomSidePanel/AnimationView.js';
import { PROJECT_DEFAULTS } from '../Config/projectConfig.js';

/* =========================================
   Animation Controller
   ========================================= */

export class AnimationController {
    constructor() {
        this.view = new AnimationView(this);
        
        // Playback State
        this.playing = false;
        this.playTimer = null;
        this.playbackRate = 1.0;
        this.loop = false; // Default: No Loop matches 'Nonrepeat'
        
        // Layer View Mode ('all' or 'visible')
        // 'visible' = Show only frames that exist? Actually, user said "Canvas displays within time range"
        // Let's store this state for WorkspaceView to consume.
        this.layerViewMode = 'all'; 
        
        // Export to global scope
        window.animationController = this;

        this._bindEvents();
    }

    /**
     * Creates the animation panel component.
     * @returns {HTMLElement}
     */
    static create() {
        const instance = new AnimationController();
        instance.update();
        return instance.view.getContainer();
    }

    _bindEvents() {
        // Listen for layer changes (add/remove/reorder)
        window.addEventListener('projectLayersChanged', () => {
            this.update();
        });

        // Listen for selection changes
        window.addEventListener('projectLayerSelected', () => {
            this.update();
        });

        // Listen for frame changes
        window.addEventListener('projectFrameChanged', (e) => {
            if (this.view.updatePlayhead) {
                this.view.updatePlayhead(e.detail);
            } else {
                this.update();
            }
        });

        // Listen for duration changes
        window.addEventListener('projectDurationChanged', () => {
            this.update();
        });
    }

    // --- Control Methods ---

    play() {
        if (this.playing) return;
        this.playing = true;
        this._loopPlay();
    }

    pause() {
        this.playing = false;
        if (this.playTimer) {
            cancelAnimationFrame(this.playTimer);
            this.playTimer = null;
        }
    }

    togglePlay() {
        if (this.playing) this.pause();
        else this.play();
        return this.playing;
    }

    _loopPlay() {
        if (!this.playing) return;
        
        // Use a simple timer based on FPS
        const project = window.projectModel;
        if (!project) {
            this.pause();
            return;
        }

        const fps = (project.data && project.data.settings) ? project.data.settings.fps : 12;
        const interval = 1000 / (fps * this.playbackRate);

        // Simple customized interval
        setTimeout(() => {
            if (!this.playing) return;
            this.nextFrame(true); // true = loop check inside
            this.playTimer = requestAnimationFrame(() => this._loopPlay());
        }, interval);
    }

    nextFrame(isAutomated = false) {
        if (!window.projectModel) return;
        
        const current = window.projectModel.getCurrentFrame();
        const total = window.projectModel.getTotalFrames();
        
        let next = current + 1;
        // Check boundary
        if (next >= total) { 
             if (this.loop) {
                 next = 0;
             } else {
                 if (isAutomated) {
                     this.pause();
                     return;
                 }
                 next = total > 0 ? total - 1 : 0; // Clamp
             }
        }
        
        window.projectModel.setCurrentFrame(next);
    }

    prevFrame() {
        if (!window.projectModel) return;
        const current = window.projectModel.getCurrentFrame();
        const total = window.projectModel.getTotalFrames();
        
        let prev = current - 1;
        if (prev < 0) {
             if (this.loop && total > 0) {
                 prev = total - 1;
             } else {
                 prev = 0;
             }
        }
        
        window.projectModel.setCurrentFrame(prev);
    }

    toStart() {
        if (!window.projectModel) return;
        window.projectModel.setCurrentFrame(0);
    }

    toEnd() {
        if (!window.projectModel) return;
        const total = window.projectModel.getTotalFrames();
        window.projectModel.setCurrentFrame(total > 0 ? total - 1 : 0);
    }

    setLoop(enabled) {
        this.loop = enabled;
    }

    setPlaybackRate(rate) {
        this.playbackRate = rate;
        window.dispatchEvent(new CustomEvent('playbackRateChanged', { detail: { rate: rate } }));
    }

    setLayerViewMode(mode) {
        this.layerViewMode = mode;
        // Dispatch event for WorkspaceView to update
        window.dispatchEvent(new CustomEvent('animationLayerViewChanged', {
            detail: { mode: mode }
        }));
    }

    getLayerViewMode() {
        return this.layerViewMode;
    }

    update() {
        if (!window.projectModel) return;

        // 1. Get Layers (Unified List)
        let layers = window.projectModel.getRenderList();

        // 2. Get Timeline Settings
        const totalFrames = window.projectModel.getTotalFrames();
        
        // Safe access for currentFrame
        let currentFrame = 0;
        if (window.projectModel.data && window.projectModel.data.timeline) {
            currentFrame = window.projectModel.data.timeline.currentFrame;
        }

        // --- Filter based on View Mode ---
        if (this.layerViewMode === 'visible') {
            layers = layers.filter(layer => {
                if (layer.visible === false) return false; // Respect explicit hidden state
                if (layer.startFrame !== undefined && layer.duration !== undefined) {
                    return currentFrame >= layer.startFrame && currentFrame < (layer.startFrame + layer.duration);
                }
                return true;
            });
        }

        // 3. Render
        const selectedLayerId = window.projectModel.selectedLayerId;
        this.view.render(layers, totalFrames, currentFrame, selectedLayerId);
    }

    // --- Actions ---

    handleSelectLayer(id) {
        window.projectModel.selectLayer(id);
    }

    handleScrub(frame) {
        // Update current frame
        if (window.projectModel) {
            window.projectModel.setCurrentFrame(frame);
        }
    }

    handleLayerResize(id, startFrame, duration) {
        if (window.projectModel) {
            window.projectModel.updateLayerFrameRange(id, startFrame, duration);
        }
    }

    // --- Playback Control ---

    togglePlay() {
        if (this.playing) {
            this.stop();
        } else {
            this.play();
        }
    }

    play() {
        if (this.playing) return;
        this.playing = true;
        this._tick();
    }

    stop() {
        this.playing = false;
        if (this.playTimer) {
            clearTimeout(this.playTimer);
            this.playTimer = null;
        }
    }

    _tick() {
        if (!this.playing || !window.projectModel) return;

        const totalFrames = window.projectModel.getTotalFrames();
        const currentFrame = window.projectModel.data.timeline.currentFrame || 0;
        
        let nextFrame = currentFrame + 1;
        if (nextFrame >= totalFrames) {
            if (this.loop) {
                nextFrame = 0;
            } else {
                this.stop();
                return;
            }
        }

        window.projectModel.setCurrentFrame(nextFrame);

        // Calculate delay based on FPS and playback rate
        const fps = window.projectModel.data.settings.fps || PROJECT_DEFAULTS.FPS;
        const baseDelay = 1000 / fps;
        const delay = baseDelay / this.playbackRate;

        this.playTimer = setTimeout(() => this._tick(), delay);
    }
}
