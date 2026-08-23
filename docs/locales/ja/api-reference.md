# パッケージAPIディレクトリ

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> docs/api-reference.md: [docs/api-reference.md](../../api-reference.md)
> 言語: 日本語 (ja)

このプロジェクト全体のページは、パッケージの機能と互換性のディレクトリです。
契約。の正規インストール、使用法、制限事項、および API の詳細
各パッケージはそのパッケージの隣に存在します `packages/*/docs/`, `configs/*/docs/`、
そして `forge-plugins/*/docs/`。生成された API 参照は、所有者に追加する必要があります
このページではなくパッケージを参照してください。

> **インポートは常にベアです。** フレームワークの出荷 `@mission-platform/*` パッケージは単一のを公開します `.`
> 入口はによって守られています `mp:vue`, `mp:react`, `mp:solid`、 そして `mp:web-component` 輸出
> 条件。フレームワークを **1 回** — 経由で選択します `resolve.conditions` （見る `defineFrameworkAppConfig` /
> `frameworkResolveConditions` から `@mission-platform/vite-config`) そして `customConditions` (経由して
> `@mission-platform/typescript-config/framework-<name>` プリセット) — 次に、すべてを裸の状態でインポートします
> パッケージ指定子。見る [外部コンシューマーのセットアップ](external-consumer-setup.md).

## コアフレームワーク

### @mission-platform/forge

「ライトワンス」アーキテクチャの基盤であり、フレームワークに依存しない JSX ランタイムとフックを提供します。

|エクスポート |タイプ |説明 |
|:-------------------|:---------|:----------------------------------------------------------------------------------------|
| `h`, `Fragment`    |機能 |コンポーネントを作成するための JSX ファクトリとフラグメント。                                      |
| `useState`         |フック |フレームワーク中立状態フック。                                                           |
| `useEffect`        |フック |フレームワークに依存しないエフェクトフック。                                                          |
| `useMemo`          |フック |フレームワークに依存しないメモ化フック。                                                     |
| `useRef`           |フック |フレームワークに依存しない参照フック。                                                       |
| `useContext`       |フック |フレームワークに依存しないコンテキスト フック。                                                         |
| `toVueComponent`   |アダプター | forge コンポーネントを Vue 3成分(から `@mission-platform/forge/vue`).   |
| `toReactComponent` |アダプター | forge コンポーネントを React コンポーネント（から `@mission-platform/forge/react`). |

### @mission-platform/vite-plugin-forge

コンパイラ ドライバは明示的なパラメータを受け入れます。 `FrameworkOutputPlugin` インスタンス;それはあります
フレームワークレジストリは提供しません。 `defineViteForgeComponents` そして
`defineTsdownForgeComponents` (さらにフックと CMS ヘルパー) インプロセスを共有します
`ForgeCompilerService` 1 回のビルドまたは監視セッションの場合。

|能力 |説明 |
|:-----------|:------------|
|サービスのライフサイクル |ソース、グラフ、解析されたソース、セマンティック IR、およびターゲット アーティファクトの状態をビルド間で再利用します。完了後にワンショット サービスを破棄し、終了時にウォッチャー サービスを破棄します。 |
|キャッシュキー |ソース/依存関係/構成フィンガープリント、コンパイラーおよびルーターのオプション、 `tsconfig` `baseUrl`/`paths`、ターゲット ID、プラグイン ID/バージョン、および関連する条件。 |
|ウォッチの無効化 |変更されたファイルは、推移コンポーネントやフック エントリなどの逆グラフ依存関係を無効にします。無関係なターゲット スナップショットは引き続き再利用可能です。 |
|診断/レポート |フェーズのタイミング、キャッシュのヒット/ミス数、影響を受けるファイル、警告、エラー、生成されたアーティファクトの数をレポートします。エラーによりプロモーションがブロックされます。 |
|アーティファクトマニフェスト |アトミック プロモーションの前に、ターゲット スコープのエントリ、モジュール、宣言、ソース マップ、アセット、およびチェックサムをリストします。 |
|拡張ポイント |を実装して渡す `FrameworkOutputPlugin` 発信者が所有するものから `forge-plugin-*` パッケージ;ターゲット ブランチをニュートラル ドライバーに追加しないでください。 |

