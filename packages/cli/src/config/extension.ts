/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { MCPServerConfig } from '@google/gemini-cli-core';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export const EXTENSIONS_DIRECTORY_NAME = path.join('.gemini', 'extensions');
export const EXTENSIONS_CONFIG_FILENAME = 'gemini-extension.json';

export interface Extension {
  config: ExtensionConfig;
  contextFiles: string[];
}

export interface ExtensionConfig {
  name: string;
  version: string;
  enabled?: boolean;
  mcpServers?: Record<string, MCPServerConfig>;
  contextFileName?: string | string[];
  excludeTools?: string[];
}

export function loadExtensions(workspaceDir: string): Extension[] {
  const allExtensions = [
    ...loadExtensionsFromDir(workspaceDir),
    ...loadExtensionsFromDir(os.homedir()),
  ];

  const uniqueExtensions = new Map<string, Extension>();
  for (const extension of allExtensions) {
    if (!uniqueExtensions.has(extension.config.name)) {
      const enabled = extension.config.enabled ?? true;
      console.log(
        `Loading extension: ${extension.config.name} (version: ${
          extension.config.version
        }, enabled: ${enabled ? 'yes' : 'no'})`,
      );
      uniqueExtensions.set(extension.config.name, extension);
    }
  }

  return Array.from(uniqueExtensions.values());
}

function loadExtensionsFromDir(dir: string): Extension[] {
  const extensionsDir = path.join(dir, EXTENSIONS_DIRECTORY_NAME);
  if (!fs.existsSync(extensionsDir)) {
    return [];
  }

  const extensions: Extension[] = [];
  for (const subdir of fs.readdirSync(extensionsDir)) {
    const extensionDir = path.join(extensionsDir, subdir);

    const extension = loadExtension(extensionDir);
    if (extension != null) {
      extensions.push(extension);
    }
  }
  return extensions;
}

function loadExtension(extensionDir: string): Extension | null {
  if (!fs.statSync(extensionDir).isDirectory()) {
    console.error(
      `Warning: unexpected file ${extensionDir} in extensions directory.`,
    );
    return null;
  }

  const configFilePath = path.join(extensionDir, EXTENSIONS_CONFIG_FILENAME);
  if (!fs.existsSync(configFilePath)) {
    console.error(
      `Warning: extension directory ${extensionDir} does not contain a config file ${configFilePath}.`,
    );
    return null;
  }

  try {
    const configContent = fs.readFileSync(configFilePath, 'utf-8');
    const config = JSON.parse(configContent) as ExtensionConfig;
    if (!config.name || !config.version) {
      console.error(
        `Invalid extension config in ${configFilePath}: missing name or version.`,
      );
      return null;
    }

    const contextFiles = getContextFileNames(config)
      .map((contextFileName) => path.join(extensionDir, contextFileName))
      .filter((contextFilePath) => fs.existsSync(contextFilePath));

    return {
      config,
      contextFiles,
    };
  } catch (e) {
    console.error(
      `Warning: error parsing extension config in ${configFilePath}: ${e}`,
    );
    return null;
  }
}

function getContextFileNames(config: ExtensionConfig): string[] {
  if (!config.contextFileName) {
    return ['GEMINI.md'];
  } else if (!Array.isArray(config.contextFileName)) {
    return [config.contextFileName];
  }
  return config.contextFileName;
}

export function findExtensionConfigPath(extensionName: string): string | null {
  const dirs = [process.cwd(), os.homedir()];
  for (const dir of dirs) {
    const extensionDir = path.join(
      dir,
      EXTENSIONS_DIRECTORY_NAME,
      extensionName,
    );
    if (fs.existsSync(extensionDir)) {
      const configPath = path.join(extensionDir, EXTENSIONS_CONFIG_FILENAME);
      if (fs.existsSync(configPath)) {
        return configPath;
      }
    }
  }
  return null;
}

export function filterActiveExtensions(
  extensions: Extension[],
  enabledExtensionNames: string[],
  additionalEnabledExtensions: string[] = [],
): Extension[] {
  if (enabledExtensionNames.length > 0) {
    const lowerCaseEnabledExtensions = new Set(
      enabledExtensionNames.map((e) => e.trim().toLowerCase()),
    );

    if (
      lowerCaseEnabledExtensions.size === 1 &&
      lowerCaseEnabledExtensions.has('none')
    ) {
      if (extensions.length > 0) {
        console.log('All extensions are disabled.');
      }
      return [];
    }

    const activeExtensions: Extension[] = [];
    const notFoundNames = new Set(lowerCaseEnabledExtensions);

    for (const extension of extensions) {
      const lowerCaseName = extension.config.name.toLowerCase();
      if (lowerCaseEnabledExtensions.has(lowerCaseName)) {
        console.log(
          `Activated extension: ${extension.config.name} (version: ${extension.config.version})`,
        );
        activeExtensions.push(extension);
        notFoundNames.delete(lowerCaseName);
      } else {
        console.log(`Disabled extension: ${extension.config.name}`);
      }
    }

    for (const requestedName of notFoundNames) {
      console.log(`Extension not found: ${requestedName}`);
    }

    return activeExtensions;
  }

  const lowerCaseAdditionallyEnabledExtensions = new Set(
    additionalEnabledExtensions.map((e) => e.trim().toLowerCase()),
  );
  const activeExtensions: Extension[] = [];
  for (const extension of extensions) {
    const lowerCaseName = extension.config.name.toLowerCase();
    const enabled = extension.config.enabled ?? true;
    if (enabled || lowerCaseAdditionallyEnabledExtensions.has(lowerCaseName)) {
      console.log(
        `Activated extension: ${extension.config.name} (version: ${extension.config.version})`,
      );
      activeExtensions.push(extension);
    } else {
      console.log(`Disabled extension: ${extension.config.name}`);
    }
  }
  return activeExtensions;
}
