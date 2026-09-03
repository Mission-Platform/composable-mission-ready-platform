# Forgeコンポーネントトークンリファレンス

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> packages/ui/tokens/docs/reference/component-tokens.md: [packages/ui/tokens/docs/reference/component-tokens.md](../../../reference/component-tokens.md)
> 言語: 日本語 (ja)

これは、Forge で作成されたコンポーネントの正規インベントリと Figma ハンドオフです。意図的に独立しています
生成されたフレームワーク アダプター: 同じエントリが Vue、React、Solid、Svelte、および Web コンポーネントに適用されます。

## 契約書を読む

真実の情報源は、次の再帰コンポーネントのソース ツリーです。
[`tokens/component/`](../../../../tokens/component)、原子レベルごとにグループ化
(`atoms/`、`molecules/`、`organisms/`、および `templates/`)。各ソースは独立して生成されますが、すべてのソースは
同じ安定した `component.*` DTCG コントラクトを保持します。

```text
component.<component>.<variant?>.<slot>.<state?>
  -> --mp-<component>-<variant?>-<slot>-<state?>
  -> Mission Platform / Component / <component> / <variant?> / <slot> / <state?>
```

DTCG パスは、Figma およびランタイム オーバーライド パスでもあります。生成された CSS 名のみが `component` ラッパーを削除します。
たとえば、`component.button.primary.background.hover` は `--mp-button-primary-background-hover` として出力されます。あ
`component/atoms/button` などのソース ID は、新しい DTCG パスではなく、コントラクトを所有するファイルを識別します。

コンポーネント値は、既存のプリミティブおよびセマンティック テーマ ドキュメントのエイリアスになります。その結果、Figma コレクションは
コンポーネント トークンを複製しない **ライト** モードと **ダーク** モード。ランタイムのライト/ダーク動作は引き続き使用されます
`color-scheme`、`light-dark()`、`[data-theme]`、および `.theme-*` サブツリー ピン。コンシューマと Storybook は、
`overrides.tokens.json` の `component` の下の葉。オーバーライドは、生成されたトークン スタイルシートの後に適用されます。オーバーライド
CSS カスタム プロパティがレイヤー名前空間を使用している場合でも、引き続き `component.*` キーを使用します。

## ソースと生成された出力レイアウト

すべてのビジュアル コントラクトには、アトミック ソース ツリーの下に 1 人の所有者がいます。ジェネレーターは新しいファイルを再帰的に検出するため、
新しいソースには記述子の登録は必要ありません。

```text
packages/ui/tokens/tokens/component/<atomic-level>/<source>.tokens.json
  -> packages/ui/tokens/src/generated/scss/component/<atomic-level>/_<source>.scss
  -> packages/ui/tokens/src/generated/scss/component/<atomic-level>/_<source>-vars.scss
  -> packages/ui/tokens/src/generated/ts/component/<atomic-level>/<source>.ts
```

生成された SCSS および TypeScript バレルには、すべてのコンポーネント ソースが決定的なソース ID 順序で含まれます。コンポーネント
ファイルは、`button`、`field`、`input`、`navigation`、`overlay` などの共有コントラクトを再利用できます。構成されたコンポーネント
これらのトークン パスを複製してはなりません。動作のみのコンポーネント、継承のみのグリフ、レイアウト/DOM 式は残ります。
インベントリエントリによってビジュアル所有権が割り当てられない限り、ビジュアルトークンコントラクトの外にあります。

### セマンティックスロットと状態ボキャブラリー

| スロットファミリー                           | Figma の役割                                            | 典型的な状態                                                                           |
| -------------------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `background` / `surface` / `track` / `thumb` | フィルまたはコントロールサーフェス                      | `default`、`hover`、`active`、`disabled`、`loading`、`expanded`、`selected`、`invalid` |
| `text` / `label` / `helper-text`             | タイポグラフィの色または名前付きタイポグラフィ スタイル | `default`、`hover`、`disabled`、`selected`、`invalid`                                  |
| `border` / `focus-ring`                      | ストロークとキーボードの表示                            | `default`、`hover`、`focus-visible`、`active`、`disabled`、`selected`、`invalid`       |
| `padding` / `gap` / `radius` / `shadow`      | 幾何学と高さ                                            | デフォルトまたはサイズ固有                                                             |
| `opacity` / `transition`                     | ディエンファシスとモーション                            | `disabled`、`loading`、`hover`、`active`                                               |

コンポーネントによってサポートされる状態のみが以下にリストされています。 `expanded` はサーフェスの開示/選択に使用されます。`selected`
選択肢/タブ/ナビゲーションの場合は `invalid` 、フォームの検証の場合は未使用の状態変数は必要ありません。

## 在庫概要

リポジトリ インベントリは、次の狭いソース パスに基づいています。

