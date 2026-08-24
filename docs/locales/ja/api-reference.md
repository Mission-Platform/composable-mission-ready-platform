# Package API Directory

This project-wide page is a directory of package capabilities and compatibility
contracts. The canonical installation, usage, limitations, and API details for
each package live beside that package under `packages/*/docs/`, `configs/*/docs/`,
and `forge-plugins/*/docs/`. Generated API references must be added to the owning
package rather than this page.

> **インポートは常にベアです。** フレームワークの出荷 `@mission-platform/*` パッケージは単一の `.`
> 入口はによって守られています `mp:vue`, `mp:react`, `mp:solid`、 そして `mp:web-component` 輸出
> 条件。フレームワークを **1 回** — 経由で選択します `resolve.conditions` （見る `defineFrameworkAppConfig` /
> `frameworkResolveConditions` から `@mission-platform/vite-config`) そして `customConditions` (経由して
> `@mission-platform/typescript-config/framework-<name>` プリセット) — 次に、すべてを裸の状態でインポートします
> パッケージ指定子。見る [外部コンシューマーのセットアップ](external-consumer-setup.md). Select the framework **once** — via `resolve.conditions` (see `defineFrameworkAppConfig` /
> `frameworkResolveConditions` from `@mission-platform/vite-config`) and `customConditions` (via the
> `@mission-platform/typescript-config/framework-<name>` presets) — then import everything with the bare
> package specifier. See [External Consumer Setup](./external-consumer-setup.md).

## コアフレームワーク

### @mission-platform/forge

「ライトワンス」アーキテクチャの基盤であり、フレームワークに依存しない JSX ランタイムとフックを提供します。

| エクスポート             | タイプ   | `createMpRouter`                                                                             |
| :----------------- | :---- | :------------------------------------------------------------------------------------------- |
| `h`, `Fragment`    | 機能    | コンポーネントを作成するための JSX ファクトリとフラグメント。                                                            |
| `useState`         | フック   | フレームワーク中立状態フック。                                                                              |
| `useEffect`        | フック   | フレームワークに依存しないエフェクトフック。                                                                       |
| `useMemo`          | フック   | Framework-neutral memoization hook.                                          |
| `useRef`           | フック   | Framework-neutral reference hook.                                            |
| `useContext`       | フック   | Framework-neutral context hook.                                              |
| `toVueComponent`   | アダプター | forge コンポーネントを Vue 3成分(から `@mission-platform/forge/vue`). |
| `toReactComponent` | アダプター | forge コンポーネントを React コンポーネント（から `@mission-platform/forge/react`).            |

### @mission-platform/vite-plugin-forge

The compiler driver accepts explicit `FrameworkOutputPlugin` instances; it does
not provide a framework registry. `defineViteForgeComponents` and
`defineTsdownForgeComponents` (plus the hook and CMS helpers) share an in-process
`ForgeCompilerService` for one build or watch session.

| Capability         | 説明                                                                                                                                                                                  |
| :----------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Service lifecycle  | Reuse source, graph, parsed-source, semantic-IR, and target-artifact state across builds; dispose one-shot services after completion and watcher services on close. |
| Cache keys         | Source/dependency/config fingerprints, compiler and router options, `tsconfig` `baseUrl`/`paths`, target ID, plugin identity/version, and relevant conditions.      |
| Watch invalidation | Changed files invalidate reverse graph dependents, including transitive component and hook entries; unrelated target snapshots remain reusable.                     |
| Diagnostics/report | Reports phase timing, cache hit/miss counts, affected files, warnings, errors, and emitted artifact counts. Errors block promotion.                 |
| Artifact manifest  | Lists target-scoped entries, modules, declarations, source maps, assets, and checksums before atomic promotion.                                                     |
| Extension point    | Implement and pass a `FrameworkOutputPlugin` from a caller-owned `forge-plugin-*` package; do not add target branches to the neutral driver.                        |

Configure aliases through the project `tsconfig.json` (`baseUrl` and
`paths`); Vite and tsdown graph preparation use the same alias facts. Router
selection, router plugins, and conditions are forwarded through component and
hook helpers. A future worker/daemon may sit behind the service contract, but
the supported implementation is currently in-process.

### @mission-platform/router

Framework-neutral route contracts, pure matching helpers, and compiler markers for
shared packages. Applications own route records and native router instances; the
Forge router target selected by the application supplies the runtime capabilities.

