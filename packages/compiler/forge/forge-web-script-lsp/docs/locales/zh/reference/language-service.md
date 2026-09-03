# Forge Web 脚本语言工具

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> packages/forge-web-script-lsp/docs/reference/language-service.md: [packages/forge-web-script-lsp/docs/reference/language-service.md](../../../reference/language-service.md)
> 语言: 简体中文 (zh)

Forge Web Script (`.fws`) 有一个编辑器中立的语言服务，一个 stdio
语言服务器协议 (LSP) 服务器和面向浏览器的 Monaco 适配器。
所有三个都使用可执行的 Forge Web Script v1 合约
`@mission-platform/forge-web-script`，因此诊断、源范围、符号、
完成和悬停信息来自相同的解析器和
验证器。

支持的语言合约是**版本 1.0**，ABI 合约是
**版本 1.2**。该工具确实
不改变语法、编译器输出、ABI 或现有的 Rust 和
AssemblyScript 集成。看 [Forge Web 脚本 v1](../../../../../forge-web-script/docs/locales/zh/reference/language.md)
获取语言和 ABI 参考。

## 特征和边界

语言服务目前提供：

- 词法分析、解析、类型检查和 ABI 验证的诊断；
- 适用于 LSP 和 Monaco 的 UTF-16 感知范围；
- 模块、函数、参数、局部变量、能力的文档符号
  别名、聚合类型、字段、枚举变体、接口方法、泛型
  参数、迭代器绑定、匹配绑定和原始类型；
- Forge 关键字、原始类型、声明、局部变量的完成，
  聚合类型、泛型类型、函数、编译器拥有的字符串和正则表达式
  功能、功能别名和主机清单功能名称；
- 声明、参数、局部变量、调用和的悬停信息
  当 AST 识别符号时导入功能，包括聚合
  类型、泛型类型、编译器拥有的标准库调用和渲染
  源定义函数的文档；和
- v1 词汇标记化，用于注释、字符串、数字、关键字、类型、
  运算符、标点符号、声明和无效文本。

LSP 服务器公开诊断、完成、悬停和完整语义
代币。转到定义、引用、重命名、格式化、代码操作、
源级跨文件语言导入和浏览器托管的 LSP 传输
没有实施。摩纳哥改用本地语言服务适配器
连接到 Node 服务器的步骤。

语义标记使用语言服务的词汇分类。的
初始化响应通告包含 `comment`、`declaration`、
`identifier`、`invalid`、`keyword`、`number`、`operator`、`punctuation`、
`string` 和 `type`；客户端请求编码的完整文档令牌
`textDocument/semanticTokens/full`。

## 编辑器结果中的函数文档

语言服务公开源定义的顶级文档
功能。它使用相同的规范化文档字符串进行声明
悬停、参考悬停和功能完成。主机提供的能力
签名继续使用现有的可选字符串文档，并且
不解析为 FWS Javadoc 注释。

例如，这个来源：

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

将 `add` 悬停在其声明处或 `caller` 中的调用处会返回
签名后跟所呈现的文档：

```text
export add(i32): i32

Adds one to a value.

@param value Input value.

@return Incremented value.

@deprecated Prefer `increment` in new code.
```

将 `add` 悬停在 `caller` 中的调用站点会返回相同的文档
带有非声明签名：

```text
add(i32): i32

Adds one to a value.

@param value Input value.

@return Incremented value.

@deprecated Prefer `increment` in new code.
```

`add` 的补全带有相同的文档字符串及其
细节/签名。描述段落和标签之间用空行分隔；
保留标签顺序、重复标签和未知标签。核心语法和
规范化规则，包括功能关联和支持的主题
形式，指定于 [FWS 语言参考](../../../../../forge-web-script/docs/locales/zh/reference/language.md)。