```text
packages/*/src/components/**/*.tsx
packages/*/src/components/**/*.stories.tsx
packages/*/src/components/**/*.module.scss
```

| アーティファクト          | カウント | 意味                                                                                             |
| ------------------------- | -------: | ------------------------------------------------------------------------------------------------ |
| コンポーネント TSX ソース |      249 | ストーリー以外の Forge および電子メール コンポーネントのソース                                   |
| 同じ場所にあるストーリー  |      246 | 3 つの再帰的マークダウン/ツリー ヘルパー ソースには、意図的に独立したストーリーがありません。    |
| CSS モジュール            |      219 | ローカルビジュアルスタイルモジュール。インライン電子メールと継承された契約も文書化されています。 |
| パッケージ                |       20 | コンポーネント ソースを含むすべてのパッケージ                                                    |

監査後に生成されたサーフェスには **2,841 個のトークン リーフ** が含まれています。そのうち 132 個がアクティブ、2,161 個が保護され、548 個が曖昧です。
残った候補者はいない。クリーンアップにより、合計 189 個の到達不能なリーフが削除されました。つまり、
レビュー レポートと、エイリアス クロージャ後に公開される 4 つのネット 2 次パレット リーフ (6 つは削除され、2 つは到達可能な `.500` リーフとして復元) が公開されます。この削減は、生成される
プリミティブ、セマンティック、タイポグラフィー、および構造エクスポートのみ。保持された `component.*` パスとそのパス
`--mp-<layer>-*` の名前は変更されません。 3 つの未解決のエイリアス (`color.surface.raised`、`radius.2xs`、および
`font.weight.light`) はこの監査より前のものであり、変更されていません。

分類はパッケージごとではなくソースごとです。

- **Visual** — CSS モジュールまたはインライン ビジュアル出力を所有し、パッケージ テーブルに示されているコントラクトにマップします。
- **Inherited-visual** — 独立したスタイルのホストをレンダリングしません。その外観は、子、親、`currentColor`、
  サードパーティのホスト/キャンバス、または構成されたコンポーネントのコントラクト。
- **動作のみ** — レンダリングまたはビューポートの動作を制御し、独自の視覚的な決定は行いません。

以下の各箇条書きは 1 つのインベントリ エントリです。ストーリーが `story: missing` とマークされていない限り、コンポーネントには一致するものがあります。
ソースの横にある `<component>.stories.tsx`。パッケージ/レベルの見出しは、安定したソース パスのプレフィックスを提供します。

## `@mission-platform/components`

### 原子 — `packages/ui/components/src/components/atoms/`

| コンポーネント           | 分類       | 契約                                            | 外観の小道具/状態                                                                                  |
| ------------------------ | ---------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `forge-avatar`           | ビジュアル | `component.media`                               | `src`、`initials`、`size`、`shape`、`status`、`variant`;デフォルト/無効ステータスの色              |
| `forge-background-video` | ビジュアル | `component.media`                               | ソース、自動再生/ミュート/ループ。デフォルト/オーバーレイ                                          |
| `forge-badge`            | ビジュアル | `component.feedback`                            | `variant`、`size`;デフォルト/無効                                                                  |
| `forge-button`           | ビジュアル | `component.button.<variant>`                    | `variant`、`size`、`padding`、`margin`;デフォルト/ホバー/アクティブ/フォーカス表示/無効/読み込み中 |
| `forge-icon-button`      | ビジュアル | `component.button.<variant>` + `component.icon` | ラベル、`variant`、`size`;デフォルト/ホバー/アクティブ/フォーカス表示/無効/読み込み中              |
| `forge-progress-bar`     | ビジュアル | `component.feedback`                            | 値、バリアント;デフォルト/ロード中/無効                                                            |
| `forge-quote`            | ビジュアル | `component.typography` + `component.surface`    | 引用、異形。デフォルト                                                                             |
| `forge-responsive-image` | ビジュアル | `component.media`                               | ソース、アスペクト/フィット;デフォルト/プレースホルダー                                            |
| `forge-responsive-video` | ビジュアル | `component.media`                               | ソース、コントロール/自動再生;デフォルト/オーバーレイ                                              |
| `forge-separator`        | ビジュアル | `component.surface`                             | 方向性。デフォルト                                                                                 |
| `forge-skeleton`         | ビジュアル | `component.feedback`                            | 形状/サイズ。読み込み中                                                                            |
| `forge-spinner`          | ビジュアル | `component.feedback`                            | サイズ、バリエーション。読み込み中                                                                 |
| `forge-stack`            | ビジュアル | `component.layout`                              | 方向、`gap`、位置合わせ;デフォルト                                                                 |
| `forge-status-icon`      | ビジュアル | `component.feedback.<status>`                   | ステータス、サイズ。デフォルト/無効                                                                |
| `forge-tag`              | ビジュアル | `component.feedback`                            | バリエーション、サイズ、取り外し可能。デフォルト/ホバー/無効                                       |
| `forge-theme-toggle`     | ビジュアル | `component.button` + `component.icon`           | テーマ、サイズ。デフォルト/ホバー/アクティブ/選択済み                                              |
| `forge-typography`       | ビジュアル | `component.typography`                          | `as`、タイポグラフィーバリアント、カラー。デフォルト/リンク/無効                                   |

