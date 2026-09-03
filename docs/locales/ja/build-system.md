# ビルドシステム

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> docs/build-system.md: [docs/build-system.md](../../build-system.md)
> 言語: 日本語 (ja)

このドキュメントでは、Mission Platform のビルド システムのアーキテクチャと仕組みについて説明します。高い用途向けに設計されています
パフォーマンス、増分ビルド、およびマルチフレームワーク パッケージの配布。

## コアアーキテクチャ

Mission Platform は、タスク オーケストレーションを個々のワークスペースのコンパイルから分離する階層型ビルド システムを使用します。

### 1.タスクオーケストレーション（ターボレポ）

**Turborepo** はトップレベルのオーケストレーターです。ワークスペース間の依存関係グラフを管理し、ワークスペースのキャッシュを提供します。
すべてのタスク。

- **で定義されたパイプライン `turbo.json`**: のようなタスク `build`, `test`、 そして `lint` 依存関係を使用して定義されます
  (例: `build` に依存します `^build`つまり、すべての依存関係を最初に構築する必要があります)。
- **ハッシュ**: Turborepo はソース ファイル、環境変数、およびグローバル依存関係をハッシュして、タスクが適切かどうかを判断します。
  出力はキャッシュから再利用できます。
- **並列処理**: CPU 使用率を最大化するために、独立したタスクが同時に実行されます。

### 2. パッケージのコンパイル (tsdown)

ほとんどのライブラリ パッケージ `packages/` コンパイルには **tsdown** を使用してください。

- **速度**: **Rolldown** (Rollup の Rust ベースの後継) の上に構築され、ほぼ瞬時のビルドを提供します。
- **バンドル解除**: パッケージは以下を使用して構築されます `unbundle: true`、元のモジュール構造を維持します。 `dist/`。これ
  コンシューマ アプリケーションでの最適なツリーシェイキングとより優れたデバッグを保証します。
- **CSS スレッド**: カスタム プラグインは、抽出されたスタイルシートを所有する JS モジュールに再リンクし、
  コンポーネントをインポートすると、そのスタイルが自動的に取り込まれます。

### 3. アプリケーションのバンドル (Vite)

デプロイ可能なアプリケーション `apps/` 使用 **Vite** 開発と実稼働のバンドル用。

- **共有構成**: アプリの拡張 `@mission-platform/vite-config` 一貫した PostCSS パイプラインを確保するため、
  フレームワークに依存しない解決策。
- **SSR/SSG サポート**: のようなアプリケーション `my-care-notes` 使用 `vite-ssg` 静的サイト生成用。

### パッケージビルドをフォージする

Forge パッケージ ビルドは、通常のコンパイラ フロント エンドに中立的なコンパイラ フロント エンドを追加します。 `tsdown` または Vite 流れ。消費パッケージのインポート
必要なフレームワーク プラグインに明示的なインスタンスを渡す `defineTsdownForgeComponents` または
`defineTsdownForgeHooks`。ニュートラル ドライバーはセマンティック IR を一度作成し、その後、選択されたプラグインがターゲットを引き下げます。
ソース生成、宣言、ランタイム外部、およびそのネイティブ Vite/tsdown アダプター。

コンテンツ プラットフォームの出力は、次のように構成された 2 番目の直交軸です。 `@mission-platform/forge-cms-plugin-api`。あ
消費者向けパス `defineTsdownForgeCms` （または `defineTsdownForgeCmsAll`) のリスト `CmsOutputPlugin` インスタンスのそれぞれ
フレームワーク プラグインを_構成する_ — `forgeStoryblokCms({ packageName, plugin, storyblokRuntime })`,
`forgeAstroCms({ packageName, plugin })`Ghost、Jekyll、Webflow などについては同様です。なぜなら、プラットフォームと
フレームワークは独自に選択され、 `storyblok × vue` そして `astro × solid` 新しいコードではなく設定です。

CMS ビルドの出力先 `dist/cms/<cms>/<framework>/**`、マニフェストと他のプラットフォームのサイドカーがミラーリングされたもの
`dist/cms/<cms>/`。ハイドレート ランタイム (Astro、Webflow) を必要とするターゲットは、バインドされたアイランド ツリーを共同生成します。
フレームワーク プラグインを同じビルドに追加します。完全な責任分割と段階の境界については、次のとおりです。
[Forge コンパイラ パイプライン](../../../packages/tooling/vite/forge/docs/locales/ja/reference/compiler.md).

## 構築契約

`pnpm build` 正規の集約ビルドです。委任先 Turboのパッケージレベル `build` を設定しないタスク
フレームワーク セレクターにより、すべての Forge パッケージがニュートラル出力と、それによって構成されたすべてのフレームワーク ターゲットを出力します。
パッケージ。 CMS プロジェクションを含むパッケージは、同じステージングされたビルドでそれらのプロジェクションとその共有サイドカーを出力します。

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

エイリアスは、次と同じタイプのランナーを使用します。 `build`;独立したものは含まれていません `tsdown` 実装。 `build:forge`
はニュートラル ターゲットを選択し、フレームワーク エイリアスは対応するフレームワーク ディレクトリを選択します。パッケージ固有
CMS アーティファクト モード コマンドは、共有 Storyblok アセット コマンドや
フレームワークごとの Storyblok ラッパー コマンド。

### ステージングとプロモーション

Forge を呼び出すたびに、次の固有のパッケージローカル ステージに書き込みます。 `node_modules/.cache/forge-build/`。舞台は
によって無視されました Turboの入力であり、公開されることはありません。ビルドが成功すると、昇格前に出力がチェックされます。

