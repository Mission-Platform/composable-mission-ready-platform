# 外部コンシューマーのセットアップ

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> docs/external-consumer-setup.md: [docs/external-consumer-setup.md](../../external-consumer-setup.md)
> 言語: 日本語 (ja)

このガイドでは、メインのモノリポジトリの外部にあるプロジェクトで Mission Platform パッケージを使用する方法について説明します。フレームワーク固有のビルドの使用とデザイン トークンの管理に重点を置いています。

## 条件によるフレームワークの選択

Mission Platform コンポーネントは、`@mission-platform/forge` を使用して一度作成され、単一のパッケージ内の複数のフレームワーク固有のバンドル (Vue 3、React、Solid、および Web コンポーネント) として配布されます。

正しいバンドルを選択するには、**カスタム エクスポート条件**を使用するようにビルド ツールと TypeScript を構成する必要があります。

### サポートされるフレームワーク条件

|フレームワーク |輸出条件 |
| :----------------- | :----------------- |
| **Vue 3** | `mp:vue` |
| **React** | `mp:react` |
| **Solid** | `mp:solid` |
| **Web コンポーネント** | `mp:web-component` |

## プロジェクト構成

### 1.Viteの構成

Vite を使用している場合は、`@mission-platform/vite-config` のヘルパー関数を使用して、正しい解決条件を自動的に設定できます。フレームワークフリーのアプリでは `mp:web-component` を選択する必要があります。そのターゲットに対して Vue プラグインをインストールまたは構成しないでください。

```ts
import { defineConfig } from "vite";
import { frameworkResolveConditions } from "@mission-platform/vite-config";

export default defineConfig({
  resolve: {
    // This places the Web Components build at the top of the condition list.
    conditions: frameworkResolveConditions("web-component"),
  },
});
```

### 2. TypeScript の設定

TypeScript 言語サービス (LSP) が正しいフレームワークの型を解決できるようにするには、`@mission-platform/typescript-config` からフレームワーク プリセットを拡張する必要があります。

```json
{
  "extends": "@mission-platform/typescript-config/framework-web-component",
  "compilerOptions": {
    "customConditions": ["mp:web-component"]
  }
}
```

## パッケージのインストール

レジストリから必要なパッケージをインストールします。

```bash
pnpm add @mission-platform/components @mission-platform/tokens @mission-platform/router @mission-platform/forge-router-web-components
```

### ピアの依存関係

ほとんどの Mission Platform パッケージは、ランタイムの依存関係を外部化します。対応するフレームワークと共有ライブラリがプロジェクトにインストールされていることを確認してください。

```bash
# Example for a Vue 3 project
pnpm add @mission-platform/i18n
```

ニュートラル ルーター パッケージには、フレームワークやルーター ライブラリのランタイム依存関係はありません。で選択したネイティブルーターをインストールします
アプリケーションと一致する Forge ターゲット (`@mission-platform/forge-router-vue`、`-react`、`-solid`、`-svelte`、
`-redwood`、または `-web-components`)。アプリケーションは、ルート定義、プロバイダー、ガード、ローダー、およびネイティブ
ルーターインスタンス。再利用可能なパッケージは、`@mission-platform/router` からの機能のみをインポートします。

## コンポーネントの使用法

条件が正しく構成されていれば、パッケージのルートからコンポーネントをインポートできます。ビルド ツールは、`mp:*` 条件に一致するバンドルを自動的に選択します。

```vue
<script setup lang="ts">
import { ForgeButton } from "@mission-platform/components";
</script>

<template>
  <ForgeButton variant="primary">Click Me</ForgeButton>
</template>
```

### フレームワークフリーのルーティング

テストと事前レンダリングにメモリ履歴を使用するか、ブラウザで `history` を省略してブラウザ履歴を使用します。ルーターを登録する
要素は一度だけ。ルート ターゲットにパラメータ、クエリ値、またはハッシュが含まれる場合、ルート ターゲットをプロパティとして割り当てます。

```ts
import {
  MpMemoryHistory,
  createWebComponentsRouter,
  registerRouterElements,
  setForgeRouter,
} from "@mission-platform/forge-router-web-components/runtime";

registerRouterElements();
const router = createWebComponentsRouter({
  history: new MpMemoryHistory("/"),
  routes: [
    { path: "/", redirect: "/docs/intro" },
    {
      path: "/docs/*",
      name: "doc",
      component: () => document.createTextNode("Docs"),
    },
  ],
});
setForgeRouter(router);

const outlet = document.querySelector("forge-router-outlet");
outlet?.setRouter(router);
```

### 読み込みスピナーによる非同期ナビゲーション

非同期ルート コンポーネントは、次の表示中に現在のページを表示したままにすることができます。
負荷がかかります。 Web コンポーネント ルーターの作成時にアウトレット フォールバックを構成します。
次に、`forge-router-link` は、`pushState` を使用して SPA ナビゲーションを実行します (または置き換えます)
`replace` が有効な場合の履歴):

```ts
const router = createWebComponentsRouter({
  history: new MpMemoryHistory("/docs/intro"),
  loadingFallback: () => {
    const spinner = document.createElement("span");
    spinner.className = "docs-loading-spinner";
    spinner.setAttribute("aria-label", "Loading documentation");
    return spinner;
  },
  routes: [
    {
      path: "/docs/*",
      component: async () => (await import("./views/docs-view")).default(),
    },
  ],
});
setForgeRouter(router);
document.querySelector("forge-router-outlet")?.setRouter(router);
```

```html
<forge-router-link to="/docs/advanced"
  >Advanced documentation</forge-router-link
>
<forge-router-outlet></forge-router-outlet>
```

アウトレットは読み込みオーバーレイを所有しており、現在マウントされているオーバーレイは削除されません。
宛先が解決されるまで表示します。成功するとオーバーレイがクリアされます。
リダイレクト、キャンセル、失敗したナビゲーション。変更されたクリック数、ダウンロード数、
外部 URL、および別のターゲットとのリンクは、ネイティブのブラウザーの動作を保持します。

共有 Forge ソースを作成するときは、中立境界を直接使用して、
各コンパイラはネイティブ実装を選択します。

```tsx
<Suspense fallback={<LoadingSpinner label="Loading documentation" />}>
  <DocumentationRoute />
</Suspense>
```

## デザイントークンのカスタマイズ

Mission Platform は、デザイン トークンに CSS カスタム プロパティ (変数) を使用します。これらのトークンは、アプリケーションのルート スタイルシートでグローバルにオーバーライドできます。

```css
/* App.css */
:root {
  /* Override the brand primary color */
  --mp-color-brand-primary: #007bff;

  /* Override a spacing token */
  --mp-spacing-md: 1.5rem;
}
```

すべての Mission Platform コンポーネントはこれらの変数を消費するため、`:root` レベルでの変更は UI 全体に反映されます。
