extern "C" {

/**
 * Applies a Pixelate (Mosaic) effect.
 * Processes the image in 10x10 blocks and fills each block with its average color.
 *
 * @param data RGBA pixel data
 * @param width Image width
 * @param height Image height
 */
void applyFilter(unsigned char* data, int width, int height) {
    const int BLOCK_SIZE = 15;
    
    for (int y = 0; y < height; y += BLOCK_SIZE) {
        for (int x = 0; x < width; x += BLOCK_SIZE) {
            
            int rSum = 0, gSum = 0, bSum = 0;
            int count = 0;

            // 1. Calculate Average for the block
            for (int ay = 0; ay < BLOCK_SIZE; ay++) {
                int cy = y + ay;
                if (cy >= height) break;

                for (int ax = 0; ax < BLOCK_SIZE; ax++) {
                    int cx = x + ax;
                    if (cx >= width) break;

                    int idx = (cy * width + cx) * 4;
                    rSum += data[idx];
                    gSum += data[idx+1];
                    bSum += data[idx+2];
                    count++;
                }
            }

            if (count == 0) continue;

            unsigned char avgR = (unsigned char)(rSum / count);
            unsigned char avgG = (unsigned char)(gSum / count);
            unsigned char avgB = (unsigned char)(bSum / count);

            // 2. Fill the block
            for (int ay = 0; ay < BLOCK_SIZE; ay++) {
                int cy = y + ay;
                if (cy >= height) break;

                for (int ax = 0; ax < BLOCK_SIZE; ax++) {
                    int cx = x + ax;
                    if (cx >= width) break;

                    int idx = (cy * width + cx) * 4;
                    data[idx]   = avgR;
                    data[idx+1] = avgG;
                    data[idx+2] = avgB;
                    // Keep original Alpha for shape retention
                }
            }
        }
    }
}

}