- **集約モード** は、Forge が所有する完全なモードをアトミ​​ックに置き換えます。 `dist` 木。古いニュートラル ファイル、フレームワーク ファイル、および CMS ファイル
  したがって、エクスポートを誤って満たすのではなく、削除されます。
- **ターゲット モード** は、選択したフレームワーク サブツリー (およびそれに一致する CMS ラッパー サブツリー) のみをアトミックに置き換えます。
  すでに存在している無関係なニュートラル、フレームワーク、電子メール、および CMS 出力を保持する `dist`。ランナーは CMS セレクターをスコープします
  (例: `FORGE_CMS_STORYBLOK_TARGET`) 要求されたフレームワークに合わせて `FORGE_FRAMEWORK_TARGET`、つまりパッケージの CMS
  配線（`forgeStoryblokCmsTargets`、など）実際には、一致するラッパーを同じステージで再構築するのではなく、
  黙って昇進から外された。プロモーションは、ステージが再生成した CMS ラッパー サブツリーのみをクリアします。それは決してありません
  現在のビルドが再構築しなかった兄弟 CMS ラッパーを削除します。
- Storyblok スキーマなどの CMS 共有アセット `components.json` 宛先が共有されており、他のユーザーによって削除されません。
  後のフレームワークのプロモーション。
- コンパイラの失敗、空のステージ、またはプロモーションの失敗により、以前に公開されたツリーはそのまま残り、
  仮ステージとプロモーションディレクトリ。

公開された出力は既存の `dist` コントラクト: 中立的なモジュールと宣言、フレームワーク ディレクトリ
(`vue`, `react`, `svelte`, `solid`, `web-components`)、および以下の CMS プロジェクション `cms/<cms>/<framework>`。パッケージのエクスポート
マップを含む `mp:*` 条件と CMS サブパスは、これらの昇格されたパスに対して引き続き解決されます。

### タスクをパッケージ化する

|タスク |説明 |
| :------------ | :------------------------------------------------------------------------------------------------------- |
| `build`       |共有 Forge ランナーを通じて、ニュートラル、フレームワーク、宣言、電子メール、および構成された CMS 出力を集約します。 |
| `build:forge` |対象となるニュートラルな Forge 出力互換性エイリアス。                                                      |
| `build:react`, `build:vue`, `build:svelte` |対象となるフレームワーク互換性エイリアス。                                      |
| `build:solid`, `build:web-components` |対象となるフレームワーク互換性エイリアス。                                         |
| `build:check` |出力を公開せずにワークスペースの型を検証します。                                               |
| `build:watch` |ワークスペースの監視モードで増分ビルドを開始します。                                               |

Turbo ターゲットセレクターをハッシュします(`FORGE_BUILD_TARGET` および従来の Forge/CMS セレクター) と共有
ランナーおよびステージング ソース。したがって、集約ビルドとターゲット ビルドは相互にキャッシュされた結果を再利用できません。ファイナル
`dist/**` 出力はキャッシュされます。一時的なステージング ディレクトリとプロモーション ディレクトリは明示的に除外されます。

### キャッシュ戦略

Turborepo は次のアーティファクトをキャッシュします。

- `dist/**`: 構築された JS/CSS アーティファクト。
- `.vite/**`: Viteの内部キャッシュ。
- `coverage/**`: テストカバレッジレポート。

キャッシュをバイパスして新しいビルドを強制するには、 `--force` フラグ：

```bash
pnpm build:force
```

互換性エイリアスと CMS アーティファクト モード タスクはパッケージ タスクであるため、 Turbo 引き続き依存関係グラフを適用し、
ターゲット固有のキャッシュ入力。一時ステージはキャッシュ出力ではありません。昇格者のみ `dist` ツリーが公開されているか、
キャッシュから復元されました。

## 共有構成

ビルド構成は次の場所に集中されます。 `packages/tooling/configs/` ディレクトリを変更して、モノリポジトリ全体で一貫性を維持します。

|パッケージ |目的 |
| :------------------------------------ | :----------------------------------------------------------- |
| `@mission-platform/vite-config`       |共有 Vite アプリのロジックと Vue- 固有のビルド。          |
| `@mission-platform/tsdown-config`     |ライブラリ パッケージの共有 tsdown ロジック。                    |
| `@mission-platform/typescript-config` |ベース `tsconfig.json` アプリ、ライブラリ、テストのプリセット。 |
| `@mission-platform/postcss-config`    |標準化された CSS 処理 (オートプレフィクサーなど)。            |

## ローカル開発と生産

### 発達 （`dev` タスク）

Viteの開発サーバーは、ホット モジュール交換 (HMR) を提供します。アプリの場合 `dev` タスクが開始され、Turborepo も実行されます
コンポーネントライブラリの `build:watch` タスクをその横に配置します (タスクの `with` キー)、次のように編集します
`@mission-platform/components` 手動で再構築しなくても、自動的に再コンパイルされ、実行中のアプリによって取得されます。

### 生産 （`build` タスク）

Turborepo はトポロジ順にビルドを実行します。パッケージは、その内部依存関係がすべて完了した後にのみビルドされます。
無事に構築されました。の出力 `dist/` 最終的に公開または展開されるものです。

## 上級: WASM の統合

特定のパッケージ (例: `@mission-platform/hunspell`、バーコード スキャナー）には、WebAssembly にコンパイルされた Rust コードが含まれます。これら
ビルドは、以下を使用する特殊なタスクによって調整されます。 `wasm-pack` 環境の一貫性と最適性を確保するため
パフォーマンス。
