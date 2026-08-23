# Forge Web 脚本 v1

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> packages/forge-web-script/docs/reference/language.md: [packages/forge-web-script/docs/reference/language.md](../../../reference/language.md)
> 语言: 简体中文 (zh)

Forge Web Script (`.fws`) 是一种用于 WebAssembly 的小型通用语言
工作负载。它是网络优先的、基于能力的并且故意独立于
Vue、React、DOM 和 Forge 组件编译器。该文档是
权威的v1语言和模块合约。 `@mission-platform/forge-web-script`
是浏览器安全的兼容性外观，用于解析、类型检查、图形/链接
Vite 适配器使用的分辨率、清单数据和编译器服务 API
和LSP。 `@mission-platform/forge-web-script-wasm` 是确定性后端
将检查的 IR 降低到经过验证的 WebAssembly 和 WAT。仅 Node
`@mission-platform/forge-web-script-cli` 软件包提供 `forge-web-script`
用于检查和编译文件或源图的命令。 TypeScript
包还包含可执行的一致性装置。

## 状态和版本控制

当前合约是**语言版本`1.0`**和**逻辑ABI版本
`1.2`**。语言版本描述来源和语义； ABI版本
描述了 WebAssembly 边界和主机协议。它们是版本化的
独立。编译器必须将两个版本写入每个生成的模块中
清单，并且加载程序必须在实例化之前验证两者。 ABI `1.2` 是
内存合约的重大修订：`memory` 清单必须声明
`allocatorExport: "fws_alloc"`、`deallocatorExport: "fws_dealloc"` 和
`reallocatorExport: "fws_realloc"`，而 `fws_reset` 必须存在于
模块导出集。加载器拒绝旧的或不完整的清单和模块
而不是默默地假设丢失的重新分配器。

源格式为 UTF-8 文本，扩展名为 `.fws`。源文件是一个
文件定义的模块；其身份源自规范化的 Vite 文件 ID
（或工作空间相对路径）。编译器输入标识语言版本，而
生成的清单是加载程序使用的持久版本标记。未来
修订版可能会添加源编译指示，但 v1 不需要； v1 编译器
必须拒绝它不理解的源构造，而不是猜测它的
版本。

## 来源分析及发布政策

核心包公开了编译器、语言的一种分析契约
服务、CLI 和 MCP 集成。 `analyzeForgeWebScript` 接受检查
前端结果和可选的注册规则，然后返回事实、发现和
编译器的其余部分使用相同的稳定诊断。分析背景
包括源文件、可选的源映射条目、原始和优化的 IR、
ABI 清单、图形/链接元数据、目标配置文件和标准化策略。

分析结果使用稳定的 `FWS-ANALYSIS-*` 代码并包括一个类别，
严重性、UTF-16 兼容的源范围、证据、补救提示和
可选的 OWASP/CWE 参考。他们的诊断添加了 `phase: "analysis"` 和
安全元数据，无需更改现有 `FWS-LEX-*`、`FWS-PARSE-*`、
`FWS-TYPE-*` 或 `FWS-ABI-*` 诊断。

编译默认使用 strict 配置文件。在严格模式下，错误严重性
结果（或明确标记为 `blocking` 的结果）阻止 Wasm 和 ESM 输出；
完整的报告仍可用于返回的工件。发展历程
配置文件适用于编辑和调查工作流程：它报告调查结果
但不使用它们作为释放门。策略包括明确的能力
结果、调用深度、循环、分配、异步的允许列表和有界限制
任务和正则表达式输入。

编译器服务缓存键包括规范化分析策略、注册
规则标识符和源映射输入。更改任何这些分析输入
因此不能重用在不同策略下生成的工件。

## 无异常结果和结构化控制流程

Forge Web Script 代表标准库的可恢复结果
`Option<T>` 和 `Result<T, E>` 枚举。使用 `match` 处理每个变体；
源代码级 `throw`、`try` 和 `catch` 不是可执行构造。的
结构化`for`、`while`和`do while`形式是可执行的v1控制流；
它们不是异常或迭代器构造。 `Result` 恰好具有
变体 `Ok(T)` 和 `Error(E)`。

迭代器函数使用 `iter fn`，返回 `Iterator<T>`，并在 `yield` 处挂起：

```fws
export iter fn forward(source: Iterator<i32>) -> Iterator<i32> {
  loop value = source.next() { yield value; }
}
```

编译器通过与 JavaScript 兼容的方式公开迭代器导出
`next()` 适配器。每次调用都会返回 `{ value, done: false }` 值，并且
`{ value: undefined, done: true }` 完成时；后续通话仍保留
完成。 `Iterator<T>.next()` 的类型为 `Option<T>`，因此链式迭代器
必须保留元素类型和所有权合同。

## 优化和目标配置文件

发布优化可以应用经过验证的迭代器展开、纯调用内联、
尾调用分析和安全条件折叠。使用 `noinline` 指令
当函数边界必须保持可见时。能力导入和记录
是可观察到的副作用，不会重新排序。目标功能是可选的
编译输入并记录在 ABI 清单和缓存键中：

```ts
const artifact = compileForgeWebScript({
  source,
  fileName: "runtime.fws",
  compilerVersion: "1.0.0",
  optimization: "release",
  targetFeatures: { simd: true, tailCall: true, memory64: true },
  compilerHints: { iteratorUnrollLimit: 4 },
});
```

必须同时启用 `threads` 和 `atomics` 才能实现共享内存原子输出；
不支持的组合会产生诊断。 memory64 清单使用 `u64`
地址和指针长度 u64 值。在调试模式下，配置的缓存可能
坚持确定性 `<key>.optimized.wat`、`<key>.unoptimized.wat`、
`<key>.optimized.wasm` 和 `<key>.unoptimized.wasm` 工件。缓存写入
是附加的且不可用或失败的缓存不会导致编译失败。

## 跨项目链接配置文件

FWS 支持两个用于跨项目依赖关系管理的主要链接配置文件：

- `linkProfile: "static"`：跨项目模块被扁平化为单个
  扫描仪图形工件。这使得积极的静态优化成为可能
  （`static-aggressive` 配置文件）并消除了运行时模块查找
  工件大小的成本。
- `linkProfile: "dynamic"`：保留显式源模块边界。
  `ForgeWebScriptDynamicLinkCache` 用于在运行时解析解码器模块，
  具有由工件和清单身份键控的缓存函数地址。这个
  使用`dynamic-conservative`优化配置文件，更安全
  模块化发行版。

## 词汇参考

