import { afterEach, describe, expect, it, vi } from 'vitest';

import { videoFrameToImageData } from './capture';

interface MockContext {
  canvas: MockCanvas;
  drawImage: ReturnType<typeof vi.fn>;
  getImageData: ReturnType<typeof vi.fn>;
}

interface MockCanvas {
  width: number;
  height: number;
  context: MockContext;
  getContext: ReturnType<typeof vi.fn>;
}

describe('videoFrameToImageData', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reuses and resizes the capture canvas and context', () => {
    const canvases: MockCanvas[] = [];

    class MockOffscreenCanvas implements MockCanvas {
      public width: number;
      public height: number;
      public readonly context: MockContext;
      public readonly getContext = vi.fn(() => this.context);

      public constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
        this.context = {
          canvas: this,
          drawImage: vi.fn(),
          getImageData: vi.fn((_x: number, _y: number, imageWidth: number, imageHeight: number) => ({
            width: imageWidth,
            height: imageHeight,
            data: new Uint8ClampedArray(imageWidth * imageHeight * 4),
          })),
        };
        canvases.push(this);
      }
    }

    vi.stubGlobal('OffscreenCanvas', MockOffscreenCanvas);

    expect(() => videoFrameToImageData({ videoWidth: 0, videoHeight: 0 } as HTMLVideoElement)).toThrow(
      'The video has no frame data yet (is the stream still starting?).',
    );

    const firstFrame = videoFrameToImageData({ videoWidth: 100, videoHeight: 50 } as HTMLVideoElement, 1);
    const secondFrame = videoFrameToImageData({ videoWidth: 100, videoHeight: 50 } as HTMLVideoElement, 1);
    const resizedFrame = videoFrameToImageData({ videoWidth: 2000, videoHeight: 1000 } as HTMLVideoElement, 1);

    expect(canvases).toHaveLength(1);
    expect(canvases[0]?.getContext).toHaveBeenCalledTimes(1);
    expect(firstFrame).toMatchObject({ width: 100, height: 50 });
    expect(secondFrame).toMatchObject({ width: 100, height: 50 });
    expect(resizedFrame).toMatchObject({ width: 1600, height: 800 });
    expect(canvases[0]).toMatchObject({ width: 1600, height: 800 });
  });
});
