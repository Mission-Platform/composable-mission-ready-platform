# Forge Web Script language tooling

Forge Web Script (`.fws`) has an editor-neutral language service, a stdio
Language Server Protocol (LSP) server, and a browser-facing Monaco adapter.
All three use the executable Forge Web Script v1 contract from
`@mission-platform/forge-web-script`, so diagnostics, source ranges, symbols,
completion, and hover information are derived from the same parser and
validator.

The supported language contract is **version 1.0** and the ABI contract is
**version 1.2**. The tooling does
not change the grammar, compiler output, ABI, or the existing Rust and
AssemblyScript integrations. See [Forge Web Script v1](../../../forge-web-script/docs/reference/language.md)
for the language and ABI reference.

## Features and boundaries

The language service currently provides:

- diagnostics from lexing, parsing, type checking, and ABI validation;
- UTF-16-aware ranges suitable for LSP and Monaco;
- document symbols for modules, functions, parameters, locals, capability
  aliases, aggregate types, fields, enum variants, interface methods, generic
  parameters, iterator bindings, match bindings, and primitive types;
- completion for Forge keywords, primitive types, declarations, locals,
  aggregate types, generic types, functions, compiler-owned string and regex
  functions, capability aliases, and host-inventoried capability names;
- hover information for declarations, parameters, locals, calls, and
  capability imports when the AST identifies the symbol, including aggregate
  types, generic types, compiler-owned standard-library calls, and rendered
  documentation for source-defined functions; and
- v1 lexical tokenization for comments, strings, numbers, keywords, types,
  operators, punctuation, declarations, and invalid text.

The LSP server exposes diagnostics, completion, hover, and full semantic
tokens. Go-to-definition, references, rename, formatting, code actions,
source-level cross-file language imports, and a browser-hosted LSP transport
are not implemented. Monaco uses the local language-service adapter instead
of connecting to the Node server.

Semantic tokens use the language service's lexical classifications. The
initialize response advertises a legend containing `comment`, `declaration`,
`identifier`, `invalid`, `keyword`, `number`, `operator`, `punctuation`,
`string`, and `type`; clients request the encoded full document tokens with
`textDocument/semanticTokens/full`.

## Function documentation in editor results

The language service exposes documentation for source-defined top-level
functions. It uses the same normalized documentation string for declaration
hover, reference hover, and function completion. Host-provided capability
signatures continue to use their existing optional string documentation and are
not parsed as FWS Javadoc comments.

For example, this source:

```fws
/**
 * Adds one to a value.
 *
 * @param value Input value.
 * @return Incremented value.
 * @deprecated Prefer `increment` in new code.
 */
export fn add(value: i32) -> i32 {
  return value + 1;
}

export fn caller() -> i32 {
  return add(1);
}
```

Hovering `add` at its declaration or at the call in `caller` returns the
signature followed by the rendered documentation:

```text
export add(i32): i32

Adds one to a value.

@param value Input value.

@return Incremented value.

@deprecated Prefer `increment` in new code.
```

Hovering `add` at the call site in `caller` returns the same documentation
with the non-declaration signature:

```text
add(i32): i32

Adds one to a value.

@param value Input value.

@return Incremented value.

@deprecated Prefer `increment` in new code.
```

Completion for `add` carries the same documentation string alongside its
detail/signature. Description paragraphs and tags are separated by blank lines;
tag order, duplicate tags, and unknown tags are preserved. The core syntax and
normalization rules, including function association and the supported subject
forms, are specified in [the FWS language reference](../../../forge-web-script/docs/reference/language.md).

Documentation is informational metadata only. It does not change diagnostics,
type checking, function resolution, generated declarations, ABI signatures,
manifests, Wasm/WAT, runtime behavior, or executable hashes. A documentation
edit therefore changes hover and completion content without changing the
compiled module contract.

### LSP rendering

The stdio server maps the framework-neutral language-service result to standard
LSP values:

- `textDocument/hover` returns Markdown whose value joins the signature and
  documentation with a blank line;
