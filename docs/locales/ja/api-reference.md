# パッケージAPIディレクトリ

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> docs/api-reference.md: [docs/api-reference.md](../../api-reference.md)
> 言語: 日本語 (ja)

このプロジェクト全体のページは、パッケージの機能と互換性のディレクトリです。
契約。の正規インストール、使用法、制限事項、および API の詳細
各パッケージは、`packages/**/docs/`、` `、およびそのパッケージの隣に存在します。
そして` `。生成された API 参照は、所有者に追加する必要があります
このページではなくパッケージを参照してください。

> **インポートは常にベアです。** フレームワーク配布の `@mission-platform/*` パッケージは単一の `.` を公開します
> `mp:vue`、`mp:react`、`mp:solid`、および `mp:web-component` エクスポートによって保護されたエントリ
> 条件。 `resolve.conditions` 経由でフレームワークを **1 回**選択します (`defineFrameworkAppConfig` / を参照)
> `frameworkResolveConditions` (`@mission-platform/vite-config` から) および `customConditions` (
> `@mission-platform/typescript-config/framework-<name>` プリセット) — 次に、すべてを裸の状態でインポートします
> パッケージ指定子。 [外部コンシューマーのセットアップ](external-consumer-setup.md) を参照してください。

## コアフレームワーク

### @mission-platform/forge-jsx

「ライトワンス」アーキテクチャの基盤であり、フレームワークに依存しない JSX ランタイムとフックを提供します。

|エクスポート |タイプ |説明 |
| :----------------- | :------- | :-------------------------------------------------------------------------------------- |
| `h`、`Fragment` |機能 |コンポーネントを作成するための JSX ファクトリとフラグメント。                                      |
| `useState` |フック |フレームワーク中立状態フック。                                                           |
| `useEffect` |フック |フレームワークに依存しないエフェクトフック。                                                          |
| `useMemo` |フック |フレームワークに依存しないメモ化フック。                                                     |
| `useRef` |フック |フレームワークに依存しない参照フック。                                                       |
| `useContext` |フック |フレームワークに依存しないコンテキスト フック。                                                         |
| `toVueComponent` |アダプター | forge コンポーネントを Vue 3 コンポーネント (`@mission-platform/forge-adapters/vue` から) に変換します。   |
| `toReactComponent` |アダプター | forge コンポーネントを React コンポーネント (`@mission-platform/forge-adapters/react` から) に変換します。 |

### @mission-platform/vite-plugin-forge

コンパイラ ドライバは、明示的な `FrameworkOutputPlugin` インスタンスを受け入れます。それはあります
フレームワークレジストリは提供しません。 `defineViteForgeComponents` および
`defineTsdownForgeComponents` (およびフックと CMS ヘルパー) はインプロセスを共有します
1 つのビルドまたは監視セッションの場合は `ForgeCompilerService`。

|能力 |説明 |
| :----------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
|サービスのライフサイクル |ソース、グラフ、解析されたソース、セマンティック IR、およびターゲット アーティファクトの状態をビルド間で再利用します。完了後にワンショット サービスを破棄し、終了時にウォッチャー サービスを破棄します。 |
|キーをキャッシュする |ソース/依存関係/構成フィンガープリント、コンパイラーおよびルーターのオプション、`tsconfig` `baseUrl`/`paths`、ターゲット ID、プラグイン ID/バージョン、および関連条件。      |
|ウォッチの無効化 |変更されたファイルは、推移コンポーネントやフック エントリなどの逆グラフ依存関係を無効にします。無関係なターゲット スナップショットは引き続き再利用可能です。                     |
|診断/レポート |フェーズのタイミング、キャッシュのヒット/ミス数、影響を受けるファイル、警告、エラー、生成されたアーティファクトの数をレポートします。エラーによりプロモーションがブロックされます。                                 |
|アーティファクトマニフェスト |アトミック プロモーションの前に、ターゲット スコープのエントリ、モジュール、宣言、ソース マップ、アセット、およびチェックサムをリストします。                                                     |
|拡張ポイント |呼び出し元が所有する `forge-plugin-*` パッケージから `FrameworkOutputPlugin` を実装して渡します。ターゲット ブランチをニュートラル ドライバーに追加しないでください。                        |