### 分子 — `packages/ui/components/src/components/molecules/`

| コンポーネント            | 分類                 | 契約                                         | 外観の小道具/状態                                                                             |
| ------------------------- | -------------------- | -------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `forge-accordion`         | ビジュアル           | `component.surface` + `component.navigation` | 項目、展開済み。デフォルト/ホバー/フォーカス表示/展開/無効                                    |
| `forge-alert-banner`      | ビジュアル           | `component.feedback` + `component.overlay`   | ステータス、解雇可能。デフォルト/ホバー/フォーカス表示                                        |
| `forge-breadcrumb`        | ビジュアル           | `component.navigation`                       | アイテム。デフォルト/ホバー/選択/フォーカス表示                                               |
| `forge-button-group`      | ビジュアル           | `component.button-group`                     | 方向、付属、バリアント、ギャップ;デフォルト/フォーカス表示/無効                               |
| `forge-card`              | ビジュアル           | `component.surface`                          | バリアント、パディング;デフォルト/ホバー/選択済み                                             |
| `forge-chat-bubble`       | ビジュアル           | `component.media` + `component.surface`      | 著者、方向性/ステータス。デフォルト/選択済み                                                  |
| `forge-collapse`          | ビジュアル           | `component.collapse`                         | オープン、バリアント、無効。デフォルト/ホバー/フォーカス表示/展開/無効                        |
| `forge-device-mock`       | ビジュアル           | `component.media.device`                     | デバイス、方向、サイズ。デフォルト                                                            |
| `forge-dropdown`          | ビジュアル           | `component.overlay` + `component.navigation` | オープン、配置;デフォルト/展開/フォーカス表示                                                 |
| `forge-grid`              | ビジュアル           | `component.layout.grid`                      | 列、ギャップ、パディング;デフォルト                                                           |
| `forge-in-view`           | ビジュアル           | `component.layout`                           | しきい値;継承された子契約                                                                     |
| `forge-language-switcher` | 継承されたビジュアル | `component.navigation` + 子選択契約          | ロケール;デフォルト/展開/選択済み                                                             |
| `forge-list`              | ビジュアル           | `component.surface`                          | バリアント、ギャップ;デフォルト/選択済み                                                      |
| `forge-masonry`           | ビジュアル           | `component.layout.masonry`                   | 列、ギャップ、パディング;デフォルト                                                           |
| `forge-menu-item`         | ビジュアル           | `component.navigation`                       | アクティブ/無効。デフォルト/ホバー/フォーカス表示/選択/無効                                   |
| `forge-menu`              | ビジュアル           | `component.navigation`                       | 開いた/方向;デフォルト/拡張                                                                   |
| `forge-navbar-item`       | ビジュアル           | `component.navigation.navbar-item`           | アクティブ、ドロップダウン、バリアント、無効。デフォルト/ホバー/フォーカス表示/選択/展開/無効 |
| `forge-pagination`        | ビジュアル           | `component.navigation`                       | ページ、サイズ。デフォルト/ホバー/フォーカス表示/選択/無効                                    |
| `forge-popover`           | ビジュアル           | `component.overlay`                          | オープン、配置;デフォルト/展開/フォーカス表示                                                 |
| `forge-tabs`              | ビジュアル           | `component.navigation`                       | 向き、アクティブなタブ。デフォルト/ホバー/フォーカス表示/選択/無効                            |
| `forge-timeline`          | ビジュアル           | `component.timeline`                         | ステータス、向き、輪郭付きマーカー。デフォルト/選択済み                                       |
| `forge-toast`             | ビジュアル           | `component.overlay` + `component.feedback`   | ステータス、期間。デフォルト/ロード中                                                         |
| `forge-tooltip`           | ビジュアル           | `component.overlay`                          | オープン、配置;デフォルト/拡張                                                                |
| `forge-window-popout`     | ビジュアル           | `component.overlay.window-popout`            | オープン、サイズ。デフォルト/ホバー/フォーカス表示/選択済み                                   |

### 生物とテンプレート — `packages/ui/components/src/components/{organisms,templates}/`

