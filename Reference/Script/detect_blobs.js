// Feature Detection Script
// 1. Detects bright 'blobs' in the image (Simple Threshold + Connected Components)
// 2. Draws bounding box vectors around them

export function apply(data, width, height) {
    const outputVectors = [];
    const threshold = 200; // Brightness Threshold (0-255)

    // Helper: Grayscale conversion
    const getBrightness = (r, g, b) => 0.299*r + 0.587*g + 0.114*b;

    // 1. Binarize (Virtual, using visited array)
    const visited = new Uint8Array(width * height);
    
    // Connected Components - BFS
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x);
            if (visited[idx]) continue;
            
            const px = idx * 4;
            const b = getBrightness(data[px], data[px+1], data[px+2]);

            // If bright pixel found, start flood fill
            if (b > threshold) {
                const blob = { minX: x, maxX: x, minY: y, maxY: y, count: 0 };
                const stack = [x, y];
                visited[idx] = 1;
                
                while(stack.length > 0) {
                    const cy = stack.pop();
                    const cx = stack.pop();
                    
                    blob.count++;
                    if (cx < blob.minX) blob.minX = cx;
                    if (cx > blob.maxX) blob.maxX = cx;
                    if (cy < blob.minY) blob.minY = cy;
                    if (cy > blob.maxY) blob.maxY = cy;
                    
                    // Neighbors
                    const neighbors = [
                        [cx+1, cy], [cx-1, cy], [cx, cy+1], [cx, cy-1]
                    ];
                    
                    for(let n of neighbors) {
                        const nx = n[0], ny = n[1];
                        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                            const nIdx = ny * width + nx;
                            if (!visited[nIdx]) {
                                const off = nIdx * 4;
                                const nb = getBrightness(data[off], data[off+1], data[off+2]);
                                if (nb > threshold) {
                                    visited[nIdx] = 1;
                                    stack.push(nx, ny);
                                }
                            }
                        }
                    }
                } // End BFS

                // Detect if blob is significant
                if (blob.count > 50) { // Ignore noise < 50 pixels
                    outputVectors.push({
                        type: 'rect',
                        properties: {
                            x: blob.minX,
                            y: blob.minY,
                            width: blob.maxX - blob.minX,
                            height: blob.maxY - blob.minY,
                            stroke: '#00ff00',
                            strokeWidth: 2,
                            fill: 'none'
                        }
                    });
                }
            }
        }
    }

    // Return extended format
    return {
        // We can return null/undefined for img if we didn't modify it, but let's return it to be safe.
        // Or we can modify 'data' to highlight detected pixels. 
        // Let's leave image untouched.
        img: null, 
        vectors: outputVectors
    };
}