- `textDocument/completion` sets each source-function item's `documentation`
  field to the same rendered string and leaves the existing `detail` signature
  unchanged.

The LSP server does not reinterpret tags or apply editor-specific formatting.
Clients can display the returned Markdown/plain text as-is.

### Monaco rendering

`@mission-platform/content` registers the same in-process language-service
providers used by `ForgeMonacoEditor`:

- Monaco hover `contents` contains the signature and rendered documentation as
  separate Markdown-compatible values;
- a source-function suggestion's `documentation` field contains the same
  rendered string as LSP completion;
- the lexical `comment` token classification remains unchanged for both
  ordinary and documentation block comments.

The Monaco adapter does not connect to the Node LSP server or duplicate the
documentation parser. It forwards the language-service result, so browser and
stdio clients remain consistent and both use UTF-16 source ranges.

## Run the stdio server

The server is published as `@mission-platform/forge-web-script-lsp` and
exposes the executable `forge-web-script-lsp`. It speaks standard LSP over
stdin/stdout; protocol messages are never written to stdout by application
logging. Readiness and error messages are written to stderr.

From a checkout of this repository, build and run it with:

```sh
pnpm --filter @mission-platform/forge-web-script-lsp build
node packages/forge-web-script-lsp/dist/main.js
```

When the package is installed into an external project, configure the client
to invoke the package executable directly:

```sh
forge-web-script-lsp
```

The server requires Node.js 24 or newer. It does not take a `--stdio` flag;
stdio is always the transport. A client should send `initialize`, use the
returned capabilities, and then send the normal `initialized` notification.
The server supports full-text synchronization, workspace folders, watched
file changes, completion, hover, and shutdown/exit.

### Stdio client configuration examples

Clients that accept a command and arguments separately should use
`forge-web-script-lsp` for installed packages. A checkout can use `node` and
the built entrypoint instead:

```json
{
  "command": "node",
  "args": ["${workspaceFolder}/packages/forge-web-script-lsp/dist/main.js"],
  "filetypes": ["fws"],
  "rootPatterns": ["package.json", ".git"]
}
```

For example, Neovim's built-in LSP client can use the installed executable:

```lua
vim.lsp.config('forge_web_script', {
  cmd = { 'forge-web-script-lsp' },
  filetypes = { 'fws' },
  root_markers = { 'package.json', '.git' },
})
vim.lsp.enable('forge_web_script')
```

Helix can use the same executable in `languages.toml`:

```toml
[language-server.forge-web-script-lsp]
command = "forge-web-script-lsp"

[[language]]
name = "fws"
scope = "source.fws"
file-types = ["fws"]
language-servers = ["forge-web-script-lsp"]
```

VS Code requires an LSP client extension; configure that extension with the
same command and arguments rather than adding these fields to ordinary
`settings.json`.

## Editor integrations

This repository provides first-party clients for VS Code and IntelliJ IDEA.
Both clients use this stdio server for diagnostics, completion, hover, and
full semantic tokens; neither client contains a parser, PSI model, or semantic
analysis implementation. The server requires Node.js **24 or newer**. A
platform-specific Node runtime is not bundled with either editor integration.

### VS Code

Install the `fws-vscode-0.1.0.vsix` file from the
`extensions/fws-vscode` release output with **Extensions: Install from VSIX**,
then reload VS Code. Opening a `.fws` file activates the extension. The
default launch path is the server bundled in the VSIX, and the extension
starts it with the configured Node executable over stdio.

The extension contributes the `fws` language id, `.fws` filename association,
baseline comments/brackets/lexical highlighting, and an LSP file watcher. The
server remains responsible for semantic tokens and all language behavior.
Workspace folders are sent in `initialize` as `file:` URIs, preserving the
server's workspace-root and path-isolation contract.

Configure the extension in VS Code settings (or `settings.json`):