プロジェクトを通じてエイリアスを構成する `tsconfig.json` (`baseUrl` そして
`paths`); Vite および tsdown グラフの準備では、同じエイリアス ファクトが使用されます。ルーター
選択、ルータープラグイン、および条件は、コンポーネントおよび
フックヘルパー。将来のワーカー/デーモンはサービス コントラクトの背後に存在する可能性がありますが、
サポートされている実装は現在進行中です。

### @mission-platform/router

フレームワークに依存しないルート コントラクト、純粋なマッチング ヘルパー、およびコンパイラ マーカー
共有パッケージ。アプリケーションはルート レコードとネイティブ ルーター インスタンスを所有します。の
アプリケーションによって選択された Forge ルーター ターゲットは、ランタイム機能を提供します。

|エクスポート / パッケージ |タイプ |説明 |
|:-----------------|:-----|:------------|
| `MpRoute`, `MpRouteLocationRaw`, `MpResolvedLocation` |種類 |ルート レコード、パラメータ、クエリ/ハッシュ状態、メタデータ、およびナビゲーション ターゲット。 |
| `defineRoutes`, `matchRoutes`, `resolveLocation` |機能 | DOM やフレームワーク ランタイムを使用せずにルート ツリーを定義し、パスを解決します。 |
| `MpNavigationResult`, `MpRouteGuard`, `MpHistory`, `MpRouterAdapter` |種類 |ナビゲーションの結果/イベント、ガード、プラグ可能履歴、アダプター コントラクト。 |
| `MpLink`, `useMpRoute`, `useMpRouter`, `useMpNavigation`, `MpRouterView` |コンパイラマーカー |共有パッケージによって消費されるニュートラル リンク、ルート状態、ナビゲーション、解決、およびアウトレット機能。 |
| `@mission-platform/forge-router-*` |ターゲットを鍛造する |独立して選択されたネイティブ ルーター ターゲット Vue ルーター、 React ルーター、SolidJS ルーター、SvelteKit、RedwoodSDK、および Web コンポーネント。 |

ランタイム パッケージには独自の履歴と反応状態が含まれます。中立パッケージは UI フレームワークをインポートしません。 Web コンポーネントの場合、
要素を一度登録し、シリアル化された属性ではなく DOM プロパティを通じて複雑なターゲットを渡します。

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

色、タイポグラフィー、間隔のデザイントークンを一元化。

|エクスポート |説明 |
|:--------------|:--------------------------------------------------------------------------|
| `tokens`      |すべてのデザイン トークンを含む JS/TS オブジェクト (例: `tokens.color.primary`). |
| `tokens.scss` |スタイルシートで使用する SCSS 変数。                                    |

### @mission-platform/breakpoints

応答性の高いユーティリティと可視性コンポーネント。

|エクスポート |タイプ |説明 |
|:-----------------|:----------|:-----------------------------------------------------------|
| `useBreakpoints` |フック |リアクティブ ブレークポイントのステータスを返します。                        |
| `ShowIf`         |コンポーネント |ブレークポイント条件が一致した場合にのみ子をレンダリングします。 |
| `HideIf`         |コンポーネント |ブレークポイント条件が一致した場合に子を非表示にします。        |

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

|エクスポート |説明 |
|:------------------|:----------------------------------------------------------|
| `createForgeI18N` | i18n インスタンスをプラットフォームのデフォルトで初期化します。     |
| `useI18n`         |コンポーネント内の翻訳とロケール切り替え用のフック。 |

### @mission-platform/seo

メタタグとSEO管理。

|エクスポート |説明 |
|:---------|:----------------------------------------------------------------------|
| `useSeo` |ページ タイトル、メタ タグ、および Open Graph データを宣言的に設定するためのフック。 |

### @mission-platform/map

MapLibre GL のリアクティブ ラッパー。

|コンポーネント |説明 |
|:----------------|:------------------------------------------|
| `<MpMap>`       |メインのマップコンテナコンポーネント。             |
| `<MpMapMarker>` |地図上にマーカーを配置するためのコンポーネント。 |

### @mission-platform/code-scanner

カメラベースのバーコードと QR コードのスキャン。

|コンポーネント |説明 |
|:------------------|:-----------------------------------------------------------------|
| `<MpCodeScanner>` |カメラストリームを初期化し、スキャン結果を出力するコンポーネント。 |