プロジェクト `tsconfig.json` (`baseUrl` および
`paths`); Vite および tsdown グラフの準備では、同じエイリアス ファクトが使用されます。ルーター
選択、ルータープラグイン、および条件は、コンポーネントおよび
フックヘルパー。将来のワーカー/デーモンはサービス コントラクトの背後に存在する可能性がありますが、
サポートされている実装は現在進行中です。

### @mission-platform/router

フレームワークに依存しないルート コントラクト、純粋なマッチング ヘルパー、およびコンパイラ マーカー
共有パッケージ。アプリケーションはルート レコードとネイティブ ルーター インスタンスを所有します。の
アプリケーションによって選択された Forge ルーター ターゲットは、ランタイム機能を提供します。

|エクスポート / パッケージ |タイプ |説明 |
| :----------------------------------------------------------------------- | :--------------- | :------------------------------------------------------------------------------------------------------------------------------------ |
| `MpRoute`、`MpRouteLocationRaw`、`MpResolvedLocation` |種類 |ルート レコード、パラメータ、クエリ/ハッシュ状態、メタデータ、およびナビゲーション ターゲット。                                                            |
| `defineRoutes`、`matchRoutes`、`resolveLocation` |機能 | DOM やフレームワーク ランタイムを使用せずにルート ツリーを定義し、パスを解決します。                                                              |
| `MpNavigationResult`、`MpRouteGuard`、`MpHistory`、`MpRouterAdapter` |種類 |ナビゲーションの結果/イベント、ガード、プラグイン可能な履歴、アダプター コントラクト。                                                         |
| `MpLink`、`useMpRoute`、`useMpRouter`、`useMpNavigation`、`MpRouterView` |コンパイラマーカー |共有パッケージによって消費されるニュートラル リンク、ルート状態、ナビゲーション、解決、およびアウトレット機能。                               |
| `@mission-platform/forge-router-*` |ターゲットを鍛造する | Vue ルーター、React ルーター、SolidJS ルーター、SvelteKit、RedwoodSDK、および Web コンポーネント用に個別に選択されたネイティブ ルーター ターゲット。 |

ランタイム パッケージには独自の履歴と反応状態が含まれます。中立パッケージは UI フレームワークをインポートしません。 Web コンポーネントの場合、
要素を一度登録し、シリアル化された属性ではなく DOM プロパティを通じて複雑なターゲットを渡します。

```ts
import {
  MpMemoryHistory,
  createWebComponentsRouter,
  registerRouterElements,
  setForgeRouter,
} from "@mission-platform/forge-router-web-components/runtime";

registerRouterElements();
const router = createWebComponentsRouter({
  history: new MpMemoryHistory("/overview"),
  routes: [{ path: "/overview", component: () => "Documentation" }],
});
setForgeRouter(router);
const link = document.createElement("forge-router-link");
link.to = { path: "/overview", query: { q: "router" }, hash: "results" };
link.router = router;
```

### 非同期ルート ビューと `Suspense`

Forge のニュートラル コンパイラは `Suspense` を認識し、それをネイティブに下げます
選択したターゲットの非同期境界。共有ソースにフォールバックを保持する
そのため、フレームワークをインポートしなくても、すべてのターゲットが同じ読み込み状態を示します。
アダプター:

```tsx
<Suspense fallback={<LoadingSpinner label="Loading documentation" />}>
  <DocumentationRoute />
</Suspense>
```

React、Vue、Solid、および Svelte は、ネイティブのサスペンス境界を受け取ります。あ
フレームワークフリーのアプリケーションは、Web コンポーネントルーターのアウトレットフォールバックを使用します
代わりに非同期ルート ビューの場合:

```ts
const router = createWebComponentsRouter({
  history: new MpMemoryHistory("/overview"),
  loadingFallback: () => {
    const spinner = document.createElement("span");
    spinner.className = "docs-loading-spinner";
    spinner.setAttribute("aria-label", "Loading documentation");
    return spinner;
  },
  routes: [{ path: "/:slug(.*)", component: loadDocumentationView }],
});
```

ルーターは、非同期中に `forge-router-outlet` から読み込みオーバーレイを発行します。
ルートビューが解決されます。現在のビューは、宛先が変更されるまでマウントされたままになります。
準備が整い、成功、リダイレクト、キャンセル、または完了後にオーバーレイが削除されます。
失敗。

## UIとデザイン

### @mission-platform/tokens

