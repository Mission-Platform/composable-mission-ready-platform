# @mission-platform/storybook-framework

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> configs/storybook-framework/docs/index.md: [configs/storybook-framework/docs/index.md](../../index.md)
> 言語: 日本語 (ja)

Mission Platform 用に環境で選択された Storybook フレームワーク プリセット。

## インストールして使用する

パッケージを Storybook ワークスペースに追加し、から参照します。
`.storybook/main.ts` または対応する Storybook 設定。を選択します。
ワークスペースのサポートされている条件によるフレームワーク。をハードコーディングしないでください
共有コンポーネント パッケージ内のフレームワーク アダプター。

## 貢献する

走る `pnpm --filter @mission-platform/storybook-framework lint` そして
ストーリーブックのビルド チェック。このパッケージはフレームワークの選択に重点を置き、
Storybook のデフォルトを共有。コンポーネントストーリーが属するのは `apps/storybook`.
