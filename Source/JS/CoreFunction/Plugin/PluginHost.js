import { CppCompiler } from './CppCompiler.js';

/**
 * Plugin Host for managing JS Extensions.
 * Handles loading and execution of .js modules.
 */
export class PluginHost {
    constructor() {
        this.plugins = new Map(); // id -> instance
        this.cppCompiler = new CppCompiler();
    }

    /**
     * Loads and executes a JS script in "One-Shot" mode.
     * @param {File} file - The .js or .cpp file
     * @param {ImageData} imageData - The local image data
     */
    async executeOneShot(file, imageData) {
        if (file.name.endsWith('.js')) {
            return this._executeJsOneShot(file, imageData);
        } else if (file.name.endsWith('.cpp') || file.name.endsWith('.c')) {
            return this._executeCppOneShot(file, imageData);
        } else if (file.name.endsWith('.wasm')) {
            return this._executeWasmOneShot(file, imageData);
        } else {
             throw new Error("Unsupported file type. Please use .js, .cpp, .c or .wasm");
        }
    }

    async _executeWasmOneShot(file, imageData) {
        const arrayBuffer = await file.arrayBuffer();
        return this._runWasm(arrayBuffer, imageData);
    }

    async _executeCppOneShot(file, imageData) {
        const sourceCode = await file.text();
        
        // 1. Compile
        let wasmBinary;
        try {
            wasmBinary = await this.cppCompiler.compile(sourceCode);
        } catch (e) {
            // Robust error handling
            let errorMsg = 'Unknown Error';
            if (e && typeof e.message === 'string') {
                errorMsg = e.message;
            } else if (e instanceof Event && e.type === 'error') {
                errorMsg = "Worker Initialization Failed (Check Console)";
            } else if (typeof e === 'string') {
                errorMsg = e;
            } else {
                errorMsg = JSON.stringify(e);
            }

            const msg = errorMsg.includes('Failed to load') 
                ? 'Compiler Backend Missing!\nPlease check Asset/Lib/Clang/README.txt' 
                : errorMsg;
            throw new Error(`Compilation Failed:\n${msg}`);
        }

        return this._runWasm(wasmBinary, imageData);
    }

    async _runWasm(wasmBinary, imageData) {
        // 2. Instantiate
        // Create memory large enough for the image
        // 1 Page = 64KB
        const imageByteSize = imageData.width * imageData.height * 4;
        const requiredPages = Math.ceil(imageByteSize / (64 * 1024)) + 2; // +2 for stack/safety
        
        const memory = new WebAssembly.Memory({ initial: requiredPages });
        // Create table for function pointers (indirect calls)
        const table = new WebAssembly.Table({ initial: 0, element: 'anyfunc' });
        
        try {
            const module = await WebAssembly.instantiate(wasmBinary, {
                env: {
                    memory: memory,
                    __linear_memory: memory, // Alias for compatibility with different linkers
                    __indirect_function_table: table,
                    table: table
                }
            });

            const exports = module.instance.exports;
            if (typeof exports.applyFilter !== 'function') {
                throw new Error("Wasm module must export 'applyFilter(pointer, width, height)'");
            }

            // 3. Copy Data In
            const offset = 0;
            const heap = new Uint8Array(memory.buffer);
            heap.set(imageData.data, offset);

            // 4. Run C++ Function
            // void applyFilter(uint8_t* data, int width, int height)
            exports.applyFilter(offset, imageData.width, imageData.height);

            // 5. Copy Data Out
            const resultData = new Uint8ClampedArray(heap.slice(offset, offset + imageByteSize));
            
            return {
                img: new ImageData(resultData, imageData.width, imageData.height),
                vectors: []
            };

        } catch (e) {
            throw new Error(`Runtime Error: ${e.message}`);
        }
    }

    async _executeJsOneShot(file, imageData) {
        const text = await file.text();
        
        // Dynamic Import from Blob URL to load user script
        const blob = new Blob([text], { type: 'text/javascript' });
        const url = URL.createObjectURL(blob);
        
        try {
            const module = await import(url);
            if (typeof module.apply !== 'function') {
                throw new Error("JS Plugin must export an 'apply(data, width, height)' function.");
            }
            
            // In JS mode, we pass the Uint8ClampedArray directly, not a pointer
            const dataCopy = new Uint8ClampedArray(imageData.data);
            
            // Execution
            // Support return type: ImageData OR { img: ImageData, vectors: [...] }
            const result = module.apply(dataCopy, imageData.width, imageData.height);
            
            // Check if result is a complex object or just undefined (in-place modification assumed)
            if (result && (result.img || result.vectors)) {
                 // Complex Return
                 return {
                     img: result.img ? result.img : new ImageData(dataCopy, imageData.width, imageData.height),
                     vectors: result.vectors || []
                 };
            } else if (result instanceof ImageData) {
                 return { img: result, vectors: [] };
            }

            // Default: Assume in-place modification of dataCopy
            return { 
                img: new ImageData(dataCopy, imageData.width, imageData.height),
                vectors: []
            };
            
        } finally {
            URL.revokeObjectURL(url);
        }
    }


}