文档只是信息性元数据。它不会改变诊断，
类型检查、函数解析、生成的声明、ABI 签名、
清单、Wasm/WAT、运行时行为或可执行哈希。一个文档
因此，编辑会更改悬停和完成内容，而不更改
已编译的模块合约。

### LSP渲染

stdio 服务器将框架中立的语言服务结果映射到标准
LSP值：

- `textDocument/hover` 返回 Markdown，其值加入签名并
  带有空行的文档；
- `textDocument/completion` 设置每个源功能项的 `documentation`
  字段到相同的呈现字符串并保留现有的 `detail` 签名
  不变。

LSP 服务器不会重新解释标签或应用特定于编辑器的格式。
客户端可以按原样显示返回的 Markdown/纯文本。

### 摩纳哥渲染图

`@mission-platform/content` 注册相同的进程内语言服务
`ForgeMonacoEditor` 使用的提供程序：

- 摩纳哥悬停 `contents` 包含签名和呈现的文档，如下所示
  单独的 Markdown 兼容值；
- 源函数建议的 `documentation` 字段包含相同的内容
  将字符串渲染为 LSP 补全；
- 词法 `comment` 标记分类对于两者均保持不变
  普通和文档块注释。

Monaco 适配器未连接到 Node LSP 服务器或复制
文档解析器。它转发语言服务结果，因此浏览器和
stdio 客户端保持一致，并且都使用 UTF-16 源范围。

## 运行 stdio 服务器

服务器发布为 `@mission-platform/forge-web-script-lsp` 且
公开可执行文件 `forge-web-script-lsp`。它讲标准 LSP
标准输入/标准输出；应用程序永远不会将协议消息写入标准输出
记录。准备情况和错误消息将写入 stderr。

从该存储库的签出中，使用以下命令构建并运行它：

```sh
pnpm --filter @mission-platform/forge-web-script-lsp build
node packages/forge-web-script-lsp/dist/main.js
```

当包安装到外部项目中时，配置客户端
直接调用包可执行文件：

```sh
forge-web-script-lsp
```

服务器需要 Node.js 24 或更高版本。它不采用 `--stdio` 标志；
stdio 始终是传输。客户端应发送 `initialize`，使用
返回功能，然后发送正常的 `initialized` 通知。
服务器支持全文同步、工作区文件夹、观看
文件更改、完成、悬停和关闭/退出。

### Stdio 客户端配置示例

分别接受命令和参数的客户端应该使用
`forge-web-script-lsp` 用于已安装的软件包。结帐可以使用 `node` 和
而是构建的入口点：

```json
{
  "command": "node",
  "args": ["${workspaceFolder}/packages/forge-web-script-lsp/dist/main.js"],
  "filetypes": ["fws"],
  "rootPatterns": ["package.json", ".git"]
}
```

例如，Neovim 的内置 LSP 客户端可以使用已安装的可执行文件：

```lua
vim.lsp.config('forge_web_script', {
  cmd = { 'forge-web-script-lsp' },
  filetypes = { 'fws' },
  root_markers = { 'package.json', '.git' },
})
vim.lsp.enable('forge_web_script')
```

Helix 可以在 `languages.toml` 中使用相同的可执行文件：

```toml
[language-server.forge-web-script-lsp]
command = "forge-web-script-lsp"

[[language]]
name = "fws"
scope = "source.fws"
file-types = ["fws"]
language-servers = ["forge-web-script-lsp"]
```

VS Code 需要 LSP 客户端扩展；配置该扩展
相同的命令和参数，而不是将这些字段添加到普通字段中
`settings.json`。

## 编辑器集成

该存储库为 VS Code 和 IntelliJ IDEA 提供第一方客户端。
两个客户端都使用此 stdio 服务器进行诊断、完成、悬停和
完整的语义标记；两个客户端都不包含解析器、PSI 模型或语义
分析实施。服务器需要 Node.js **24 或更高版本**。一个
特定于平台的 Node 运行时不与任一编辑器集成捆绑在一起。

