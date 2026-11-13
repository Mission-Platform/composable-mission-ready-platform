# ビルドシステム

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> docs/build-system.md: [docs/build-system.md](../../build-system.md)
> 言語: 日本語 (ja)

このドキュメントでは、Mission Platform のビルド システムのアーキテクチャと仕組みについて説明します。高い用途向けに設計されています
パフォーマンス、増分ビルド、およびマルチフレームワーク パッケージの配布。

## コアアーキテクチャ

Mission Platform は、タスク オーケストレーションを個々のワークスペースのコンパイルから分離する階層型ビルド システムを使用します。

### 1. タスクオーケストレーション（ターボレポ）

**Turborepo** はトップレベルのオーケストレーターです。ワークスペース間の依存関係グラフを管理し、ワークスペースのキャッシュを提供します。
すべてのタスク。

- **`turbo.json` で定義されたパイプライン**: `build`、`test`、`lint` などのタスクは、依存関係とともに定義されます。
  (たとえば、`build` は `^build` に依存しています。つまり、すべての依存関係を最初に構築する必要があります)。
- **ハッシュ**: Turborepo はソース ファイル、環境変数、およびグローバル依存関係をハッシュして、タスクが適切かどうかを判断します。
  出力はキャッシュから再利用できます。
- **並列処理**: CPU 使用率を最大化するために、独立したタスクが同時に実行されます。

### 2. パッケージのコンパイル (tsdown)

`packages/` のほとんどのライブラリ パッケージはコンパイルに **tsdown** を使用します。

- **速度**: **Rolldown** (Rollup の Rust ベースの後継) の上に構築され、ほぼ瞬時のビルドを提供します。
- **バンドル解除**: パッケージは `unbundle: true` でビルドされ、`dist/` の元のモジュール構造が維持されます。これ
  コンシューマ アプリケーションでの最適なツリーシェイキングとより優れたデバッグを保証します。
- **CSS スレッド**: カスタム プラグインは、抽出されたスタイルシートを所有する JS モジュールに再リンクし、
  コンポーネントをインポートすると、そのスタイルが自動的に取り込まれます。

### 3. アプリケーションのバンドル (Vite)

`apps/` のデプロイ可能なアプリケーションは、開発および運用バンドルに **Vite** を使用します。

- **共有構成**: アプリは `@mission-platform/vite-config` を拡張して、一貫性のある PostCSS パイプラインと
  フレームワークに依存しない解決策。
- **SSR/SSG サポート**: `my-care-notes` のようなアプリケーションは、静的サイトの生成に `vite-ssg` を使用します。

### パッケージビルドをフォージする

Forge パッケージ ビルドは、通常の `tsdown` または Vite フローに中立的なコンパイラ フロント エンドを追加します。消費パッケージのインポート
必要なフレームワーク プラグインを指定し、明示的なインスタンスを `tsdownForgeComponentPlugins` に渡すか、
1 つの `defineTsdownLibrary` 呼び出し内の `tsdownForgeHookPlugins`。ニュートラル ドライバーはセマンティック IR を一度作成し、その後、選択されたプラグインがターゲットを引き下げます。
ソース生成、宣言、ランタイム外部、およびそのネイティブ Vite/tsdown アダプター。

コンテンツ プラットフォームの出力は、`@mission-platform/forge-cms-plugin-api` によって構成された 2 番目の直交軸です。あ
コンシューマーは `tsdownForgeCmsPlugins` に `CmsOutputPlugin` インスタンスのリストを渡します。
フレームワーク プラグインを_構成する_ — `forgeStoryblokCms({ packageName, plugin, storyblokRuntime })`、
Ghost、Jekyll、Webflow の場合は `forgeAstroCms({ packageName, plugin })` など。なぜなら、プラットフォームと
フレームワークは独立して選択され、`storyblok × vue` と `astro × solid` は新しいコードではなく構成です。

