export class PluginGuideController {
    constructor() {
        this.isActive = false;
        this.overlay = null;
    }

    show() {
        if (this.isActive) return;
        this.isActive = true;
        this.createOverlay();
        
        requestAnimationFrame(() => {
            if (this.overlay) this.overlay.classList.add('is-visible');
        });
    }

    hide() {
        if (this.overlay) {
            this.overlay.classList.remove('is-visible');
            setTimeout(() => {
                if (this.overlay) this.overlay.remove();
                this.overlay = null;
                this.isActive = false;
            }, 300);
        }
    }

    createOverlay() {
        const t = window.languageManager ? window.languageManager.t.bind(window.languageManager) : (s) => s;

        // Overlay
        this.overlay = document.createElement('div');
        this.overlay.className = 'plugin-guide-overlay';
        this.overlay.onclick = (e) => {
            if (e.target === this.overlay) this.hide();
        };

        // Container
        const container = document.createElement('div');
        container.className = 'plugin-guide-container';

        // Header
        const header = document.createElement('div');
        header.className = 'plugin-guide-header';
        
        const title = document.createElement('div');
        title.className = 'plugin-guide-title';
        title.textContent = t('HelpMenu.PluginGuide.Title') || 'JS Plugin Development Guide';
        
        const subtitle = document.createElement('div');
        subtitle.className = 'plugin-guide-subtitle';
        subtitle.textContent = t('HelpMenu.PluginGuide.Subtitle') || 'Extend capabilities using JavaScript';

        header.appendChild(title);
        header.appendChild(subtitle);
        
        // Download Demo Button
        const demoBtn = document.createElement('button');
        demoBtn.className = 'plugin-demo-btn';
        demoBtn.innerHTML = `
<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-right: 8px;">
<path d="M13.2456 3.25541V12.736L16.1057 9.8788C16.3513 9.61906 16.6474 9.48919 16.9941 9.48919C17.3408 9.48919 17.6369 9.61906 17.8825 9.8788C18.1281 10.1097 18.2508 10.3983 18.2508 10.7446C18.2508 11.0909 18.1281 11.3795 17.8825 11.6104L12.8772 16.6321C12.6461 16.8629 12.3572 16.9784 12.0105 16.9784C11.6638 16.9784 11.3677 16.8629 11.1221 16.6321L6.11688 11.6104C5.87131 11.3795 5.74853 11.0909 5.74853 10.7446C5.74853 10.3983 5.87131 10.1097 6.11688 9.8788C6.36245 9.61906 6.65858 9.48919 7.00526 9.48919C7.35195 9.48919 7.64807 9.61906 7.89364 9.8788L10.7538 12.736V3.25541C10.7538 2.90909 10.8766 2.62049 11.1221 2.38961C11.3677 2.15873 11.6638 2.02886 12.0105 2C12.3572 2.02886 12.6461 2.15873 12.8772 2.38961C13.1084 2.62049 13.2311 2.90909 13.2456 3.25541ZM4.4918 15.723H8.457L10.2338 17.4979C10.7249 17.9885 11.3172 18.2338 12.0105 18.2338C12.7039 18.2338 13.2889 17.9885 13.7656 17.4979L15.5424 15.723H19.5076C20.201 15.723 20.7932 15.9683 21.2843 16.4589C21.7755 16.9495 22.0138 17.5412 21.9994 18.2338V19.4892C22.0138 20.1818 21.7755 20.7734 21.2843 21.2641C20.7932 21.7547 20.201 22 19.5076 22H4.4918C3.81287 22 3.22784 21.7547 2.73671 21.2641C2.24557 20.7734 2 20.1818 2 19.4892V18.2338C2 17.5412 2.24557 16.9495 2.73671 16.4589C3.22784 15.9683 3.81287 15.723 4.4918 15.723ZM19.5509 18.2122C19.3776 18.0246 19.1537 17.9308 18.8792 17.9308C18.6048 17.9308 18.3809 18.0246 18.2075 18.2122C18.0342 18.3997 17.9475 18.6234 17.9475 18.8831C17.9475 19.1429 18.0342 19.3593 18.2075 19.5325C18.3809 19.7057 18.6048 19.7922 18.8792 19.7922C19.1537 19.7922 19.3776 19.7057 19.5509 19.5325C19.7243 19.3593 19.8109 19.1429 19.8109 18.8831C19.8109 18.6234 19.7243 18.3997 19.5509 18.2122Z" fill="currentColor"/>
</svg> ${t('HelpMenu.PluginGuide.DownloadDemos') || 'Download Demo Scripts'}`;
        demoBtn.onclick = () => this._downloadDemos();
        header.appendChild(demoBtn);

        container.appendChild(header);

        // Content Scrollable Area
        const content = document.createElement('div');
        content.className = 'plugin-guide-content';

        // Section 1: Introduction
        this._addSection(content, 
            t('HelpMenu.PluginGuide.IntroTitle') || 'Introduction', 
            t('HelpMenu.PluginGuide.IntroText') || 'VisualVigor supports external scripts to manipulate image data directly. Plugins are simple JavaScript files that export a specific function.'
        );

        // Section 2: Basic Structure
        this._addSection(content, 
            t('HelpMenu.PluginGuide.StructureTitle') || 'Basic Structure', 
            t('HelpMenu.PluginGuide.StructureText') || 'Create a .js file and export an "apply" function:',
            `export function apply(data, width, height) {
    // data: Uint8ClampedArray (RGBA)
    // width: Canvas Width
    // height: Canvas Height
    
    // Example: Invert Colors
    for (let i = 0; i < data.length; i += 4) {
        data[i] = 255 - data[i];     // Red
        data[i+1] = 255 - data[i+1]; // Green
        data[i+2] = 255 - data[i+2]; // Blue
        // data[i+3] is Alpha
    }
    
    // Return modified data (optional if modified in-place)
    return new ImageData(data, width, height);
}`
        );

        // Section 3: Vector Support
        this._addSection(content, 
            t('HelpMenu.PluginGuide.VectorTitle') || 'Generating Vectors', 
            t('HelpMenu.PluginGuide.VectorText') || 'You can also generate vector shapes by returning an object with a "vectors" array.',
            `export function apply(data, width, height) {
    // ... analysis logic ...
    
    return {
        // Optional: Return modified image
        img: null, 
        
        // Return new Vector Elements
        vectors: [
            {
                type: 'rectangle',
                properties: {
                    x: 100, y: 100, width: 200, height: 150,
                    fillColor: '#FF0000'
                }
            }
        ]
    };
}`
        );

        container.appendChild(content);

        // Footer Hint
        const hint = document.createElement('div');
        hint.className = 'plugin-guide-close-hint';
        hint.textContent = t('Popup.Dialog.NewProject.Cancel'); // Use common Close/Cancel text
        hint.onclick = () => this.hide();
        container.appendChild(hint);

        this.overlay.appendChild(container);
        document.body.appendChild(this.overlay);
    }