### VS代码

从以下位置安装 `fws-vscode-0.1.0.vsix` 文件
`extensions/fws-vscode` 发布输出，带有 **扩展：从 VSIX 安装**，
然后重新加载 VS Code。打开 `.fws` 文件会激活扩展。的
默认启动路径是 VSIX 中捆绑的服务器，扩展名
使用通过 stdio 配置的 Node 可执行文件启动它。

该扩展提供 `fws` 语言 ID、`.fws` 文件名关联、
基线注释/括号/词汇突出显示，以及 LSP 文件观察器。的
服务器仍然负责语义标记和所有语言行为。
工作区文件夹在 `initialize` 中作为 `file:` URI 发送，保留
服务器的工作空间根目录和路径隔离契约。

在 VS Code 设置（或 `settings.json`）中配置扩展：

```json
{
  "forgeWebScript.nodePath": "/path/to/node-24/bin/node",
  "forgeWebScript.serverPath": "",
  "forgeWebScript.serverArgs": [],
  "forgeWebScript.trace.server": "off"
}
```

`forgeWebScript.nodePath` 默认为 `node`，并且必须解析为 Node 24 或
较新。将 `forgeWebScript.serverPath` 留空以使用打包的服务器；
将其设置为绝对路径或相对于第一个工作区文件夹的路径
测试本地构建或项目提供的 `dist/main.js`。附加
参数在服务器入口点之后传递。使用 `messages` 或 `verbose`
用于LSP追踪；启动失败被写入 **Forge Web 脚本
语言服务器** 输出通道并显示为编辑器错误。

对于从此存储库进行本地开发：

```sh
pnpm install --frozen-lockfile
pnpm exec turbo run build --filter=fws-vscode
pnpm --filter fws-vscode test
pnpm --filter fws-vscode check:packaging
pnpm --filter fws-vscode package
```

构建首先构建共享 LSP 包，然后暂存其入口点
以及 `extensions/fws-vscode/server` 下的运行时依赖项。 `package`
产生 `extensions/fws-vscode/fws-vscode-0.1.0.vsix`；发展来源
`.vscodeignore` 排除了测试文件。包装好的烟雾检查
初始化暂存服务器并验证通告的完成、悬停、
语义标记和稳定的诊断行为。

### IntelliJ IDEA / LSP4IJ

构建插件 ZIP 并通过 **Settings | 安装它插件 |齿轮|
从磁盘安装插件**：

```sh
cd extensions/fws-ij
JAVA_HOME=/path/to/jdk-23 ./gradlew test verifyPlugin buildPlugin --no-daemon --offline
```

生成的 `build/distributions/fws-ij-0.1.0.zip` 包含薄
LSP4IJ 集成。该插件针对 IntelliJ IDEA 社区进行编译
2024.3.3（内部版本 243），保留内部版本的开放式兼容性范围
243 及以上版本，并根据 WebStorm 2026.2.1（分支 262，包括
`WS-262.9437.145`）。它引脚 LSP4IJ 0.20.1 并且不捆绑 Node.js 或
语言服务器。安装后如果没有立即重新启动 IDE
识别 `.fws` 文件。

该插件将 `*.fws` 映射到语言 ID `fws` 并启动一个共享 stdio
项目的服务器。 IntelliJ 配置由以下公司独家提供
**设置|工具|伪造网页脚本**；没有项目脚本或 Flora
配置路径。配置：

- **Node.js 可执行文件** — Node 24 或更高版本；默认为 `node`。
- **语言服务器命令/路径** — 默认为 `forge-web-script-lsp` 和
  解决项目 `node_modules/.bin` 安装（包括祖先
  工作区根目录）或 `PATH`。显式 JavaScript 入口点，例如
  `node_modules/@mission-platform/forge-web-script-lsp/dist/main.js` 也是
  支持。
