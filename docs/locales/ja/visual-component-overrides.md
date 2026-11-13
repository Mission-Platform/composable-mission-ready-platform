# ビジュアルコンポーネントオーバーライド契約と移行インベントリ

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> docs/visual-component-overrides.md: [docs/visual-component-overrides.md](../../visual-component-overrides.md)
> 言語: 日本語 (ja)

ステータス: コンポーネント プロパティの登録と Vue スコープ スタイルのサポートは有効です。
実装されました。タイプ付き `properties` バッグ、ニュートラル `style` 放出、同じ場所に配置
`@property` パーシャル、およびターゲット対応の Vue `v-bind()` の引き下げが行われています。

## 監査の範囲と方法

監査ターゲットは、以下によって一致する完全なセットです。

```text
packages/**/src/components/**/*.module.scss
```

現在の監査では、**17 パッケージに 258 個のソース モジュール** が見つかりました。各モジュールについては、次のとおりです。
同じ場所にあるタッチポイントがチェックされました:

- `<component>.tsx` — 中立的な JSX インターフェイスとルート/ラッパーの所有権。
- `<component>.module.scss` — 宣言、既存の `--forge-*` 変数、
  `--mp-*` トークン カバレッジ、セレクター、疑似クラス、およびメディア ルール。ごとに
  具体的なコンポーネントのプレフィックスが付いた `--forge-*` 参照が、ローカルの参照に対してチェックされます。
  部分的な登録。
- `<component>.stories.tsx` — 代表的な Storybook サーフェス。
- `<component>.spec.ts` — 中立および/またはターゲット レンダリング回帰カバレッジ。
- `index.ts` — ローカル タイプ/コンポーネントのエクスポートとパッケージ コンポーネント
  バレル (`packages/<package>/src/components/index.ts`)。

すべての監査対象モジュールには中立的な `.tsx` ソースと同じ場所に配置された
`.stories.tsx`。すべてのモジュールには、同じ場所に `index.ts` があります。
`packages/ui/resource-planner/src/components/organisms/forge-resource-planner`;
そのパッケージバレルはソースファイルを直接エクスポートします。パッケージレベル
したがって、地元のバレルが輸出用のタッチポイントである場合でも、バレルが輸出のタッチポイントとなります。
行方不明。

分類は意図的に保守的になっています。

- **プロトタイプ** — ネストされたバッグ/継承変数パターンをすでに実装しています
  と互換性のリファレンスです。
- **既存のセマンティック変数** — すでにカスタム プロパティを生成していますが、
  値は、`columns` などのセマンティック プロパティから派生します。複製しないでください
  一般的なオーバーライドバッグに入っています。
- **移行/レビュー** — 狭い範囲で所有されている、視覚的に同じ場所にある CSS を公開できます。
  コンポーネントごとの API 決定後のトークンバック コントロール。あ
  トークン化された宣言自体は、それを公開する理由にはなりません。
- **除外** — 生成されたグリフ、診断、ベンダー/キャンバス、レンダリングレス状態、
  または、このパスでは安全なコンポーネント所有のオーバーライドを持たないエディター所有のスタイル設定。

## 契約

### 公共の形

Each component that is approved for overrides owns a named interface.の
プロパティはオプションであり、インデックス署名はありません。

```ts
export interface ComponentProperties {
  readonly "surface-color"?: string;
  readonly "border-width"?: string;
}

export interface ComponentProps {
  readonly properties?: Readonly<ComponentProperties>;
}
```

具体的なコンポーネントのインターフェイスはパブリック エクスポートのままです。たとえば、
`TypographyProperties`;グローバル `CSSProperties` 辞書を導入しないでください。
値の文法が安定している場合は、よりわかりやすい別名を使用します (例:
`TypographyFontFamily` または `TypographyLineHeight`)、次の場合にのみ `string` を使用します。
CSS 文法には、トークン参照、`calc()`、カンマ、または
ブラウザ定義の値。不明なキーは TypeScript 超過によって拒否される必要があります
財産チェック。

ネストされたキーはコンポーネントが所有する概念であり、生の CSS 宣言ではありません。する
`display`、`position`、`content`、アニメーション内部、または
意図した決定がすでにセマンティック プロップによって表現されている宣言
(`size`、`variant`、`columns`、`rows`、`gap` など)。

### カスタムプロパティ名とスタイルシートの解決

Convert a nested key to one stable kebab-case custom property:

|ネストされたキー |カスタム プロパティ |
| --------------- | --------------------------------- |
| `surface-color` | `--forge-component-surface-color` |
| `border-width` | `--forge-component-border-width` |
| `font-family` | `--forge-typography-font-family` |

