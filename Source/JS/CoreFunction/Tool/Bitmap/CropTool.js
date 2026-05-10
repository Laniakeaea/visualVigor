import { ToolUtils } from '../ToolUtils.js';

export class CropTool {
    constructor() {
        this.id = 'toolBitmapCrop';
        this.options = {
            x: 0,
            y: 0,
            width: 0,
            height: 0
        };
        
        this.state = 'IDLE'; // 'IDLE', 'DRAGGING_HANDLE', 'DRAGGING_AREA'
        this.activeHandle = null; // 'tl', 't', 'tr', 'r', 'br', 'b', 'bl', 'l'
        this.dragStart = null; // Screen Coords
        this.rectStart = null; // Project Coords
        
        this.cropRect = { x: 0, y: 0, w: 0, h: 0 };
        this.overlays = []; // Array of { viewport, canvas, ctx }
        this.activeViewport = null; // The viewport currently being interacted with
        
        this.HANDLE_SIZE = 10; // Screen pixels
    }

    applyCrop() {
        this._commitCrop();
    }

    cancelCrop() {
        this._initCropRect();
        this._updateOptions();
        if (window.indicatorSystem) window.indicatorSystem.update();
    }

    activate() {
        this.bindEvents();
        this._initCropRect();
        this._updateOptions();
        if (window.indicatorSystem) window.indicatorSystem.update();
    }

    deactivate() {
        this.unbindEvents();
        this.state = 'IDLE';
        if (window.indicatorSystem) window.indicatorSystem.update();
    }

    bindEvents() {
        this.handleDown = this.onPointerDown.bind(this);
        this.handleMove = this.onPointerMove.bind(this);
        this.handleUp = this.onPointerUp.bind(this);
        this.handleKeyDown = this.onKeyDown.bind(this);

        document.addEventListener('pointerdown', this.handleDown);
        document.addEventListener('pointermove', this.handleMove);
        document.addEventListener('pointerup', this.handleUp);
        document.addEventListener('keydown', this.handleKeyDown);
        
        this._optionsProxy = new Proxy(this.options, {
            set: (target, prop, value) => {
                target[prop] = value;
                this._onOptionChanged(prop, value);
                return true;
            }
        });
    }

    unbindEvents() {
        document.removeEventListener('pointerdown', this.handleDown);
        document.removeEventListener('pointermove', this.handleMove);
        document.removeEventListener('pointerup', this.handleUp);
        document.removeEventListener('keydown', this.handleKeyDown);
    }

    onDrawIndicator(ctx, point, viewport) {
        if (window.indicatorSystem) {
            window.indicatorSystem.drawCropIndicator(
                ctx,
                this.cropRect,
                this.HANDLE_SIZE,
                viewport
            );
        }
    }

    _initCropRect() {
        if (!window.projectModel || !window.projectModel.data) return;
        const artboard = window.projectModel.data.settings.artboard;
        this.cropRect = {
            x: 0,
            y: 0,
            w: artboard.width,
            h: artboard.height
        };
    }

    _updateOptions() {
        this.options.x = Math.round(this.cropRect.x);
        this.options.y = Math.round(this.cropRect.y);
        this.options.width = Math.round(this.cropRect.w);
        this.options.height = Math.round(this.cropRect.h);
        
        if (window.toolOptionsController) {
            window.toolOptionsController.update();
        }
    }

    _onOptionChanged(key, value) {
        const val = Math.round(Number(value)); // Ensure integer
        if (key === 'x') this.cropRect.x = val;
        if (key === 'y') this.cropRect.y = val;
        if (key === 'width') this.cropRect.w = val;
        if (key === 'height') this.cropRect.h = val;
        
        if (window.indicatorSystem) window.indicatorSystem.update();
    }

    onOptionChanged(key, value) {
        this._onOptionChanged(key, value);
    }

    onKeyDown(e) {
        if (e.key === 'Enter') {
            this._commitCrop();
        } else if (e.key === 'Escape') {
            this._initCropRect();
            if (window.indicatorSystem) window.indicatorSystem.update();
        }
    }

    onPointerDown(e) {
        if (e.button !== 0) return;
        
        const viewport = e.target.closest('.workspace__viewport');
        if (!viewport) return;
        this.activeViewport = viewport;

        // Get Screen Point (relative to viewport)
        const pt = this._getScreenPoint(e, viewport);
        
        // Check handles (Screen Space)
        const handle = this._getHitHandle(pt, viewport);
        
        if (handle) {
            this.state = 'DRAGGING_HANDLE';
            this.activeHandle = handle;
            this.dragStart = pt; // Screen Coords
            this.rectStart = { ...this.cropRect };
        } else {
            // Check if inside rect (Project Space)
            const logicalPt = this._getLogicalPoint(e, viewport);
            if (this._isPointInRect(logicalPt, this.cropRect)) {
                this.state = 'DRAGGING_AREA';
                this.dragStart = pt; // Screen Coords
                this.rectStart = { ...this.cropRect };
            }
        }
    }

