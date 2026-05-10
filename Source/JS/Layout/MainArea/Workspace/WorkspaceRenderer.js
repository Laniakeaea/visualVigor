/* =========================================
   Workspace Renderer Module
   Handles Layer DOM Construction and Canvas Drawing
   ========================================= */

import { LAYER_TYPES } from '../../../CoreFunction/Project/projectModel.js';

export class WorkspaceRenderer {
    constructor(mainView) {
        this.mainView = mainView;
    }

    /**
     * Builds DOM structure for all viewports based on ProjectModel layers.
     */
    renderStructure(viewports) {
        if (!window.projectModel || !window.projectModel.data) {
            viewports.forEach(vp => vp.layerContainer.innerHTML = '');
            return;
        }
        
        // 1. Vector System Sync
        if (window.vectorSystem) {
            window.vectorSystem.clearViews();
            if (window.projectModel.data) {
                window.vectorSystem.importData(window.projectModel.data.timeline.vectorLayer);
            }
        }
        
        const layers = window.projectModel.getRenderList();
        const reversedLayers = [...layers].reverse();

        // 2. Build per Viewport
        viewports.forEach((vp, viewIndex) => {

            this._clearLayerGroups(vp.layerContainer);

            // Create Groups
            const bitmapGroup = this._createLayerGroup('bitmap', vp.layerContainer);
            const vectorGroup = this._createLayerGroup('vector', vp.layerContainer);

            reversedLayers.forEach(layer => {
                if (!layer.visible) return;
                
                if (layer.type === LAYER_TYPES.VECTOR) {
                    this._renderVectorLayer(layer, vectorGroup);
                } else {
                    this._renderBitmapLayer(layer, bitmapGroup);
                }
            });
            
            // Re-apply filters immediately
            this.mainView.setViewFilter(viewIndex, null, null); // Trigger apply
            this._addPreviews(vp.layerContainer, bitmapGroup);
        });

        // 3. Initial Paint
        this.mainView.updateFrameView();
    }
    
    _clearLayerGroups(container) {
        const groups = container.querySelectorAll('.workspace__layer-group--bitmap, .workspace__layer-group--vector, .tool-preview-layer-svg');
        groups.forEach(g => g.remove());
        // Also remove any tool preview canvas that might have been appended
        const prevCv = container.querySelector('.tool-preview-layer-canvas'); // wait, prev canvas is in bitmap group usually?
        // In original code: bitmapGroup.appendChild(previewCanvas).
        // previewSvg was appended to container.
    }

    _createLayerGroup(type, container) {
        const group = document.createElement('div');
        group.className = `workspace__layer-group--${type}`;
        Object.assign(group.style, {
            width: '100%', height: '100%', position: 'absolute', top: '0', left: '0', 
            pointerEvents: 'none',
            // specific composite hints can cause blurriness on zoom
            // transform: 'translate3d(0,0,0)', 
            // backfaceVisibility: 'hidden', 
            // willChange: 'transform, filter' 
            isolation: 'isolate' // Create stacking context without forcing rasterization
        });
        container.appendChild(group);
        return group;
    }

    _renderVectorLayer(layer, parent) {
        const artboard = window.projectModel.getArtboard();
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        if (artboard) svg.setAttribute('viewBox', `0 0 ${artboard.width} ${artboard.height}`);
        
        Object.assign(svg.style, {
            position: 'absolute', top: '0', left: '0', pointerEvents: 'none', overflow: 'visible'
        });
        svg.dataset.layerId = layer.id;

        if (layer.children) {
            layer.children.forEach(child => {
                if (!child.visible) return;
                const el = this._createSvgElement(child);
                if (el) svg.appendChild(el);
            });
        }
        parent.appendChild(svg);
    }

    _renderBitmapLayer(layer, parent) {
        const viewCanvas = document.createElement('canvas');
        const currentFrame = window.projectModel.data.timeline.currentFrame || 0;
        const frameCanvas = layer.frames[currentFrame] || layer.frames[0];
        
        if (frameCanvas) {
            viewCanvas.width = frameCanvas.width;
            viewCanvas.height = frameCanvas.height;
        }
        
        Object.assign(viewCanvas.style, { position: 'absolute', top: '0', left: '0' });
        viewCanvas.dataset.layerId = layer.id;
        parent.appendChild(viewCanvas);
    }

    _addPreviews(container, bitmapGroup) {
        // Canvas Preview
        const previewCanvas = document.createElement('canvas');
        previewCanvas.className = 'tool-preview-layer-canvas';
        Object.assign(previewCanvas.style, { position: 'absolute', top: '0', left: '0', pointerEvents: 'none' });
        
        const artboard = window.projectModel.getArtboard();
        if (artboard) {
            previewCanvas.width = artboard.width;
            previewCanvas.height = artboard.height;
        }
        bitmapGroup.appendChild(previewCanvas);
        
        // SVG Preview
        const previewSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        previewSvg.setAttribute('class', 'tool-preview-layer-svg');
        Object.assign(previewSvg.style, {
            position: 'absolute', top: '0', left: '0', width: '100%', height: '100%', 
            overflow: 'visible', pointerEvents: 'none'
        });
        if (artboard) previewSvg.setAttribute('viewBox', `0 0 ${artboard.width} ${artboard.height}`);
        container.appendChild(previewSvg);
        
        container.previewLayerSvg = previewSvg;
        container.previewLayerCanvas = previewCanvas;
    }