コンポーネントのスラッグはパブリック CSS 名前空間です。 SCSS宣言は解決されます
トークン/デフォルトのフォールバックの前のオーバーライド:

```scss
color: var(--forge-component-surface-color, var(--mp-color-bg-surface));
```

現在の宣言に意味のある非トークンのデフォルトがある場合は、それを
最後のフォールバック (`var(--forge-..., var(--mp-token, 1px))`)。新規作成しないでください
`packages/tokens` ですでにカバーされている値のミッション プラットフォーム トークン。

値が子孫をまたぐ必要がある場合は、`@property` を `inherits: true` とともに使用します。
バリアント セレクター、疑似クラス、またはポップアップ/ラッパー境界。を入れてください
BEM ルートを所有する要素のインライン カスタム プロパティ マップ。のために
複数要素のコンポーネントを信頼性の高い既存のラッパーに置くと、すべてのコンポーネントが
子孫はそれを継承します。ネストされた場合は Vue スコープの属性に依存しないでください。
レンダークロージャノード。そのラッパーの外側でレンダリングされるポータルには、明示的な
ポータルのホスト/伝播の決定。サイレント グローバル変数ではありません。

### 宣言の完全性

コンポーネント モジュールによって読み取られるすべての具体的な `--forge-*` プロパティには、
exactly one matching `@property` registration in the module's imported,
同じ場所にある `_forge-<component>-properties.scss` 部分。登録は適合しています
to the W3C CSS Properties and Values API Level 1 specification:
彼らは、無効な `initial-value` を使用せずに、`syntax: "*"` と `inherits: true` を使用します。
記述子。標準の `var(--forge-*, var(--mp-*))` フォールバックを解決できるようにします。
$O(1)$ スタイルの評価に近い。登録は具体的な名前で書かれます
未解決の Sass 補間ではなく。これにはあらゆる有限サイズが含まれます。
トーン、状態、タイポグラフィ、ポップアップ、マップ生成バリアント、およびセマンティック アンカー
`--forge-logo-columns`、`--forge-stats-columns` など
`--forge-testimonial-columns`、`--forge-grid-columns`、および
`--forge-grid-rows`。

`--forge-*` 宣言は、コンポーネントローカルのオーバーライド メタデータです。の
`--mp-*` 変数は `packages/tokens` によって所有されたままであるため、
コンポーネント部分で再宣言されています。反復可能なガードは次のように利用できます。
`pnpm validate:component-properties`;ソースモジュールのみをスキャンしてレポートします
欠落、重複、孤立、または未解決の正確なモジュールとプロパティ
宣言。

### Neutral output and precedence

ニュートラルな JSX 出力は、によって生成される標準の `style` プロパティを使用します。
`createForgeComponentStyle(prefix, props.properties)`。その型は両方を受け入れます
プラットフォームの `ForgePropertyBag` / を介したキャメルケースおよびケバブケースのキー
`CSSStyleProperties`、自動変換と接頭辞付き:

```ts
import { createForgeComponentStyle, type CSSStyleProperties } from '@mission-platform/forge-jsx';

export interface ButtonProperties {
  readonly primaryGap?: string;
  readonly 'primary-gap'?: string;
  readonly primaryBackgroundDefault?: string;
  readonly 'primary-background-default'?: string;
}

// In component rendering:
const customStyle = createForgeComponentStyle('button', props.properties);
```

未定義の値は発行されたオブジェクトから省略されるため、トークンのフォールバックが残ります
アクティブな。 `styles` プロパティを決して発行しないでください。ニュートラル ランタイムの一部ではありません
契約であり、それを下げないターゲットでは不明な DOM 属性になります。
特に。数値セマンティック変数は既存の `number` を維持することができます
代表。型指定されたオーバーライド値は CSS 文字列であるため、単位、カンマ、スペース、
および `calc()` はそのまま残ります。

### CSS カスケード レイヤーの階層とアトミック構造

 `@layer` 階層
declared at the root token layer (`@mission-platform/tokens`):

```scss
@layer mp.reset,
       mp.tokens,
       mp.components,
       mp.components.atoms,
       mp.components.molecules,
       mp.components.organisms,
       mp.components.templates,
       mp.content,
       mp.content.atoms,
       mp.content.molecules,
       mp.content.organisms,
       mp.scheduler,
       mp.scheduler.organisms,
       mp.barcode,
       mp.barcode.molecules,
       mp.code-scanner,
       mp.code-scanner.organisms,
       mp.map,
       mp.map.organisms,
       mp.matrix-code,
       mp.matrix-code.molecules,
       mp.qr-code,
       mp.qr-code.molecules,
       mp.breakpoints,
       mp.breakpoints.molecules,
       mp.overrides,
       mp.utilities;
```