## 統合

### @mission-platform/rxjs

RxJS Observable をコンポーネントの状態にブリッジします。

|フック |説明 |
|:----------------|:----------------------------------------------------------------------------|
| `useObservable` |オブザーバブルをサブスクライブし、その最新の値をリアクティブ状態として返します。 |

### @mission-platform/d3

フレームワークに依存しない D3.js 統合。

|フック |説明 |
|:--------|:-------------------------------------------------------------------|
| `useD3` |ライフサイクル管理を使用して、D3 選択をコンポーネント参照にバインドします。 |

### @mission-platform/hunspell

WebAssembly を利用したスペルチェック。

|エクスポート |説明 |
|:---------------|:--------------------------------------------------------|
| `initHunspell` | Hunspell WebAssembly モジュールをロードしてインスタンス化します。 |
| `spell`        |単語のスペルが正しいかどうかをチェックします。                  |
| `suggest`      |単語のスペルの提案を提供します。               |

## さらに読む

- [Vue 2～ Vue 3 移行ガイド](migration-guides/vue2-to-vue3.md)
- [プロジェクト構成の概要](configs/index.md)
- [ワークスペースの構造](workspace-structure.md)

## 完全なワークスペース パッケージ インデックス

次のインデックスはパッケージ マニフェストから生成され、ここに保存されるため、パブリック API リファレンスではあらゆるものがカバーされます。
パッケージに入れる `packages/`、型指定された WebAssembly ファサードを含みます。

### コアとUI

|パッケージ |目的 |
|:-------------------------------|:--------------------------------------------------------------|
| `@mission-platform/forge`      |フレームワークに依存しない JSX ランタイムとアダプター。                   |
| `@mission-platform/components` |ライトワンス UI コンポーネント。                                     |
| `@mission-platform/icons`      |ライトワンス SVG アイコン コンポーネント。                               |
| `@mission-platform/layouts`    |アプリケーション、コンテナー、およびレスポンシブ レイアウトのコンポーネント。     |
| `@mission-platform/forms`      |スキーマ フォームとビジュアル フォーム ビルダー コンポーネント。              |
| `@mission-platform/forms-core` |スキーマ導出、検証、およびフォームビルダードメインロジック。 |
| `@mission-platform/tokens`     | CSS カスタム プロパティと SCSS デザイン トークン。                 |

### コンポーザブルと統合

|パッケージ |目的 |
|:-----------------------------------|:--------------------------------------------------------------|
| `@mission-platform/breakpoints`    |応答性のブレークポイントの状態と可視性ヘルパー。           |
| `@mission-platform/d3`             | D3 選択ライフサイクル コンポーザブルおよびマージン ユーティリティ。       |
| `@mission-platform/i18n`           | i18next 状態およびフレームワーク統合ヘルパー。              |
| `@mission-platform/map`            | MapLibre マップ コンポーネントとコンポーザブル。                      |
| `@mission-platform/observers`      |交差、突然変異、およびパフォーマンス オブザーバー コンポーザブル。 |
| `@mission-platform/phone-number`   |入力された WebAssembly 電話番号の解析と書式設定。        |
| `@mission-platform/router`         |フレームワークに依存しないルート コントラクトとコンパイラ機能。 |
| `@mission-platform/forge-router-web-components` | Web コンポーネント ルーター ターゲットとフレームワークフリーのランタイム。 |
| `@mission-platform/rxjs`           | RxJS オブザーバブルおよびサブスクリプション コンポーザブル。                 |
| `@mission-platform/scheduler`     |スケジューラ UI、繰り返し、およびカレンダー レイアウトのドメイン ロジック。 |
| `@mission-platform/vcard`         | RFC 6350 vCard および RFC 5545 iCalendar データとコンポーネント。  |
| `@mission-platform/content`       |コンテンツ AST、ビルダー、Monaco、Markdown、および WYSIWYG コンポーネント。 |
| `@mission-platform/seo`            |メタデータ、オープン グラフ、および構造化データ コンポーザブル。        |
| `@mission-platform/speech-audio`   |音声、オーディオ、Web MIDI コンポーザブル。                      |
| `@mission-platform/three`          | Three.js キャンバスとライフサイクル コンポーザブル。                    |

### コードと WebAssembly パッケージ

