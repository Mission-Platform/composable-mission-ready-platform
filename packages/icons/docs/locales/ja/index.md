# @mission-platform/icons

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> packages/icons/docs/index.md: [packages/icons/docs/index.md](../../index.md)
> 言語: 日本語 (ja)

`@mission-platform/icons` は、Mission Platform 用のフレームワークに依存しない SVG アイコン コンポーネントのコレクションです。それぞれのアイコンは、
一度作成され、ビルド時にネイティブ Vue 3、React、Solid、Svelte、および Web コンポーネント ビルドにコンパイルされます。

## アーキテクチャと流通

このパッケージは `@mission-platform/vite-plugin-forge` を利用して、すべてのユーザーに高性能のツリーシェイク可能なアイコンを提供します。
サポートされているフレームワーク:

- **コンパイル**: 単一の `pnpm build` は、ターゲットごとに 1 つのフレームワーク ネイティブ バンドル、つまり決定論的な `dist/icons.svg` を発行します。
  スプライト、およびアイコンごとの CSS アセット。
- **単一エントリ、条件付き解決**: パブリック エントリ ポイントは 1 つだけです。
  `@mission-platform/icons`。 `mp:vue`、`mp:react`、`mp:solid`、および
  `mp:web-component` 輸出条件;ツールチェーンがアクティブ化するものによって、どのコンパイル済みビルドがベアかを決定します。
  指定子は次のように解決されます。条件が設定されていない場合は、他のものである中立の鍛造ソースに戻ります。
  「ライトワンス」コンポーネントは消費します。

## 使用法

### フレームワークの選択

インポートごとではなく、フレームワークを **1 回**、Vite から `resolve.conditions` で選択します (使用
`defineFrameworkAppConfig` または `frameworkResolveConditions` (`@mission-platform/vite-config` から)、および TypeScript
`customConditions` まで (`@mission-platform/typescript-config/framework-<name>` を拡張)
プリセット):

```ts
resolve: {
  conditions: frameworkResolveConditions('mp:vue'),
}
```

### 輸入品

すべてのインポートは、フレームワーク間でベアかつ同一になります。

**Vue 3** (`mp:vue` アクティブ):

```vue
import { ForgeIconAlert, ForgeIconArrow } from '@mission-platform/icons';
```

**React** (`mp:react` アクティブ):

```tsx
import { ForgeIconAlert, ForgeIconArrow } from '@mission-platform/icons';
```

### ニュートラルコンポーネントのインポート

フレームワークに依存しないコンポーネント (`vite-plugin-forge` によってコンパイルされた) を作成する場合、`mp:*` 条件はアクティブではなく、
同じ指定子を使用すると、ニュートラルなソースが得られます。

```tsx
import { ForgeIconAlert, ForgeIconArrow } from '@mission-platform/icons';
```

## 分類とカタログ

オーサリング フォルダーと Storybook タイトルは `icons/<category>/<subcategory>/<icon-name>` に従います。レビューしたカタログの表紙
`navigation`、`text`、`maps`、`routing`、`drawing`、`content`、`status`、`communication`、`media`、`security`、`data`、
`time`、`objects`。ギャップ レビューは `src/catalog.ts` に記録されます。各国のサポートをデータ主導で記録し、記録します。
国ごとに 1 つのコンポーネントを作成するのではなく、アプリケーション固有のアートワークを延期します。

## スプライトの再利用

すべてのラッパーは、`<use href="#icon-id">` 参照を持つアクセス可能な外部 `<svg>` をレンダリングします。 `IconSpriteProvider` マウント
インラインサブツリーに対して正規シンボルを 1 回:

```tsx
import { ForgeIconAlert, ForgeIconArrow, IconSpriteProvider } from '@mission-platform/icons';

export function Toolbar() {
  return (
    <IconSpriteProvider>
      <ForgeIconAlert ariaLabel="Alert" />
      <ForgeIconArrow
        direction="right"
        ariaLabel="Next"
      />
    </IconSpriteProvider>
  );
}
```

外部のキャッシュ可能なアセットの場合は、`src="/assets/icons.svg"` と `inline={false}` を使用します。外部 SVG フラグメント参照
同一オリジンアクセスまたは互換性のある CORS ポリシーが必要です。インライン モードは、SSR、制限的な CSP、またはブラウザのフォールバックです
外部フラグメントを解決できません。パッケージ ビルドは `dist/icons.svg` を発行します。これも次のように利用できます。
`@mission-platform/icons/icons.svg`。

