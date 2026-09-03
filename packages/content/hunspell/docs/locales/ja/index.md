# @mission-platform/hunspell

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> packages/hunspell/docs/index.md: [packages/hunspell/docs/index.md](../../index.md)
> 言語: 日本語 (ja)

`@mission-platform/hunspell` は、Hunspell に基づいてコンパイルされた高性能スペルチェック エンジンを提供します。
Emscripten 経由の **WebAssembly**。これは、完全にブラウザ内または Web Workers 内で実行される ES モジュールとしてパッケージ化されています。

## 建築

このパッケージは、特殊なビルド パイプラインを利用して、Node.js ランタイムへの依存関係をゼロにします。

1. **WASM コンパイル**: `hunspell-1.7.2` ライブラリは Emscripten を使用してクロスコンパイルされます。
2. **C++ ラッパー**: シン C++ ラッパー (`hunspell_wrapper.cpp`) は、Emscripten バインディングを介して必要な関数を公開します。
3. **単一ファイル アーティファクト**: 最終出力は、WASM バイナリが次のようにインライン化された自己完結型の `hunspell.js` です。
   Base64 なので、`.wasm` ファイルの読み込みと URL 解決を個別に行う必要がなくなります。

### WASM アーティファクトの再構築

再構築には必要なもの [ドッカー](https://www.docker.com/)。ルートから次のコマンドを使用します。

```bash
pnpm --filter @mission-platform/hunspell build:wasm
```

## 使用法

### 基本API

Hunspell エンジンは、任意の JavaScript/TypeScript 環境で直接使用できます。

```ts
import { createHunspell } from '@mission-platform/hunspell';

// Initialize the WASM module
const module = await createHunspell();

// Create a checker instance by passing the text content of .aff and .dic files
const checker = new module.HunspellChecker(affFileContent, dicFileContent);

console.log(checker.spell('hello')); // true
console.log(checker.spell('wrold')); // false
console.log(checker.suggest('wrold')); // ['world', 'word', ...]

// Important: free WASM memory when done
checker.delete();
```

### モナコエディターの統合

このパッケージは、Monaco エディターのシームレスな統合を提供し、ワーカーの生成とデバウンスされたスペルチェックを処理します。
自動的に。

#### Vue 3 (合成 API)

`useHunspellMonaco` コンポーザブルを使用して、スペルチェックをリアクティブに接続します。

```vue
<script setup lang="ts">
  import { ref } from 'vue';
  import { useHunspellMonaco } from '@mission-platform/hunspell';

  const editorRef = ref<monaco.editor.IStandaloneCodeEditor>();
  const enabled = ref(true);

  // Attach spell-checking logic
  useHunspellMonaco(editorRef, enabled, 'plaintext');
</script>
```

#### フレームワークに依存しない / 命令的

Vue 以外のコンシューマ (`@mission-platform/components` のコンポーネントなど) の場合は、`attachHunspellMonaco` 関数を使用します。

```ts
import { attachHunspellMonaco } from '@mission-platform/hunspell';

const handle = attachHunspellMonaco(editor, monacoRuntime, 'plaintext');

// Later, dispose of listeners and workers
handle.dispose();
```

## 辞書ファイル

このパッケージには、バンドルのサイズを小さくするため、**組み込み辞書は同梱されていません**。自分で用意する必要があります
`.aff` (接辞) と `.dic` (辞書) のペア。

推奨ソース: [LibreOffice 辞書](https://github.com/LibreOffice/dictionaries)。
