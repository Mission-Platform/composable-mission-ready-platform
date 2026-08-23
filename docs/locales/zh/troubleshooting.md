# 故障排除指南

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> docs/troubleshooting.md: [docs/troubleshooting.md](../../troubleshooting.md)
> 语言: 简体中文 (zh)

本指南提供了任务内开发、构建和部署过程中遇到的常见问题的解决方案
平台单一仓库。它的结构是诊断和解决技术问题的**操作指南**。

## 性能问题

### 慢速 LCP（最大内容油漆）

**问题**：LCP 高于“良好”评级的 2.5 秒阈值。

**诊断**：

1. 在 Chrome DevTools 中运行 Lighthouse 审核。
2. 在“性能”面板中识别 LCP 元件。
3. 检查“网络”选项卡的资源加载延迟。

**解决方案**：

- **内联关键 CSS**：确保首屏内容所需的样式是内联的。
- **图像优化**：使用 WebP/AVIF 格式并为响应式图像提供 `srcset`。
- **资源预加载**：对 LCP 图像或关键字体使用 `<link rel="preload">`。
- **最小化主线程工作**：使用 `async` 或 `defer` 推迟非必要的 JavaScript。

### 内存泄漏

**问题**：随着时间的推移，应用程序消耗的内存量不断增加，最终导致崩溃。

**诊断**：

1. 在 Chrome DevTools Memory 选项卡中拍摄多个“堆快照”。
2. 比较快照以识别数量或大小不断增长的对象。
3. 查找“分离的 DOM 元素”。

**解决方案**：

- **可组合项中的清理**：始终清除计时器并删除 `onUnmounted` 中的事件侦听器。
- **商店管理**：确保在不再需要时清除 Pinia 或其他商店中的反应状态。
- **处置 Observables**：如果使用 RxJS，请确保取消订阅所有订阅。

## 构建和工作空间问题

### Turborepo 缓存错误

**问题**：更改未反映在构建中，或者构建因过时的工件而失败。

**解决方案**：通过绕过缓存或手动清除缓存来强制进行全新构建。

```bash
# Force a build without cache
pnpm build:force

# Manually clear the turbo cache
rm -rf .turbo
```

### 找不到模块/工作区解析

**问题**：TypeScript 或 Vite 找不到工作区中定义的包。

**解决方案**：

1. 验证该包是否列在使用工作区的 `package.json` 中。
2. 确保版本匹配（建议使用`workspace:*`）。
3. 运行 `pnpm install` 以刷新符号链接。
4. 如果问题仍然存在，请尝试深度清洁：
```bash
   pnpm -r exec rm -rf node_modules
   pnpm install
   ```

### CI 中存在类型错误，但本地不存在类型错误

**问题**：CI 中的构建失败，并出现 TypeScript 错误，但这些错误不会出现在 IDE 中。

**解决方案**：在整个工作区本地运行类型检查器。

```bash
pnpm exec turbo run build:check
```

这确保了所有包边界都得到正确尊重，并且类型可以干净地验证。

## MCP 服务器故障排除

### 连接失败

**问题**：您的 AI 客户端或 IDE 无法连接到 Mission Platform MCP 服务器。

**诊断**：

1. 验证 MCP 服务器是否已构建：`pnpm exec turbo run build --filter @mission-platform/mcp-*`。
2. 检查服务器是否手动启动：`node mcp/developer/dist/index.js`。

**解决方案**：

- 确保您在客户端配置中使用 node 二进制文件和脚本的绝对路径。
- 检查 MCP 服务器日志中的特定错误消息（例如，缺少环境变量）。

## 常见错误模式

### “无法读取未定义的属性”

**原因**：通常在数据加载完成之前访问 null 或未定义对象的属性。 **修复**：使用
可选链接 (`?.`) 或提供默认值。

```typescript
// Instead of:
const name = user.profile.name;

// Use:
const name = user?.profile?.name ?? 'Guest';
```

### “未处理的承诺拒绝”

**原因**：异步函数引发了未捕获的错误。 **修复**：始终将异步调用包装在 `try/catch` 块中。

```typescript
try {
  await fetchData();
} catch (error) {
  handleError(error);
}
```

## 相关资源

- [最佳实践](best-practices.md)
- [开发设置](development-setup.md)
- [测试指南](testing.md)
