import fs from 'fs';
import { createWebLuaRuntime } from './packages/web-lua/dist-node/index.js';

const source = fs.readFileSync('/Users/rogan/Developer/sources/lua-5.5.1-tests/gc.lua', 'utf-8');
const lines = source.split('\n');

async function main() {
  const runtime = await createWebLuaRuntime();
  const state = runtime.openState();

  let okLines = 0;
  for (let i = 1; i <= lines.length; i++) {
    const chunk = lines.slice(0, i).join('\n');
    // to make chunk syntactically complete if it's open, maybe we just parse?
    // Wait, an open `if` will be a syntax error.
  }
}