コンポーネントのスタイルシートは、ルールをそれぞれのパッケージとアトミックに割り当てます。
サブレイヤ (例: `@layer mp.components.atoms`、`@layer mp.components.molecules`、
`@layer mp.scheduler.organisms`)、予測可能なカスケード優先順位を保証
特異性の競合なし。

### `@supports` による段階的なパフォーマンスの強化

Complex composite components and heavy organisms leverage modern browser CSS
`@supports` によって保護された機能 回復力のあるグレースフルな機能クエリ
degradation:

1. **`content-visibility: auto`**: Off-screen layout and paint costs for heavy
   organisms (`ForgeScheduler`, `ForgeCodeBlock`, `ForgeBarcode`, `ForgeTable`)
   are deferred with `contain-intrinsic-size`.
2. **Container Queries (`@container`)**: Adaptive density and responsive
   component typography adapt to container dimensions via
   `@supports (container-type: inline-size)`。
3. **Single-Hop Fallbacks**: Property lookups maintain shallow
   `var(--forge-*, var(--mp-*))` グラフは、スタイルの再計算を $O(1)$ 付近に維持します。

Precedence is, from lowest to highest: token/theme fallback, component
variant/default rule, semantic prop selection, component override custom
property, then an explicitly supplied consumer inline style (if the target
supports one). `className` remains the caller's class hook and can add rules,
ただし、型付きバッグの代替品として扱ってはなりません。 The override
バッグは、選択されたセマンティックバリアントを変更しない、またはフォーカスをバイパスしない、無効、
reduced-motion, or cascade-layer rules.

React、Svelte、Solid、および Web コンポーネントの出力は、ニュートラル `style` マップを使用します。
Only the Vue native-template SFC style path may later rewrite the corresponding
SCSS value to `v-bind('properties.<name>')`; Vue render-closure fallback and
Vue 以外のすべてのスタイルシート パスは、有効な通常の CSS/SCSS のままでなければなりません。

The implementation touch points for that lowering are the neutral runtime
contract in `packages/core/forge-jsx/src/runtime/types.ts` and `packages/core/forge-jsx/src/runtime/h.ts`,
the existing neutral-to-Vue style lowering in
`packages/compiler/plugins/forge-vue/src/transformers/template.ts`, and the co-located
`packages/compiler/plugins/forge-vue/src/runtime/styles.ts` のスタイル アセンブリ/放出および
`packages/compiler/plugins/forge-vue/src/emitters/sfc.ts`。これらのファイルは、
typed `style` value;フレームワーク固有の `styles` 属性を追加してはなりません。

## プロトタイプと既存の候補

これらは、既存のカスタム プロパティ サイトとまったく同じです。それらは退行であり、
互換性アンカーであり、セマンティック API をバッグに置き換える要求ではありません。

|コンポーネント |スタイルモジュール |既存の変数 |現在の所有者/処分 |その後のタッチポイント |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `ForgeTypography`          | `packages/ui/typography/src/components/atoms/forge-typography/forge-typography.module.scss`                         |完了 `--forge-typography-*` ベース、表示、バリアント、カラー、リンク、ポップアップの値を含むサーフェス |プロトタイプ;タイポグラフィ ルートと truncate-popup ラッパーを通じて継承されます。 `forge-typography.tsx`、 地元 `index.ts`, `.spec.ts`, `.stories.tsx`;すべての具体的な名前は、同じ場所にある部分 | に登録されます。
| `ForgeLogoCloud`           | `packages/ui/components/src/components/organisms/forge-logo-cloud/forge-logo-cloud.module.scss`                     | `--forge-logo-columns`                                                                                  |既存のセマンティック変数。保持 `columns` とそのクランプ | `forge-logo-cloud.tsx`、ローカルバレル、スペック、ストーリー。重複はありません `properties.columns`                                              |
| `ForgeStatsSection`        | `packages/ui/components/src/components/organisms/forge-stats-section/forge-stats-section.module.scss`               | `--forge-stats-columns`                                                                                 |既存のセマンティック変数。保持 `columns`                                                       | `forge-stats-section.tsx`、ローカルバレル、スペック、ストーリー。重複はありません `properties.columns`                                           |
| `ForgeTestimonialsSection` | `packages/ui/components/src/components/organisms/forge-testimonials-section/forge-testimonials-section.module.scss` | `--forge-testimonial-columns`                                                                           |既存のセマンティック変数。保持 `columns`                                                       | `forge-testimonials-section.tsx`、ローカルバレル、スペック、ストーリー。重複はありません `properties.columns`                                    |
| `ForgeGridLayout`          | `packages/ui/layout/src/components/templates/forge-grid-layout/forge-grid-layout.module.scss`                       | `--forge-grid-columns`, `--forge-grid-rows`                                                             |以下から派生した既存の意味変数 `columns`/`rows`;クランプとブレークポイントの動作を保持する | `forge-grid-layout.tsx`、ローカルバレル、スペック、ストーリー。重複したグリッドバッグはありません |