CMS ビルドは `dist/cms/<cms>/<framework>/**` に出力され、マニフェストおよび他のプラットフォーム サイドカーがミラーリングされます。
`dist/cms/<cms>/`。ハイドレート ランタイム (Astro、Webflow) を必要とするターゲットは、バインドされたアイランド ツリーを共同生成します。
フレームワーク プラグインを同じビルドに追加します。完全な責任分割と段階の境界については、次のとおりです。
[Forge コンパイラ パイプライン](../../../packages/tooling/vite/forge/docs/locales/ja/reference/compiler.md)。

## 構築契約

`pnpm build` 正規の集約ビルドです。委任先 Turboのパッケージレベル `build` を設定しないタスク
フレームワーク セレクターにより、すべての Forge パッケージがそのニュートラル出力と、それによって構成されたすべてのフレームワーク ターゲットを出力します。
パッケージ。 CMS プロジェクションを含むパッケージは、それらのプロジェクションとその共有サイドカーを同じステージングされたビルドで出力します。

```bash
pnpm build
pnpm build:force                 # the same aggregate build, ignoring Turbo's cache
pnpm exec turbo run build --filter @mission-platform/components
```

Forge パッケージは、1 つのターゲットを再構築するためのシン互換エイリアスも保持します。

```bash
pnpm --filter @mission-platform/components run build:forge
pnpm --filter @mission-platform/components run build:vue
pnpm --filter @mission-platform/components run build:react
pnpm --filter @mission-platform/components run build:svelte
pnpm --filter @mission-platform/components run build:solid
pnpm --filter @mission-platform/components run build:web-components
```

エイリアスは、`build` と同じ型指定されたランナーを使用します。これらには、独立した `tsdown` 実装は含まれません。 `build:forge`
はニュートラル ターゲットを選択し、フレームワーク エイリアスは対応するフレームワーク ディレクトリを選択します。パッケージ固有
CMS アーティファクト モード コマンドは、共有 Storyblok アセット コマンドや
フレームワークごとの Storyblok ラッパー コマンド。

### ステージングとプロモーション

Forge を呼び出すたびに、`node_modules/.cache/forge-build/` の下の一意のパッケージローカル ステージに書き込みます。舞台は
Turbo の入力では無視され、公開されることはありません。ビルドが成功すると、昇格前に出力がチェックされます。

- **集約モード** は、Forge が所有する完全な `dist` ツリーをアトミックに置き換えます。古いニュートラル ファイル、フレームワーク ファイル、および CMS ファイル
  したがって、エクスポートを誤って満たすのではなく、削除されます。
- **ターゲット モード** は、選択したフレームワーク サブツリー (およびそれに一致する CMS ラッパー サブツリー) のみをアトミックに置き換えます。
  `dist` には、関連性のないニュートラル、フレームワーク、電子メール、および CMS 出力がすでに保存されています。ランナーは CMS セレクターをスコープします
  (例: `FORGE_CMS_STORYBLOK_TARGET`) `FORGE_FRAMEWORK_TARGET` とともに要求されたフレームワークに追加されるため、パッケージの CMS
  配線 (`forgeStoryblokCmsTargets` など) は、一致するラッパーを実際に再構築するのではなく、同じステージで再構築します。
  黙って昇進から外された。プロモーションは、ステージが再生成した CMS ラッパー サブツリーのみをクリアします。それは決してありません
  現在のビルドで再構築されなかった兄弟 CMS ラッパーを削除します。
- Storyblok スキーマや `components.json` などの CMS 共有アセットには共有宛先があり、削除されません。
  後のフレームワークのプロモーション。
- コンパイラの失敗、空のステージ、またはプロモーションの失敗により、以前に公開されたツリーはそのまま残り、
  仮ステージとプロモーションディレクトリ。

