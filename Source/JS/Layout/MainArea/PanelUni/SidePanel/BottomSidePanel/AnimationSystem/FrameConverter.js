export class FrameConverter {
    constructor(config) {
        this.config = config;
    }

    frameToPx(frame) {
        const framePxUnit = this.config.frameMajorPx / this.config.framesPerMajor;
        return (frame + this.config.frameOriginOffsetFrames) * framePxUnit;
    }

    pxToFrame(px) {
        const framePxUnit = this.config.frameMajorPx / this.config.framesPerMajor;
        const f = (px / framePxUnit) - this.config.frameOriginOffsetFrames;
        return Math.max(0, f);
    }

    getPxPerFrame() {
        return this.config.frameMajorPx / this.config.framesPerMajor;
    }
}
