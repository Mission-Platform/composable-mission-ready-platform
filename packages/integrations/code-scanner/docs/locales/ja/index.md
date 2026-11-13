# @mission-platform/code-scanner

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> packages/integrations/code-scanner/docs/index.md: [packages/integrations/code-scanner/docs/index.md](../../index.md)
> 言語: 日本語 (ja)

静的にリンクされたコードからコンパイルされた、依存関係のない **画像 / カメラ コード スキャナー**
WebAssembly へのフリント グラフ。リンクされたアーティファクトは現在データをデコードしています
マトリックス、コンパクト アステカ、1D/RSS リーダー、PDF417、画像ファイルからの MaxiCode または
ライブカメラストリーム。 QR グラフは独立して発光しますが、QR グラフの外側に残ります。
Forge エミッターの制限を調査する際に結合されたアーティファクト。

## APIの概要

### コアスキャナー (`@mission-platform/code-scanner`)

```ts
import { scanFile, scanImageData, scanImageDataAll, type ScanOptions } from '@mission-platform/code-scanner';

// Scan ImageData directly
const options: ScanOptions = { formats: ['DATA_MATRIX'], tryHarder: true };
const result = scanImageData(imageData, options);

// Scan the package's all-results entry point. The current linked reduced graph
// returns at most its first validated result until multi-symbol detection lands.
const allResults = scanImageDataAll(imageData);

// Scan a File / Blob
const resultFromFile = await scanFile(file);
```

### UI コンポーネント (`ForgeCodeScanner`)

同じベアから Vue 3、React、Solid および Web コンポーネントで使用できるライトワンス コンポーネント
`@mission-platform/code-scanner` 指定子 — アクティブな `mp:<framework>` エクスポート条件によってビルドが選択されます。
`resolve.conditions` を通じて **1 回** 設定します (`defineFrameworkAppConfig` / `frameworkResolveConditions` を参照)
`@mission-platform/vite-config` から) および `customConditions` (
`@mission-platform/typescript-config/framework-<name>` プリセット）。

**Vue 3** (`mp:vue` アクティブ):

```vue
<script setup lang="ts">
  import { ForgeCodeScanner } from '@mission-platform/code-scanner';
</script>

<template>
  <ForgeCodeScanner @result="(res) => console.log(res.text, res.format)" />
</template>
```

**React** (`mp:react` アクティブ):

```tsx
import { ForgeCodeScanner } from '@mission-platform/code-scanner';

export function CameraScanner() {
  return <ForgeCodeScanner onResult={(result) => console.log(result.text, result.format)} />;
}
```
