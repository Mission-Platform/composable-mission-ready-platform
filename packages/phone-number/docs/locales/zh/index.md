# @mission-platform/phone-number

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> packages/phone-number/docs/index.md: [packages/phone-number/docs/index.md](../../index.md)
> 语言: 简体中文 (zh)

`@mission-platform/phone-number` 是对核心的集中重新实现
谷歌 [库电话号码](https://github.com/google/libphonenumber)，写成
[汇编脚本](https://www.assemblyscript.org/）并编译为 **WebAssembly**。它解析、验证、分类和
格式化国际电话号码，并打包为独立的 ES 模块，没有运行时依赖性。

## 建筑学

该包使用 AssemblyScript → WebAssembly 构建管道，完全由 **Vite** 驱动：

1. **AssemblyScript 源** (`assembly/`) 保存精选的每个区域元数据 (`metadata.ts`) 和
   解析/验证/分类/格式化逻辑（`index.ts`）。
2. **通过 Vite 进行 WASM 编译**：`@mission-platform/vite-plugin-assemblyscript`
   在 Vite `buildStart` 挂钩中运行 AssemblyScript 编译器，生成
   `build/phone-number.wasm` 加上 ESM 绑定。
3. **单文件工件**：该插件将 wasm 二进制文件作为 base64 内联到
   `@generated` 模块 (`src/generated/phone-number.js`) 公开异步、记忆的 `loadModule()` 工厂 —
   消除单独的 `.wasm` 文件加载和 URL 解析。
4. **类型化外观**：`src/index.ts` 在原始 wasm 导出上公开 `PhoneNumberUtil` 类。

### 重建 WASM 工件

AssemblyScript 由 Vite 编译；不需要 Docker 或本机工具链。

```bash
# Full build:
pnpm --filter @mission-platform/phone-number build

# Or just run Vite (recompiles AssemblyScript, regenerates src/generated):
pnpm --filter @mission-platform/phone-number exec vite build
```

## 用法

```ts
import { getPhoneNumberUtil, PhoneNumberFormat, PhoneNumberType } from '@mission-platform/phone-number';

const util = await getPhoneNumberUtil();

// Validation
util.isValidNumber('+14155552671', 'US'); // true
util.isPossibleNumber('12345', 'US'); // false

// Classification
util.getNumberType('07911 123456', 'GB'); // PhoneNumberType.MOBILE
util.getNumberType('+14155552671', 'US'); // PhoneNumberType.FIXED_LINE_OR_MOBILE

// Region lookup
util.getRegionCodeForNumber('+44 20 7946 0958', 'US'); // 'GB'
util.getCountryCodeForRegion('FR'); // 33

// Formatting
util.format('4155552671', 'US', PhoneNumberFormat.NATIONAL); // '(415) 555-2671'
util.format('4155552671', 'US', PhoneNumberFormat.E164); // '+14155552671'
util.format('07911 123456', 'GB', PhoneNumberFormat.INTERNATIONAL); // '+44 7911 123456'
util.format('4155552671', 'US', PhoneNumberFormat.RFC3966); // 'tel:+14155552671'
```

仅当输入 **未** 已采用国际格式时，才会查阅 `defaultRegion` 参数 (ISO 3166-1 alpha-2)
形式（`+…`、`00…` 或 NANP `011…`
IDD 前缀）。

## 可能性与有效性

- **`isPossibleNumber`** 仅检查国家有效数字对于该地区是否具有合理的长度。
- **`isValidNumber`** 另外要求该号码属于指定的固定电话或移动电话范围（等效
  至 `getNumberType(...) !== UNKNOWN`）。

```ts
util.isPossibleNumber('05001234567', 'GB'); // true  (right length)
util.isValidNumber('05001234567', 'GB'); //    false (unassigned range)
```

## 支持地区及范围

上游 libphonenumber 为每个 ITU 区域提供详尽的、机器生成的元数据。这个端口编码了一个策划的，
手工验证的子集 - **美国、加拿大、英国、法国、德国、澳大利亚、印度、日本、巴西、中国、俄罗斯** - 并无需定期进行验证
表达式（在 AssemblyScript 中不可用），使用长度和前导数字规则。格式化使用每个区域
数字分组，是一个合理的近似值，而不是与上游的逐字节奇偶校验。可以添加新区域
通过扩展 `assembly/metadata.ts` 并重建 wasm。
