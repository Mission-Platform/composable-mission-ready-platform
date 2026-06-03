# `@mission-platform/hunspell`

Hunspell spell-checker compiled to **WebAssembly** via [Emscripten](https://emscripten.org/), packaged as an ES module that works in browsers and Web Workers without any Node.js runtime dependencies.

---

## How it works

```
docker/Dockerfile          ← Emscripten build environment
docker/hunspell_wrapper.cpp ← Thin C++ class exposed via Emscripten bindings
build.sh                   ← Runs the Docker build → dist/hunspell.js
dist/hunspell.js           ← Built artifact: WASM inlined as base64 (SINGLE_FILE)
src/                       ← TypeScript types & factory wrapper
```

The Dockerfile:
1. Cross-compiles `hunspell-1.7.2` to a static WASM library using `emconfigure` + `emmake`.
2. Compiles `hunspell_wrapper.cpp` (an Emscripten-binding wrapper class) against that library.
3. Emits a single self-contained `hunspell.js` with the WASM binary inlined as base64 (`SINGLE_FILE=1`), which avoids the need for `.wasm` URL resolution in bundlers or worker environments.

---

## Rebuilding the WASM artifact

Requires [Docker](https://www.docker.com/).

```bash
# From the repository root:
pnpm --filter @mission-platform/hunspell build:wasm

# Or from this package directory:
./build.sh            # incremental (uses Docker layer cache)
./build.sh --no-cache # full rebuild
```

Output is written to `dist/hunspell.js`.

---

## Usage

```ts
import { createHunspell } from '@mission-platform/hunspell'

const module = await createHunspell()

// Pass the raw text content of the .aff and .dic dictionary files.
const checker = new module.HunspellChecker(affFileContent, dicFileContent)

console.log(checker.spell('hello'))  // true
console.log(checker.spell('wrold'))  // false
console.log(checker.suggest('wrold')) // ['world', 'word', ...]

checker.delete() // free WASM memory
```

---

## Dictionary files

This package ships **no dictionaries** — supply your own `.aff` / `.dic` pair.
Free English dictionaries are available from the
[LibreOffice dictionaries](https://github.com/LibreOffice/dictionaries) repository
(`en/en_US.aff`, `en/en_US.dic`).
