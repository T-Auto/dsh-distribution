# DIST-006 — Portability Plans and Recovery Journal

Status: Draft
Scope: transfer metadata and recovery bookkeeping; no transfer executor
Coordinates: `portability.distribution.dsh.dev/v1alpha1` + `EnvironmentPortability`

## 1. 采用与模式

**PORT-01**：Spec 是 `{ modes: [...] }`，MUST 是 `clone/export/migrate` 的非空、不重复子集。实现只声明实际提供的模式；声明不能推导授权。操作绑定具体 descriptor 时，Manager MUST 校验模式在该声明内。

- clone：产生新的环境实例；源实例保留。
- export：产生可供导入的逻辑目标内容；格式由实现决定。本 profile 同样为目标分配新实例 ID，重复导入需新计划/新目标 ID，避免克隆身份。
- migrate：把工作环境转移到新实例；只有验证目标可用且授权明确后，执行器才可单独安排源退役。此协议不自动删除源。

Portability 的声明本身不要求 layout；本仓库的 managed-resource transfer profile（`createMigrationPlan`）依赖 DIST-003。采用其他资源模型的实现可定义独立版本化计划协议，不需要修改 core。

## 2. MigrationRequest

**PORT-02**：Request MUST 有 planId URI、mode、sourceInstanceId、targetInstanceId、sourceRevision、approvedConditionalResources、rollback。source/target MUST 不同；sourceRevision MUST 是非负安全整数；approvedConditionalResources MUST 不重复。计划生成器接受显式 layout snapshot；执行器 MUST 将它与实际 source revision、descriptor 和受支持 mode 绑定，不能把调用方提供的裸数据当作真实性证据。

rollback 为 `{ strategy: restore-checkpoint | discard-new-target, reference: URI }`。前者指可恢复 checkpoint，后者指新目标 staging 的清理记录；二者都不是 shell 命令或默认目录。恢复材料是否存在和可用必须由执行器验证。

## 3. 保守资源计划

输出坐标为 `portability.distribution.dsh.dev/v1alpha1 + MigrationPlan`。字段：request、ready、entries。每个 entry 为 resourceId、action、reason。

**PORT-03**：计划器 MUST 按以下优先级决策，每个 layout resource 恰有一项，保持输入顺序：

| 条件 | action | reason |
| --- | --- | --- |
| sensitivity=secret | skip | SECRET_EXCLUDED |
| portability=nonportable | skip | NONPORTABLE |
| ownership=shared/external | reference | NOT_OWNED |
| exclusive + conditional，未批准 | blocked | CONDITION_REQUIRED |
| exclusive + conditional，已批准 | copy | CONDITION_APPROVED |
| exclusive + portable | copy | PORTABLE |

审批列表 MUST 仅包含源 layout 中 conditional 资源；它表示调用方已完成额外条件审查，不是策略语言、签名或授权 token。Secret 在此 profile 无开关可自动携带，凭据迁移需要单独安全通道和契约。

**PORT-04**：如果拟 copy 的相对路径与任何其他声明资源相同、祖先或后代（按 ASCII 不区分大小写保守比较），计划器 MUST 将该 copy 标记 blocked / OVERLAPPING_LOCATION；相同 URI 同理。即使被重叠的资源会 skip，也不能通过父目录复制泄露它。

不同 URI 的 alias、URI prefix、不同 location.type 的真实映射、符号链接及未声明的 secret 内容不由静态匹配证明。执行器 MUST 重新解析真实边界，不能把未检出 overlap 当作安全证明。

**PORT-05**：ready MUST 等于没有 blocked 条目。它只表示元数据 dry-run 可进入下一步审查，MUST NOT 表示已执行、已授权或满足全部前提。Plan validator MUST 检查唯一 resourceId、request、action/reason、ready 和 conditional approval 一致性。验证外来 plan 与实际 layout 的一一对应及标签决策时，执行器 MUST 重新生成并比较计划；`validatePlan` 不接受 layout，不能承担此证明。

## 4. Journal 状态机

记录坐标为 `portability.distribution.dsh.dev/v1alpha1 + MigrationJournal`；字段：planId、revision、state。新 journal SHOULD 从 planned/revision=0 开始；现有持久快照可以从任意合法状态恢复，单条 schema 无法证明完整历史。

**PORT-06**：状态迁移 MUST 只采用以下边：

```text
planned -> prepared -> copying -> verifying -> committed
   \          \           \           \
    +----------+-----------+-----------> failed
failed -> rolling-back -> rolled-back
                   \-> rollback-failed -> rolling-back
```

committed 和 rolled-back 为终态。committed 后的有意撤销是新补偿计划，不重写已提交 journal。rollback-failed 必须保持可见，不伪装为已恢复。

**PORT-07**：更新必须绑定同一 journal/plan；expectedRevision MUST 等于现值，更新后 revision 恰好加一。安全整数耗尽时报 `REVISION_CONFLICT`；非法边报 `INVALID_TRANSITION`。函数只验证一个本地快照，持久存储 MUST 以原子 CAS/事务实现真实并发控制；两个调用者在相同快照上均得到新值不意味着两次写入都可以提交。

## 5. 执行器义务（不由此 SDK 实现）

**PORT-08**：prepared 之前，执行器 MUST 认证 source/target，锁定或验证 sourceRevision，确认 target 为该计划独占的新 staging，验证真实资源边界、空间、凭据策略、应用兼容条件和可用 rollback 证据。copying 前 MUST 建立 crash-recoverable 持久 journal；重试必须按 planId/resourceId 幂等，不能覆盖无关目标数据。

**PORT-09**：verifying MUST 验证复制内容完整性和所需应用级兼容性；只有验证通过且 journal 已持久化，才能把目标暴露为 committed。运行状态 quiescence/快照一致性由源应用协议提供，不由 portable 字段保证。

**PORT-10**：failed 后 rollback MUST 只作用于该计划拥有的 staging/checkpoint，不删除 shared/external、源实例或未知目录。回滚失败需持久化 rollback-failed 并人工/受控重试。Manager MUST NOT 因为 `advanceMigration` 返回 ok 就声称文件已复制或回滚成功。

安全执行需要额外 profile 定义 transport、认证、完整性、恢复日志存储和应用验证。本首版明确不提供执行器，用户必须将这些运行时要求标记 not-tested，而不是拿纯函数测试冒充完成。

## 6. 错误、证据与兼容

其他错误：`SCHEMA_INVALID`、`DUPLICATE`、`IDENTITY_CONFLICT`、`INVALID_APPROVAL`、`PLAN_INCONSISTENT`。schema 结构错误和 planner 的 blocked 条目是不同层次；blocked 计划仍然可以是有效文档。

[Plan schema](../../packages/portability/schema/plan.schema.json)、[Journal schema](../../packages/portability/schema/journal.schema.json)、[实现](../../packages/portability/src/index.ts)、[测试](../../tests/domains.test.mjs)、[示例](../../examples/migrate.mjs)。PORT-08..10 和持久 CAS 属执行器证据，不在原型测试内。

Normative change: 初次定义迁移计划及回滚最小模型。Compatibility impact: 不指定档案格式、Manager 命令或安装根。Migration: 由原始角色 map 补充明确归属/敏感性后再规划；没有证据的 conditional 不自动批准。Rollback: 协议采用失败时恢复旧 descriptor，不运行计划；实际迁移失败按上述 journal 恢复。
