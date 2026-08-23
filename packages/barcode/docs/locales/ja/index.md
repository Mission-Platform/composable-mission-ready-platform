# @mission-platform/barcode

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> packages/barcode/docs/index.md: [packages/barcode/docs/index.md](../../index.md)
> 言語: 日本語 (ja)

Rust で記述され、**WebAssembly** にコンパイルされた、依存関係のない **1D (リニア) バーコード エンコーダーおよびデコーダー**
小型の完全に型指定された ES モジュール ラッパーと、一度だけ書き込み可能な `ForgeBarcode` UI コンポーネントを介して。

## 概要

`@mission-platform/barcode` は、1D リニア バーコードの高性能エンコードとデコードを提供します。

- **エンコーダー**: シンボルとペイロードをモジュール ビットのフラットなランにレンダリングします (`1` = バー、`0` = スペース)。
- **デコーダー**: サポートされているシンボルのクリーンなモジュール実行をペイロードに読み込みます。
- **UI コンポーネント (`ForgeBarcode`)**: Vue 3、React、Solid、および Web コンポーネント、すべて用にコンパイルされたライトワンス コンポーネント
  `mp:<framework>` エクスポート条件を介して、裸の `@mission-platform/barcode` 指定子から提供されます。

## サポートされているシンボル

|シンボル学 |メモ |
| ------------ | ---------------------------------------------------------------------- |
| `code128` |高密度。印刷可能な ASCII のコード B。数字のコード C 高速パス。 |
| `gs1-128` | GS1 アプリケーション識別子の先頭に FNC1 を付けたコード 128。            |
| `code39` |英数字、セルフチェック。 `*` スタート/ストップによる自動フレーム化。          |
| `code39ext` |シフト文字を使用したフル ASCII コード 39。                               |
| `code93` |コンパクトなセルフチェック機能（2つのチェック文字）。                         |
| `code93ext` |シフト文字を使用したフル ASCII コード 93。                               |
| `ean13` | 12 桁 (チェックが追加される) または 13 (チェックが検証される)。                     |
| `ean8` | 7 桁 (チェックが追加される) または 8 (チェックが検証される)。                       |
| `upca` | 11 桁 (チェックが追加される) または 12 (チェックが検証される)。                     |
| `upce` |ゼロサプレス UPC。 6桁または7/8桁の形式。                       |
| `itf` |インターリーブド 2/5。偶数の桁数が必要です。                         |
| `itf14` | 14 桁の GTIN-14 を修正しました。                                                |
| `codabar` |数字に `-$:/.+` を加えたもの。 `A` 開始/停止による自動フレーム化。                 |
| `msi` | MSI / mod-10チェック付きの修正されたPlessey。                              |
| `pharmacode` | Laetus 製薬のバイナリ コード (`3`–`131070`)。                      |

## APIと使用法

### コア エンコーダおよびデコーダ (`@mission-platform/barcode`)

```ts
import { decodeBarcode, encodeBarcode } from '@mission-platform/barcode';

// Encode a 1D barcode
const barcode = encodeBarcode('code128', 'MISSION-128');
// barcode.width -> number
// barcode.modules -> number[] (1 = bar, 0 = space)

// Decode back to string
const payload = decodeBarcode('code128', barcode.modules);
```

### フレームワーク UI コンポーネント

フレームワークごとのサブパスはありません。`resolve.conditions` までのフレームワークを **1 回**選択します (「
`defineFrameworkAppConfig` / `frameworkResolveConditions` (`@mission-platform/vite-config` から)、および
`customConditions` (`@mission-platform/typescript-config/framework-<name>` プリセット経由)、インポート
パッケージルートからの `ForgeBarcode`。

**Vue 3** (`mp:vue` アクティブ):

```vue
<script setup lang="ts">
  import { ForgeBarcode } from '@mission-platform/barcode';
</script>

<template>
  <ForgeBarcode
    symbology="code128"
    value="MISSION-128"
    :height="60"
  />
</template>
```

**React** (`mp:react` アクティブ):

```tsx
import { ForgeBarcode } from '@mission-platform/barcode';

export function BarcodeViewer() {
  return (
    <ForgeBarcode
      symbology="code128"
      value="MISSION-128"
      height={60}
    />
  );
}
```
