/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert';
import { TestRig } from './test-helper.js';
import * as fs from 'fs';
import * as path from 'path';

function createTestExtension(
  extDir,
  name,
  enabled,
  toolName = 'test_tool',
  toolResponse = 'test tool response',
) {
  const geminiExtDir = path.join(extDir, '.gemini', 'extensions', name);
  fs.mkdirSync(geminiExtDir, { recursive: true });

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
  const serverScriptPath = path.join(geminiExtDir, 'server.js');
  fs.writeFileSync(serverScriptPath, serverScript);

  fs.writeFileSync(
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
    const extDir = rig.setup('loads extensions');
    const geminiExtDir = path.join(extDir, '.gemini', 'extensions', 'test-ext');
    fs.mkdirSync(geminiExtDir, { recursive: true });
    fs.writeFileSync(
      path.join(geminiExtDir, 'gemini-extension.json'),
      JSON.stringify({
        name: 'test-ext',
        version: '1.0.0',
      }),
    );

    const output = rig.run('--list-extensions');
    assert.ok(output.includes('test-ext'));
  });

  test('extension with "enabled: false" is disabled by default', () => {
    const extDir = rig.setup('disabled extension');
    createTestExtension(extDir, 'disabled-ext', false, 'my_tool', 'my tool response');

    const output = rig.run('use my_tool');
    // We are checking that the tool response is not in the output,
    // which indicates the tool was not called.
    assert.ok(!output.includes('my tool response'));
  });

  test('disabled extension can be enabled with --enable-extension', () => {
    const extDir = rig.setup('enable disabled extension');
    createTestExtension(extDir, 'disabled-ext', false, 'my_tool', 'my tool response');

    const output = rig.run('--enable-extension disabled-ext -p "use my_tool"');
    assert.ok(output.includes('my tool response'));
  });
});
