export class AnimationDOMBuilder {
    constructor(view, config) {
        this.view = view;
        this.config = config;
        this.elements = {}; // Stores refs: layerScroll, rulerScroll, layersContainer, rulerContent, etc.
    }

    build() {
        const container = document.createElement('div');
        container.className = 'canvas-window';
        
        const panel = document.createElement('div');
        panel.className = 'animation-panel';

        // 1. Layer Track Area
        const layerPanel = this._create('div', 'frame-layer-panel');
        const layerScroll = this._create('div', 'frame-layer-scroll', 'frameLayerScroll');
        const layersContainer = this._create('div', 'frame-layers', 'frameLayers');

        // Static Elements in Layers
        const pointerLine = this._create('div', 'frame-pointer-line');
        const maxMarkerLine = this._create('div', '', 'frameMaxMarkerLine');
        Object.assign(maxMarkerLine.style, { position:'absolute', top:'0', bottom:'0', width:'2px', background:'var(--color-red-100, #ff4d4f)', zIndex:'29', display: 'none' });

        layersContainer.appendChild(pointerLine);
        layersContainer.appendChild(maxMarkerLine);
        layerScroll.appendChild(layersContainer);
        layerPanel.appendChild(layerScroll);

        // 2. Ruler Area
        const rulerPanel = this._create('div', 'frame-ruler');
        const rulerScroll = this._create('div', 'frame-ruler-scroll', 'frameRulerScroll');
        const rulerContent = this._create('div', 'frame-ruler-content', 'frameRulerContent');

        // Static Elements in Ruler
        const pointerHandle = this._create('div', 'frame-pointer-handle');
        const maxMarkerHandle = this._create('div', '', 'frameMaxMarkerHandle');
        Object.assign(maxMarkerHandle.style, { position:'absolute', top:'0', bottom:'0', width:'2px', background:'var(--color-red-100, #ff4d4f)', zIndex:'2', display: 'none' });

        rulerContent.appendChild(pointerHandle);
        rulerContent.appendChild(maxMarkerHandle);
        rulerScroll.appendChild(rulerContent);
        rulerPanel.appendChild(rulerScroll);

        // Bind Scrubbing
        rulerContent.onmousedown = (e) => this.view.interactionHandler.handleScrubStart(e);

        // Assemble
        panel.appendChild(layerPanel);
        panel.appendChild(rulerPanel);
        container.appendChild(panel);

        // Save Refs
        this.elements = {
            container, panel,
            layerScroll, layersContainer, pointerLine, maxMarkerLine,
            rulerScroll, rulerContent, pointerHandle, maxMarkerHandle
        };

        // Attach refs to View for cross-module or legacy access if needed
        // (Ideally View shouldn't expose these, but Interactions need them)
        return container;
    }

    _create(tag, className, id) {
        const el = document.createElement(tag);
        if (className) el.className = className;
        if (id) el.id = id;
        return el;
    }
}
