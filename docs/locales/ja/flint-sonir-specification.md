# Sea-of-Nodes 中間表現 (SonIR 2.0) 仕様

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> docs/flint-sonir-specification.md: [docs/flint-sonir-specification.md](../../flint-sonir-specification.md)
> 言語: 日本語 (ja)

**仕様バージョン:** 2.0.0 (ターゲット アーキテクチャの提案)
**コンパイラ ベースライン:** `@mission-platform/flint` の SonIR 1.0 (`FLINT_SON_SCHEMA_VERSION = '1.0'`)
**マイルストーン ターゲット:** Wave 2 / Issue #45 (正式な Sea-of-Nodes スキーマ、メモリ SSA、GVN & SCCP)
**ステータス:** アーキテクチャ提案とターゲット スキーマ仕様
**コンパイラ:** `@mission-platform/flint`

---

## 1. アーキテクチャの原則

SonIR 2.0 は、Cliff Click の Sea-of-Nodes 計算に基づいて、データ フロー、制御フロー、およびメモリ効果グラフを単一のグラフ表現に統合する Sea-of-Nodes 中間表現です。

### 1.1 不変条件

- **明示的なトリプルポート モデル:** すべての node は、ポートを次のように明示的に分離します。
  1. **制御ポート:** 実行順序、領域コンバージェンス、ループ ヘッダー、および分岐の決定。
  2. **メモリ/エフェクト ポート (メモリ SSA):** メモリの依存関係、ロード、ストア、割り当て、およびバリアを表す状態トークン。
  3. **値ポート:** 純粋な値、型付き算術演算、論理演算、および参照。
- **決定的最適化:** パスは決定的であり、Global Value Numbering (GVN) を介して冪等にハッシュ変換されます。
- **グラフの不変性:** 変換により、メモリの安全性、アフィン所有権セマンティクス、および明示的な機能境界が維持されます。

### 1.2 ベースライン実装と SonIR 2.0 移行計画

アクティブなコンパイラ (`@mission-platform/flint`) 現在 SonIR 1.0 を発行しています (`FLINT_SON_SCHEMA_VERSION = '1.0'`):

