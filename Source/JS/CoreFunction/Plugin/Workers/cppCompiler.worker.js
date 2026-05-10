/*
 * CPP Compiler Worker
 * Uses a real Clang Wasm backend (Emscripten-compiled).
 * 
 * Requires: /Asset/Lib/Clang/clang.js and /Asset/Lib/Clang/clang.wasm
 */

// Dynamically determine root path to handle subfolder deployment
function getPaths() {
    // Expected location: .../Source/JS/CoreFunction/Plugin/Workers/cppCompiler.worker.js
    // We need to go up 6 levels to get to Root
    // [Source, JS, CoreFunction, Plugin, Workers, filename]
    
    const parts = self.location.href.split('/');
    // Remove the filename
    parts.pop(); 
    // Remove Workers
    parts.pop();
    // Remove Plugin
    parts.pop();
    // Remove CoreFunction
    parts.pop();
    // Remove JS
    parts.pop();
    // Remove Source
    parts.pop();
    
    const root = parts.join('/') + '/';
    const lib = root + 'Asset/Lib/Clang/';
    
    return {
        js: lib + 'clang.js',
        wasm: lib + 'clang.wasm'
    };
}

const PATHS = getPaths();
console.log('[CppWorker] Computed Paths:', PATHS);

const CLANG_JS_URL = PATHS.js;

let clangModule = null;

// Timeout helper
const timeout = (ms) => new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms));

/**
 * Loads the Clang Emscripten Module
 */
function loadClang() {
    return new Promise((resolve, reject) => {
        if (clangModule) return resolve(true);

        // Safety timeout for initialization (10 seconds)
        const initTimeout = setTimeout(() => {
            reject(new Error("Clang Runtime Initialization Timed Out (10s). Check console to see if clang.wasm 404s."));
        }, 10000);

        // Setup the Module object for Emscripten
        const config = {
            noInitialRun: true, // Start properly without running main() immediately
            print: function(text) { 
                console.log('[Clang stdout]: ' + text); 
            },
            printErr: function(text) { 
                console.error('[Clang stderr]: ' + text); 
            },
            onRuntimeInitialized: function() {
                // This callback is used by some Emscripten versions
                console.log('Clang Wasm Runtime Initialized (Callback)');
                clearTimeout(initTimeout);
                
                // CRITICAL FIX: If instance is undefined, Emscripten mutated 'config' to be the Module.
                // Do NOT use self.Module if it is the factory function.
                if (instance) {
                    clangModule = instance;
                } else {
                    clangModule = config;
                }
                
                console.log('Module keys:', Object.keys(clangModule));
                console.log('Has FS?', !!clangModule.FS);
                console.log('Has callMain?', !!clangModule.callMain);

                // Do NOT resolve with clangModule directly, as it might be a "Thenable" 
                // that conflicts with our manual Promise if Emscripten's internal promise logic is active.
                // Just resolve true/void to signal "we are done waiting".
                resolve(true);
            },
            locateFile: function(path, prefix) {
                if (path.endsWith('.wasm')) {
                    console.log('[CppWorker] Locating Wasm:', PATHS.wasm);
                    return PATHS.wasm;
                }
                return prefix + path;
            }
        };

        try {
            console.log('Loading Clang JS from:', CLANG_JS_URL);
            importScripts(CLANG_JS_URL);

            // clang.js (tbfleming/cib) is a Factory Function "var Module = function..."
            // We must call it to initialize.
            if (typeof Module !== 'function') {
                throw new Error('clang.js loaded but "Module" is not a function. Content mismatch?');
            }

            // Call the factory with our config
            // Note: instance might be the module, or a Promise
            var instance = Module(config);
            
            // Handle Promise return (Newer Emscripten)
            if (instance instanceof Promise) {
                instance.then(mod => {
                    console.log('Clang Wasm Runtime Initialized (Promise)');
                    clearTimeout(initTimeout);
                    clangModule = mod;
                    resolve(true);
                }).catch(err => {
                    clearTimeout(initTimeout);
                    reject(new Error("Clang Factory Promise Failed: " + err));
                });
            } 
            // Older Emscripten: Returns Module object immediately (or undefined), 
            // and calls onRuntimeInitialized later.
            else {
                console.log('Module factory returned non-promise. Waiting for onRuntimeInitialized...');
                // We keep the timeout active.
            }

        } catch (e) {
            clearTimeout(initTimeout);
            reject(new Error(
                `Failed to load clang.js from ${CLANG_JS_URL}.\n` + 
                `Error: ${e.message}`
            ));
        }
    });
}

self.onmessage = async (e) => {
    const { type, requestId, source } = e.data;
    console.log(`[CppWorker] Received message: ${type}, ID: ${requestId}`);

    // Acknowledge Ready Check
    if (type === 'CHECK_READY') {
        const isReady = (clangModule !== null);
        self.postMessage({ type: 'READY_STATUS', status: isReady });
        return;
    }

    if (type === 'COMPILE') {
        try {
            await loadClang();
            const Module = clangModule;
            
            // Safety check for Module
            if (!Module) throw new Error("Clang Module is null after loadClang()");
            
            const FS = Module.FS;
            if (!FS) throw new Error("Module.FS is undefined");
            
            // 1. Filesystem Setup
            const srcName = 'input.cpp';
            const outName = 'output.wasm';
            
            try {
                // Simplified cleanup: Just use unlink and ignore errors if file doesn't exist
                try { FS.unlink(srcName); } catch(e) {}
                try { FS.unlink(outName); } catch(e) {}
            } catch (fsErr) {
                // Ignore cleanup errors
            }

            FS.writeFile(srcName, source);

            // 2. Compile Command
            // The specific build from tbfleming/cib appears to use a custom driver 
            // that accepts ONLY input and output filenames, ignoring standard Clang flags.
            // It presumably defaults to -target=wasm32 and other necessary settings.
            const args = [srcName, outName];

            console.log('[CppWorker] Compiling...');
            
            // 3. Execution
            // Ensure callMain exists (standard Emscripten)
            if (!Module.callMain) {
                throw new Error("Module.callMain is not defined. The clang.js loaded might be incompatible.");
            }
            
            // Capture stdout/stderr/exitCode 
            // Note: callMain throws ExitStatus in some versions, or returns it in others.
            let exitCode = 0;
            try {
                const res = Module.callMain(args);
                // If it returns undefined (void main), assume 0
                if (typeof res === 'number') exitCode = res;
            } catch (e) {
                if (e instanceof Module.ExitStatus || (e && e.name === 'ExitStatus')) {
                     exitCode = e.status;
                } else if (e && e.status !== undefined) {
                     exitCode = e.status;
                } else if (typeof e === 'number') {
                     exitCode = e;
                // 'quit' being thrown is standard Emscripten behavior for exit()
                } else if (e && e.message === 'unreachable') {
                     // Sometimes thrown on successful exit in minimal runtimes
                     exitCode = 0;
                } else {
                     throw e;
                }
            }

            // 4. Result Handling
            // Check if output file exists regardless of exit code (since void main returns undefined)
            if (FS.analyzePath(outName).exists) {
                const wasmBinary = FS.readFile(outName);
                self.postMessage({ 
                    type: 'COMPILE_SUCCESS', 
                    requestId, 
                    data: wasmBinary 
                });
            } else {
                throw new Error(`Compilation failed (Exit Code: ${exitCode}). check console for stderr details.`);
            }

        } catch (err) {
            self.postMessage({ 
                type: 'COMPILE_ERROR', 
                requestId, 
                error: err.message 
            });
        }
    }
};

// Initial Signal
self.postMessage({ type: 'READY' });
