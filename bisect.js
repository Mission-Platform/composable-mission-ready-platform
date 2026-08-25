import fs from 'fs';
import { createWebLuaRuntime } from './packages/web-lua/dist-node/index.js';

const source = fs.readFileSync('/Users/rogan/Developer/sources/lua-5.5.1-tests/gc.lua', 'utf-8');
const lines = source.split('\n');

async function check(numLines) {
  const runtime = await createWebLuaRuntime();
  const state = runtime.openState();
  const chunk = lines.slice(0, numLines).join('\n');
  const res = runtime.load(state, chunk);
  const status = runtime.status(state);
  state.close();
  return status;
}

async function main() {
  let low = 1;
  let high = lines.length;
  let lastFail = -1;
  
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const status = await check(mid);
    if (status !== 0) {
      lastFail = mid;
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }
  
  console.log(`Failed at line: ${lastFail}`);
  if (lastFail !== -1) {
    console.log(lines[lastFail - 1]);
  }
}

main().catch(console.error);
