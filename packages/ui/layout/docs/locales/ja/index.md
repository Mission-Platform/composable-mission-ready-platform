# `@mission-platform/layouts`

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> packages/ui/layout/docs/index.md: [packages/ui/layout/docs/index.md](../../index.md)
> 言語: 日本語 (ja)

Vue 3 および React のフレームワーク中立のアプリケーションとパターン レイアウト。Forge JSX 方言で作成され、スタイル設定されています。
ミッションプラットフォームデザイントークン付き。

## 概要

`@mission-platform/layouts` パッケージには、アプリケーション シェル、コンテナー、垂直レイアウト、および 4 つの再利用可能なレイアウトが含まれています。
レスポンシブパターンテンプレート。そのコンポーネントは、既存のフレームワーク条件付きパッケージ ビルドを通じてエクスポートされるため、
同じソースは、Vue 3、React、Solid、Svelte、および Web コンポーネントで動作します。

## 特徴

- **アプリケーション シェル**: `ForgeApplicationLayout`、`ForgeContainer`、および `ForgeVerticalLayout`
- **弁当の構成**: 特徴とサポート地域を備えた支配的なヒーロー
- **通常のグリッド**: メトリックおよびステータスカードのコレクション用の順序付けされた名前付きセル
- **F パターン構成**: ドキュメント スタイルのヘッダー、イントロ、記事、セカンダリ、フッター領域
- **Z パターン構成**: 上部、中央、下部のコンテンツ領域が交互に配置されます。
- **CSS のみの応答性**: `window`、`matchMedia`、またはクライアント状態を使用しないモバイルファースト リフロー
- **デザイン トークンの統合**: ギャップ、パディング、マージンは Mission Platform の間隔トークンを使用します

## インストール

```bash
pnpm add @mission-platform/layouts
```

## 使用法

### Vue 3

```vue
<script setup lang="ts">
  import { ForgeBentoLayout, ForgeFPatternLayout, ForgeGridLayout } from '@mission-platform/layouts';
</script>

<template>
  <ForgeBentoLayout gap="lg">
    <template #hero><h1>Mission Platform</h1></template>
    <template #feature><p>Composable building blocks</p></template>
    <template #supporting><a href="/docs">Read the docs</a></template>
  </ForgeBentoLayout>

  <ForgeFPatternLayout>
    <template #header><nav>Documentation navigation</nav></template>
    <template #primary><article>Guide content</article></template>
    <template #secondary><aside>On this page</aside></template>
  </ForgeFPatternLayout>

  <ForgeGridLayout
    :rows="2"
    :columns="2"
  >
    <template #cell1><article>Availability</article></template>
    <template #cell2><article>Latency</article></template>
  </ForgeGridLayout>
</template>
```

### React

```tsx
import { ForgeBentoLayout, ForgeZPatternLayout } from '@mission-platform/layouts';

export function LandingPage() {
  return (
    <>
      <ForgeBentoLayout
        hero={<h1>Mission Platform</h1>}
        feature={<p>Composable building blocks</p>}
        supporting={<a href="/docs">Read the docs</a>}
      />
      <ForgeZPatternLayout
        topStart={<h2>Build once</h2>}
        topEnd={
          <img
            src="hero.png"
            alt=""
          />
        }
        middle={<p>Use the same layout from Vue or React.</p>}
        bottomStart={<a href="/docs">Documentation</a>}
        bottomEnd={<button type="button">Get started</button>}
      />
    </>
  );
}
```

## APIリファレンス

### 共有コントロール

4 つのパターン テンプレートはすべて次のものを受け入れます。

- `tag`: `div`、`section`、`article`、`main`、または `aside`
- `gap`、`margin`、および `padding`: `2xs`、`xs`、`sm`、`md`、`lg`、`xl`、または `2xl`
- `breakpoint`: `xs`、`sm`、`md`、`lg`、または `xl`

コンポーネントは、1 列または積み上げレイアウトとして開始されます。選択したブレークポイントで、パターン固有のパターンを適用します。
グリッド領域。リージョン ラッパーには予測可能な BEM スタイルのクラスがあり、名前付きスロットが存在する場合にのみ発行されます。

### 地域契約

| コンポーネント        | 名前付き領域                                               | 構成ソース                                                                |
| --------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------- |
| `ForgeBentoLayout`    | `hero`、`feature`、`supporting`                            | Web サイトのマーケティングのヒーローと特集セクション                      |
| `ForgeGridLayout`     | `cell1` ～ `cell12`                                        | サービス モニター ダッシュボード カードとステータスの概要                 |
| `ForgeFPatternLayout` | `header`、`intro`、`primary`、`secondary`、`footer`        | ドキュメントのナビゲーションバー/コンテキスト、記事、サイドバー、フッター |
| `ForgeZPatternLayout` | `topStart`、`topEnd`、`middle`、`bottomStart`、`bottomEnd` | 代替ランディング ページのコンテンツとアクション                           |

`ForgeGridLayout` は `rows` と `columns` を受け入れ、両方を 1 以上にクランプし、レンダリング可能な領域を名前付きの 12 に制限します。
セルを作成し、ブレークポイントの下で単一列フォールバックを使用します。名前付きセルは常にソース順にレンダリングされます。

## 商品構成のご案内

テンプレートはアプリケーションの動作ではなく構造を抽出します。 Web サイトのパッケージ カードと FAQ コンテンツ、ドキュメント ナビゲーション、および
ルーティング、サービス モニターのポーリング、フォーム、およびインシデントの状態は、引き続きアプリケーションによって所有されます。それらのアプリケーション
`apps/` から `packages/layout` へのインポートを導入せずに、既存のコンテンツを指定された領域に渡すことができます。

アクセシビリティを確保するために、提供されたコンテンツをセマンティックな読み取り順序に保ち、CSS グリッド領域を視覚的な配置としてのみ扱います。
長いコンテンツは `min-width: 0` および `overflow-wrap: anywhere` によって保護されます。 SSR には `window` または
`matchMedia`。

## ライセンス

BSD-4-Claes