规范的签入语法是
[`src/grammar/forge-web-script.ebnf`](../../../../src/grammar/forge-web-script.ebnf)。
下面的词法和解析器摘要解释了公共 v1 合约；的
当实现细节不明确时，EBNF 工件具有权威性。

除了字符串内部之外，空白是微不足道的。 `//` 开始发表评论
运行到该行的末尾。 `/*` 开始一个块注释，并在下一个块注释处结束
`*/`；块注释可能跨行。评论均为琐事，请勿进入
语法。标识符以 `A-Z`、`a-z` 或 `_` 开头，并且
继续使用这些字符或十进制数字。标识符是
区分大小写。整数文字是非负十进制序列； v1 确实
不接受十六进制、八进制或浮点文字语法
引导程序子集。字符串使用双引号并且仅兼容 JSON 的转义：
`\\`、`\"`、`\/`、`\b`、`\f`、`\n`、`\r`、`\t` 和 `\uXXXX` 与
四个十六进制数字。原始行终止符和无效转义符是词汇上的
错误；请改用 `\n` 或 `\r`。字符串值是 UTF-8 值。

保留字为 `as`、`capability`、`case`、`catch`、`class`、
`constructor`、`default`、`do`、`else`、`enum`、`extends`、`export`、`for`、
`fn`、`if`、`impl`、`import`、`inline`、`interface`、`iter`、`let`、`likely`、
`loop`、`match`、`module`、`new`、`noinline`、`return`、`struct`、`switch`、
`throw`、`trait`、`try`、`unlikely`、`while` 和 `yield`。 `true` 和 `false`
是布尔文字。标点符号是
`{ } ( ) [ ] : ; , | .`；运营商是
`! % * + - / < <= == != > >= && || = -> => ::`。

每个诊断跨度都是半开源偏移范围 `[start, end)`
原始 UTF-16 TypeScript 字符串（偏移量计数 UTF-16 代码单元），其中
从一开始的行和列字段。这
引导程序实现将偏移量和行/列数据一起报告，以便
Vite 适配器可以生成源映射诊断而无需重新解析。

扫描器将注释保留为 `comment` 标记，因此文档注释可以
附加到函数，而解析器决策则跳过所有琐事。运营商
具有共享前缀的通过最长匹配来选择。当输入格式错误时
扫描仪消耗有界区域，发出稳定的 `FWS-LEX-*` 诊断信息，并且
继续到单个 EOF 令牌；这种恢复行为是语法的一部分
合同。 TypeScript 前端测量 UTF-16 代码单元中的所有偏移量；
自托管字节阶段必须在发布之前转换 UTF-8 字节范围
共享代币合约。

### 功能文档注释

开始分隔符为 `/**` 的块注释是文档注释。
仅当以下情况时，它才会附加到下一个顶级 `fn` 或 `export fn` 声明：
注释和声明之间出现空格和普通注释：

```fws
/**
 * Adds one to a value.
 *
 * @param value The value to increment.
 * @return The incremented value.
 * @deprecated Use `increment` in new code.
 */
export fn add(value: i32) -> i32 {
  return value + 1;
}
```

功能导入、源导入、结构之前的文档注释
枚举、接口或其他非函数声明将被丢弃。他们确实
不结转到以后的功能。如果出现多个文档注释
在一个声明之前，使用最接近的（最后一个）文档注释；
普通 `//` 和 `/* ... */` 注释不会替换它。文档是
仅在最高层得到认可；函数体内的注释不是
函数元数据。未终止的块注释会产生稳定的词法
诊断 `FWS-LEX-003` 和解析器恢复仍然可用于其余部分
来源。

标准化 AST 元数据具有以下形状：

```ts
interface ForgeWebScriptDocumentation {
  readonly description: string;
  readonly tags: readonly ForgeWebScriptDocumentationTag[];
}

interface ForgeWebScriptDocumentationTag {
  readonly name: string;
  readonly subject?: string;
  readonly text: string;
}
```

规范化器删除 `/**` 和 `*/` 分隔符、前导空格、
每行可选的前导 `*` 装饰以及周围的空白。跑步
的空白折叠成一个空格。第一个标签之前的描述行
分为段落；空白行保留段落分隔符。标签开始
在以 `@` 开头的行上，并且以下非空行继续
上一个标签。保留标签顺序和重复标签。

常用的标签形式有：

|标签形式 |结构化字段 |
| -------------------------------------------------------- | -------------------------------------------- |
| | `@param name text`、`@arg`、`@argument` 或 `@parameter` | `name` 是 `subject`；剩下的就是 `text` |
| `@typeparam name text` | `name` 是 `subject`；剩下的就是 `text` |
| `@throws type text` 或 `@exception type text` | `type` 是 `subject`；剩下的就是 `text` |
| `@return text` 或 `@returns text` |仅限 `text` |
| `@deprecated text` |仅限 `text` |

其他 `@name` 表单被接受并保留为有序标签，而不是
报告为诊断。他们没有推断的主题；他们的剩余文本
被保留。标记名称区分大小写。

对于编辑器使用者，相同的元数据被确定性地呈现为
描述后跟按源代码顺序排列的每个标签，中间有空行
零件。主题在标签名称及其文本之间发出，例如：

```text
Adds one to a value.

@param value The value to increment.

@return The incremented value.

@deprecated Use `increment` in new code.
```

文档是分析元数据，而不是可执行的语言语义。它可能
为语言服务消费者保留在 AST 和 IR 中，但它并没有
影响声明的解析、类型检查、降低或运行时行为。
文档不包含在 ABI 签名和清单中，生成
声明和加载程序工件、Wasm/WAT、可执行内容哈希值以及
能力要求。因此，仅更改文档注释即可
不更改模块的 ABI 或生成的可执行合约。

## 源语法

上面链接的签入 EBNF 工件描述了完整的词汇，
引导程序、扩展聚合和恢复契约。以下摘录
为不需要完整文件的读者描述了 v1 引导程序界面。
该语法在通常的 EBNF 意义上使用 `*` 和 `?`：

```ebnf
module       = { import | function } ;
import       = "import", "capability", string, "as", identifier,
               "(", [ parameters ], ")", "->", type, ";" ;
sourceImport = "import", string, "as", identifier, ";" ;
function     = [ "export" ], "fn", identifier, "(", [ parameters ], ")",
               "->", type, block ;
parameters   = parameter, { ",", parameter } ;
parameter    = identifier, ":", type ;
block        = "{", { statement }, "}" ;
statement    = "let", identifier, ":", type, "=", expression, ";"
             | "return", [ expression ], ";"
             | "if", expression, block, [ "else", block ]
             | "while", expression, block
             | "for", "(", [ for-clause ], ";", expression, ";",
               [ for-clause ], ")", block
             | "do", block, "while", expression, ";"
             | identifier, "=", expression, ";"
             | expression, ";" ;
for-clause   = "let", identifier, ":", type, "=", expression
             | identifier, "=", expression
             | expression ;
type         = "bool" | "bytes" | "f32" | "f64" | "i32" | "i64"
             | "string" | "u32" | "u64" | "unit" ;
expression   = literal | identifier | call | unary | binary ;
call         = identifier, "(", [ expression, { ",", expression } ], ")" ;
unary        = ( "!" | "-" ), expression ;
literal      = integer | string | "true" | "false" ;
```

