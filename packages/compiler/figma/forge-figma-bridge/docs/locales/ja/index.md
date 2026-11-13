# Figma リポジトリ ブリッジを鍛造する

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> packages/compiler/figma/forge-figma-bridge/docs/index.md: [packages/compiler/figma/forge-figma-bridge/docs/index.md](../../index.md)
> 言語: 日本語 (ja)

ブリッジは、認証された `POST /export` ではなくレビュー済みの `ForgeRepositoryExportRequest` を受け入れ、明示的に構成されたリポジトリ ルートの 1 つにバンドルを書き込みます。 CLI の `--root <id>=<absolute-path>` オプションを使用してルートを構成します。

各サーバー プロセスは新しい認証トークンを作成します。 CLI は起動時にトークンを出力します。呼び出し側は、それを `Authorization: Bearer <token>` として送信し、デフォルトの発信元 `https://www.figma.com` を送信する必要があります。 `allowedOrigin` サーバー オプションを使用して、明示的に構成されたローカル統合の起点を変更できます。他のオリジンからのリクエストやトークンのないリクエストは、バンドルの読み取りまたは書き込みが行われる前に拒否されます。