| コンポーネント             | 分類                 | 契約                                                    | 外観の小道具/状態                                                                                                          |
| -------------------------- | -------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `forge-carousel`           | ビジュアル           | `component.navigation.carousel`                         | スライド、コントロール、自動再生、トーン。デフォルト/ホバー/フォーカス表示/選択/無効                                       |
| `forge-chat-area`          | ビジュアル           | `component.media.chat-area`                             | サイズ、ヘッダー/フッター スロット、自動スクロール。デフォルト/ロード中                                                    |
| `forge-dialog`             | ビジュアル           | `component.overlay`                                     | オープン、タイトル/フッター。デフォルト/展開/フォーカス表示                                                                |
| `forge-drawer`             | ビジュアル           | `component.overlay.drawer`                              | 開く、配置/サイズ、サイズ変更;デフォルト/ホバー/アクティブ/展開                                                            |
| `forge-menubar`            | ビジュアル           | `component.navigation.menubar`                          | 項目、境界線付き、サイズ;デフォルト/ホバー/フォーカス表示/展開/無効                                                        |
| `forge-modal`              | ビジュアル           | `component.overlay`                                     | オープン、サイズ、ヘッダー/フッター。デフォルト/展開/フォーカス表示                                                        |
| `forge-navbar`             | ビジュアル           | `component.navigation.navbar`                           | アイテム、レスポンシブモード。デフォルト/ホバー/フォーカス表示/選択済み                                                    |
| `forge-table`              | ビジュアル           | `component.data.table`                                  | 列、サイズ、キャプション、ストライプ/ボーダー/ホバリング可能、トーン、読み込み;デフォルト/ホバー/フォーカス表示/読み込み中 |
| `forge-theme-composer`     | ビジュアル           | `component.surface` + `component.field`                 | テーマの価値観。デフォルト/無効                                                                                            |
| `forge-theme-provider`     | ビジュアル           | `component.layout`                                      | テーマモード。デフォルト/明るい/暗い                                                                                       |
| `forge-toast-container`    | ビジュアル           | `component.overlay`                                     | 配置;デフォルト/ロード中                                                                                                   |
| `forge-tree-view-item`     | 継承されたビジュアル | `component.navigation` + `component.surface`            | 展開、選択、無効化。デフォルト/ホバー/フォーカス表示/展開/選択/無効                                                        |
| `forge-tree-view`          | ビジュアル           | `component.data.tree`                                   | ノード、サイズ、defaultOpen、ラベル レンダラー。デフォルト/ホバー/フォーカス表示/展開/選択                                 |
| `forge-virtual-list`       | ビジュアル           | `component.data.virtual-list`                           | アイテム、サイズ、アイテムの高さ、高さ、オーバースキャン、行レンダラー。デフォルト/選択済み                                |
| `forge-virtual-log-viewer` | ビジュアル           | `component.code.virtual-log-viewer`                     | レベル/フィルター、列、フォローテール;デフォルト/ホバー/フォーカス表示/警告/エラー/致命的                                  |
| `forge-virtual-table`      | ビジュアル           | `component.data.virtual-table` + `component.data.table` | 列、サイズ、行の高さ、高さ、オーバースキャン、ストライプ/ボーダー、ソート;デフォルト/ホバー/フォーカス表示                 |
| `forge-virtual-tabs`       | ビジュアル           | `component.navigation.tabs`                             | バリアント、アクティブなタブ、閉じる/追加可能。デフォルト/ホバー/フォーカス表示/選択/無効                                  |
| `forge-virtual-tree-view`  | ビジュアル           | `component.data.virtual-tree`                           | ノード、サイズ、itemHeight、高さ、オーバースキャン、defaultOpen、行レンダラー。デフォルト/ホバー/フォーカス表示/展開       |
| `forge-hero`               | ビジュアル           | `component.layout.hero`                                 | メディア、配置、サイズ、オーバーレイ。デフォルト                                                                           |

## 特化した Forge パッケージ