タイポグラフィーのプロトタイプには、あらゆるものに対する完全な登録部分が含まれるようになりました。
モジュールによって消費される具体的なプロパティ (すべての有限バリアントと
ポップアップ名。そのニュートラルな JSX 出力では、 `style={style}` そして入力されたものを保持します
`CSSStyleProperties` 拡大;セマンティック タイポグラフィ API は変更されません。

## パッケージレベルの在庫

以下のリストは、一致した 258 個のコンポーネントとスラグの完全なインベントリです。
スタイルモジュール。すべてのナメクジについて、モジュール、ニュートラル ソース、ストーリー、および (ここで
present) spec はパッケージの既存の atom の下の同じディレクトリにあります。
分子、生物、またはテンプレートのパス。最初のパッケージモジュールのグロブ
列はスタイル ファイルの正確なパス指定です。

|パッケージと正確なモジュールのパス仕様 |   カウント |性質 |
| -------------------------------------------------------------------- | ------: | ------------------------------------------------------------------ |
| `packages/integrations/barcode/src/components/**/*.module.scss` |       1 |生成されたバーコード プレゼンテーションを移行/レビューする |
| `packages/ui/breakpoints/src/components/**/*.module.scss` |       1 |除外された診断/デバッグ プレゼンテーション |
| `packages/integrations/code-scanner/src/components/**/*.module.scss` |       1 |スキャナ ホスト/フレーム プレゼンテーションを移行/レビューする |
| `packages/ui/components/src/components/**/*.module.scss` |      84 | 3 つの既存のセマンティック変数。 81 移行/レビュー |
| `packages/content/content/content/src/components/**/*.module.scss` |      10 | 8 移行/レビュー。 2 編集者所有/除外 |
| `packages/ui/float/src/components/**/*.module.scss` |       8 |移行/レビュー;ポップアップ/ポータル継承の優先順位 |
| `packages/ui/forms/src/components/**/*.module.scss` |      28 |移行/レビュー、制御セマンティクスの維持 |
| `packages/ui/icons/src/components/**/*.module.scss` |     106 |生成されたグリフ ラッパーを除外しました |
| `packages/ui/layout/src/components/**/*.module.scss` |       7 | 1 つの既存の意味変数。 6 移行/レビュー |
| `packages/integrations/map/src/components/**/*.module.scss` |       1 |除外された MapLibre/キャンバス ホスト |
| `packages/integrations/matrix-code/src/components/**/*.module.scss` |       1 |生成されたコードのプレゼンテーションを移行/レビューする |
| `packages/integrations/qr-code/src/components/**/*.module.scss` |       1 |生成されたコードのプレゼンテーションを移行/レビューする |
| `packages/ui/resource-planner/src/components/**/*.module.scss` |       1 |ドメイン プレゼンテーションの移行/レビュー |
| `packages/core/scheduler/src/components/**/*.module.scss` |       1 |ドメイン プレゼンテーションの移行/レビュー |
| `packages/ui/select/src/components/**/*.module.scss` |       3 |選択セマンティクスを保持した移行/レビュー |
| `packages/ui/theme/src/components/**/*.module.scss` |       3 | 1 移行/レビュー。 2 レンダリングレス/状態の除外 |
| `packages/ui/typography/src/components/**/*.module.scss` |       1 |プロトタイプ |
| **合計** | **258** | **141 個の移行/レビュー、5 個のプロトタイプ/セマンティック アンカー、112 個が除外されました** |

### カバレッジ信号

次の信号は同じモジュール スキャンからのものであり、意図的に
直交する。 **MP refs** は、`--mp-*` 参照を含むモジュールをカウントします。 **色
リテラル** は、カラー関数または 16 進数を含むモジュールをカウントします。 **次元
literals** は、CSS の長さ/パーセンテージ リテラル (含む) を含むモジュールをカウントします。
意図的なゼロ/ビューポート値)。 **Forge vars** は、
既存の `--forge-*` 変数。 **トークン信号なし** を含むモジュールをカウントします。
`--mp-*` も `--forge-*` もありません。これらはトリアージ信号であり、自動 API ではありません
決断。

