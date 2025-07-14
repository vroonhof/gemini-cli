/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { Config } from '@google/gemini-cli-core';
import { SlashCommand } from './types.js';

async function enable(config: Config, extensionName: string) {
  await config.enableExtension(extensionName);
  console.log(`Enabled extension "${extensionName}" for this session.`);
}

async function disable(config: Config, extensionName: string) {
  await config.disableExtension(extensionName);
  console.log(`Disabled extension "${extensionName}" for this session.`);
}

async function list(config: Config) {
  const allExtensions = config.getAllExtensions();
  const activeSet = new Set(
    config.getActiveExtensions().map((ext) => ext.name),
  );

  if (allExtensions.length === 0) {
    console.log('No extensions installed.');
    return;
  }

  console.log('Available extensions:');
  for (const extension of allExtensions) {
    const status = activeSet.has(extension.name) ? 'enabled' : 'disabled';
    console.log(`- ${extension.name} (${status})`);
  }
}

export const extensionCommand: SlashCommand = {
  name: 'extension',
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
      console.log('Usage: /extension <list|enable|disable> [extension_name]');
      return;
    }

    if (subcommand === 'list') {
      await list(config);
    } else if (subcommand === 'enable') {
      if (!extensionName) {
        console.log('Usage: /extension enable <extension_name>');
        return;
      }
      await enable(config, extensionName);
    } else if (subcommand === 'disable') {
      if (!extensionName) {
        console.log('Usage: /extension disable <extension_name>');
        return;
      }
      await disable(config, extensionName);
    } else {
      console.log(`Unknown subcommand: ${subcommand}`);
    }
  },
};
