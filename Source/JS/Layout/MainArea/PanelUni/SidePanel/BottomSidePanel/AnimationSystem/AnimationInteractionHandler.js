export class AnimationInteractionHandler {
    constructor(view, config, converter) {
        this.view = view;
        this.config = config;
        this.converter = converter;
    }

    zoomAtCursor(deltaY, clientX, scrollerEl) {
        const scroller = scrollerEl || this.view.domBuilder.elements.layerScroll;
        const rect = scroller.getBoundingClientRect();
        const contentX0 = (clientX - rect.left) + scroller.scrollLeft;
        const frameAtCursor = this.converter.pxToFrame(contentX0);

        // Update Config
        this.config.updateZoom(deltaY);

        // Render Updates
        const total = this.view.lastTotalFrames;
        this.view.renderer.updateGridStyles();
        this.view.renderer.ensureTimelineWidth(total);
        this.view.renderer.renderRulerTicks(total);
        this.view.renderer.updatePlayhead(this.view.lastCurrentFrame);
        this.view.renderer.updateMaxFrameMarker(total);
        this.view.renderer.updateLayerMasks(total);

        // Restore Scroll
        const contentXAfter = this.converter.frameToPx(frameAtCursor);
        let newScroll = contentXAfter - (clientX - rect.left);
        const maxScroll = scroller.scrollWidth - scroller.clientWidth;
        scroller.scrollLeft = Math.max(0, Math.min(maxScroll, newScroll));
    }

    handleResizeStart(e, layer, handleType) {
        const startX = e.clientX;
        const initStart = layer.startFrame || 0;
        const initDur = layer.duration !== undefined ? layer.duration : this.view.lastTotalFrames;
        const pxPerFrame = this.converter.getPxPerFrame();

        const mask = e.target.parentElement;
        const tooltip = mask.querySelector(`.frame-layer-mask__tooltip.is-${handleType}`);
        if(tooltip) tooltip.classList.add('is-visible');

        let currStart = initStart;
        let currDur = initDur;

        const onMove = (ev) => {
            const deltaFrames = Math.round((ev.clientX - startX) / pxPerFrame);
            
            if (handleType === 'left') {
                currStart = initStart + deltaFrames;
                currDur = initDur - deltaFrames;
                if (currStart < 0) { currStart = 0; currDur = initStart + initDur; }
                if (currDur < 1) { currDur = 1; currStart = initStart + initDur - 1; }
                if(tooltip) tooltip.textContent = currStart;
            } else {
                currDur = initDur + deltaFrames;
                if (currDur < 1) currDur = 1;
                
                // Constrain against Max Frames
                const maxFrames = this.view.lastTotalFrames;
                if (currStart + currDur > maxFrames) {
                    currDur = maxFrames - currStart;
                }

                if(tooltip) tooltip.textContent = Math.max(0, currStart + currDur - 1);
            }

            // Visual Update locally
            const sPx = this.converter.frameToPx(currStart);
            const ePx = this.converter.frameToPx(currStart + currDur);
            mask.style.setProperty('--mask-left', `${sPx}px`);
            mask.style.setProperty('--mask-width', `${ePx - sPx}px`);
        };

        const onUp = () => {
            if(tooltip) tooltip.classList.remove('is-visible');
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            
            if(currStart !== initStart || currDur !== initDur) {
                this.view.handleLayerResize(layer.id, currStart, currDur);
            }
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    }

    handleScrubStart(e) {
        const el = this.view.domBuilder.elements.rulerContent;
        const rect = el.getBoundingClientRect();
        
        const getFrame = (cx) => Math.round(this.converter.pxToFrame(cx - rect.left));
        
        this.view.handleScrub(getFrame(e.clientX));

        const onMove = (ev) => {
            // Re-calc rect in case of weird scroll jumps? Usually not needed but safe
            const moveRect = el.getBoundingClientRect(); 
            this.view.handleScrub(Math.round(this.converter.pxToFrame(ev.clientX - moveRect.left)));
        };
        const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    }
}