色、タイポグラフィ、間隔のデザイントークンを一元化。

|エクスポート |説明 |
| :------------ | :------------------------------------------------------------------------ |
| `tokens` |すべてのデザイン トークンを含む JS/TS オブジェクト (`tokens.color.primary` など)。 |
| `tokens.scss` |スタイルシートで使用する SCSS 変数。                                    |

### @mission-platform/breakpoints

応答性の高いユーティリティと可視性コンポーネント。

|エクスポート |タイプ |説明 |
| :--------------- | :-------- | :--------------------------------------------------------- |
| `useBreakpoints` |フック |リアクティブ ブレークポイントのステータスを返します。                        |
| `ShowIf` |コンポーネント |ブレークポイント条件が一致した場合にのみ子をレンダリングします。 |
| `HideIf` |コンポーネント |ブレークポイント条件が一致した場合に子を非表示にします。        |

### @mission-platform/components

共有 UI コンポーネントは一度作成すれば、複数のフレームワークで使用できます。

- **インポート**: 常に `@mission-platform/components`;アクティブな `mp:<framework>` 条件によって、
  Vue 3、React、Solid、または Web コンポーネント ビルド。
- **コンポーネントごとのサブパス**: `@mission-platform/components/<path>` (例:
  `@mission-platform/components/atoms/forge-badge/forge-badge`) も条件を認識し、そのコンポーネントのコンポーネントのみをロードします。
  チャンク。
- **コンポーネント**: `ForgeButton`、`ForgeInput`、`ForgeModal` など。

## 機能パッケージ

### @mission-platform/i18n

i18next に基づく国際化システム。

|エクスポート |説明 |
| :---------------- | :-------------------------------------------------------- |
| `createForgeI18N` | i18n インスタンスをプラットフォームのデフォルトで初期化します。     |
| `useI18n` |コンポーネント内の翻訳とロケール切り替え用のフック。 |

### @mission-platform/seo

メタタグとSEO管理。

|エクスポート |説明 |
| :------- | :-------------------------------------------------------------------- |
| `useSeo` |ページタイトル、メタタグ、Open Graph データを宣言的に設定するためのフック。 |

### @mission-platform/map

MapLibre GL のリアクティブ ラッパー。

|コンポーネント |説明 |
| :-------------- | :---------------------------------------- |
| `<MpMap>` |メインのマップコンテナコンポーネント。             |
| `<MpMapMarker>` |地図上にマーカーを配置するためのコンポーネント。 |

### @mission-platform/code-scanner

カメラベースのバーコードと QR コードのスキャン。

|コンポーネント |説明 |
| :---------------- | :--------------------------------------------------------------- |
| `<MpCodeScanner>` |カメラストリームを初期化し、スキャン結果を出力するコンポーネント。 |

## 統合

### @mission-platform/rxjs

RxJS Observable をコンポーネントの状態にブリッジします。

|フック |説明 |
| :-------------- | :-------------------------------------------------------------------------- |
| `useObservable` |オブザーバブルをサブスクライブし、その最新の値をリアクティブ状態として返します。 |

### @mission-platform/d3

フレームワークに依存しない D3.js 統合。

|フック |説明 |
| :------ | :----------------------------------------------------------------- |
| `useD3` |ライフサイクル管理を使用して、D3 選択をコンポーネント参照にバインドします。 |

### @mission-platform/hunspell

WebAssembly を利用したスペルチェック。

|エクスポート |説明 |
| :------------- | :------------------------------------------------------ |
| `initHunspell` | Hunspell WebAssembly モジュールをロードしてインスタンス化します。 |
| `spell` |単語のスペルが正しいかどうかをチェックします。                  |
| `suggest` |単語のスペルの提案を提供します。               |

## サービス監視

### サービスモニターAPI

サービス モニター アプリケーションは、サービスの健全性を監視するためのパブリック エンドポイントと認証されたエンドポイントの両方を提供します。

#### パブリックエンドポイント

パブリック エンドポイントは最小限のステータス情報のみを公開し、認証を必要としません。

- **`GET /api/services`**: 監視対象サービスごとにロールアップされたステータスを返します。応答には、各サービスの `{ id, name, type }` のみと、`now` および `intervalSeconds` が含まれます。ターゲット構成、URL、ホスト、クエリ、ヘッダー、しきい値、またはトポロジは公開されません。
- **`GET /api/metrics?service=<id>&since=<ms>`**: 1 つのサービスの生の時系列メトリクスを返します。 `since` パラメータは、設定された保持期間によって制限されます。応答には、`service`、`now`、`since`、および `samples` のみが含まれます。

