# コンポーネントの分解マップ

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> packages/ui/components/docs/decomposition-map.md: [packages/ui/components/docs/decomposition-map.md](../../decomposition-map.md)
> 言語: 日本語 (ja)

この文書には、`ForgeTag` を抽出した後の残存在庫が記録されます。
`@mission-platform/select`、`@mission-platform/float` へのフローティングおよび通知 UI、
テーマの UI/状態を `@mission-platform/theme` に設定します。ニュートラルバレル
`src/components/index.ts` は現在 **45** コンポーネントをエクスポートしています。以下のリストは
追加のパッケージが作成されるのではなく、推奨される次のウェーブの所有権の境界
この移行によって。

## 推奨されるネクストウェーブパッケージ

### `@mission-platform/navigation`

`ForgeBreadcrumb`、`ForgeMenu`、`ForgeMenuItem`、`ForgeMenubar`、`ForgeNavbar`、
`ForgeNavbarItem`、`ForgePagination`、`ForgeTabs`、および `ForgeVirtualTabs`。

これらのコンポーネントは、キーボード ナビゲーション、移動フォーカス、メニュー/タブの状態、および
ナビゲーション指向のインタラクション コントラクト。それらの中立的な実装は依存します
`@mission-platform/forge-jsx` で;メニューやテーブルのようなコントロールも使用します
`@mission-platform/icons`、ブレッドクラム/ナビゲーションバーのコンテンツが所有権を構成します
`@mission-platform/typography` パッケージ。 `ForgeNavbar` は現在、
残りの `ForgeDrawer` なので、ナビゲーションを抽出するには、それを保持する必要があります。
依存関係を明示的に、または最初に引き出し境界を決定します。導入してはならない
`@mission-platform/components` からナビゲーションへの依存関係。

### `@mission-platform/data-display`

`ForgeAccordion`、`ForgeList`、`ForgeTable`、`ForgeTreeView`、`ForgeVirtualList`、
`ForgeVirtualTable`、`ForgeVirtualTreeView`、`ForgeVirtualLogViewer`、
`ForgeTimeline`、`ForgeBadge`、`ForgeProgressBar`、および `ForgeStatusIcon`。

一般的な懸念は、次のような構造化データまたは大量データのレンダリングです。
ウィンドウ処理、並べ替え、ツリー展開、およびステータス表示。現在のソース
`@mission-platform/forge-jsx` を使用し、テキストまたはグリフが構成される場合、
`@mission-platform/typography` および `@mission-platform/icons`。これらは残すべきです
将来のパッケージの下位レベルの依存関係。仮想コンポーネントは一緒に移動する必要があります
それらのスタイル/仕様/ストーリーが同じ場所にあるため、ニュートラルなフック動作と 5
Forge ターゲットは引き続き一緒にテストされます。

### `@mission-platform/layout`

`ForgeCard`、`ForgeGrid`、`ForgeMasonry`、`ForgeStack`、`ForgeSeparator`、および
`ForgeCollapse`。

これらは、抽出されたフロート、テーマ、
またはパッケージを選択します。 `ForgeCard` と現在使用されているスペースを含むプリミティブ
パッケージローカルの SCSS ユーティリティなので、移動ではそれらのスタイルを継承するか、プロモートする必要があります。
ユーティリティを安定した下位レベルのパッケージに変換します。他のものに手を出すべきではありません
ドメインパッケージのソースツリー。

### `@mission-platform/media`

`ForgeBackgroundVideo`、`ForgeResponsiveImage`、`ForgeResponsiveVideo`、
`ForgeCarousel`、`ForgeDeviceMock`。

最初の 3 つは独自のメディア読み込み/レンダリング セマンティクス、カルーセルとデバイス
メディアの周囲にプレゼンテーションを追加するモック。彼らの中立的な情報源は現在、
`@mission-platform/forge-jsx`、およびカルーセル コントロールの場合は `@mission-platform/icons`。
抽出されたパッケージには依存関係はありません。低減されたモーションを維持し、
メディア動作を分割するのではなく、将来の動きの一環としてのコンポーネントごとの CSS
そのスタイルから。

