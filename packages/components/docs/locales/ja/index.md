# @mission-platform/components

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> packages/components/docs/index.md: [packages/components/docs/index.md](../../index.md)
> 言語: 日本語 (ja)

`@mission-platform/components` は、Mission Platform 用の残りの追記型コンポーネント ライブラリです。すべてのコンポーネント
このライブラリは、フレームワーク中立の JSX 方言 (`@mission-platform/forge` 経由) を使用して一度作成され、次にコンパイルされます。
ネイティブ **Vue 3**、**React**、**Svelte**、**Solid**、および **Web コンポーネント** 出力へのビルド時間がかかります。

`ForgeTypography` は、専用の `@mission-platform/typography` パッケージによって所有されています。むしろそのパッケージからインポートしてください
`@mission-platform/components`より。

## アーキテクチャ: 「一度書けばどこでも実行できる」

このパッケージは、高効率のクロスフレームワーク アーキテクチャを示しています。

- **ニュートラル ソース**: コンポーネントは、`@mission-platform/forge` を使用して `.tsx` ファイルに書き込まれます。
- **2 段階コンパイル**: `@mission-platform/vite-plugin-forge` を使用して、ニュートラル ソースは次のように変換されます。
  フレームワーク固有のソース コード (Vue SFC および React TSX) を作成し、それぞれのネイティブ ツールチェーンによってコンパイルします。
- **ランタイム オーバーヘッドゼロ**: ランタイム アダプターはありません。消費者は、ネイティブコンポーネントをベアコンポーネントとともにインポートします。
  `@mission-platform/components` 指定子;フレームワークは `mp:<framework>` エクスポートを通じて **1 回**選択されます
  条件 — `resolve.conditions` (`defineFrameworkAppConfig` / `frameworkResolveConditions` を参照)
  `@mission-platform/vite-config`) および `customConditions` (
  `@mission-platform/typescript-config/framework-<name>` プリセット)。
- **Storyblok 統合**: ビルド プロセスでは、Storyblok ブロック構成とラッパーも生成され、
  これらと同じコンポーネントを使用した CMS 駆動のレイアウト。

## ユニバーサルサイズスケール

ライブラリ内のすべてのコンポーネントは、正規の T シャツ スケールに従う `size` プロップをサポートしています。これにより一貫性が保証されます
すべての UI 要素にわたるスケーリング。

|値 |ラベル |
| :---- | :---------------- |
| `2xs` |極極小 |
| `xs` |極小 |
| `sm` |小 |
| `md` |中 (デフォルト) |
| `lg` |大 |
| `xl` |特大 |
| `2xl` |特大 |

ほとんどのコンポーネントは、デザイン トークンに基づいて `font-size` を調整する共有サイジング ユーティリティを適用します。若干のコンプレックス
コンポーネント (`ForgeButton` や `ForgeHero` など) には、パディング、マージン、レイアウト用のサイズごとのカスタム スタイルがあります。

## コンポーネントカタログ

### レイアウトと構造

ページ上にコンテンツを配置するためのプリミティブ。

|コンポーネント |説明 |主要な小道具 |
| :--------------- | :-------------------------------------------------------- | :--------------------------------------------------- |
| `ForgeStack` |ギャップを構成可能なフレックスボックス スタック (行/列)。         | `direction`、`gap` (`2xs-2xl`)、`justify`、`align` |
| `ForgeGrid` | CSS グリッド レイアウト プリミティブ。                                | `rows`、`cols`、`gap`、`justify`、`align` |
| `ForgeSeparator` |オプションのラベル付きの視覚的な仕切り (水平/垂直)。 | `orientation`、`variant` (`solid`/`dashed`/`dotted`) |
| `ForgeMasonry` |複数の柱の石積みのレイアウト。                              | `columns`、`minColumnWidth`、`gap` |

### アプリケーションシェルとナビゲーション

アプリの構造とルーティングのための高レベルのコンポーネント。

|コンポーネント |説明 |主要な小道具 |
| :--------------------------- | :----------------------------------------------------------- | :---------------------------------------------- |
| `ForgeNavbar` |ブランドとハンバーガー メニューを備えたレスポンシブなトップ ナビゲーション バー。 | `brand`、`sticky`、`mobileTitle` |
| `ForgeDrawer` |スライドパネル (固定またはインライン応答)。                  | `open`、`placement`、`size`、`inlineBreakpoint` |
| `ForgePagination` |制御されたページ ナビゲーション コントロール。                          | `modelValue`、`pageCount`/`total`、`pageSize` |
| `ForgeTabs` |移動タブインデックスとパネルを備えた ARIA タブリスト。                | `tabs`、`modelValue`、`variant` (`line`/`pill`) |
| `ForgeMenu` / `ForgeMenubar` |アクセス可能な再帰メニュー/サブメニュー付きのメニューバー。            | `items`、`orientation`、`ariaLabel` |
| `ForgeBreadcrumb` |リンクの階層的な軌跡。                                 | `items`、`separator` |

### タイポグラフィーとコンテンツ

テキストスタイルとセマンティックコンテンツブロック。

|コンポーネント |説明 |主要な小道具 |
| :----------- | :--------------------------------------------------------------- | :-------------------------------------- |
| `ForgeHero` |タイトル、サブタイトル、メディアの背景、アクションを含むページ バナー。 | `title`、`subtitle`、`media`、`actions` |
| `ForgeQuote` |帰属を伴うセマンティックなブロック引用。                            | `variant`、`tone`、`author`、`source` |
| `ForgeList` |一般的なリスト (順序付き/順序なし/説明)。                    | `items`、`variant`、`tone`、`divided` |