```json
{
  "forgeWebScript.nodePath": "/path/to/node-24/bin/node",
  "forgeWebScript.serverPath": "",
  "forgeWebScript.serverArgs": [],
  "forgeWebScript.trace.server": "off"
}
```

`forgeWebScript.nodePath` defaults to `node` and must resolve to Node 24 or
newer. Leave `forgeWebScript.serverPath` empty to use the packaged server;
set it to an absolute path or a path relative to the first workspace folder
to test a locally built or project-provided `dist/main.js`. Additional
arguments are passed after the server entrypoint. Use `messages` or `verbose`
for LSP tracing; startup failures are written to the **Forge Web Script
Language Server** output channel and shown as an editor error.

For local development from this repository:

```sh
pnpm install --frozen-lockfile
pnpm exec turbo run build --filter=fws-vscode
pnpm --filter fws-vscode test
pnpm --filter fws-vscode check:packaging
pnpm --filter fws-vscode package
```

The build first builds the shared LSP package and then stages its entrypoint
and runtime dependencies under `extensions/fws-vscode/server`. `package`
produces `extensions/fws-vscode/fws-vscode-0.1.0.vsix`; development sources
and test files are excluded by `.vscodeignore`. The packaged smoke check
initializes the staged server and verifies advertised completion, hover,
semantic-token, and stable diagnostic behavior.

### IntelliJ IDEA / LSP4IJ

Build the plugin ZIP and install it through **Settings | Plugins | Gear |
Install Plugin from Disk**:

```sh
cd extensions/fws-ij
JAVA_HOME=/path/to/jdk-23 ./gradlew test verifyPlugin buildPlugin --no-daemon --offline
```

The resulting `build/distributions/fws-ij-0.1.0.zip` contains the thin
LSP4IJ integration. The plugin compiles against IntelliJ IDEA Community
2024.3.3 (build 243), retains an open-ended compatibility range from build
243 onward, and is verified against WebStorm 2026.2.1 (branch 262, including
`WS-262.9437.145`). It pins LSP4IJ 0.20.1 and does not bundle Node.js or the
language server. Restart the IDE after installation if it does not immediately
recognize `.fws` files.

The plugin maps `*.fws` to language id `fws` and starts one shared stdio
server for the project. IntelliJ configuration is provided exclusively by
**Settings | Tools | Forge Web Script**; there is no project-script or Flora
configuration path. Configure:

- **Node.js executable** — Node 24 or newer; defaults to `node`.
- **Language server command/path** — defaults to `forge-web-script-lsp` and
  resolves a project `node_modules/.bin` installation (including ancestor
  workspace roots) or `PATH`. An explicit JavaScript entrypoint such as
  `node_modules/@mission-platform/forge-web-script-lsp/dist/main.js` is also
  supported.
- **Server arguments** — optional quoted arguments passed to the server.
- **LSP trace** — `off`, `messages`, or `verbose`.
- **Start the language server when an FWS file is opened** — startup toggle.

For a project-local CLI, install the server in the project opened by IntelliJ:

```sh
pnpm add -D @mission-platform/forge-web-script-lsp
```

The plugin uses the IntelliJ project root as the process working directory.
LSP4IJ supplies the document lifecycle and workspace notifications; the
server's root-bounded host performs file enumeration, watched-file
invalidation, and all language analysis. The same packaged Settings state is
used by both the LSP launcher and the generic stdio DAP adapter.

### Cross-editor validation

Run the shared language-service/LSP checks and both client pipelines from the
repository root. The IntelliJ commands require a JDK supported by the pinned
Gradle/IntelliJ toolchain; the following is an example for macOS:

```sh
pnpm --filter @mission-platform/forge-web-script-language-service test
pnpm --filter @mission-platform/forge-web-script-language-service build:check
pnpm --filter @mission-platform/forge-web-script-language-service lint
pnpm --filter @mission-platform/forge-web-script-language-service format
pnpm --filter @mission-platform/forge-web-script-lsp test
pnpm --filter @mission-platform/forge-web-script-lsp build:check
pnpm --filter @mission-platform/forge-web-script-lsp lint
pnpm --filter @mission-platform/forge-web-script-lsp format
pnpm exec turbo run build --filter=fws-vscode
pnpm --filter fws-vscode test
pnpm --filter fws-vscode check:packaging
pnpm --filter fws-vscode package
JAVA_HOME=/Library/Java/JavaVirtualMachines/jdk-23.jdk/Contents/Home \
  ./extensions/fws-ij/gradlew -p extensions/fws-ij test verifyPlugin buildPlugin --no-daemon --offline
```

The staged-server and IntelliJ smoke tests exercise the same initialize,
diagnostic, completion, hover, semantic-token, shutdown, and project-root
launch contract. The shared LSP tests additionally cover workspace-folder
forwarding, `file:` URI handling, root-contained watched-file invalidation,
stable diagnostic codes/ranges, and disposal. Editor clients should expose
only the features advertised by the server; go-to-definition, references,
rename, formatting, code actions, and cross-file language imports remain
unsupported.

### Troubleshooting

- **Node runtime rejected:** run `<configured-node> --version` and select a
  Node 24+ executable in the relevant VS Code or IntelliJ setting. The client
  reports the detected version and does not silently fall back to an older
  runtime.
- **VS Code packaged server missing:** rebuild with
  `pnpm exec turbo run build --filter=fws-vscode`, confirm
  `extensions/fws-vscode/server/dist/main.js` exists, or set
  `forgeWebScript.serverPath` to a valid built entrypoint. Inspect the
  **Forge Web Script Language Server** output channel with tracing enabled.
- **IntelliJ server command not found:** install
  `@mission-platform/forge-web-script-lsp` in the opened project, ensure its
  `node_modules/.bin` is present, or configure an explicit command/path. The
  plugin reports the searched project root and suggested installation path.
- **No diagnostics or completion:** verify the file is named `.fws`, the
  client is enabled, and the workspace has a project root. Check the client
  trace/output channel and confirm the server received `file:` workspace
  folders; without a root, only already-open documents can be served.
- **Unexpected editor features:** these integrations intentionally do not
  add parser or semantic logic. Compare capabilities and stable `FWS-*`
  diagnostic codes with this document and the shared LSP package rather than
  adding editor-specific behavior.

The client should send workspace folders as `file:` URIs when supported. The
server uses workspace folders first and falls back to `rootUri`; if neither is
provided, the filesystem host has no roots and can only serve already-open
documents.

## Workspace behavior and security

The Node server creates a filesystem-backed workspace host from the roots in
the LSP initialization request. It recursively enumerates files under those
roots, reads files needed by workspace analysis, and watches root-contained
file changes. Paths are canonicalized and symlinks are resolved before reads;
an access outside every configured root is rejected. Unsupported URI schemes
are not treated as filesystem paths.

Workspace identity is URI-based. Two documents with the same basename but
different URIs remain separate documents and cache entries. Closing a
document removes its diagnostics from the client. Creating, changing, or
deleting a watched file invalidates workspace-dependent analysis and republishes
diagnostics for open documents.

The server does not introduce a project configuration file. The standard CLI
currently supplies empty workspace options unless a host is injected by code.
The language-service workspace contract is:

```ts
interface ForgeWebScriptWorkspaceHost {
  readFile(uri: string): Promise<string | undefined>;
  listFiles(): Promise<readonly string[]>;
  getOptions(uri: string): Promise<ForgeWebScriptWorkspaceOptions>;
  watch?(listener: (change: ForgeWebScriptWorkspaceChange) => void): {
    dispose(): void;
  };
}

interface ForgeWebScriptWorkspaceOptions {
  requestedCapabilities?: readonly string[];
  requireExports?: boolean;
  capabilityNames?: readonly string[];
  capabilitySignatures?: ReadonlyMap<string, ForgeWebScriptCallable>;
}
```

