# 共有ユーティリティスクリプト

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> docs/configs/scripts-config.md: [docs/configs/scripts-config.md](../../../configs/scripts-config.md)
> 言語: 日本語 (ja)

このガイドは意図的にプロジェクト ドキュメント層に残ります: `scripts/`
これは、リポジトリ オーケストレーションを含むプライベート ワークスペース パッケージです。
公開可能なライブラリ。
パッケージおよびアプリケーション固有のコマンドは、そのコマンドの横に文書化されたままになります。
ワークスペースを所有しています。

Mission Platform は、ルートに共有ユーティリティ スクリプトのセットを維持します。
`scripts/` ディレクトリ。パッケージ スクリプトは Turbo タスクとして登録されますが、
ルート `package.json` は、Turbo に委任する便利なラッパーを公開します。

## 概要

これらのスクリプトは、ローカル開発セットアップやビルド検証などの一般的なモノリポジトリ タスクを自動化します。翻訳
抽出は各アプリまたはパッケージによって定義され、Turborepo を使用してリポジトリ ルートから調整されます。

## 利用可能なスクリプト

### Turbo タスク ファミリ

以下のリポジトリ ユーティリティのルート ラッパーを使用します。それぞれのコマンドは、
別のタスクなので、Turbo は独立してハッシュしてスケジュールできます。

|コマンド |目的 |キャッシュポリシー |
| :----------------------------------- | :---------------------------------------------------------------- | :---------------------------------------------------------- |
| `pnpm validate` | Turbo を通じてスタンドアロン コンポーネント プロパティの静的チェックを実行します。 |タスクは独立してキャッシュされます。                           |
| `pnpm docs:generate` |パッケージと拡張機能のリファレンス ドキュメントを生成します。           |生成された参照ファイルはキャッシュされます。                       |
| `pnpm validate:exports` |パッケージのエクスポート マップとビルドされたターゲットを確認します。                     |入力が変更されていない場合はキャッシュ可能です。                    |
| `pnpm validate:component-properties` |コンポーネントのプロパティ宣言をソース スタイルと照合してチェックします。      |キャッシュ可能で出力不要。                                  |
| `pnpm validate:inventory` |ランタイム検証インベントリを作成します。                         | `.artifacts/runtime-validation/` でキャッシュ可能なアーティファクト。 |
| `pnpm validate:framework` |フレームワークのランタイム カバレッジを検証します。                              | `.artifacts/runtime-validation/` でキャッシュ可能なアーティファクト。 |
| `pnpm validate:app` |アプリケーションのランタイムの範囲を検証します。                            | `.artifacts/runtime-validation/` でキャッシュ可能なアーティファクト。 |
| `pnpm validate:target` |設定された Storybook ターゲットを検証します。                            | `.artifacts/runtime-validation/` でキャッシュ可能なアーティファクト。 |
| `pnpm validate:runtime` |完全なランタイム検証スイートを実行します。                            |外部ランタイムプロセスを開始するため、キャッシュされません。    |
| `pnpm visual:parity` |レンダリングされた Storybook 出力をフレームワーク間で比較します。              |開発サーバーを起動するためキャッシュされません。           |
| `pnpm test:runtime-validation` |集中的なランタイム検証単体テストを実行します。                    |テストタスクの入力に従ってキャッシュ可能。                |

ユーティリティ タスクの入力は `turbo.json` で宣言されます。リポジトリ全体の入力の使用
`$TURBO_ROOT| `pnpm test:runtime-validation` |集中的なランタイム検証単体テストを実行します。                    |テストタスクの入力に従ってキャッシュ可能。                |

ユーティリティ タスクの入力は `turbo.json` で宣言されます。リポジトリ全体の入力の使用
 なので、タスクが `scripts/` から実行されるときにも正しいままになります。
ワークスペース。生成されたランタイムとビジュアルアーティファクトはその下に書き込まれます
`.artifacts/` はソース入力として扱われません。

`pnpm validate:exports` は意図的に独立したポストビルド ゲートです。
パッケージ `dist/` ディレクトリ内のファイルをチェックします。 `pnpm build` の後に実行します。
クロマチックスタティックゲートジョブはそれを行います。
 `$TURBO_ROOT$`
### i18n 抽出 (`i18n:extract`)

翻訳を所有する各アプリまたはパッケージは、`i18n:extract` スクリプトと `i18next.config.ts` を提供します。コマンドは書きます
ネームスペース バンドルは、各ワークスペースの `locales/<locale>/` ディレクトリの下にあります。構成されているすべてのワークスペースの抽出を実行します。
リポジトリのルート:

```bash
pnpm i18n:extract
```

### 開発証明書の生成 (`generate-dev-cert.ts`)

HTTPS 開発用のローカル SSL/TLS 証明書を生成します。これは、安全なセキュリティを必要とする機能をテストする場合に役立ちます。
コンテキスト (`@mission-platform/code-scanner` を介したカメラ アクセスなど)。

```bash
pnpm exec tsx scripts/generate-dev-cert.ts
```

### フレームワーク解像度の検証 (`verify-framework-resolution.mjs`)

`@mission-platform/*` パッケージのエクスポートが目的のフレームワーク ビルド (Vue、React など) に正しく解決されることを確認します。
環境の輸出条件に基づいて。

```bash
node scripts/verify-framework-resolution.mjs
```

### ドキュメントの生成 (`docs:generate`)

ドキュメントの生成は、`@mission-platform/scripts` が所有する Turbo タスクです。
docs アプリケーションはそのタスクに明示的に依存しているため、開発とビルドは
コマンドは、ネストされた Turbo ビルドを開始しません。

## 実行方法

### パッケージマネージャー経由

頻繁に使用されるユーティリティは、Turbo をサポートする `pnpm` スクリプトとして
ルート `package.json`:

```bash
pnpm run <script-name>
```

パッケージスコープの呼び出しの場合は、Turbo を直接使用します。

```bash
pnpm exec turbo run validate:exports --filter=@mission-platform/scripts
```

### 直接実行

個々の TypeScript スクリプトは、`tsx` または `node --experimental-strip-types` を使用して実行できます。

```bash
pnpm exec tsx scripts/<filename>.ts
```

## 貢献ガイドライン

新しい共有スクリプトを追加する場合:

- `scripts/` ディレクトリに配置します。
- 可能な場合は TypeScript を使用してください。
- スクリプトが外部パッケージに依存している場合は、それらを所有ワークスペースの `package.json` に追加します。
- スクリプトの目的と使用法をこのファイルに文書化します。
- 頻繁に使用されるユーティリティの場合は、ルート `package.json` に対応するエントリを追加します。
