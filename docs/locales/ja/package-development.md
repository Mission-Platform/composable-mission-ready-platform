# パッケージ開発

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> 英語の原典: [docs/package-development.md](../../package-development.md)
> 言語: 日本語 (ja)

このガイドでは、Mission Platform モノリポジトリ内で再利用可能なパッケージを作成、開発、公開する方法について説明します。
パッケージはプラットフォームの基本的な構成要素であり、 `packages/` ディレクトリと経由で管理されます
pnpm ワークスペースとターボレポ。

## 新しいパッケージの作成

パッケージを作成する推奨方法は、Mission Platform Developer MCP ツールを使用することです。
構成、スクリプト、フォルダー構造はプラットフォームの標準に従います。

### 1. MCPを使用した足場

を使用します。 `scaffold_package` スケルトンを生成するツールです。

```bash
# Example: Creating a new 'date-utils' package
# The tool defaults to a dry-run; set apply=true to write files
scaffold_package(name="date-utils", description="Shared date manipulation utilities", apply=true)
```

これにより、規約に準拠した `packages/date-utils/` ディレクトリに次のものがあります:

- `package.json` ワークスペース対応スクリプトと共有構成を使用します。
- `tsconfig.json` プラットフォームのデフォルトを拡張します。
- `vite.config.ts` 最適化されたビルド用。
- `src/index.ts` バレルファイル。
- `llms.txt` AI 支援ドキュメンテーション用。

### 2. 手動セットアップ (オプション)

MCP ツールを使用していない場合は、 `package.json` を使用します [pnpm カタログ](https://pnpm.io/catalogs) のために
依存関係を管理し、スコープ付きの命名規則に従います。

```json
{
  "name": "@mission-platform/your-package-name",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "build": "pnpm exec turbo run build --filter @mission-platform/your-package-name",
    "test": "vitest run",
    "lint": "eslint .",
    "format": "prettier --check ."
  },
  "devDependencies": {
    "@mission-platform/eslint-config": "workspace:*",
    "@mission-platform/prettier-config": "workspace:*"
  }
}
```

## パッケージ構造

各パッケージは厳密な内部レイアウトに従います。コードの単位 (コンポーネント、コンポーザブル、ストア、またはユーティリティ) は、次の場所に存在する必要があります。
独自の名前付きサブディレクトリと同じ場所にテストが配置されます。

```text
packages/<name>/
├── src/
│   ├── components/                 # Atomic components (atoms, molecules, etc.)
│   │   ├── atoms/
│   │   │   └── forge-button/        # forge-button.tsx + .stories.tsx + .spec.ts
│   │   └── index.ts                # Component re-exports
│   ├── composables/
│   │   └── use-date-format/        # use-date-format.ts + .spec.ts
│   ├── stores/
│   │   └── date-store/             # date-store.ts + .spec.ts
│   ├── utils/
│   │   └── date-validator/         # date-validator.ts + .spec.ts
│   ├── locales/                    # i18n JSON files
│   └── index.ts                    # Package public API (barrel)
├── llms.txt                        # Technical overview for LLMs
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## 開発ワークフロー

### オーサリングルール

1. **TypeScript どこでも**: すべてのソース コードが存在する必要があります。 `.ts` または `.tsx` (使用して `@mission-platform/forge`)。
2. **フレームワークの中立性**: フレームワークに依存しないロジックを優先します。コンポーネントは、ターゲットに合わせて Forge JSX で一度作成する必要があります
   複数のフレームワーク。
3. **分離**: パッケージは決してインポートしないでください。 `apps/`。
4. **テスト**: すべてのユニット (コンポーザブル、ストア、ユーティリティ、コンポーネント) には同じ場所に配置する必要があります。 `.spec.ts` ファイル。

詳しいオーサリング手順については、以下を参照してください。

- [アトミックコンポーネント設計](atomic-component-design.md)
- [コンポーザブルオーサリング](composable-authoring.md)
- [ストアオーサリング](store-authoring.md)
- [ユーティリティオーサリング](util-authoring.md)

### 建物

を使用してパッケージをビルドします Turbo 依存関係が正しい順序で構築されていることを確認するには、次のようにします。

```bash
pnpm exec turbo run build --filter @mission-platform/<name>
```

### テスト

を使用してテストを実行します Vitest:

```bash
pnpm exec turbo run test --filter @mission-platform/<name>
```

## ドキュメント (`llms.txt`)

すべてのパッケージには以下が含まれます `llms.txt` ファイルをルートに置きます。このファイルには、
パッケージの API、コンポーネント、動作を統合し、AI アシスタントがパッケージをよりよく理解して使用できるようにします。

- **タイトル**: スコープ指定されたパッケージ名を使用します。
- **コンポーネント/API**: 使用可能なシンボルとそのプロパティおよび役割の表またはリスト。
- **例**: 一般的な使用例の短いコード スニペット。

## 出版

ミッションプラットフォームが使用するのは、 [変更セット](https://github.com/changesets/changesets) バージョン管理と公開用。

1. **変更セットの追加**: 変更を加えた後、以下を実行します。
```bash
   pnpm changeset
   ```
   パッケージと変更の種類 (パッチ、マイナー、メジャー) を選択します。
2. **変更セットをコミット**: 生成された変更セットをコミットします。 `.changeset/*.md` ファイル。
3. **バージョンと公開**: CI/CD が実際の公開を処理しますが、次の方法でバージョンをローカルでプレビューできます。
```bash
   pnpm changeset version
   ```