|パッケージ |モジュール | MP 参照 |カラーリテラル |ディメンション リテラル |変数を鍛造する |トークンシグナルなし |ルート/ラッパーの分類 |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
|バーコード | 1 | 1 | 0 | 1 | 0 | 0 |単一のバーコード ルート |
|ブレークポイント | 1 | 1 | 1 | 1 | 0 | 0 |診断ルート |
|コードスキャナ | 1 | 1 | 0 | 1 | 0 | 0 |スキャナ ホスト/フレーム ルート |
|コンポーネント | 84 | 83 | 3 | 75 | 3 | 1 | BEM ルート。選択された内部グリッドとラッパー |
|コンテンツ | 10 | 9 | 0 | 6 | 0 | 1 |ルートとエディター/ツールバー ラッパー |
|フロート | 8 | 8 | 0 | 8 | 0 | 0 |ポップアップ、ダイアログ、トースト、ポータル隣接ラッパー |
|フォーム | 28 | 28 | 0 | 25 | 0 | 0 |状態の子孫を持つ制御ルート |
|アイコン | 106 | 0 | 0 | 1 | 0 | 106 |生成されたグリフ ルート/SVG ラッパー |
|レイアウト | 7 | 2 | 0 | 7 | 1 | 4 |レイアウトルート。グリッド ルートのグリッド変数 |
|地図 | 1 | 0 | 0 | 1 | 0 | 1 | MapLibre ホスト/キャンバス ルート |
|マトリックスコード | 1 | 1 | 0 | 1 | 0 | 0 |生成されたコードのルート |
| QRコード | 1 | 1 | 0 | 1 | 0 | 0 |生成されたコードのルート |
|リソースプランナー | 1 | 1 | 0 | 1 | 0 | 0 |密な子孫を持つプランナー ルート |
|スケジューラー | 1 | 1 | 0 | 1 | 0 | 0 |密な子孫を持つスケジューラ ルート |
|選択 | 3 | 3 | 0 | 3 | 0 | 0 |ポップアップ子孫を使用してルートを選択/制御する |
|テーマ | 3 | 2 | 0 | 0 | 0 | 1 |ルートを切り替えます。コンポーザー/プロバイダー ラッパー |
|タイポグラフィ | 1 | 1 | 0 | 1 | 1 | 0 |タイポグラフィ ルートと切り捨てポップアップ ラッパー |
| **合計** | **258** | **143** | **4** | **134** | **5** | **114** |信号は設計により重複します |

ルート配置ルールは次の分類に基づきます: 通常の BEM モジュール
マップをルートに接続します。 `ForgeLogoCloud`、`ForgeStatsSection`、および
`ForgeTestimonialsSection` は現在、セマンティック列変数を
内部グリッド/リスト。 `ForgeGridLayout` は行/列をルートに配置します。そして
`ForgeTypography` は、継承された値をポップアップ ラッパーに配置します。
ラッパーが存在します。フロート/選択ポップアップ構造は同じラッパーレベルを使用します
継承ルールと宣言ガードは、それらのプロパティによって使用されるすべてのプロパティをカバーします。
ポップアップスタイル。

### `@mission-platform/barcode`、`breakpoints`、および `code-scanner`

- `forge-barcode` — `packages/integrations/barcode/src/components/molecules/forge-barcode/`
  — ソース、モジュール、ローカル インデックス、仕様、ストーリー。生成された/バーコードのみを確認する
  バーコード エンコード API の一部ではない寸法または表面コントロール。
- `forge-breakpoint-debug` — `packages/ui/breakpoints/src/components/molecules/forge-breakpoint-debug/`
  — ソース、モジュール、ローカル インデックス、仕様、ストーリー。除外: これは診断です
  ビューポート/デバッグ表示。再利用可能なビジュアル テーマ サーフェスではありません。
- `forge-code-scanner` — `packages/integrations/code-scanner/src/components/organisms/forge-code-scanner/`
  — ソース、モジュール、ローカル インデックス、仕様、ストーリー。スキャナーのフレーム/コンテナーを確認する
  コントロールのみ。スキャナ エンジンの動作は API のスタイルを設定していません。

### `@mission-platform/components` (84)

以下のすべてのエントリには `<slug>.tsx`、`<slug>.module.scss`、
`<slug>.stories.tsx`、`<slug>.spec.ts`、および `<slug>/index.ts` (パッケージ付き)
`packages/ui/components/src/components/index.ts`のバレル。

**既存のセマンティック変数アンカー:**
`forge-logo-cloud`、`forge-stats-section`、`forge-testimonials-section`。

**移行/レビュー:**

- アトム: `forge-avatar`、`forge-background-video`、`forge-badge`、
  `forge-button`、`forge-divider`、`forge-gauge`、`forge-icon-button`、
  `forge-icon`、`forge-kbd`、`forge-progress-bar`、`forge-quote`、
  `forge-responsive-image`、`forge-responsive-video`、`forge-separator`、
  `forge-skeleton`、`forge-spinner`、`forge-stack`、`forge-status-icon`、
  `forge-surface`、`forge-sync-status-indicator`。
