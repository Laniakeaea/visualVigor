extern "C" {

/**
 * Generates a Mandelbrot Set fractal.
 * Completely replaces the existing image content.
 * 
 * Demonstrates heavy floating-point computation performance in Wasm.
 *
 * @param data RGBA pixel data
 * @param width Image width
 * @param height Image height
 */
void applyFilter(unsigned char* data, int width, int height) {
    const int MAX_ITER = 100;
    
    // Graph range
    const float minX = -2.5f;
    const float maxX = 1.0f;
    const float minY = -1.0f;
    const float maxY = 1.0f;
    
    const float wScale = (maxX - minX) / width;
    const float hScale = (maxY - minY) / height;

    for (int y = 0; y < height; y++) {
        for (int x = 0; x < width; x++) {
            
            // Map pixel coordinate to complex plane
            float cx = minX + x * wScale;
            float cy = minY + y * hScale;
            
            float a = 0.0f;
            float b = 0.0f;
            int iter = 0;
            
            // z = z^2 + c
            while ((iter < MAX_ITER) && ((a*a + b*b) < 4.0f)) {
                float temp = a*a - b*b + cx;
                b = 2.0f * a * b + cy;
                a = temp;
                iter++;
            }
            
            int idx = (y * width + x) * 4;
            
            if (iter == MAX_ITER) {
                // Inside the set: Black
                data[idx]   = 0;
                data[idx+1] = 0;
                data[idx+2] = 0;
                data[idx+3] = 255;
            } else {
                // Outside: Color based on iteration count
                // Simple psychedelic palette
                data[idx]   = (iter * 8) % 256;      // R
                data[idx+1] = (iter * 4) % 256;      // G
                data[idx+2] = (iter * 12) % 256;     // B
                data[idx+3] = 255;
            }
        }
    }
}

}
