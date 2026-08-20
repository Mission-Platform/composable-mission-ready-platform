# Forge Web 脚本 v1

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> 英文原文: [docs/forge-web-script.md](../../forge-web-script.md)
> 语言: 简体中文 (zh)

伪造网页脚本（`.fws`) 是 WebAssembly 的一种小型通用语言
工作负载。它是网络优先的、基于能力的并且故意独立于
Vue, React、DOM 和 Forge 组件编译器。该文档是
权威的v1语言和模块合约。这 TypeScript 包裹
`@mission-platform/forge-web-script` 包含可执行的引导解析器，
类型检查器、ABI 清单类型和一致性装置。

## 状态和版本控制

当前合同是**语言版本 `1.0`** 和 **逻辑 ABI 版本
`1.0`**。语言版本描述来源和语义； ABI版本
描述了 WebAssembly 边界和主机协议。它们是版本化的
独立。编译器必须将两个版本写入每个生成的模块中
清单，并且加载程序必须在实例化之前验证两者。

源格式为 UTF-8 文本，带有 `.fws` 扩大。源文件是一个
单一模块。编译器输入标识语言版本，而
生成的清单是加载程序使用的持久版本标记。未来
修订版可能会添加源编译指示，但 v1 不需要； v1 编译器
必须拒绝它不理解的源构造，而不是猜测它的
版本。

## 词汇参考

除了字符串内部之外，空格是微不足道的。 `//` 开始评论
运行到该行的末尾。标识符开头为 `A-Z`, `a-z`， 或者 `_`, 和
继续使用这些字符或十进制数字。标识符是
区分大小写。整数文字是非负十进制序列； v1 确实
不接受十六进制、八进制或浮点文字语法
引导程序子集。字符串使用双引号和 JSON 兼容的转义符
是 UTF-8 值。

保留字是 `as`, `capability`, `else`, `export`, `fn`, `if`,
`import`, `let`, `module`， 和 `return`. `true` 和 `false` 是布尔值
文字。标点符号是 `{ } ( ) : ; ,`;运算符是`! % * + - / < <= ==
!= > >= && || = ->`。

每个诊断跨度都是一个半开源偏移范围 `[start, end)` 在
原始UTF-16 TypeScript 字符串（偏移量计数 UTF-16 代码单元），其中
从一开始的行和列字段。的
引导程序实现将偏移量和行/列数据一起报告，以便
Vite 适配器可以生成源映射诊断而无需重新解析。

## 源语法

以下语法描述了 v1 引导程序表面。语法使用
`*` 和 `?` 在通常的 EBNF 意义上：

```ebnf
module       = "module", identifier, "{", { import | function }, "}" ;
import       = "import", "capability", string, "as", identifier,
               "(", [ parameters ], ")", "->", type, ";" ;
function     = [ "export" ], "fn", identifier, "(", [ parameters ], ")",
               "->", type, block ;
parameters   = parameter, { ",", parameter } ;
parameter    = identifier, ":", type ;
block        = "{", { statement }, "}" ;
statement    = "let", identifier, ":", type, "=", expression, ";"
             | "return", [ expression ], ";"
             | "if", expression, block, [ "else", block ]
             | expression, ";" ;
type         = "bool" | "bytes" | "f32" | "f64" | "i32" | "i64"
             | "string" | "u32" | "u64" | "unit" ;
expression   = literal | identifier | call | unary | binary ;
call         = identifier, "(", [ expression, { ",", expression } ], ")" ;
unary        = ( "!" | "-" ), expression ;
literal      = integer | string | "true" | "false" ;
```

二元运算符遵循以下优先级，从最强到最弱：
`* / %`, `+ -`、有序比较、相等、 `&&`， 和 `||`。运营商是
左结合。带括号的表达式为下一个引导程序保留
修订；编译器必须发出解析诊断而不是默默地发出
今天接受他们。

## 类型和语义

V1 具有原始类型 `bool`, 签署 `i32`/`i64`, 无符号 `u32`/`u64`,
`f32`/`f64`, `string`, `bytes`， 和 `unit`。没有隐式数字
转换。算术操作数必须具有相同的数值类型；比较
生产 `bool`;逻辑运算符要求 `bool`;平等需要平等
类型。一个函数有一个声明的结果类型和一个 `unit` 函数返回
没有价值。