## 国および構成 API

`ForgeIconFlag` および `ForgeIconCountryGlobe` は、`SUPPORTED_COUNTRY_CODES` からの大文字の ISO スタイル コードを受け入れます。
`US`、`CA`、`JP`、`GB`、および `ZA`。サポートされていないランタイム値を使用すると、説明的なエラーがスローされます。カントリーグローブ、ルート/ウェイポイント
パターン、および将来のオーバーレイは型指定されたシンボル構成です。変換を使用して既存の ID を参照し、チェックされます。
スプライト生成前の欠落した参照とサイクルについて。

## APIリファレンス

各アイコンは、`.forge-icon-<name>` BEM クラスを使用する中央の `<div>` ラッパー内で `<svg role="img">` をレンダリングします。
すべてのアイコンは $24 \times 24$ ビューボックスに基づいています。

### ユニバーサルプロップ

|小道具 |タイプ |デフォルト |説明 |
| :---------- | :----------------- | :----------------- | :-------------------------------------------------------------------------------------------------------------------- |
| `size` | `number \| string` | `'md'` |幅と高さ。名前付きトークン (`'2xs'`、`'xs'`、`'sm'`、`'md'`、`'lg'`、`'xl'`、`'2xl'`) またはピクセル番号をサポートします。 |
| `color` | `string` | `'currentColor'` |ストロークの色 (および塗りつぶされたマーカー アイコンの塗りつぶし)。                                                                     |
| `ariaLabel` | `string` | _アイコンごとのデフォルト_ |アクセシブルな名前。省略した場合、アイコンには `aria-hidden` というマークが付けられます。                                                     |

### 行動アイコン

特定のアイコンには、外観を制御するための追加の小道具が含まれています。

|アイコン |追加の小道具 |説明 |
| :----------------- | :-------------------------------------------------------------------- | :--------------------------------------------------------- |
| `ForgeIconArrow` | `direction`: `'up' \| 'right' \| 'down' \| 'left'` (デフォルト `'up'`) |インライン変換を介して矢印を回転します。                 |
| `ForgeIconChevron` | `direction`: `'up' \| 'right' \| 'down' \| 'left'` (デフォルト `'down'`) |インライン変換を介してシェブロンを回転します。               |
| `ForgeIconSort` | `active`: `boolean`、`direction`: `'asc' \| 'desc' \| undefined` |アクティブな並べ替え方向に一致する山形を強調表示します。 |

## アイコンライブラリ

ライブラリには、いくつかのカテゴリをカバーする幅広いアイコンが含まれています。

- **状態とステータス**: `ForgeIconAlert`、`ForgeIconCheck`、`ForgeIconError`、`ForgeIconInfo`、`ForgeIconWarning`。
- **ナビゲーション**: `ForgeIconArrow`、`ForgeIconChevron`、`ForgeIconHome`、`ForgeIconMenu`、`ForgeIconExternalLink`。
- **メディア**: `ForgeIconCamera`、`ForgeIconImage`、`ForgeIconMail`、`ForgeIconPhone`。
- **UI コントロール**: `ForgeIconClose`、`ForgeIconEdit`、`ForgeIconPlus`、`ForgeIconMinus`、`ForgeIconSearch`、
  `ForgeIconSettings`。
- **コンテンツのフォーマット**: `ForgeIconBold`、`ForgeIconItalic`、`ForgeIconBulletList`、`ForgeIconNumberedList`、
  `ForgeIconHeadingOne`...
  `ForgeIconHeadingSix`。
- **特殊ツール**: `ForgeIconWrench`、`ForgeIconPalette`、`ForgeIconDebug`、`ForgeIconQrCode`。

## 開発とメンテナンス

### 建物のアイコン

パッケージ所有のビルドは、ニュートラル宣言、すべてのフレームワーク アダプター、および SVG スプライトを生成します。カタログ変更後、または
スプライト ソース、実行:

```sh
pnpm exec turbo run build:check --filter @mission-platform/icons
pnpm exec turbo run build --filter @mission-platform/icons
```

### ストーリーブック

アイコンは `icons/<category>/<subcategory>/<icon-name>` の下にカタログされますが、`icons/overview` は完全なギャラリーのままです。
この概要では、1 つの `IconSpriteProvider` を通じて繰り返されるアイコンも示しています。個々のストーリーは `size` を暴露します。
該当する場合は、`color`、国コード、および `ariaLabel` 制御。
