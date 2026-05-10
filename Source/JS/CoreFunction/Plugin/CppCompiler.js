export class CppCompiler {
    constructor() {
        this.worker = null;
        this.isReady = false;
        this.readyPromise = null;
    }

    init() {
        if (this.readyPromise) return this.readyPromise;

        this.readyPromise = new Promise((resolve, reject) => {
            if (window.Worker) {
                // In a real scenario, this worker file would load clang.wasm
                this.worker = new Worker('/Source/JS/CoreFunction/Plugin/Workers/cppCompiler.worker.js');
                
                this.worker.onmessage = (e) => {
                    const { type, data, error } = e.data;
                    if (type === 'READY') {
                        this.isReady = true;
                        resolve(true);
                    } else if (type === 'ERROR') {
                        console.error('Compiler Worker Error:', error);
                    }
                };

                this.worker.onerror = (err) => {
                    console.error('Compiler Worker Initialization Failed:', err);
                    reject(err);
                };
            } else {
                reject(new Error('Web Workers not supported'));
            }
        });

        return this.readyPromise;
    }

    async compile(sourceCode) {
        if (!this.isReady) {
            await this.init();
        }

        return new Promise((resolve, reject) => {
            const id = Math.random().toString(36).substr(2, 9);
            
            // Add Timeout (60 Seconds - Clang can be slow)
            const timer = setTimeout(() => {
                this.worker.removeEventListener('message', handleMessage);
                reject(new Error('Compilation Timed Out (60s). Worker did not respond.'));
            }, 60000);

            const handleMessage = (e) => {
                const { type, requestId, data, error } = e.data;
                if (requestId !== id) return;

                clearTimeout(timer); // Clear timeout on response

                if (type === 'COMPILE_SUCCESS') {
                    this.worker.removeEventListener('message', handleMessage);
                    resolve(data); // Returns Wasm Binary
                } else if (type === 'COMPILE_ERROR') {
                    this.worker.removeEventListener('message', handleMessage);
                    reject(new Error(error));
                }
            };

            this.worker.addEventListener('message', handleMessage);
            
            this.worker.postMessage({
                type: 'COMPILE',
                requestId: id,
                source: sourceCode
            });
        });
    }
}