### `@mission-platform/communication`

`ForgeChatBubble` および `ForgeChatArea`。

これらのコンポーネントは、会話セマンティクス、ライブ領域の動作、メッセージを共有します。
レイアウト。 `ForgeChatBubble` は `ForgeAvatar` と `@mission-platform/typography` を構成します
したがって、将来のパッケージは、それらに対する安定した公的契約に依存する必要があります。
残差をインポートする代わりにプリミティブを使用します (または基本パッケージ内に保持します)。
エイリアスを介してコンポーネントのソース ファイルを作成します。

## 今のところ一緒に残っているコンポーネント

この小さな基盤/コンテンツ/テンプレート セットを `@mission-platform/components` に保持します。
別の境界を正当化するのに十分な API サーフェスが得られるまで:

`ForgeAvatar`、`ForgeButton`、`ForgeButtonGroup`、`ForgeIconButton`、`ForgeQuote`、
`ForgeSkeleton`、`ForgeSpinner`、および `ForgeHero`。

`ForgeInView` も小規模な対話ユーティリティとして保持されています。 `ForgeTypography`
`@mission-platform/typography` が所有しており、意図的に
残ったバレル。

## 延期されたオーバーレイ/ウィンドウの候補

`ForgeDrawer` と `ForgeWindowPopout` は、この変更では意図的に移動されません。
`ForgeDrawer` はオーバーレイ/ウィンドウ隣接であり、現在は次のように構成されています。
`ForgeNavbar`; `ForgeWindowPopout` はブラウザ ウィンドウのライフサイクルを所有しているため、
個別の SSR、フォーカス、およびクロスウィンドウ契約の決定が必要です。両方を評価する
パッケージを作成する前にナビゲーションとフロートの所有者を使用し、保持しないでください。
互換性のショートカットとして実装を複製します。

## 境界監査

抽出されたパッケージのインポートについて、残りのコンポーネント ソースがチェックされました。
`@mission-platform/theme`、`@mission-platform/float`、または
`packages/ui/components/src` の下の `@mission-platform/select`。ニュートラルな成分
`@mission-platform/forge-jsx` を使用、`@mission-platform/icons` から選択したアイコン、
`@mission-platform/typography` のタイポグラフィー、およびパッケージローカルのスタイル/ユーティリティ。
ストーリーはパッケージ バレルをインポートして公開面を利用する場合があります。それは違います
実装の依存関係またはパッケージのサイクル。

すべての残りのコンポーネントは、同じ場所にある `index.ts`、ニュートラル ソース、SCSS、
仕様とストーリーブックのストーリー。パッケージ マニフェストは、`dist`、コンポーネント、
スタイルとユーティリティのみ。抽出されたストア ツリーは含まれなくなりました。

## 共用規模公共料金契約

`.forge-size--2xs` ～ `.forge-size--2xl` クラスは、意図的に
残留物ではなく、`@mission-platform/tokens/scss/tokens` によって発行されます。
コンポーネントパッケージ。残りのコンポーネントと抽出された `float` および `theme`
すべてのパッケージはこれらのクラスを使用しますが、スタンドアロンの Forge パッケージの出力はこれらのクラスを使用できません
`@mission-platform/components` が所有する CSS モジュールが確実に含まれています。

トークン バレルには、`mp.tokens` カスケードに `scss/_size.scss` が 1 回含まれています
トークンのカスタム プロパティとベース リセットの横にあるレイヤー。これにより保存されます
既存の優先契約: 階層化されていないアプリケーション スタイルは、
ユーティリティ ルール、および影響を受けるすべてのアプリ/ストーリーブック エントリはすでに
トークンバレル。したがって、コンポーネントは安定したグローバル クラスを出力し続けます。
各パッケージのサイズスケールを重複させずに名前を付けます。
