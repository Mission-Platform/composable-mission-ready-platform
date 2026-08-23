# @mission-platform/harper

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> packages/harper/docs/index.md: [packages/harper/docs/index.md](../../index.md)
> 言語: 日本語 (ja)

`@mission-platform/harper` は、 [ハーパー](https://writewithharper.com) 文法チェッカーと
モナコ編集者。 Harper は、WebAssembly を利用した高速、オフライン、プライバシー最優先の英文法チェッカーです。
完全にブラウザ内で。

## 特徴

- **リアルタイム文法チェック**: 入力時に問題が検出され、結果はエディターを維持するために 300 ミリ秒でデバウンスされます。
  パフォーマンス。
- **ビジュアル マーカー**: 文法とスタイルの問題は、標準マーカーを使用して Monaco エディター内で直接強調表示されます。
- **クイックフィックス**: Monaco の「電球」コード アクションとの統合により、ユーザーは提案された修正を適用できるようになります。
  即座に。
- **プライバシー第一**: すべての処理は Web ワーカーでローカルに行われます。ネットワーク経由でテキストが送信されることはありません。
- **重大度レベル**: 標準の LSP 重大度レベル (エラー、警告、情報、ヒント) をサポートします。

## セットアップと構成

Harper は Web ワーカーで実行されるため、アプリケーションはエディターを初期化する前にワーカー ファクトリを構成する必要があります。
インスタンス。

### 地球環境構成

アプリケーションのメイン エントリ ポイント (`main.ts` など) で、`HarperEnvironment` を定義します。

```ts
import HarperWorker from '@mission-platform/harper/worker?worker';

window.HarperEnvironment = {
  getWorker: () => new HarperWorker(),
};
```

## 使用法

### Vue 3 (合成 API)

`useHarperMonaco` コンポーザブルは、Vue の Monaco エディター インスタンスに文法チェックをアタッチする簡単な方法を提供します。
コンポーネント。

#### 例

```vue
<script setup lang="ts">
  import { ref } from 'vue';
  import { useHarperMonaco } from '@mission-platform/harper';

  const containerRef = ref<HTMLElement>();
  const editorRef = ref<monaco.editor.IStandaloneCodeEditor>();
  const grammarCheckEnabled = ref(true);

  // Initialize Monaco editor
  onMounted(() => {
    editorRef.value = monaco.editor.create(containerRef.value!, {
      value: 'This is an exampl of a grammer error.',
      language: 'markdown',
    });
  });

  // Attach Harper grammar checking
  useHarperMonaco(editorRef, grammarCheckEnabled, 'markdown');
</script>

<template>
  <div
    ref="containerRef"
    style="height: 400px;"
  />
</template>
```

#### API リファレンス: `useHarperMonaco`

```ts
function useHarperMonaco(
  editorReference: MaybeRefOrGetter<monaco.editor.IStandaloneCodeEditor | undefined>,
  enabled: MaybeRefOrGetter<boolean>,
  languageReference: MaybeRefOrGetter<string>,
): void;
```

- `editorReference`: Monaco エディター インスタンスを提供する参照またはゲッター。
- `enabled`: 文法チェックのオン/オフを切り替えるためのリアクティブなブール値。
- `languageReference`: コード アクションの登録に使用されるエディターの言語モード。

---

### フレームワークに依存しない統合

Vue 以外のコンシューマ (`@mission-platform/components` のコンポーネントなど) の場合は、命令型 `attachHarperMonaco` を使用します。
機能。

#### 例

```ts
import { attachHarperMonaco } from '@mission-platform/harper';

// Attach Harper to an existing editor instance
const handle = attachHarperMonaco(editor, monacoRuntime, 'plaintext');

// Later, clean up listeners and workers
handle.dispose();
```

## 技術的な詳細

### `HarperIssue` インターフェイス

ワーカーは文法の問題を検出すると、`HarperIssue` オブジェクトを返します。

```ts
interface HarperIssue {
  offset: number; // Byte offset of the issue in the text
  length: number; // Length of the affected text
  message: string; // Human-readable explanation of the error
  ruleId: string; // The identifier of the specific Harper rule triggered
  suggestions: string[]; // Suggested alternative text corrections
  severity: 1 | 2 | 3 | 4; // LSP severity (1=Error, 2=Warning, 3=Info, 4=Hint)
}
```

### ワークフロー

1. **ワーカーの生成**: パッケージは、`window.HarperEnvironment` で提供されるファクトリを使用して Harper Web ワーカーを生成します。
2. **デバウンス チェック**: エディター モデルに変更を加えるたびに、ワーカーへのデバウンス リクエストがトリガーされます。
3. **マーカー マッピング**: Harper から返された問題は、視覚的に強調表示するためにモナコ マーカーにマッピングされます。
4. **コード アクション**: カスタム プロバイダーがモナコに登録され、`HarperIssue.suggestions` をクイックフィックスとして提示します。
   アクション。
