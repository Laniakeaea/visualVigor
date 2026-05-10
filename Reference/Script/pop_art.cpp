extern "C" {

/**
 * Applies a Pop-Art effect by splitting the image into 4 quadrants.
 * Each quadrant applies a different color transformation.
 *
 * Q1 (Top-Left):  Red Channel Only
 * Q2 (Top-Right): Inverted Colors
 * Q3 (Bot-Left):  Blue Tint / Threshold
 * Q4 (Bot-Right): Grayscale
 *
 * @param data RGBA pixel data
 * @param width Image width
 * @param height Image height
 */
void applyFilter(unsigned char* data, int width, int height) {
    int halfW = width / 2;
    int halfH = height / 2;
    
    for (int y = 0; y < height; y++) {
        for (int x = 0; x < width; x++) {
            int idx = (y * width + x) * 4;
            
            unsigned char r = data[idx];
            unsigned char g = data[idx+1];
            unsigned char b = data[idx+2];
            
            // Determine Quadrant
            int qx = (x >= halfW);
            int qy = (y >= halfH);
            
            // Logic per quadrant
            if (qx == 0 && qy == 0) {
                // Top-Left: Red Boost
                data[idx]   = (r > 100) ? 255 : r * 2;
                data[idx+1] = 0;
                data[idx+2] = 0;
            } 
            else if (qx == 1 && qy == 0) {
                // Top-Right: Invert
                data[idx]   = 255 - r;
                data[idx+1] = 255 - g;
                data[idx+2] = 255 - b;
            } 
            else if (qx == 0 && qy == 1) {
                // Bottom-Left: Posterize Blue
                data[idx]   = 0;
                data[idx+1] = (g > 128) ? 255 : 0;
                data[idx+2] = (b > 128) ? 255 : 128;
            } 
            else {
                // Bottom-Right: Grayscale
                unsigned char avg = (unsigned char)((r + g + b) / 3);
                data[idx]   = avg;
                data[idx+1] = avg;
                data[idx+2] = avg;
            }
            
            // data[idx+3] (Alpha) is preserved
        }
    }
}

}
