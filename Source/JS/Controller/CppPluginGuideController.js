import { ProjectModel } from '/Source/JS/CoreFunction/Project/projectModel.js';
import { CppCompiler } from '/Source/JS/CoreFunction/Plugin/CppCompiler.js';

export class CppPluginGuideController {
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

        // Overlay is identical to JS Guide
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
        title.textContent = t('HelpMenu.CppPluginGuide.Title') || 'C++ High Performance Plugin Guide';
        
        const subtitle = document.createElement('div');
        subtitle.className = 'plugin-guide-subtitle';
        subtitle.textContent = t('HelpMenu.CppPluginGuide.Subtitle') || 'Extend capabilities using C++ (WebAssembly)';

        header.appendChild(title);
        header.appendChild(subtitle);
        
        // Download Demo Button
        const demoBtn = document.createElement('button');
        demoBtn.className = 'plugin-demo-btn';
        demoBtn.innerHTML = `
<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-right: 8px;">
<path d="M13.2456 3.25541V12.736L16.1057 9.8788C16.3513 9.61906 16.6474 9.48919 16.9941 9.48919C17.3408 9.48919 17.6369 9.61906 17.8825 9.8788C18.1281 10.1097 18.2508 10.3983 18.2508 10.7446C18.2508 11.0909 18.1281 11.3795 17.8825 11.6104L12.8772 16.6321C12.6461 16.8629 12.3572 16.9784 12.0105 16.9784C11.6638 16.9784 11.3677 16.8629 11.1221 16.6321L6.11688 11.6104C5.87131 11.3795 5.74853 11.0909 5.74853 10.7446C5.74853 10.3983 5.87131 10.1097 6.11688 9.8788C6.36245 9.61906 6.65858 9.48919 7.00526 9.48919C7.35195 9.48919 7.64807 9.61906 7.89364 9.8788L10.7538 12.736V3.25541C10.7538 2.90909 10.8766 2.62049 11.1221 2.38961C11.3677 2.15873 11.6638 2.02886 12.0105 2C12.3572 2.02886 12.6461 2.15873 12.8772 2.38961C13.1084 2.62049 13.2311 2.90909 13.2456 3.25541ZM4.4918 15.723H8.457L10.2338 17.4979C10.7249 17.9885 11.3172 18.2338 12.0105 18.2338C12.7039 18.2338 13.2889 17.9885 13.7656 17.4979L15.5424 15.723H19.5076C20.201 15.723 20.7932 15.9683 21.2843 16.4589C21.7755 16.9495 22.0138 17.5412 21.9994 18.2338V19.4892C22.0138 20.1818 21.7755 20.7734 21.2843 21.2641C20.7932 21.7547 20.201 22 19.5076 22H4.4918C3.81287 22 3.22784 21.7547 2.73671 21.2641C2.24557 20.7734 2 20.1818 2 19.4892V18.2338C2 17.5412 2.24557 16.9495 2.73671 16.4589C3.22784 15.9683 3.81287 15.723 4.4918 15.723ZM19.5509 18.2122C19.3776 18.0246 19.1537 17.9308 18.8792 17.9308C18.6048 17.9308 18.3809 18.0246 18.2075 18.2122C18.0342 18.3997 17.9475 18.6234 17.9475 18.8831C17.9475 19.1429 18.0342 19.3593 18.2075 19.5325C18.3809 19.7057 18.6048 19.7922 18.8792 19.7922C19.1537 19.7922 19.3776 19.7057 19.5509 19.5325C19.7243 19.3593 19.8109 19.1429 19.8109 18.8831C19.8109 18.6234 19.7243 18.3997 19.5509 18.2122Z" fill="currentColor"/>
</svg> ${t('HelpMenu.CppPluginGuide.DownloadDemos') || 'Download C++ Examples'}`;
        demoBtn.onclick = () => this._downloadDemos();
        header.appendChild(demoBtn);

        container.appendChild(header);

        // Content Scrollable Area
        const content = document.createElement('div');
        content.className = 'plugin-guide-content';

