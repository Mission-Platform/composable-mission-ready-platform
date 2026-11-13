# 迁移到默认安全的 FWS 管道

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> packages/flint/core/docs/guides/migration-v1.md: [packages/flint/core/docs/guides/migration-v1.md](../../../guides/migration-v1.md)
> 语言: 简体中文 (zh)

## 使突变变得明确

将 `mut` 添加到分配的局部变量和参数中。添加 `&` 以获得不可变的
借用和 `&mut` 用于可变借用；可变借用不能重叠。

```flint
fn increment(mut value: i32) -> i32 {
  value = value + 1;
  value
}

fn inspect(values: &Vector<i32>) -> i32 { values[0] }
fn update(values: &mut Vector<i32>) -> unit { values[0] = 1; }
```

不要依赖推断的所有权。 POD值默认按值传递；
非 POD 值使用不可变引用。保留 `owned`、`borrowed` 和 `shared`
在 ABI 边界上，其中特定的生命周期或发布责任是
需要。临时区域无法返回或存储在长期区域中
没有明确的所有权/晋升边界的价值。

## 选择和审核边界策略

运行时边界检查保持默认：

```bash
flint compile src/main.flint --bounds-checks runtime --format json
```

仅当分析证明来自集合长度的每次访问时才使用 `proven-safe`
和指数范围事实。 `excluded-by-profile` 是一个明确的、可审计的版本
选择，而不是未知索引的快捷方式：

```bash
flint check src/main.flint --bounds-checks proven-safe --optimizer-report
```

发货前查看分析结果和舱单政策。未知或
不受信任的索引应使用 `runtime`；严格分析拒绝不安全政策
请求。

## 检查生成的缓存元数据

编译器缓存可能包含 `<key>.sonir.json`，这是
优化的节点海图。在不运行访客代码的情况下检查它：

```bash
flint inspect-sonir .cache/main.sonir.json --format json
```

该工件记录模式和语言/ABI 版本、源和图哈希，
优化模式、边界策略、效果、所有权元数据、源跨度、
并下令通过报告。陈旧、格式错误、过大或策略不匹配
伪影将被忽略并可以安全地删除。

## 严格的静态类型和缺乏动态类型

Flint 是一种静态类型语言，具有确定性内存布局和零运行时反射开销。该语言不支持动态顶级类型，例如 `any` 或 `unknown`。

尝试使用 `any` 或 `unknown` 注释类型会产生编译时诊断 `FLINT-TYPE-020`。要从动态环境迁移代码：

- 用具体原语替换动态值（`i32`、`u32`、`f64`、`bool`、`string`、`bytes`）。
- 使用参数多态性/泛型（`Vector<T>`、`Option<T>`、`Result<T, E>`）来实现可重用容器算法。
- 使用标记代数数据类型 (`enum`) 进行多态域表示。
- 对于 C ABI 指针和不透明主机句柄，声明 `opaque foreign type Handle;` 而不是无类型指针。
- 在 Web IDL 桥接和绑定中，通过 `FlintBindingOptions.customTypeMappings` 提供显式类型映射。

## 内存和释放行为

范围值使用检查区域。比区域寿命更长的值使用显式
ARC/共享句柄；每个保留的句柄都有一个匹配的释放和循环
不被默示接受。原始 `fws_alloc`、`fws_realloc` 和 `fws_dealloc`
保留调用者拥有的已检查 ABI 边界。异步和迭代器暂停是
逃逸边界，因此必须显式保留挂起后使用的值。
