# ミッションプラットフォームでのテスト

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> docs/testing.md: [docs/testing.md](../../testing.md)
> 言語: 日本語 (ja)

このドキュメントでは、Mission Platform モノリポジトリのテスト戦略とツールについて説明します。 **ハウツーとしても機能します
一般的なテスト タスクについてはガイド**、基礎となる構成については **テクニカル リファレンス**を参照してください。

## テストスタック

Mission Platform は、Vitest に基づく最新の統合テスト スタックを使用します。

- **Vitest**: 単体、コンポーネント、ブラウザベースのテストのための主要なテスト ランナー。
- **@vue/test-utils**: Vue コンポーネントをテストするための標準ライブラリ。
- **Vitest ブラウザ モード (Playwright)**: 設定されている場合、インタラクションとビジュアル テストのための実際のブラウザ実行。
- **Storybook Test Runner**: 自動インタラクション テストのための Storybook ストーリーと Vitest 間の統合。

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

CI `--affected` の動作に一致するローカル フィードバックを高速化するには:

```bash
pnpm exec turbo run test --affected
```

`--affected` は、リポジトリのベース リビジョンに関連して変更されたワークスペースのテスト タスクを選択します。毎回実行するには省略します
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

`v8` プロバイダーを使用してカバレッジ レポートを生成するには、次の手順を実行します。

```bash
pnpm --filter @mission-platform/components test:coverage
```

レポートは、各ワークスペース内の `coverage/` ディレクトリに出力されます。

## ハウツー: テストを書く

### 単体テストとコンポーネントテスト

テストはソース コードと同じ場所に配置され、`.spec.ts` (または `.spec.tsx`) 拡張子を使用します。

```typescript
import { mount } from "@vue/test-utils";
import { describe, it, expect } from "vitest";
import ForgeButton from "./ForgeButton.vue";

describe("ForgeButton.vue", () => {
  it("renders props.label when passed", () => {
    const label = "Click Me";
    const wrapper = mount(ForgeButton, {
      props: { label },
    });
    expect(wrapper.text()).toMatch(label);
  });

  it("emits click event when clicked", async () => {
    const wrapper = mount(ForgeButton);
    await wrapper.trigger("click");
    expect(wrapper.emitted()).toHaveProperty("click");
  });
});
```

### ブラウザのテスト

Mission Platform は、実際の DOM 環境またはクロスブラウザを必要とするテストに Vitest のブラウザ モードを利用します。
検証。

1. 通常どおりテスト ファイルを作成します。
2. パッケージ `vitest.config.ts` でブラウザ モードが有効になっていることを確認します (下記の「参考文献」を参照)。
3. `pnpm test` を使用して実行します。

### Web スクリプト テストの作成

決定論的コンパイラ、アーティファクト、Wasm、およびセルフホスト パリティには `@mission-platform/forge-web-script-vitest` を使用します
小切手。これは、本番環境で使用される同じコンパイラ サービスと Vite プラグインにコンパイルを委任します。それは作成しません
2番目のモジュールシステム。

`.fws` モジュールをテストするワークスペースにパッケージをインストールし、標準の Vitest 構成を使用してそのアダプターを構成します。

```typescript
// vitest.config.ts
import { defineForgeWebScriptVitestConfig } from "@mission-platform/forge-web-script-vitest";

export default defineForgeWebScriptVitestConfig({
  environment: "node",
  forgeWebScript: {
    root: import.meta.dirname,
    requestedCapabilities: ["clock.now"],
    selfHostedVmMode: "interpret",
  },
  overrides: {
    // Consumer plugins, aliases, and other Vite/Vitest settings remain active.
    resolve: { alias: { "@fixtures": "./fixtures" } },
  },
});
```

直接コンパイラおよびランタイム アサーションの場合は、スイートまたはテストごとに 1 つのハーネスを作成し、`afterEach` に破棄します。

```typescript
import { afterEach, describe, expect, it } from "vitest";
import {
  assertForgeWebScriptDiagnostic,
  assertForgeWebScriptNoDiagnostics,
  createForgeWebScriptTestHarness,
} from "@mission-platform/forge-web-script-vitest";

describe("FWS fixture", () => {
  const harness = createForgeWebScriptTestHarness({
    requestedCapabilities: ["clock.now"],
  });

  afterEach(() => harness.dispose());

  it("checks artifacts, Wasm exports, and explicit capabilities", async () => {
    const result = await harness.compile("valid/scalar.fws");
    assertForgeWebScriptNoDiagnostics(result.diagnostics);
    expect(result.artifact.manifest?.exports.map(({ name }) => name)).toEqual([
      "answer",
    ]);
    expect(
      (
        await harness.load<{ answer: () => number }>("valid/scalar.fws")
      ).answer(),
    ).toBe(42);

    const clock = await harness.load<{ current: () => bigint }>(
      "capabilities/clock-now.fws",
      {
        "clock.now": { now: () => 123n },
      },
    );
    expect(clock.current()).toBe(123n);
  });

  it("keeps diagnostic code, phase, and span structured", async () => {
    const result = await harness.inspect("diagnostics/invalid-type.fws");
    assertForgeWebScriptDiagnostic(result.diagnostics, {
      code: "FWS-TYPE-005",
      phase: "type-check",
      line: 2,
    });
  });
});
```