#### 認証されたエンドポイント

認証されたエンドポイントには `MONITOR_API_TOKEN` ベアラー トークンが必要で、完全なモニター構成が公開されます。

- **`POST /api/check`**: 即時プローブ サイクルをトリガーします。
- **`GET /api/monitors`**: 完全な構成を持つすべてのモニターをリストします。
- **`POST /api/monitors`**: 新しいモニターを作成します。
- **`PATCH /api/monitors/<id>`**: 既存のモニターを更新します。
- **`DELETE /api/monitors/<id>`**: モニターを削除し、その履歴カウンターをクリアします。

#### プローブと宛先ポリシー

Service-monitor は、プローブの動作に厳密な制限を適用します。

- **許可されたスキーム**: 信頼できるプライベート モードが有効になっていない限り、URL プローブはデフォルトで `https://` (およびポート 443) になります。 `http://` は高信頼モードで許可されます。
- **許可されたポート**: URL プローブではポート 443 が許可されます。ホスト プローブでは、ポート [53、80、123、443、1883、8883] のベースラインが許可されます。
- **禁止された宛先**: 明示的に信頼されていない限り、プライベート/リンクローカル アドレス (127.0.0.1、::1、10.0.0.0/8、172.16.0.0/12、192.168.0.0/16、fe80::/10)。
- **リクエスト/レスポンスの制限**: プローブ リクエストは 64 KB に制限されます。応答は 256 KB に制限されます。速度テストは 25 MB に制限されます。
- **リダイレクト ポリシー**: リダイレクトは同じ発信元および承認されたパス プレフィックス内に留まる必要があります。クロスオリジンまたは許可されていないパスのリダイレクトは拒否されます。
- **履歴保持**: インシデント、更新、およびメンテナンスの履歴は、項目数の上限によって制限されます (モニターごとに最大 100 項目)。メトリック データのデフォルトの保持期間は 24 時間です。

#### サーバーサイド レンダリング (SSR)

サービス モニター SSR レイヤーでは、プライベート モニター構成をクライアント プロパティにシリアル化する前に認証が必要です。認証されていないリクエストは、パブリック ステータス DTO のみを受け取ります。

### 電子メール送信者ワーカー

電子メール送信ワーカーは、電子メールのレンダリングと配信のためのローカル開発ショーケースを提供します。

#### 導入モード

- **ローカル開発** (デフォルト): `localhost:1025` で MailPit に送信します。認証は必要ありません。
- **非ローカル展開**: 明示的な `EMAIL_DEPLOYMENT_TOKEN` ベアラー認証、`EMAIL_ALLOWED_ORIGINS` ホワイトリスト、および `EMAIL_ALLOWED_RECIPIENTS` ホワイトリストが必要です。 `EMAIL_RATE_LIMITER` によるレート制限が適用されます。

#### 検証のリクエスト

すべての電子メール リクエストは次のとおりである必要があります。

- `Content-Type: application/json` を使用します。
- 有効な受信者の電子メール アドレスを含めます (`to` フィールド、最大 254 文字)。
- 受信者名 (`recipientName`、1 ～ 100 文字) を含めます。
- 完成した電子メール HTML (`html`、最大 240 KB) を含めます。
- `assertCompatibleEmailHtml` 経由で HTML 互換性チェックに合格します。

#### フェールクローズされたデフォルト

明示的な構成を行わない非ローカル展開では、すべてのリクエストが拒否されます。開発の便宜上、ローカル デプロイメントには制限がありません。

## Forge Web スクリプト アーティファクトの検証

### アーティファクトコンテンツのアイデンティティ

Forge Web Script アーティファクトは、`sha256-v1:<hex>` 形式のバージョン管理された SHA-256 コンテンツ ID を使用します。このダイジェストは、完全なアーティファクト バイナリに対して計算され、アーティファクト マニフェストの `contentHash` フィールドに保存されます。

#### 誠実さと信頼性

コンテンツ ハッシュは、信頼できる期待値と比較したときに **偶発的または不正なコンテンツの変更を検出**します。 **そうではありません**:

