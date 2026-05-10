extern "C" {

/**
 * Applies a Black & White Threshold effect.
 * Converts image to binary black/white based on luminance.
 *
 * @param data RGBA pixel data
 * @param width Image width
 * @param height Image height
 */
void applyFilter(unsigned char* data, int width, int height) {
    int totalPixels = width * height;
    const unsigned char THRESHOLD = 128;
    
    for (int i = 0; i < totalPixels; i++) {
        int idx = i * 4;
        unsigned char r = data[idx];
        unsigned char g = data[idx+1];
        unsigned char b = data[idx+2];
        
        // Luminance formula (human perception)
        // Y = 0.299R + 0.587G + 0.114B
        int luminance = (int)(0.299f * r + 0.587f * g + 0.114f * b);
        
        unsigned char val = (luminance > THRESHOLD) ? 255 : 0;
        
        data[idx]   = val;
        data[idx+1] = val;
        data[idx+2] = val;
    }
}

}
