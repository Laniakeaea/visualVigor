export class AnimationConfig {
    constructor() {
        this.frameMajorPx = 100;
        this.frameMinorPx = 50;
        this.framesPerMajor = 10;
        this.frameOriginOffsetFrames = 2;
    }

    updateZoom(deltaY) {
        const zoomFactor = deltaY > 0 ? 0.9 : 1.1;
        const newMajor = Math.max(80, Math.min(800, this.frameMajorPx * zoomFactor));
        this.frameMajorPx = newMajor;
        this.frameMinorPx = newMajor / 2;
    }
}