`load` および `loadSync` は、テストによって提供される機能インポートのみを受け入れます。申告された輸入品と供給品が欠落している
宣言されていないインポートは明示的に失敗します。ブラウザーまたは Node API は暗黙的に挿入されません。ソースインポートには `compileGraph` を使用します
リンク構成をテストするときに、グラフを作成し、`graphHash`、リンクされたモジュール、宣言、およびコンテンツ ハッシュを比較します。

アダプター パスは、Vitest が認識するように、生成された ESM コントラクトをテストします。

```typescript
import {
  abiManifest,
  load,
  loadSync,
  manifest,
} from "./fixtures/valid/scalar.fws";

expect(abiManifest).toEqual(manifest);
expect((await load<{ answer: () => number }>()).answer()).toBe(42);
expect(loadSync<{ answer: () => number }>().answer()).toBe(42);
```

FWS 値については、両方の層を明示的にテストします。生の WASM テストでは、次のことをアサートする必要があります。
ポインタ長の ABI と所有権の呼び出し。生成された ESM テストは、
JavaScript プロジェクション:

```typescript
const artifact = harness.compileSource(
  `
  export fn echo(value: string) -> string { return value; }
`,
  "strings.fws",
).artifact;

const generated = await importFromEsmSource(artifact.esmSource);
expect(generated.loadSync().echo("Δοκιμή 🚀")).toBe("Δοκιμή 🚀");
expect((await generated.load()).echo("")).toBe("");
```

生成されたローダー境界テストでは、ASCII、空、マルチバイト UTF-8、
返された連結、文字列機能インポート、生の `bytes` タプル、および
公開された `memory`。致命的な UTF-8 フィクスチャを使用し、一時的な UTF-8 フィクスチャをアサートします。
`fws_dealloc` 呼び出しは、正常な復帰、ゲスト トラップ、ホスト例外、
そしてデコードの失敗。生成された `artifact.esmSource` を前に計測します
それを輸入する。ロード後にエクスポートにパッチを適用すると、次のラッパーが観察されません。
元のアロケータとデアロケータを閉じます。

生成されたアダプターは、1 つの呼び出しに対するすべての文字列引数を 1 つにパックします。
ゲストの割り当て。関数の割り当て数アサーションを保持します。
複数の文字列パラメーターを使用し、スカラーのみのテストを保持して、
文字列マーシャリング作業は数値のみの関数に対して生成されます。バイトテスト
を期待するのではなく、`[pointer, length]` タプルを渡し続ける必要があります。
自動 `Uint8Array` 変換。

ベンチマーク ワークスペースは、生のポインター長アダプターと
別個の FWS モードとして生成された ESM アダプター:

```bash
pnpm --filter @mission-platform/benchmark run bench -- \
  --node-only --warmup 3 --samples 10 \
  --output benchmark/results/fws-generated-boundary
```

レポートには、ビルド、初期化、定常状態の実行フェーズが含まれます。の
FWS raw `wasm` 行は、新しいインスタンスと 3 つの文字列入力割り当てを使用します。
ベンチマークカーネル。 `wasm-generated` は生成された `loadSync` コントラクトを使用します
そして 1 つのパックされた文字列入力割り当て。現在のゲスト割り当て解除機能があるため、
バンプアロケータスペース、生成された文字列/バイトをリサイクルせずに範囲を検証します
サンプルでは、呼び出しごとに新しいローダー インスタンスが使用されます。スカラーサンプルはロードされたサンプルを再利用します
インスタンス。これにより、割り当ての多いサンプルがそれぞれ分離され、意図的に
永続インスタンスの要求ではなく、ローダー境界のオーバーヘッドとして報告されます。
各アーティファクトは、生の Wasm バイト、生成された ESM ソース バイト、コンテンツ ハッシュ、
および比較で使用される静的割り当て数。行のみを比較する
コーパス ハッシュ、ホスト ランタイム、ベンチマーク スキーマが一致する場合。