公開された出力は、既存の `dist` 契約の下に残ります: 中立モジュールと宣言、フレームワーク ディレクトリ
(`vue`、`react`、`svelte`、`solid`、`web-components`)、および `cms/<cms>/<framework>` の CMS プロジェクション。パッケージのエクスポート
`mp:*` 条件や CMS サブパスを含むマップは、これらの昇格されたパスに対して引き続き解決されます。

### タスクをパッケージ化する

|タスク |説明 |
| :----------------------------------------- | :----------------------------------------------------------------------------------------------------------- |
| `build` |共有 Forge ランナーを介して、ニュートラル、フレームワーク、宣言、電子メール、および構成された CMS 出力を集約します。 |
| `build:forge` |対象となるニュートラルな Forge 出力互換性エイリアス。                                                           |
| `build:react`、`build:vue`、`build:svelte` |対象となるフレームワーク互換性のエイリアス。                                                                    |
| `build:solid`、`build:web-components` |対象となるフレームワーク互換性のエイリアス。                                                                    |
| `build:check` |出力を公開せずにワークスペースの型を検証します。                                                   |
| `build:watch` |ワークスペースの監視モードで増分ビルドを開始します。                                                   |

Turbo は、ターゲット セレクター (`FORGE_BUILD_TARGET` および従来の Forge/CMS セレクター) を共有
ランナーおよびステージング ソース。したがって、集約ビルドとターゲット ビルドは相互にキャッシュされた結果を再利用できません。ファイナル
`dist/**` 出力はキャッシュされます。一時的なステージング ディレクトリとプロモーション ディレクトリは明示的に除外されます。

### アプリケーションのビルド段階

独立して意味のあるビルド ステージを持つアプリケーションは、それらのステージをチェーンではなく Turbo タスクとして公開します。
`build` 内にあるもの:

- `@mission-platform/docs` は、`build:check`、`build:bundle`、`build:prerender`、`build:verify` を順番に実行します。
- `@mission-platform/figma-forge-plugin` は、集約 `build` タスクを通じて `build:check`、`build:ui`、および `build:main` を実行します。
- `@mission-platform/icons` は、集約 `build` タスクを通じて `build:check`、`build:generate`、および `build:sprite` を実行します。

集約スクリプトは、タスク所有の出力が存在することのみを検証します。 Turbo は、スケジューリング、依存関係の順序付け、および
キャッシュの復元。これにより、個々のステージが監視可能に保たれ、ネストされた Turbo 呼び出しやシェルレベルのビルドが回避されます。
オーケストレーション。

### キャッシュ戦略

Turborepo は次のアーティファクトをキャッシュします。

- `dist/**`: 構築された JS/CSS アーティファクト。
- `.vite/**`: Vite の内部キャッシュ。
- `coverage/**`: テスト カバレッジ レポート。

キャッシュをバイパスして新規ビルドを強制するには、`--force` フラグを使用します。

```bash
pnpm build:force
```

宣言のみのタスクもキャッシュ可能です。`build:types` は `dist/**/*.d.ts` と宣言マップを出力として記録します。
ターゲット タイプのビルドは、ダウンストリーム パッケージに必要なファイルを復元します。

互換性エイリアスと CMS アーティファクト モード タスクはパッケージ タスクであるため、Turbo は引き続き依存関係グラフを適用し、
ターゲット固有のキャッシュ入力。一時ステージはキャッシュ出力ではありません。昇格された `dist` ツリーのみが公開されるか、
キャッシュから復元されました。

## 共有構成

モノリポジトリ全体で一貫性を維持するために、ビルド構成は `packages/tooling/configs/` ディレクトリに集中されます。

|パッケージ |目的 |
| :------------------------------------ | :----------------------------------------------------------- |
| `@mission-platform/vite-config` |アプリおよび Vue 固有のビルド用の共有 Vite ロジック。          |
| `@mission-platform/tsdown-config` |ライブラリ パッケージの共有 tsdown ロジック。                    |
| `@mission-platform/typescript-config` |アプリ、ライブラリ、テスト用のベース `tsconfig.json` プリセット。 |
| `@mission-platform/postcss-config` |標準化された CSS 処理 (オートプレフィクサーなど)。            |

