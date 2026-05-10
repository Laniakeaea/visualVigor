extern "C" {

/**
 * Applies random RGB noise (TV Static effect).
 * Implementation uses a simple Linear Congruential Generator (LCG)
 * since the standard library rand() is not available.
 *
 * @param data RGBA pixel data
 * @param width Image width
 * @param height Image height
 */
void applyFilter(unsigned char* data, int width, int height) {
    // Seed for LCG
    unsigned int seed = 123456789;
    
    // Process every pixel
    int totalPixels = width * height;
    
    for (int i = 0; i < totalPixels; i++) {
        int idx = i * 4;
        
        // Generate pseudo-random noise for each channel
        // LCG Formula: seed = (a * seed + c) % m
        // We rely on unsigned int overflow for modulo 2^32
        
        seed = seed * 1664525 + 1013904223;
        int noiseR = (int)((seed >> 16) & 0xFF) - 128; // Range -128 to 127
        
        seed = seed * 1664525 + 1013904223;
        int noiseG = (int)((seed >> 16) & 0xFF) - 128;
        
        seed = seed * 1664525 + 1013904223;
        int noiseB = (int)((seed >> 16) & 0xFF) - 128; // Typo in noise source fixed
        
        // Intensity of noise (scale down)
        noiseR /= 4;
        noiseG /= 4;
        noiseB /= 4;

        int r = data[idx]   + noiseR;
        int g = data[idx+1] + noiseG;
        int b = data[idx+2] + noiseB;
        
        // Clamp result
        if (r < 0) r = 0; if (r > 255) r = 255;
        if (g < 0) g = 0; if (g > 255) g = 255;
        if (b < 0) b = 0; if (b > 255) b = 255;
        
        data[idx]   = (unsigned char)r;
        data[idx+1] = (unsigned char)g;
        data[idx+2] = (unsigned char)b;
    }
}

}
