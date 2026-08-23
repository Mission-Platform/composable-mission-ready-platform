# Forge Web Script 言語ツール

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> packages/forge-web-script-lsp/docs/reference/language-service.md: [packages/forge-web-script-lsp/docs/reference/language-service.md](../../../reference/language-service.md)
> 言語: 日本語 (ja)

Forge Web Script (`.fws`) には、エディター中立の言語サービス、stdio があります。
Language Server Protocol (LSP) サーバー、およびブラウザー向け Monaco アダプター。
3 つすべてで、実行可能な Forge Web Script v1 コントラクトを使用します。
`@mission-platform/forge-web-script`、つまり診断、ソース範囲、シンボル、
完了情報とホバー情報は同じパーサーから取得され、
バリデーター。

サポートされている言語契約は **バージョン 1.0** で、ABI 契約は
**バージョン 1.2**。ツールは次のことを行います
文法、コンパイラ出力、ABI、または既存の Rust を変更しないでください。
AssemblyScript の統合。見る [Forge Web スクリプト v1](../../../../../forge-web-script/docs/locales/ja/reference/language.md)
言語と ABI のリファレンスについては。

## 特徴と境界

現在、言語サービスは以下を提供しています。

- 字句解析、解析、型チェック、および ABI 検証による診断。
- LSP および Monaco に適した UTF-16 対応範囲。
- モジュール、関数、パラメータ、ローカル、機能のドキュメントシンボル
  エイリアス、集計タイプ、フィールド、列挙型バリアント、インターフェイス メソッド、ジェネリック
  パラメータ、反復子バインディング、一致バインディング、およびプリミティブ型。
- Forge キーワード、プリミティブ型、宣言、ローカル、
  集約タイプ、ジェネリックタイプ、関数、コンパイラ所有の文字列および正規表現
  関数、機能別名、およびホストでインベントリされた機能名。
- 宣言、パラメータ、ローカル、呼び出しなどのホバー情報
  AST が集合体を含むシンボルを識別すると、機能がインポートされます。
  型、ジェネリック型、コンパイラ所有の標準ライブラリ呼び出し、およびレンダリング
  ソース定義関数のドキュメント。そして
- コメント、文字列、数値、キーワード、タイプなどの v1 字句トークン化
  演算子、句読点、宣言、無効なテキスト。

LSP サーバーは、診断、完了、ホバー、および完全なセマンティックを公開します
トークン。定義へ移動、参照、名前変更、書式設定、コードアクション、
ソースレベルのクロスファイル言語インポート、およびブラウザーでホストされる LSP トランスポート
は実装されていません。モナコは代わりにローカル言語サービス アダプターを使用します
Node サーバーへの接続。

セマンティック トークンは、言語サービスの語彙分類を使用します。の
初期化応答は、`comment`、`declaration`、を含む凡例をアドバタイズします。
`identifier`、`invalid`、`keyword`、`number`、`operator`、`punctuation`、
`string` および `type`;クライアントは、エンコードされた完全なドキュメント トークンを要求します。
`textDocument/semanticTokens/full`。

## エディター結果の関数ドキュメント

言語サービスは、ソース定義されたトップレベルのドキュメントを公開します。
機能。宣言に同じ正規化されたドキュメント文字列を使用します。
ホバー、参照ホバー、および関数の完了。ホストが提供する機能
署名は既存のオプションの文字列ドキュメントを引き続き使用し、
FWS Javadoc コメントとして解析されません。

たとえば、このソース:

```fws
/**
 * Adds one to a value.
 *
 * @param value Input value.
 * @return Incremented value.
 * @deprecated Prefer `increment` in new code.
 */
export fn add(value: i32) -> i32 {
  return value + 1;
}

export fn caller() -> i32 {
  return add(1);
}
```

`add` の宣言時または `caller` の呼び出し時にマウスを移動すると、
署名の後にレンダリングされたドキュメントが続きます。

```text
export add(i32): i32

Adds one to a value.

@param value Input value.

@return Incremented value.

@deprecated Prefer `increment` in new code.
```

`caller` の呼び出しサイトで `add` をマウスオーバーすると、同じドキュメントが返されます。
非宣言署名付き:

```text
add(i32): i32

Adds one to a value.

@param value Input value.

@return Incremented value.

@deprecated Prefer `increment` in new code.
```

