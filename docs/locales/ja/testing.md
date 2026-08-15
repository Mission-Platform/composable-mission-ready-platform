# ミッションプラットフォームでのテスト

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> 英語の原典: [docs/testing.md](../../testing.md)
> 言語: 日本語 (ja)

このドキュメントでは、Mission Platform モノリポジトリのテスト戦略とツールについて説明します。 **ハウツーとしても機能します
一般的なテスト タスクについてはガイド**、基礎となる構成については **テクニカル リファレンス**を参照してください。

## テストスタック

Mission Platform は、以下に基づいた最新の統合テスト スタックを使用します。 Vitest:

- **Vitest**: 単体、コンポーネント、ブラウザベースのテストのための主要なテスト ランナー。
- **@vue/test-utils**: テスト用の標準ライブラリ Vue コンポーネント。
- **Vitest ブラウザ モード (Playwright)**: 設定されている場合、インタラクションとビジュアル テストのための実際のブラウザ実行。
- **ストーリーブック テスト ランナー**: ストーリーブックのストーリーとストーリーブックの統合 Vitest 自動インタラクションテスト用。

## ハウツー: テストを実行する

テストは Turborepo 経由で実行され、キャッシュとワークスペース対応の実行を活用します。

### すべてのテストを実行する

モノリポジトリ全体にわたってすべての単体テストとコンポーネント テストを実行するには:

```bash
pnpm test
```

### 特定のワークスペースのテストを実行する

単一のパッケージまたはアプリケーションのテストを実行するには:

```bash
pnpm exec turbo run test --filter @mission-platform/<name>
```

### 影響を受けるテストの実行 (CI スタイル)
CI に一致するより迅速なローカル フィードバックを実現するため `--affected` 行動：

```bash
pnpm exec turbo run test --affected
```

`--affected` リポジトリのベース リビジョンに関連して変更されたワークスペースのテスト タスクを選択します。毎回実行するには省略します
ワークスペースのテストタスク。適用範囲はパッケージによって異なります。たとえば、コンポーネント パッケージでは次のものが提供されます。

```bash
pnpm --filter @mission-platform/components test:coverage
```

### ウォッチモード
開発の場合は、監視モードを使用してファイル変更のテストを再実行します。

```bash
pnpm --filter @mission-platform/components test:watch
```

### カバレッジレポート

を使用してカバレッジ レポートを生成するには、 `v8` プロバイダー:

```bash
pnpm --filter @mission-platform/components test:coverage
```

レポートは次の場所に出力されます。 `coverage/` 各ワークスペース内のディレクトリ。

## ハウツー: テストを書く

### 単体テストとコンポーネントテスト

テストはソース コードと同じ場所に配置され、 `.spec.ts` （または `.spec.tsx`) 拡大。

```typescript
import { mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';
import ForgeButton from './ForgeButton.vue';

describe('ForgeButton.vue', () => {
  it('renders props.label when passed', () => {
    const label = 'Click Me';
    const wrapper = mount(ForgeButton, {
      props: { label }
    });
    expect(wrapper.text()).toMatch(label);
  });

  it('emits click event when clicked', async () => {
    const wrapper = mount(ForgeButton);
    await wrapper.trigger('click');
    expect(wrapper.emitted()).toHaveProperty('click');
  });
});
```

### ブラウザのテスト

ミッションプラットフォームが活用する Vitest実際の DOM 環境またはクロスブラウザを必要とするテスト用のブラウザ モード
検証。

1. 通常どおりテスト ファイルを作成します。
2. パッケージを確認してください `vitest.config.ts` ブラウザ モードを有効にします (下記の参考資料を参照)。
3. 一緒に走る `pnpm test`.

## 技術リファレンス

### 共有構成

ほとんどのワークスペースでは、 `defineVitestConfig` からのユーティリティ `@mission-platform/vite-config`。これにより、標準化された
環境:

- **環境**： `jsdom` デフォルトでは。
- **グローバル**: 有効 (インポートする必要はありません) `describe`, `it`, `expect` 希望しない限り）。
- **プラグイン**: 含まれています `@vitejs/plugin-vue` i18n ブロックは無視されます。
- **適用範囲**: 事前設定済み `v8` プロバイダー。

**例 `vitest.config.ts`:**

```typescript
import { defineVitestConfig } from '@mission-platform/vite-config/vitest';

export default defineVitestConfig({
  overrides: {
    // Package-specific overrides
  }
});
```

### ディレクトリ構造

- `src/**/*.spec.ts`: 単体テストとコンポーネント テスト。
- `src/**/*.stories.tsx`: ストーリーブックのストーリー (インタラクション テストの定義としても使用されます)。
- `apps/storybook/vitest.config.ts`: ブラウザベースのインタラクション テストの主な構成。

### スクリプトの概要

|スクリプト |コマンド |目的 |
|:----------------|:--------------------------|:--------------------------------------------|
| `test`          | `pnpm exec turbo run test`                              |すべてのワークスペース テスト タスクを実行します。            |
| `test:watch`    | `pnpm --filter @mission-platform/components test:watch` |監視モードでコンポーネントのテストを実行します。      |
| `test:coverage` | `pnpm --filter @mission-platform/components test:coverage` |コンポーネント カバレッジ レポートを生成します。 |
|錆/WASM | `cargo test --workspace` |ネイティブ Rust クレート テストを実行します。 |

Wasm ラッパー パッケージは、所有するパッケージ タスクを通じてテストされます。たとえば、スキャナー パッケージとその
スキャナーの動作を変更する場合は、ラッパーを一緒に使用します。

```bash
pnpm exec turbo run test --filter @mission-platform/code-scanner...
```

## 関連ドキュメント

- [開発セットアップ](development-setup.md)
- [ベストプラクティス](best-practices.md)
- [パッケージ開発](package-development.md)