| パッケージ/レベル        | コンポーネント                 | 分類                 | 契約                                                   | 外観の小道具/状態                                                           |
| ------------------------ | ------------------------------ | -------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------- |
| `barcode/molecules`      | `forge-barcode`                | ビジュアル           | `component.code.barcode`                               | 値、形式、サイズ。デフォルト/ロード中/無効                                  |
| `breakpoints/atoms`      | `forge-hide-at`                | 動作のみ             | なし                                                   | `min`、`max`;ビューポートの可視性のみ                                       |
| `breakpoints/atoms`      | `forge-show-at`                | 動作のみ             | なし                                                   | `min`、`max`;ビューポートの可視性のみ                                       |
| `breakpoints/molecules`  | `forge-breakpoint-debug`       | ビジュアル           | `component.debug.breakpoint`                           | ブレークポイントの表示;デフォルト                                           |
| `code-scanner/organisms` | `forge-code-scanner`           | ビジュアル           | `component.code.scanner`                               | カメラ/フォーマット、スキャン;デフォルト/ロード中/無効                      |
| `content/atoms`          | `forge-code-block`             | ビジュアル           | `component.code`                                       | 言語、コピー。デフォルト/選択済み                                           |
| `content/atoms`          | `forge-mermaid`                | ビジュアル           | `component.code`                                       | 図のソース、読み込み/エラー。デフォルト/ロード中/無効                       |
| `content/atoms`          | `forge-wysiwyg-toolbar-button` | ビジュアル           | `component.button` + `component.icon`                  | コマンド、アクティブ。デフォルト/ホバー/アクティブ/フォーカス表示/無効/選択 |
| `content/molecules`      | `forge-markdown`               | ビジュアル           | `component.typography` + `component.code`              | サイズ、リンク。デフォルト/無効                                             |
| `content/molecules`      | `markdown-block`               | 継承されたビジュアル | `component.typography` + 子契約                        | トークン、サイズ;継承された                                                 |
| `content/molecules`      | `markdown-inline`              | 継承されたビジュアル | `component.typography`                                 | トークン、リンク。継承/ホバー/選択                                          |
| `content/molecules`      | `forge-wysiwyg-block-controls` | ビジュアル           | `component.editor.block-controls` + `component.button` | ブロック選択。デフォルト/ホバー/フォーカス表示/選択済み                     |
| `content/molecules`      | `forge-wysiwyg-block-menu`     | ビジュアル           | `component.editor.block-menu` + `component.overlay`    | 開ける;デフォルト/展開/選択済み                                             |
| `content/molecules`      | `forge-wysiwyg-status-bar`     | ビジュアル           | `component.editor.status-bar`                          | 状態;デフォルト/無効/読み込み中                                             |
| `content/molecules`      | `forge-wysiwyg-toolbar`        | ビジュアル           | `component.editor.toolbar` + `component.button`        | コマンド。デフォルト/無効                                                   |
| `content/organisms`      | `forge-monaco-editor`          | ビジュアル           | `component.editor.monaco` + `component.code`           | 言語、読み取り専用。デフォルト/無効/無効                                    |
| `content/organisms`      | `forge-wysiwyg-editor`         | ビジュアル           | `component.editor.wysiwyg` + `component.code`          | 編集可能、無効。デフォルト/フォーカス表示/無効/無効                         |
| `float/molecules`        | `forge-alert-banner`           | ビジュアル           | `component.feedback` + `component.overlay`             | ステータス、解雇可能。デフォルト/フォーカス可視                             |
| `float/molecules`        | `forge-dropdown`               | ビジュアル           | `component.overlay` + `component.navigation`           | 開ける;デフォルト/展開/選択済み                                             |
| `float/molecules`        | `forge-popover`                | ビジュアル           | `component.overlay`                                    | 開ける;デフォルト/拡張                                                      |
| `float/molecules`        | `forge-toast`                  | ビジュアル           | `component.overlay` + `component.feedback`             | 状態;デフォルト/ロード中                                                    |
| `float/molecules`        | `forge-tooltip`                | ビジュアル           | `component.overlay`                                    | 開ける;デフォルト/拡張                                                      |
| `float/organisms`        | `forge-dialog`                 | ビジュアル           | `component.overlay`                                    | オープン、タイトル/フッター。デフォルト/展開/フォーカス表示                 |
| `float/organisms`        | `forge-modal`                  | ビジュアル           | `component.overlay`                                    | オープン、サイズ、ヘッダー/フッター。デフォルト/展開/フォーカス表示         |
| `float/organisms`        | `forge-toast-container`        | ビジュアル           | `component.overlay`                                    | 配置;デフォルト/ロード中                                                    |

### フォーム — `packages/ui/forms/src/components/`

すべてのフォーム エントリは、以下のコントラクトに加えて、共有 `component.field` ラベル/ヘルパー/エラー ロールを使用します。ネイティブ
コントロールの状態は、コントロールがサポートする場合にのみ表現されます。

| レベル | コンポーネント (カンマ区切りの名前ごとに 1 つのエントリ)                                                                                                                                                                                                                                                                                                                   | 分類・契約                                                                                                                            | 共有の外観プロパティと状態                                                                                        |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 原子   | `forge-checkbox`、`forge-input`、`forge-radio`、`forge-range-input`、`forge-rating`、`forge-slider`、`forge-switch`、`forge-textarea`                                                                                                                                                                                                                                      | ビジュアル / `component.checkable` チェックボックス/ラジオ/評価/スライダー/スイッチ; `component.input` 入力/範囲入力/テキストエリア用 | `size`、ラベル/値の小道具。サポートされている場合は、default/hover/active/focus-visible/disabled/invalid/selected |
| 分子   | `forge-calendar`、`forge-color-input`、`forge-date-input`、`forge-date-range-input`、`forge-field-set`、`forge-file-input`、`forge-location-input`、`forge-multiselect`、`forge-number-stepper`、`forge-otp-input`、`forge-phone-input`、 `forge-radio-group`、`forge-search-input`、`forge-segment-control`、`forge-select`、`forge-time-input`、`forge-time-range-input` | Visual / 合成コントロールに応じて `component.input`、`component.select`、`component.checkable`、または `component.field`              | `size`、`disabled`、検証および選択の小道具。デフォルト/フォーカス表示/無効/展開/選択/無効                         |
| 生物   | `forge-date-time-range-input`、`forge-form-builder`、`forge-form-wizard`、`forge-schema-form-dialog`、`forge-schema-form`                                                                                                                                                                                                                                                  | ビジュアル / `component.field` + 合成された入力/選択/オーバーレイ コントラクト                                                        | スキーマ、ステップ、検証。デフォルト/フォーカス表示/無効/展開/選択/無効                                           |

