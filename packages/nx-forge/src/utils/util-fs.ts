import { PathLike, statSync } from 'fs';

/**
 * Check if a directory exists
 * @param path Path to directory
 */
export const directoryExists = (path: PathLike): boolean => {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
};
