// C++ Plugin Example for VisualVigor
// Requires In-Browser Compilation Support

// Note: Standard types like uint8_t are assumed to be available
// or you can include <stdint.h> if the compiler environment supports standard headers.
// For raw Wasm without stdlib, we use basic types.

extern "C" {

/**
 * Inverts the colors of the image.
 * This function will be compiled to WebAssembly.
 *
 * @param data Pointer to the RGBA pixel array (in Wasm memory)
 * @param width Image width in pixels
 * @param height Image height in pixels
 */
void applyFilter(unsigned char* data, int width, int height) {
    int totalBytes = width * height * 4;
    
    // Efficient linear traversal
    // C++ compilers (like Clang with -O3) can often SIMD-optimize loops like this automatically
    for (int i = 0; i < totalBytes; i += 4) {
        data[i]     = 255 - data[i];     // Red
        data[i + 1] = 255 - data[i + 1]; // Green
        data[i + 2] = 255 - data[i + 2]; // Blue
        // data[i + 3] is Alpha, keep unchanged
    }
}

}