`add` の補完には、その横に同じドキュメント文字列が含まれます。
詳細/署名。説明の段落とタグは空白行で区切られます。
タグの順序、重複したタグ、および不明なタグは保持されます。コア構文と
関数の関連付けやサポートされているサブジェクトを含む正規化ルール
形式は、で指定されます [FWS 言語リファレンス](../../../../../forge-web-script/docs/locales/ja/reference/language.md)。

ドキュメントは情報メタデータのみです。診断結果は変わりませんが、
型チェック、関数解決、生成された宣言、ABI シグネチャ、
マニフェスト、Wasm/WAT、ランタイム動作、または実行可能ハッシュ。ドキュメント
したがって、編集では、ホバーと補完のコンテンツが変更されずに変更されます。
コンパイルされたモジュール契約。

### LSP レンダリング

stdio サーバーは、フレームワークに依存しない言語サービスの結果を標準にマッピングします。
LSP 値:

- `textDocument/hover` は、その値が署名に結合されている Markdown を返します。
  空白行を含むドキュメント。
- `textDocument/completion` は、各ソース関数項目の `documentation` を設定します
  フィールドを同じレンダリングされた文字列に変更し、既存の `detail` 署名を残します。
  変わらない。

LSP サーバーはタグを再解釈したり、エディター固有の書式設定を適用したりしません。
クライアントは返されたマークダウン/プレーンテキストをそのまま表示できます。

### モナコのレンダリング

`@mission-platform/content` は同じインプロセス言語サービスを登録します
`ForgeMonacoEditor` によって使用されるプロバイダー:

- モナコ ホバー `contents` には、署名とレンダリングされたドキュメントが含まれています。
  個別の Markdown 互換の値。
- ソース関数提案の `documentation` フィールドには同じ内容が含まれます
  LSP 補完としてレンダリングされた文字列。
- 字句 `comment` トークン分類は両方とも変更されません。
  通常のコメントとドキュメントブロックのコメント。

Monaco アダプターは Node LSP サーバーに接続しないか、サーバーを複製しません。
ドキュメントパーサー。言語サービスの結果を転送するため、ブラウザーと
stdio クライアントは一貫性を保ち、両方とも UTF-16 ソース範囲を使用します。

## 標準入出力サーバーを実行する

サーバーは `@mission-platform/forge-web-script-lsp` として公開されており、
実行可能ファイル `forge-web-script-lsp` を公開します。標準の LSP を話します
標準入力/標準出力。プロトコル メッセージがアプリケーションによって stdout に書き込まれることはありません
ロギング。準備完了メッセージとエラー メッセージは stderr に書き込まれます。

このリポジトリのチェックアウトから、次のようにビルドして実行します。

```sh
pnpm --filter @mission-platform/forge-web-script-lsp build
node packages/forge-web-script-lsp/dist/main.js
```

パッケージが外部プロジェクトにインストールされるときに、クライアントを構成します
パッケージの実行可能ファイルを直接呼び出すには:

```sh
forge-web-script-lsp
```

サーバーには Node.js 24 以降が必要です。 `--stdio` フラグは必要ありません。
stdio は常にトランスポートです。クライアントは `initialize` を送信する必要があります。
返された機能を確認してから、通常の `initialized` 通知を送信します。
サーバーは、フルテキスト同期、ワークスペース フォルダー、監視をサポートしています。
ファイルの変更、完了、ホバー、およびシャットダウン/終了。

### Stdio クライアントの構成例

コマンドと引数を別々に受け入れるクライアントは、次を使用する必要があります。
インストールされているパッケージの場合は `forge-web-script-lsp`。チェックアウトでは `node` と
代わりに構築されたエントリポイント:

```json
{
  "command": "node",
  "args": ["${workspaceFolder}/packages/forge-web-script-lsp/dist/main.js"],
  "filetypes": ["fws"],
  "rootPatterns": ["package.json", ".git"]
}
```

たとえば、Neovim の組み込み LSP クライアントは、インストールされた実行可能ファイルを使用できます。

```lua
vim.lsp.config('forge_web_script', {
  cmd = { 'forge-web-script-lsp' },
  filetypes = { 'fws' },
  root_markers = { 'package.json', '.git' },
})
vim.lsp.enable('forge_web_script')
```

Helix は、`languages.toml` で同じ実行可能ファイルを使用できます。

```toml
[language-server.forge-web-script-lsp]
command = "forge-web-script-lsp"

[[language]]
name = "fws"
scope = "source.fws"
file-types = ["fws"]
language-servers = ["forge-web-script-lsp"]
```

