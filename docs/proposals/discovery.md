# DIST-004 — Discovery and Environment Instances

Status: Draft
Scope: discovery results and instance identity, not a mandatory registry
Coordinates: `discovery.distribution.dsh.dev/v1alpha1` + `EnvironmentDiscovery`

## 协议声明

Spec 是 `{ references: string[] }`，每个值为绝对 URI 形状的 Distribution Reference。该声明是发现提示，不是强制唯一入口。Core 描述符仍可经带外渠道提供；无须先读取本 spec 才能发现 descriptor，不形成引导循环。

**DISC-01**：Discovery Provider 接收一个 reference，返回 resolution 或 not-found。消费者选择 provider；本协议 MUST NOT 强制中央注册表、标准安装目录、环境变量或 HTTP 服务。不同 provider 可处理相同 URI 方案，优先级由实现选择。

## Instance record 与 resolution

EnvironmentInstance 的坐标是 `distribution.dsh.dev/v1alpha1 + EnvironmentInstance`，字段为 `instanceId`、`distribution`、`descriptorRef`、`revision`。这些是此发现协议的记录模型，不是额外 core declaration。

**DISC-02**：instanceId MUST 是 URI，并在管理域跨主机交换时保持唯一。clone/export/migrate 导入目标 MUST 获得新 instanceId；仅路径移动且仍是同一受管理实例的操作不在该 transfer profile 内。revision MUST 是非负安全整数；它是 Manager 的实例元数据乐观并发 token，不与 lifecycle observation revision 自动等同。

**DISC-03**：resolution 是 `{ reference, descriptor, instance? }`。返回 reference MUST 与请求精确一致；别名解析 MAY 在 provider 内完成，但返回请求使用的 reference。若携带 instance，distribution MUST 与 descriptor 相同且 descriptorRef MUST 等于 resolution.reference。两份安装相同发行物的实例不冲突；重复 instanceId 的持久注册 MUST 被 Manager 拒绝。

参考 `MemoryDiscoveryProvider` 按 reference 唯一建表；它不是全局实例注册表，也不能证明全局唯一性。

## 失败、超时与取消

**DISC-04**：客户端 MUST 能区分 `NOT_FOUND`、`INVALID_REFERENCE`、`REFERENCE_MISMATCH`、`IDENTITY_MISMATCH`、`PROVIDER_ERROR`、`TIMEOUT`、`ABORTED` 和无效返回文档。Provider 内部异常详情 SHOULD 被隐藏，以免泄露地址、令牌或私有路径。

**DISC-05**：参考客户端提供有界 timeout 和 AbortSignal。取消后 MUST 不接受迟到结果，MUST 清理客户端 timer/listener。Provider SHOULD 响应 signal 并释放自己持有的 IO；Promise timeout 不会强行终止忽略 signal 的工作，也不是隔离沙箱。

参考 SDK 默认 timeout=5000ms，可配置 1..2147483647；数值是 SDK 默认，不要求所有实现采用相同延时。解析结果以 detached JSON snapshot 返回，不允许 registry 被调用方修改。此协议不定义分页、订阅、网络重试、认证或缓存一致性；产品可以另加版本化 profile。

## 安全

**DISC-06**：Provider MUST 先执行 scheme/host/redirect/凭据 policy，再请求实际资源；不允许仅因收到 URI 就任意读取内网或本机文件。客户端 MUST 在解释 domain spec 前另行完成相应 definition 校验。Discovery 成功不意味着 descriptor 已完整 conformance，也不意味着来源可信。

## 证据与兼容

[Instance schema](../../packages/discovery/schema/instance.schema.json)、[Resolution schema](../../packages/discovery/schema/resolution.schema.json)、[实现](../../packages/discovery/src/index.ts)、[测试](../../tests/discovery.test.mjs)、[示例](../../examples/discover.mjs)。全局唯一性、认证与 SSRF 需要 provider/Manager 证据，不由 memory 示例证明。

Normative change: 初次定义实例/发现模型。Compatibility impact: 无 mandatory transport。Migration: 将概念 README 的 local UUID 移入 instanceId URI；导入既有安装时由 Manager 分配而非从发行物 ID 派生。Rollback: 撤回注册引用而不删除安装；原始描述符保持不变。