`requestedCapabilities` and `requireExports` are passed to
`validateForgeWebScript`. A capability import that is not allowed by the
workspace produces the stable ABI diagnostic `FWS-ABI-002`; export-related
requirements use the corresponding `FWS-ABI-003` contract. Capability names
and signatures also feed completion and hover, but are never inferred from
ambient Node or browser APIs.

### Editor export policy

Editor analysis is permissive about module-private functions by default. When
`requireExports` is omitted from the standard LSP host, an injected workspace
host, or a Monaco workspace host, it is treated as `false`, so a private helper
can be called by another function in the same module without producing
`FWS-ABI-003`. Private functions remain available to same-module symbols,
completion, hover, and call/type resolution, but they are not Wasm ABI exports.

Hosts that want ABI-only diagnostics can set `requireExports: true` globally or
for a document through `optionsForUri`; changing that policy and refreshing the
workspace invalidates cached analysis. Setting `requireExports: false` is an
explicit permissive policy. This editor default does not change compilation:
`@mission-platform/forge-web-script` continues to require `export fn` for every
compiler ABI function when its `requireExports` option is omitted.

When using the core or a programmatically created LSP server, call
`refreshWorkspace(uri)` after opening a document and before relying on
workspace-derived diagnostics, completion, or hover. The LSP adapter performs
this refresh before publishing diagnostics and before serving completion or
hover requests.

## Diagnostics and ranges

Diagnostics retain the validator's stable `code`, severity, phase, message,
file name, source span, and optional hint. The LSP representation uses the
standard zero-based `Position` and half-open `Range`; character offsets count
UTF-16 code units, including when Unicode appears before the diagnostic.

The LSP server publishes `source: "forge-web-script"`. The phase and hint are
also included in the diagnostic `data` object. Typical stable code families
are:

| Code family   | Phase        | Meaning                                                                  |
| ------------- | ------------ | ------------------------------------------------------------------------ |
| `FWS-LEX-*`   | `lex`        | Invalid characters/escapes, raw string line terminators, or unterminated strings/block comments |
| `FWS-PARSE-*` | `parse`      | Invalid module, declaration, statement, or expression syntax             |
| `FWS-TYPE-*`  | `type-check` | Invalid types, names, operators, arguments, or returns                   |
| `FWS-ABI-*`   | `abi`        | Duplicate names, denied capabilities, exports, or imports                |

Malformed input is still tokenized and analyzed where parser recovery allows
it. For example, malformed source may produce `FWS-PARSE-017` while retaining
usable lexical tokens and partial symbol information. Clients should display
the supplied range and code rather than matching diagnostic text.

String lexing accepts only JSON-compatible escapes (`\\`, `\"`, `\/`, `\b`,
`\f`, `\n`, `\r`, `\t`, and `\uXXXX`). Raw line terminators, invalid escapes,
and trailing backslashes produce lexical diagnostics (`FWS-LEX-004` or
`FWS-LEX-005`). Lexer and diagnostic spans are bounded by the source length;
clients can safely convert them directly to UTF-16 LSP ranges.

## Embedding the Monaco adapter

The browser adapter is exported by `@mission-platform/content` and lives in
`packages/content/src/monaco/forge-web-script.ts`. `ForgeMonacoEditor` loads
the adapter lazily when `language="fws"`; Monaco remains a type-only import in
the synchronous component graph, so server-side rendering does not evaluate
Monaco.

The simplest component usage is:

```tsx
<ForgeMonacoEditor
  language="fws"
  modelValue={"export fn add(value: i32) -> i32 {\n  return value + 1;\n}"}
/>
```

Set `forgeWebScript={false}` to disable the automatic integration. Otherwise,
the component registers the `fws` language and `.fws` extension, uses Monaco's
built-in token categories for themes (`keyword`, `type`, `string`, `comment`,
`number`, `operator`, `delimiter`, and `invalid`), synchronizes the active
model, publishes markers, and registers completion and hover providers.

For capability-aware browser tooling, provide a host-owned workspace object:

```tsx
const workspaceHost: ForgeWebScriptWorkspaceHost = {
  readFile: async (uri) => files.get(uri),
  listFiles: async () => [...files.keys()],
  getOptions: async () => ({
    requestedCapabilities: ["clock.now"],
    capabilityNames: ["clock.now"],
    capabilitySignatures: new Map([
      [
        "clock.now",
        {
          parameters: [],
          result: "i64",
          documentation: "Read the current Unix timestamp.",
        },
      ],
    ]),
  }),
};

<ForgeMonacoEditor
  language="fws"
  forgeWebScript={{ workspaceHost }}
  modelValue={
    'import capability "clock.now" as now() -> i64;\nexport fn current() -> i64 {\n  return now();\n}'
  }
/>;
```

The host is deliberately injected: browser consumers must provide reads,
file enumeration, project options, and optional change notifications from
their own storage or application state. The adapter never assumes Node's
filesystem APIs and does not connect to the stdio server. Dispose the returned
adapter handle (or unmount `ForgeMonacoEditor`) to remove model listeners,
providers, markers, and service caches.

For imperative integration, use the same adapter directly after Monaco has
been loaded:

```ts
import {
  attachForgeWebScriptMonaco,
  registerForgeWebScriptLanguage,
} from "@mission-platform/content";

registerForgeWebScriptLanguage(monaco);
const handle = attachForgeWebScriptMonaco(editor, monaco, { workspaceHost });

await handle.refresh();
// On editor teardown:
handle.dispose();
```

`registerForgeWebScriptLanguage` is safe to call when `fws` is already
registered. The registration handle disposes token providers; the adapter
handle additionally disposes completion/hover providers, model listeners,
markers, and its owned language-service instance.

## LSP versus browser workspaces

| Consumer        | Workspace implementation                           | Root/security boundary                                                        | Transport          |
| --------------- | -------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------ |
| Node LSP client | `RootBoundedForgeWebScriptWorkspaceHost`           | Canonicalized configured filesystem roots; outside reads are rejected         | stdio LSP          |
| Monaco/browser  | Application-supplied `ForgeWebScriptWorkspaceHost` | The host decides which URIs/files/options to expose; no filesystem assumption | In-process adapter |

Both adapters use the same language-service contracts and analysis semantics,
but they do not share a document store or transport. A browser host must not
pass Node filesystem functions into a browser bundle. Conversely, the Node LSP
server should be used for external clients rather than attempting to run its
filesystem host in Monaco.

## Validation and conformance

The language-service and LSP packages include tests for accepted and rejected
bootstrap fixtures, diagnostic codes and UTF-16 ranges, malformed input,
workspace invalidation, root isolation, LSP synchronization, completion,
hover, and disposal. The content package includes adapter, highlighting,
marker, provider, disposal, and SSR/non-Forge editor coverage.

Run the focused checks from the repository root:

```sh
pnpm --filter @mission-platform/forge-web-script-language-service test
pnpm --filter @mission-platform/forge-web-script-language-service build:check
pnpm --filter @mission-platform/forge-web-script-language-service lint
pnpm --filter @mission-platform/forge-web-script-language-service format

pnpm --filter @mission-platform/forge-web-script-lsp test
pnpm --filter @mission-platform/forge-web-script-lsp build:check
pnpm --filter @mission-platform/forge-web-script-lsp lint
pnpm --filter @mission-platform/forge-web-script-lsp format

pnpm --filter @mission-platform/content exec vitest run \
  src/monaco/forge-web-script.spec.ts \
  src/components/organisms/forge-monaco-editor/forge-monaco-editor.spec.ts
pnpm --filter @mission-platform/content build:check
```

Package-wide content lint and format commands also inspect unrelated CSS/SCSS
files; a failure limited to those existing files is not a Forge Web Script
language-tooling regression. The authoritative language fixture expectations
remain in `../../../forge-web-script/src/fixtures/bootstrap.ts` and the
[language reference](../../../forge-web-script/docs/reference/language.md).
