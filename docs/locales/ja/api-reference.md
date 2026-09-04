# Package API Directory

This project-wide page is a directory of package capabilities and compatibility
contracts. The canonical installation, usage, limitations, and API details for
each package live beside that package under its full `packages/**/docs/` path. Generated API references must be added to the owning
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

### @mission-platform/forge-jsx

「ライトワンス」アーキテクチャの基盤であり、フレームワークに依存しない JSX ランタイムとフックを提供します。

| エクスポート          | タイプ | `createMpRouter`                                    |
| :-------------- | :-- | :-------------------------------------------------- |
| `h`, `Fragment` | 機能  | コンポーネントを作成するための JSX ファクトリとフラグメント。                   |
| `useState`      | フック | フレームワーク中立状態フック。                                     |
| `useEffect`     | フック | フレームワークに依存しないエフェクトフック。                              |
| `useMemo`       | フック | Framework-neutral memoization hook. |
| `useRef`        | フック | Framework-neutral reference hook.   |
| `useContext`    | フック | Framework-neutral context hook.     |

### @mission-platform/forge-adapters

Framework-specific adapters for rendering neutral Forge JSX components. Each
framework is exposed as an independent subpath so applications can select only
the runtime they use.

| エクスポート             | タイプ     | 説明                                                                                                                 |
| :----------------- | :------ | :----------------------------------------------------------------------------------------------------------------- |
| `toVueComponent`   | アダプター   | Converts a Forge component to a Vue 3 component from `@mission-platform/forge-adapters/vue`.       |
| `toReactComponent` | アダプター   | Converts a Forge component to a React component from `@mission-platform/forge-adapters/react`.     |
| SolidJS primitives | Adapter | `Teleport`, `Transition`, and `TransitionGroup` from `@mission-platform/forge-adapters/solid`.     |
| Svelte primitives  | Adapter | Raw HTML and transition helpers from `@mission-platform/forge-adapters/svelte`.                    |
| Web Components     | Runtime | Native custom-element rendering primitives from `@mission-platform/forge-adapters/web-components`. |

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

| エクスポート                                                               | タイプ              | Description                                                                                                                                           |
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
} from "@mission-platform/forge-router-web-components/runtime";

registerRouterElements();
const router = createWebComponentsRouter({
  history: new MpMemoryHistory("/overview"),
  routes: [{ path: "/overview", component: () => "Documentation" }],
});
setForgeRouter(router);
const link = document.createElement("forge-router-link");
link.to = { path: "/overview", query: { q: "router" }, hash: "results" };
link.router = router;
```

### Async route views and `Suspense`

Forge's neutral compiler recognizes `Suspense` and lowers it to the native
async boundary for the selected target. Keep the fallback in the shared source
so every target presents the same loading state without importing a framework
adapter:

```tsx
<Suspense fallback={<LoadingSpinner label="Loading documentation" />}>
  <DocumentationRoute />
</Suspense>
```

React, Vue, Solid, and Svelte receive their native suspense boundary. A
framework-free application uses the Web Components router's outlet fallback
for async route views instead:

```ts
const router = createWebComponentsRouter({
  history: new MpMemoryHistory("/overview"),
  loadingFallback: () => {
    const spinner = document.createElement("span");
    spinner.className = "docs-loading-spinner";
    spinner.setAttribute("aria-label", "Loading documentation");
    return spinner;
  },
  routes: [{ path: "/:slug(.*)", component: loadDocumentationView }],
});
```

The router emits a loading overlay from `forge-router-outlet` while the async
route view resolves. The current view remains mounted until the destination is
ready, and the overlay is removed after success, redirect, cancellation, or
failure.

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

| コンポーネント           | Description                       |
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

## Service Monitoring

### Service Monitor API

The service-monitor application provides both public and authenticated endpoints for monitoring service health.

#### Public Endpoints

Public endpoints expose only minimal status information and do not require authentication:

- **`GET /api/services`**: Returns rolled-up status for every monitored service. Response includes only `{ id, name, type }` for each service, plus `now` and `intervalSeconds`. No target configuration, URLs, hosts, queries, headers, thresholds, or topology is exposed.
- **`GET /api/metrics?service=<id>&since=<ms>`**: Returns raw time-series metrics for one service. The `since` parameter is bounded by the configured retention window. Response includes only `service`, `now`, `since`, and `samples`.

#### Authenticated Endpoints

Authenticated endpoints require the `MONITOR_API_TOKEN` bearer token and expose full monitor configuration:

- **`POST /api/check`**: Trigger an immediate probe cycle.
- **`GET /api/monitors`**: List all monitors with full configuration.
- **`POST /api/monitors`**: Create a new monitor.
- **`PATCH /api/monitors/<id>`**: Update an existing monitor.
- **`DELETE /api/monitors/<id>`**: Delete a monitor and clear its historical counters.

#### Probe and Destination Policy

Service-monitor enforces strict bounds on probe behavior:

- **Allowed schemes**: URL probes default to `https://` (and port 443) unless trusted private mode is enabled; `http://` is allowed in trusted mode.
- **Allowed ports**: URL probes allow port 443; host probes allow a baseline of ports [53, 80, 123, 443, 1883, 8883].
- **Forbidden destinations**: Private/link-local addresses (127.0.0.1, ::1, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, fe80::/10) unless explicitly trusted.
- **Request/response bounds**: Probe requests are limited to 64 KB; responses are limited to 256 KB. Speed tests are limited to 25 MB.
- **Redirect policy**: Redirects must remain within the same origin and approved path prefixes; cross-origin or disallowed-path redirects are rejected.
- **History retention**: Incident, update, and maintenance history is bounded by item-count caps (max 100 items per monitor). Default retention for metric data is 24 hours.