VS Code には LSP クライアント拡張機能が必要です。その拡張機能を次のように設定します
これらのフィールドを通常のフィールドに追加するのではなく、同じコマンドと引数を使用します。
`settings.json`。

## エディターの統合

このリポジトリは、VS Code および IntelliJ IDEA のファーストパーティ クライアントを提供します。
両方のクライアントは、診断、完了、ホバー、および
完全なセマンティックトークン。どちらのクライアントにもパーサー、PSI モデル、またはセマンティックが含まれていません
分析の実装。サーバーに必要なのは Node.js **24 以降**。あ
プラットフォーム固有の Node ランタイムはどちらのエディター統合にもバンドルされていません。

### VSコード

`fws-vscode-0.1.0.vsix` ファイルを次の場所からインストールします。
**拡張機能: VSIX からインストール** を使用した `extensions/fws-vscode` リリース出力、
次に、VS Code をリロードします。 `.fws` ファイルを開くと、拡張機能が有効になります。の
デフォルトの起動パスは VSIX にバンドルされているサーバーであり、拡張子は
stdio 経由で構成された Node 実行可能ファイルを使用して起動します。

この拡張子は、`fws` 言語 ID、`.fws` ファイル名の関連付け、
ベースラインのコメント/括弧/字句の強調表示、および LSP ファイル ウォッチャー。の
サーバーは引き続きセマンティック トークンとすべての言語動作を担当します。
ワークスペース フォルダーは、`file:` URI として `initialize` で送信され、
サーバーのワークスペースルートとパス分離コントラクト。

VS Code 設定 (または `settings.json`) で拡張機能を構成します。

```json
{
  "forgeWebScript.nodePath": "/path/to/node-24/bin/node",
  "forgeWebScript.serverPath": "",
  "forgeWebScript.serverArgs": [],
  "forgeWebScript.trace.server": "off"
}
```

`forgeWebScript.nodePath` のデフォルトは `node` であり、Node 24 に解決される必要があります。
新しい。パッケージ化されたサーバーを使用するには、`forgeWebScript.serverPath` を空のままにしておきます。
絶対パスまたは最初のワークスペースフォルダーを基準とした相対パスに設定します。
ローカルで構築された、またはプロジェクトによって提供された `dist/main.js` をテストします。追加
引数はサーバーのエントリポイントの後に渡されます。 `messages` または `verbose` を使用します
LSP トレース用。起動の失敗は **Forge Web Script に書き込まれます
Language Server** 出力チャネルであり、エディター エラーとして表示されます。

このリポジトリからのローカル開発の場合:

```sh
pnpm install --frozen-lockfile
pnpm exec turbo run build --filter=fws-vscode
pnpm --filter fws-vscode test
pnpm --filter fws-vscode check:packaging
pnpm --filter fws-vscode package
```

ビルドでは、まず共有 LSP パッケージをビルドし、次にそのエントリポイントをステージングします。
`extensions/fws-vscode/server` の下のランタイム依存関係。 `package`
`extensions/fws-vscode/fws-vscode-0.1.0.vsix` を生成します。開発ソース
テスト ファイルは `.vscodeignore` によって除外されます。パッケージ化されたスモークチェック
ステージングされたサーバーを初期化し、通知された完了、ホバー、
セマンティック トークン、および安定した診断動作。

### IntelliJ IDEA / LSP4IJ

プラグイン ZIP をビルドし、**設定 | からインストールします。プラグイン |ギア |
ディスクからプラグインをインストール**:

```sh
cd extensions/fws-ij
JAVA_HOME=/path/to/jdk-23 ./gradlew test verifyPlugin buildPlugin --no-daemon --offline
```

結果の `build/distributions/fws-ij-0.1.0.zip` には、薄い
LSP4IJ の統合。プラグインは IntelliJ IDEA Community に対してコンパイルされます
2024.3.3 (ビルド 243)、ビルドからの無制限の互換性範囲を維持
243 以降、WebStorm 2026.2.1 (ブランチ 262 を含む) に対して検証されています。
`WS-262.9437.145`)。 LSP4IJ 0.20.1 を固定し、Node.js または
言語サーバー。インストール後に IDE がすぐに再起動しない場合は、IDE を再起動します。
`.fws` ファイルを認識します。

