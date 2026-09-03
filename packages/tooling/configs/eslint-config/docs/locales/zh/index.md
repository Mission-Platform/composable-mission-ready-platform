# @mission-platform/eslint-config

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> packages/tooling/configs/eslint-config/docs/index.md: [packages/tooling/configs/eslint-config/docs/index.md](../../index.md)
> 语言: 简体中文 (zh)

合租公寓 ESLint 任务平台工作区的配置。

## 安装与使用

将包添加到工作区的开发依赖项并扩展平面
配置来自 `eslint.config.js`:

```bash
pnpm add --save-dev @mission-platform/eslint-config
```

```js
import baseConfig from '@mission-platform/eslint-config';

export default [...baseConfig];
```

套餐包括 TypeScript, Vue 3、可访问性、导入、 Turbo, 和
格式化集成。仅针对以下行为添加特定于工作区的规则
无法共享。参见[ ESLint 参考]（reference/eslint.md) 为
包括插件和命令。

## 贡献

跑步 `pnpm --filter @mission-platform/eslint-config lint` 和
`pnpm --filter @mission-platform/eslint-config format` 改变规则后。
保持包框架感知但与工作空间无关；应用程序应该
不从另一个工作区导入规则。
