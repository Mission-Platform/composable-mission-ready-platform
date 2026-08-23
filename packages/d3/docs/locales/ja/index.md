# @mission-platform/d3

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> packages/d3/docs/index.md: [packages/d3/docs/index.md](../../index.md)
> 言語: 日本語 (ja)

`@mission-platform/d3` は、D3 と Mission Platform ライトワンス コンポーネントの間のフレームワークに依存しない統合を提供します
システム。

## 建築

このパッケージは、命令型 D3 選択ベースのレンダリングと宣言型リアクティブ UI ツリーの橋渡しをします。

- **中立的な実装**: `@mission-platform/forge` フック (`useRef`、`useEffect`) の上に構築されます。
- **デュアル フレームワーク ターゲット**: `@mission-platform/vite-plugin-forge` によってネイティブ React (`./react`) および Vue にトランスパイルされます 3
  (`./vue`) コンポーザブル。
- **選択的な依存関係**: `d3-selection` を直接インポートして、クライアント バンドル サイズを最小限に抑えます。

## 主要な API

### `useD3`

```ts
function useD3<E extends Element>(draw: D3Draw<E>, dependencies?: MpDependencyList): MpRef<E | null>;
```

DOM/SVG 要素 ref にアタッチし、D3 選択 (`D3Selection<E>`) を渡す `draw` 関数を実行します。
マウントされたときと依存関係が変更されたとき。 `draw` は、オプションでティアダウン クリーンアップ関数を返すことができます。

### マージンユーティリティ

#### `resolveMargin(input?: MarginInput): Margin`

部分的または欠落しているマージン オブジェクトを完全な `{ top, right, bottom, left }` ピクセル値に正規化します。

#### `innerDimensions(outerWidth: number, outerHeight: number, marginInput?: MarginInput): InnerDimensions`

SVG ビューボックスの計算のために、`innerWidth`、`innerHeight`、および解決された `margin` を計算します。

```ts
interface InnerDimensions {
  innerWidth: number;
  innerHeight: number;
  margin: Margin;
}
```
