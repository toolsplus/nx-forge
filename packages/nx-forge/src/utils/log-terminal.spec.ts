import * as readline from 'node:readline';

import { logTerminalInfo } from './log-terminal';

jest.mock('node:readline', () => ({
  clearLine: jest.fn(),
  cursorTo: jest.fn(),
}));

describe('logTerminalInfo', () => {
  const isTTYDescriptor = Object.getOwnPropertyDescriptor(
    process.stdout,
    'isTTY'
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();

    if (isTTYDescriptor) {
      Object.defineProperty(process.stdout, 'isTTY', isTTYDescriptor);
    }
  });

  it('should write directly to stdout when stdout is not a TTY', () => {
    Object.defineProperty(process.stdout, 'isTTY', {
      configurable: true,
      value: false,
    });
    const writeSpy = jest
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);

    logTerminalInfo('Hello');

    expect(writeSpy).toHaveBeenCalledWith('Hello\n');
  });

  it('should reset the cursor and normalize multiline output on TTYs', () => {
    Object.defineProperty(process.stdout, 'isTTY', {
      configurable: true,
      value: true,
    });

    const clearLineSpy = jest.spyOn(readline, 'clearLine');
    const cursorToSpy = jest.spyOn(readline, 'cursorTo');
    const writeSpy = jest
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);

    logTerminalInfo('First line\nSecond line');

    expect(clearLineSpy).toHaveBeenCalledWith(process.stdout, 0);
    expect(cursorToSpy).toHaveBeenCalledWith(process.stdout, 0);
    expect(writeSpy).toHaveBeenCalledWith('First line\r\nSecond line\n');
  });
});
