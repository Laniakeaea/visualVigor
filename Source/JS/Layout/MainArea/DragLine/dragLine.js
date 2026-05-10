/* =========================================
   Drag Line Module
   ========================================= */

export class DragLine {
    /**
     * Creates a new DragLine instance.
     * @param {HTMLElement} element - The drag line DOM element.
     * @param {string} orientation - 'vertical' or 'horizontal'.
     * @param {HTMLElement} targetPanel - The panel element to resize.
     * @param {boolean} isReverse - If true, dragging right/down decreases size (e.g., right panel).
     */
    constructor(element, orientation, targetPanel, isReverse = false) {
        this.element = element;
        this.orientation = orientation;
        this.targetPanel = targetPanel;
        this.isReverse = isReverse;

        this.isDragging = false;
        this.startSize = 0;
        this.startPos = 0;

        this.bindEvents();
    }

    /* Bind Mouse Events */
    bindEvents() {
        this.element.addEventListener('mousedown', (e) => this.onMouseDown(e));
    }

    /* Mouse Down Handler */
    onMouseDown(e) {
        e.preventDefault();
        this.isDragging = true;
        this.element.classList.add('drag-line--dragging');
        document.body.style.cursor = this.orientation === 'vertical' ? 'ew-resize' : 'ns-resize';

        /* Get computed style for limits */
        const style = window.getComputedStyle(this.targetPanel);

        /* Record initial state */
        if (this.orientation === 'vertical') {
            this.startSize = this.targetPanel.offsetWidth;
            this.startPos = e.clientX;
            this.minSize = parseFloat(style.minWidth) || 0;
            this.maxSize = parseFloat(style.maxWidth) || Infinity;
        } else {
            this.startSize = this.targetPanel.offsetHeight;
            this.startPos = e.clientY;
            this.minSize = parseFloat(style.minHeight) || 0;
            this.maxSize = parseFloat(style.maxHeight) || Infinity;
        }

        /* Bind global move/up events */
        this.moveHandler = (e) => this.onMouseMove(e);
        this.upHandler = () => this.onMouseUp();

        document.addEventListener('mousemove', this.moveHandler);
        document.addEventListener('mouseup', this.upHandler);
    }

    /* Mouse Move Handler */
    onMouseMove(e) {
        if (!this.isDragging) return;

        let currentPos = this.orientation === 'vertical' ? e.clientX : e.clientY;
        let delta = currentPos - this.startPos;

        /* Invert delta if resizing a panel that is to the right/bottom of the drag line */
        if (this.isReverse) {
            delta = -delta;
        }

        let newSize = this.startSize + delta;

        /* Check limits */
        let isAtLimit = false;
        if (newSize <= this.minSize) {
            newSize = this.minSize;
            isAtLimit = true;
        } else if (newSize >= this.maxSize) {
            newSize = this.maxSize;
            isAtLimit = true;
        }

        /* Toggle limit class */
        if (isAtLimit) {
            this.element.classList.add('drag-line--at-limit');
        } else {
            this.element.classList.remove('drag-line--at-limit');
        }

        /* Apply new size */
        if (this.orientation === 'vertical') {
            this.targetPanel.style.width = `${newSize}px`;
        } else {
            this.targetPanel.style.height = `${newSize}px`;
        }
    }

    /* Mouse Up Handler */
    onMouseUp() {
        this.isDragging = false;
        this.element.classList.remove('drag-line--dragging');
        this.element.classList.remove('drag-line--at-limit');
        document.body.style.cursor = '';

        document.removeEventListener('mousemove', this.moveHandler);
        document.removeEventListener('mouseup', this.upHandler);
    }
}
