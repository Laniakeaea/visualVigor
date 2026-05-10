/* =========================================
   Project Model
   ========================================= */

import { PROJECT_DEFAULTS } from '../../Config/projectConfig.js';
import { BitmapManager } from './Model/BitmapManager.js';
import { VectorManager } from './Model/VectorManager.js';
import { GuideManager } from './Model/GuideManager.js';

export const LAYER_TYPES = {
    BITMAP: 'bitmap',
    VECTOR: 'vector',
    BACKGROUND: 'background'
};

export class ProjectModel {
    constructor() {
        // Project Management
        this.projects = new Map(); // id -> projectData
        this.activeProjectId = null;

        // Selection State
        this.selectedLayerId = null;

        // Default Project Structure (Empty)
        this.data = null;

        // Auto-naming counter
        this.untitledCounter = 1;

        // Sub-Managers
        this.bitmapManager = new BitmapManager(this);
        this.vectorManager = new VectorManager(this);
        this.guideManager = new GuideManager(this);
    }

    setDirty(dirty) {
        if (!this.data) return;
        if (this.data.isDirty !== dirty) {
            this.data.isDirty = dirty;
            window.dispatchEvent(new CustomEvent('projectDirtyStateChanged', { detail: { project: this.data, isDirty: dirty } }));
        }
    }

    /**
     * Create a new project with the given configuration
     * @param {Object} config - { name, width, height, fps, duration }
     * @returns {string} The ID of the created project
     */
    createProject(config) {
        const projectId = 'proj_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
        
        // Generate Name if empty
        let projectName = config.name;
        if (!projectName || projectName.trim() === '') {
            projectName = `Untitled-${this.untitledCounter++}`;
        }

        const newProject = {
            id: projectId,
            isDirty: false,
            meta: {
                version: "1.0.0",
                name: projectName,
                author: "User",
                created: Date.now()
            },
            settings: {
                fps: config.fps || PROJECT_DEFAULTS.FPS,
                duration: config.duration || PROJECT_DEFAULTS.DURATION,
                artboard: {
                    x: 0,
                    y: 0,
                    width: config.width || PROJECT_DEFAULTS.WIDTH,
                    height: config.height || PROJECT_DEFAULTS.HEIGHT,
                    backgroundColor: config.backgroundColor || PROJECT_DEFAULTS.BACKGROUND_COLOR
                },
                // Updated Guide Structure: Array of objects
                guides: [], 
                // Adjustments (Non-destructive View Filters)
                adjustments: {
                    brightness: 0,
                    contrast: 0,
                    exposure: 0,
                    temperature: 0,
                    // curves: null?
                },
                camera: {
                    scale: 1,
                    x: 0,
                    y: 0
                },
                color: {
                    h: 0, s: 1, l: 0.5, a: 1, mode: 'HEXA'
                }
            },
            assets: {},
            timeline: {
                currentFrame: 0,
                bitmapLayers: [],
                backgroundLayer: {
                    id: 'layer_bg',
                    type: LAYER_TYPES.BACKGROUND,
                    name: 'Background',
                    visible: true,
                    locked: false,
                    undeletable: true,
                    uncopyable: true,
                    blendingMode: 'normal',
                    frames: {}
                },
                vectorLayer: {
                    id: 'layer_vec_root',
                    type: LAYER_TYPES.VECTOR,
                    name: 'Vector Layer',
                    visible: true,
                    locked: false,
                    undeletable: true,
                    uncopyable: true,
                    children: []
                }
            }
        };

        // Initialize Background Layer Frame
        const bgCanvas = document.createElement('canvas');
        bgCanvas.width = newProject.settings.artboard.width;
        bgCanvas.height = newProject.settings.artboard.height;
        const ctx = bgCanvas.getContext('2d', { willReadFrequently: true });
        
        if (newProject.settings.artboard.backgroundColor && newProject.settings.artboard.backgroundColor !== 'transparent') {
            ctx.fillStyle = newProject.settings.artboard.backgroundColor;
            ctx.fillRect(0, 0, bgCanvas.width, bgCanvas.height);
        }
        
        newProject.timeline.backgroundLayer.frames[0] = bgCanvas;

        this.projects.set(projectId, newProject);
        
        // Notify creation
        window.dispatchEvent(new CustomEvent('projectCreated', { detail: newProject }));
        
        this.activateProject(projectId);

        // Auto-create initial bitmap layer
        // We do this after activation because addLayer depends on this.data to be set
        if (this.bitmapManager) {
            const initialLayer = this.bitmapManager.addLayer('Layer 1');
            if (initialLayer) {
                this.selectLayer(initialLayer.id);
            }
        }
        
        // Reset Dirty State (After initial layer creation)
        this.setDirty(false);
        
        return projectId;
    }

