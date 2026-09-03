import { afterEach, describe, expect, it, vi } from 'vitest';

import { scannerLog, setCodeScannerDebug } from './debug';

describe('scannerLog', () => {
  afterEach(() => {
    setCodeScannerDebug(false);
    vi.restoreAllMocks();
  });

  it('does not call the console when debug logging is disabled', () => {
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => {});

    setCodeScannerDebug(false);
    scannerLog('ignored');

    expect(debug).not.toHaveBeenCalled();
  });

  it('forwards messages when debug logging is enabled', () => {
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => {});

    setCodeScannerDebug(true);
    scannerLog('visible', { value: 1 });

    expect(debug).toHaveBeenCalledWith('[code-scanner]', 'visible', { value: 1 });
  });
});