たとえば、上記の Node のみを実行すると、次の 336 個の測定位相結果が生成されました。
失敗はゼロで、コーパス ハッシュは `ad092f7c552cc914` です。両方の FWS 行に生の Wasm が含まれていました
ハッシュ `0ac58f11`、生の Wasm サイズ 1,625 バイト、生成された ESM ソース サイズ 18,490
バイト;生の文字列と生成された文字列の入力割り当て数は 3 と 1 でした。
Unicode の小さい文字列の場合、平均初期化時間は raw と比較して 0.00024 ms でした
0.00188 ミリ秒が生成され、平均実行時間は生の場合は 0.0236 ミリ秒でしたが、0.1070 ミリ秒でした。
記録された Node 実行で生成されます。これらの数字は代表的な証拠ですが、
マシン間のパフォーマンスは保証されません。レポートのケースごとのサンプルを使用する
比較用に。

このプラグインは、`?forge-web-script-manifest`、`?forge-web-script-declarations`、
`?forge-web-script-wasm`、`?forge-web-script-source-map`。これらのアンビエント モジュールを TypeScript で検出できるようにするには、
出荷された宣言のサブパスをテスト プロジェクトのタイプに追加します。

```json
{
  "compilerOptions": {
    "types": [
      "node",
      "@mission-platform/forge-web-script-vitest/forge-web-script"
    ]
  }
}
```

あるいは、`/// <reference types="@mission-platform/forge-web-script-vitest/forge-web-script" />` をテスト専用に追加します
プロジェクトに含まれるエントリポイントを入力します。宣言のサブパスは型のみであり、実行時インポートは追加されません。

クロスパッケージ言語と ABI 準拠のために、`packages/forge-web-script-vitest/fixtures/` の共有フィクスチャを使用します。
`valid/`、`diagnostics/`、`capabilities/`、`graphs/`、および `self-hosted/` は意図的に安定しています。備品を横に置いておく
コンパイラ、ランタイム、またはプラグインの仕様がプライベート実装の詳細をカバーする場合。小さなパーサーにはインラインソースを使用するか、
VMユニットケース。これにより、ハーネスを介した低レベルのテストを強制することなく、フィクスチャ名とクリーンアップが確定的に保たれます。

`checkVmParity(file, mode)` は `interpret`、`jit`、および `aot` をサポートしますが、そのレポートは既存の制限された自己ホスト型レポートです。
lex 段階のパリティ契約。 `parity`、フィンガープリント、ステップ、および AOT 再現性メタデータをアサートします。報告書を扱わないでください
任意のコンパイル済み FWS VM の実行として、または Wasm 動作テストの代替として。

通常のワークスペース タスクを使用して、フォーカスされた FWS マトリックスを実行します。

```bash
pnpm exec turbo run test build:check --filter @mission-platform/forge-web-script-vitest
pnpm exec turbo run test build:check --filter @mission-platform/forge-web-script
pnpm exec turbo run test build:check --filter @mission-platform/forge-web-script-runtime
pnpm exec turbo run test build:check --filter @mission-platform/vite-plugin-forge-web-script
```

## 技術リファレンス

### 共有構成

ほとんどのワークスペースは、`@mission-platform/vite-config` の `defineVitestConfig` ユーティリティを使用します。これにより、標準化された
環境:

- **環境**: デフォルトでは `jsdom`。
- **グローバル**: 有効 (必要な場合を除き、`describe`、`it`、`expect` をインポートする必要はありません)。
- **プラグイン**: `@vitejs/plugin-vue` および i18n ブロック無視が含まれます。
- **対象範囲**: 事前構成された `v8` プロバイダー。

**`vitest.config.ts` の例:**

```typescript
import { defineVitestConfig } from "@mission-platform/vite-config/vitest";

export default defineVitestConfig({
  overrides: {
    // Package-specific overrides
  },
});
```

### ディレクトリ構造

- `src/**/*.spec.ts`: 単体テストとコンポーネント テスト。
- `src/**/*.stories.tsx`: ストーリーブックのストーリー (インタラクション テストの定義としても使用されます)。
- `apps/storybook/vitest.config.ts`: ブラウザベースの対話テストのメイン構成。

### スクリプトの概要

|スクリプト |コマンド |目的 |
| :-------------- | :--------------------------------------------------------- | :------------------------------------- |
| `test` | `pnpm exec turbo run test` |すべてのワークスペース テスト タスクを実行します。          |
| `test:watch` | `pnpm --filter @mission-platform/components test:watch` |監視モードでコンポーネントのテストを実行します。    |
| `test:coverage` | `pnpm --filter @mission-platform/components test:coverage` |コンポーネント カバレッジ レポートを生成します。 |
|錆/WASM | `cargo test --workspace` |ネイティブ Rust クレート テストを実行します。           |

Wasm ラッパー パッケージは、所有するパッケージ タスクを通じてテストされます。たとえば、スキャナー パッケージとその
スキャナーの動作を変更する場合は、ラッパーを一緒に使用します。

```bash
pnpm exec turbo run test --filter @mission-platform/code-scanner...
```

## 関連ドキュメント

- [開発セットアップ](development-setup.md)
- [ベストプラクティス](best-practices.md)
- [パッケージ開発](package-development.md)
