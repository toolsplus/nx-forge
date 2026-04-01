import { clearLine, cursorTo } from 'node:readline';

/**
 * Writes an informational message without inheriting any non-zero cursor
 * offset left behind by other interactive tools running in the same terminal.
 *
 * On TTYs we clear the current line, return the cursor to column 0, and
 * normalize embedded newlines to CRLF so each rendered line starts at the
 * beginning of the terminal row. On non-TTY outputs we write the message
 * directly to stdout without the terminal control sequences.
 *
 * @param message Informational message to print
 */
export function logTerminalInfo(message: string): void {
  if (!process.stdout.isTTY) {
    process.stdout.write(`${message}\n`);
    return;
  }

  clearLine(process.stdout, 0);
  cursorTo(process.stdout, 0);
  process.stdout.write(`${message.replace(/\r?\n/g, '\r\n')}\n`);
}
