/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert';
import { TestRig } from './test-helper.js';
import * as path from 'path';

function createTestExtension(
  rig,
  name,
  enabled,
  toolName = 'test_tool',
  toolResponse = 'test tool response',
) {
  const geminiExtDir = path.join('.gemini', 'extensions', name);
  rig.mkdir(geminiExtDir);

  const serverScript = `
    import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
    import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
    import { z } from 'zod';

    const server = new McpServer({
      name: '${name}-server',
      version: '1.0.0',
    });

    server.registerTool(
      '${toolName}',
      {
        title: 'Test Tool',
        description: 'A simple test tool',
        inputSchema: {},
      },
      async () => ({
        content: [{ type: 'text', text: '${toolResponse}' }],
      }),
    );

    const transport = new StdioServerTransport();
    await server.connect(transport);
  `;
  const serverScriptPath = rig.createFile(
    path.join(geminiExtDir, 'server.js'),
    serverScript,
  );

  rig.createFile(
    path.join(geminiExtDir, 'gemini-extension.json'),
    JSON.stringify({
      name: name,
      version: '1.0.0',
      enabled: enabled,
      mcpServers: {
        'test-server': {
          command: `node ${serverScriptPath}`,
        },
      },
    }),
  );
}

describe('extensions', () => {
  const rig = new TestRig();

  test('loads extensions', () => {
    rig.setup('loads extensions');
    rig.mkdir(path.join('.gemini', 'extensions', 'test-ext'));
    rig.createFile(
      path.join('.gemini', 'extensions', 'test-ext', 'gemini-extension.json'),
      JSON.stringify({
        name: 'test-ext',
        version: '1.0.0',
      }),
    );

    const output = rig.run('--list-extensions');
    assert.ok(output.includes('test-ext'));
  });

  test('extension with "enabled: false" is disabled by default', () => {
    rig.setup('disabled extension');
    createTestExtension(
      rig,
      'disabled-ext',
      false,
      'my_tool',
      'my tool response',
    );

    const output = rig.run('use my_tool');
    // We are checking that the tool response is not in the output,
    // which indicates the tool was not called.
    assert.ok(!output.includes('my tool response'));
  });

  test('disabled extension can be enabled with --enable-extension', () => {
    rig.setup('enable disabled extension');
    createTestExtension(
      rig,
      'disabled-ext',
      false,
      'my_tool',
      'my tool response',
    );

    const output = rig.run(
      { prompt: 'use my_tool' },
      '--enable-extension',
      'disabled-ext',
    );
    assert.ok(output.includes('my tool response'));
  });
});
