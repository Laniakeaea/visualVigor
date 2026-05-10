/* =========================================
   Animation View
   ========================================= */

import { PROJECT_DEFAULTS } from '../../../../../Config/projectConfig.js';
import { AnimationConfig } from './AnimationSystem/AnimationConfig.js';
import { FrameConverter } from './AnimationSystem/FrameConverter.js';
import { AnimationDOMBuilder } from './AnimationSystem/AnimationDOMBuilder.js';
import { AnimationRenderer } from './AnimationSystem/AnimationRenderer.js';
import { AnimationInteractionHandler } from './AnimationSystem/AnimationInteractionHandler.js';

export class AnimationView {
    constructor(controller) {
        this.controller = controller;
        this.config = new AnimationConfig();
        
        // Components
        this.frameConverter = new FrameConverter(this.config);
        this.domBuilder = new AnimationDOMBuilder(this, this.config);
        this.renderer = new AnimationRenderer(this, this.config, this.frameConverter);
        this.interactionHandler = new AnimationInteractionHandler(this, this.config, this.frameConverter);

        // State
        this.lastTotalFrames = PROJECT_DEFAULTS.DURATION;
        this.lastCurrentFrame = 0;
        this.selectedLayerId = null;

        // Init
        this.container = this.domBuilder.build();
        this._bindGlobalEvents();
    }

    getContainer() {
        return this.container;
    }

    refresh() {
        if (this.controller) this.controller.update();
    }

    _bindGlobalEvents() {
        // Sync Scrolling
        const { layerScroll, rulerScroll } = this.domBuilder.elements;
        layerScroll.addEventListener('scroll', () => { rulerScroll.scrollLeft = layerScroll.scrollLeft; });
        rulerScroll.addEventListener('scroll', () => { layerScroll.scrollLeft = rulerScroll.scrollLeft; });

        // Listen for frame changes
        window.addEventListener('projectFrameChanged', (e) => {
            if (this.lastTotalFrames !== e.detail.totalFrames) {
                 this.refresh();
            } else {
                 this.renderer.updatePlayhead(e.detail.currentFrame);
            }
        });

        // Listen for view mode changes (filter rows)
        window.addEventListener('animationLayerViewChanged', () => {
             this.refresh();
        });
        
        // Listen for manual resize requests from controller if any
        window.addEventListener('animationRefreshRequested', () => {
            this.refresh();
        });
    }

    /* Proxy Methods for Renderer/Interactions */
    
    render(layers, totalFrames, currentFrame, selectedLayerId) {
        this.lastTotalFrames = totalFrames;
        this.lastCurrentFrame = currentFrame;
        this.selectedLayerId = selectedLayerId;
        this.renderer.render(layers, totalFrames, currentFrame, selectedLayerId);
    }
    
    updateGridStyles() { this.renderer.updateGridStyles(); } // Exposed for Zoom
    updateLayerMasks(totalFrames) { this.renderer.updateLayerMasks(totalFrames); }
    ensureTimelineWidth(totalFrames) { this.renderer.ensureTimelineWidth(totalFrames); }

    // Exposed for Interaction Handler
    handleScrub(frame) { if(this.controller) this.controller.handleScrub(frame); }
    handleLayerSelect(id) { if(this.controller) this.controller.handleSelectLayer(id); }
    handleLayerResize(id, start, dur) { if(this.controller) this.controller.handleLayerResize(id, start, dur); }
}
