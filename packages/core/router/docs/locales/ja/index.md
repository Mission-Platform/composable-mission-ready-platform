# @mission-platform/router

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> packages/core/router/docs/index.md: [packages/core/router/docs/index.md](../../index.md)
> 言語: 日本語 (ja)

Vue、React、および React の統合ルート モデルとフレームワークごとのアダプターを提供する、フレームワークに依存しないルーティング ライブラリ
他のフレームワーク。

## 概要

`@mission-platform/router` パッケージは、ルートを分離する **フレームワーク中立のルーティング システム**を実装します
フレームワーク固有の実装の詳細からロジックを定義および照合します。これにより、ルートを一度定義できるようになります
一貫性を維持しながら、異なるフレームワーク間でそれらを使用できます。

## 主な特長

- **フレームワークに依存しないコア**: フレームワーク間で機能する中立的な形式でルートを定義します。
- **タイプセーフ API**: ルート定義とナビゲーションのための完全な TypeScript サポート
- **コンポーザブル アーキテクチャ**: コンポーザブルを使用してルーティング状態とナビゲーションにアクセスします
- **パスの文法**: パラメータを使用した柔軟なパス マッチング (`:p`、`:p?`、`:p*`、`:p+`、`*`)
- **クエリ文字列のサポート**: クエリ パラメータの組み込み解析とシリアル化
- **ネストされたルート**: 階層ルート構造のサポート

## メインモジュールとエクスポート

### コアルートモデル

フレームワークに依存しないルート定義システム:

**`MpRoute`**: パス、名前、メタデータを含む単一のルートを表します。

**`defineRoutes`**: ルート定義の配列からルート ツリーを作成します。

**例：**

```typescript
import { defineRoutes } from '@mission-platform/router';

const routes = defineRoutes([
  {
    path: '/',
    name: 'home',
    component: HomePage,
  },
  {
    path: '/about',
    name: 'about',
    component: AboutPage,
  },
  {
    path: '/users/:id',
    name: 'user-profile',
    component: UserProfile,
  },
]);
```

### パスユーティリティ

**`matchRoutes`**: 場所をルート ツリーと照合し、一致したルートを返します。

**例：**

```typescript
import { matchRoutes } from '@mission-platform/router';

const matches = matchRoutes(routes, '/users/123');
matches.forEach((match) => {
  console.log(match.route.name, match.params);
});
```

### 位置情報ユーティリティ

**`resolveLocation`**: ルートの場所を URL パスに解決します。

**例：**

```typescript
import { resolveLocation } from '@mission-platform/router';

const location = resolveLocation({
  name: 'user-profile',
  params: { id: '123' },
});
console.log(location.path); // '/users/123'
```

## フレームワークアダプター

アダプターはフレームワークごとのサブパスとして公開されません**。 `@mission-platform/router` は、
`mp:<framework>` のエクスポート条件はその 1 つの `.` エントリに基づいているため、フレームワークを **1 回**選択します —
Vite の `resolve.conditions` (`defineFrameworkAppConfig` / `frameworkResolveConditions` を参照)
`@mission-platform/vite-config`) および TypeScript の `customConditions` (
`@mission-platform/typescript-config/framework-<name>` プリセット) — そして、裸の指定子を使用してすべてをインポートします。
各アダプター ビルドは、ニュートラル コア全体も再エクスポートします。

### Vue アダプター (`mp:vue` 条件)

Vue 固有のアダプターは、`vue-router` との統合を提供します。

**主な輸出品:**

- **`createMpRouter`**: ニュートラル ルートから Vue ルーター インスタンスを作成します
- **`useMpRouter`**: ルーター インスタンスにアクセスするためのコンポーザブル
- **`useMpRoute`**: 現在のルート情報にアクセスするためのコンポーザブル
- **`MpRouterLink`**: フレームワーク中立のルーター リンク コンポーネント

**例：**

