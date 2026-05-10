// JavaScript "Plugin" for VisualVigor
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