### フォームと入力

データ入力用のインタラクティブな要素。

|コンポーネント |説明 |主要な小道具 |
| :--------------------------------------- | :--------------------------------------------------- | :------------------------------------------- |
| `ForgeButton` |バリアントと読み込み状態を含む基本的なボタン。 | `variant`、`size`、`loading`、`disabled` |
| `ForgeIconButton` |コンパクトなアイコン専用ボタン。                            | `label` (必須)、`variant`、`size` |
| `ForgeInput` / `ForgeTextarea` |ラベル、ヒント、エラー状態を含むテキスト フィールド。      | `modelValue`、`type`、`placeholder`、`label` |
| `ForgeCheckbox` / `ForgeRadio` |ブール値またはグループ選択入力。                   | `modelValue`、`value`、`label` |
| `ForgeSwitch` |ブール設定の切り替えスイッチ。                  | `modelValue`、`label`、`size` |
| `ForgeNumberStepper` |増加/減少ボタンで数値を入力します。       | `modelValue`、`min`/`max`、`precision` |
| `ForgeSlider` / `ForgeRangeInput` |シングルまたはデュアルサム範囲セレクター。                | `modelValue`、`min`/`max`、`step` |
| `ForgeDateInput` / `ForgeDateRangeInput` |ポップオーバーカレンダーを備えた日付および日付範囲ピッカー。  | `modelValue`、`min`/`max`、`size` |
| `ForgeColorInput` | 16 進テキストフィールドを備えたカラーピッカー。                   | `modelValue`、`size`、`label` |

### データの表示と仮想化

大規模なデータセットを効率的に処理するためのコンポーネント。

|コンポーネント |説明 |主要な小道具 |
| :--------------------- | :---------------------------------------------------------- | :-------------------------------------------- |
| `ForgeTable` |ロード状態と空の状態を含むソート可能なデータ テーブル。          | `columns`、`rows`、`onSort`、`loading` |
| `ForgeVirtualList` |大きな配列のウィンドウ リスト (表示されている行のみをレンダリングします)。 | `items`、`itemHeight`、`height` |
| `ForgeVirtualTable` |スティッキーヘッダーを備えた仮想化されたソート可能なテーブル。              | `columns`、`rows`、`rowHeight`、`onSort` |
| `ForgeVirtualTreeView` |展開/折りたたみロジックを備えたウィンドウ形式のツリー ビュー。              | `nodes`、`itemHeight`、`onSelect`、`onToggle` |
| `ForgeTreeView` |再帰的にアクセス可能なツリー (非仮想化)。                | `nodes`、`defaultOpen`、`onSelect` |
| `ForgeTimeline` |垂直または水平のイベント リスト。                          | `items`、`orientation`、`align` |

### フィードバックとオーバーレイ

通知と読み込みインジケーター。

|コンポーネント |説明 |主要な小道具 |
| :----------------- | :------------------------------------------- | :--------------------------------------------------- |
| `ForgeSpinner` |不定荷重リング。                  | `size`、`variant`、`label` |
| `ForgeSkeleton` |コンテンツをロードするためのきらめくプレースホルダー。  | `shape` (`line`/`circle`/`block`)、`width`、`height` |
| `ForgeProgressBar` |確定または不確定の進行状況。 | `value`、`max`、`variant`、`indeterminate` |
| `ForgeStatusIcon` |小さなトーンのステータス インジケーターのグリフ。          | `status`、`size`、`label` |

### メディア

画像、ビデオ、プラットフォームのルック アンド フィールを処理します。

|コンポーネント |説明 |主要な小道具 |
| :--------------------- | :------------------------------------------------------------ | :------------------------------------- |
| `ForgeResponsiveImage` |ネイティブ srcset/size を備えたアート主導の `<picture>`。            | `src`、`sources`、`aspectRatio`、`fit` |
| `ForgeResponsiveVideo` |固定アスペクト比のレスポンシブビデオプレーヤー。              | `src`、`sources`、`poster`、`autoplay` |
| `ForgeBackgroundVideo` |動きを抑えたフルブリード背景ビデオ。      | `src`、`overlay`、`minHeight` |
| `ForgeDeviceMock` |画面の周囲のデバイス フレーム (モバイル/タブレット/デスクトップ/ブラウザ)。 | `device`、`orientation`、`url`、`size` |

## 実装の詳細

### スロットとプロップ

中立的な JSX 方言のため、一部のコンポーネントは **名前付きスロット** (React の子/プロップと Vue の名前付きスロットにコンパイルされます) を使用します。
スロット）を使用する一方、高性能仮想化のために **スコープ指定された Render-Props** を使用するものもあります。

### テーマの統合

テーマ関連のコンポーネントは `@mission-platform/theme` によって所有されています。 `ForgeThemeToggle`、`ForgeThemeProvider`、をインポート
およびそのパッケージの `ForgeThemeComposer`。そのシングルトン ストアはドキュメント ルートの `data-theme` 属性を管理します
すべてのアプリでグローバル状態プロバイダーを必要とせずに、デザイントークン CSS 変数を使用できます。

完全な残余インベントリと依存関係を意識した将来のパッケージ分割については、次の文書に記載されています。
[分解マップ](decomposition-map.md)。 `ForgeDrawer` および `ForgeWindowPopout` はこのパッケージに保留のまま残ります
そこに記載されている個別のオーバーレイ/ウィンドウ境界の決定。