- **服务器参数** — 传递给服务器的可选带引号参数。
- **LSP 跟踪** — `off`、`messages` 或 `verbose`。
- **打开 FWS 文件时启动语言服务器** — 启动切换。

对于项目本地 CLI，将服务器安装在 IntelliJ 打开的项目中：

```sh
pnpm add -D @mission-platform/forge-web-script-lsp
```

该插件使用 IntelliJ 项目根目录作为进程工作目录。
LSP4IJ 提供文档生命周期和工作区通知；的
服务器的根边界主机执行文件枚举、监视文件
无效，以及所有语言分析。相同的打包设置状态是
由 LSP 启动器和通用 stdio DAP 适配器使用。

### 跨编辑器验证

从以下位置运行共享语言服务/LSP 检查和两个客户端管道
存储库根。 IntelliJ 命令需要固定支持的 JDK
Gradle/IntelliJ 工具链；以下是 macOS 的示例：

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

分阶段服务器和 IntelliJ 烟雾测试执行相同的初始化，
诊断、完成、悬停、语义标记、关闭和项目根
启动合同。共享 LSP 测试还涵盖工作区文件夹
转发、`file:` URI 处理、根包含的监视文件失效、
稳定的诊断代码/范围和处置。编辑客户应该公开
仅服务器公布的功能；转到定义、参考文献、
重命名、格式化、代码操作和跨文件语言导入仍然存在
不支持。

### 故障排除

- **Node 运行时被拒绝：** 运行 `<configured-node> --version` 并选择一个
  Node 相关 VS Code 或 IntelliJ 设置中的 24+ 可执行文件。客户
  报告检测到的版本并且不会默默地回退到旧版本
  运行时。
- **VS Code 打包服务器丢失：** 重建为
  `pnpm exec turbo run build --filter=fws-vscode`，确认
  `extensions/fws-vscode/server/dist/main.js` 存在，或设置
  `forgeWebScript.serverPath` 到有效的内置入口点。检查
  **伪造 Web 脚本语言服务器** 启用跟踪的输出通道。
- **未找到 IntelliJ 服务器命令：** 安装
  `@mission-platform/forge-web-script-lsp` 在打开的项目中，确保其
  `node_modules/.bin` 存在，或配置显式命令/路径。的
  插件报告搜索到的项目根目录和建议的安装路径。
- **无诊断或完成：** 验证文件名为 `.fws`，
  客户端已启用，并且工作区具有项目根目录。检查客户端
  跟踪/输出通道并确认服务器收到 `file:` 工作区
  文件夹；如果没有 root，则只能提供已经打开的文档。
- **意外的编辑器功能：** 这些集成故意不
  添加解析器或语义逻辑。比较功能和稳定 `FWS-*`
  诊断代码与本文档和共享 LSP 包而不是
  添加特定于编辑器的行为。

如果支持，客户端应将工作区文件夹作为 `file:` URI 发送。的
服务器首先使用工作区文件夹并回退到 `rootUri`；如果两者都不是
前提是，文件系统主机没有根目录，只能为已经打开的文件系统提供服务
文件。

## 工作区行为和安全

Node 服务器从根目录创建一个文件系统支持的工作区主机
LSP初始化请求。它递归地枚举这些文件下的文件
root，读取工作区分析所需的文件，并监视 root 包含的文件
文件更改。在读取之前对路径进行规范化并解析符号链接；
每个配置的根之外的访问都会被拒绝。不支持的 URI 方案
不被视为文件系统路径。

工作区身份是基于 URI 的。两个具有相同基本名称的文档，但是
不同的 URI 保留单独的文档和缓存条目。关闭一个
文档从客户端删除其诊断。创造、改变或
删除监视的文件会使依赖于工作区的分析无效并重新发布
打开文档的诊断。

服务器端不引入项目配置文件。标准 CLI
目前提供空工作区选项，除非通过代码注入主机。
语言服务工作区合同是：

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