- 分子: `forge-accordion`、`forge-alert`、`forge-breadcrumb`、
  `forge-button-group`、`forge-callout-block`、`forge-card`、
  `forge-carousel-indicator`、`forge-chat-bubble`、`forge-collapse`、
  `forge-device-mock`、`forge-drop-zone`、`forge-empty-state`、`forge-grid`、
  `forge-in-view`、`forge-inline-edit`、`forge-list`、`forge-masonry`、
  `forge-mention-input`、`forge-menu-item`、`forge-menu`、`forge-metric-card`、
  `forge-navbar-item`、`forge-pagination`、`forge-shortcut-hint`、`forge-tabs`、
  `forge-tag-input`、`forge-timeline`、`forge-window-popout`。
- 生物: `forge-activity-feed`、`forge-announcement-bar`、
  `forge-asset-browser`、`forge-carousel`、`forge-chat-area`、
  `forge-command-palette`、`forge-comment-thread`、`forge-comparison-table`、
  `forge-cookie-consent`、`forge-cta-banner`、`forge-data-card`、
  `forge-diff-viewer`、`forge-drawer`、`forge-error-page`、
  `forge-kanban-board`、`forge-marketing-header`、`forge-menubar`、
  `forge-navbar`、`forge-notification-panel`、`forge-onboarding-tour`、
  `forge-pricing-table`、`forge-profile-card`、`forge-site-footer`、
  `forge-split-pane`、`forge-table`、`forge-transfer-list`、`forge-tree-view`、
  `forge-virtual-list`、`forge-virtual-log-viewer`、`forge-virtual-table`、
  `forge-virtual-tabs`、`forge-virtual-tree-view`。
- テンプレート: `forge-hero`。

3 つの既存のアンカーは、現在のアンカーに対して semantic-prop-only のままです。
`columns` API;後のパスでは、他の狭い範囲で所有されているプロパティを追加することもできますが、
列を選択する 2 番目の方法を公開しません。

### `@mission-platform/content` (10)

`forge-code-block`、`forge-mermaid`、`forge-wysiwyg-toolbar-button`、
`forge-markdown`、`forge-wysiwyg-block-controls`、`forge-wysiwyg-block-menu`、
`forge-wysiwyg-status-bar`、`forge-wysiwyg-toolbar`、`forge-monaco-editor`、
`forge-wysiwyg-editor` は既存の原子/分子/生物の下にあります
ディレクトリにはソース、モジュール、ストーリー、ローカル インデックス、パッケージが含まれています
`packages/content/content/content/src/components/index.ts`のバレル。

`forge-code-block`、`forge-mermaid`、`forge-markdown`、
`forge-monaco-editor`、`forge-wysiwyg-status-bar`、および
`forge-wysiwyg-editor`。他の 4 つの WYSIWYG コントロールには仕様がありません。
`forge-monaco-editor` および `forge-wysiwyg-editor` は直接から除外されます
エディターのスタイルのオーバーライド: Monaco/editor DOM とエディターの状態は内部を所有します。
スタイル。周囲のホスト/ツールバーはレビュー候補のままです。

### `@mission-platform/float`、`forms`、`layout`、およびドメイン パッケージ

- Float (8 つすべて、それぞれソース/モジュール/仕様/ストーリー/ローカル インデックスを持つ):
  `forge-alert-banner`、`forge-dropdown`、`forge-popover`、`forge-toast`、
  `forge-tooltip`、`forge-dialog`、`forge-modal`、`forge-toast-container`。
  ルートからポップアップへの継承とラッパー/ポータルの動作を優先します。
- フォーム (全 28 個、それぞれソース/モジュール/仕様/ストーリー/ローカル インデックス付き):
  `forge-checkbox`、`forge-input`、`forge-radio`、`forge-range-input`、
  `forge-rating`、`forge-slider`、`forge-switch`、`forge-textarea`、
  `forge-calendar`、`forge-color-input`、`forge-date-input`、
  `forge-date-range-input`、`forge-field-set`、`forge-file-input`、
  `forge-location-input`、`forge-number-stepper`、`forge-otp-input`、
  `forge-phone-input`、`forge-radio-group`、`forge-search-input`、
  `forge-segment-control`、`forge-time-input`、`forge-time-range-input`、
  `forge-date-time-range-input`、`forge-form-builder`、`forge-form-wizard`、
  `forge-schema-form-dialog`、`forge-schema-form`。
  `size`、検証、チェック済み、無効、および選択のセマンティクスを保持します。