- **SonIR 1.0 ベースライン:** 制御領域に分割された統合データフロー/制御ノードを実装します (`function`, `block`, `branch`, `loop`, `switch`）、 と node-レベル効果タグ(`pure`, `read`, `write`, `call`, `control`, `allocation`, `unknown`) およびエイリアス ファクト (`none`, `local`, `borrowed`, `mutable`, `unknown`）。メモリは以下で管理されます。 `region-arc-checked-linear` モデル。
- **SonIR 2.0 ターゲットの進化 (問題 #45、ウェーブ 2):**
  - 暗黙的なリージョン メンバーシップを置き換える明示的なトリプルポート エッジ ルーティング。
  - シリアル化、検査、検証用の正式なドラフト 2020-12 JSON スキーマ。
  - 冗長ロード排除 (RLE) とストア転送を可能にするメモリ SSA トークン。
  - 正式な GVN およびスパース条件付き定数伝播 (SCCP) がパスします。
  - マルチメモリ分離のサポート (`multi-memory-segregated`) ウェーブ 4 の場合。

---

## 2. 正式なスキーマと Node の構造

### 2.1 Node の階層とポートの分類

```
       ┌────────────────────────────────────────────────────────┐
       │                   SonIR 2.0 Node                       │
       ├────────────────────────────────────────────────────────┤
       │ Control Inputs  [ C_in_0, C_in_1, ... ]               │
       │ Memory Inputs   [ M_in_0, M_in_1, ... ] (Memory SSA)   │
       │ Value Inputs    [ V_in_0, V_in_1, ... ]                │
       ├────────────────────────────────────────────────────────┤
       │ Node ID: u32                                           │
       │ OpCode:  FlintSoNOpCode                                │
       │ Type:    FlintTypeDescriptor                           │
       │ Alias:   'none' | 'local' | 'borrowed' | 'mutable'     │
       │ Purity:  'pure' | 'read' | 'write' | 'barrier'         │
       ├────────────────────────────────────────────────────────┤
       │ Control Outputs [ C_out_0, ... ]                       │
       │ Memory Outputs  [ M_out_0, ... ]                       │
       │ Value Outputs   [ V_out_0, ... ]                       │
       └────────────────────────────────────────────────────────┘
```

### 2.2 正式な JSON スキーマ定義 (ターゲット v2.0)

コンパイラーによってシリアル化された SonIR 2.0 モジュール アーティファクトのターゲット JSON スキーマ:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "FlintSonIrModuleV2",
  "type": "object",
  "required": [
    "schemaVersion",
    "abiVersion",
    "compilerVersion",
    "graphHash",
    "functions",
    "nodes"
  ],
  "properties": {
    "schemaVersion": { "type": "string", "const": "2.0.0" },
    "abiVersion": { "type": "string" },
    "compilerVersion": { "type": "string" },
    "sourceHash": { "type": "string" },
    "graphHash": { "type": "string" },
    "optimization": { "type": "string", "enum": ["debug", "release"] },
    "boundsChecks": {
      "type": "string",
      "enum": ["runtime", "proven-safe", "excluded-by-profile"]
    },
    "memoryModel": {
      "type": "string",
      "enum": ["region-arc-checked-linear", "multi-memory-segregated"]
    },
    "functions": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "name", "entryNodeId", "exitNodeId", "exported"],
        "properties": {
          "id": { "type": "integer" },
          "name": { "type": "string" },
          "entryNodeId": { "type": "integer" },
          "exitNodeId": { "type": "integer" },
          "exported": { "type": "boolean" },
          "paramTypes": { "type": "array", "items": { "type": "string" } },
          "returnType": { "type": "string" }
        }
      }
    },
    "nodes": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "op", "functionId"],
        "properties": {
          "id": { "type": "integer" },
          "functionId": { "type": "integer" },
          "op": { "type": "string" },
          "type": { "type": "string" },
          "value": { "type": ["boolean", "number", "string", "null"] },
          "controlInputs": { "type": "array", "items": { "type": "integer" } },
          "memoryInputs": { "type": "array", "items": { "type": "integer" } },
          "valueInputs": { "type": "array", "items": { "type": "integer" } },
          "effects": { "type": "array", "items": { "type": "string" } },
          "alias": {
            "type": "string",
            "enum": ["none", "local", "borrowed", "mutable", "unknown"]
          },
          "span": {
            "type": "object",
            "required": ["start", "end", "line", "column"],
            "properties": {
              "start": { "type": "integer" },
              "end": { "type": "integer" },
              "line": { "type": "integer" },
              "column": { "type": "integer" }
            }
          }
        }
      }
    }
  }
}
```

---

## 3. Node の操作とカテゴリ

### 3.1 制御ノード

- **`Start`**: 初期のコントロール トークンとメモリ トークンを提供する関数エントリ ポイント。
- **`Region`**: 複数の受信制御フローをマージします (`if/else` の終わり、ループ先頭など)。
- **`If`**: 制御入力とブール値入力を受け取ります。 `IfTrue` および `IfFalse` 制御投影を発行します。
- **`Loop`**: 受信フォワード コントロールとバックエッジ コントロールを含むループ ヘッダー領域。
- **`Return`**: 制御トークン、メモリ トークン、および結果値を取得して関数を終了します。

### 3.2 メモリ SSA ノード

- **`MemoryPhi`**: `Region` で分岐した制御フロー全体のメモリ トークンをマージします。
- **`Load`**: `(base, offset)` でメモリを読み取ります。制御、メモリトークン、アドレス値を取得します。メモリトークンとロードされた値を発行します。
- **`Store`**: `(base, offset)` にメモリを書き込みます。制御、メモリトークン、アドレス値、保存された値を取得します。更新されたメモリトークンを発行します。
- **`HeapAlloc`**: 所有構造を線形メモリまたはリージョナル メモリに割り当てます。コントロール トークンとメモリ トークンを取得します。メモリトークンとポインタ値を発行します。
- **`Fence` / `Barrier`**: マルチスレッドまたはホスト共有メモリの順序制約を確立します。

### 3.3 純粋な価値ノード

- **`Constant`**: リテラル数値、ブール値、および文字列参照。
- **`Add`、`Sub`、`Mul`、`Div`、`Mod`**: 固定幅および浮動小数点演算。
- **`Shl`、`Shr`、`And`、`Or`、`Xor`**: ビット単位の操作。
- **`VectorLoad`、`VectorAdd`、`VectorFMA`**: SIMD 128 ビット ベクトル命令 (`v128`)。

---

## 4. 最適化パイプライン

```
  Lowered IR
      │
      ▼
