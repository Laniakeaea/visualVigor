/* =========================================
   Workspace Viewport Module
   Encapsulates UI, State, and Controllers for a single view.
   ========================================= */

import { CameraController } from '../../../CoreFunction/Camera/CameraController.js';
import { RulerController } from './RulerController.js';
import { ViewportOverlayController } from './ViewportOverlayController.js';

export class WorkspaceViewport {
    constructor(parentContainer, index, mainView) {
        this.index = index;
        this.mainView = mainView;
        
        // 1. Create Wrapper
        this.splitView = document.createElement('div');
        this.splitView.className = 'workspace__split-view';
        parentContainer.appendChild(this.splitView);
        
        // 2. Build Internal DOM
        this.viewElement = this._buildDOM();
        this.splitView.appendChild(this.viewElement);

        // 3. Initialize Controllers
        this._initControllers();
    }

    _buildDOM() {
        const view = document.createElement('div');
        view.className = 'workspace__view';
        this.container = view; // Reference for compatibility

        // Header
        const header = document.createElement('div');
        header.className = 'workspace__header';
        
        // Fit Button
        this.fitBtn = document.createElement('button');
        this.fitBtn.className = 'workspace__fit-btn';
        this.fitBtn.setAttribute('data-i18n-title', 'Layout.MainArea.Workspace.FitToScreen');
        if (window.languageManager) window.languageManager.updateElement(this.fitBtn);
        
        const hRuler = document.createElement('div');
        hRuler.className = 'workspace__ruler--horizontal';
        this.hRulerElement = hRuler;

        header.appendChild(this.fitBtn);
        header.appendChild(hRuler);

        // Body
        const body = document.createElement('div');
        body.className = 'workspace__body';
        
        const vRuler = document.createElement('div');
        vRuler.className = 'workspace__ruler--vertical';
        this.vRulerElement = vRuler;

        // Canvas Container (Viewport Wrapper)
        const canvasContainer = document.createElement('div');
        canvasContainer.className = 'workspace__viewport pattern-checkerboard';
        this.viewportElement = canvasContainer; // Wrapper for Event/Camera

        // Placeholder for legacy 'display' check or bg color
        // This is also the container for the Layers (Movable Content)
        this.canvasPlaceholder = document.createElement('div');
        this.canvasPlaceholder.className = 'workspace__canvas';
        this.canvasPlaceholder.style.display = 'none'; // Starts hidden
        
        this.layerContainer = this.canvasPlaceholder; // Interface for Renderer

        canvasContainer.appendChild(this.canvasPlaceholder);

        // Indicator Layer
        this.indicatorLayer = document.createElement('canvas');
        this.indicatorLayer.className = 'tool-indicator-layer';
        Object.assign(this.indicatorLayer.style, {
            position: 'absolute', top: '0', left: '0', width: '100%', height: '100%', 
            pointerEvents: 'none', zIndex: '1000'
        });
        canvasContainer.appendChild(this.indicatorLayer);

        body.appendChild(vRuler);
        body.appendChild(canvasContainer);

        view.appendChild(header);
        view.appendChild(body);
        
        return view;
    }

    _initControllers() {
        // Helper to bind this context
        const layout = {
            container: this.viewportElement, // The viewport div
            canvas: this.canvasPlaceholder, // The sized element
            hRuler: this.hRulerElement,
            vRuler: this.vRulerElement
        };

        // 1. Ruler
        this.ruler = new RulerController(layout.hRuler, layout.vRuler);

        // 2. Overlay
        this.overlay = new ViewportOverlayController(layout.container);
        this.ruler.setOverlayController(this.overlay);

        // 3. Camera
        this.camera = new CameraController(layout.container, layout.canvas, {
            minScale: 0.05,
            maxScale: 128,
            onTransformChange: (transform, controller) => this._onCameraChange(transform, controller)
        });

        // 4. Fit Button
        this.fitBtn.addEventListener('click', () => {
            if (window.commandManager) window.commandManager.execute('viewFitToScreen', this.camera);
        });
        
        // Expose camera on DOM
        layout.container.cameraController = this.camera;

        // Initial Artboard Setup
        if (window.projectModel) {
            const artboard = window.projectModel.getArtboard();
            if (artboard) this.setArtboardSize(artboard.width, artboard.height);
        }
    }

    _onCameraChange(transform, controller) {
        // Sync Local Controllers
        this.ruler.update(transform.scale, transform.x, transform.y);
        this.overlay.update(transform.scale, transform.x, transform.y);
        
        // Notify Main View (for coupling)
        this.mainView.handleViewCoupling(controller, transform);

        // Dispatch Global Event
        if (window.projectModel) {
            window.projectModel.updateSetting('camera', transform);
            // Use this.viewportElement (the static container) for viewport size, NOT layerContainer (which scales)
            const viewportRect = this.viewportElement.getBoundingClientRect();
            
            // Avoid dispatching if viewport is hidden/collapsed
            if (viewportRect.width === 0 || viewportRect.height === 0) return;

            window.dispatchEvent(new CustomEvent('workspaceCameraChanged', {
                detail: {
                    viewIndex: this.index, // Identify which view
                    transform: transform,
                    viewport: { width: viewportRect.width, height: viewportRect.height },
                    artboard: window.projectModel.getArtboard(),
                    totalFrames: window.projectModel.getTotalFrames()
                }
            }));
        }
    }

    setArtboardSize(width, height) {
        if (this.canvasPlaceholder) {
            this.canvasPlaceholder.style.width = `${width}px`;
            this.canvasPlaceholder.style.height = `${height}px`;
            this.canvasPlaceholder.style.backgroundColor = 'transparent';
            this.canvasPlaceholder.style.display = 'block';
        }
        if (this.overlay) {
            this.overlay.setArtboard(width, height);
            // Force re-sync of overlay graphics
            this.overlay.update(this.camera.scale, this.camera.position.x, this.camera.position.y);
        }
        // Force Camera update to integrity checks
        if (this.camera) this.camera.updateTransform();
    }

    updateAssistant(type, isActive) {
        if (type === 'grid' && this.overlay) this.overlay.setGridEnabled(isActive);
        if (type === 'indicator' && this.ruler) this.ruler.setIndicatorVisible(isActive);
        if (type === 'mousePos' && this.overlay) this.overlay.setMousePosEnabled(isActive);
    }
}