```vue
<template>
  <div>
    <MpRouterLink to="/">Home</MpRouterLink>
    <MpRouterLink to="/about">About</MpRouterLink>

    <router-view />
  </div>
</template>

<script setup lang="ts">
  import { MpRouterLink, createMpRouter } from '@mission-platform/router';
  import { createApp } from 'vue';
  import routes from './routes';

  const router = createMpRouter({
    routes,
    history: 'web', // or 'hash' or 'memory'
  });

  createApp(App).use(router).mount('#app');
</script>
```

### React アダプター (`mp:react` 条件)

React アダプターは、React ルーターとの統合を提供します。

**主な輸出品:**

- **`withMpRouter`**: ルーター コンテキストを提供する HOC
- **`useMpRoute`**: 現在のルート情報にアクセスするためのフック
- **`MpLink`**: React のフレームワーク中立リンク コンポーネント

### RedwoodSDK アダプター (`./redwood`)

RedwoodSDK は `mp:*` フレームワークの 1 つではないため、専用のサブパスを保持します。との統合を提供します
`rwsdk/router` — RedwoodSDK によって使用されるフラットなリクエスト/レスポンス ルート テーブル (Cloudflare Workers の React)。

**主な輸出品:**

- **`toRedwoodRoutes`**: ニュートラル `MpRoute` ツリーを `rwsdk` ルート定義 (ネストされた) のフラット リストに変換します。
  ルートは絶対パスにフラット化されます)。
- **`renderRoutes`**: 翻訳されたルートをドキュメントにラップし、ミラーリングします。
  `rwsdk` の `render(Document, routes, options)`。