### アイコン — `packages/ui/icons/src/components/`

106 個のアイコン エントリはすべて **inherited-visual** です。グリフは `currentColor` を使用します。サイズはコンシューマーによって制御されるか、マップされます。
`component.icon.size`。グリフごとの変数は受け取りません。それぞれに同じ場所にあるストーリーがあり、同じ内容に従います
親がその状態を公開するデフォルト/選択/無効の色の役割。

| アイコンカテゴリ              | コンポーネント                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| コミュニケーション/メッセージ | `forge-icon-bell`、`forge-icon-chat`、`forge-icon-mail`、`forge-icon-phone`、`forge-icon-send`                                                                                                                                                                                                                                                                                                                                                                                                                                |
| コミュニケーション/共有       | `forge-icon-share`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 内容・編集                    | `forge-icon-copy`、`forge-icon-edit`、`forge-icon-eye`、`forge-icon-eye-off`、`forge-icon-redo`、`forge-icon-trash`、`forge-icon-undo`                                                                                                                                                                                                                                                                                                                                                                                        |
| コンテンツ/ファイル           | `forge-icon-download`、`forge-icon-upload`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| データ/フィルタリング         | `forge-icon-filter`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| データ/テーブル               | `forge-icon-sort`、`forge-icon-table`、`forge-icon-table-column-add`、`forge-icon-table-column-remove`、`forge-icon-table-row-add`、`forge-icon-table-row-remove`                                                                                                                                                                                                                                                                                                                                                             |
| 描画/変換                     | `forge-icon-draw-circle`、`forge-icon-draw-line`、`forge-icon-draw-polygon`、`forge-icon-draw-square`、`forge-icon-draw-triangle`、`forge-icon-move`、`forge-icon-palette`、`forge-icon-pencil`、`forge-icon-rotate-ccw`、`forge-icon-rotate-cw`、`forge-icon-scale-down`、 `forge-icon-scale-up`                                                                                                                                                                                                                             |
| 地図/国                       | `forge-icon-country-globe`、`forge-icon-flag`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 地図/地理                     | `forge-icon-geodesic`、`forge-icon-globe`、`forge-icon-language`、`forge-icon-map-pin`                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| マップ/レイヤー               | `forge-icon-layer`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| マップ/マーカー               | `forge-icon-map-marker-cluster`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| メディア/キャプチャ           | `forge-icon-camera`、`forge-icon-image`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| メディア/再生                 | `forge-icon-pause`、`forge-icon-play`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ナビゲーション/コントロール   | `forge-icon-arrow`、`forge-icon-chevron`、`forge-icon-chevrons`、`forge-icon-close`、`forge-icon-home`、`forge-icon-join`、`forge-icon-menu`、`forge-icon-minus`、`forge-icon-plus`、`forge-icon-refresh`、`forge-icon-split`                                                                                                                                                                                                                                                                                                 |
| ナビゲーション/リンク         | `forge-icon-external-link`、`forge-icon-link`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ナビゲーション/検索           | `forge-icon-search`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| オブジェクト/システム         | `forge-icon-cloud`、`forge-icon-debug`、`forge-icon-heart`、`forge-icon-lightning`、`forge-icon-puzzle`、`forge-icon-qr-code`、`forge-icon-settings`、`forge-icon-star`、`forge-icon-wrench`                                                                                                                                                                                                                                                                                                                                  |
| ルート/道順                   | `forge-icon-route`、`forge-icon-waypoint`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| セキュリティ/アクセス         | `forge-icon-lock`、`forge-icon-lock-open`、`forge-icon-user`                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ステータス/フィードバック     | `forge-icon-alert`、`forge-icon-alert-critical`、`forge-icon-alert-info`、`forge-icon-alert-neutral`、`forge-icon-alert-warning`、`forge-icon-check`、`forge-icon-error`、`forge-icon-info`、`forge-icon-notice`、`forge-icon-warning`                                                                                                                                                                                                                                                                                        |
| テキスト/書式設定             | `forge-icon-align-center`、`forge-icon-align-justify`、`forge-icon-align-left`、`forge-icon-align-right`、`forge-icon-blockquote`、`forge-icon-bold`、`forge-icon-bullet-list`、`forge-icon-code-block`、`forge-icon-code-inline`、`forge-icon-heading`、`forge-icon-heading-five`、 `forge-icon-heading-four`、`forge-icon-heading-one`、`forge-icon-heading-six`、`forge-icon-heading-three`、`forge-icon-heading-two`、`forge-icon-italic`、`forge-icon-numbered-list`、`forge-icon-strikethrough`、`forge-icon-underline` |
| 時間/カレンダー               | `forge-icon-calendar`、`forge-icon-clock`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |

### その他のビジュアルパッケージ

| パッケージ/レベル            | コンポーネント                                                                                                                                     | 分類                 | 契約                                                         | 外観の小道具/状態                                                                                                  |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `layout/atoms`               | `forge-container`                                                                                                                                  | ビジュアル           | `component.layout`                                           | 最大幅、パディング;デフォルト                                                                                      |
| `layout/templates`           | `forge-application-layout`、`forge-bento-layout`、`forge-f-pattern-layout`、`forge-grid-layout`、`forge-vertical-layout`、`forge-z-pattern-layout` | ビジュアル           | `component.layout`                                           | レイアウト構成とギャップ。デフォルト                                                                               |
| `map/molecules`              | `forge-map-draw`、`forge-map-layer`、`forge-map-marker`、`forge-map-popup`、`forge-map-source`                                                     | 継承されたビジュアル | `component.map`                                              | マップ ソース/レイヤー/マーカー/ポップアップ オプション。ポップアップデフォルト/フォーカス可視、その他はホスト継承 |
| `map/organisms`              | `forge-map-libre`                                                                                                                                  | ビジュアル           | `component.map`                                              | コントロール、スタイル、ポップアップ;デフォルト/ロード中/選択済み                                                  |
| `matrix-code/molecules`      | `forge-matrix-code`                                                                                                                                | ビジュアル           | `component.code`                                             | 値、サイズ。デフォルト/無効/読み込み中                                                                             |
| `qr-code/molecules`          | `forge-qr-code`                                                                                                                                    | ビジュアル           | `component.code`                                             | 値、サイズ。デフォルト/無効/読み込み中                                                                             |
| `resource-planner/organisms` | `forge-resource-planner`                                                                                                                           | ビジュアル           | `component.resource-planner`                                 | リソース、範囲、選択;デフォルト/ホバー/選択/フォーカス表示/競合/利用不可                                           |
| `scheduler/organisms`        | `forge-scheduler`                                                                                                                                  | ビジュアル           | `component.scheduler`                                        | 範囲、イベント、選択;デフォルト/フォーカス表示/今日/屋外/忙しい                                                    |
| `select/atoms`               | `forge-tag`                                                                                                                                        | ビジュアル           | `component.feedback`                                         | バリエーション、サイズ、取り外し可能。デフォルト/ホバー/無効                                                       |
| `select/molecules`           | `forge-language-switcher`                                                                                                                          | 継承されたビジュアル | `component.select` + `component.navigation`                  | ロケール;デフォルト/展開/選択済み                                                                                  |
| `select/molecules`           | `forge-multiselect`、`forge-select`                                                                                                                | ビジュアル           | `component.select` + `component.input` + `component.field`   | サイズ、オプション、モデル、検証。デフォルト/ホバー/フォーカス表示/無効/展開/選択/無効                             |
| `theme/atoms`                | `forge-theme-toggle`                                                                                                                               | ビジュアル           | `component.button` + `component.icon`                        | モード;デフォルト/ホバー/アクティブ/選択済み                                                                       |
| `theme/organisms`            | `forge-theme-composer`、`forge-theme-provider`                                                                                                     | ビジュアル           | `component.surface` + `component.field` / `component.layout` | テーマの値/モード。デフォルト/明るい/暗い/無効                                                                     |
| `three/organisms`            | `forge-three-canvas`                                                                                                                               | 継承されたビジュアル | `component.media`                                            | キャンバスホストの寸法は構造的なものです。継承されたサーフェス                                                     |
| `typography/atoms`           | `forge-typography`                                                                                                                                 | ビジュアル           | `component.typography`                                       | バリアント、カラー、`as`;デフォルト/リンク/無効                                                                    |
| `vcard`                      | `forge-icalendar`                                                                                                                                  | 動作のみ             | なし                                                         | カレンダーデータをシリアル化します。ビジュアルホストがありません                                                   |
| `vcard`                      | `forge-vcard`                                                                                                                                      | 動作のみ             | なし                                                         | 連絡先データをシリアル化します。ビジュアルホストがありません                                                       |

## 電子メールのコンポーネント

`@mission-platform/email-components` は、TSX ソースが Forge で作成されているため含まれています。電子メールクライアントはそうではありません
実行時カスタム プロパティを消費します。レンダラーは同じセマンティック ロールをインライン値に解決します。以下のすべてのエントリ
視覚的であり、`component.email` を使用し、記載されている場合は `component.button`、`component.typography`、または `component.media` を使用します。