- レイアウト: `forge-container`、`forge-application-layout`、`forge-bento-layout`、
  `forge-f-pattern-layout`、`forge-vertical-layout`、`forge-z-pattern-layout`
  がレビュー候補です。 `forge-grid-layout` は既存のセマンティック アンカーです
  `rows`、`columns`、`gap`、`margin`、`padding`、`breakpoint` を保持します。
  パッケージバレルは`packages/ui/layout/src/components/index.ts`です。
- 生成された/ドメイン候補 (それぞれにソース/モジュール/ストーリー/ローカルインデックス/スペックが含まれます)
  特に明記されていない限り): `forge-matrix-code` (`packages/matrix-code`)、`forge-qr-code`
  (`packages/qr-code`)、`forge-resource-planner`
  (`packages/resource-planner`; ローカルインデックスなし、から直接エクスポート
  `src/components/index.ts`)、および `forge-scheduler` (`packages/scheduler`)。
- 選択: `forge-tag`、`forge-multiselect`、`forge-select`、それぞれ
  source/module/spec/story/local インデックスとパッケージ バレル。オプションを保持する
  状態と選択の小道具のセマンティック。
- テーマ: `forge-theme-toggle` はレビュー候補です。 `forge-theme-composer`
  および `forge-theme-provider` は、ビジュアル オーバーライドの移行から除外されます。
  テーマの状態/レンダリングレスプロバイダーインフラストラクチャ。パッケージバレルは、
  `packages/ui/theme/src/components/index.ts`。

### `@mission-platform/icons` (106)

106 個のアイコン モジュールはすべて、以下に生成されたグリフ ラッパーです。
`packages/ui/icons/src/components/**`、中立的なソース、モジュール、ストーリーがあり、
ローカル エクスポートであり、生成された
`packages/ui/icons/src/components/index.ts`。同じ場所に配置される仕様はありません。の
生成される完全な名前は次のとおりです。

`forge-icon-alert`、`forge-icon-alert-critical`、`forge-icon-alert-info`、
`forge-icon-alert-neutral`、`forge-icon-alert-warning`、`forge-icon-align-center`、
`forge-icon-align-justify`、`forge-icon-align-left`、`forge-icon-align-right`、
`forge-icon-arrow`、`forge-icon-bell`、`forge-icon-blockquote`、`forge-icon-bold`、
`forge-icon-bullet-list`、`forge-icon-calendar`、`forge-icon-camera`、
`forge-icon-chat`、`forge-icon-check`、`forge-icon-chevron`、`forge-icon-chevrons`、
`forge-icon-clock`、`forge-icon-close`、`forge-icon-cloud`、`forge-icon-code-block`、
`forge-icon-code-inline`、`forge-icon-copy`、`forge-icon-debug`、`forge-icon-download`、
`forge-icon-draw-circle`、`forge-icon-draw-line`、`forge-icon-draw-polygon`、
`forge-icon-draw-square`、`forge-icon-draw-triangle`、`forge-icon-edit`、
`forge-icon-error`、`forge-icon-external-link`、`forge-icon-eye`、`forge-icon-eye-off`、
`forge-icon-filter`、`forge-icon-geodesic`、`forge-icon-globe`、
`forge-icon-country-globe`、`forge-icon-layer`、`forge-icon-map-marker-cluster`、
`forge-icon-flag`、`forge-icon-heading`、`forge-icon-heading-five`、
`forge-icon-heading-four`、`forge-icon-heading-one`、`forge-icon-heading-six`、
`forge-icon-heading-three`、`forge-icon-heading-two`、`forge-icon-heart`、
`forge-icon-home`、`forge-icon-image`、`forge-icon-info`、`forge-icon-italic`、
`forge-icon-join`、`forge-icon-language`、`forge-icon-lightning`、`forge-icon-link`、
`forge-icon-lock`、`forge-icon-lock-open`、`forge-icon-mail`、`forge-icon-map-pin`、
`forge-icon-menu`、`forge-icon-minus`、`forge-icon-move`、`forge-icon-notice`、
`forge-icon-numbered-list`、`forge-icon-palette`、`forge-icon-pause`、
`forge-icon-pencil`、`forge-icon-phone`、`forge-icon-play`、`forge-icon-plus`、
`forge-icon-puzzle`、`forge-icon-qr-code`、`forge-icon-refresh`、`forge-icon-redo`、
`forge-icon-route`、`forge-icon-rotate-ccw`、`forge-icon-rotate-cw`、
`forge-icon-scale-down`、`forge-icon-scale-up`、`forge-icon-search`、
`forge-icon-send`、`forge-icon-settings`、`forge-icon-share`、`forge-icon-sort`、
`forge-icon-split`、`forge-icon-star`、`forge-icon-strikethrough`、
`forge-icon-table`、`forge-icon-table-column-add`、`forge-icon-table-column-remove`、
`forge-icon-table-row-add`、`forge-icon-table-row-remove`、`forge-icon-trash`、
`forge-icon-undo`、`forge-icon-underline`、`forge-icon-upload`、`forge-icon-user`、
`forge-icon-warning`、`forge-icon-waypoint`、`forge-icon-wrench`。

