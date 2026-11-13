# @mission-platform/stylelint-config

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> packages/tooling/configs/stylelint-config/docs/index.md: [packages/tooling/configs/stylelint-config/docs/index.md](../../index.md)
> 语言: 简体中文 (zh)

在 Mission Platform 中共享 CSS 和 SCSS 的 Stylelint 规则。

## 安装与使用

```bash
pnpm add --save-dev @mission-platform/stylelint-config postcss-html postcss-scss \
  stylelint stylelint-config-recommended-vue stylelint-config-standard-scss
```

承载样式的工作区在 ESM 中使用工作区本地 `stylelint.config.mjs`
格式。导入并传播共享配置而不是复制其
`extends` 条目：

```js
// stylelint.config.mjs
import baseConfig from '@mission-platform/stylelint-config';

export default { ...baseConfig };
```

共享配置扩展了 `stylelint-config-standard-scss` 和
`stylelint-config-recommended-vue`。它默认使用 `postcss-html`，使用
`postcss-scss` 用于 `**/*.scss`，并使用 `postcss-html` 用于 Vue SFC 样式
块。这支持 CSS、SCSS 和 Vue 样式，无需特定于工作区
语法配置。

将上面的直接支持依赖项添加到工作区的
`devDependencies` 使用 `catalog:stylelint` 版本，以及
使用 `workspace:*` 共享配置包。添加涵盖以下内容的脚本
工作区的样式源，例如：

```json
{
  "scripts": {
    "lint:style": "stylelint \"src/**/*.{vue,scss,css}\"",
    "lint:style:fix": "stylelint --fix \"src/**/*.{vue,scss,css}\""
  }
}
```

保持组件样式与其组件接近，并仅使用本地覆盖
记录的工作空间约束。

## 贡献

运行 `pnpm --filter @mission-platform/stylelint-config lint` 并
`pnpm --filter @mission-platform/stylelint-config format`。测试规则变更
针对包 SCSS 和应用程序样式。