`string` 和 `bytes` 是 v1 聚合值。字符串是不可变的
在 ABI 边界处表示为 UTF-8 的 Unicode 标量值序列。
字节是不可变的八位位组序列，可以包含以下任意值
`0x00` 通过 `0xff`。他们的源代码级操作故意很小
在引导子集中；主机调用和后来的标准库模块提供
无需添加环境浏览器即可进行编码、切片和收集操作
该语言的 API。

局部变量是函数作用域的，只初始化一次，并且之前无法读取
他们的宣言。本地声明不影响现有名称：重复
名称是一个错误。函数和功能别名共享一个模块名称空间
并且必须是唯一的。调用必须命名已声明的函数或导入的函数
功能及其数量和参数类型必须完全匹配。

v1 控制流表面是结构化的 `if`/`else` 和早 `return`。
不存在隐式的失败结果：非路径中的每条可达路径`unit`
函数必须返回声明的类型。引导检查器报告返回
类型错误；在声明之前，可达性分析是必需的后续工作
编译器完全符合 v1 标准。

## 模块声明和导出

仅前面有以下声明 `export` 是公开的。出口名称稳定，
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
`clock.now`, `random.bytes`， 或者 `storage.read`。能力名称的拥有者
平台，每个名称都有一个单独版本的签名。 DOM 对象，
`window`, `document`, Node 内置、网络客户端和其他浏览器全局变量
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
加载时间 `CapabilityDenied` 陷阱;他们不会成为 `undefined` 或一个
静默无操作。

## 价值观、线性记忆和所有权

该模块使用一个具有 64 KiB 页面和小端字节序的 WebAssembly 线性内存
标量值。标量值映射如下：

|伪造网页脚本 | WebAssembly 表示 |
| ----------------- | ------------------------------------------ |
| `bool`            | `i32`， 在哪里 `0` 是假的并且 `1` 是真的 |
| `i32`, `u32`      | `i32`                                      |
| `i64`, `u64`      | `i64`                                      |
| `f32`, `f64`      |匹配 WebAssembly 浮动 |
| `unit`            |无结果值 |
| `string`, `bytes` |二 `u32` 值：指针然后字节长度|

清单声明了相同的映射 `valueRepresentations`。一个
在读取或读取之前，指针长度对始终被检查为无符号范围
写作： `pointer <= memory.byteLength` 和 `length <= byteLength - pointer`。
零长度是有效的，可以使用任何界内指针，包括末尾
记忆。失败的检查陷阱 `MemoryOutOfBounds` 并且从不暴露
部分解码的值。

生成的模块导出 `fws_alloc(size: u32) -> u32` 和
`fws_dealloc(pointer: u32, size: u32) -> unit` 作为所有权边界
缓冲区。分配缓冲区的调用者拥有它并且必须释放它
使用相同的模块。主机实现必须在之前复制输入字节
除非清单明确引入未来借用，否则访客呼叫将返回
缓冲合约。访客代码不得在主机之后保留主机拥有的指针
打电话。分配失败陷阱 `MemoryExhausted`;双重免费和无效
免费陷阱与 `InvalidOwnership`.

主机异常转换为 `HostError` 带有功能名称和
不透明的主机错误代码。访客陷阱永远不会转化为普通回报
价值观。主机可以记录陷阱详细信息，但不得泄露秘密或原始信息
浏览器对不受信任的访客代码的异常。

## 清单格式

每个生成的模块都有一个稳定的兼容 JSON 的 ABI 清单及其
WASM 工件和类型化 ESM 加载器：

```json
{
  "format": "forge-web-script-module",
  "languageVersion": "1.0",
  "abiVersion": "1.2",
  "moduleName": "clocked",
  "exports": [{ "name": "current_time", "parameters": [], "result": "i64" }],
  "imports": [
    {
      "capability": "clock.now",
      "alias": "now",
      "function": { "name": "now", "parameters": [], "result": "i64" }
    }
  ],
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
  "trapModel": "explicit-trap"
}
```

