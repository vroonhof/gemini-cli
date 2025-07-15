/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { Config } from '@google/gemini-cli-core';
import { SlashCommand } from './types.js';

async function enable(config: Config, extensionName: string): Promise<string> {
  await config.enableExtension(extensionName);
  return `Enabled extension "${extensionName}" for this session.`;
}

async function disable(config: Config, extensionName: string): Promise<string> {
  await config.disableExtension(extensionName);
  return `Disabled extension "${extensionName}" for this session.`;
}

async function list(config: Config): Promise<string> {
  const allExtensions = config.getAllExtensions();
  const activeSet = new Set(
    config.getActiveExtensions().map((ext) => ext.config.name),
  );

  if (allExtensions.length === 0) {
    return 'No extensions installed.';
  }

  const extensionList = allExtensions
    .map((extension) => {
      const status = activeSet.has(extension.config.name)
        ? 'enabled'
        : 'disabled';
      return `- \u001b[36m${extension.config.name} (v${extension.config.version})\u001b[0m (${status})`;
    })
    .join('\n');

  return `Available extensions:\n${extensionList}`;
}

export const extensionCommand: SlashCommand = {
  name: 'extensions',
  description: 'Manage extensions for the current session',
  action: async (context, args) => {
    const config = context.services.config;
    if (!config) {
      return {
        type: 'message',
        messageType: 'error',
        content: 'Config not loaded.',
      };
    }

    const [subcommand, extensionName] = args.split(' ');
    if (!subcommand) {
      return {
        type: 'message',
        messageType: 'error',
        content: 'Usage: /extensions <list|enable|disable> [extension_name]',
      };
    }

    if (subcommand === 'list') {
      const message = await list(config);
      return {
        type: 'message',
        messageType: 'info',
        content: message,
      };
    } else if (subcommand === 'enable') {
      if (!extensionName) {
        return {
          type: 'message',
          messageType: 'error',
          content: 'Usage: /extensions enable <extension_name>',
        };
      }
      const message = await enable(config, extensionName);
      return {
        type: 'message',
        messageType: 'info',
        content: message,
      };
    } else if (subcommand === 'disable') {
      if (!extensionName) {
        return {
          type: 'message',
          messageType: 'error',
          content: 'Usage: /extensions disable <extension_name>',
        };
      }
      const message = await disable(config, extensionName);
      return {
        type: 'message',
        messageType: 'info',
        content: message,
      };
    } else {
      return {
        type: 'message',
        messageType: 'error',
        content: `Unknown subcommand: ${subcommand}`,
      };
    }
  },
};