- 成果物の製作者または出所を認証します。
- 暗号化署名または展開アクセス制御を置き換えます。
- アーティファクトが安全に実行できることを保証します。

#### 検証ワークフロー

1. **期待されるハッシュを**信頼できるソース (署名されたマニフェスト、CI ビルド ログ、安全な構成など) から取得します。
2. **検証ツールを使用してアーティファクト ハッシュを計算します**。`fws_verify_artifact(artifact)` は `contentHash` を返します。
3. **ハッシュを比較**: 一致する場合、アーティファクトは、期待値が記録されて以来、誤ってまたは悪意を持って変更されていません。
4. **マニフェストを確認します**: `fws_inspect_manifest` を使用して、機能のインポート、エクスポート、メタデータ、およびポリシーへの準拠を個別に確認します。

#### バージョン管理

`sha256-v1` プレフィックスにより、将来のハッシュ アルゴリズムを曖昧さなくアップグレードできるようになります。呼び出し元は、レガシー (存在する場合) と現在のダイジェスト形式の両方を適切に処理する必要があります。

## さらに読む

- [Vue 2 から Vue 3 への移行ガイド](migration-guides/vue2-to-vue3.md)
- [プロジェクト構成の概要](packages/tooling/configs/index.md)
- [ワークスペース構造](workspace-structure.md)

## 完全なワークスペース パッケージ インデックス

次のインデックスはパッケージ マニフェストから生成され、ここに保存されるため、パブリック API リファレンスではあらゆるものがカバーされます。
`packages/` のパッケージ (型指定された WebAssembly ファサードを含む)。

### コアとUI

|パッケージ |目的 |
| :----------------------------- | :------------------------------------------------------------ |
| `@mission-platform/forge-jsx` |フレームワークに依存しない JSX ランタイムとアダプター。                   |
| `@mission-platform/components` |ライトワンス UI コンポーネント。                                     |
| `@mission-platform/icons` |ライトワンス SVG アイコン コンポーネント。                               |
| `@mission-platform/layouts` |アプリケーション、コンテナ、およびレスポンシブ レイアウトのコンポーネント。     |
| `@mission-platform/forms` |スキーマ フォームとビジュアル フォーム ビルダー コンポーネント。              |
| `@mission-platform/forms-core` |スキーマ導出、検証、およびフォームビルダードメインロジック。 |
| `@mission-platform/tokens` | CSS カスタム プロパティと SCSS デザイン トークン。                 |

### コンポーザブルと統合

|パッケージ |目的 |
| :---------------------------------------------- | :--------------------------------------------------------------- |
| `@mission-platform/breakpoints` |応答性のブレークポイントの状態と可視性ヘルパー。              |
| `@mission-platform/d3` | D3 選択ライフサイクル コンポーザブルおよびマージン ユーティリティ。          |
| `@mission-platform/i18n` | i18next 状態およびフレームワーク統合ヘルパー。                 |
| `@mission-platform/map` | MapLibre マップ コンポーネントとコンポーザブル。                         |
| `@mission-platform/observers` |交差、突然変異、およびパフォーマンス オブザーバー コンポーザブル。    |
| `@mission-platform/phone-number` |入力された WebAssembly 電話番号の解析と書式設定。           |
| `@mission-platform/router` |フレームワークに依存しないルート コントラクトとコンパイラ機能。     |
| `@mission-platform/forge-router-web-components` | Web コンポーネント ルーター ターゲットとフレームワークフリーのランタイム。         |
| `@mission-platform/rxjs` | RxJS オブザーバブルおよびサブスクリプション コンポーザブル。                    |
| `@mission-platform/scheduler` |スケジューラ UI、繰り返し、およびカレンダー レイアウトのドメイン ロジック。      |
| `@mission-platform/vcard` | RFC 6350 vCard および RFC 5545 iCalendar データとコンポーネント。       |
| `@mission-platform/content` |コンテンツ AST、ビルダー、Monaco、Markdown、および WYSIWYG コンポーネント。 |
| `@mission-platform/seo` |メタデータ、オープン グラフ、構造化データ コンポーザブル。           |
| `@mission-platform/speech-audio` |音声、オーディオ、Web MIDI コンポーザブル。                         |
| `@mission-platform/three` | Three.js キャンバスとライフサイクル コンポーザブル。                       |

