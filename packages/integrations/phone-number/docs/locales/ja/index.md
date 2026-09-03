# @mission-platform/phone-number

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> packages/integrations/phone-number/docs/index.md: [packages/integrations/phone-number/docs/index.md](../../index.md)
> 言語: 日本語 (ja)

`@mission-platform/phone-number` は、次のコアを重点的に再実装したものです。
Google [lib電話番号](https://github.com/google/libphonenumber)、で書かれています
[アセンブリスクリプト](https://www.assemblyscript.org/) に変換され、**WebAssembly** にコンパイルされます。解析、検証、分類、および
国際電話番号をフォーマットし、実行時の依存関係のない自己完結型の ES モジュールとしてパッケージ化されています。

## 建築

このパッケージは、** によって完全に駆動される AssemblyScript → WebAssembly ビルド パイプラインを使用します。Vite**:

1. **AssemblyScript ソース** (`assembly/`) には、厳選されたリージョンごとのメタデータ (`metadata.ts`) が保持されます。
   解析/検証/分類/フォーマット ロジック (`index.ts`)。
2. **Vite による WASM コンパイル**: `@mission-platform/vite-plugin-assemblyscript`
   Vite `buildStart` フックで AssemblyScript コンパイラを実行し、
   `build/phone-number.wasm` と ESM バインディング。
3. **単一ファイル アーティファクト**: プラグインは、wasm バイナリを Base64 としてインライン化します。
   `@generated` モジュール (`src/generated/phone-number.js`) は非同期でメモ化された `loadModule()` ファクトリを公開します —
   個別の `.wasm` ファイルの読み込みと URL 解決が不要になります。
4. **型付きファサード**: `src/index.ts` は、生の wasm エクスポート上で `PhoneNumberUtil` クラスを公開します。

### WASM アーティファクトの再構築

AssemblyScript は Vite によってコンパイルされます。 Docker やネイティブ ツールチェーンは必要ありません。

```bash
# Full build:
pnpm --filter @mission-platform/phone-number build

# Or just run Vite (recompiles AssemblyScript, regenerates src/generated):
pnpm --filter @mission-platform/phone-number exec vite build
```

## 使用法

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

`defaultRegion` 引数 (ISO 3166-1 alpha-2) は、入力がすでに国際言語で**ない**場合にのみ参照されます。
フォーム (`+…`、`00…`、または NANP `011…`)
IDD プレフィックス)。

## 可能性と妥当性

- **`isPossibleNumber`** は、国内有効数字がその地域にとって妥当な長さであるかどうかのみをチェックします。
- **`isValidNumber`** では、割り当てられた固定回線または携帯電話の範囲に番号が含まれることも必要です (同等の
  `getNumberType(...) !== UNKNOWN` に)。

```ts
util.isPossibleNumber('05001234567', 'GB'); // true  (right length)
util.isValidNumber('05001234567', 'GB'); //    false (unassigned range)
```

## サポートされている地域と範囲

アップストリームの libphonenumber は、すべての ITU 地域に対して機械生成された網羅的なメタデータを提供します。このポートは厳選された、
手作業で検証されたサブセット — **US、CA、GB、FR、DE、AU、IN、JP、BR、CN、RU** – であり、定期的な検証を行わずに検証を実装します。
長さと先頭の桁の規則を使用した式 (AssemblyScript では使用できません)。フォーマットはリージョンごとに使用されます
これは、アップストリームとのバイトごとのパリティではなく、妥当な近似値です。 New regions can be added
`assembly/metadata.ts` を拡張し、wasm を再構築します。