| レベル       | コンポーネント                                                                | 契約                                                                                                                                                                                      |
| ------------ | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 原子         | `email-button`                                                                | `component.email` + `component.button.<variant>`;バリアント: ニュートラル/プライマリ/セカンダリ/ターシャリ/成功/警告/情報/エラー/クリティカル/ゴースト。デフォルト/ホバー/アクティブ/無効 |
| 原子         | `email-divider`、`email-image`、`email-spacer`、`email-typography`            | `component.email` + `component.surface`/`component.media`/`component.typography`;デフォルト                                                                                               |
| 分子         | `email-card`、`email-column`、`email-list`、`email-row`、`email-social-links` | `component.email`;リンクが対話型であるデフォルト/選択済み                                                                                                                                 |
| 生物         | `email-footer`、`email-header`、`email-preheader`                             | `component.email` + `component.typography`;デフォルト                                                                                                                                     |
| テンプレート | `email-container`、`email-document`、`email-section`                          | `component.email`;デフォルト/ライト/ダークソースモード                                                                                                                                    |

## ストーリーとオーバーライドの対象範囲

249 のコンポーネント ソースに対して 246 の同じ場所に配置されたストーリーがあります。独立したストーリーのない唯一の情報源は、
再帰ヘルパー `components/organisms/forge-tree-view/forge-tree-view-item`、
`content/molecules/forge-markdown/markdown-block`、および `content/molecules/forge-markdown/markdown-inline`。彼らの
視覚的な状態は親ストーリーによって実行され、上では継承された視覚として文書化されています。

共有ストーリーブックのプレビューが読み込まれます `@mission-platform/tokens/scss/tokens`、Storybook オーバーライド プラグイン、および
`theme` グローバル。コントラクトを検査するには、テーマ グローバルを明るいまたは暗いに設定し、コンポーネント ストーリーのコントロールを使用します。
コンシューマのオーバーライドをテストするには、編集します `apps/storybook/design-tokens/overrides.tokens.json` 下 `component` を使用して
`{ "light": "...", "dark": "..." }` 価値。オーバーライドスキーマは
[`packages/tooling/vite/token-overrides/schema/token-overrides.schema.json`](../../../../../../packages/tooling/vite/token-overrides/schema/token-overrides.schema.json).

次のリーフは意図的にコンポーネント スコープになっており、個々のコンポーネント ホストでオーバーライドすることもできます。
生成された CSS カスタム プロパティを使用します。構成されたコンポーネントのフォールバック値は、ホストが
オーバーライドを定義しません。

| コンポーネント       | DTCG オーバーライド パス                           | 生成された CSS 変数パターン                            |
| -------------------- | -------------------------------------------------- | ------------------------------------------------------ |
| `forge-avatar`       | `component.media.avatar.size.<size>`               | `--mp-media-avatar-size-<size>`                        |
| `forge-avatar`       | `component.media.avatar.status-size.<size>`        | `--mp-media-avatar-status-size-<size>`                 |
| `forge-avatar`       | `component.media.avatar.status-border-width`       | `--mp-media-avatar-status-border-width`                |
| `forge-progress-bar` | `component.feedback.progress.size.<size>`          | `--mp-feedback-progress-size-<size>`                   |
| `forge-progress-bar` | `component.feedback.progress.indeterminate-*`      | `--mp-feedback-progress-indeterminate-duration/easing` |
| `forge-spinner`      | `component.feedback.spinner.border-width.<size>`   | `--mp-feedback-spinner-border-width-<size>`            |
| `forge-spinner`      | `component.feedback.spinner.animation-*`           | `--mp-feedback-spinner-animation-duration/easing`      |
| `forge-button`       | `component.button.spinner.animation-*`             | `--mp-button-spinner-animation-duration/easing`        |
| `forge-timeline`     | `component.timeline.marker.size/gutter/line.width` | `--mp-timeline-marker-size/gutter/line-width`          |

## Figma 引き継ぎチェックリスト

1. ライト モードとダーク モードで `Mission Platform / Component` 変数コレクションを作成します。
2. `component/<atomic-level>/` ソース ツリーからコンポーネント パスをインポートし、コンポーネント、バリアント、スロット、
   および状態セグメント。
3. 未加工のカラー値やスケール値をコピーするのではなく、コンポーネント変数を対応するプリミティブ/セマンティック変数にバインドします。
4. 文書化されたバリアントとサイズのコンポーネント プロパティを作成します。インベントリにリストされている状態に対してのみ状態バリアントを作成します。
5. レイアウト式、ビューポートのブレークポイント、キャンバスの動作、および DOM/アクセシビリティの動作をビジュアル変数コレクションの外に保ちます。
