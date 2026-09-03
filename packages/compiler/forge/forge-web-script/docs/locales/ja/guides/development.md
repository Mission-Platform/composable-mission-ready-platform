# Forge Web スクリプトの開発

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> packages/compiler/forge/forge-web-script/docs/guides/development.md: [packages/compiler/forge/forge-web-script/docs/guides/development.md](../../../guides/development.md)
> 言語: 日本語 (ja)

このガイドは、Forge Web Script パーサーを変更する寄稿者を対象としています。
契約、または適合備品。

## パッケージをインストールして確認する

リポジトリ ルートから、依存関係をインストールし、パッケージ チェックを実行します。

```bash
pnpm install
pnpm --filter @mission-platform/forge-web-script build:check
pnpm --filter @mission-platform/forge-web-script test
```

公開する前に `pnpm --filter @mission-platform/forge-web-script build` を実行します。
このビルドは、ブラウザーセーフなバンドルと宣言ファイルを `dist/` の下に出力します。

## 言語変更を追加する

文法とチェックされたフロントエンドを一緒に更新します。フォーカスされたフィクスチャを追加する
`src/fixtures/` および診断または生成された動作の回帰テスト。
変更がない限り、言語バージョン `1.0` と ABI バージョン `1.2` を明示的に保ちます。
意図的な互換性リビジョン。 ABI の変更ではマニフェストを更新する必要があります。
ローダー、および互換性ドキュメント。

パッケージはブラウザーセーフです。 Node のみの API をパブリック ファサードに追加しないでください。
Node 固有のツールは `@mission-platform/forge-web-script-cli` に属します。

## 生成されたアーティファクトとソース アーティファクト

`src/self-hosted/fws/` の下にチェックインされた `.fws` ソースはソース アーティファクトです。
手作業でコピーされた JavaScript ではありません。生成された出力を `dist/` に保持し、コミットしない
ローカルビルドの出力。パッケージのドキュメント参照は次の場所に保管されています。
パッケージは、ドキュメント抽出ワークフローによって再生成されます。