二元运算符遵循以下优先级，从最强到最弱：
`* / %`、`+ -`、有序比较、相等、`&&` 和 `||`。运营商是
左结合。带括号的表达式为下一个引导程序保留
修订；编译器必须发出解析诊断而不是默默地发出
今天接受他们。

这段摘录是 **bootstrap** 语法。它涵盖文件定义的模块，
能力/源导入、原始签名、调用、本地值、
表达式、结构化 `if`/`else`、`while`、C 样式 `for`、`do while` 和
`return`。循环形式是可执行引导合约的一部分；仅
保留的异常字 `throw`、`try` 和 `catch` 被拒绝为
可执行结构。以下是聚合声明和值
**扩展**合同，不得被视为替代拼写
引导语法。

### 扩展聚合语法

扩展合约添加了不可变结构、标记枚举、泛型类型、
接口、函数值、集合文字、索引和 `match`。
它们的核心源形式是：

```ebnf
aggregate    = struct | enum | interface ;
struct       = "struct", identifier, [ generic_parameters ], "{",
               { identifier, ":", type, ";" }, "}" ;
enum         = [ "export" ], "enum", identifier, [ generic_parameters ], "{",
               variant, { ",", variant }, [ "," ], "}" ;
variant      = identifier, [ "(", [ parameters ], ")" ] ;
generic_parameters = "<", generic_parameter, { ",", generic_parameter }, ">" ;
generic_parameter  = identifier, [ ":", identifier ] ;
type         = primitive | identifier, [ "<", type, { ",", type }, ">" ]
             | "[", type, ";", integer, "]"
             | "Fn", "<", type, ",", type, ">" ;
constructor  = identifier, "::", identifier, "(", [ expression ], ")" ;
match        = "match", expression, "{", match_arm, { ",", match_arm }, "}" ;
match_arm    = pattern, "=>", expression ;
pattern      = "_" | identifier, [ "(", [ identifier, { ",", identifier } ], ")" ] ;
```

合格的构造函数，例如 `Result::Ok(value)` 和
`Result::Error(message)` 针对聚合进行解析并验证变体
数量和字段类型。标准 `Result<T, E>` 变体与
`Ok(T)` 和 `Error(E)`； `Option<T>` 仍然是 `Some(T)` 和 `None`。一个功能
例如，值使用 `fn name` 和声明的 `Fn<parameter, result>` 类型
`let callback: Fn<i32, i32> = fn increment;`。函数值通过以下方式检查
引用的函数签名，并且只能以匹配的数量调用
和参数类型。

匹配绑定位于其手臂本地：`Result::Ok(item) => item` 绑定
`item` 仅在检查该表达式时。绑定名称在一个实例中必须是唯一的
臂及其计数必须与选定的变体字段匹配；他们不泄漏
到兄弟手臂或周围的功能。

## 类型和语义

V1 具有原始类型 `bool`、有符号 `i32`/`i64`、无符号 `u32`/`u64`、
`f32`/`f64`、`string`、`bytes` 和 `unit`。没有隐式数字
转换。算术操作数必须具有相同的数值类型；比较
产生 `bool`；逻辑运算符需要 `bool`；平等需要平等
类型。函数有一个声明的结果类型并且 `unit` 函数返回
没有价值。

### 编译器拥有的正则表达式

Forge Web Script 提供了一个确定性正则表达式标准库。
调用 `regex_full_match(pattern, value) -> bool`，
`regex_prefix_match(pattern, value) -> bool`，以及
`regex_search(pattern, value, start: i32) -> bool` 执行全值，
分别是位置零前缀和最左边搜索匹配。捕获边界
可通过相应的 `regex_*_capture_start` 和
`regex_*_capture_end` 调用；他们采用组索引并返回 UTF-16 字符串
当没有匹配或组未设置时，偏移量或 `-1`。搜索捕获
调用还采用组索引之前的起始偏移量。

正则表达式调用是编译器拥有的标准库函数。它们的输入方式为
前端，用 IR 注释，并且绝不是功能导入。一个模块使用
因此，只有正则表达式调用有一个空的 `imports` 数组和一个空的
`requiredCapabilities` 数组。后端降低和模块内虚拟机是
单独的实施阶段；编译器不得将这些调用替换为
浏览器 `RegExp`、Node API 或隐式主机导入。

