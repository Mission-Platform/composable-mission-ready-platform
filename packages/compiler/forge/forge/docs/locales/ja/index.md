# @mission-platform/forge

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> packages/compiler/forge/forge/docs/index.md: [packages/compiler/forge/forge/docs/index.md](../../index.md)
> 言語: 日本語 (ja)

Mission Platform 用の依存関係のない小さな「一度書き込めば、Vue 3 および React で実行できる」レイヤー。コンポーネントは一度作成される
JSX を使用し、小さなアダプターを介していずれかのフレームワークでレンダリングされます。ビルド時のコード生成や外部コンパイラーはありません (これは
有糸分裂のようなツールに代わる手巻きの代替品）。

## 仕組み

```
author .tsx ──(classic jsx factory `h`)──▶ MpElement tree ──▶ toReactComponent ──▶ React
                                                          └──▶ toVueComponent  ──▶ Vue 3
```

1. コンポーネントは、**クラシック** JSX 変換 (`jsxFactory: 'h'`、
   `jsxFragmentFactory: 'Fragment'`)。
2. `h(...)` は、React/Vue 要素の代わりに、フレームワークに依存しないシリアル化可能な `MpElement` ツリーを構築します。
3. フレームワークごとのアダプターはそのツリーをたどり、レンダリング時にすべての node を `React.createElement` または Vue の `h` にマップします。

## 特徴

- **フレームワーク中立の JSX ランタイム**: シリアル化可能な `MpElement` ツリーを構築する、依存関係のない小型のランタイム
- **Vue 3 アダプター**: ニュートラルコンポーネントを適切な反応性を持つネイティブ Vue 3 SFC に変換します。
- **React アダプター**: ニュートラル コンポーネントをネイティブ React コンポーネントに変換します。
- **フックのサポート**: フレームワークに依存しない React スタイルのフック (`useState`、`useRef`、`useEffect`、`useMemo`、`useCallback`)
  同等のフレームワークにコンパイルされる
- **ビルドタイム コード生成なし**: Mitosis や同様のツールとは異なり、このアプローチはビルドタイムではなくランタイム アダプターを使用します。
  変換
- **TypeScript First**: 適切な型推論による TypeScript の完全なサポート

## インストール

```bash
npm install @mission-platform/forge
# or
yarn add @mission-platform/forge
# or
pnpm add @mission-platform/forge
```

## 基本的な使い方

### 1. フレームワークに依存しないコンポーネントを作成する

```tsx
// MyComponent.tsx
import { h, Fragment } from '@mission-platform/forge';
import { useState } from '@mission-platform/forge';

export function MyComponent({ name }: { name: string }) {
  const [count, setCount] = useState(0);

  return (
    <div>
      <h1>Hello, {name}!</h1>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}
```

### 2. Vue 3 で使用します。

```vue
<script setup lang="ts">
  import { toVueComponent } from '@mission-platform/forge/vue';
  import MyComponent from './MyComponent.tsx';

  const MyVueComponent = toVueComponent(MyComponent);
</script>

<template>
  <MyVueComponent name="World" />
</template>
```

### 3. Reactで使用します

```tsx
import { toReactComponent } from '@mission-platform/forge/react';
import MyComponent from './MyComponent.tsx';

const MyReactComponent = toReactComponent(MyComponent);

function App() {
  return <MyReactComponent name="World" />;
}
```

## APIリファレンス

### コア機能

#### `h(type, props?, ...children)`

フレームワークに依存しない JSX ファクトリ関数。

**パラメータ:**

- `type`: React 要素タイプまたは文字列タグ名
- `props`: 小道具/属性のオブジェクト
- `children`: 子要素

**戻り値:** `MpElement` - フレームワーク中立の要素ツリー

#### `Fragment(props, ...children)`

フラグメントを作成します (ラッパー要素なし)。

### フック

#### `useState(initialValue)`

フレームワーク中立状態フック。

**パラメータ:**

- `initialValue`: 初期状態値

**戻り値:** `[state, setState]` - 状態値と設定関数

#### `useRef(initialValue)`

可変の ref オブジェクトを作成します。

**パラメータ:**

- `initialValue` (オプション): 初期参照値

**戻り値:** `ref` - `.current` プロパティを持つ変更可能な ref オブジェクト

#### `useEffect(effect, dependencies?)`

フレームワークに依存しない副作用フック。

**パラメータ:**

- `effect`: マウント/更新/アンマウント時に実行する関数
- `dependencies` (オプション): メモ化のための依存関係配列

#### `useMemo(value, dependencies)`

計算された値をメモ化します。

**パラメータ:**

- `value`: メモ化する値
- `dependencies`: 依存関係配列

**戻り値:** メモ化された値

#### `useCallback(fn, dependencies)`

関数をメモ化します。

**パラメータ:**

- `fn`: メモ化する機能
- `dependencies`: 依存関係配列

**戻り値:** メモ化された関数

### アダプター

#### `toVueComponent(component)`

フレームワークに依存しないコンポーネントを Vue 3 コンポーネントに変換します。

**パラメータ:**

- `component`: フレームワークに依存しないコンポーネント関数

**戻り値:** Vue コンポーネント定義

#### `toReactComponent(component)`

フレームワークに依存しないコンポーネントを React コンポーネントに変換します。

**パラメータ:**

- `component`: フレームワークに依存しないコンポーネント関数

**戻り値:** React コンポーネント関数

## TypeScript のサポート

パッケージには完全な TypeScript 宣言が含まれています。適切な型チェックを行って JSX を使用できます。

```tsx
import { h } from '@mission-platform/forge';

type Props = {
  title: string;
  count?: number;
};

function MyComponent({ title, count = 0 }: Props) {
  return (
    <div>
      {title}: {count}
    </div>
  );
}
```

## 高度な使用法

### Vite との併用

クラシック JSX 変換を使用するように `vite.config.ts` を構成します。

```ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [vue(), react()],
  optimizeDeps: {
    include: ['@mission-platform/forge'],
  },
});
```

### グローバル JSX 構成

TypeScript プロジェクトの場合、グローバル JSX 設定を構成できます。

```ts
// jsx-globals.d.ts
import '@mission-platform/forge/jsx-globals';
```

これにより、`MpElement` を使用するようにグローバル `JSX` 名前空間が構成されます。

## 他のフレームワークからの移行

React または Vue コンポーネントから移行する場合、変換は簡単です。

### Reactから

```tsx
// Before (React)
function Button({ children }) {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{children}</button>;
}

// After (Framework-neutral)
import { h, Fragment, useState } from '@mission-platform/forge';

export function Button({ children }) {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{children}</button>;
}
```

### Vueから

```vue
<!-- Before (Vue) -->
<script setup>
  import { ref } from 'vue';
  const count = ref(0);
</script>

<template>
  <button @click="count++">Count: {{ count }}</button>
</template>

// After (Framework-neutral) export function Button() { const [count, setCount] = useState(0) return (
<button onClick="{()" =""> setCount(count + 1)}>
      Count: {count}
    </button>
) }
```

## パフォーマンスに関する考慮事項

- フレームワークに依存しないレイヤーにより、最小限のオーバーヘッドが追加されます (レンダリング時のツリー ウォークのみ)
- 最適なパフォーマンスを実現するために、フックはネイティブ フレームワークと同等のものにコンパイルされます。
- ランタイム解析やコード生成は実行されません。
- メモリ使用量は、React コンポーネントと Vue コンポーネントを個別に作成する場合に匹敵します。

## ライセンス

BSD-4-Claes