プラグインは、`*.fws` を言語 ID `fws` にマップし、1 つの共有 stdio を開始します。
プロジェクトのサーバー。 IntelliJ 構成は、によって独占的に提供されます。
**設定 |ツール | Web スクリプトを作成**;プロジェクトスクリプトやフローラはありません
構成パス。設定:

- **Node.js 実行可能ファイル** — Node 24 以降。デフォルトは `node` です。
- **言語サーバー コマンド/パス** — デフォルトは `forge-web-script-lsp` および
  プロジェクト `node_modules/.bin` インストール (祖先を含む) を解決します。
  ワークスペース ルート) または `PATH`。次のような明示的な JavaScript エントリポイント
  `node_modules/@mission-platform/forge-web-script-lsp/dist/main.js` も
  サポートされました。
- **サーバー引数** — サーバーに渡されるオプションの引用符で囲まれた引数。
- **LSP トレース** — `off`、`messages`、または `verbose`。
- **FWS ファイルを開いたときに言語サーバーを起動します** — 起動トグル。

プロジェクトローカル CLI の場合は、IntelliJ によって開かれたプロジェクトにサーバーをインストールします。

```sh
pnpm add -D @mission-platform/forge-web-script-lsp
```

プラグインは、IntelliJ プロジェクトのルートをプロセスの作業ディレクトリとして使用します。
LSP4IJ は、ドキュメントのライフサイクルとワークスペースの通知を提供します。の
サーバーのルート限定ホストはファイルの列挙を実行し、監視ファイル
無効化、およびすべての言語の分析。同じパッケージ化された設定の状態は、
LSP ランチャーと汎用 stdio DAP アダプターの両方で使用されます。

### Cross-editor validation

共有言語サービス/LSP チェックと両方のクライアント パイプラインを
リポジトリのルート。 IntelliJ コマンドには、固定されたコンポーネントでサポートされている JDK が必要です。
Gradle/IntelliJ ツールチェーン。以下は macOS の例です。

```sh
pnpm --filter @mission-platform/forge-web-script-language-service test
pnpm --filter @mission-platform/forge-web-script-language-service build:check
pnpm --filter @mission-platform/forge-web-script-language-service lint
pnpm --filter @mission-platform/forge-web-script-language-service format
pnpm --filter @mission-platform/forge-web-script-lsp test
pnpm --filter @mission-platform/forge-web-script-lsp build:check
pnpm --filter @mission-platform/forge-web-script-lsp lint
pnpm --filter @mission-platform/forge-web-script-lsp format
pnpm exec turbo run build --filter=fws-vscode
pnpm --filter fws-vscode test
pnpm --filter fws-vscode check:packaging
pnpm --filter fws-vscode package
JAVA_HOME=/Library/Java/JavaVirtualMachines/jdk-23.jdk/Contents/Home \
  ./extensions/fws-ij/gradlew -p extensions/fws-ij test verifyPlugin buildPlugin --no-daemon --offline
```

ステージング サーバーと IntelliJ スモーク テストでは、同じ初期化が実行されます。
診断、完了、ホバー、セマンティックトークン、シャットダウン、およびプロジェクトルート
立ち上げ契約。共有 LSP テストでは、ワークスペース フォルダーも追加でカバーされます。
転送、`file:` URI 処理、ルートに含まれる監視ファイルの無効化、
安定した診断コード/範囲、および廃棄。エディタクライアントは公開する必要があります
サーバーによってアドバタイズされた機能のみ。定義へ移動、参照、
名前変更、書式設定、コードアクション、ファイル間の言語インポートはそのまま残ります。
サポートされていません。

### トラブルシューティング

- **Node ランタイムが拒否されました:** `<configured-node> --version` を実行し、
  Node 24+ は、関連する VS Code または IntelliJ 設定で実行可能です。クライアント
  検出されたバージョンを報告し、古いバージョンに自動的にフォールバックすることはありません。
  ランタイム。
- **VS Code パッケージ サーバーが見つかりません:** を使用して再構築します
  `pnpm exec turbo run build --filter=fws-vscode`、確認します
  `extensions/fws-vscode/server/dist/main.js` が存在する、または設定されている
  `forgeWebScript.serverPath` を有効なビルド済みエントリポイントに設定します。を検査します。
  トレースが有効になっている **Forge Web Script Language Server** 出力チャネル。
