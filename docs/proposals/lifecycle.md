# DIST-005 — Environment Lifecycle Observation

Status: Draft
Scope: externally observable environment management state
Coordinates: `lifecycle.distribution.dsh.dev/v1alpha1` + `EnvironmentLifecycle`

## 声明与状态

**LIFE-01**：Spec 是 `{ states: [...] }`，MUST 是以下 vocabulary 的非空、不重复子集。实现 MAY 只暴露有意义的状态，不要求全部实现，更不要求提供 activate/deactivate 命令。

| 状态 | 外部可观察含义 |
| --- | --- |
| declared | 已知声明，尚未声称已安装 |
| installed | 实例被管理器记录为已物化，不承诺当前可用 |
| available | 管理器当前认为满足本实现的可用前提 |
| active | 正在被本实现使用，不限定进程或前台会话 |
| inactive | 已知实例当前未在使用 |
| broken | 管理器发现阻止正常使用的问题 |
| migrating | 管理器正执行迁移相关工作，不意味着 OS 隔离 |

## Observation record

坐标为 `lifecycle.distribution.dsh.dev/v1alpha1 + EnvironmentObservation`，字段为 `instanceId` URI、`revision` 非负安全整数、`state`。观察流由 Manager 建立，必要时绑定认证来源。

**LIFE-02**：同一观察流的 instanceId MUST 保持不变；新接受观察 revision MUST 严格递增。乐观更新的 expectedRevision MUST 等于现有记录，否则报 `REVISION_CONFLICT`。跨实例报 `IDENTITY_MISMATCH`。revision 耗尽时不能继续使用该观察流，需明确迁移记录策略，不得溢出。

**LIFE-03**：消费者 MAY 跳过未观察到的中间状态；MUST NOT 从两条观察推断某个固定命令序列已经执行。因此 declared -> active 或 broken -> available 的观察合法，本协议不规定普适的环境执行 FSM。具体运行时的可执行迁移由其 profile 决定。

**LIFE-04**：发布者 MUST 只发布自身声明可观察的状态，并把状态当作需要信任验证的观察而非授权。单条 `validateObservation` 仅校验记录；绑定某描述符的消费者还需检查 states 子集和来源。本 SDK 的 `advanceObservation` 不接受描述符，因而不声称完成该绑定。

## 边界与安全

Environment lifecycle 不等于 dsh-std component lifecycle。active 不证明健康，inactive 不证明没有后台进程，migrating 不证明迁移锁已建立，broken 不授权删除环境。操作方 MUST 独立验证锁、权限与实际进程状态，不基于单条自声明执行破坏性操作。

## 证据与兼容

[Observation schema](../../packages/lifecycle/schema/observation.schema.json)、[实现](../../packages/lifecycle/src/index.ts)、[测试](../../tests/domains.test.mjs)。状态真实性及 LIFE-04 的 descriptor 绑定属于 Manager 证据。

Normative change: 初次定义观察 vocabulary 和 revision。Compatibility impact: 不把 README 的状态列表转成强制命令或线性 FSM。Migration: 为既有管理器观察记录分配流内 revision；不得把历史快照随意当成最新。Rollback: 保留旧观察源或停止声明本协议，不改变实际运行状态。
