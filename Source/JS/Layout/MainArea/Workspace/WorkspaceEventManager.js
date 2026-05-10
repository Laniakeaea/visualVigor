/* =========================================
   Workspace Event Manager Module
   Handles Global & Project Life-cycle Events
   ========================================= */

export class WorkspaceEventManager {
    constructor(mainView) {
        this.mainView = mainView;
    }

    bindGlobalEvents() {
        // Stucture & Frame
        window.addEventListener('projectLayersChanged', () => this.mainView.renderStructure());
        window.addEventListener('projectFrameChanged', () => this.mainView.updateFrameView());
        window.addEventListener('animationLayerViewChanged', () => this.mainView.renderStructure());
        // New: Canvas Content Update (Repaint without rebuild)
        window.addEventListener('projectCanvasUpdated', () => this.mainView.updateFrameView());

        // Artboard & Project
        window.addEventListener('projectActivated', (e) => this._onProjectActivated(e));
        window.addEventListener('projectArtboardChanged', (e) => this._onArtboardChanged(e.detail));
    }

    _onArtboardChanged(detail) {
        if (!detail && window.projectModel) {
            detail = window.projectModel.getArtboard();
        }
        
        // Allow updating even if width/height are 0 (to clear the view)
        if (detail) {
            const w = detail.width || 0;
            const h = detail.height || 0;
            this.mainView.views.forEach(vp => vp.setArtboardSize(w, h));
        }
    }

    _onProjectActivated(e) {
        if (!window.projectModel) return;
        const artboard = window.projectModel.getArtboard();
        // Even if artboard is null (project closed), we should update view to clear it
        if (artboard) {
            this._onArtboardChanged(artboard);
        } else {
            this._onArtboardChanged({ width: 0, height: 0 });
        }
        this.mainView.renderStructure();
    }
}
