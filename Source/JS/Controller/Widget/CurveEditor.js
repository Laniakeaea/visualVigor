
export class CurveEditor {
    constructor() {
        this.container = document.createElement('div');
        this.container.className = 'curve-editor';
        // Use flex layout to handle resizing naturally
        this.container.style.display = 'flex';
        this.container.style.flexDirection = 'column';
        this.container.style.width = '100%';
        this.container.style.height = '100%';
        this.container.style.minHeight = '200px';

        this.channels = ['all', 'red', 'green', 'blue'];
        this.activeChannel = 'all'; // all, red, green, blue
        
        // Data format: { all: [{x:0,y:0}, {x:1,y:1}], red: ... }
        this.data = {
            all: [{x: 0, y: 0}, {x: 1, y: 1}],
            red: [{x: 0, y: 0}, {x: 1, y: 1}],
            green: [{x: 0, y: 0}, {x: 1, y: 1}],
            blue: [{x: 0, y: 0}, {x: 1, y: 1}]
        };
        
        this.activePoint = null; // { index, original }
        this.hoverPoint = null;

        // Theme Support
        this.theme = 'dark'; // Default
        if (window.themeManager) {
            this.theme = window.themeManager.currentTheme;
        }

        this._createUI();
        this._bindEvents();
        this.onChange = null;

        // Initialize ResizeObserver
        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(this.container);

        // Listen for Theme Changes
        window.addEventListener('themeChanged', (e) => {
            this.theme = e.detail.theme;
            this.render();
            this.updateChannelBar();
        });
    }

    resize() {
        if (!this.canvas) return;
        const rect = this.canvas.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        
        // Sync buffer size with display size
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        this.render();
    }

    setData(newData) {
        // Deep copy to prevent reference issues
        this.data = JSON.parse(JSON.stringify(newData));
        this.render();
    }

    getData() {
        return this.data;
    }

    _createUI() {
        // 1. Channel Switcher
        this.channelBar = document.createElement('div');
        this.channelBar.style.display = 'flex';
        this.channelBar.style.gap = '5px';
        this.channelBar.style.marginBottom = '8px';
        this.channelBar.style.flex = '0 0 auto'; // Don't shrink
        
        this.channels.forEach(ch => {
            const btn = document.createElement('button');
            btn.className = 'btn btn--icon btn--small'; // Assuming existing classes
            // Simplified styling for now
            btn.style.flex = '1';
            btn.style.height = '24px';
            btn.style.border = '1px solid var(--border-color)';
            btn.style.borderRadius = '3px';
            btn.style.cursor = 'pointer';
            btn.dataset.channel = ch;
            
            // Channel Colors
            const colorMap = {
                'all': 'var(--text-color)', 'red': '#ff4d4f', 'green': '#52c41a', 'blue': '#1890ff'
            };
            btn.style.background = 'transparent';
            
            // Indicator
            const dot = document.createElement('div');
            dot.style.width = '10px';
            dot.style.height = '10px';
            dot.style.backgroundColor = this.theme === 'light' && ch === 'all' ? '#000' : (ch === 'all' ? '#ddd' : colorMap[ch]);
            dot.style.borderRadius = '50%';
            dot.style.margin = '0 auto';
            dot.className = 'channel-dot'; // For easier updating
            
            btn.appendChild(dot);
            
            btn.onclick = () => {
                this.activeChannel = ch;
                this.updateChannelBar();
                this.render();
            };
            this.channelBar.appendChild(btn);
        });
        this.updateChannelBar();

        // 2. Canvas
        this.canvas = document.createElement('canvas');
        // Background handled in render
        this.canvas.style.borderRadius = '4px';
        this.canvas.style.cursor = 'crosshair';
        this.canvas.style.display = 'block';
        this.canvas.style.flex = '1 1 auto'; // Auto grow/shrink
        this.canvas.style.width = '100%';
        this.canvas.style.minHeight = '0'; // Allow shrinking in flex column
        
        this.ctx = this.canvas.getContext('2d');

        this.container.appendChild(this.channelBar);
        this.container.appendChild(this.canvas);
    }

    updateChannelBar() {
        const isDark = this.theme === 'dark';
        const colorMap = {
            'all': isDark ? '#ddd' : '#333', 'red': '#ff4d4f', 'green': '#52c41a', 'blue': '#1890ff'
        };

        Array.from(this.channelBar.children).forEach(btn => {
            const ch = btn.dataset.channel;
            // Update Active State Background
            if (ch === this.activeChannel) {
                btn.style.backgroundColor = 'var(--bg-active-hover)';
            } else {
                btn.style.backgroundColor = 'transparent';
            }
            
            // Update Dot Color
            const dot = btn.querySelector('.channel-dot');
            if (dot) {
                dot.style.backgroundColor = colorMap[ch];
            }
        });
    }

    _bindEvents() {
        let isDragging = false;
        
        const getPos = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            // Use rect dimensions for calculation
            const x = (e.clientX - rect.left) / rect.width;
            const y = 1 - (e.clientY - rect.top) / rect.height;
            return { x, y };
        };

