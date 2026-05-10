/* =========================================
   Collaboration Configuration
   ========================================= */

export const COLLAB_DEFAULTS = {
    /** Default WebSocket server URL */
    SERVER_URL: 'ws://localhost:4444',

    /** Reconnection settings */
    RECONNECT_INTERVAL: 2000,
    MAX_RECONNECT_ATTEMPTS: 10,

    /** Bitmap layer lock timeout (ms) - auto-release if user goes inactive */
    BITMAP_LOCK_TIMEOUT: 60000,

    /** How often to send bitmap preview while editing (ms) */
    BITMAP_PREVIEW_INTERVAL: 500,

    /** Preview quality (0-1, JPEG quality for preview thumbnails) */
    BITMAP_PREVIEW_QUALITY: 0.3,

    /** Preview max dimension (pixels, for downscaled preview) */
    BITMAP_PREVIEW_MAX_DIM: 256,

    /** 
     * User colors for presence — matches theme.css standard palette (100% opacity).
     * Order: blue, green, red, yellow, purple, cyan, orange
     */
    USER_COLORS: [
        'rgba(53, 115, 240, 1)',   /* blue   */
        'rgba(95, 173, 101, 1)',   /* green  */
        'rgba(219, 92, 92, 1)',    /* red    */
        'rgba(242, 197, 92, 1)',   /* yellow */
        'rgba(149, 90, 224, 1)',   /* purple */
        'rgba(36, 163, 148, 1)',   /* cyan   */
        'rgba(224, 136, 85, 1)',   /* orange */
    ],

    /** Awareness update throttle (ms) */
    AWARENESS_THROTTLE: 50
};
