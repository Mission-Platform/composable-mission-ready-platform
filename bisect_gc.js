import fs from 'fs';
import { execSync } from 'child_process';
import { createWebLuaRuntime } from './packages/web-lua/dist-node/index.js';

const lines = fs.readFileSync('test.lua', 'utf-8').split('\n');

async function main() {
  const runtime = await createWebLuaRuntime();

  let smallestI = 0, smallestJ = lines.length;
  let found = false;

  for (let len = 1; len <= lines.length; len++) {
    for (let i = 0; i <= lines.length - len; i++) {
      let j = i + len - 1;
      
      const chunk = [
        ...lines.slice(0, i),
        ...lines.slice(j + 1)
      ].join('\n');
      
      fs.writeFileSync('temp.lua', chunk);
      try {
        execSync('luac -p temp.lua', { stdio: 'ignore' });
      } catch (e) {
        continue;
      }

      const state = runtime.openState();
      const result = state.execute(chunk);
      state.close();
      
      if (result.status !== 1) {
        console.log(`Success! Smallest removal is lines ${i+1} to ${j+1} (${len} lines).`);
        console.log(`Lines removed:\n${lines.slice(i, j+1).join('\n')}`);
        process.exit(0);
      }
    }
  }
}
main();
