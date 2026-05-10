import { LAYER_TYPES } from '../../../../../../CoreFunction/Project/projectModel.js';

export class AnimationRenderer {
    constructor(view, config, converter) {
        this.view = view;
        this.config = config;
        this.converter = converter;
    }

    get el() { return this.view.domBuilder.elements; } // Access DOM refs

    render(layers, totalFrames, currentFrame, selectedLayerId) {
        this.updateGridStyles();
        this.ensureTimelineWidth(totalFrames);

        this._renderLayers(layers, totalFrames, selectedLayerId);
        this.renderRulerTicks(totalFrames);
        
        this.updatePlayhead(currentFrame);
        this.updateMaxFrameMarker(totalFrames);
    }

    updateGridStyles() {
        const major = `${this.config.frameMajorPx}px`;
        const minor = `${this.config.frameMinorPx}px`;
        const offset = `${(this.config.frameMajorPx / this.config.framesPerMajor) * this.config.frameOriginOffsetFrames}px`;

        [this.el.layersContainer, this.el.rulerContent].forEach(el => {
            if(el) {
                el.style.setProperty('--frame-major-px', major);
                el.style.setProperty('--frame-minor-px', minor);
                el.style.setProperty('--frame-offset-px', offset);
                el.style.backgroundPositionX = offset;
            }
        });
    }

    ensureTimelineWidth(totalFrames) {
        if (!this.el.layersContainer) return;
        const framePxUnit = this.converter.getPxPerFrame();
        const offsetExtra = this.config.frameOriginOffsetFrames * framePxUnit;
        const needed = totalFrames > 0 ? (offsetExtra + totalFrames * framePxUnit + this.config.frameMajorPx * 2) : offsetExtra;
        
        const containerW = this.el.layerScroll ? this.el.layerScroll.clientWidth : 0;
        const targetW = Math.max(containerW * 1.2, this.config.frameMajorPx * 20, needed);
        
        const widthStr = Math.ceil(targetW) + 'px';
        this.el.layersContainer.style.width = widthStr;
        this.el.rulerContent.style.width = widthStr;
    }

    _renderLayers(layers, totalFrames, selectedId) {
        // Clear items
        this.el.layersContainer.querySelectorAll('.frame-layer-item').forEach(el => el.remove());
        
        if (!layers) return;
        layers.forEach(layer => {
            const item = this._createLayerItem(layer, totalFrames, selectedId);
            this.el.layersContainer.appendChild(item);
        });
    }

    _createLayerItem(layer, totalFrames, selectedId) {
        const item = document.createElement('div');
        item.className = 'frame-layer-item';
        
        if (selectedId === layer.id) item.classList.add('is-selected');
        if (layer.locked) item.classList.add('is-locked');
        if (!layer.visible) item.classList.add('is-hidden');
        
        const name = document.createElement('span');
        name.className = 'frame-layer-name';
        name.textContent = layer.name;
        item.appendChild(name);

        const mask = this._createLayerMask(layer, totalFrames);
        item.appendChild(mask);

        item.onclick = () => this.view.handleLayerSelect(layer.id);
        item.__layerData = layer;
        return item;
    }

    _createLayerMask(layer, totalFrames) {
        const mask = document.createElement('div');
        mask.className = 'frame-layer-mask';
        
        const isFixed = layer.type === LAYER_TYPES.BACKGROUND || layer.type === LAYER_TYPES.VECTOR;
        let start = layer.startFrame || 0;
        let dur = layer.duration !== undefined ? layer.duration : totalFrames;
        
        if (isFixed) { start = 0; dur = totalFrames; }

        this._updateMaskStyle(mask, start, dur);

        if (!isFixed) {
            const leftH = document.createElement('div'); leftH.className = 'frame-layer-mask__handle is-left';
            const leftT = document.createElement('div'); leftT.className = 'frame-layer-mask__tooltip is-left'; leftT.textContent = start;
            
            const rightH = document.createElement('div'); rightH.className = 'frame-layer-mask__handle is-right';
            const rightT = document.createElement('div'); rightT.className = 'frame-layer-mask__tooltip is-right'; rightT.textContent = Math.max(0, start + dur - 1);

            // Bind Resize (Delegate to InteractionHandler)
            leftH.onmousedown = (e) => { e.stopPropagation(); this.view.interactionHandler.handleResizeStart(e, layer, 'left'); };
            rightH.onmousedown = (e) => { e.stopPropagation(); this.view.interactionHandler.handleResizeStart(e, layer, 'right'); };

            mask.append(leftH, leftT, rightH, rightT);
        }
        return mask;
    }

    _updateMaskStyle(mask, start, duration) {
        const startPx = this.converter.frameToPx(start);
        const endPx = this.converter.frameToPx(start + duration);
        mask.style.setProperty('--mask-left', `${startPx}px`);
        mask.style.setProperty('--mask-width', `${endPx - startPx}px`);
    }

    renderRulerTicks(totalFrames) {
        const content = this.el.rulerContent;
        if (!content) return;
        content.querySelectorAll('.tick-label').forEach(n => n.remove());
        
        const rulerWidth = Math.max(content.clientWidth, content.scrollWidth);
        
        for (let frame = 0; ; frame += this.config.framesPerMajor) {
            const x = this.converter.frameToPx(frame);
            if (x > rulerWidth + this.config.frameMajorPx) break;
            
            const label = document.createElement('div');
            label.className = 'tick-label';
            label.style.left = `${x - 4}px`;
            label.textContent = frame;
            content.appendChild(label);
        }
    }

    updatePlayhead(frame) {
        const pos = `${this.converter.frameToPx(frame)}px`;
        if (this.el.pointerLine) this.el.pointerLine.style.left = pos;
        if (this.el.pointerHandle) {
            this.el.pointerHandle.style.left = pos;
            this.el.pointerHandle.textContent = frame;
        }
    }

    updateMaxFrameMarker(total) {
        const elL = this.el.maxMarkerLine;
        const elH = this.el.maxMarkerHandle;
        if (!elL || !elH) return;
        
        // Marker should be at the last valid frame index (total - 1)
        const frameIndex = total > 0 ? total - 1 : 0;
        const x = this.converter.frameToPx(frameIndex);
        const display = total > 0 ? 'block' : 'none';
        
        elL.style.left = `${x}px`; elL.style.display = display;
        elH.style.left = `${x}px`; elH.style.display = display;
    }

    updateLayerMasks(totalFrames) {
        const items = this.el.layersContainer.querySelectorAll('.frame-layer-item');
        items.forEach(item => {
            const mask = item.querySelector('.frame-layer-mask');
            const layer = item.__layerData;
            if (mask && layer) {
                const isFixed = layer.type === LAYER_TYPES.BACKGROUND || layer.type === LAYER_TYPES.VECTOR;
                let start = layer.startFrame || 0;
                let dur = layer.duration !== undefined ? layer.duration : totalFrames;
                if(isFixed) { start=0; dur=totalFrames; }

                this._updateMaskStyle(mask, start, dur);

                if(!isFixed) {
                    const lT = mask.querySelector('.tooltip.is-left');
                    const rT = mask.querySelector('.tooltip.is-right');
                    if(lT) lT.textContent = start;
                    if(rT) rT.textContent = start + dur;
                }
            }
        });
    }
}
