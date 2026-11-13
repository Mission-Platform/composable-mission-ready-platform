# デフォルトで安全な FWS パイプラインへの移行

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> packages/flint/core/docs/guides/migration-v1.md: [packages/flint/core/docs/guides/migration-v1.md](../../../guides/migration-v1.md)
> 言語: 日本語 (ja)

このガイドは、不変ローカル、明示的な借用、
そして、チェックされた境界ポリシーのメタデータが v1 コントラクトの一部になりました。

## 突然変異を明示的にする

割り当てられるローカルおよびパラメータに `mut` を追加します。不変の場合は `&` を追加します
借用および可変借用の場合は `&mut`。可変借用は重複できません。

```flint
fn increment(mut value: i32) -> i32 {
  value = value + 1;
  value
}

fn inspect(values: &Vector<i32>) -> i32 { values[0] }
fn update(values: &mut Vector<i32>) -> unit { values[0] = 1; }
```

推定された所有権に依存しないでください。デフォルトでは、POD 値は値によって渡されます。
非 POD 値は不変参照を使用します。 `owned`、`borrowed`、および `shared` を保持します。
特定のライフタイムまたはリリース責任が設定される ABI 境界上
必須です。一時的なリージョンを返したり、長期保存したリージョンに保存したりすることはできません。
明示的な所有権/プロモーション境界のない価値。

## 境界ポリシーの選択と監査

実行時境界チェックはデフォルトのままです。

```bash
flint compile src/main.flint --bounds-checks runtime --format json
```

`proven-safe` は、コレクション長からのすべてのアクセスが分析で証明された場合にのみ使用します。
そしてインデックス範囲の事実。 `excluded-by-profile` は明示的で監査可能なリリースです
不明なインデックスのショートカットではなく、選択です。

```bash
flint check src/main.flint --bounds-checks proven-safe --optimizer-report
```

出荷前に分析結果とマニフェスト ポリシーを確認します。不明または
信頼できないインデックスには `runtime` を使用する必要があります。厳密な分析により安全でないポリシーが拒否される
リクエスト。

## Inspect generated cache metadata

コンパイラ キャッシュには、`<key>.sonir.json`、つまり、
最適化されたノードの海グラフ。ゲスト コードを実行せずに検査します。

```bash
flint inspect-sonir .cache/main.sonir.json --format json
```

アーティファクトは、スキーマと言語/ABI バージョン、ソースとグラフのハッシュを記録します。
最適化モード、境界ポリシー、効果、所有権メタデータ、ソース スパン、
そして合格報告書を注文した。古い、形式が間違っている、サイズが大きすぎる、またはポリシーが一致しない
アーティファクトは無視されるため、安全に削除できます。

## Strict static typing and absence of dynamic types

Flint は、決定論的なメモリ レイアウトと実行時のリフレクション オーバーヘッドを備えた静的型付け言語です。この言語は、`any` や `unknown` のような動的最上位タイプをサポートしていません。

型に `any` または `unknown` の注釈を付けようとすると、コンパイル時診断 `FLINT-TYPE-020` が生成されます。動的環境からコードを移行するには:

- 動的値を具体的なプリミティブ (`i32`、`u32`、`f64`、`bool`、`string`、`bytes`) に置き換えます。
- 再利用可能なコンテナ アルゴリズムにはパラメトリック多態性 / ジェネリックス (`Vector<T>`、`Option<T>`、`Result<T, E>`) を使用します。
- 多態性ドメイン表現には、タグ付き代数データ型 (`enum`) を使用します。
- C ABI ポインターおよび不透明なホスト ハンドルの場合は、型なしポインターではなく `opaque foreign type Handle;` を宣言します。
- Web IDL ブリッジとバインディングでは、`FlintBindingOptions.customTypeMappings` を介して明示的な型マッピングを提供します。

## メモリとリリースの動作

スコープ値はチェックされた領域を使用します。リージョンを超えて存続する値は明示的な値を使用します
ARC/共有ハンドル;保持されているすべてのハンドルには、一致するリリースが 1 つあり、サイクルします。
暗黙的に受け入れられません。生の `fws_alloc`、`fws_realloc`、および `fws_dealloc`
呼び出し元が所有するチェックされた ABI 境界は残ります。非同期およびイテレータの一時停止は、
エスケープ境界であるため、一時停止後に使用される値は明示的に保持する必要があります。
