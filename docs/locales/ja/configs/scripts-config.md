# 共有ユーティリティスクリプト

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> docs/configs/scripts-config.md: [docs/configs/scripts-config.md](../../../configs/scripts-config.md)
> 言語: 日本語 (ja)

このガイドは意図的にプロジェクト ドキュメント層に残されます。 `scripts/`
公開可能なワークスペース パッケージではなく、リポジトリ オーケストレーションが含まれています。
パッケージおよびアプリケーション固有のコマンドは、そのコマンドの横に文書化されたままになります。
ワークスペースを所有しています。

Mission Platform は、ルートに共有ユーティリティ スクリプトのセットを維持します。
`scripts/` ディレクトリ。ルート ワークスペース ツールによって管理されます。

## 概要

これらのスクリプトは、ローカル開発セットアップやビルド検証などの一般的なモノリポジトリ タスクを自動化します。翻訳
抽出は各アプリまたはパッケージによって定義され、Turborepo を使用してリポジトリ ルートから調整されます。

## 利用可能なスクリプト

### i18n 抽出 (`i18n:extract`)

翻訳を所有する各アプリまたはパッケージは、 `i18n:extract` スクリプトと `i18next.config.ts`。コマンドは書きます
各ワークスペースの下の名前空間バンドル `locales/<locale>/` ディレクトリ。構成されているすべてのワークスペースの抽出を実行します。
リポジトリのルート:

```bash
pnpm i18n:extract
```

### 開発証明書の生成 (`generate-dev-cert.ts`)

HTTPS 開発用のローカル SSL/TLS 証明書を生成します。これは、安全なセキュリティを必要とする機能をテストする場合に役立ちます。
コンテキスト (例: `@mission-platform/code-scanner`).

```bash
pnpm exec tsx scripts/generate-dev-cert.ts
```

### フレームワーク解像度の検証 (`verify-framework-resolution.mjs`)

それを検証します `@mission-platform/*` パッケージのエクスポートは、意図したフレームワーク ビルドに正しく解決されます (Vue, React、など）
環境の輸出条件に基づいて。

```bash
node scripts/verify-framework-resolution.mjs
```

## 実行方法

### パッケージマネージャー経由

ほとんどのスクリプトは次のようにして入手できます。 `pnpm` ルート内のスクリプト `package.json`:

```bash
pnpm run <script-name>
```

### 直接実行

個人 TypeScript スクリプトは次を使用して実行できます `tsx` または `node --experimental-strip-types`:

```bash
pnpm exec tsx scripts/<filename>.ts
```

## 貢献ガイドライン

新しい共有スクリプトを追加する場合:

- に置きます `scripts/` ディレクトリ。
- 使用 TypeScript 可能な限り。
- スクリプトが外部パッケージに依存している場合は、それらを所有するワークスペースのパッケージに追加します。 `package.json`。
- スクリプトの目的と使用法をこのファイルに文書化します。
- ルートに対応するエントリを追加します `package.json` 頻繁に使用されるユーティリティの場合。