| エクスポート                                                               | タイプ              | 説明                                                                                                                                                    |
| :------------------------------------------------------------------- | :--------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MpRoute`                                                            | アダプター            | Route records, params, query/hash state, metadata, and navigation targets.                                                            |
| `defineRoutes`                                                       | 機能               | Define route trees and resolve paths without a DOM or framework runtime.                                                              |
| `MpNavigationResult`, `MpRouteGuard`, `MpHistory`, `MpRouterAdapter` | タイプ              | Navigation outcomes/events, guards, pluggable history, and adapter contracts.                                                         |
| `useMpRoute`                                                         | Compiler markers | Neutral link, route-state, navigation, resolution, and outlet capabilities consumed by shared packages.                               |
| `@mission-platform/forge-router-*`                                   | フック              | Independently selected native router targets for Vue Router, React Router, SolidJS Router, SvelteKit, RedwoodSDK, and Web Components. |

Runtime packages own history and reactive state; the neutral package never imports a UI framework. For Web Components,
register the elements once and pass complex targets through DOM properties rather than serialized attributes:

```ts
import {
  MpMemoryHistory,
  createWebComponentsRouter,
  registerRouterElements,
  setForgeRouter,
} from '@mission-platform/forge-router-web-components/runtime';

registerRouterElements();
const router = createWebComponentsRouter({
  history: new MpMemoryHistory('/overview'),
  routes: [{ path: '/overview', component: () => 'Documentation' }],
});
setForgeRouter(router);
const link = document.createElement('forge-router-link');
link.to = { path: '/overview', query: { q: 'router' }, hash: 'results' };
link.router = router;
```

## UIとデザイン

### @mission-platform/tokens

Centralized design tokens for colors, typography, and spacing.

| エクスポート        | 説明                                                                                                            |
| :------------ | :------------------------------------------------------------------------------------------------------------ |
| `tokens`      | すべてのデザイン トークンを含む JS/TS オブジェクト (例: `tokens.color.primary`). |
| `tokens.scss` | スタイルシートで使用する SCSS 変数。                                                                                         |

### @mission-platform/breakpoints

応答性の高いユーティリティと可視性コンポーネント。

| エクスポート           | タイプ     | 説明                               |
| :--------------- | :------ | :------------------------------- |
| `useBreakpoints` | フック     | リアクティブ ブレークポイントのステータスを返します。      |
| `ShowIf`         | コンポーネント | ブレークポイント条件が一致した場合にのみ子をレンダリングします。 |
| `HideIf`         | コンポーネント | ブレークポイント条件が一致した場合に子を非表示にします。     |

### @mission-platform/components

共有 UI コンポーネントは一度作成すれば、複数のフレームワークで使用できます。

- **インポート**: 常に `@mission-platform/components`;アクティブな `mp:<framework>` 条件によって獲得できるかどうかが決まります
  Vue 3, React, Solid、または Web コンポーネントのビルド。
- **コンポーネントごとのサブパス**: `@mission-platform/components/<path>` (e.g.
  `@mission-platform/components/atoms/forge-badge/forge-badge`) 条件も認識し、そのコンポーネントのみをロードします。
  チャンク。
- **コンポーネント**: `ForgeButton`, `ForgeInput`, `ForgeModal`、など。

## 機能パッケージ

### @mission-platform/i18n

i18next に基づく国際化システム。

| エクスポート            | 説明                                 |
| :---------------- | :--------------------------------- |
| `createForgeI18N` | i18n インスタンスをプラットフォームのデフォルトで初期化します。 |
| `useI18n`         | コンポーネント内の翻訳とロケール切り替え用のフック。         |

### @mission-platform/seo

メタタグとSEO管理。

| エクスポート   | 説明                                          |
| :------- | :------------------------------------------ |
| `useSeo` | ページタイトル、メタタグ、Open Graph データを宣言的に設定するためのフック。 |

### @mission-platform/map

MapLibre GL のリアクティブ ラッパー。

| コンポーネント         | 説明                       |
| :-------------- | :----------------------- |
| `<MpMap>`       | メインのマップコンテナコンポーネント。      |
| `<MpMapMarker>` | 地図上にマーカーを配置するためのコンポーネント。 |

### @mission-platform/code-scanner

カメラベースのバーコードと QR コードのスキャン。

| コンポーネント           | 説明                                |
| :---------------- | :-------------------------------- |
| `<MpCodeScanner>` | カメラストリームを初期化し、スキャン結果を出力するコンポーネント。 |

## 統合

### @mission-platform/rxjs

RxJS Observable をコンポーネントの状態にブリッジします。

| フック             | 説明                                                                                          |
| :-------------- | :------------------------------------------------------------------------------------------ |
| `useObservable` | Subscribes to an observable and returns its latest value as reactive state. |

### @mission-platform/d3

フレームワークに依存しない D3.js 統合。

| フック     | 説明                                      |
| :------ | :-------------------------------------- |
| `useD3` | ライフサイクル管理を使用して、D3 選択をコンポーネント参照にバインドします。 |

### @mission-platform/hunspell

WebAssembly を利用したスペルチェック。

| エクスポート         | 説明                                          |
| :------------- | :------------------------------------------ |
| `initHunspell` | Hunspell WebAssembly モジュールをロードしてインスタンス化します。 |
| `spell`        | 単語のスペルが正しいかどうかをチェックします。                     |
| `suggest`      | 単語のスペルの提案を提供します。                            |

## さらに読む

- [Vue 2～ Vue 3 移行ガイド](migration-guides/vue2-to-vue3.md)
- [プロジェクト構成の概要](configs/index.md)
- [ワークスペースの構造](workspace-structure.md)

## 完全なワークスペース パッケージ インデックス

次のインデックスはパッケージ マニフェストから生成され、ここに保存されるため、パブリック API リファレンスではあらゆるものがカバーされます。
パッケージに入れる `packages/`、型指定された WebAssembly ファサードを含みます。

### コアとUI

| パッケージ                          | 目的                                        |
| :----------------------------- | :---------------------------------------- |
| `@mission-platform/forge`      | フレームワークに依存しない JSX ランタイムとアダプター。            |
| `@mission-platform/components` | Write-once UI components. |
| `@mission-platform/icons`      | ライトワンス SVG アイコン コンポーネント。                  |
| `@mission-platform/layouts`    | アプリケーション、コンテナ、およびレスポンシブ レイアウトのコンポーネント。    |
| `@mission-platform/forms`      | スキーマ フォームとビジュアル フォーム ビルダー コンポーネント。        |
| `@mission-platform/forms-core` | スキーマ導出、検証、およびフォームビルダードメインロジック。            |
| `@mission-platform/tokens`     | CSS カスタム プロパティと SCSS デザイン トークン。           |

### コンポーザブルと統合

| パッケージ                                           | 目的                                                                            |
| :---------------------------------------------- | :---------------------------------------------------------------------------- |
| `@mission-platform/breakpoints`                 | 応答性のブレークポイントの状態と可視性ヘルパー。                                                      |
| `@mission-platform/d3`                          | D3 選択ライフサイクル コンポーザブルおよびマージン ユーティリティ。                                          |
| `@mission-platform/i18n`                        | i18next 状態およびフレームワーク統合ヘルパー。                                                   |
| `@mission-platform/map`                         | MapLibre マップ コンポーネントとコンポーザブル。                                                 |
| `@mission-platform/observers`                   | Intersection, mutation, and performance observer composables. |
| `@mission-platform/phone-number`                | 入力された WebAssembly 電話番号の解析と書式設定。                                               |
| `@mission-platform/router`                      | Framework-neutral route contracts and compiler capabilities.  |
| `@mission-platform/forge-router-web-components` | Web Components router target and framework-free runtime.      |
| `@mission-platform/rxjs`                        | RxJS オブザーバブルおよびサブスクリプション コンポーザブル。                                             |
| `@mission-platform/scheduler`                   | スケジューラ UI、繰り返し、およびカレンダー レイアウトのドメイン ロジック。                                      |
| `@mission-platform/vcard`                       | RFC 6350 vCard および RFC 5545 iCalendar データとコンポーネント。                            |
| `@mission-platform/content`                     | コンテンツ AST、ビルダー、Monaco、Markdown、および WYSIWYG コンポーネント。                           |
| `@mission-platform/seo`                         | メタデータ、オープン グラフ、および構造化データ コンポーザブル。                                             |
| `@mission-platform/speech-audio`                | 音声、オーディオ、Web MIDI コンポーザブル。                                                    |
| `@mission-platform/three`                       | Three.js キャンバスとライフサイクル コンポーザブル。                               |

### コードと WebAssembly パッケージ

| パッケージ                            | 目的                                                               |
| :------------------------------- | :--------------------------------------------------------------- |
| `@mission-platform/barcode`      | 1D バーコードは、ファサードとコンポーネントをエンコード/デコードします。                           |
| `@mission-platform/code-scanner` | Camera and image code-scanning component.        |
| `@mission-platform/matrix-code`  | Data Matrix and Aztec encode/decode façade.      |
| `@mission-platform/qr-code`      | QR encode/decode façade and component.           |
| `@mission-platform/harper`       | Harper grammar and style integration for Monaco. |
| `@mission-platform/hunspell`     | Emscripten Hunspell spell-checking wrapper.      |

### Forge コンパイラ ターゲット

These live in `forge-plugins/` rather than `packages/`. A **framework** plugin decides which runtime a neutral component
is lowered to; a **CMS** target decides which content platform it is projected onto. The two axes compose, so any CMS
target may be bound to any framework plugin. See the [Forge Compiler Pipeline](../vite-plugins/forge/docs/reference/compiler.md).

| パッケージ                                           | 目的                                                                        |
| :---------------------------------------------- | :------------------------------------------------------------------------ |
| `@mission-platform/forge-plugin-api`            | `FrameworkOutputPlugin` コントラクト、セマンティック IR タイプ、およびビルド アダプター タイプ。           |
| `@mission-platform/forge-plugin-react`          | React 出力対象。                                                               |
| `@mission-platform/forge-plugin-vue`            | Vue 3 出力ターゲット。                                                            |
| `@mission-platform/forge-plugin-solid`          | Solid 出力対象。                                                               |
| `@mission-platform/forge-plugin-svelte`         | Svelte 5 出力ターゲット。                                                         |
| `@mission-platform/forge-plugin-web-components` | Web コンポーネントの出力ターゲット。                                                      |
| `@mission-platform/forge-cms-plugin-api`        | `CmsOutputPlugin` コントラクト、ニュートラル コンテンツ モデル、CMS ドライバー、ビルド ヘルパー。             |
| `@mission-platform/forge-cms-storyblok`         | Storyblok コンポーネント オブジェクト、ブロック ラッパー、および `components.json`. |
| `@mission-platform/forge-cms-astro`             | 静的 `.astro` テンプレートと `client:load` 枠組みの島々。                                 |
| `@mission-platform/forge-cms-ghost`             | ゴーストハンドルバーのパーシャルと `config.custom` テーマの断片。                                 |
| `@mission-platform/forge-cms-jekyll`            | ジキルリキッドには以下が含まれます。 `_data` スキーマと `_config.yml` 断片。                        |
| `@mission-platform/forge-cms-webflow`           | ウェブフロー `declareComponent` コードコンポーネントと `webflow.json` ライブラリの断片。            |

#### @mission-platform/forge-cms-plugin-api

| エクスポート                    | タイプ | 説明                                                                                              |
| :------------------------ | :-- | :---------------------------------------------------------------------------------------------- |
| `analyzeContentComponent` | 機能  | 中立的なコンポーネントのプロパティをプラットフォーム中立的なコンテンツ モデルに投影します。                                                  |
| `ContentComponent`        | タイプ | 注文済み `ContentField`、スロット、および `interactive` フラグ。                                                 |
| `ContentFieldKind`        | タイプ | `text`, `richtext`, `number`, `boolean`, `option`, `asset`, `link`, `children`. |
| `CmsOutputPlugin`         | タイプ | ターゲット コントラクト: バインドされたフレームワーク プラグインと 4 つのエミッター。                                  |
| `defineForgeCmsPlugin`    | 機能  | 構成時に CMS ターゲットを検証します。                                                                           |
| `generateCmsArtifacts`    | 機能  | 一般的な検出→IR→コンテンツモデル→出力→ドライバーの書き込み。                                                               |
| `defineTsdownForgeCms`    | 機能  | 1 つの CMS ターゲットの tsdown 構成、発行 `dist/cms/<cms>/<framework>/**`.                   |
| `defineTsdownForgeCmsAll` | 機能  | CMS ターゲットのリストの tsdown config。                                                                   |