`requestedCapabilities` 和 `requireExports` 传递给
`validateForgeWebScript`。不允许的能力导入
工作区生成稳定的 ABI 诊断 `FWS-ABI-002`；出口相关
要求使用相应的`FWS-ABI-003`合约。能力名称
签名也提供完成和悬停，但永远不会从
环境 Node 或浏览器 API。

### 编辑出口政策

默认情况下，编辑器分析允许模块私有函数。当
标准 LSP 主机（注入的工作区）中省略了 `requireExports`
主机，或 Monaco 工作区主机，它被视为 `false`，因此是私人助手
可以被同一模块中的另一个函数调用而不产生
`FWS-ABI-003`。私有函数仍然可用于同模块符号，
完成、悬停和调用/类型解析，但它们不是 Wasm ABI 导出。

想要仅 ABI 诊断的主机可以全局设置 `requireExports: true` 或
通过 `optionsForUri` 获取文档；改变该政策并刷新
工作区使缓存的分析无效。设置 `requireExports: false` 是
明确的宽松政策。此编辑器默认不更改编译：
`@mission-platform/forge-web-script` 继续需要 `export fn`
省略 `requireExports` 选项时的编译器 ABI 函数。

当使用核心或以编程方式创建的 LSP 服务器时，调用
`refreshWorkspace(uri)` 打开文档之后和依赖之前
工作区派生的诊断、完成或悬停。 LSP适配器执行
在发布诊断之前和服务完成之前刷新或
悬停请求。

## 诊断和范围

诊断保留验证器的稳定 `code`、严重性、阶段、消息、
文件名、源范围和可选提示。 LSP 表示使用
标准零基 `Position` 和半开放 `Range`；字符偏移量计数
UTF-16 代码单元，包括 Unicode 出现在诊断之前的情况。

LSP服务器发布`source: "forge-web-script"`。阶段和提示是
也包含在诊断 `data` 对象中。典型的稳定代码族
是：

| 代码家族      | 相           | 意义                                                       |
| ------------- | ------------ | ---------------------------------------------------------- |
| `FWS-LEX-*`   | `lex`        | 无效字符/转义符、原始字符串行终止符或未终止的字符串/块注释 |
| `FWS-PARSE-*` | `parse`      | 无效的模块、声明、语句或表达式语法                         |
| `FWS-TYPE-*`  | `type-check` | 无效的类型、名称、运算符、参数或返回                       |
| `FWS-ABI-*`   | `abi`        | 重复名称、被拒绝的功能、导出或导入                         |

在解析器恢复允许的情况下，仍会对格式错误的输入进行标记和分析
它。例如，格式错误的源可能会生成 `FWS-PARSE-017`，同时保留
可用的词汇标记和部分符号信息。客户端应显示
提供的范围和代码而不是匹配的诊断文本。

字符串词法分析仅接受 JSON 兼容的转义（`\\`、`\"`、`\/`、`\b`、
`\f`、`\n`、`\r`、`\t` 和 `\uXXXX`）。原始行终止符、无效转义符、
和尾部反斜杠产生词法诊断（`FWS-LEX-004` 或
`FWS-LEX-005`)。词法分析器和诊断范围受源长度限制；
客户端可以安全地将它们直接转换为 UTF-16 LSP 范围。

## 嵌入 Monaco 适配器

浏览器适配器由 `@mission-platform/content` 导出并位于
`packages/content/content/content/src/monaco/forge-web-script.ts`。 `ForgeMonacoEditor` 加载
当 `language="fws"` 时适配器会延迟；摩纳哥仍然是仅类型进口
同步组件图，因此服务器端渲染不会评估
摩纳哥。

最简单的组件用法是：

```tsx
<ForgeMonacoEditor
  language="fws"
  modelValue={'export fn add(value: i32) -> i32 {\n  return value + 1;\n}'}
/>
```