        this._addSection(content, 
            t('HelpMenu.CppPluginGuide.IntroTitle') || 'Introduction', 
            t('HelpMenu.CppPluginGuide.IntroText') || 'VisualVigor allows you to write high-performance image processing algorithms in C++. These scripts are compiled to WebAssembly on the fly.'
        );

        this._addSection(content, 
            t('HelpMenu.CppPluginGuide.StructureTitle') || 'Basic Structure', 
            t('HelpMenu.CppPluginGuide.StructureText') || 'Plugin files must have a .cpp or .c extension and export an "applyFilter" function. NOTE: The standard library (std::) is not available.',
            `extern "C" {
/**
 * @param data RGBA pixel data
 * @param width Image width
 * @param height Image height
 */
void applyFilter(unsigned char* data, int width, int height) {
    int totalPixels = width * height;
    
    // Example: Invert
    // Raw pointer manipulation required
    for (int i = 0; i < totalPixels; i++) {
        int offset = i * 4;
        data[offset]     = 255 - data[offset];     // R
        data[offset + 1] = 255 - data[offset + 1]; // G
        data[offset + 2] = 255 - data[offset + 2]; // B
        // Alpha data[offset+3] usually preserved
    }
}
}`
        );

         this._addSection(content, 
            t('HelpMenu.CppPluginGuide.AdvancedTitle') || 'Advanced Processing', 
            t('HelpMenu.CppPluginGuide.AdvancedText') || 'You can implement complex algorithms like convolutions or floating point math (e.g. Sepia, Mandelbrot).',
            `extern "C" {
void applyFilter(unsigned char* data, int width, int height) {
    // Floating point math is supported
    for (int i = 0; i < width * height; i++) {
        int idx = i * 4;
        float r = (float)data[idx];
        // ... complex math ...
        data[idx] = (unsigned char)r;
    }
}
}`
        );

         const wasmSection = this._addSection(content, 
            t('HelpMenu.CppPluginGuide.WasmTitle') || 'WebAssembly Modules (.wasm)', 
            t('HelpMenu.CppPluginGuide.WasmText') || 'You can also load pre-compiled .wasm files directly (similar to loading a DLL). This is useful for distributing closed-source plugins or skipping compilation.',
            `// Compile C/C++ to Wasm (Example using Clang):
// clang --target=wasm32 -nostdlib -Wl,--no-entry -Wl,--export=applyFilter -o filter.wasm filter.c

// Ensure your Wasm module exports:
// applyFilter(offset, width, height)`
        );

        // Add Generate Button to Wasm Section
        const btn = document.createElement('button');
        btn.className = 'plugin-demo-btn';
        btn.style.marginTop = '10px';
        const generateText = t('HelpMenu.CppPluginGuide.GenerateWasm') || 'Generate Test .wasm (Invert Red)';
        const compilingText = t('HelpMenu.CppPluginGuide.Compiling') || 'Compiling... (This may take a minute)';
        const successText = t('HelpMenu.CppPluginGuide.CompileSuccess') || 'Success! Download Started';
        const errorText = t('HelpMenu.CppPluginGuide.CompileError') || 'Error: ';

        btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:8px"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.7-3.7a1 1 0 0 0-1.4-1.4l-3 3-1-1a1 1 0 0 0-1.3 0.1z"></path><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline></svg> ${generateText}`;
        btn.onclick = async () => {
            btn.textContent = compilingText;
            btn.disabled = true;
            try {
                await this._generateTestWasm();
                btn.textContent = successText;
            } catch (e) {
                console.error(e);
                btn.textContent = errorText + e.message;
            } finally {
                setTimeout(() => {
                    btn.disabled = false;
                    btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:8px"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.7-3.7a1 1 0 0 0-1.4-1.4l-3 3-1-1a1 1 0 0 0-1.3 0.1z"></path><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline></svg> ${generateText}`;
                }, 3000);
            }
        };
        wasmSection.appendChild(btn);

        container.appendChild(content);

        // Footer Hint
        const hint = document.createElement('div');
        hint.className = 'plugin-guide-close-hint';
        hint.textContent = t('Popup.Dialog.NewProject.Cancel'); 
        hint.onclick = () => this.hide();
        container.appendChild(hint);

        this.overlay.appendChild(container);
        document.body.appendChild(this.overlay);
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
        return section;
    }

    async _generateTestWasm() {
        const sourceCode = `extern "C" {
void applyFilter(unsigned char* data, int width, int height) {
    int total = width * height;
    for (int i = 0; i < total; i++) {
        int r = i * 4;
        data[r] = 255 - data[r]; // Invert Red Only
    }
}
}`;
        // Since we imported CppCompiler class at top, we use it directly:
        const compiler = new CppCompiler();
        let wasmBinary;
        try {
             wasmBinary = await compiler.compile(sourceCode);
        } catch(e) {
             throw e; // Bubble up to UI
        }
        
        // Trigger Download
        const blob = new Blob([wasmBinary], { type: 'application/wasm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'test_invert_red.wasm';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    _highlightCode(code) {
        // Very basic highlighter for demo purposes
        return code
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\/\/.*/g, '<span class="comment">$&</span>')
            .replace(/\b(extern|float|int|void|unsigned char|for|while|if|return)\b/g, '<span class="keyword">$1</span>')
            .replace(/\b(applyFilter)\b/g, '<span class="function">$1</span>')
            .replace(/'[^']*'/g, '<span class="string">$&</span>')
            .replace(/\b\d+\b/g, '<span class="number">$&</span>');
    }

    _downloadDemos() {
        const demos = [
            {
                name: 'sepia.cpp',
                content: `extern "C" {
void applyFilter(unsigned char* data, int width, int height) {
    int totalPixels = width * height;
    for (int i = 0; i < totalPixels; i++) {
        int offset = i * 4;
        unsigned char r = data[offset];
        unsigned char g = data[offset + 1];
        unsigned char b = data[offset + 2];
        float tr = 0.393f * r + 0.769f * g + 0.189f * b;
        float tg = 0.349f * r + 0.686f * g + 0.168f * b;
        float tb = 0.272f * r + 0.534f * g + 0.131f * b;
        if (tr > 255.0f) tr = 255.0f;
        if (tg > 255.0f) tg = 255.0f;
        if (tb > 255.0f) tb = 255.0f;
        data[offset] = (unsigned char)tr;
        data[offset + 1] = (unsigned char)tg;
        data[offset + 2] = (unsigned char)tb;
    }
}
}`
            },
            {
                name: 'mandelbrot.cpp',
                content: `extern "C" {
void applyFilter(unsigned char* data, int width, int height) {
    const int MAX_ITER = 100;
    const float minX = -2.5f;
    const float maxX = 1.0f;
    const float minY = -1.0f;
    const float maxY = 1.0f;
    const float wScale = (maxX - minX) / width;
    const float hScale = (maxY - minY) / height;

    for (int y = 0; y < height; y++) {
        for (int x = 0; x < width; x++) {
            float cx = minX + x * wScale;
            float cy = minY + y * hScale;
            float a = 0.0f;
            float b = 0.0f;
            int iter = 0;
            while ((iter < MAX_ITER) && ((a*a + b*b) < 4.0f)) {
                float temp = a*a - b*b + cx;
                b = 2.0f * a * b + cy;
                a = temp;
                iter++;
            }
            int idx = (y * width + x) * 4;
            if (iter == MAX_ITER) {
                data[idx] = 0; data[idx+1] = 0; data[idx+2] = 0; data[idx+3] = 255;
            } else {
                data[idx] = (iter * 8) % 256;
                data[idx+1] = (iter * 4) % 256;
                data[idx+2] = (iter * 12) % 256;
                data[idx+3] = 255;
            }
        }
    }
}
}`
            }
        ];

        demos.forEach(demo => {
            const blob = new Blob([demo.content], { type: 'text/plain' });
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
}
