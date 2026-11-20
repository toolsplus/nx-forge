import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import {
  findMissingModules,
  verifyBundleCompleteness,
} from './verify-bundle-completeness';

describe('bundle completeness', () => {
  let bundlePath: string;

  const writeBundleFile = (path: string, contents: string) => {
    const filePath = join(bundlePath, path);
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, contents);
  };

  beforeEach(() => {
    bundlePath = join(
      mkdtempSync(join(tmpdir(), 'nx-forge-bundle-')),
      'bundle'
    );
    mkdirSync(bundlePath);
  });

  afterEach(() => {
    rmSync(dirname(bundlePath), { recursive: true, force: true });
  });

  describe('findMissingModules', () => {
    it('should accept a bundle that loads only Node built-ins', () => {
      writeBundleFile(
        'index.js',
        `const fs = require('fs');
const path = require("node:path");
const test = require('node:test');
exports.handler = () => fs.existsSync(path.join('a', 'b'));`
      );

      expect(findMissingModules(bundlePath, [])).toEqual([]);
    });

    it('should accept files in the bundle folder', () => {
      writeBundleFile(
        'index.js',
        `require('./chunk'); require('./lib/data.json'); require('./lib');`
      );
      writeBundleFile(
        'chunk.js',
        `module.exports = require('../bundle/other.cjs');`
      );
      writeBundleFile('other.cjs', `module.exports = {};`);
      writeBundleFile('lib/data.json', `{}`);
      writeBundleFile('lib/index.js', `module.exports = {};`);

      expect(findMissingModules(bundlePath, [])).toEqual([]);
    });

    it('should report npm dependencies that are left external', () => {
      writeBundleFile(
        'index.js',
        `const api = require('@forge/api');
module.exports = require("lodash/get");`
      );

      expect(findMissingModules(bundlePath, [])).toEqual([
        { file: 'index.js', module: '@forge/api' },
        { file: 'index.js', module: 'lodash/get' },
      ]);
    });

    it('should report dynamic imports of external modules', () => {
      writeBundleFile('index.js', `exports.handler = () => import('uuid');`);

      expect(findMissingModules(bundlePath, [])).toEqual([
        { file: 'index.js', module: 'uuid' },
      ]);
    });

    it('should report files outside the bundle folder', () => {
      writeFileSync(join(dirname(bundlePath), 'outside.js'), '');
      writeBundleFile(
        'index.js',
        `require('../outside.js'); require('./missing');`
      );

      expect(findMissingModules(bundlePath, [])).toEqual([
        { file: 'index.js', module: '../outside.js' },
        { file: 'index.js', module: './missing' },
      ]);
    });

    it('should check every JavaScript file in the bundle folder', () => {
      writeBundleFile('index.js', `require('./chunks/1.js');`);
      writeBundleFile('chunks/1.js', `require('ws');`);
      writeBundleFile('chunks/2.cjs', `require('pg');`);
      writeBundleFile('index.js.map', `require('ignored');`);

      expect(findMissingModules(bundlePath, [])).toEqual([
        { file: 'chunks/1.js', module: 'ws' },
        { file: 'chunks/2.cjs', module: 'pg' },
      ]);
    });

    it('should ignore requires that are not string literals or not calls of the global require', () => {
      writeBundleFile(
        'index.js',
        `const name = 'x';
require(name);
require('./' + name);
__webpack_require__('lodash');
module.require('lodash');
const text = "require('lodash')";
// require('lodash')
function f(require) { return require('lodash'); }`
      );

      expect(findMissingModules(bundlePath, [])).toEqual([]);
    });

    it('should accept modules in allowMissingModules, including their subpaths', () => {
      writeBundleFile(
        'index.js',
        `try { require('encoding'); require('encoding/lib/iconv'); require('pg-native'); } catch {}`
      );

      expect(findMissingModules(bundlePath, ['encoding'])).toEqual([
        { file: 'index.js', module: 'pg-native' },
      ]);
    });

    it('should parse a bundle that starts with a hashbang and uses modern syntax', () => {
      writeBundleFile(
        'index.js',
        `#!/usr/bin/env node
"use strict";
class A { #x = 1; static { this.y = 2; } }
const v = A?.y ?? 0n;
require('left-pad');`
      );

      expect(findMissingModules(bundlePath, [])).toEqual([
        { file: 'index.js', module: 'left-pad' },
      ]);
    });
  });

  describe('verifyBundleCompleteness', () => {
    it('should fail if the bundle folder does not exist', () => {
      rmSync(bundlePath, { recursive: true });

      expect(() => verifyBundleCompleteness(bundlePath, [])).toThrow(
        `No bundle found in ${bundlePath}. Build the app before packaging it.`
      );
    });

    it('should fail if the bundle folder has no index.js', () => {
      writeBundleFile('main.js', '');

      expect(() => verifyBundleCompleteness(bundlePath, [])).toThrow(
        `No bundle found in ${bundlePath}. Build the app before packaging it.`
      );
    });

    it('should name each missing module and the file that loads it', () => {
      writeBundleFile('index.js', `require('@forge/api'); require('lodash');`);

      expect(() => verifyBundleCompleteness(bundlePath, [])).toThrow(
        [
          `The bundle in ${bundlePath} loads modules that are not in it:`,
          '',
          '  - @forge/api (index.js)',
          '  - lodash (index.js)',
          '',
          'Forge ships the bundle as it is, so the build must inline all dependencies except Node built-ins.',
          "If the code handles a module's absence itself, add the module to the 'allowMissingModules' option of the package target.",
        ].join('\n')
      );
    });

    it('should pass for a complete bundle', () => {
      writeBundleFile('index.js', `exports.handler = () => require('crypto');`);

      expect(() => verifyBundleCompleteness(bundlePath, [])).not.toThrow();
    });
  });
});
