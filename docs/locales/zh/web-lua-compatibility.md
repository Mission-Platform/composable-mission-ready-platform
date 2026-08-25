# WebLua Lua 5.5.1 兼容性矩阵

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> docs/web-lua-compatibility.md: [docs/web-lua-compatibility.md](../../web-lua-compatibility.md)
> 语言: 简体中文 (zh)

这份报告有意保守。 `matched` 表示该行为由访客级固定装置覆盖，并且具有确定性的预期结果； `capability-gated` 表示宿主效应需要明确的策略； `unresolved` 表示该行为已被跟踪，但不得视为通过。

|面积 |行为 |状态 |证据|笔记|
| ----------------------- | ----------------------------------------------------------------------------- | ---------------- | -------------------------------------------- | -------------------------------------------------------------------------------------- |
|词汇语法 |空格、注释、关键字、整数文字和运算符 |匹配| `packages/web-lua/src/differential.spec.ts` |仅声明已实现的标量子集。                                         |
|标量表达式 |整数算术、一元减法、分组、优先级和比较 |匹配 | `packages/web-lua/src/differential.spec.ts` |结果使用当前来宾标量 ABI。                                              |
|局部变量和控制流|本地分配、重新分配、`if`/`else`、`while` 和返回 |匹配| `packages/web-lua/src/differential.spec.ts` |来宾本地和堆栈容量仍然受到明确的限制。                               |
|命名函数|命名定义、参数、调用和标量返回 |匹配 | `packages/web-lua/src/differential.spec.ts` |闭包、上值、可变参数、尾部调用和多重返回保留在该行之外。 |
|错误和加载|语法、运行时、除法和格式错误的二进制前缀状态 |匹配 | `packages/web-lua/src/utils/web-lua.spec.ts` |状态的比较无需主机端 Lua 解释。                            |
|面向主机的库 | I/O、时钟、随机性、操作系统、包加载和调试效果 |能力门控| `packages/web-lua/src/utils/web-lua.spec.ts` |默认情况下拒绝能力；库的实现不完整。              |
|数值和表格|字符串、浮点数、表、用户数据、标识、迭代和元方法 |未解决 | `packages/web-lua/src/utils/web-lua.spec.ts` |当前边界公开了标量值和单项表基础。           |
|闭包和协程| Upvalues、`yield`/`resume`、受保护的调用和嵌套协程错误 |未解决 | `packages/web-lua/src/utils/web-lua.spec.ts` | `resume` 当前重新执行原型，并且不被声明为协程语义。  |
|标准库 |基础、协程、表、字符串、UTF-8、数学、I/O、操作系统、调试和打包/加载 |未解决 |没有标准库差分夹具|图书馆的任何行为都不会被默默地视为通过。                                    |

该报告的生成来源是 `packages/web-lua/src/compatibility.ts` 中的类型化矩阵；它的测试需要对每一行进行明确的分类和证据输入。
