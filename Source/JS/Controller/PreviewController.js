/* =========================================
   Preview Controller
   ========================================= */

import { LAYER_TYPES } from '../CoreFunction/Project/projectModel.js';

export class PreviewController {
    /**
     * Creates a preview component.
     * @param {string} [metaText=''] - Initial meta text.
     * @returns {HTMLElement} The preview container.
     */
    static create(metaText = '0 x 0') {
        const container = document.createElement('div');
        container.className = 'preview';

        const canvas = document.createElement('canvas');
        canvas.className = 'preview__canvas pattern-checkerboard';
        
        // Set resolution for drawing (High DPI Support)
        // Use a higher base resolution (e.g. 600) to prevent blur when sidebar is resized
        const baseSize = 600;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = baseSize * dpr;
        canvas.height = baseSize * dpr;
        
        // Ensure CSS keeps it at the desired display size (handled by CSS width: 100%)
        const meta = document.createElement('div');
        meta.className = 'preview__meta';
        meta.textContent = metaText;

        container.appendChild(canvas);
        container.appendChild(meta);

        // Initial Render (Empty State)
        // this.render(canvas, { width: 1920, height: 1080, backgroundColor: 'transparent' }, { x: 0, y: 0, w: 1920, h: 1080 });
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // State for re-rendering
        const viewStates = new Map();
        let currentArtboard = null;
        let currentTotalFrames = 0;

        const renderCurrentState = () => {
            if (currentArtboard) {
                // Pass map of cameras
                const cameras = [];
                viewStates.forEach((state, index) => {
                    cameras.push({ ...state.camera, index });
                });
                
                this.render(canvas, currentArtboard, cameras);
                meta.textContent = `${currentArtboard.width} x ${currentArtboard.height} | ${currentTotalFrames} Frames`;
            }
        };

        // Event Listener for Camera Updates
        const updateHandler = (e) => {
            // Self-cleanup if view is removed
            if (!document.body.contains(canvas)) {
                window.removeEventListener('workspaceCameraChanged', updateHandler);
                window.removeEventListener('projectLayersChanged', renderCurrentState);
                window.removeEventListener('projectFrameChanged', renderCurrentState);
                window.removeEventListener('layoutStateChanged', layoutHandler);
                return;
            }
            
            const { viewIndex = 0, transform, viewport, artboard, totalFrames } = e.detail;
            
            // If no artboard (project closed), clear canvas
            if (!artboard) {
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                meta.textContent = '';
                viewStates.clear();
                currentArtboard = null;
                return;
            }
            
            currentArtboard = artboard;
            currentTotalFrames = totalFrames;

            // Ensure transform exists before accessing properties
            if (!transform || !viewport) return;

            // Calculate Camera Rect in World Space
            const camX = -transform.x / transform.scale;
            const camY = -transform.y / transform.scale;
            const camW = viewport.width / transform.scale;
            const camH = viewport.height / transform.scale;

            viewStates.set(viewIndex, {
                camera: { x: camX, y: camY, w: camW, h: camH }
            });

            renderCurrentState();
        };

        const layoutHandler = (e) => {
            if (e.detail && e.detail.dualView === false) {
                viewStates.delete(1); // Remove secondary view
                renderCurrentState();
            }
        };

        window.addEventListener('workspaceCameraChanged', updateHandler);
        window.addEventListener('projectLayersChanged', renderCurrentState);
        window.addEventListener('projectCanvasUpdated', renderCurrentState);
        window.addEventListener('projectFrameChanged', renderCurrentState);
        window.addEventListener('layoutStateChanged', layoutHandler);

        return container;
    }

    /**
     * Renders the preview content.
     * @param {HTMLCanvasElement} canvas 
     * @param {Object} artboard - { width, height, backgroundColor }
     * @param {Array} cameras - Array of {x, y, w, h, index}
     */
    static render(canvas, artboard, cameras = []) {
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;
        const worldW = artboard.width;
        const worldH = artboard.height;

        // Disable smoothing for pixelated preview
        ctx.imageSmoothingEnabled = false;

        ctx.clearRect(0, 0, w, h);

        // Calculate scale to fit world in preview
        // Use 95% of the canvas to leave room for border
        const scale = Math.min(w / worldW, h / worldH) * 0.95; 
        const drawW = worldW * scale;
        const drawH = worldH * scale;
        
        // Center the world in the preview
        const offsetX = (w - drawW) / 2;
        const offsetY = (h - drawH) / 2;

        // 1. Draw Canvas Bounds (The "Paper")
        // Explicitly do NOT draw background color here.
        // The background is now fully managed by the 'layer_bg' layer.
        
        // 2. Draw Layers
        if (window.projectModel) {
            const layers = window.projectModel.getRenderList();
            // Render bottom to top
            [...layers].reverse().forEach(layer => {
                if (!layer.visible) return;
                
                // Handle Vector Layers (Placeholder)
                if (layer.type === LAYER_TYPES.VECTOR) {
                    // TODO: Render vector preview
                    return;
                }

                const currentFrame = window.projectModel.data.timeline.currentFrame || 0;
                // Check if frames array exists and has the current frame
                let layerCanvas = layer.frames && layer.frames[currentFrame];

                // Fallback for Background
                if (!layerCanvas && layer.type === LAYER_TYPES.BACKGROUND && layer.frames) {
                    layerCanvas = layer.frames[0];
                }

                if (layerCanvas) {
                    ctx.drawImage(layerCanvas, offsetX, offsetY, drawW, drawH);
                }
            });
        }
        
        // Border for canvas
        // Use theme color for border
        const borderColor = getComputedStyle(document.body).getPropertyValue('--color-gray-50').trim();
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(offsetX, offsetY, drawW, drawH);

        // 2. Draw Camera Frames (The Viewports)
        const accentColor = getComputedStyle(document.body).getPropertyValue('--color-accent-100').trim();
        const subColor = getComputedStyle(document.body).getPropertyValue('--color-blue-100').trim() || '#00f';

        cameras.forEach(cam => {
            // Camera coordinates are relative to World (0,0)
            const camX = offsetX + cam.x * scale;
            const camY = offsetY + cam.y * scale;
            const camW = cam.w * scale;
            const camH = cam.h * scale;

            ctx.strokeStyle = (cam.index === 0) ? accentColor : subColor;
            ctx.lineWidth = 2;
            
            // Dashed line for secondary view?
            if (cam.index !== 0) {
                ctx.setLineDash([5, 5]);
            } else {
                ctx.setLineDash([]);
            }

            ctx.strokeRect(camX, camY, camW, camH);
            
            // Reset dash
            ctx.setLineDash([]);
            
        });
    }
}
