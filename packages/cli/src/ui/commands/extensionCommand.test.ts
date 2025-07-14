/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { vi, Mock } from 'vitest';
import { extensionCommand } from './extensionCommand.js';
import { Config } from '@google/gemini-cli-core';
import { CommandContext } from './types.js';

describe('extensionCommand', () => {
  let config: Config;
  let consoleSpy: Mock;
  let context: CommandContext;

  beforeEach(() => {
    config = {
      getAllExtensions: vi.fn(),
      getActiveExtensions: vi.fn(),
      enableExtension: vi.fn(),
      disableExtension: vi.fn(),
    } as unknown as Config;
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    context = { services: { config } } as unknown as CommandContext;
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('list', () => {
    it('should list all extensions and their status', async () => {
      vi.mocked(config.getAllExtensions).mockReturnValue([
        { name: 'ext1', version: '1.0.0' },
        { name: 'ext2', version: '1.0.0' },
      ]);
      vi.mocked(config.getActiveExtensions).mockReturnValue([
        { name: 'ext1', version: '1.0.0' },
      ]);

      await extensionCommand.action!(context, 'list');

      expect(consoleSpy).toHaveBeenCalledWith('Available extensions:');
      expect(consoleSpy).toHaveBeenCalledWith('- ext1 (enabled)');
      expect(consoleSpy).toHaveBeenCalledWith('- ext2 (disabled)');
    });

    it('should show a message if no extensions are installed', async () => {
      vi.mocked(config.getAllExtensions).mockReturnValue([]);
      vi.mocked(config.getActiveExtensions).mockReturnValue([]);
      await extensionCommand.action!(context, 'list');
      expect(consoleSpy).toHaveBeenCalledWith('No extensions installed.');
    });
  });

  describe('enable', () => {
    it('should enable the specified extension', async () => {
      await extensionCommand.action!(context, 'enable ext1');
      expect(config.enableExtension).toHaveBeenCalledWith('ext1');
    });
  });

  describe('disable', () => {
    it('should disable the specified extension', async () => {
      await extensionCommand.action!(context, 'disable ext1');
      expect(config.disableExtension).toHaveBeenCalledWith('ext1');
    });
  });
});
