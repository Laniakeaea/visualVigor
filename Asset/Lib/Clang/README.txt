Important: Missing Compiler Files
=================================

To enable real C++ compilation in the browser, you must download the Clang WebAssembly binaries and place them in this folder.

Required Files:
1. clang.js
2. clang.wasm

Where to get them?
------------------
We recommend using the build from `tbfleming/cib` (Clang In Browser).

Download Links:
- clang.js:   https://tbfleming.github.io/cib/clang.js
- clang.wasm: https://tbfleming.github.io/cib/clang.wasm

Instructions:
1. Download `clang.js` and `clang.wasm` from the links above.
2. Place them precisely in this folder: 
   `VisualVigorWeb0.8.0ReDev/Asset/Lib/Clang/`
3. Ensure the filenames match exactly.

Note:
The worker script (`cppCompiler.worker.js`) expects these specific files.
