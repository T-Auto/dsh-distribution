# dsh-distribution

> **DSH Environment Distribution Meta-Protocol**
> 用于声明、发现和管理可运行 DSH 环境的最小元协议。

---

## 这是什么？

`dsh-distribution` 是 dsh 生态中与 `dsh-std` 正交的一层**环境元协议**。

```text
dsh-std
    "How components interoperate."
    运行中的组件如何互相理解。

dsh-distribution
    "How environments are identified and managed."
    一个运行环境如何被外部世界理解。

Implementations
    "How environments actually run."
    环境具体如何运行，交给实现。
```

更凝练地说：

> **dsh-std standardizes interaction.**
> **dsh-distribution standardizes environment identity and portability.**

中文定位：

> **它规范运行环境如何被描述，而不规范运行环境如何被实现。**

---

## 核心承诺

`dsh-distribution` 不对整合包/发行物作者的功能性做任何约束。你的发行物可以是：

- 一个目录
- 一个压缩包
- 一个 Docker/OCI artifact
- 一个远程安装源
- 多个路径组成的逻辑环境
- 一个 Manager 创建的虚拟环境
- TUI / GUI / CLI / AGI / Server / Cloud / 无界面运行时……

协议不关心你做成什么，只关心：

> 这个环境是什么、属于哪个发行物、当前版本是什么、
> 它由什么逻辑组件构成、它的可管理边界在哪里、
> 配置/状态在哪里、如何被管理器发现、如何安全复制/导出/迁移。

---

## 关键概念

### Distribution 是逻辑环境，不必然是物理包

```text
Distribution is a logical environment, not necessarily a directory,
archive, container, or installer.
```

协议描述的是 **logical distribution boundary**，而不是：

- zip 文件格式
- 固定目录结构
- 安装器格式
- 某个 Manager 的私有存储布局

因此它不会被“整合包格式”锁死。

### Identity：发行物身份 ≠ 环境实例身份

必须区分两个身份：

```text
Distribution identity
    my-agi-dist@1.4.0

Environment instance
    local-uuid-xxxxx
```

同一个发行物可以同时安装多份：

```text
~/env/a
~/env/b
```

它们是两个不同的环境实例。未来做 snapshot、clone、migration 时，身份语义才不会混乱。

### Composition：只引用组件契约，不重新定义

`dsh-distribution` **不重新定义组件协议**。它只描述 composition graph，组件如何运行、插件 API、生命周期、能力协商等全部交给 `dsh-std` 或其他协议。

```json
{
  "components": [
    {
      "ref": "registry:xxx/plugin@1.0.0"
    }
  ]
}
```

原则：

> dsh-distribution MAY reference component contracts defined by other protocols, including dsh-std.

避免出现 `dsh-std manifest` + `distribution manifest` + `distribution plugin manifest` 三套 manifest 逐渐重叠的灾难。

### Layout：Managed Storage Roles

Layout 不是规定“目录必须叫什么”，而是声明**路径承担什么角色**：

```json
{
  "layout": {
    "roles": {
      "config": "./config",
      "extensions": "./vendor/extensions",
      "state": "./state",
      "data": "./data"
    }
  }
}
```

核心是：

> 这个位置承担 config role / extensions role / state role / data role。

因此 Manager 不需要知道发行物内部实现，也能安全地：

- 增删可安装组件；
- 迁移配置；
- 判断哪些状态可以复制、哪些不可迁移。

术语建议使用 `extensions` 而不是 `plugins`，因为未来可安装组件不一定是 dsh plugin，还可能是：

```text
skills
models
agents
assets
workflows
adapters
tools
```

### Registration / Discovery：只规定可发现，不规定唯一机制

Core 只规定：

> A Distribution MUST have a discoverable descriptor.

Discovery mechanism 完全开放，可以由不同 Manager/平台实现：

```text
filesystem discovery
manager registry
environment variable
URI
registry service
container metadata
```

统一抽象为：

```text
Discovery Provider
    │
    └── resolves Distribution Reference
            │
            └── Distribution Descriptor
```

协议不把 `~/.dsh/distributions/` 之类的位置规定为唯一或推荐中心，避免 Linux / Windows / Container / Remote / Cloud 很快出现争论。

### Isolation & Migration：隔离语义，而不是隔离实现

只定义环境的管理边界和可迁移性：

```text
这个环境的管理边界是什么？
哪些资源属于它？
哪些资源允许迁移？
哪些资源不可迁移？
```

例如：

```json
{
  "portability": {
    "config": "portable",
    "state": "conditional",
    "data": "external"
  }
}
```

Manager MAY expose `create` / `activate` / `deactivate` 或等价操作。协议不规定这些命令必须存在，因为 venv、container、remote runtime、embedded runtime、system service 的 activate 语义并不相同。

协议层只需要定义最小的环境生命周期状态，例如：

```text
declared
installed
available
active
inactive
broken
migrating
```

---

## 分层边界

```text
┌─────────────────────────────────────────┐
│            Implementations              │
│                                         │
│  TUI / GUI / CLI / AGI / Server / Cloud │
├─────────────────────────────────────────┤
│            dsh-distribution             │
│                                         │
│ identity · composition · discovery      │
│ layout roles · portability              │
├─────────────────────────────────────────┤
│                dsh-std                  │
│                                         │
│ contracts · capabilities · lifecycle    │
│ negotiation · adapters                  │
└─────────────────────────────────────────┘
```

严格守住的边界：

- 不定义运行方式；
- 不定义包格式；
- 不定义目录结构；
- 不重新定义插件 API；
- 不规定官方 Manager。

---

## 状态

- 当前为 **Draft / 概念初稿**。
- 后续需要补充：
  - `Distribution Descriptor` 的 JSON Schema；
  - 最小 conformance fixtures；
  - Discovery Provider 示例；
  - 与 `dsh-std` 的引用映射；
  - 迁移与回滚的最小数据模型。