    /**
     * Activates a project by ID.
     * @param {string} id 
     */
    activateProject(id) {
        if (!this.projects.has(id)) return;
        
        this.activeProjectId = id;
        this.data = this.projects.get(id);
        this.selectedLayerId = null; // Reset selection

        // Notify listeners
        window.dispatchEvent(new CustomEvent('projectActivated', { detail: this.data }));
        this._dispatchLayersChanged();
        this._dispatchFrameChanged();
    }

    /**
     * Updates a generic setting in the project.
     */
    updateSetting(key, value, isPreview = false) {
        if (!this.data || !this.data.settings) return;
        this.data.settings[key] = value;
        
        if (key === 'color') {
            window.dispatchEvent(new CustomEvent('projectColorChanged', { detail: { value, isPreview } }));
        } else if (key === 'strokeWidth') {
            window.dispatchEvent(new CustomEvent('projectStrokeWidthChanged', { detail: { value, isPreview } }));
        }
    }

    /**
     * Closes a project by ID.
     */
    closeProject(id) {
        if (this.projects.has(id)) {
            this.projects.delete(id);
            window.dispatchEvent(new CustomEvent('projectClosed', { detail: id }));

            if (this.activeProjectId === id) {
                this.data = null;
                this.activeProjectId = null;
                this.selectedLayerId = null;
                
                // Notify that there is no active project
                window.dispatchEvent(new CustomEvent('projectActivated', { detail: null }));

                this._dispatchLayersChanged();
                this._dispatchFrameChanged();
                window.dispatchEvent(new CustomEvent('projectArtboardChanged', { detail: { width: 0, height: 0 } }));
                window.dispatchEvent(new CustomEvent('workspaceCameraChanged', { detail: { artboard: null } }));
            }
        }
    }

    // --- Layer Accessors ---

    getRenderList() {
        if (!this.data) return [];
        const layers = [];
        const vectorLayer = this.getVectorLayer();
        if (vectorLayer) layers.push(vectorLayer);
        const bitmapLayers = this.getBitmapLayers();
        if (bitmapLayers) {
            for (let i = bitmapLayers.length - 1; i >= 0; i--) {
                layers.push(bitmapLayers[i]);
            }
        }
        const bgLayer = this.getBackgroundLayer();
        if (bgLayer) layers.push(bgLayer);
        return layers;
    }

    getBitmapLayers() { return this.data ? this.data.timeline.bitmapLayers : []; }
    getBackgroundLayer() { return this.data ? this.data.timeline.backgroundLayer : null; }
    getVectorLayer() { return this.data ? this.data.timeline.vectorLayer : null; }

    getLayerById(id) {
        if (!this.data) return null;
        const bmpLayer = this.data.timeline.bitmapLayers.find(l => l.id === id);
        if (bmpLayer) return bmpLayer;
        if (this.data.timeline.vectorLayer.id === id) return this.data.timeline.vectorLayer;
        if (this.data.timeline.backgroundLayer.id === id) return this.data.timeline.backgroundLayer;
        return null;
    }

    getActiveCanvas() {
        if (!this.data || !this.selectedLayerId) return null;
        const layer = this.getLayerById(this.selectedLayerId);
        if (!layer) return null;
        if (layer.type !== LAYER_TYPES.BITMAP) return null;
        
        const currentFrame = this.data.timeline.currentFrame || 0;
        if (!layer.frames[currentFrame]) {
            const canvas = document.createElement('canvas');
            canvas.width = this.data.settings.artboard.width;
            canvas.height = this.data.settings.artboard.height;
            layer.frames[currentFrame] = canvas;
        }
        return layer.frames[currentFrame];
    }

    toggleLayerLock(id) {
        const layer = this.getLayerById(id);
        if (layer) {
            layer.locked = !layer.locked;
            this._dispatchLayersChanged();
        }
    }

