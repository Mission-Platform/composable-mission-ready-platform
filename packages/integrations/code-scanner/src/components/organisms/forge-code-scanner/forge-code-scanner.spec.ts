// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { toReactComponent } from '../../../../../forge/src/adapters/react';

import { ForgeCodeScanner } from './forge-code-scanner';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@mission-platform/forge-jsx', async (importOriginal) => {
  const actual = await importOriginal();
  const react = await import('react');
  const neutral = await import('../../../../../forge/src/runtime');
  return {
    ...actual,
    Dynamic: neutral.Dynamic,
    Fragment: neutral.Fragment,
    HtmlContent: neutral.HtmlContent,
    h: neutral.h,
    useEffect: react.useEffect,
    useRef: react.useRef,
    useState: react.useState,
  };
});

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function streamWithTrack(): { stream: MediaStream; stop: ReturnType<typeof vi.fn> } {
  const stop = vi.fn();
  const track = { stop } as unknown as MediaStreamTrack;
  const stream = { getTracks: () => [track] } as unknown as MediaStream;
  return { stream, stop };
}

const ReactCodeScanner = toReactComponent(ForgeCodeScanner, 'ForgeCodeScanner');
let root: Root | undefined;

afterEach(() => {
  root?.unmount();
  root = undefined;
  vi.restoreAllMocks();
});

describe('ForgeCodeScanner camera lifecycle', () => {
  it('stops a superseded stream and cleans the active stream on unmount', async () => {
    const first = deferred<MediaStream>();
    const second = deferred<MediaStream>();
    const firstStream = streamWithTrack();
    const secondStream = streamWithTrack();
    const getUserMedia = vi
      .fn<() => Promise<MediaStream>>()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } });
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();

    const container = document.createElement('div');
    root = createRoot(container);
    await act(async () => {
      root?.render(createElement(ReactCodeScanner, { showFileUpload: false }));
    });

    const startButton = container.querySelector('button');
    expect(startButton).not.toBeNull();
    await act(async () => {
      startButton?.click();
      startButton?.click();
    });
    expect(getUserMedia).toHaveBeenCalledTimes(2);

    await act(async () => {
      first.resolve(firstStream.stream);
      await first.promise;
    });
    expect(firstStream.stop).toHaveBeenCalledTimes(1);

    await act(async () => {
      second.resolve(secondStream.stream);
      await second.promise;
    });
    expect(secondStream.stop).not.toHaveBeenCalled();

    root.unmount();
    root = undefined;
    expect(secondStream.stop).toHaveBeenCalledTimes(1);
  });

  it('stops an acquired stream when the user presses stop', async () => {
    const request = Promise.resolve(streamWithTrack());
    const acquired = await request;
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn().mockResolvedValue(acquired.stream) },
    });
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();

    const container = document.createElement('div');
    root = createRoot(container);
    await act(async () => {
      root?.render(createElement(ReactCodeScanner, { showFileUpload: false }));
    });
    await act(async () => {
      container.querySelector('button')?.click();
      await Promise.resolve();
    });

    const buttons = [...container.querySelectorAll('button')];
    buttons.at(-1)?.click();
    expect(acquired.stop).toHaveBeenCalledTimes(1);
  });
});
