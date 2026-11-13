# @mission-platform/eslint-config

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> packages/tooling/configs/eslint-config/docs/index.md: [packages/tooling/configs/eslint-config/docs/index.md](../../index.md)
> 语言: 简体中文 (zh)

Mission Platform 工作区的共享平面 ESLint 配置。

## 安装与使用

将包添加到工作区的开发依赖项并扩展平面
来自 `eslint.config.js` 的配置：

```bash
pnpm add --save-dev @mission-platform/eslint-config
```

```js
import baseConfig from '@mission-platform/eslint-config';

export default [...baseConfig];
```

该软件包包括 TypeScript、Vue 3、可访问性、导入、Turbo 和
格式化集成。仅针对以下行为添加特定于工作区的规则
无法共享。请参阅 [ESLint 参考](reference/eslint.md) 了解
包括插件和命令。

## 贡献

运行 `pnpm --filter @mission-platform/eslint-config lint` 并
更改规则后的 `pnpm --filter @mission-platform/eslint-config format`。
保持包框架感知但与工作空间无关；应用程序应该
不从另一个工作区导入规则。