实际的清单包含所有原始表示条目，不仅
示例中使用的那些。用于导出、导入和功能的 JSON 键是
在重复构建中保持稳定；源映射和内容哈希是由
编译器适配器并且不是 ABI 签名匹配的一部分。

## 诊断

诊断是结构化记录 `code`, `severity`, `phase`, `message`,
`fileName`，和一个来源 `span`;可操作的记录还可能包括 `hint`。
该阶段是其中之一 `lex`, `parse`, `type-check`， 或者 `abi`。稳定的 v1 代码
家庭包括：

|代码家族|意义|
| ------------- | ------------------------------------------------------------ |
| `FWS-LEX-*`   |无效字符或未终止的字符串 |
| `FWS-PARSE-*` |无效的模块、声明、语句或表达式语法 |
| `FWS-TYPE-*`  |无效的基本类型、名称、运算符、参数或返回 |
| `FWS-ABI-*`   |重复名称、被拒绝的功能、导出或导入 |

错误会阻止工件的生成。警告和信息诊断
不改变语义。诊断顺序是源顺序，然后是阶段
附加到同一跨度的诊断命令。一个 Vite 适配器必须保留
将错误转发到时的稳定代码和跨度 Vite.

## Bootstrap 一致性合约

引导编译器目标故意小于最终目标
自托管编译器。如果程序使用引导子集，则该程序位于引导程序子集中
模块，上面的词法规则，原始类型， `string`/`bytes` 价值观，
显式导出函数、功能导入、本地声明、调用、
表达式, `if`/`else`， 和 `return`。它不能依赖于隐式的
浏览器或 Node 全球的。

`packages/forge-web-script/src/fixtures/bootstrap.ts` 是可执行文件
一致性语料库。接受的夹具必须经过验证且无错误诊断；
被拒绝的灯具必须报告其列出的稳定诊断代码和有效的
源跨度。其他语言的实现可以使用相同的装置
塑造和比较标准化 AST、诊断和清单 JSON。夹具
套件是一个一致性目标，而不是特定于实现的快照。

## 兼容性政策

默认情况下，语言和 ABI 主要版本不兼容。装载机可以接受
仅当生产者标记时，具有更高次要版本的相同主要 ABI
新字段是可选的，消费者可以安全地忽略未知字段。删除一个
导出、更改类型、更改所有权或更改功能
签名需要 ABI 主要版本。永远不会默默地添加一种能力
更改现有模块：它需要新的清单声明和主机
批准。

编译器版本不是 ABI 版本。编译器必须将其版本包含在
编译输入和工件哈希，但加载程序会比较语言和 ABI
版本加上清单签名。失败的兼容性检查是
加载时诊断，而不是运行时回退。 Rust 和 AssemblyScript 模块
在共存期间继续使用现有的包装器和 ABI 合约
期间； Forge Web Script 不会重新解释或替换它们。

## Bootstrap 到自托管路线图

1. **Bootstrap合约：** 保留 TypeScript 词法分析器、解析器、类型检查器、
   将构建器、固定装置和诊断明确为可执行一致性
   目标。仅在接受程序和格式错误的输入后添加 WASM 发射器
   有稳定的行为。
2. **Bootstrap标准库：**实现确定性整数/浮点
   操作、UTF-8 和字节编解码器、分配和陷阱传播，无需
   浏览器 API。通过逻辑 ABI 和假主机测试每个操作。
3. **Forge Web Script 编译器子集：** 在 Forge Web 中实现编译器
   仅使用可接受的子集的脚本，显式记录编译器状态，
   字节/字符串缓冲区，以及声明的功能导入。它的输出必须通过
   的 TypeScript 确定性的逐字节一致性语料库。
4. **自托管扩展：**添加更丰富的聚合、循环、模式匹配、
   诊断助手，并且仅在每个功能完成后才进行增量编译
   版本化的固定装置和兼容的 ABI 故事。

自托管是后来的一个里程碑。引导编译器建立语义
兼容性；这并不保证 v1 本身可以编译产品
编译器或现有的 Rust/AssemblyScript 工作负载将被重写。