设置 `forgeWebScript={false}` 以禁用自动集成。否则，
该组件注册 `fws` 语言和 `.fws` 扩展，使用 Monaco 的
主题的内置标记类别（`keyword`、`type`、`string`、`comment`、
`number`、`operator`、`delimiter` 和 `invalid`)，同步活动
模型、发布标记并注册完成和悬停提供程序。

对于功能感知的浏览器工具，提供主机拥有的工作区对象：

```tsx
const workspaceHost: ForgeWebScriptWorkspaceHost = {
  readFile: async (uri) => files.get(uri),
  listFiles: async () => [...files.keys()],
  getOptions: async () => ({
    requestedCapabilities: ['clock.now'],
    capabilityNames: ['clock.now'],
    capabilitySignatures: new Map([
      [
        'clock.now',
        {
          parameters: [],
          result: 'i64',
          documentation: 'Read the current Unix timestamp.',
        },
      ],
    ]),
  }),
};

<ForgeMonacoEditor
  language="fws"
  forgeWebScript={{ workspaceHost }}
  modelValue={'import capability "clock.now" as now() -> i64;\nexport fn current() -> i64 {\n  return now();\n}'}
/>;
```

故意注入主机：浏览器消费者必须提供读取，
文件枚举、项目选项和可选的更改通知
他们自己的存储或应用程序状态。适配器从不假设 Node
文件系统 API，不连接到 stdio 服务器。处理退回的
适配器句柄（或卸载 `ForgeMonacoEditor`）以删除模型侦听器，
提供者、标记和服务缓存。

对于命令式集成，请在 Monaco 完成后立即使用相同的适配器
已加载：

```ts
import { attachForgeWebScriptMonaco, registerForgeWebScriptLanguage } from '@mission-platform/content';

registerForgeWebScriptLanguage(monaco);
const handle = attachForgeWebScriptMonaco(editor, monaco, { workspaceHost });

await handle.refresh();
// On editor teardown:
handle.dispose();
```

当 `fws` 已经存在时，可以安全地调用 `registerForgeWebScriptLanguage`
已注册。注册句柄处置令牌提供者；适配器
句柄还处理完成/悬停提供程序、模型侦听器、
标记及其拥有的语言服务实例。

## LSP 与浏览器工作区

| 消费者          | 工作区实施                                   | 根/安全边界                                      | 交通         |
| --------------- | -------------------------------------------- | ------------------------------------------------ | ------------ |
| Node LSP 客户端 | `RootBoundedForgeWebScriptWorkspaceHost`     | 规范化的配置文件系统根；外部读取被拒绝           | stdio LSP    |
| 摩纳哥/浏览器   | 应用程序提供的 `ForgeWebScriptWorkspaceHost` | 主机决定公开哪些 URI/文件/选项；没有文件系统假设 | 进程内适配器 |

两个适配器都使用相同的语言服务契约和分析语义，
但它们不共享文档存储或传输。浏览器主机不得
将 Node 文件系统函数传递到浏览器包中。相反，Node LSP
服务器应该用于外部客户端而不是尝试运行它的
摩纳哥的文件系统主机。

## 验证和一致性

语言服务和 LSP 包包括接受和拒绝的测试
引导程序装置、诊断代码和 UTF-16 范围、格式错误的输入、
工作区失效、根隔离、LSP 同步、完成、
悬停并处置。内容包包括适配器、突出显示、
标记、提供者、处置和 SSR/非 Forge 编辑器覆盖范围。

从存储库根运行重点检查：

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

包范围内的内容 lint 和格式命令还会检查不相关的 CSS/SCSS
文件；仅限于现有文件的故障不是 Forge Web 脚本
语言工具回归。权威语言夹具期望
保留在 `../../../forge-web-script/src/fixtures/bootstrap.ts` 中并且
[语言参考](../../../../../forge-web-script/docs/locales/zh/reference/language.md)。
