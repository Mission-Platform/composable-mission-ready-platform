# ESLint 構成

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> packages/tooling/configs/eslint-config/docs/reference/eslint.md: [packages/tooling/configs/eslint-config/docs/reference/eslint.md](../../../reference/eslint.md)
> 言語: 日本語 (ja)

`@mission-platform/eslint-config` パッケージは、モノリポジトリ全体に対して一元化されたフラットな ESLint 構成を提供します。

## 概要

Mission Platform は、ESLint Flat Config 形式 (`eslint.config.js`) を使用します。共有構成により一貫性が確保されます。
すべてのパッケージ、アプリケーション、ワーカーにわたるコードの品質、アクセシビリティ、アーキテクチャ ルール。

## 主な特長

- **TypeScript サポート**: `typescript-eslint` による型認識リンティング。
- **Vue 3 SFC**: `<script setup>` と `eslint-plugin-vue` によるベスト プラクティスを適用します。
- **アクセシビリティ**: `eslint-plugin-vuejs-accessibility` を使用した Vue テンプレートの組み込みアクセシビリティ チェック。
- **インポート組織**: `eslint-plugin-import-x` によるインポートの自動並べ替えと検証。
- **Monorepo 認識**: 環境変数が適切に宣言されていることを確認するための `eslint-config-turbo` との統合。

## 組み込みプラグイン

設定には次のプラグインとルール セットが含まれます。

|プラグイン |目的 |
| :----------------------- | :----------------------------------------------------- |
| `typescript-eslint` |標準の TypeScript ルールと型認識リンティング。      |
| `eslint-plugin-vue` | Vue 3 SFC lint およびテンプレートの検証。             |
| `eslint-plugin-sonarjs` |コードの臭いとバグのリスクを検出します。                |
| `eslint-plugin-unicorn` |数十の小さくて便利なコミュニティ ルール。               |
| `eslint-plugin-i18next` |翻訳キーが正しく使用されていることを確認します。           |
| `eslint-config-prettier` | Prettier 形式と競合するルールを無効にします。 |

## 厳密な入力とルールの遵守

カスタム `missionTypeScriptPlugin` は、Mission Platform の厳密な型指定標準を強制する高速 AST 構文チェックを提供します。

|ルール |重大度 |目的 |
| :--------------------------------------------- | :------------------------------ | :------------------------------------------------------------------------------------------------------- |
| `@typescript-eslint/no-explicit-any` | `error` (`**/*.vue` の場合は `warn`) | `warn` が Vue SFC テンプレートに適用され、TypeScript コード (`error`) 全体で `any` キーワードを禁止します。 |
| `@typescript-eslint/prefer-satisfies` | `warn` |狭いリテラルを保持するには、`as` アサーションよりも `satisfies` を推奨し、`as any` を厳しく禁止します。  |
| `@typescript-eslint/no-unconstrained-generics` | `warn` |すべてのジェネリック型パラメーターで `extends` 制約を宣言する必要があります。                                 |
| `@typescript-eslint/no-implicit-unknown` | `warn` |エクスポートされた API 境界を越えた未検証の `unknown` の漏洩を禁止します。                                  |
| `@typescript-eslint/consistent-type-imports` | `error` |型のみのインポートに対してトップレベルの `import type` 宣言を必須とします。                                     |

## 使用法

共有構成をワークスペースに適用するには、ワークスペースのルートに `eslint.config.js` ファイルを作成します。

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