支持的语法有意限制为文字、`.`、字符
类别和范围（包括 `^` 否定）、`\d`、`\D`、`\w`、`\W`、`\s`、
`\S`、转义文字、捕获和非捕获组、交替、
`*`、`+`、`?`、有界 `{n}`、`{n,}`、`{n,m}` 量词、惰性量词、
和 `^`/`
Forge Web Script 提供了一个确定性正则表达式标准库。
调用 `regex_full_match(pattern, value) -> bool`，
`regex_prefix_match(pattern, value) -> bool`，以及
`regex_search(pattern, value, start: i32) -> bool` 执行全值，
分别是位置零前缀和最左边搜索匹配。捕获边界
可通过相应的 `regex_*_capture_start` 和
`regex_*_capture_end` 调用；他们采用组索引并返回 UTF-16 字符串
当没有匹配或组未设置时，偏移量或 `-1`。搜索捕获
调用还采用组索引之前的起始偏移量。

正则表达式调用是编译器拥有的标准库函数。它们的输入方式为
前端，用 IR 注释，并且绝不是功能导入。一个模块使用
因此，只有正则表达式调用有一个空的 `imports` 数组和一个空的
`requiredCapabilities` 数组。后端降低和模块内虚拟机是
单独的实施阶段；编译器不得将这些调用替换为
浏览器 `RegExp`、Node API 或隐式主机导入。

支持的语法有意限制为文字、`.`、字符
类别和范围（包括 `^` 否定）、`\d`、`\D`、`\w`、`\W`、`\s`、
`\S`、转义文字、捕获和非捕获组、交替、
`*`、`+`、`?`、有界 `{n}`、`{n,}`、`{n,m}` 量词、惰性量词、
和 `^`/ 锚点。反向引用、环视、命名组、标志和
其他主机引擎扩展被拒绝。不支持的语法具有稳定的
`FWS-REGEX-001` 诊断；格式错误的模式使用 `FWS-REGEX-002`，并且
内部编译器不变失败使用 `FWS-REGEX-003`。

共享包 `@mission-platform/forge-web-script-regex` 拥有稳定的 `$`
字节码 (`FORGE_REGEX_BYTECODE_VERSION`) 和构建时编译器。其明确的
`/reference` 入口点仅将 TypeScript VM 公开为一致性预言机
用于本机引擎和后端差异测试；包根目录没有
公开该虚拟机。特定于电话的元数据保留在电话号码包中。
生产正则表达式执行属于 Forge Web 脚本后端，
生成的 WASM 模块，永远不会涉及 TypeScript 运行时层或主机功能。

`string` 和 `bytes` 是 v1 聚合值。字符串是不可变的
在 ABI 边界处表示为 UTF-8 的 Unicode 标量值序列。
字节是不可变的八位位组序列，可以包含以下任意值
`0x00` 到 `0xff`。他们的源代码级操作故意很小
在引导子集中；主机调用和后来的标准库模块提供
无需添加环境浏览器即可进行编码、切片和收集操作
该语言的 API。

### 收藏签名

扩展收款合同是结构性的、基于接收者的；确实如此
不添加任意对象方法。固定数组写入 `[T; N]` 和
向量为 `Vector<T>`。支持的签名有：

|接收器|方法|签名|
| ----------- | --------------- | ----------------------- |
| `Array<T>` | `length` | `() -> u32` |
| `Array<T>` | `get` | `(u32) -> Option<T>` |
| `Array<T>` | `set` | `(u32, T) -> Array<T>` |
| `Array<T>` | `iter` | `() -> Iterator<T>` |
| `Vector<T>` | `length` | `() -> u32` |
| `Vector<T>` | `get` | `(u32) -> Option<T>` |
| `Vector<T>` | `set` | `(u32, T) -> Vector<T>` |
| `Vector<T>` | `push` 或 `add` | `(T) -> Vector<T>` |
| `Vector<T>` | `pop` | `() -> Option<T>` |
| `Vector<T>` | `iter` | `() -> Iterator<T>` |

`add` 拼写是有意为向量的兼容性别名
`push`；它不是一个数组方法。索引为 `u32`，元素参数必须
匹配 `T`，并且返回值必须与上面的签名匹配。数量错误，
参数类型、接收者类型和未知方法都是类型检查错误。
空文字需要上下文元素类型，而非空数组/向量
文字递归地推断其元素类型并拒绝混合元素。一个
固定数组文字必须完全包含 `N` 元素。

局部变量是函数作用域的，只初始化一次，并且之前无法读取
他们的宣言。本地声明不影响现有名称：重复
名称是一个错误。函数和功能别名共享一个模块名称空间
并且必须是唯一的。调用必须命名已声明的函数或导入的函数
功能及其数量和参数类型必须完全匹配。

v1 控制流表面的结构为 `if`/`else`、`while`、C 型 `for`、
`do while` 和早期的 `return`。 `for` 子句是显式语句并且执行
不要在循环之外引入类、接收者或隐式突变
本地价值环境。没有隐含的失败结果：每个
非 `unit` 函数中的可达路径必须返回声明的类型。的
引导检查器报告返回类型错误；可达性分析是
在声明编译器完全符合 v1 之前需要进行后续操作。

FWS 特意做到了无类别。 `class`、`constructor`、`extends`、`impl`、
`new` 和 `trait` 被保留并被稳定诊断拒绝
`FWS-PARSE-052`；不可变结构、标记枚举、接口和函数
值是受支持的以价值为导向的替代方案。分阶段自托管
合约将签入的 TypeScript 编译器保留为种子，而 FWS 编译器
运行时合约是增量引导的。

## 文件定义的模块、源导入和导出

没有嵌套的 `module` 声明。每个 `.fws` 文件都是一个模块及其
稳定名称源自其规范化文件 ID。例如，
项目 `/workspace/app` 中的 `src/time.fws` 具有模块 ID `src/time`。嵌套
`module name { ... }` 语法被迁移诊断拒绝。

源模块导入与主机功能导入不同：

```fws
import "./math.fws" as math;
import capability "clock.now" as now() -> i64;
```

Vite 适配器通过其模块图解析源导入。依赖关系
一个项目内部默认是静态链接的。跨项目边默认
动态加载，并且可以通过显式配置为 `static` 或 `dynamic`
项目根链接配置。缺少模块，不支持的周期
选择的链接模式和身份冲突是图形诊断。

静态链接将可访问的来宾导出扁平化为一个工件。导出冲突
被确定性地拒绝（`FWS-LINK-003` 对于重复签名和
`FWS-LINK-004` 表示不兼容的签名）；链接器不会默默地
命名空间或覆盖来宾函数。动态链接保持独立的模块
边界并在 ABI 清单中记录为源模块导入，从不
作为环境主机功能。

只有 `export` 前面的声明是公开的。出口名称稳定，
区分大小写的字符串，并在生成的字符串中按字典顺序排序
明显。私有函数可以被导出函数使用，但不能被导出函数使用
对主机可见。没有通配符导出，也没有环境导入。

功能导入具有带引号的主机拥有的名称和来宾本地别名：

```fws
import capability "clock.now" as now() -> i64;