- **IntelliJ サーバー コマンドが見つかりません:** インストール
  開いたプロジェクトの `@mission-platform/forge-web-script-lsp` を確認してください。
  `node_modules/.bin` が存在するか、明示的なコマンド/パスを構成します。の
  プラグインは、検索されたプロジェクト ルートと推奨されるインストール パスを報告します。
- **診断も完了もありません:** ファイルの名前が `.fws` であることを確認します。
  クライアントが有効になっており、ワークスペースにプロジェクト ルートがあります。クライアントを確認してください
  トレース/出力チャネルを確認し、サーバーが `file:` ワークスペースを受信したことを確認します。
  フォルダー。ルートがない場合は、すでに開いているドキュメントのみを提供できます。
- **予期しないエディタ機能:** これらの統合は意図的に行われません。
  パーサーまたはセマンティック ロジックを追加します。機能と安定した `FWS-*` の比較
  このドキュメントと共有 LSP パッケージの診断コードは、
  エディター固有の動作を追加します。

サポートされている場合、クライアントはワークスペース フォルダーを `file:` URI として送信する必要があります。の
サーバーは最初にワークスペース フォルダーを使用し、`rootUri` にフォールバックします。どちらでもない場合
ただし、ファイルシステムホストにはルートがなく、すでにオープンされているファイルのみを提供できます。
書類。

## ワークスペースの動作とセキュリティ

Node サーバーは、ファイルシステムに基づくワークスペース ホストをルートから作成します。
LSP 初期化リクエスト。これらの下にあるファイルを再帰的に列挙します。
ルートを取得し、ワークスペース分析に必要なファイルを読み取り、ルートに含まれるファイルを監視します。
ファイルの変更。パスは正規化され、シンボリックリンクは読み取り前に解決されます。
設定されたすべてのルートの外部へのアクセスは拒否されます。サポートされていない URI スキーム
ファイルシステムのパスとしては扱われません。

ワークスペース ID は URI ベースです。同じベース名を持つ 2 つのドキュメントですが、
異なる URI は別個のドキュメントのままになり、エントリがキャッシュされます。を閉じる
ドキュメントはクライアントから診断を削除します。作成したり、変更したり、
監視ファイルを削除すると、ワークスペース依存の分析が無効になり、再公開されます。
開いているドキュメントの診断。

サーバーはプロジェクト構成ファイルを導入しません。標準の CLI
現在、ホストがコードによって挿入されない限り、空のワークスペース オプションが提供されます。
言語サービス ワークスペース コントラクトは次のとおりです。

```ts
interface ForgeWebScriptWorkspaceHost {
  readFile(uri: string): Promise<string | undefined>;
  listFiles(): Promise<readonly string[]>;
  getOptions(uri: string): Promise<ForgeWebScriptWorkspaceOptions>;
  watch?(listener: (change: ForgeWebScriptWorkspaceChange) => void): {
    dispose(): void;
  };
}

interface ForgeWebScriptWorkspaceOptions {
  requestedCapabilities?: readonly string[];
  requireExports?: boolean;
  capabilityNames?: readonly string[];
  capabilitySignatures?: ReadonlyMap<string, ForgeWebScriptCallable>;
}
```

`requestedCapabilities` と `requireExports` は次のように渡されます。
`validateForgeWebScript`。によって許可されていない機能のインポート
ワークスペースは安定した ABI 診断 `FWS-ABI-002` を生成します。輸出関連
要件では、対応する `FWS-ABI-003` コントラクトを使用します。機能名
署名も補完とホバーをフィードしますが、署名から推測されることはありません。
アンビエント Node またはブラウザ API。

### エディターのエクスポート ポリシー

エディター分析は、デフォルトでモジュールプライベート関数に対して寛容です。いつ
`requireExports` は、注入されたワークスペースである標準 LSP ホストから省略されます
ホスト、または Monaco ワークスペース ホストの場合、`false` として扱われるため、プライベート ヘルパー
同じモジュール内の別の関数から生成せずに呼び出すことができます。
`FWS-ABI-003`。プライベート関数は同じモジュールのシンボルで引き続き使用できます。
完了、ホバー、および呼び出し/タイプの解決が含まれますが、これらは Wasm ABI エクスポートではありません。