┌───────────────────────────────┐
│ Global Value Numbering (GVN)  │ ── Fold duplicate arithmetic and address calculations
└───────────────────────────────┘
      │
      ▼
┌───────────────────────────────┐
│ Sparse Conditional Constant   │ ── Constant folding across conditional branches
│ Propagation (SCCP)            │
└───────────────────────────────┘
      │
      ▼
┌───────────────────────────────┐
│ Memory SSA Redundant Load     │ ── Store forwarding & elimination of repeated reads
│ Elimination (RLE)             │
└───────────────────────────────┘
      │
      ▼
┌───────────────────────────────┐
│ Loop Invariant Code Motion    │ ── Hoist loop-invariant calculations to loop pre-headers
│ (LICM)                        │
└───────────────────────────────┘
      │
      ▼
┌───────────────────────────────┐
│ Bounds Proof Elimination      │ ── Prove array/vector indices statically safe; remove checks
└───────────────────────────────┘
      │
      ▼
┌───────────────────────────────┐
│ Dead Node & Region Pruning    │ ── Eliminate unreachable branches and unused pure nodes
└───────────────────────────────┘
      │
      ▼
  Optimized SonIR ──> Wasm Code Generator
```

### 4.1 最適化パスマトリックス

|最適化パス | SonIR 1.0 ベースライン | SonIR 2.0 ターゲット (問題 #45) |主なメリット |
| :------------------------------------ | :---------------------- | :---------------------------- | :-------------------------------- |
| **定数とコピーの伝播** |実装済み |ラティス値による強化 |データフロー式を簡素化する |
| **グローバル値番号付け (GVN)** |構造的一致 |ドミネーターツリー合同式 |冗長な計算を排除 |
| **CFG と領域の簡素化** |リージョンの結合 |マルチリージョンの再構築 |無条件ジャンプを削除します。
| **メモリ SSA RLE** |未実装 |完全なストアからロードへの転送 |線形メモリアクセスを削減 |
| **ループ不変コード モーション (LICM)** |未実装 |プリヘッダホイスティング |ループの反復作業を軽減します。
| **境界証明分析** |間隔チェック |多面体の値範囲の証明 |実行時の境界トラップを排除します。
| **デッド Node プルーニング** |到達可能性マーク/スイープ |逆注文後の活性度 |最終的なバイナリ フットプリントを縮小します。

---

## 5. WebAssembly の低下とハードウェア アクセラレーション

1. **SIMD (`v128`) ベクトル化 (問題 #44、Wave 3):** スライス操作、スキャナー ビット チェック、および並列比較のためのハードウェア ベクトル命令を発行します。
2. **バルク メモリ操作 (問題 #44、ウェーブ 3):** コピー ループとフィル ループをハードウェアに最適化された `memory.copy` および `memory.fill` に下げます。
3. **末尾呼び出し (`tail-call`):** 再帰関数、パーサー、およびステート マシン ループに `return_call` を使用して、$O(1)$ スタック スペースを保証します。
4. **マルチメモリ パーティショニング (問題 #49、Wave 4):** プライベート ゲスト ヒープの実行をホスト相互運用転送バッファから分離し、内部データ構造のメモリ破損がゼロであることを保証します。

---

## 6. 関連仕様およびアーキテクチャ文書

- [Flint言語仕様](flint-language-specification.md)
- [アーキテクチャの概要](architecture.md)
- [ベストプラクティス](best-practices.md)