### コードと WebAssembly パッケージ

|パッケージ |目的 |
| :------------------------------- | :----------------------------------------------- |
| `@mission-platform/barcode` | 1D バーコードは、ファサードとコンポーネントをエンコード/デコードします。   |
| `@mission-platform/code-scanner` |カメラおよび画像コードスキャンコンポーネント。        |
| `@mission-platform/matrix-code` | Data Matrix と Aztec はファサードをエンコード/デコードします。      |
| `@mission-platform/qr-code` |ファサードとコンポーネントを QR エンコード/デコードします。           |
| `@mission-platform/harper` | Harper の文法とスタイルをモナコに統合。 |
| `@mission-platform/hunspell` | Emscripten Hunspell スペルチェック ラッパー。      |

### Forge コンパイラ ターゲット

これらは、`packages/` ではなく `packages/compiler/plugins/` に存在します。 **フレームワーク** プラグインは、どのランタイムを中立コンポーネントにするかを決定します
に引き下げられます。 **CMS** ターゲットは、どのコンテンツ プラットフォームに投影されるかを決定します。 2 つの軸が構成されるため、どの CMS でも
target は任意のフレームワーク プラグインにバインドできます。 [Forge コンパイラ パイプライン](../../../packages/tooling/vite/forge/docs/locales/ja/reference/compiler.md) を参照してください。

|パッケージ |目的 |
| :---------------------------------------------- | :-------------------------------------------------------------------------------- |
| `@mission-platform/forge-plugin-api` | `FrameworkOutputPlugin` コントラクト、セマンティック IR タイプ、およびビルド アダプター タイプ。     |
| `@mission-platform/forge-plugin-react` | React 出力ターゲット。                                                              |
| `@mission-platform/forge-plugin-vue` | Vue 3 出力ターゲット。                                                              |
| `@mission-platform/forge-plugin-solid` | Solid 出力ターゲット。                                                              |
| `@mission-platform/forge-plugin-svelte` | Svelte 5 出力ターゲット。                                                           |
| `@mission-platform/forge-plugin-web-components` | Web コンポーネントの出力ターゲット。                                                     |
| `@mission-platform/forge-cms-plugin-api` | `CmsOutputPlugin` コントラクト、ニュートラル コンテンツ モデル、CMS ドライバー、およびビルド ヘルパー。 |
| `@mission-platform/forge-cms-storyblok` | Storyblok コンポーネント オブジェクト、ブロック ラッパー、`components.json`。                |
| `@mission-platform/forge-cms-astro` |静的 `.astro` テンプレートと `client:load` フレームワーク アイランド。                    |
| `@mission-platform/forge-cms-ghost` | Ghost Handlebars のパーシャルと `config.custom` テーマのフラグメント。                   |
| `@mission-platform/forge-cms-jekyll` | Jekyll Liquid には、`_data` スキーマと `_config.yml` フラグメントが含まれています。             |
| `@mission-platform/forge-cms-webflow` | Webflow `declareComponent` コード コンポーネントと `webflow.json` ライブラリ フラグメント。 |

#### @mission-platform/forge-cms-plugin-api

|エクスポート |タイプ |説明 |
| :------------------------ | :------- | :------------------------------------------------------------------------------ |
| `analyzeContentComponent` |機能 |中立的なコンポーネントのプロパティをプラットフォーム中立的なコンテンツ モデルに投影します。   |
| `ContentComponent` |タイプ | `ContentField`、スロット、および `interactive` フラグを注文しました。                     |
| `ContentFieldKind` |タイプ | `text`、`richtext`、`number`、`boolean`、`option`、`asset`、`link`、`children`。 |
| `CmsOutputPlugin` |タイプ |ターゲット コントラクト: バインドされたフレームワーク プラグインと 4 つのエミッター。           |
| `defineForgeCmsPlugin` |機能 |構成時に CMS ターゲットを検証します。                                   |
| `generateCmsArtifacts` |機能 |一般的な検出→IR→コンテンツモデル→出力→ドライバーの書き込み。                |
| `defineTsdownForgeCms` |機能 | 1 つの CMS ターゲットの tsdown 構成で、`dist/cms/<cms>/<framework>/**` が発行されます。     |
| `defineTsdownForgeCmsAll` |機能 | CMS ターゲットのリストの tsdown config。                                       |