ABI のみの診断が必要なホストは、`requireExports: true` をグローバルに設定するか、
`optionsForUri` を介したドキュメントの場合。そのポリシーを変更し、
ワークスペースはキャッシュされた分析を無効にします。 `requireExports: false` の設定は、
明示的な寛容政策。このエディターのデフォルトはコンパイルを変更しません。
`@mission-platform/forge-web-script` では、引き続きすべての場合に `export fn` が必要です
`requireExports` オプションが省略された場合のコンパイラ ABI 関数。

コアまたはプログラムで作成された LSP サーバーを使用する場合は、次の呼び出しを行います。
ドキュメントを開いた後、依存する前は `refreshWorkspace(uri)`
ワークスペース由来の診断、完了、またはホバー。 LSP アダプターは次のことを実行します。
この更新は、診断を公開する前とサービスの完了前に行われます。
ホバーリクエスト。

## 診断と範囲

診断では、バリデーターの安定した `code`、重大度、フェーズ、メッセージが保持されます。
ファイル名、ソース スパン、およびオプションのヒント。 LSP 表現では、
標準のゼロベースの `Position` とハーフオープンの `Range`。文字オフセット数
UTF-16 コード単位 (診断の前に Unicode が表示される場合を含む)。

LSP サーバーは `source: "forge-web-script"` を発行します。フェーズとヒントは、
診断 `data` オブジェクトにも含まれています。典型的な安定したコードファミリー
は:

|コードファミリー |フェーズ |意味 |
| ------------- | ------------ | ------------------------------------------------------------------------ |
| `FWS-LEX-*` | `lex` |無効な文字/エスケープ、生の文字列行終端文字、または終了していない文字列/ブロック コメント |
| `FWS-PARSE-*` | `parse` |無効なモジュール、宣言、ステートメント、または式の構文です。
| `FWS-TYPE-*` | `type-check` |無効な型、名前、演算子、引数、または戻り値 |
| `FWS-ABI-*` | `abi` |重複した名前、拒否された機能、エクスポートまたはインポート |

不正な入力は引き続きトークン化され、パーサーの回復が可能な場合には分析されます。
それ。たとえば、不正な形式のソースによって次のようなエラーが発生する可能性があります。 `FWS-PARSE-017` 保持しながら
使用可能な語彙トークンと部分的なシンボル情報。クライアントは表示する必要があります
一致する診断テキストではなく、指定された範囲とコードを使用します。

