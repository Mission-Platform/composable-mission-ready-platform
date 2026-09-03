# @mission-platform/breakpoints

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> packages/ui/breakpoints/docs/index.md: [packages/ui/breakpoints/docs/index.md](../../index.md)
> 言語: 日本語 (ja)

`@mission-platform/breakpoints` は、応答性の高いブレークポイント ユーティリティと **ライトワンス** ビューポート コンポーネントを提供します。
ミッションプラットフォーム。コンポーネント (`ForgeShowAt`、`ForgeHideAt`、`ForgeBreakpointDebug`) はニュートラルで一度作成されます。
`@mission-platform/forge` 方言であり、`@mission-platform/vite-plugin-forge` によって **Vue 3 と React** の両方にコンパイルされています。

## 輸出

- `@mission-platform/breakpoints` — 単一のエントリ ポイント。どのビルドを入手するかはアクティブなユーザーによって決まります
  `mp:<framework>` エクスポート条件 (`mp:vue`、`mp:react`、`mp:solid`、
  `mp:web-component`);条件が設定されていない場合、ニュートラルな JSX ソース バレルに解決されます (ライトワンス コンポーネントの場合)
  `@mission-platform/vite-plugin-forge` によって編集されました)。
- `@mission-platform/breakpoints/core` — フレームワークに依存しないユーティリティとタイプ。

フレームワークを **1 回**選択します — `resolve.conditions` via `defineFrameworkAppConfig` /
`@mission-platform/vite-config` からの `frameworkResolveConditions`、および `customConditions` 経由
`@mission-platform/typescript-config/framework-<name>` プリセット — 次に、裸のパッケージ指定子を使用してすべてをインポートします。

## ブレークポイントスケール

プラットフォームは、ビューポート幅のしきい値に基づいて 7 段階の応答スケールを使用します。

| キー  | ラベル | しきい値            | 一般的なデバイス / ユースケース       |
| :---- | :----- | :------------------ | :------------------------------------ |
| `2xs` | 極極小 | $\ge 0$ ピクセル    | すべてのデバイス                      |
| `xs`  | 極小   | $\ge 480$ ピクセル  | 大型携帯電話                          |
| `sm`  | 小     | $\ge 768$ ピクセル  | タブレットのポートレート              | 写真 |
| `md`  | 中     | $\ge 1024$ ピクセル | タブレットの横向き / 小型ラップトップ |
| `lg`  | 大     | $\ge 1920$ ピクセル | フルHD / 1080p                        |
| `xl`  | 特大   | $\ge 2560$ ピクセル | QHD                                   |
| `2xl` | 特大   | $\ge 3840$ ピクセル | 4K UHD                                |

## コア ユーティリティ (`/core`)

フレームワークに依存しないヘルパー。どのフレームワークからも安全に使用できます (またはどのフレームワークからも使用できません)。

- `breakpointKeys` — ブレークポイント キーの順序付き配列。
- `breakpoints` — キーの最小幅ピクセ​​ルしきい値へのマップ。
- `getBreakpointValue(key)` — ブレークポイントのピクセルしきい値。
- `mediaQuery(key)` — `min-width` メディア クエリ文字列 (`'(min-width: 1920px)'`)、または `2xs` の場合は `'all'`。
- `maxMediaQuery(key)` — `max-width` の上限メディア クエリ文字列、または `2xs` の場合は `'not all'`。
- `resolveBreakpoint(width)` — 指定されたピクセル幅、アクティブなブレークポイント キー。

```ts
import { mediaQuery, resolveBreakpoint } from '@mission-platform/breakpoints/core';

resolveBreakpoint(1024); // → 'md'
mediaQuery('lg'); // → '(min-width: 1920px)'
```

Vue のみの `useBreakpoints` コンポーザブルは削除されました。カスタム リアクティブ ビューポート ロジックの場合は、これらの `/core` に基づいて構築します。
フレームワーク独自のフックを備えたヘルパー (たとえば、`apps/service-monitor` の React `useCompactViewport` フックを参照)
`maxMediaQuery` に基づいて構築されています）。

## コンポーネント

### `<ForgeShowAt>`

ビューポートが指定されたブレークポイント基準を満たした場合に、スロット/子のコンテンツを条件付きでレンダリングします。

#### 使用法

```vue
<!-- Vue 3 (mp:vue condition active) -->
<script setup lang="ts">
  import { ForgeShowAt } from '@mission-platform/breakpoints';
</script>

<template>
  <ForgeShowAt min="md"><p>Visible on medium screens and above</p></ForgeShowAt>
  <ForgeShowAt
    min="sm"
    max="lg"
  >
    <p>Visible only on small and medium screens</p>
  </ForgeShowAt>
</template>
```

```tsx
// React (mp:react condition active) — note the identical bare specifier.
import { ForgeShowAt } from '@mission-platform/breakpoints';

<ForgeShowAt min="md">
  <p>Visible on medium screens and above</p>
</ForgeShowAt>;
```

#### 小道具

- `min?: BreakpointKey`: ビューポートがこのブレークポイント以上の場合にコンテンツを表示します。
- `max?: BreakpointKey`: ビューポートがこのブレークポイントより厳密に下にある場合にコンテンツを表示します。

### `<ForgeHideAt>`

`<ForgeShowAt>` の逆: ビューポートが指定された条件を満たす場合、条件付きでスロット/子のコンテンツを非表示にします。
ブレークポイントの基準。

```vue
<script setup lang="ts">
  import { ForgeHideAt } from '@mission-platform/breakpoints';
</script>

<template>
  <ForgeHideAt min="lg"><p>Hidden on large screens and above</p></ForgeHideAt>
</template>
```

#### 小道具

`<ForgeShowAt>`と同じ。

### `<ForgeBreakpointDebug>`

右下隅に固定された開発専用のオーバーレイ。現在アクティブなブレークポイントとそのブレークポイントが表示されます。
ブレークポイントはアクティブです。そのラベルは、i18next (`mp.breakpoints` 名前空間) を通じて英語のデフォルトでローカライズされます。

```tsx
// React
import { ForgeBreakpointDebug } from '@mission-platform/breakpoints';

<ForgeBreakpointDebug />;
```

## SCSSユーティリティ

ブレークポイント SCSS レイヤーは `@mission-platform/tokens` にあります。

### ミックスイン

```scss
@use '@mission-platform/tokens/scss/breakpoints-mixins' as bp;

.container {
  @include bp.bp-up('md') {
    max-width: 1024px;
  }
}
```

### 可視性ユーティリティクラス

```scss
@use '@mission-platform/tokens/scss/breakpoints-utilities';
```