    selectLayer(id) {
        if (this.selectedLayerId !== id) {
            this.selectedLayerId = id;
            window.dispatchEvent(new CustomEvent('projectLayerSelected', { detail: id }));
        }
    }

    toggleLayerVisibility(id) {
        const layer = this.getLayerById(id);
        if (layer) {
            layer.visible = !layer.visible;
            this._dispatchLayersChanged();
        }
    }

    updateLayerFrameRange(id, startFrame, duration) {
        const layer = this.getLayerById(id);
        if (layer) {
            const totalFrames = this.data ? this.data.settings.duration : 100;
            
            // Constrain Start
            let newStart = Math.max(0, startFrame);
            if (newStart >= totalFrames) newStart = totalFrames - 1; 
            if (newStart < 0) newStart = 0; // Handle totalFrames=0 case if possible

            // Constrain Duration
            let newDur = Math.max(1, duration);
            if (newStart + newDur > totalFrames) {
                newDur = totalFrames - newStart;
            }
            if (newDur < 1) newDur = 1; // Fallback

            layer.startFrame = newStart;
            layer.duration = newDur;
            this._dispatchLayersChanged();
        }
    }

    // --- Delegation to BitmapManager ---

    addBitmapLayer(name) { return this.bitmapManager.addLayer(name); }
    removeBitmapLayer(id) { this.bitmapManager.removeLayer(id); }
    moveBitmapLayer(id, direction) { this.bitmapManager.moveLayer(id, direction); }
    reorderBitmapLayer(id, newIndex) { this.bitmapManager.reorderLayer(id, newIndex); }
    duplicateBitmapLayer(id) { return this.bitmapManager.duplicateLayer(id); }

    // --- Delegation to VectorManager ---

    addVectorElement(type, properties) { return this.vectorManager.addElement(type, properties); }
    removeVectorElement(id) { this.vectorManager.removeElement(id); }
    groupVectorElements(ids) { return this.vectorManager.groupElements(ids); }
    ungroupVectorElements(ids) { return this.vectorManager.ungroupElements(ids); }
    restoreVectorElement(element) { this.vectorManager.restoreElement(element); }
    getVectorElementById(id) { return this.vectorManager.getElementById(id); }
    toggleElementExpand(id) { this.vectorManager.toggleExpand(id); }
    toggleElementVisibility(id) { this.vectorManager.toggleVisibility(id); }
    renameVectorElement(id, newName) { this.vectorManager.renameElement(id, newName); }
    getVectorElements() { return this.vectorManager.getElements(); }

    // --- Delegation to GuideManager ---

    addGuide(axis, pos) { this.guideManager.addGuide(axis, pos); }
    removeGuide(id) { this.guideManager.removeGuide(id); }
    
    removeGuideByPos(axis, pos) {
        // Wrapper for legacy access by axis/pos
        const guides = this.getGuides();
        const guide = guides.find(g => g.axis === axis && g.position === pos);
        if(guide) this.guideManager.removeGuide(guide.id);
    }
    updateGuide(id, pos) { this.guideManager.updateGuide(id, pos); }
    getGuides() { return this.guideManager.getGuides(); }


    // --- Core Logic ---

    _generateUniqueId(prefix) {
        return prefix + Date.now() + '_' + Math.floor(Math.random() * 1000);
    }

    _dispatchLayersChanged() {
        if (!this.data) {
            window.dispatchEvent(new CustomEvent('projectLayersChanged', { 
                detail: {
                    bitmapLayers: [],
                    vectorLayer: null,
                    backgroundLayer: null
                }
            }));
            return;
        }
        window.dispatchEvent(new CustomEvent('projectLayersChanged', { 
            detail: {
                bitmapLayers: this.data.timeline.bitmapLayers,
                vectorLayer: this.data.timeline.vectorLayer,
                backgroundLayer: this.data.timeline.backgroundLayer
            }
        }));
    }

    _dispatchFrameChanged() {
        if (!this.data) {
            window.dispatchEvent(new CustomEvent('projectFrameChanged', { detail: 0 }));
            return;
        }
        window.dispatchEvent(new CustomEvent('projectFrameChanged', { detail: this.data.timeline.currentFrame }));
    }

    // --- Artboard & Timing ---

    getArtboard() { return this.data ? this.data.settings.artboard : null; }
    getTotalFrames() { return this.data ? this.data.settings.duration : 0; }
    