#### Server-Side Rendering (SSR)

The service-monitor SSR layer requires authentication before serializing private monitor configuration into client props. Unauthenticated requests receive only the public status DTO.

### Email Sender Worker

The email-sender worker provides a local development showcase for email rendering and delivery.

#### Deployment Modes

- **Local development** (default): Sends to MailPit on `localhost:1025`. No authentication required.
- **Non-local deployment**: Requires explicit `EMAIL_DEPLOYMENT_TOKEN` bearer authorization, `EMAIL_ALLOWED_ORIGINS` allowlist, and `EMAIL_ALLOWED_RECIPIENTS` allowlist. Rate limiting via `EMAIL_RATE_LIMITER` is enforced.

#### Request Validation

All email requests must:

- Use `Content-Type: application/json`.
- Include a valid recipient email address (`to` field, max 254 characters).
- Include a recipient name (`recipientName`, 1–100 characters).
- Include completed email HTML (`html`, max 240 KB).
- Pass HTML compatibility checks via `assertCompatibleEmailHtml`.

#### Fail-Closed Defaults

Non-local deployments without explicit configuration will reject all requests. Local deployments remain unrestricted for development convenience.

## Forge Web Script Artifact Verification

### Artifact Content Identity

Forge Web Script artifacts use a versioned SHA-256 content identity in the format `sha256-v1:<hex>`. This digest is computed over the complete artifact binary and is stored in the artifact manifest's `contentHash` field.

#### Integrity vs. Authenticity

A content hash **detects accidental or unauthorized content changes** when compared with a trusted expected value. It does **not**:

- Authenticate the producer or origin of the artifact.
- Replace cryptographic signatures or deployment access controls.
- Guarantee the artifact is safe to execute.

#### Verification Workflow

1. **Obtain the expected hash** from a trusted source (e.g., a signed manifest, CI build log, or secure configuration).
2. **Compute the artifact hash** using the verifier: `fws_verify_artifact(artifact)` returns the `contentHash`.
3. **Compare hashes**: If they match, the artifact has not been accidentally or maliciously altered since the expected value was recorded.
4. **Verify the manifest**: Use `fws_inspect_manifest` to check capability imports, exports, metadata, and policy compliance independently.

#### Versioning

The `sha256-v1` prefix allows for future hash algorithm upgrades without ambiguity. Callers must handle both legacy (if any) and current digest formats gracefully.

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
| `@mission-platform/forge-jsx`  | フレームワークに依存しない JSX ランタイムとアダプター。            |
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

These live in `packages/compiler/plugins/`. A **framework** plugin decides which runtime a neutral component
is lowered to; a **CMS** target decides which content platform it is projected onto. The two axes compose, so any CMS
target may be bound to any framework plugin. See the [Forge Compiler Pipeline](../packages/tooling/vite/forge/docs/reference/compiler.md).

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

| Export                    | タイプ      | Description                                                                                     |
| :------------------------ | :------- | :---------------------------------------------------------------------------------------------- |
| `analyzeContentComponent` | Function | 中立的なコンポーネントのプロパティをプラットフォーム中立的なコンテンツ モデルに投影します。                                                  |
| `ContentComponent`        | タイプ      | 注文済み `ContentField`、スロット、および `interactive` フラグ。                                                 |
| `ContentFieldKind`        | タイプ      | `text`, `richtext`, `number`, `boolean`, `option`, `asset`, `link`, `children`. |
| `CmsOutputPlugin`         | Type     | ターゲット コントラクト: バインドされたフレームワーク プラグインと 4 つのエミッター。                                  |
| `defineForgeCmsPlugin`    | 機能       | 構成時に CMS ターゲットを検証します。                                                                           |
| `generateCmsArtifacts`    | 機能       | 一般的な検出→IR→コンテンツモデル→出力→ドライバーの書き込み。                                                               |
| `defineTsdownForgeCms`    | 機能       | 1 つの CMS ターゲットの tsdown 構成、発行 `dist/cms/<cms>/<framework>/**`.                   |
| `defineTsdownForgeCmsAll` | 機能       | CMS ターゲットのリストの tsdown config。                                                                   |