これらのスタイルは、グリフ ラッパー (`inline-flex`、位置合わせ、
`currentColor`、または SVG サイズ設定)。消費者はすでにアイコンのサイズを次の方法で制御しています
周囲のアイコン/フォント コンテキスト、またはアイコンのセマンティック API。を追加しないでください
生成された各アイコンにバッグを追加します。

### `@mission-platform/map` および `@mission-platform/typography`

`forge-map-libre` は、次の場所にある唯一の MapLibre ホスト モジュールです。
`packages/integrations/map/src/components/organisms/forge-map-libre/`;それには物語があり、
ローカル/パッケージのエクスポートは可能ですが、同じ場所に配置される仕様はありません。そのキャンバス/マップ エンジンは
内部視覚モデルなので除外されます。ホストのサイジング動作のみを行う必要があります。
後の API で明示的に必要な場合に考慮されます。

`forge-typography` は、次の唯一のタイポグラフィ モジュールです。
`packages/ui/typography/src/components/atoms/forge-typography/`。そのソース、
ローカルインデックス、パッケージバレル（`packages/ui/typography/src/components/index.ts`）、
スペックとストーリーはまさにステップ 2 のタッチポイントです。既存の継承
プロパティは、フォントファミリー、行送り、表示メトリック、および
ポップアップの子孫を切り詰めます。

## 明示的な除外とセマンティックのみのルール

1. **電子メール コンポーネント:** 258 一致セットには電子メール モジュールがありません。電子メールのスタイル
   意図的にインラインであり、別のレンダリング モデルに従います。追加しないでください
   この契約を `packages/email-components` にします。
2. **生成されたアイコン:** 106 個の `@mission-platform/icons` モジュールがすべて残ります
   セマンティック グリフ コンポーネント。アイコンごとのビジュアル バッグはありません。
3. **診断/インフラストラクチャ ホスト:** `ForgeBreakpointDebug`、`ForgeMapLibre`、
   `ForgeThemeComposer` および `ForgeThemeProvider` は引き続き除外されます。
   上記の理由。 Monaco/編集者が所有する DOM も除外されたままです。
4. **既存のセマンティック ディメンション:** `ForgeLogoCloud.columns`、
   `ForgeStatsSection.columns`、`ForgeTestimonialsSection.columns`、および
   `ForgeGridLayout.rows`/`columns` は、これらの決定の唯一の所有者のままです。
   既存のカスタム プロパティ名が将来のバッグと競合してはなりません
   名前。
5. **セマンティックインタラクションの小道具:** `size`、`variant`、チェック/選択状態、
   検証状態、ブレークポイント、行/列、およびコントロールの動作は、
   CSS オーバーライド キー。バッグは、コンポーネントが所有する視覚的な値を調整する場合があります。
   選択されたセマンティック状態ですが、その状態を置き換えることはできません。

## ステップ 2 実装チェックリスト

- 分類された行にのみ型付き `properties` インターフェイスを追加します
  宣言がコンポーネント所有であることを確認した後、**移行/レビュー**を行ってください。
- 各ニュートラル オーバーライド スタイルを `CSSStyleProperties` と交差するように入力します。
  コンポーネントの明示的なカスタム プロパティ キー (`string | undefined`)。する
  これを `Record<string, string>` またはグローバル CSS 辞書に置き換えないでください。
- トークン フォールバックを使用して、公開されたキーごとに 1 つの `--forge-<slug>-<key>` フォールバックを追加します
  子孫が必要とする場合は `inherits: true` となります。
- `style` を通じて、定義された値のみをコンポーネント ルート/ラッパーにアタッチします。
  `styles` や不明なバッグ属性は決してありません。
- 新しいパブリックが作成されたときに、正確なローカル インデックスとパッケージ コンポーネント バレルを更新します。
  タイプが導入されます。既存の輸出順序/規約を維持します。
- デフォルト/ワンオーバーライド/ネストされた状態のカバレッジを影響を受ける各仕様に追加し、
  既存の同じ場所にあるストーリーの例を上書きします。アンカー仕様を使用して、
  意味変数を保護するためのロゴ/統計/お客様の声/グリッド。
- Vue エミッタ作業を分離しておきます。ネイティブ テンプレート スコープのスタイルは使用できます。
  Vue `v-bind()`、ただしニュートラル ソース スタイルとその他のターゲット スタイルは維持する必要があります
  フレームワーク中立。
