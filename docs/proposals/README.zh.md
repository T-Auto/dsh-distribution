# 协议提案索引

本目录收录 dsh-distribution 的规范性提案。提案**没有编号**；**提案状态**与日期记录在各文件开头，规范条款在正文内使用稳定 ID（`CORE-01`、`LAYOUT-02`、`LOD-03`……），矩阵与实现按 ID 引用。

## 提案状态

- **方向已确认，接口/格式草案**：职责边界已经确认，具体对象、字段或行为仍可修改；
- **草案**：正在设计，尚未接受为稳定方向；
- **探索性草案**：先记录问题和候选边界，不表示将创建同名协议坐标。

当前全部提案状态为**草案**。

> 提案状态与协议的**发布状态**（Draft / Experimental / Candidate / Stable / Deprecated）是两件不同的事实：前者说"这份设计文档有多确定"，后者说"这份协议在生态里的采纳程度"。发布状态、晋级条件与三套版本身份（wire 坐标 / npm 包 / distribution release）见[版本与兼容性](../compatibility.md)；本仓库当前不宣称任何坐标为 Stable。

规范词 MUST / MUST NOT / SHOULD / SHOULD NOT / MAY 采用 RFC 2119 / RFC 8174 含义；中文「必须/禁止/应/不应/可以」分别等价。

## 元协议

| 协议坐标 | 提案 | 条款 | 包 | Schema |
| --- | --- | --- | --- | --- |
| `distribution.dsh.dev/v1alpha1` + `DistributionDescriptor` | [DSH 环境身份与声明](core.zh.md) | CORE-01..09 | `@dsh-distribution/core` | [descriptor](../../packages/core/schema/descriptor.schema.json) |

Core 只负责身份、声明、catalog 派发与兼容报告。领域语义属于各自独立版本化的包，不因为多个包使用 core 就并入 core。

## 领域协议

| 协议坐标 | 提案 | 条款 | 包 | Schema |
| --- | --- | --- | --- | --- |
| `composition.distribution.dsh.dev/v1alpha1` + `EnvironmentComposition` | [环境组成声明](composition.zh.md) | COMP-01..04 | `@dsh-distribution/composition` | [composition](../../packages/composition/schema/composition.schema.json) |
| `layout.distribution.dsh.dev/v1alpha1` + `ManagedLayout` | [受管存储归属](layout.zh.md) | LAYOUT-01..06 | `@dsh-distribution/layout` | [layout](../../packages/layout/schema/layout.schema.json) |
| `discovery.distribution.dsh.dev/v1alpha1` + `EnvironmentDiscovery` | [发现与环境实例](discovery.zh.md) | DISC-01..06 | `@dsh-distribution/discovery` | [discovery](../../packages/discovery/schema/discovery.schema.json) / [instance](../../packages/discovery/schema/instance.schema.json) / [resolution](../../packages/discovery/schema/resolution.schema.json) |
| `lifecycle.distribution.dsh.dev/v1alpha1` + `EnvironmentLifecycle` | [环境生命周期观察](lifecycle.zh.md) | LIFE-01..04 | `@dsh-distribution/lifecycle` | [lifecycle](../../packages/lifecycle/schema/lifecycle.schema.json) / [observation](../../packages/lifecycle/schema/observation.schema.json) |
| `portability.distribution.dsh.dev/v1alpha1` + `EnvironmentPortability` | [可迁移性计划与恢复日志](portability.zh.md) | PORT-01..10 | `@dsh-distribution/portability` | [portability](../../packages/portability/schema/portability.schema.json) / [request](../../packages/portability/schema/request.schema.json) / [plan](../../packages/portability/schema/plan.schema.json) / [journal](../../packages/portability/schema/journal.schema.json) |
| `discovery.distribution.dsh.dev/v1alpha1` + `Lodgement` / `DiscoverableEntry` | [可枚举共识入口](lodgement.zh.md) | LOD-01..09 | `@dsh-distribution/lodgement` | [lodgement](../../packages/lodgement/schema/lodgement.schema.json) / [entry](../../packages/lodgement/schema/entry.schema.json) |

各领域协议独立版本化：实现其中一项不表示实现其他项，也不表示实现 core 的全部条款。

## 运行时义务（无坐标）

| 提案 | 条款 | 坐标与 schema |
| --- | --- | --- |
| [同主机多环境并存](coexistence.zh.md) | COEX-01..10 | 无 |

COEX 只包含运行时行为义务，**有意不新增协议坐标与文档 kind**：把"运行时隔离"做成一种可声明的文档，会诱导实现用"文件里写了归属"冒充"边界真的成立"。它因此落在一致性分层的第三层（implementation evidence），证据要求见[一致性矩阵](../../conformance/README.md)。

## 共同适用

公共格式是有限、无环 JSON。每个 object 的字段默认封闭；新增私有语义通过 namespaced 协议声明，不通过任意顶层字段。JSON Schema 2020-12 只承担结构约束，提案与语义校验器共同定义完整 conformance。未知字段失败不等于拒绝未知协议：后者的 `spec` 是可保留的任意 JSON。

调用方必须在执行 IO 前完成认证授权与输入大小限制；本仓库校验器不能证明实际行为。实现层证据见[一致性矩阵](../../conformance/README.md)，不得把未测试的运行时安全要求报告为已通过。