- **`toRedwoodPath`**: ニュートラル パス パターンを Redwood の文法に変換します (`:param` および `*` ワイルドカードのみ。
  `:param?` → `:param`、`:param*` / `:param+`
  →`*`）。
- **`redwoodHref`** / **`createRedwoodLinks`**: RedwoodSDK 以降、中立的な場所からアプリ相対の href を構築します
  プレーンアンカーを使用してナビゲートします。

**例：**

```tsx
// worker.tsx
import { defineApp } from 'rwsdk/worker';
import { renderRoutes } from '@mission-platform/router/redwood';
import { Document } from '@/app/Document';
import { HomePage } from '@/app/pages/HomePage';
import { UserPage } from '@/app/pages/UserPage';

const routes = [
  { path: '/', component: HomePage },
  { path: '/users/:id', name: 'user', component: UserPage },
];

export default defineApp([renderRoutes(Document, routes)]);
```

## 技術的な詳細

### 依存関係

**コアパッケージ:**

- **TypeScript**: 型定義と型安全性
- **フレームワーク依存関係なし**: 純粋な JavaScript/TypeScript

**Vue アダプター:**

- **vue-router**: 公式 Vue ルーター ライブラリ
- **vue**: Vue 3 コア

**React アダプター:**

- **react-router-dom**: React Web アプリケーション用ルーター
- **react**: React コア

### 建築

パッケージは階層化されたアーキテクチャに従っています。

1. **コアレイヤー**: フレームワーク中立のルートモデルとユーティリティ
2. **アダプター層**: フレームワーク固有の実装 (Vue、React)
3. **パブリック API**: すべてのフレームワークの統一インターフェース

### パスの文法

ルーターは、次のパス パラメーター パターンをサポートします。

- `:param`: 必須パラメータ (例: `/users/:id`)
- `:param?`: オプションのパラメータ (例: `/users/:id?`)
- `:param*`: 0 個以上のパラメーター (例: `/files/:path*`)
- `:param+`: 1 つ以上のパラメータ (例: `/files/:path+`)
- `*`: キャッチオール ワイルドカード (例: `/*`)

## 統合ガイド

### Vue による基本セットアップ

1. パッケージをインストールします。

```bash
pnpm add @mission-platform/router vue-router
```

2. ルートを定義します。

```typescript
// src/routes.ts
import { defineRoutes } from '@mission-platform/router';
import HomePage from './pages/Home.vue';
import AboutPage from './pages/About.vue';

export default defineRoutes([
  {
    path: '/',
    name: 'home',
    component: HomePage,
  },
  {
    path: '/about',
    name: 'about',
    component: AboutPage,
  },
]);
```

3. ルーターを作成します。

```typescript
// src/router.ts
import { createMpRouter } from '@mission-platform/router';
import routes from './routes';

export default createMpRouter({
  routes,
  history: 'web',
});
```

4. アプリで使用します。

```vue
// src/App.vue
<script setup lang="ts">
  import { MpRouterLink } from '@mission-platform/router';
</script>

<template>
  <nav>
    <MpRouterLink to="/">Home</MpRouterLink>
    <MpRouterLink to="/about">About</MpRouterLink>
  </nav>
  <router-view />
</template>
```

### 動的ルートマッチング

```vue
<script setup lang="ts">
  import { useMpRoute } from '@mission-platform/router';

  const route = useMpRoute();

  console.log(route.params.id); // Access dynamic parameters
  console.log(route.query.search); // Access query parameters
</script>
```

### プログラムによるナビゲーション

```vue
<script setup lang="ts">
  import { useMpRouter } from '@mission-platform/router';

  const router = useMpRouter();

  const goToAbout = () => {
    router.push('/about');
  };

  const navigateWithParams = () => {
    router.push({
      name: 'user-profile',
      params: { id: '123' },
      query: { tab: 'details' },
    });
  };
</script>
```

## 高度な機能

### ルートメタフィールド

カスタム ロジックのルートにメタデータを追加します。

```typescript
const routes = defineRoutes([
  {
    path: '/admin',
    name: 'admin',
    component: AdminPage,
    meta: {
      requiresAuth: true,
      adminOnly: true,
    },
  },
]);
```

### ルートガード (Vue)

```typescript
import { createMpRouter } from '@mission-platform/router';

const router = createMpRouter({
  routes,
  history: 'web',
});

router.beforeEach((to, from, next) => {
  if (to.meta.requiresAuth && !isAuthenticated()) {
    next('/login');
  } else {
    next();
  }
});
```

### ネストされたルート

```typescript
const routes = defineRoutes([
  {
    path: '/app',
    name: 'app',
    component: AppLayout,
    children: [
      {
        path: 'dashboard',
        name: 'dashboard',
        component: DashboardPage,
      },
      {
        path: 'settings',
        name: 'settings',
        component: SettingsPage,
      },
    ],
  },
]);
```

## ベストプラクティス

1. **ルート構成**: 関連するルートをグループ化し、レイアウト コンポーネントにネストされたルートを使用します。
2. **名前付きルート**: プログラムによるナビゲーションには常に名前付きルートを使用します
3. **パラメータの検証**: ルート コンポーネントの動的パラメータを検証します。
4. **エラー処理**: キャッチオール ルート (`/*`) で 404 ケースを処理します。
5. **遅延読み込み**: コード分割に動的インポートを使用する (フレームワーク固有)
6. **タイプ セーフティ**: ルート パラメーターとクエリ オブジェクトのインターフェイスを定義します。
7. **クエリ管理**: クエリ パラメータをシンプルかつ URL セーフに保つ

## 移行ガイド

### Vue ルーターから直接

vue ルーターから @mission-platform/router に移行する場合:

1. `createRouter` を `createMpRouter` に置き換えます。
2. `defineRoutes` を使用するようにルート定義を変換します。
3. `<router-link>` を `<MpRouterLink>` に置き換えます。
4. コンポーザブルを更新します: `useRoute()` → `useMpRoute()`、`useRouter()` → `useMpRouter()`

### React ルーターから直接

react-router-dom から移行する場合:

1. `defineRoutes` を使用してニュートラル形式を使用してルートを定義します
2. `<Link>` を `<MpLink>` に置き換えます。
3. `useRoute()` の代わりに `useMpRoute()` を使用します。
4. ルーターアクセス用にコンポーネントを `withMpRouter` でラップする

### Next.js から

Next.js アプリケーションの場合は、次のことを考慮してください。

- 一貫性を保つためにニュートラル ルート定義を使用する
- 必要に応じてカスタム アダプター層を作成する
- ニュートラル モデルと並行して Next.js ファイルベースのルーティングを活用する
