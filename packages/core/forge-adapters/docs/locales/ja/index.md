# @mission-platform/forge-adapters

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> packages/core/forge-adapters/docs/index.md: [packages/core/forge-adapters/docs/index.md](../../index.md)
> 言語: 日本語 (ja)

ニュートラル `@mission-platform/forge-jsx` ランタイム用のフレームワーク アダプター。
コンポーネントは Forge JSX に対して一度作成され、アダプターを通じてレンダリングされます。
ターゲットフレームワークの場合。

## 輸出

|エントリー |目的 |
| ------------------------------------------------- | -------------------------------------------- |
| `@mission-platform/forge-adapters/react` | `toReactComponent` および `renderToReact` |
| `@mission-platform/forge-adapters/vue` | `toVueComponent` および `renderToVue` |
| `@mission-platform/forge-adapters/solid` | SolidJS マーカーと構造プリミティブ |
| `@mission-platform/forge-adapters/svelte` | Svelte レンダリング ヘルパー |
| `@mission-platform/forge-adapters/web-components` |ネイティブのカスタム要素とダイレクト DOM ランタイム |

フレームワーク パッケージはオプションのピア依存関係です。使用するフレームワークをインストールする
選択したアダプターによって選択され、そのサブパスのみがインポートされます。

```ts
import { toVueComponent } from '@mission-platform/forge-adapters/vue';
import { MyComponent } from '@mission-platform/components';

const VueComponent = toVueComponent(MyComponent);
```