## TypeScript 7 ツールチェーン

ワークスペース カタログは、コンパイラを安定した TypeScript `7.0.2` に固定します。ワークスペースのチェックと宣言のビルドでは、
ネイティブの `tsc` 実行可能ファイルですが、エディターの統合では TypeScript のネイティブ言語サーバーが使用されます。

```bash
pnpm exec tsc --version
pnpm exec tsc --lsp --stdio
```

`@mission-platform/typescript-config` の共有プリセットは、ターゲット、モジュール解像度、
アンビエント型、厳密性、プロジェクト参照、および宣言出力。 Forge および CMS ツールは、削除された
TypeScript コンパイラ API。代わりに、リポジトリが所有するパーサーニュートラル/OXC コントラクトを使用します。この境界はまた力を与えます
パッケージ ドキュメント スキャナーを使用し、生成された Forge 出力をコンパイラー API 内部とは独立して保持します。

コンパイルされた JavaScript および宣言ファイルは、所有するパッケージの `dist` ディレクトリにのみ出力されます。 Forgeが生成した
フレームワーク ソース ツリーは一時的なビルド入力であり、バンドルが完了すると削除されます。 `*.js` または
`src` またはパッケージ レベルのキャッシュ ディレクトリの下にある `*.d.ts` ファイル。

Vue ターゲット パッケージ宣言は、Forge `tsdown` 宣言プラグインによって合成されます。このパスはパッケージを出力します
`vue-tsc` を呼び出さない宣言。任意のアプリケーション SFC テンプレートの型チェックは提供されません。
アプリケーション SFC チェックは引き続き明示的な受け入れゲートであり、現在はアップストリームの TypeScript 7 互換が必要です。
`vue-tsc` リリース。使用可能な `vue-tsc@3.3.11` は、TypeScript `7.0.2` に対して失敗します。
`typescript/lib/tsc` の場合は `ERR_PACKAGE_PATH_NOT_EXPORTED` ですが、ネイティブ `tsc` は意図的に `.vue` の型チェックを行いません。
ファイル。この境界を回避するために TypeScript 6 互換エイリアスを追加しないでください。

共有 ESLint 構成は、TypeScript、TSX、および Vue 構文に `@babel/eslint-parser` を使用し、小規模な
保持される `@typescript-eslint/no-explicit-any` およびリポジトリ所有の互換性プラグイン
`@typescript-eslint/consistent-type-imports` ルール ID。これは意図的に構文のみです: 現在の
`typescript-eslint` リリースは TypeScript 7 を拒否するため、型認識 lint ルールは共有 TypeScript に置き換えられます。
`noUnusedLocals` および `noUnusedParameters` は、互換性のあるアップストリーム リリースが利用可能になるまでチェックします。

## ローカル開発と生産

### 開発 (`dev` タスク)

Vite の開発サーバーは、ホット モジュール交換 (HMR) を提供します。アプリの `dev` タスクが開始されると、Turborepo も実行されます
コンポーネント ライブラリの `build:watch` タスクが (タスクの `with` キーを介して) 横にあるため、次のように編集されます。
`@mission-platform/components` は自動的に再コンパイルされ、手動で再構築しなくても、実行中のアプリによって取得されます。

### 実稼働 (`build` タスク)

Turborepo はトポロジ順にビルドを実行します。パッケージは、その内部依存関係がすべて完了した後にのみビルドされます。
無事に構築されました。 `dist/` の出力は、最終的に公開またはデプロイされるものです。

## 上級: WASM の統合

特定のパッケージ (`@mission-platform/hunspell`、バーコード スキャナーなど) には、WebAssembly にコンパイルされた Rust コードが含まれています。これら
ビルドは、環境の一貫性と最適性を確保するために、`wasm-pack` を使用する特殊なタスクによって調整されます。
パフォーマンス。
