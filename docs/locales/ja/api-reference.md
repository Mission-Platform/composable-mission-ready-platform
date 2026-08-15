# APIリファレンス

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> 英語の原典: [docs/api-reference.md](../../api-reference.md)
> 言語: 日本語 (ja)

Mission Platform コア パッケージとフレームワーク アダプターのテクニカル リファレンス。

> **インポートは常にベアです。** フレームワークの出荷 `@mission-platform/*` パッケージは単一の `.`
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

### @mission-platform/router

フレームワークに依存しないルーティング プリミティブとアダプター。

|エクスポート |タイプ |説明 |
|:-----------------|:---------|:-----------------------------------------------------------------------------------------------------------------|
| `MpRoute`        |タイプ |ルートツリーを定義するためのインターフェイス。                                                                              |
| `defineRoutes`   |機能 |ルート ツリーを定義および検証するためのヘルパー。                                                                       |
| `createMpRouter` |アダプター |を作成します Vue-互換ルーター（から露出） `@mission-platform/router` いつ `mp:vue` 状態はアクティブです)。 |
| `useMpRoute`     |フック |現在のルート状態にアクセスします (アダプター固有)。                                                                   |

## UIとデザイン

### @mission-platform/tokens

色、タイポグラフィ、間隔のデザイントークンを一元化。

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
| `useSeo` |ページタイトル、メタタグ、Open Graph データを宣言的に設定するためのフック。 |

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
| `@mission-platform/layouts`    |アプリケーション、コンテナ、およびレスポンシブ レイアウトのコンポーネント。     |
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
| `@mission-platform/router`         |フレームワークに依存しないルーティング プリミティブとアダプター。            |
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
| `@mission-platform/barcode-decode-wasm`     |生成されたバーコード デコーダー WebAssembly モジュール。     |
| `@mission-platform/barcode-encode-wasm`     |生成されたバーコード エンコーダー WebAssembly モジュール。     |
| `@mission-platform/code-scan-wasm`          |生成されたイメージ スキャナー WebAssembly モジュール。       |
| `@mission-platform/code-scanner`            |カメラおよび画像コードスキャンコンポーネント。         |
| `@mission-platform/matrix-code`             | Data Matrix と Aztec はファサードをエンコード/デコードします。       |
| `@mission-platform/matrix-code-decode-wasm` |生成されたマトリックス コード デコーダー WebAssembly モジュール。 |
| `@mission-platform/matrix-code-encode-wasm` |生成されたマトリックス コード エンコーダー WebAssembly モジュール。 |
| `@mission-platform/qr-code`                 |ファサードとコンポーネントを QR エンコード/デコードします。            |
| `@mission-platform/qr-code-decode-wasm`     |生成された QR デコーダー WebAssembly モジュール。          |
| `@mission-platform/qr-code-encode-wasm`     |生成された QR エンコーダ WebAssembly モジュール。          |
| `@mission-platform/harper`                  | Harper の文法とスタイルをモナコに統合。  |
| `@mission-platform/hunspell`                | Emscripten Hunspell スペルチェック ラッパー。       |

### Forge コンパイラ ターゲット

これらはに住んでいます `forge-plugins/` それよりも `packages/`。 **フレームワーク** プラグインは、どのランタイムを中立コンポーネントにするかを決定します
に引き下げられます。 **CMS** ターゲットは、どのコンテンツ プラットフォームに投影されるかを決定します。 2 つの軸が構成されるため、どの CMS でも
target は任意のフレームワーク プラグインにバインドできます。見る [Forge コンパイラ パイプライン](forge-compiler.md).

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