文字列解析では、JSON 互換のエスケープ (`\\`、`\"`、`\/`、`\b`、
`\f`、`\n`、`\r`、`\t`、および `\uXXXX`）。生の行末文字、無効なエスケープ、
末尾のバックスラッシュは語彙診断を生成します (`FWS-LEX-004` または
`FWS-LEX-005`)。レクサーおよび診断スパンは、ソースの長さによって制限されます。
クライアントは、それらを安全に UTF-16 LSP 範囲に直接変換できます。

## Monaco アダプターの組み込み

ブラウザ アダプタは `@mission-platform/content` によってエクスポートされ、次の場所に存在します。
`packages/content/src/monaco/forge-web-script.ts`。 `ForgeMonacoEditor` ロード
`language="fws"` の場合、アダプターは遅延します。モナコは依然として型のみの輸入品です
同期コンポーネント グラフのため、サーバー側のレンダリングは評価されません
モナコ。

最も単純なコンポーネントの使用法は次のとおりです。

```tsx
<ForgeMonacoEditor
  language="fws"
  modelValue={"export fn add(value: i32) -> i32 {\n  return value + 1;\n}"}
/>
```

`forgeWebScript={false}` を設定して自動統合を無効にします。それ以外の場合は、
コンポーネントは `fws` 言語と `.fws` 拡張子を登録し、Monaco の言語を使用します。
テーマの組み込みトークン カテゴリ (`keyword`、`type`、`string`、`comment`、
`number`、`operator`、`delimiter`、および `invalid`)、アクティブな
モデルを作成し、マーカーを公開し、補完プロバイダーとホバープロバイダーを登録します。

機能を認識したブラウザー ツールの場合は、ホスト所有のワークスペース オブジェクトを提供します。

```tsx
const workspaceHost: ForgeWebScriptWorkspaceHost = {
  readFile: async (uri) => files.get(uri),
  listFiles: async () => [...files.keys()],
  getOptions: async () => ({
    requestedCapabilities: ["clock.now"],
    capabilityNames: ["clock.now"],
    capabilitySignatures: new Map([
      [
        "clock.now",
        {
          parameters: [],
          result: "i64",
          documentation: "Read the current Unix timestamp.",
        },
      ],
    ]),
  }),
};

<ForgeMonacoEditor
  language="fws"
  forgeWebScript={{ workspaceHost }}
  modelValue={
    'import capability "clock.now" as now() -> i64;\nexport fn current() -> i64 {\n  return now();\n}'
  }
/>;
```

ホストは意図的に挿入されます。ブラウザーのコンシューマーは読み取りを提供する必要があります。
ファイルの列挙、プロジェクト オプション、およびオプションの変更通知
独自のストレージまたはアプリケーションの状態。アダプターは Node を決して想定しません。
ファイルシステム API を使用し、stdio サーバーには接続しません。返品されたものは処分する
アダプター ハンドル (または `ForgeMonacoEditor` をアンマウント) してモデル リスナーを削除します。
プロバイダー、マーカー、サービス キャッシュ。

強制的な統合の場合は、Monaco が統合した直後に同じアダプターを使用します。
ロードされました:

```ts
import {
  attachForgeWebScriptMonaco,
  registerForgeWebScriptLanguage,
} from "@mission-platform/content";

registerForgeWebScriptLanguage(monaco);
const handle = attachForgeWebScriptMonaco(editor, monaco, { workspaceHost });

await handle.refresh();
// On editor teardown:
handle.dispose();
```

`fws` がすでに存在する場合、`registerForgeWebScriptLanguage` は安全に呼び出すことができます。
登録されました。登録ハンドルはトークンプロバイダーを破棄します。アダプター
ハンドルはさらに、補完/ホバープロバイダー、モデルリスナー、
マーカーとその所有する言語サービス インスタンス。

## LSP とブラウザーのワークスペース

|消費者 |ワークスペースの実装 |ルート/セキュリティ境界 |輸送 |
| --------------- | -------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------ |
| Node LSP クライアント | `RootBoundedForgeWebScriptWorkspaceHost` |正規化された構成済みファイルシステムのルート。外部読み取りは拒否されます。 stdio LSP |
|モナコ/ブラウザ |アプリケーション提供の `ForgeWebScriptWorkspaceHost` |どの URI/ファイル/オプションを公開するかはホストが決定します。ファイルシステムを前提としていない |インプロセスアダプター |

どちらのアダプターも同じ言語サービス コントラクトと分析セマンティクスを使用します。
ただし、ドキュメント ストアやトランスポートは共有しません。ブラウザホストは次のことを行ってはなりません
Node ファイルシステム関数をブラウザ バンドルに渡します。逆に、Node LSP
サーバーは、そのサーバーを実行しようとするのではなく、外部クライアントに使用する必要があります。
モナコのファイルシステムホスト。

## 検証と適合

言語サービスおよび LSP パッケージには、受け入れられたか拒否されたかのテストが含まれています
ブートストラップ フィクスチャ、診断コードと UTF-16 範囲、不正な入力、
ワークスペースの無効化、ルート分離、LSP 同期、完了、
ホバー、そして処分。コンテンツ パッケージには、アダプター、ハイライト表示、
マーカー、プロバイダー、処分、SSR/非 Forge エディターの範囲。

リポジトリ ルートから重点的なチェックを実行します。

```sh
pnpm --filter @mission-platform/forge-web-script-language-service test
pnpm --filter @mission-platform/forge-web-script-language-service build:check
pnpm --filter @mission-platform/forge-web-script-language-service lint
pnpm --filter @mission-platform/forge-web-script-language-service format

pnpm --filter @mission-platform/forge-web-script-lsp test
pnpm --filter @mission-platform/forge-web-script-lsp build:check
pnpm --filter @mission-platform/forge-web-script-lsp lint
pnpm --filter @mission-platform/forge-web-script-lsp format

pnpm --filter @mission-platform/content exec vitest run \
  src/monaco/forge-web-script.spec.ts \
  src/components/organisms/forge-monaco-editor/forge-monaco-editor.spec.ts
pnpm --filter @mission-platform/content build:check
```

パッケージ全体のコンテンツ lint および format コマンドは、無関係な CSS/SCSS も検査します
ファイル。これらの既存のファイルに限定された障害は Forge Web Script ではありません
言語ツールの回帰。権威ある言語フィクスチャーの期待
`../../../forge-web-script/src/fixtures/bootstrap.ts` に残り、
[言語リファレンス](../../../../../forge-web-script/docs/locales/ja/reference/language.md)。
