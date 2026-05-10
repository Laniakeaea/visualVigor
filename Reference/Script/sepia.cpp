extern "C" {

/**
 * Applies a Sepia Tone effect to the image.
 * Uses floating point arithmetic for color mixing.
 *
 * @param data RGBA pixel data
 * @param width Image width
 * @param height Image height
 */
void applyFilter(unsigned char* data, int width, int height) {
    int totalPixels = width * height;
    
    for (int i = 0; i < totalPixels; i++) {
        int offset = i * 4;
        unsigned char r = data[offset];
        unsigned char g = data[offset + 1];
        unsigned char b = data[offset + 2];
        // data[offset + 3] is Alpha, leave unchanged

        // Standard Sepia Formula
        float tr = 0.393f * r + 0.769f * g + 0.189f * b;
        float tg = 0.349f * r + 0.686f * g + 0.168f * b;
        float tb = 0.272f * r + 0.534f * g + 0.131f * b;

        // Clamp values to 255
        if (tr > 255.0f) tr = 255.0f;
        if (tg > 255.0f) tg = 255.0f;
        if (tb > 255.0f) tb = 255.0f;

        data[offset]     = (unsigned char)tr;
        data[offset + 1] = (unsigned char)tg;
        data[offset + 2] = (unsigned char)tb;
    }
}

}