export fn current_time() -> i64 {
  return now();
}
```

带引号的功能名称、别名、参数名称/类型和结果类型是
全部包含在清单中。导入是确定性的：重复的别名或
能力声明被拒绝，所需的能力名称为
去重并排序。主机按功能名称提供实现；
来宾无法发现或调用其所缺少的功能
明显。

## 逻辑能力ABI

Forge Web 脚本使用受 WASI 启发的_逻辑_边界，而不是完全声明
WASI 兼容性。能力是一种狭窄的、显式的宿主功能，例如
`clock.now`、`random.bytes` 或 `storage.read`。能力名称的拥有者
平台，每个名称都有一个单独版本的签名。 DOM 对象，
`window`、`document`、Node 内置、网络客户端和其他浏览器全局变量
从来都不是环境来宾依赖项。

加载器在实例化之前执行这些检查：

1. 支持manifest格式、语言版本、ABI版本。
2. 主机注册表中存在所有必需的功能。
3. 每个提供的功能都有准确声明的签名，没有未声明的
   接受客人进口。
4. 内存、分配器、导出和导入声明均在内部进行
   一致。

能力发现是显式的主机操作。主机可能会暴露
能力清单到应用程序代码，但来宾仅收到
由其模块声明的导入。缺少或拒绝的功能会失败并显示
加载时 `CapabilityDenied` 陷阱；它们不会成为 `undefined` 或
静默无操作。

## 价值观、线性记忆和所有权

该模块使用一个具有 64 KiB 页面和小端字节序的 WebAssembly 线性内存
标量值。标量值映射如下：

|伪造网页脚本 | WebAssembly 表示 |
| ----------------- | ------------------------------------------ |
| `bool` | `i32`，其中 `0` 为 false，`1` 为 true |
| `i32`、`u32` | `i32` |
| `i64`、`u64` | `i64` |
| `f32`、`f64` |匹配 WebAssembly 浮动 |
| `unit` |无结果值 |
| `string`、`bytes` |两个 `u32` 值：指针然后字节长度 |

清单在 `valueRepresentations` 中声明了相同的映射。一个
在读取或读取之前，指针长度对始终被检查为无符号范围
写入：`pointer <= memory.byteLength` 和 `length <= byteLength - pointer`。
零长度是有效的，可以使用任何界内指针，包括末尾
记忆。失败的检查会陷入 `MemoryOutOfBounds` 并且永远不会暴露
部分解码的值。

生成的模块导出`fws_alloc(size: u32) -> u32`，
`fws_dealloc(pointer: u32, size: u32) -> unit`，和
`fws_realloc(pointer: u32, oldSize: u32, newSize: u32) -> u32` 作为所有权
缓冲区的边界。在签名简写中，操作是
`fws_realloc(pointer, oldSize, newSize) -> pointer`。分配缓冲区的调用者拥有它并且必须
使用相同的模块及其确切的当前大小来取消分配或重新分配它。
重新分配者更愿意调整当前高水位分配的规模，
包括线性内存可以增长时的收缩和增长。否则它
分配替换，精确复制 `min(oldSize, newSize)` 字节，并且
在返回替换指针之前释放旧的分配。一个
零大小结果有效，等大小请求返回原始结果
指针。主机实现必须在来宾调用之前复制输入字节
除非清单明确引入未来借用的缓冲区，否则返回
合同。主机调用后，来宾代码不得保留主机拥有的指针。
`MemoryExhausted` 分配或增长失败陷阱；无效的指针或
`MemoryOutOfBounds` 的尺寸范围陷阱；和一个陈旧的指针，不正确
`oldSize`、双重释放或 `InvalidOwnership` 的无效释放陷阱。这些
检查发生在突变之前，失败的重新分配会留下原始的
分配和字节不变。

主机异常会转换为 `HostError`，其中包含功能名称和
不透明的主机错误代码。访客陷阱永远不会转化为普通回报
价值观。主机可以记录陷阱详细信息，但不得泄露秘密或原始信息
浏览器对不受信任的访客代码的异常。

### 来宾拥有的检查内存操作

实现有状态来宾堆的 FWS 源模块可以使用编译器拥有的
操作 `memory_alloc(size: u32) -> u32`,
`memory_dealloc(pointer: u32, size: u32) -> unit`,
`memory_realloc(pointer: u32, oldSize: u32, newSize: u32) -> u32`,
`memory_load_u32(address: u32) -> u32`，和
`memory_store_u32(address: u32, value: u32) -> unit`。这些操作是
直接降低到模块分配器或检查的 WebAssembly 内存
说明；它们不是主机导入，也不会将来宾状态暴露给
TypeScript。

分配器使用与 `fws_alloc` 相同的所有权和陷阱合约
`fws_realloc`。加载或存储需要在以下范围内完整的四字节范围
当前线性存储器；之前有 `MemoryOutOfBounds` 的无效范围陷阱
该操作可以部分执行。 `memory_realloc` 保留第一个
`min(oldSize, newSize)` 字节并返回来宾拥有的指针，而调用者
必须使用返回的指针及其确切的当前大小进行后续操作。
下的状态内存装置
`packages/forge-web-script/src/fixtures/stateful-memory.fws` 是一致性
这些签名、分配器重用、递归、重置和边界的固定装置
陷阱。

编译器拥有的字节读取器还为来宾提供无符号索引变体
将源偏移量表示为句柄的前端：`bytes_length_u32(value:
字节）-> u32` and `bytes_byte_at_u32（值：字节，索引：u32）-> u32`。他们
使用与签名 `bytes_length` 相同的指针长度边界检查和
`bytes_byte_at` 操作不是主机导入。 WebLua前端使用
这些操作将词法分析器偏移量和来宾内存地址保存在一个中
检查 `u32` 域。

### 原始 WASM ABI 和生成的 ESM 合约

上面的表示是稳定的原始 WASM ABI。是故意的
低级并且当生成的 JavaScript 外观变得更多时不会改变
人体工学：

```text
raw string value: (pointer: u32, length: u32)
raw bytes value:  (pointer: u32, length: u32)
```

编译器生成的 ESM 工件将 ABI 投射到 JavaScript API 中：

```ts
type ForgeWebScriptBytes = readonly [pointer: number, length: number];

interface ForgeWebScriptExports {
  readonly memory: WebAssembly.Memory;
  readonly fws_alloc: (size: number) => number;
  readonly fws_dealloc: (pointer: number, size: number) => void;
  readonly fws_realloc: (
    pointer: number,
    oldSize: number,
    newSize: number,
  ) => number;
  readonly fws_reset: () => void;
  readonly echo: (value: string) => string;
  readonly processBytes: (value: ForgeWebScriptBytes) => ForgeWebScriptBytes;
}
```

每个生成的声明，包括功能导入和动态链接
导出，使用 `string` 作为 FWS `string` 值。生成的 `load` 和
`loadSync` 包装器将 JavaScript 字符串编码为 UTF-8，传递指针长度
与未更改的 WASM ABI 配对，并将返回的字符串解码回 JavaScript
字符串。解码使用致命的 UTF-8 解码器：格式错误的客户字节是
显式边界错误而不是替换字符。

一次调用的字符串参数首先被编码并打包成一个连续的
客人分配。这可以保持原始 ABI 不变，同时避免一位客人
每个参数的分配和 JavaScript 到 WASM 的复制。标量参数保留
他们的直接快速路径。 `bytes` 故意不转换为 `Uint8Array`：
调用者继续传递和接收 `ForgeWebScriptBytes`，并且 `memory` 是
暴露，以便调用者可以使用模块的内存读取或写入原始字节范围
和所有权规则。

生成的适配器拥有为字符串参数创建的临时缓冲区，并且
字符串结果。它在释放结果之前对其进行解码，然后释放每个结果
临时范围在成功、访客陷阱、主机时在 `finally` 路径中恰好出现一次
异常和解码失败。具有字符串值的主机能力接收
JavaScript 字符串并且可能返回 JavaScript 字符串；包装器执行
来宾分配和该返回值的 UTF-8 副本。主机代码仍必须复制
返回之前的原始 `bytes` 输入，除非将来的清单明确声明
借用缓冲合约。 `load` 和 `loadSync` 公开相同的生成
合同；它们仅在模块初始化调度上有所不同。

更改此 JavaScript 投影不会更改 `valueRepresentations`，即
原始指针长度 ABI、ABI 版本或原始 WASM 内容哈希。
生成的工件保留一种延迟解码的嵌入式 WASM 表示；
`load` 和 `loadSync` 共享它而不是具体化单独的有效负载
副本。因此，异步与同步加载器检查应该比较行为
和声明，而确定性内容哈希检查应该对原始内容进行哈希处理
WASM 字节独立于生成的 ESM 源大小或加载器实现
详细信息。

## 清单格式

每个生成的模块都有一个稳定的兼容 JSON 的 ABI 清单及其
WASM 工件和类型化 ESM 加载器：

```json
{
  "format": "forge-web-script-module",
  "languageVersion": "1.0",
  "abiVersion": "1.2",
  "moduleName": "src/clocked",
  "exports": [{ "name": "current_time", "parameters": [], "result": "i64" }],
  "imports": [
    {
      "capability": "clock.now",
      "alias": "now",
      "function": { "name": "now", "parameters": [], "result": "i64" }
    }
  ],
  "sourceImports": [],
  "requiredCapabilities": ["clock.now"],
  "memory": {
    "pageSize": 65536,
    "addressType": "u32",
    "ownership": "caller-owned",
    "stringEncoding": "utf8",
    "byteArrayRepresentation": "pointer-length",
    "allocatorExport": "fws_alloc",
    "deallocatorExport": "fws_dealloc",
    "reallocatorExport": "fws_realloc"
  },
  "valueRepresentations": { "i64": "i64", "string": "pointer-length-u32" },
  "trapModel": "explicit-trap",
  "standardLibrary": { "regexBytecodeVersion": "bytecode-1" }
}
```

实际的清单包含所有原始表示条目，不仅
示例中使用的那些。用于导出、导入和功能的 JSON 键是
在重复构建中保持稳定；源映射和内容哈希是由
编译器适配器并且不是 ABI 签名匹配的一部分。

`standardLibrary` 清单字段记录编译器拥有的库标识。
对于正则表达式，`regexBytecodeVersion` 和可选的 `regexCorpusHash` 是缓存
和工件输入。规范化源码、编译器版本、优化
模式、模块图、链接配置、标准库标识和元数据
在缓存查找之前，语料库哈希必须以稳定的顺序序列化。相同
输入产生相同的字节码表、清单、声明、WAT 和
内容哈希；更改任何身份输入都是缓存未命中。语料库哈希是
由提供语料库的包拥有，不得从主机推断
运行时状态。

## 编译器和 CLI 边界

公共 TypeScript 外观将前端合约和编排分开
来自排放。它接受源文件或解析图，生成结构化的
诊断加上类型化 IR，并将 WebAssembly/WAT 生成委托给
`@mission-platform/forge-web-script-wasm`。后端之前验证其字节
归还它们；错误会抑制可执行输出。 Vite 适配器和 LSP 使用
外观，不需要依赖 Node CLI。

对于文件系统工作流程，安装 `@mission-platform/forge-web-script-cli` 和
使用其独立的 `forge-web-script` 二进制文件：

```text
forge-web-script check <entry.fws> [--root <directory>] [--project-root <directory>]
forge-web-script compile <entry.fws> --out-dir <directory>
  [--root <directory>] [--project-root <directory>]
  [--link-mode static|dynamic] [--capability <name>] [--optimization debug|release]
```

`check` 无需写入文件即可验证源和图形输入。一个成功的
`compile` 准确写入 `<entry>.wasm`、`<entry>.wat`、`<entry>.abi.json`、
`<entry>.d.ts`、`<entry>.js` 和 `<entry>.map` 到选定的输出目录。
只有在诊断明确后，CLI 才会对整个集合进行暂存和重命名，因此
格式错误的源、未解析的图形边缘、被拒绝的功能和 ABI 错误
不留下任何可执行工件并返回非零状态。输出排序，
清单 JSON、WAT、声明、加载器数据、源映射和内容哈希
对于相同的输入是确定性的。

## Vitest 和 Vite 测试集成

当 Vitest 套件需要时，请使用 `@mission-platform/forge-web-script-vitest`
断言编译器工件、结构化诊断、Wasm 行为、图形链接、
或生成的 Vite 模块合约。其直接利用方法（`compile`，
`compileSource`、`compileGraph`、`inspect`、`load`、`loadSync` 和
`checkVmParity`) 委托给公共编译器/运行时合约；它的
`defineForgeWebScriptVitestConfig` 帮助程序安装生产
`forgeWebScriptPlugin`，同时保留消费者 Vite 插件和设置。
请参阅[任务平台测试](../../../../../../docs/locales/zh/testing.md#forge-web-script-tests)
配置和夹具示例。

该线束仅通过键入的显式功能图接受主机功能
通过清单功能名称，例如：

```ts
const exports = await harness.load<{ current: () => bigint }>(
  "capabilities/clock-now.fws",
  {
    "clock.now": { now: () => 123n },
  },
);
```

缺少申报进口和未申报供应进口均属失败。测试
导入 `.fws` 或其虚拟工件查询的项目应添加
仅类型声明子路径
`@mission-platform/forge-web-script-vitest/forge-web-script` 发送给他们
TypeScript `types` 列表或引用的测试类型入口点。

下面的共享线束夹具
`packages/forge-web-script-vitest/fixtures/` 是跨包语料库
有效的模块、诊断、功能、图表和自托管奇偶校验。
包本地固定装置仍然适用于编译器、运行时和插件
执行私人详细信息的测试。

`checkVmParity` 报告有界自托管 lex-stage 奇偶校验合约
`interpret`、`jit` 或 `aot` 模式。断言奇偶校验、指纹、步数、
和 AOT 再现性元数据，但不要将此报告视为任意的
已编译的 FWS VM 执行； Wasm 加载仍然是运行时行为检查。

## 诊断

诊断是结构化记录，包含 `code`、`severity`、`phase`、`message`、
`fileName` 和源 `span`；可操作记录还可能包括 `hint`。
该阶段是 `lex`、`parse`、`type-check` 或 `abi` 之一。稳定的 v1 代码
家庭包括：

|代码家族|意义|
| ------------- | ----------------------------------------------------------------------------------------- |
| `FWS-LEX-*` |无效字符/转义符、原始字符串行终止符或未终止的字符串/注释 |
| `FWS-PARSE-*` |无效的模块、声明、语句或表达式语法 |
| `FWS-TYPE-*` |无效的基本类型、名称、运算符、参数或返回 |
| `FWS-ABI-*` |重复名称、被拒绝的功能、导出或导入 |
| `FWS-REGEX-*` |不支持或格式错误的编译器拥有的正则表达式模式

错误会阻止工件的生成。警告和信息诊断
不改变语义。诊断顺序是源顺序，然后是阶段
附加到同一跨度的诊断顺序。 Vite 适配器必须保留
将错误转发到 Vite 时的稳定代码和跨度。

## Bootstrap 一致性合约

v1 编译器目标有意限制为语言和 ABI 表面
记录在这里。如果程序使用引导子集，则该程序位于引导程序子集中
模块、上面的词法规则、原始类型、`string`/`bytes` 值、
显式导出函数、功能导入、本地声明、调用、
表达式、`if`/`else`、`while`、C 样式 `for`、`do while` 和 `return`。
扩展聚合合约单独进行一致性测试并添加
结构体、枚举、泛型类型、集合值、函数值和
`match`；它不能依赖于隐式浏览器或 Node 全局。

`packages/forge-web-script/src/fixtures/bootstrap.ts` 是可执行文件
一致性语料库。接受的夹具必须经过验证且无错误诊断；
被拒绝的灯具必须报告其列出的稳定诊断代码和有效的
源跨度。其他语言的实现可以使用相同的装置
塑造和比较标准化 AST、诊断和清单 JSON。夹具
套件是一个一致性目标，而不是特定于实现的快照。

共享源语料库位于
`packages/forge-web-script-vitest/fixtures` 涵盖相同的边界：
`valid/collections.fws` 练习集合文字、索引、上下文
空向量、`length()` 和有效的转义字符串；
`valid/aggregates.fws` 练习函数值，合格 `Result::Ok` 和
`Result::Error` 构造函数和 Arm 本地匹配绑定；和
`diagnostics/collections.fws` 执行无效的收集调用和聚合
构造函数/绑定诊断。收集夹具也编译好了
通过共享的 Wasm 安全带；聚合语法保留为前端
一致性源，直到为该线束启用聚合 Wasm 降低。

## 兼容性政策

默认情况下，语言和 ABI 主要版本不兼容。装载机可以接受
仅当生产者标记时，具有更高次要版本的相同主要 ABI
新字段是可选的，消费者可以安全地忽略未知字段。删除一个
导出、更改类型、更改所有权或更改功能
签名需要破坏 ABI 修订版，并且必须被加载器拒绝
不实施它。 ABI `1.2` 是一个突破性的修订，尽管保留了
`1.x` 编号：其所需的 `fws_realloc` 内存导出不是可选的，
和 ABI `1.1` 清单不会以静默方式升级。永远不会添加功能
默默地更改现有模块：它需要新的清单声明并且
主持人批准。

编译器版本不是 ABI 版本。编译器必须将其版本包含在
编译输入和工件哈希，但加载程序会比较语言和 ABI
版本加上清单签名。失败的兼容性检查是
加载时诊断，而不是运行时回退。 Rust 和 AssemblyScript 模块
在共存期间继续使用现有的包装器和 ABI 合约
期间； Forge Web Script 不会重新解释或替换它们。

正则表达式标准库兼容性有意与主机正则表达式分开
兼容性。 Forge 字节码合约和编译器定义了可接受的
语法和稳定的诊断；参考VM仅用于验证
最左边/回溯行为、UTF-16 捕获偏移量和 `-1` 未设置标记
直到后端虚拟机可用。浏览器或 Node 正则表达式行为
只是一个差分预言机，既不是 TypeScript 参考 VM，也不是
主机正则表达式 API 可以执行生产标准库调用。
更改操作码编号、捕获槽布局、支持的语法、诊断
代码或匹配语义需要新的正则表达式字节码版本和新的
神器身份。直到后端/运行时一致性和电话号码迁移
证据完整，AssemblyScript 手机实现仍然是一个
显式遗留回归预言，并且永远不会与 Forge 工件混合。

## 共存与迁移

Forge Web Script 是中立的生产目标
`@mission-platform/code-scanner` 工件。它的扫描仪图静态链接
将 QR、矩阵和条形码解码器源集成到一个独立的 WebAssembly 中
神器；动态配置文件使这些源模块边界保持明确，并且
缓存已解析的导出。 Rust `code-scan` 箱子仍然可以作为
本机/参考实现，不是包的运行时依赖项。
公共 QR、矩阵和条形码包保留自己的类型包装；
这些 API 不会通过扫描仪图表静默重定向。

`codecMigrationFixture` 位于
`packages/forge-web-script/src/fixtures/codec-migration.ts` 是第一个
形状像编解码器适配器的一致性夹具。它声明
`codec.barcode.encode(payload: string) -> bytes`，导出 `encode_payload`，验证
指针长度 ABI，并使用可注入主机写入调用者拥有的输出。
它有意保留一个狭窄的 ABI 固定装置：主机可以使用确定性的
假的一致性测试，而夹具证明了 Forge Web 脚本
边界。生产编解码器奇偶校验仍然需要匹配向量和
性能测量，而不仅仅是匹配的函数名称。

相应的旧版包装器导出 `encode(symbology, data)` 并返回
`Uint8Array | undefined`；该夹具导出 `encode_payload(payload)` 和
返回 ABI 拥有的 `bytes` 对。这种故意的差异使
能力边界显式：迁移适配器可以映射遗留
符号系统/数据调用已声明的功能，但夹具没有
假设这两个导出在行为上是可以互换的。

### 选择实施方案

|工作量或要求|选择|原因 |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
|现有的 QR 或矩阵包行为 | `@mission-platform/qr-code` / `@mission-platform/matrix-code` | `@mission-platform/qr-code` / `@mission-platform/matrix-code` |特定于包的类型 ESM 包装器仍然可用于这些公共 API。                                       |
|中性图像和相机扫描仪行为 | `@mission-platform/code-scanner` |默认情况下使用静态链接的 FWS 图，或具有缓存调度的显式动态源模块配置文件。 |
|现有的条码行为 | `@mission-platform/barcode` |包本地 Forge Web 脚本图形提供了类型化条形码外观。                                           |
|具有显式主机效应的新型通用浏览器安全计算 | Forge Web 脚本加上 `@mission-platform/vite-plugin-forge-web-script` |版本化 `.fws` 源、清单、类型化加载程序和默认拒绝功能。                                |
|现有的 AssemblyScript 源或特定于 AssemblyScript 的迁移 | `@mission-platform/vite-plugin-assemblyscript` |编译 `.ts` AssemblyScript 条目并保留其生成的原始导出协定。                            |
|框架中立的 UI/组件编译 | Forge 组件编译器 | Forge Web 脚本不能替代 `FrameworkOutputPlugin` 或组件目标。                           |

仅对 `.fws` 条目使用 Forge Web 脚本 Vite 插件。使用
用于现有 AssemblyScript 条目的 AssemblyScript 插件。在迁移过程中，
应用程序可以捆绑两种模块：每个加载器拥有自己的
初始化、内存和 ABI 验证以及功能导入必须是
明确提供给 Forge Web 脚本模块。

### 证据和弃用门

迁移工作应记录每个候选者的四次独立比较：

1. 针对共享黄金向量的导出行为，包括无效输入和
   边界情况；
2. ABI 安全，包括清单/版本检查、导入拒绝、边界检查、
   陷阱转换和缓冲区所有权；
3. 生成的工件稳定性，包括可重现的哈希值、声明、
   源映射和浏览器/Node 加载；和
4. 涵盖编译的代表性发布构建性能测量
   时间、工件大小、初始化和稳态调用。

迁移夹具目前提供 ABI 和工件部分
证据。现有的条形码包装器和解码器包测试仍然是
行为和遗留回归预言机；而是将它们与固定装置一起运行
而不是将夹具作为替代基准。伪造网络
在工作负载通过之前，脚本不得弃用 Rust 或 AssemblyScript 路径
两个受支持的主机环境中的所有四次比较都有记录
回滚路径，并且没有未解决的 ABI 或安全问题。然后弃用
需要公布的兼容性窗口和适配器或迁移指南；
删除需要随后的主要版本。

## 无类别聚合和执行合约

扩展的无类合约添加了不可变的 `struct` 值，标记为 `enum`
值、结构编译时 `interface` 声明、通用参数
具有接口边界、函数值、集合文字/方法，以及
`match` 表达式/语句。合格的枚举构造函数使用 `Type::Variant`
并且匹配绑定是手臂本地的；例如，
`Result::Ok(item) => item` 仅在该臂中结合 `item`。标准
`Result<T, E>` 合约使用 `Ok(T)` 和 `Error(E)`，而不是 `Err(E)`。
结构更新是纯粹的值转换；既不是结构体也不是接口
具有构造函数、标识、继承、接收器或运行时调度。任意
尝试声明类/面向对象的构造（包括 `class`、
`constructor`、`extends`、`impl`、`new` 和 `trait`) 被拒绝，且稳定
诊断 `FWS-PARSE-052`。

聚合布局按规范名称顺序记录在清单中。结构体
字段是有序的、四字节对齐的值；枚举布局以四字节开头
判别性的。字段所有权是明确的（`owned`、`borrowed` 或 `shared`）并且
默认为拥有的不可变存储。通用值根据具体情况进行专门化
类型；基于描述符的表示保留给显式迭代器或
接口边界并由专业化记录表示。

VM 字节码合约是独立于后端的。 `ForgeWebScriptVmModule`
包含类型化函数、常量、聚合布局、专业化、
功能导入、源跨度和 64 KiB 线性内存
`fws_alloc`/`fws_dealloc`/`fws_realloc` 边界。 `interpret`、`jit` 和 `aot` 正在执行
相同指令/值/陷阱语义上的模式； JIT 缓存键和 AOT
工件包括编译器和源哈希。功能只能调用
当存在于模块清单中时。

反应式运行时状态是数据：实体索引使用生成计数器，
组件存储和世界是不可变的快照，系统返回世界
过渡。信号、订阅、查询要求、确定性顺序、
和有界调度程序步骤是显式值。 ECS主机集成需要
与任何其他 FWS 导入相同的声明功能边界。

## 范围边界

v1 实现是 TypeScript 前端加上确定性 WebAssembly
后端，通过兼容性外观和独立的 Node CLI 公开。
一致性夹具和生成的工件是兼容性目标。

自托管编译（将编译器作为 FWS 程序运行）是显式的
由该 v1 合约的无类表面和 VM 字节码执行支持
模型，但对于 v1 ABI 和语言的正确性来说这不是必需的
边界。更丰富的语言功能，替换现有的 Rust 或
AssemblyScript 工作负载和其他非 v1 编译器的演变不在此范围内
合同。

## 工具切换和引导边界

CLI、Vite 插件、语言服务和 LSP 均使用公共编译器
服务合同。词法分析器迁移故意是 LSP 优先：签入
EBNF 语法定义了 TypeScript 代币合约、语言服务和
编辑器适配器是第一个接受边界，编译器/前端或
自托管所有权不得移动，直到代币类型、诊断、符号、
完成、悬停和 UTF-16 范围一致。当前受限制的 FWS 创作
lex/token 阶段仍然是兼容性奇偶校验路径，而 TypeScript 词法分析器
和语言服务门正在迁移；它不是语法权威。

LSP门变绿后，相同的语法将被移植到FWS/VM词法分析器
然后到有界解析器模块阶段。剩下的前端、链接器、
优化器、清单和 Wasm 发射阶段在此仍然有种子支持
释放；这个边界是故意的并且暴露为
`ForgeWebScriptSelfHostedStageReport` 而不是完整呈现
自托管。

CLI 使用 `--vm-mode interpret|jit|aot` 选择 V​​M 模式。 Vite 插件
和语言服务工作区选项使用相应的 `selfHostedVmMode`
值。所有三种模式都执行相同的字节码并比较 lex 指纹
与独立的种子参考。不匹配或VM陷阱变得稳定
`FWS-BOOTSTRAP-001` 诊断并防止无效的 Wasm 工件
发出。 `interpret` 用于快速检查，而 `jit` 和 `aot` 用于快速检查
一致性/开发模式；编译后的 Wasm 仍保持正常生产
工件和运行时路径。

图链接、声明、源映射、ABI 清单、确定性哈希、
线性内存所有权、能力拒绝、集合/ECS 值和显式
异步调度程序功能仍然受现有公共合同的约束。
工具适配器不添加环境主机 API 或隐式对象分派。
微任务和 Web Workers 只能通过声明的调度程序使用
能力，并且它们的顺序仍然是明确且确定的。消费者
应将 VM 报告视为奇偶校验/一致性信号，直到后续版本
将额外的编译器阶段移到同一 FWS 边界后面。
