import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const { join } = path;

// skipcq: JS-D1001, JS-R1005
function getAllTsFiles(directory) {
  let result = [];
  for (const item of readdirSync(directory)) {
    if (item === 'node_modules' || item === 'dist' || item === '.git' || item === '.turbo') continue;
    // skipcq: JS-C1002
    const p = join(directory, item);
    if (statSync(p).isDirectory()) {
      result = [...result, ...getAllTsFiles(p)];
    } else if (p.endsWith('.ts')) {
      result.push(p);
    }
  }
  return result;
}

const files = getAllTsFiles('packages/flint/core/src');
console.log('Found', files.length, 'files to transform in packages/flint/core/src');

let totalReplacements = 0;
for (const file of files) {
  let content = readFileSync(file, 'utf8');
  const original = content;

  // 1. Package imports
  content = content.replaceAll('@mission-platform/forge-web-script-regex', '@mission-platform/flint-regex');
  content = content.replaceAll('@mission-platform/forge-web-script-wasm', '@mission-platform/flint-wasm');
  content = content.replaceAll('@mission-platform/forge-web-script-runtime', '@mission-platform/flint-runtime');
  content = content.replaceAll('@mission-platform/forge-web-script-stdlib', '@mission-platform/flint-stdlib');
  content = content.replaceAll('@mission-platform/forge-web-script', '@mission-platform/flint');

  // 2. Constants: FORGE_WEB_SCRIPT_ -> FLINT_
  content = content.replaceAll(/\bFORGE_WEB_SCRIPT_/g, 'FLINT_');
  content = content.replaceAll(/\bFORGE_REGEX_BYTECODE_VERSION\b/g, 'FLINT_REGEX_BYTECODE_VERSION');

  // 3. Diagnostics: FWS- -> FLINT-
  content = content.replaceAll(/\bFWS-([A-Z0-9-]+)\b/g, 'FLINT-$1');

  // 4. Any symbol starting with ForgeWebScript
  content = content.replaceAll(/\bForgeWebScript([A-Za-z0-9_]*)\b/g, 'Flint$1');

  // 5. Any symbol starting with forgeWebScript
  content = content.replaceAll(/\bforgeWebScript([A-Za-z0-9_]*)\b/g, 'flint$1');

  // 6. Functions ending or containing ForgeWebScript (like compileForgeWebScript -> compileFlint)
  content = content.replaceAll(/([a-zA-Z0-9_]+)ForgeWebScript([A-Za-z0-9_]*)/g, '$1Flint$2');

  // 7. Identity & cache
  content = content.replaceAll('.fws-cache-index.json', '.flint-cache-index.json');
  content = content.replaceAll('self-hosted/fws/', 'self-hosted/flint/');
  content = content.replaceAll('self-hosted/fws', 'self-hosted/flint');

  // 8. In test fixture paths or file names in tests/spec
  if (file.endsWith('.spec.ts')) {
    content = content.replaceAll(/\.fws\b/g, '.flint');
  }

  // 9. In identity.ts and parser-module-stage.ts: extension stripping
  content = content.replaceAll(String.raw`.replace(/\.fws$/u, '')`, String.raw`.replace(/\.(flint|flt|fws)$/u, '')`);

  // 10. Interop generator
  content = content.replaceAll('FwsBinding', 'FlintBinding');
  content = content.replaceAll('generateFwsBindings', 'generateFlintBindings');
  content = content.replaceAll('fwsBindings', 'flintBindings');
  content = content.replaceAll('options.fws', 'options.flint ?? options.fws');

  if (content !== original) {
    writeFileSync(file, content, 'utf8');
    totalReplacements++;
  }
}
console.log('Transformed', totalReplacements, 'files in packages/flint/core/src.');
