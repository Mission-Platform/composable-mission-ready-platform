# ESLint 構成

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> packages/tooling/configs/eslint-config/docs/reference/eslint.md: [packages/tooling/configs/eslint-config/docs/reference/eslint.md](../../../reference/eslint.md)
> 言語: 日本語 (ja)

の `@mission-platform/eslint-config` パッケージは集中化されたフラットな機能を提供します ESLint モノリポジトリ全体の設定。

## 概要

ミッションプラットフォームは、 ESLint フラット コンフィグ形式 (`eslint.config.js`)。共有構成により一貫性が確保されます。
すべてのパッケージ、アプリケーション、ワーカーにわたるコードの品質、アクセシビリティ、アーキテクチャ ルール。

## 主な特長

- **TypeScript サポート**: 型認識型リンティング機能を搭載 `typescript-eslint`.
- **Vue 3 SFC**: 強制します `<script setup>` およびベストプラクティスを介して `eslint-plugin-vue`。
- **アクセシビリティ**: 組み込みのアクセシビリティ チェック Vue テンプレート付き `eslint-plugin-vuejs-accessibility`。
- **インポート組織**: インポートの自動分類と検証 `eslint-plugin-import-x`。
- **モノレポ認識**: との統合 `eslint-config-turbo` 環境変数が適切に宣言されていることを確認します。

## 組み込みプラグイン

設定には次のプラグインとルール セットが含まれます。

| プラグイン               | 目的                                               |
| :----------------------- | :------------------------------------------------- |
| `typescript-eslint`      | 標準 TypeScript ルールと型認識リンティング。       |
| `eslint-plugin-vue`      | Vue 3 SFC lint とテンプレートの検証。              |
| `eslint-plugin-sonarjs`  | コードの臭いとバグのリスクを検出します。           |
| `eslint-plugin-unicorn`  | 数十の小さくて便利なコミュニティ ルール。          |
| `eslint-plugin-i18next`  | 翻訳キーが正しく使用されていることを確認します。   |
| `eslint-config-prettier` | と競合するルールを無効にします Prettier 書式設定。 |

## 使用法

共有構成をワークスペースに適用するには、 `eslint.config.js` ワークスペースのルートにあるファイル:

```js
import baseConfig from '@mission-platform/eslint-config';

export default [
  ...baseConfig,
  // Add workspace-specific overrides here
];
```

## リンターの実行

Turborepo を使用して、1 つ以上のワークスペース全体で lint を実行します。

```bash
# Lint the entire monorepo
pnpm exec turbo run lint

# Lint a specific package
pnpm exec turbo run lint --filter <package-name>

# Automatically fix fixable issues
pnpm exec turbo run lint:fix
```
