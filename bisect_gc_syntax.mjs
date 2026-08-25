import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createWebLuaRuntime } from './packages/web-lua/dist-node/index.js';

const source = fs.readFileSync('/Users/rogan/Developer/sources/lua-5.5.1-tests/gc.lua', 'utf8');
const lines = source.split('\n');
const tmp = path.join(process.cwd(), 'temp.lua');

function luacOk(chunk) {
  fs.writeFileSync(tmp, chunk);
  try {
    execFileSync('luac', ['-p', tmp], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

async function tryLoad(runtime, chunk) {
  const state = runtime.openState();
  try {
    const frame = state.execute(chunk);
    state.close();
    return frame;
  } catch (e) {
    try { state.close(); } catch {}
    return { kind: 'throw', message: String(e) };
  }
}

async function main() {
  const runtime = await createWebLuaRuntime(undefined, {
    capabilities: ['lua.package.load', 'lua.io.write', 'lua.io.read', 'lua.os.command'],
    hostAdapter: {
      invoke(req) {
        const input = String(req?.input ?? '');
        if (input.includes('debug')) {
          return new TextEncoder().encode('return {}');
        }
        try {
          const p = input.startsWith('/')
            ? input
            : path.join('/Users/rogan/Developer/sources/lua-5.5.1-tests', input);
          return fs.readFileSync(p);
        } catch {
          return null;
        }
      }
    }
  });

  let lastOkComplete = 0;
  let firstFailComplete = null;
  const completePoints = [];
  for (let n = 1; n <= lines.length; n++) {
    const chunk = lines.slice(0, n).join('\n');
    if (!luacOk(chunk)) continue;
    completePoints.push(n);
    const frame = await tryLoad(runtime, chunk);
    const syn = frame?.status === 1 || frame?.code === 'syntax-error';
    if (syn) {
      if (firstFailComplete == null) {
        firstFailComplete = n;
        console.log('FIRST COMPLETE PREFIX SYNTAX FAIL at', n);
        console.log('prev complete was', lastOkComplete);
        for (let i = Math.max(0, lastOkComplete - 2); i < Math.min(lines.length, n + 2); i++) {
          const mark = i + 1 === n ? '>>>' : i + 1 === lastOkComplete ? 'OK ' : '   ';
          console.log(`${mark} ${i + 1}| ${lines[i]}`);
        }
        break;
      }
    } else {
      lastOkComplete = n;
    }
  }

  console.log('complete points count', completePoints.length);
  console.log('lastOkComplete', lastOkComplete);
  console.log('firstFailComplete', firstFailComplete);

  if (firstFailComplete == null) {
    console.log('No complete-prefix syntax fail; checking whole with luac');
    console.log('whole luac', luacOk(source));
    const frame = await tryLoad(runtime, source);
    console.log('whole frame', frame);
  } else {
    const deltaStart = lastOkComplete;
    const delta = lines.slice(deltaStart, firstFailComplete).join('\n');
    console.log('\nDELTA lines', deltaStart + 1, '..', firstFailComplete);
    console.log(delta);
    const iso = await tryLoad(runtime, delta);
    console.log('delta alone', iso?.status, iso?.code, iso?.message);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