        this.canvas.addEventListener('mousedown', (e) => {
            const pos = getPos(e);
            
            // Check for existing point
            const points = this.data[this.activeChannel];
            // Hit test radius relative to size
            const rect = this.canvas.getBoundingClientRect();
            const thresholdX = 10 / rect.width; 
            const thresholdY = 10 / rect.height;

            // Find clicked point
            let clickedIndex = -1;
            for (let i = 0; i < points.length; i++) {
                const p = points[i];
                if (Math.abs(p.x - pos.x) < thresholdX && Math.abs(p.y - pos.y) < thresholdY) {
                    clickedIndex = i;
                    break;
                }
            }

            if (clickedIndex !== -1) {
                // Drag existing
                this.activePoint = { index: clickedIndex };
                isDragging = true;
            } else {
                // Add new point
                points.push({ x: pos.x, y: pos.y });
                // Sort by X
                points.sort((a, b) => a.x - b.x);
                // Find new index
                const newIndex = points.findIndex(p => p.x === pos.x && p.y === pos.y);
                this.activePoint = { index: newIndex };
                isDragging = true;
                this._notifyChange();
            }
            this.render();
        });

        window.addEventListener('mousemove', (e) => {
            if (!isDragging || !this.activePoint) return;
            // Use window listener for smooth dragging outside canvas
            
            // We need to calc pos relative to canvas though
            const rect = this.canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width;
            const y = 1 - (e.clientY - rect.top) / rect.height;

            const points = this.data[this.activeChannel];
            const p = points[this.activePoint.index];

            // Constrain
            p.y = Math.max(0, Math.min(1, y));
            
            // Constrain X between neighbors (unless endpoints)
            if (this.activePoint.index > 0 && this.activePoint.index < points.length - 1) {
                const prev = points[this.activePoint.index - 1];
                const next = points[this.activePoint.index + 1];
                // slight buffer to prevent overlap
                p.x = Math.max(prev.x + 0.01, Math.min(next.x - 0.01, x)); 
            } else {
                // Endpoints constrained to 0 and 1 X usually?
                // Standard Curves: Endpoints are usually fixed at X=0 and X=1, but Y can move.
                // But complex curves allow moving endpoints X? No, usually Input Range 0..1
                if (this.activePoint.index === 0) p.x = 0;
                if (this.activePoint.index === points.length - 1) p.x = 1;
            }

            this.render();
            this._notifyChange();
        });

        window.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                this.activePoint = null;
            }
        });

        // Double click to remove
        this.canvas.addEventListener('dblclick', (e) => {
             const pos = getPos(e);
             const points = this.data[this.activeChannel];
             const rect = this.canvas.getBoundingClientRect();
             const thresholdX = 10 / rect.width;
             const thresholdY = 10 / rect.height;
             
             // Cannot remove start/end
             for (let i = 1; i < points.length - 1; i++) {
                 const p = points[i];
                 if (Math.abs(p.x - pos.x) < thresholdX && Math.abs(p.y - pos.y) < thresholdY) {
                     points.splice(i, 1);
                     this.render();
                     this._notifyChange();
                     return;
                 }
             }
        });
    }

    _notifyChange() {
        if (this.onChange) {
            this.onChange(this.data);
        }
    }

    render() {
        if (!this.canvas) return;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const ctx = this.ctx;

        const isDark = this.theme === 'dark';
        const bgColor = isDark ? '#222' : '#f5f5f5';
        const gridColor = isDark ? '#333' : '#ddd';
        const helperColor = isDark ? '#333' : '#ccc';

        // Background
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, w, h);

        // 1. Grid
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 1; i < 4; i++) {
            // Use Math.round to align with pixels for sharpness
            const x = Math.round(i * w / 4) + 0.5;
            const y = Math.round(i * h / 4) + 0.5;
            ctx.moveTo(x, 0); ctx.lineTo(x, h);
            ctx.moveTo(0, y); ctx.lineTo(w, y);
        }
        ctx.stroke();

        // 2. Diagonal helper
        ctx.strokeStyle = helperColor;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(0, h); ctx.lineTo(w, 0);
        ctx.stroke();
        ctx.setLineDash([]);

        // 3. Draw Inactive Curves (faint)
        this.channels.forEach(ch => {
            if (ch !== this.activeChannel && ch !== 'all') {
                 // Skip drawing other channels for clarity, or draw very faint?
                 // Let's not draw them to avoid clutter, user can switch tabs.
            }
        });
        
        // 4. Draw Active/All Curve
        // If 'all' is active, we just draw 'all'.
        // If 'red' is active, we draw 'red'.
        const points = this.data[this.activeChannel];
        this.drawCurve(points, this.activeChannel);
    }

    drawCurve(points, channel) {
        if (!points || points.length < 2) return;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const ctx = this.ctx;

        const isDark = this.theme === 'dark';
        const colorMap = {
            'all': isDark ? '#fff' : '#000', 'red': '#ff4d4f', 'green': '#52c41a', 'blue': '#1890ff'
        };

        ctx.strokeStyle = colorMap[channel];
        ctx.lineWidth = 2;
        ctx.beginPath();
       
        // Smooth Curve drawing
        if (points.length === 2) {
             // Linear
             ctx.moveTo(points[0].x * w, (1 - points[0].y) * h);
             ctx.lineTo(points[1].x * w, (1 - points[1].y) * h);
        } else {
             // Multiple points
             ctx.moveTo(points[0].x * w, (1 - points[0].y) * h);
             // Simple Tension Spline approach
             // Just connecting them for now to ensure visual === logic
             for (let i = 0; i < points.length - 1; i++) {
                 const p0 = points[i];
                 const p1 = points[i+1];
                 ctx.lineTo(p1.x * w, (1 - p1.y) * h);
             }
        }
        
        ctx.stroke();

        // Points
        ctx.fillStyle = colorMap[channel];
        points.forEach(p => {
             const px = p.x * w;
             const py = (1 - p.y) * h;
             ctx.beginPath();
             ctx.arc(px, py, 4, 0, Math.PI * 2);
             ctx.fill();
             ctx.strokeStyle = '#000';
             ctx.lineWidth = 1;
             ctx.stroke();
        });
    }
}
