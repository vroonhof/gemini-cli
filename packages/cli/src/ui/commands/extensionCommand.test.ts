/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { vi } from 'vitest';
import { extensionCommand } from './extensionCommand.js';
import { Config } from '@google/gemini-cli-core';
import { CommandContext } from './types.js';

describe('extensionsCommand', () => {
  let config: Config;
  let context: CommandContext;

  beforeEach(() => {
    config = {
      getAllExtensions: vi.fn(),
      getActiveExtensions: vi.fn(),
      enableExtension: vi.fn(),
      disableExtension: vi.fn(),
    } as unknown as Config;
    context = { services: { config } } as unknown as CommandContext;
  });

  describe('list', () => {
    it('should list all extensions and their status', async () => {
      vi.mocked(config.getAllExtensions).mockReturnValue([
        { config: { name: 'ext1', version: '1.0.0' }, contextFiles: [] },
        { config: { name: 'ext2', version: '1.0.0' }, contextFiles: [] },
      ]);
      vi.mocked(config.getActiveExtensions).mockReturnValue([
        { config: { name: 'ext1', version: '1.0.0' }, contextFiles: [] },
      ]);

      const result = (await extensionCommand.action!(context, 'list')) as {
        content: string;
      };

      // eslint-disable-next-line no-control-regex
      const cleanContent = result.content.replace(/\u001b\[[0-9;]*m/g, '');
      const lines = cleanContent.split('\n');
      expect(lines[0]).toBe('Available extensions:');

      const ext1Line = lines.find((line) => line.includes('ext1'));
      expect(ext1Line).toBeDefined();
      expect(ext1Line).toContain('(enabled)');

      const ext2Line = lines.find((line) => line.includes('ext2'));
      expect(ext2Line).toBeDefined();
      expect(ext2Line).toContain('(disabled)');
    });

    it('should show a message if no extensions are installed', async () => {
      vi.mocked(config.getAllExtensions).mockReturnValue([]);
      vi.mocked(config.getActiveExtensions).mockReturnValue([]);
      const result = await extensionCommand.action!(context, 'list');
      expect(result).toEqual({
        type: 'message',
        messageType: 'info',
        content: 'No extensions installed.',
      });
    });
  });

  describe('enable', () => {
    it('should enable the specified extension', async () => {
      const result = await extensionCommand.action!(context, 'enable ext1');
      expect(config.enableExtension).toHaveBeenCalledWith('ext1');
      expect(result).toEqual({
        type: 'message',
        messageType: 'info',
        content: 'Enabled extension "ext1" for this session.',
      });
    });
  });

  describe('disable', () => {
    it('should disable the specified extension', async () => {
      const result = await extensionCommand.action!(context, 'disable ext1');
      expect(config.disableExtension).toHaveBeenCalledWith('ext1');
      expect(result).toEqual({
        type: 'message',
        messageType: 'info',
        content: 'Disabled extension "ext1" for this session.',
      });
    });
  });
});