    /**
     * Draws the frame per viewport.
     */
    renderFrame(viewports, filterMaps) {
        if (!window.projectModel) return;
        const currentFrame = window.projectModel.getCurrentFrame();

        viewports.forEach((vp, index) => {
            const container = vp.layerContainer;
            const bitmapGroup = container.querySelector('.workspace__layer-group--bitmap');
            const vectorGroup = container.querySelector('.workspace__layer-group--vector');
            if (!bitmapGroup) return;

            // Generate CSS Filter String
            const filters = filterMaps[index];
            const filterString = filters && filters.size > 0 
                ? Array.from(filters.entries()).map(([k, v]) => `${k}(${v})`).join(' ') 
                : 'none';

            // Update Bitmaps
            const canvases = Array.from(bitmapGroup.querySelectorAll('canvas[data-layer-id]'));
            canvases.forEach(canvas => {
                const layer = window.projectModel.getLayerById(canvas.dataset.layerId);
                if (!layer) return;

                // Time checks
                let isVisible = true;
                if (layer.startFrame !== undefined && layer.duration !== undefined) {
                    if (currentFrame < layer.startFrame || currentFrame >= layer.startFrame + layer.duration) {
                        isVisible = false;
                    }
                }
                
                if (!isVisible) {
                    canvas.style.display = 'none';
                    return;
                }
                canvas.style.display = 'block';

                // Content
                let source = layer.frames[currentFrame] || (layer.type === LAYER_TYPES.BACKGROUND ? layer.frames[0] : null);
                
                const ctx = canvas.getContext('2d');
                if (source) {
                    if (canvas.width !== source.width || canvas.height !== source.height) {
                        canvas.width = source.width;
                        canvas.height = source.height;
                    }
                    
                    ctx.filter = filterString;
                    ctx.globalCompositeOperation = 'copy';
                    ctx.drawImage(source, 0, 0);
                    ctx.globalCompositeOperation = 'source-over';
                    ctx.filter = 'none';
                } else {
                    ctx.clearRect(0, 0, canvas.width, canvas.height); 
                }
            });

            // Update Vectors (Visibility)
            if (vectorGroup) {
                const vectors = Array.from(vectorGroup.children).filter(el => el.dataset.layerId);
                vectors.forEach(svg => {
                    const layer = window.projectModel.getLayerById(svg.dataset.layerId);
                    if (!layer) return;
                    let isVisible = true;
                    if (layer.startFrame !== undefined && layer.duration !== undefined) {
                        if (currentFrame < layer.startFrame || currentFrame >= layer.startFrame + layer.duration) {
                            isVisible = false;
                        }
                    }
                    svg.style.display = isVisible ? 'block' : 'none';
                });
            }
        });
    }

    _createSvgElement(data) {
        let el;
        const ns = "http://www.w3.org/2000/svg";
        const props = data.properties;

        if (data.type === 'path') {
            el = document.createElementNS(ns, "path");
            if (props.d) el.setAttribute('d', props.d);
        } else if (data.type === 'rect') {
            el = document.createElementNS(ns, "rect");
            ['x','y','width','height'].forEach(k => { if(props[k]) el.setAttribute(k, props[k]); });
        } else if (data.type === 'circle') {
            el = document.createElementNS(ns, "circle");
            ['cx','cy','r'].forEach(k => { if(props[k]) el.setAttribute(k, props[k]); });
        } else if (data.type === 'ellipse') {
            el = document.createElementNS(ns, "ellipse");
            ['cx','cy','rx','ry'].forEach(k => { if(props[k]) el.setAttribute(k, props[k]); });
        } else if (data.type === 'polygon') {
            el = document.createElementNS(ns, "polygon");
            if (props.points) el.setAttribute('points', props.points);
        } else if (data.type === 'text') {
            el = document.createElementNS(ns, "text");
            if (props.x) el.setAttribute('x', props.x);
            if (props.y) el.setAttribute('y', props.y);
            if (props.text) el.textContent = props.text;
            el.setAttribute('font-size', props.fontSize || 24);
            el.setAttribute('font-family', props.fontFamily || 'Ubuntu');
        } else if (data.type === 'group' && data.children) {
            el = document.createElementNS(ns, "g");
            data.children.forEach(child => {
                if (!child.visible) return;
                const childEl = this._createSvgElement(child);
                if (childEl) el.appendChild(childEl);
            });
        }
        
        if (el && props) {
            if (props.stroke) el.setAttribute('stroke', props.stroke);
            if (props.strokeWidth) el.setAttribute('stroke-width', props.strokeWidth);
            if (props.fill) el.setAttribute('fill', props.fill);
            if (props.strokeLinecap) el.setAttribute('stroke-linecap', props.strokeLinecap);
            if (props.strokeLinejoin) el.setAttribute('stroke-linejoin', props.strokeLinejoin);
            el.setAttribute('id', data.id);
            el.style.pointerEvents = 'visiblePainted';
        }
        return el;
    }
}