|パッケージ |目的 |
|:--------------------------------------------|:--------------------------------------------------|
| `@mission-platform/barcode`                 | 1D バーコードは、ファサードとコンポーネントをエンコード/デコードします。    |
| `@mission-platform/code-scanner`            |カメラおよび画像コードスキャンコンポーネント。         |
| `@mission-platform/matrix-code`             | Data Matrix と Aztec はファサードをエンコード/デコードします。       |
| `@mission-platform/qr-code`                 |ファサードとコンポーネントを QR エンコード/デコードします。            |
| `@mission-platform/harper`                  | Harper の文法とスタイルをモナコに統合。  |
| `@mission-platform/hunspell`                | Emscripten Hunspell スペルチェック ラッパー。       |

### Forge コンパイラ ターゲット

これらはに住んでいます `forge-plugins/` それよりも `packages/`。 **フレームワーク** プラグインは、どのランタイムを中立コンポーネントにするかを決定します
に引き下げられます。 **CMS** ターゲットは、どのコンテンツ プラットフォームに投影されるかを決定します。 2 つの軸が構成されるため、どの CMS でも
target は任意のフレームワーク プラグインにバインドできます。を参照してください。 [Forge コンパイラ パイプライン](../../../vite-plugins/forge/docs/locales/ja/reference/compiler.md).

|パッケージ |目的 |
|:-------------------------------------------------|:--------------------------------------------------------------------------------|
| `@mission-platform/forge-plugin-api`             | `FrameworkOutputPlugin` コントラクト、セマンティック IR タイプ、およびビルド アダプター タイプ。   |
| `@mission-platform/forge-plugin-react`           | React 出力対象。                                                            |
| `@mission-platform/forge-plugin-vue`             | Vue 3 出力ターゲット。                                                            |
| `@mission-platform/forge-plugin-solid`           | Solid 出力対象。                                                            |
| `@mission-platform/forge-plugin-svelte`          | Svelte 5 出力ターゲット。                                                         |
| `@mission-platform/forge-plugin-web-components`  | Web コンポーネントの出力ターゲット。                                                   |
| `@mission-platform/forge-cms-plugin-api`         | `CmsOutputPlugin` コントラクト、ニュートラル コンテンツ モデル、CMS ドライバー、ビルド ヘルパー。 |
| `@mission-platform/forge-cms-storyblok`          | Storyblok コンポーネント オブジェクト、ブロック ラッパー、および `components.json`.              |
| `@mission-platform/forge-cms-astro`              |静的 `.astro` テンプレートと `client:load` 枠組みの島々。                  |
| `@mission-platform/forge-cms-ghost`              |ゴーストハンドルバーのパーシャルと `config.custom` テーマの断片。                 |
| `@mission-platform/forge-cms-jekyll`             |ジキルリキッドには以下が含まれます。 `_data` スキーマと `_config.yml` 断片。           |
| `@mission-platform/forge-cms-webflow`            |ウェブフロー `declareComponent` コードコンポーネントと `webflow.json` ライブラリの断片。 |

#### @mission-platform/forge-cms-plugin-api

|エクスポート |タイプ |説明 |
|:---------------------------|:---------|:--------------------------------------------------------------------------------|
| `analyzeContentComponent`  |機能 |中立的なコンポーネントのプロパティをプラットフォーム中立的なコンテンツ モデルに投影します。  |
| `ContentComponent`         |タイプ |注文済み `ContentField`、スロット、および `interactive` フラグ。                    |
| `ContentFieldKind`         |タイプ | `text`, `richtext`, `number`, `boolean`, `option`, `asset`, `link`, `children`. |
| `CmsOutputPlugin`          |タイプ |ターゲット コントラクト: バインドされたフレームワーク プラグインと 4 つのエミッター。          |
| `defineForgeCmsPlugin`     |機能 |構成時に CMS ターゲットを検証します。                                  |
| `generateCmsArtifacts`     |機能 |一般的な検出→IR→コンテンツモデル→出力→ドライバーの書き込み。               |
| `defineTsdownForgeCms`     |機能 | 1 つの CMS ターゲットの tsdown 構成、発行 `dist/cms/<cms>/<framework>/**`.    |
| `defineTsdownForgeCmsAll`  |機能 | CMS ターゲットのリストの tsdown config。                                      |
