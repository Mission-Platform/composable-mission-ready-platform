# @mission-platform/stylelint-config

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> packages/tooling/configs/stylelint-config/docs/index.md: [packages/tooling/configs/stylelint-config/docs/index.md](../../index.md)
> 语言: 简体中文 (zh)

共享 Stylelint Mission Platform 中 CSS 和 SCSS 的规则。

## 安装与使用

```bash
pnpm add --save-dev @mission-platform/stylelint-config postcss-html postcss-scss \
  stylelint stylelint-config-recommended-vue stylelint-config-standard-scss
```

包含样式的工作区使用 ESM 格式的本地文件 `stylelint.config.mjs`。导入并展开共享配置，而不是重复其 `extends` 条目：

```js
// stylelint.config.mjs
import baseConfig from '@mission-platform/stylelint-config';

export default { ...baseConfig };
```

共享配置扩展 `stylelint-config-standard-scss` 和 `stylelint-config-recommended-vue`。默认使用 `postcss-html`，对 `**/*.scss` 使用 `postcss-scss`，对 Vue 样式块使用 `postcss-html`。将带有 `catalog:stylelint` 版本的直接支持依赖以及带有 `workspace:*` 的共享配置包添加到 `devDependencies`。

```json
{
  "scripts": {
    "lint:style": "stylelint \"src/**/*.{vue,scss,css}\"",
    "lint:style:fix": "stylelint --fix \"src/**/*.{vue,scss,css}\""
  }
}
```

从工作区扩展包 `stylelint.config.mjs`。保留组件
样式接近其组件，并且仅对已记录的内容使用本地覆盖
工作空间限制。

## 贡献

跑步 `pnpm --filter @mission-platform/stylelint-config lint` 和
`pnpm --filter @mission-platform/stylelint-config format`。测试规则变更
针对包 SCSS 和应用程序样式。