    setDuration(duration) {
        if (!this.data) return;
        if (duration < 1) duration = 1;
        this.data.settings.duration = duration;
        window.dispatchEvent(new CustomEvent('projectDurationChanged', { detail: duration }));
    }

    getCurrentFrame() {
        if (!this.data || !this.data.timeline) return 0;
        return this.data.timeline.currentFrame;
    }

    setCurrentFrame(frame) {
        if (!this.data) return;
        if (frame < 0) frame = 0;
        
        const maxFrame = this.data.settings.duration > 0 ? this.data.settings.duration - 1 : 0;
        if (frame > maxFrame) frame = maxFrame;
        
        if (this.data.timeline.currentFrame !== frame) {
            this.data.timeline.currentFrame = frame;
            this._dispatchFrameChanged();
        }
    }

    resizeArtboard(rectOrWidth, height) {
        if (!this.data) return;

        let newX = 0, newY = 0;
        let newWidth, newHeight;

        if (typeof rectOrWidth === 'object') {
            newX = rectOrWidth.x;
            newY = rectOrWidth.y;
            newWidth = rectOrWidth.width !== undefined ? rectOrWidth.width : rectOrWidth.w;
            newHeight = rectOrWidth.height !== undefined ? rectOrWidth.height : rectOrWidth.h;
        } else {
            newWidth = rectOrWidth;
            newHeight = height;
        }

        this.data.settings.artboard.width = newWidth;
        this.data.settings.artboard.height = newHeight;

        const resizeCanvas = (oldCanvas, fillColor = null) => {
            const newCanvas = document.createElement('canvas');
            newCanvas.width = newWidth;
            newCanvas.height = newHeight;
            const ctx = newCanvas.getContext('2d');
            
            if (fillColor && fillColor !== 'transparent') {
                ctx.fillStyle = fillColor;
                ctx.fillRect(0, 0, newWidth, newHeight);
            }

            ctx.drawImage(oldCanvas, -newX, -newY);
            return newCanvas;
        };

        const bgLayer = this.data.timeline.backgroundLayer;
        const bgColor = this.data.settings.artboard.backgroundColor;
        if (bgLayer && bgLayer.frames) {
            for (const frameId in bgLayer.frames) {
                bgLayer.frames[frameId] = resizeCanvas(bgLayer.frames[frameId], bgColor);
            }
        }

        if (this.data.timeline.bitmapLayers) {
            this.data.timeline.bitmapLayers.forEach(layer => {
                if (layer.frames) {
                    for (const frameId in layer.frames) {
                        layer.frames[frameId] = resizeCanvas(layer.frames[frameId]);
                    }
                }
            });
        }

        // --- Vector Layer Translation ---
        if (this.data.timeline.vectorLayer && this.data.timeline.vectorLayer.children && 
            window.vectorSystem && window.vectorSystem.scope) {
            
            const scope = window.vectorSystem.scope;
            const translateVectorItem = (itemData) => {
                // 1. Simple Coordinates
                if (itemData.properties.x !== undefined) itemData.properties.x -= newX;
                if (itemData.properties.y !== undefined) itemData.properties.y -= newY;
                if (itemData.properties.cx !== undefined) itemData.properties.cx -= newX;
                if (itemData.properties.cy !== undefined) itemData.properties.cy -= newY;

                // 2. Path Data (d)
                if (itemData.properties.d) {
                    const path = new scope.Path(itemData.properties.d);
                    path.translate(new scope.Point(-newX, -newY));
                    itemData.properties.d = path.pathData;
                    path.remove();
                }

                // 3. Points (Polygon)
                if (itemData.properties.points) {
                    // "10,10 20,20"
                    const pts = itemData.properties.points.split(' ').map(p => {
                        const [px, py] = p.split(',').map(Number);
                        return `${px - newX},${py - newY}`;
                    });
                    itemData.properties.points = pts.join(' ');
                }

                // Recursion for Groups
                if (itemData.children) {
                    itemData.children.forEach(translateVectorItem);
                }
            };

            this.data.timeline.vectorLayer.children.forEach(translateVectorItem);
            
            // Force VectorSystem refresh if needed
            window.vectorSystem.importData(this.data.timeline.vectorLayer);
        }

        window.dispatchEvent(new CustomEvent('projectArtboardChanged', { detail: this.data.settings.artboard }));
        this._dispatchLayersChanged();
    }
}