    onPointerMove(e) {
        if (!this.activeViewport) return;
        
        // We need to find the viewport under the mouse if we are IDLE, 
        // but if dragging, we stick to activeViewport.
        let viewport = this.activeViewport;
        if (this.state === 'IDLE') {
            const v = e.target.closest('.workspace__viewport');
            if (v) viewport = v;
        }
        
        const pt = this._getScreenPoint(e, viewport);
        
        if (this.state === 'IDLE') {
            const handle = this._getHitHandle(pt, viewport);
            if (handle) {
                this._setCursorForHandle(handle);
            } else {
                const logicalPt = this._getLogicalPoint(e, viewport);
                if (this._isPointInRect(logicalPt, this.cropRect)) {
                    document.body.style.cursor = 'move';
                } else {
                    document.body.style.cursor = 'default';
                }
            }
        } else if (this.state === 'DRAGGING_HANDLE') {
            this._updateRectByHandle(pt);
            if (window.indicatorSystem) window.indicatorSystem.update();
            this._updateOptions();
        } else if (this.state === 'DRAGGING_AREA') {
            // Calculate delta in Screen Space
            const dxScreen = pt.x - this.dragStart.x;
            const dyScreen = pt.y - this.dragStart.y;
            
            // Convert to Project Space
            const scale = viewport.cameraController ? viewport.cameraController.scale : 1;
            const dx = dxScreen / scale;
            const dy = dyScreen / scale;
            
            this.cropRect.x = Math.round(this.rectStart.x + dx);
            this.cropRect.y = Math.round(this.rectStart.y + dy);
            
            if (window.indicatorSystem) window.indicatorSystem.update();
            this._updateOptions();
        }
    }

    onPointerUp(e) {
        this.state = 'IDLE';
        this.activeHandle = null;
    }

    _commitCrop() {
        if (!window.projectModel) return;
        if (this.cropRect.w <= 0 || this.cropRect.h <= 0) return;
        
        // Final integer snap for safety
        const finalRect = {
            x: Math.round(this.cropRect.x),
            y: Math.round(this.cropRect.y),
            w: Math.round(this.cropRect.w),
            h: Math.round(this.cropRect.h)
        };

        if (window.projectModel.resizeArtboard) {
            window.projectModel.resizeArtboard(finalRect);
        }
        
        this.cropRect = { x: 0, y: 0, w: finalRect.w, h: finalRect.h };
        this._updateOptions();
        if (window.indicatorSystem) window.indicatorSystem.update();
    }

    _getHitHandle(pt, viewport) {
        // Project Rect to Screen Rect
        const r = this._projectRectToScreen(this.cropRect, viewport);
        const s = this.HANDLE_SIZE; // Fixed screen size
        const h = s / 2;
        
        // Check corners
        if (this._dist(pt, r.x, r.y) < s) return 'tl';
        if (this._dist(pt, r.x + r.w, r.y) < s) return 'tr';
        if (this._dist(pt, r.x + r.w, r.y + r.h) < s) return 'br';
        if (this._dist(pt, r.x, r.y + r.h) < s) return 'bl';
        
        // Check edges
        if (this._dist(pt, r.x + r.w/2, r.y) < s) return 't';
        if (this._dist(pt, r.x + r.w, r.y + r.h/2) < s) return 'r';
        if (this._dist(pt, r.x + r.w/2, r.y + r.h) < s) return 'b';
        if (this._dist(pt, r.x, r.y + r.h/2) < s) return 'l';
        
        return null;
    }

    _updateRectByHandle(pt) {
        // pt is current mouse position in Screen Space
        // dragStart is start mouse position in Screen Space
        // rectStart is start rect in Project Space
        
        const scale = this.activeViewport.cameraController ? this.activeViewport.cameraController.scale : 1;
        
        const dxScreen = pt.x - this.dragStart.x;
        const dyScreen = pt.y - this.dragStart.y;
        
        const dx = dxScreen / scale;
        const dy = dyScreen / scale;
        
        const r = this.rectStart;
        const newR = { ...r };
        
        switch (this.activeHandle) {
            case 'tl': newR.x += dx; newR.y += dy; newR.w -= dx; newR.h -= dy; break;
            case 't':  newR.y += dy; newR.h -= dy; break;
            case 'tr': newR.y += dy; newR.w += dx; newR.h -= dy; break;
            case 'r':  newR.w += dx; break;
            case 'br': newR.w += dx; newR.h += dy; break;
            case 'b':  newR.h += dy; break;
            case 'bl': newR.x += dx; newR.w -= dx; newR.h += dy; break;
            case 'l':  newR.x += dx; newR.w -= dx; break;
        }
        
        // Normalize
        if (newR.w < 0) { newR.x += newR.w; newR.w = -newR.w; }
        if (newR.h < 0) { newR.y += newR.h; newR.h = -newR.h; }
        
        // Ensure integer mapping
        newR.x = Math.round(newR.x);
        newR.y = Math.round(newR.y);
        newR.w = Math.round(newR.w);
        newR.h = Math.round(newR.h);

        this.cropRect = newR;
    }



    _projectRectToScreen(rect, viewport) {
        if (!viewport.cameraController) return rect;
        const { scale, position } = viewport.cameraController;
        return {
            x: rect.x * scale + position.x,
            y: rect.y * scale + position.y,
            w: rect.w * scale,
            h: rect.h * scale
        };
    }

    _getScreenPoint(e, viewport) {
        const rect = viewport.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    _getLogicalPoint(e, viewport) {
        const pt = this._getScreenPoint(e, viewport);
        if (viewport.cameraController) {
            const { position, scale } = viewport.cameraController;
            return {
                x: (pt.x - position.x) / scale,
                y: (pt.y - position.y) / scale
            };
        }
        return pt;
    }

    _dist(p, x, y) {
        return Math.sqrt(Math.pow(p.x - x, 2) + Math.pow(p.y - y, 2));
    }

    _isPointInRect(pt, r) {
        return pt.x >= r.x && pt.x <= r.x + r.w && pt.y >= r.y && pt.y <= r.y + r.h;
    }

    _setCursorForHandle(h) {
        const cursors = {
            'tl': 'nw-resize', 't': 'n-resize', 'tr': 'ne-resize',
            'r': 'e-resize', 'br': 'se-resize', 'b': 's-resize',
            'bl': 'sw-resize', 'l': 'w-resize'
        };
        document.body.style.cursor = cursors[h];
    }
}
