# 開発ガイド

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> docs/guides/development.md: [docs/guides/development.md](../../../guides/development.md)
> 言語: 日本語 (ja)

## Forge ビルドのライフサイクル

Forge パッケージは、Vite と tsdown からの同じ遅延セッション コントラクトを使用します。キープする
呼び出し元所有のフレームワークまたは CMS 出力を構築することによって明示的にターゲットを選択する
プラグインを作成し、アダプター プラグインをネイティブ バンドラー構成にアタッチします。

```ts
import { tsdownForgeComponentPlugins } from "@mission-platform/vite-plugin-forge";
import { forgeVueFramework } from "@mission-platform/forge-plugin-vue";
import { defineTsdownLibrary } from "@mission-platform/tsdown-config";

export default defineTsdownLibrary({
  rootDir: import.meta.dirname,
  entry: "src/index.ts",
  plugins: tsdownForgeComponentPlugins({
    rootDir: import.meta.dirname,
    componentsModule: `${import.meta.dirname}/src/components/index.ts`,
    frameworks: [forgeVueFramework()],
    name: "Components",
  }),
});
```

構成評価は意図的に安価に行われています: グラフの検出、ソース
生成、ネイティブ バンドリング、宣言、およびパブリケーションはバンドラーから始まります
ライフサイクルフック。共有セッションは、選択された全体にわたって中立的な分析を再利用します。
監視モードが変更を報告するときに、逆依存をターゲットにして無効にします。

すべてのターゲットは分離された試行ディレクトリに書き込み、その後にのみ昇格されます。
そのマニフェスト、宣言、マップ、アセット、および生成されたモジュールが検証されます。あ
失敗、キャンセル、または不完全なビルドでは、試行のみが削除され、保存されます。
最後に成功した `dist/<target>` ツリーと兄弟ターゲット。

フックには `tsdownForgeHookPlugins` を使用します。 CMS プロジェクション用
`@mission-platform/forge-cms-plugin-api` から `tsdownForgeCmsPlugins`。しないでください
構成の構築中に生成ヘルパーを呼び出し、導入しません。
フレームワークはテーブルをニュートラル コンパイラに切り替えます。

## 検証

代表的なコンシューマーがビルドする前に、重点を置いた Forge スイートと CMS スイートを実行します。

```bash
pnpm --filter @mission-platform/vite-plugin-forge test
pnpm --filter @mission-platform/forge-cms-plugin-api test
pnpm --filter @mission-platform/vite-plugin-forge build
```

Forge スイートは、遅延ライフサイクル実行、決定論的なキャッシュ キー、
逆無効化、同時ターゲット調整、宣言/CSS アーティファクト
公開、マニフェストの安全性、および公開されたターゲット ディレクトリでのロールバック。
