import paper from 'paper';

export class VectorSystem {
    constructor() {
        this.scope = new paper.PaperScope();
        // Initialize a dummy project so we can attach views later
        this.scope.setup(); 
        this.views = [];
    }

    /**
     * Registers a canvas as a view for the Paper.js project.
     * Used for tool previews across multiple viewports.
     * @param {HTMLCanvasElement} canvas 
     */
    registerView(canvas) {
        // Check if view already exists for this canvas
        const existing = this.views.find(v => v.element === canvas);
        if (existing) return;

        const view = new this.scope.View(canvas);
        view.autoUpdate = true;
        this.views.push(view);
    }

    /**
     * Clears all registered views.
     * Called when workspace is re-rendered.
     */
    clearViews() {
        this.views.forEach(v => v.remove());
        this.views = [];
    }

    get project() {
        return this.scope.project;
    }

    update() {
        this.views.forEach(v => {
            v.requestUpdate();
            // Force draw if requestUpdate isn't enough (sometimes needed if autoUpdate is weird)
            v.draw(); 
        });
    }

    clear() {
        if (this.project) {
            this.project.clear();
        }
    }


    /**
     * Imports data from ProjectModel into Paper.js
     * @param {Object} vectorLayerData 
     */
    importData(vectorLayerData) {
        this.clear();
        if (!vectorLayerData || !vectorLayerData.children) return;

        // Prevent auto-update during bulk import if view exists
        const view = this.scope.view;
        const prevAutoUpdate = view ? view.autoUpdate : false;
        if (view) view.autoUpdate = false;

        vectorLayerData.children.forEach(child => {
            this._createItemFromData(child);
        });

        if (view) {
            view.autoUpdate = prevAutoUpdate;
            view.update();
        }
    }

    _createItemFromData(data) {
        let item;
        if (data.type === 'path') {
            item = new this.scope.Path(data.properties.d);
        } else if (data.type === 'rect') {
            item = new this.scope.Path.Rectangle(
                new this.scope.Point(data.properties.x, data.properties.y),
                new this.scope.Size(data.properties.width, data.properties.height)
            );
        } else if (data.type === 'circle') {
            item = new this.scope.Path.Circle(
                new this.scope.Point(data.properties.cx, data.properties.cy),
                data.properties.r
            );
        } else if (data.type === 'ellipse') {
            item = new this.scope.Path.Ellipse({
                center: [data.properties.cx, data.properties.cy],
                radius: [data.properties.rx, data.properties.ry]
            });
        } else if (data.type === 'polygon') {
            // Reconstruct polygon from points string "x1,y1 x2,y2 ..."
            if (data.properties.points) {
                const points = data.properties.points.split(' ').map(p => {
                    const [x, y] = p.split(',').map(Number);
                    return new this.scope.Point(x, y);
                });
                item = new this.scope.Path(points);
                item.closed = true;
            }
        } else if (data.type === 'text') {
            item = new this.scope.PointText(
                new this.scope.Point(data.properties.x, data.properties.y)
            );
            item.content = data.properties.text;
            item.fontFamily = data.properties.fontFamily || 'Ubuntu';
            item.fontSize = data.properties.fontSize || 24;
        } else if (data.type === 'group') {
            item = new this.scope.Group();
            if (data.children) {
                data.children.forEach(childData => {
                    const childItem = this._createItemFromData(childData);
                    if (childItem) item.addChild(childItem);
                });
            }
        }

        if (item) {
            this._applyProperties(item, data.properties);
            item.data.id = data.id; // Link back to model ID
        }
        return item;
    }

    _applyProperties(item, props) {
        if (props.stroke) item.strokeColor = props.stroke;
        if (props.strokeWidth) item.strokeWidth = props.strokeWidth;
        if (props.fill && props.fill !== 'none') item.fillColor = props.fill;
        if (props.strokeLinecap) item.strokeCap = props.strokeLinecap;
        if (props.strokeLinejoin) item.strokeJoin = props.strokeLinejoin;
    }

    /**
     * Exports current Paper.js project to ProjectModel format
     * This is usually called after a tool finishes an operation
     */
    exportData() {
        // TODO: Implement full sync back to ProjectModel
        // For now, tools might add directly to ProjectModel and we re-import
        // Or tools add to Paper.js and we sync back.
        // Ideally: Paper.js is the editor. We serialize it to JSON for ProjectModel.
    }
}
