# 外部コンシューマーのセットアップ

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> docs/external-consumer-setup.md: [docs/external-consumer-setup.md](../../external-consumer-setup.md)
> 言語: 日本語 (ja)

このガイドでは、メインのモノリポジトリの外部にあるプロジェクトで Mission Platform パッケージを使用する方法について説明します。フレームワーク固有のビルドの使用とデザイン トークンの管理に重点を置いています。

## 条件によるフレームワークの選択

Mission Platform コンポーネントは、次を使用して一度作成されます。 `@mission-platform/forge` 複数のフレームワーク固有のバンドルとして配布されます (Vue 3, React, Solid、Web コンポーネント) を 1 つのパッケージ内に収めます。

正しいバンドルを選択するには、ビルド ツールを設定し、 TypeScript **カスタム エクスポート条件**を使用します。

### サポートされるフレームワーク条件

|フレームワーク |輸出条件 |
| :--- | :--- |
| **Vue 3** | `mp:vue` |
| **React** | `mp:react` |
| **Solid** | `mp:solid` |
| **Web コンポーネント** | `mp:web-component` |

## プロジェクト構成

### 1. Vite 構成

使用している場合 Viteからヘルパー関数を使用できます。 `@mission-platform/vite-config` 正しい解決条件を自動的に設定します。フレームワークフリーのアプリでは、 `mp:web-component`;をインストールまたは設定しないでください。 Vue そのターゲット用のプラグイン。

```ts
import { defineConfig } from 'vite';
import { frameworkResolveConditions } from '@mission-platform/vite-config';

export default defineConfig({
  resolve: {
    // This places the Web Components build at the top of the condition list.
    conditions: frameworkResolveConditions('web-component'),
  },
});
```

### 2. TypeScript 構成

確実にするために、 TypeScript 言語サービス (LSP) は正しいフレームワークの型を解決します。フレームワーク プリセットを拡張する必要があります。 `@mission-platform/typescript-config`.

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

ニュートラル ルーター パッケージには、フレームワークやルーターとライブラリのランタイム依存関係はありません。で選択したネイティブルーターをインストールします
アプリケーションと一致する Forge ターゲット (`@mission-platform/forge-router-vue`, `-react`, `-solid`, `-svelte`,
`-redwood`、 または `-web-components`)。アプリケーションは、ルート定義、プロバイダー、ガード、ローダー、およびネイティブ
ルーターインスタンス。再利用可能なパッケージは、からの機能のみをインポートします `@mission-platform/router`.

## コンポーネントの使用法

条件が正しく構成されていれば、パッケージのルートからコンポーネントをインポートできます。ビルド ツールは、一致するバンドルを自動的に選択します。 `mp:*` 状態。

```vue
<script setup lang="ts">
import { ForgeButton } from '@mission-platform/components';
</script>

<template>
  <ForgeButton variant="primary">Click Me</ForgeButton>
</template>
```

### フレームワークフリーのルーティング

テストとプリレンダリングにメモリ履歴を使用するか、省略します。 `history` ブラウザでブラウザ履歴を使用します。ルーターを登録する
要素は一度だけ。ルート ターゲットにパラメータ、クエリ値、またはハッシュが含まれている場合は、ルート ターゲットをプロパティとして割り当てます。

```ts
import {
  MpMemoryHistory,
  createWebComponentsRouter,
  registerRouterElements,
  setForgeRouter,
} from '@mission-platform/forge-router-web-components/runtime';

registerRouterElements();
const router = createWebComponentsRouter({
  history: new MpMemoryHistory('/'),
  routes: [
    { path: '/', redirect: '/docs/intro' },
    { path: '/docs/*', name: 'doc', component: () => document.createTextNode('Docs') },
  ],
});
setForgeRouter(router);

const outlet = document.querySelector('forge-router-outlet');
outlet?.setRouter(router);
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

すべての Mission Platform コンポーネントはこれらの変数を消費するため、変更は `:root` レベルは UI 全体に伝播します。