    _downloadDemos() {
        // Since we can't zip purely client-side without a library like JSZip, 
        // and we cannot fetch the local file system path directly in web content,
        // we will generate the known demo content dynamically and trigger downloads.

        const demos = [
            {
                name: 'invert_colors.js',
                content: `// JavaScript "Plugin" for VisualVigor
// Allows live scripting without compilation

/**
 * Inverts the colors of the image.
 * @param {Uint8ClampedArray} data - RGBA pixel data
 * @param {number} width - Width of the image
 * @param {number} height - Height of the image
 */
export function apply(data, width, height) {
    const numPixels = width * height;
    for (let i = 0; i < numPixels; i++) {
        const offset = i * 4;
        data[offset]     = 255 - data[offset];     // Red
        data[offset + 1] = 255 - data[offset + 1]; // Green
        data[offset + 2] = 255 - data[offset + 2]; // Blue
        // Alpha (offset + 3) remains unchanged
    }
}
`
            },
            {
                name: 'detect_blobs.js',
                content: `// Feature Detection Script
// 1. Detects bright 'blobs' in the image (Simple Threshold + Connected Components)
// 2. Draws bounding box vectors around them

export function apply(data, width, height) {
    const outputVectors = [];
    const threshold = 200; // Brightness Threshold (0-255)

    // Helper: Grayscale conversion
    const getBrightness = (r, g, b) => 0.299*r + 0.587*g + 0.114*b;

    // 1. Binarize (Virtual, using visited array)
    const visited = new Uint8Array(width * height);
    
    // Connected Components - BFS
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x);
            if (visited[idx]) continue;
            
            const px = idx * 4;
            const b = getBrightness(data[px], data[px+1], data[px+2]);

            // If bright pixel found, start flood fill
            if (b > threshold) {
                const blob = { minX: x, maxX: x, minY: y, maxY: y, count: 0 };
                const stack = [x, y];
                visited[idx] = 1;
                
                while(stack.length > 0) {
                    const cy = stack.pop();
                    const cx = stack.pop();
                    
                    blob.count++;
                    if (cx < blob.minX) blob.minX = cx;
                    if (cx > blob.maxX) blob.maxX = cx;
                    if (cy < blob.minY) blob.minY = cy;
                    if (cy > blob.maxY) blob.maxY = cy;
                    
                    // Neighbors
                    const neighbors = [
                        [cx+1, cy], [cx-1, cy], [cx, cy+1], [cx, cy-1]
                    ];
                    
                    for(let n of neighbors) {
                        const nx = n[0], ny = n[1];
                        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                            const nIdx = ny * width + nx;
                            if (!visited[nIdx]) {
                                const off = nIdx * 4;
                                const nb = getBrightness(data[off], data[off+1], data[off+2]);
                                if (nb > threshold) {
                                    visited[nIdx] = 1;
                                    stack.push(nx, ny);
                                }
                            }
                        }
                    }
                } // End BFS

                // Detect if blob is significant
                if (blob.count > 50) { // Ignore noise < 50 pixels
                    outputVectors.push({
                        type: 'rect',
                        properties: {
                            x: blob.minX,
                            y: blob.minY,
                            width: blob.maxX - blob.minX,
                            height: blob.maxY - blob.minY,
                            stroke: '#00ff00',
                            strokeWidth: 2,
                            fill: 'none'
                        }
                    });
                }
            }
        }
    }

    // Return extended format
    return {
        // We can return null/undefined for img if we didn't modify it, but let's return it to be safe.
        // Or we can modify 'data' to highlight detected pixels. 
        // Let's leave image untouched.
        img: null, 
        vectors: outputVectors
    };
}
`
            }
        ];

        demos.forEach(demo => {
            const blob = new Blob([demo.content], { type: 'text/javascript' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = demo.name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    }

    _addSection(parent, titleText, descText, codeText = null) {
        const section = document.createElement('div');
        section.className = 'doc-section';

        const title = document.createElement('div');
        title.className = 'doc-title';
        title.textContent = titleText;
        section.appendChild(title);

        const text = document.createElement('div');
        text.className = 'doc-text';
        text.textContent = descText;
        section.appendChild(text);

        if (codeText) {
            const code = document.createElement('div');
            code.className = 'code-block';
            code.innerHTML = this._highlightCode(codeText);
            section.appendChild(code);
        }

        parent.appendChild(section);
    }

    _highlightCode(code) {
        // Very basic highlighter for demo purposes
        return code
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\/\/.*/g, '<span class="comment">$&</span>')
            .replace(/\b(export|function|return|let|const|var|if|for|while|new)\b/g, '<span class="keyword">$1</span>')
            .replace(/\b(ImageData|Uint8ClampedArray)\b/g, '<span class="function">$1</span>')
            .replace(/'[^']*'/g, '<span class="string">$&</span>')
            .replace(/\b\d+\b/g, '<span class="number">$&</span>');
    }
}