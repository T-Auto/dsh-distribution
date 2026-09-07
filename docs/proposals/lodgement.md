# DIST-007 — Enumerable Lodgement（共享共识入口）

Status: Draft
Scope: 可枚举的共享共识入口与条目模型；不定义轮询、推送、性能保障或市场准入
Coordinates: `discovery.distribution.dsh.dev/v1alpha1` + `Lodgement`（集合）与 `DiscoverableEntry`（条目）

## 为什么需要

DIST-004 的 Discovery 只回答"给定一个已知 URI reference，解析出 resolution 或 not-found"。它**不提供"生态里存在哪些可发现对象"的可枚举视图**，因此第三方整合包管理器只能按已知引用逐项解析，无法主动盘点或秒级感知新对象。

本提案新增一个**可选的、可枚举的共享共识入口（Lodgement）**：把"按引用解析"（DIST-004）之外，补上一个"可枚举来源"，让任意消费者能列出"当前有哪些对象、各自的引用与完整性"。

它是**可选的来源**，不是唯一事实源，也不是强制中央注册表。

## 协议声明

**LOD-01**：Lodgement 是一个**已知、可枚举的共享位置**，承载一组 `DiscoverableEntry`。它的物理载体（本地目录、注册表键、URL、对象存储或其他）由实现 profile 决定；**本协议 MUST NOT 规定特定 OS 位置或唯一事实源**。协议定义的是实现无关的"可枚举 + 条目格式 + 原子 + 可校验"契约。

**LOD-02**：`DiscoverableEntry` 字段封闭，为：

```jsonc
{
  "apiVersion": "discovery.distribution.dsh.dev/v1alpha1",
  "kind": "DiscoverableEntry",
  "instanceId": "<uri — 环境/实例唯一身份>",
  "distribution": "<distribution identity>",
  "descriptorRef": "<绝对 URI 形状的 descriptor 引用>",
  "revision": 0,                 // 非负安全整数，乐观并发 token
  "displayName": "<可选 >",
  "contentDigest": "<必填 — 对 descriptor 或条目内容的完整性摘要>",
  "publisher": "<可选 — 明确声明的发布者，不隐含认证>"
}
```

未知字段 MUST 被拒绝（沿用封闭对象约定）。`instanceId` MUST 为 URI，跨主机交换保持唯一；克隆/迁移导入目标 MUST 获得新 `instanceId`（沿 DIST-002 语义）。

**LOD-03**：写入者 MUST 采用原子发布（临时条目 + 唯一 commit 标记或目录 rename），确保任何消费者在任何时刻都只读到完整条目，**MUST NOT 读到半写状态**；写入者 MUST 在 `contentDigest` 中给出可复现的完整性摘要。重复 `instanceId` 的持久登记 MUST 由消费端拒绝（沿 DISC-02 的"重复持久注册必须被拒绝"）。

**LOD-04（消费端自理发现与性能）**：本协议 **MUST NOT** 规定消费者的发现时机、轮询 cadence、事件/推送、订阅、缓存一致性或性能保障。每个消费端自行决定"何时、以何种频率、以何种方式"盘点一个或多个 Lodgement，并**自行承担**相应的时间、IO、CPU 与安全成本。协议提供的是"可枚举内容"，不是"发现行为或吞吐承诺"。

**LOD-05**：不强制唯一中央网关。MUST NOT 要求"所有对象都来自同一个 Lodgement"；MUST NOT 把 Lodgement 当作唯一权威。不同 Lodgement 可并存，消费者自行选择一个或多个来源，优先级由实现决定（沿 DISC-01 的 provider 优先模型）。

**LOD-06**：安全基线。消费者 MUST 在执行任何 IO（读取/解析/下载 descriptor）前完成来源校验、授权与输入大小限制；`contentDigest` 只用于**完整性**，MUST NOT 视为来源认证；全局唯一性、生态级准入、签名颁发与来源可信度需由各实现/生态 profile 提供证据（沿 DISC-06，本协议不宣称）。

**LOD-07（与 DIST-004 的关系）**：Lodgement 是 Discovery Provider 的**可枚举输入/候选全集**，不是 resolution 的替代。消费者一般流程为：从一个或多个 Lodgement 列出候选 `descriptorRef` → 按 DIST-004 对每个 reference 做 resolution 校验。Lodgement 列出的条目 MUST NOT 被当作已验证的 descriptor 或已认证的来源。

**LOD-08（生命周期与软删除）**：`DiscoverableEntry` MUST 携带 `status`，取值至少 `published` 与 `removed`。
- 移除 MUST 先**原子**地把条目 `status` 置为 `removed`（条目保留但不可发现），与发布共用同一原子机制（临时条目 + 唯一 commit 标记/rename）。
- 消费端 MUST 忽略 `status == "removed"` 的条目，以及 `contentDigest` 不匹配的条目；**MUST NOT** 在发现到这类条目时视为可用，更不得据此启动或读取过期 descriptor/内容。
- 物理清理（真正删除条目记录或内容）MUST 晚于置为 `removed`，并 MUST 幂等、可随卸载重试；消费端与清理程序都不得把 `removed` 当作仍可用的已安装对象。

**LOD-09（归属、删除权与共享位置不可删）**：
- 条目的**删除权**仅属于其写入者或明确授权者；其他消费者 MUST NOT 删除非自身登记的条目（避免卸载 A 破坏 B 仍在用的条目）。
- Lodgement 载体（共享目录/注册表键/其它共享位置）是**跨产品共享前提**，MUST NOT 由任何单个产品在卸载/清理时删除或清空；产品仅可将其**自有**条目的 `status` 置为 `removed`。
- 同一实例被多个消费者引用时，删除权与所有权 MUST 以 `instanceId` + 发布者归属判定，MUST NOT 按显示名、猜测路径或别名删除。
- 崩溃恢复：卸载可重入；若中途崩溃，兼容状态为“条目 `removed` 但内容/记录仍存在”，由消费端忽略并允许清理程序幂等重试，MUST NOT 让消费端看到“能发现但打不开”的对象。

## Status, Scope and boundaries

- Status: Draft；拟议公共契约，未被生态治理接纳为 Stable。
- Scope：只定义可枚举共识入口契约、条目模型、原子与完整性要求、以及与 DIST-004 的使用关系。
- 明确不在范围：轮询/推送/订阅/缓存一致/性能（见 LOD-04）、市场或准入策略、签名基础设施、来源认证、全局唯一 registry 的实现证据。

## Normative change

新增协议坐标与 kind（`Lodgement` / `DiscoverableEntry`）+ 封闭 schema + 语义校验器。不修改 DIST-001..006 的现有语义或坐标。

## Compatibility impact

新增可选协议，向后兼容：现有消费者按 DIST-004 解析不受影响；未使用 Lodgement 的实现无需改动。不发生 breaking wire 语义（若未来需要，按仓库规定另起坐标）。

## Evidence / Fixtures

- 结构性：新增 JSON Schema 2020-12（`lodgement` / `entry`），由 `pnpm schemas:write` 生成，不手改生成物。
- 语义：跨字段（instanceId URI、revision 非负、contentDigest 必填、封闭字段）校验器与 fixtures。
- 单元：原子发布（半写不可见）、重复 instanceId 拒绝、descriptorRef 形状、detached snapshot、removed 忽略、删除权与共享载体保护、LOD-04 不引入轮询/推送（校验器不持有 IO/timer）。
- 实现层证据（沿用 conformance 分层第三层）：持久全局唯一 registry、来源认证、签名、真实发现/性能语义均标记 **not-tested**，不在此仓库由纯函数测试冒充通过。

## Conformance impact

在 [conformance requirement matrix](../../conformance/README.md) 增加 LOD-01..09 行；结构与纯语义行为由 fixtures 和 automated tests 固化；第三层（真实事务、来源认证、全局唯一 registry、崩溃恢复）列为 not-tested。`checkDescriptor` 对未知 Lodgement 协议保持 unchecked。

## Migration

无既有迁移：采纳后新增包/坐标。既有安装与 Lodgement 无数据迁移关系；消费者实现可增量发现。

## Rollback

撤回条目（删除或标记移除）而保留 descriptor 与安装；不强制删除对象或安装。拒绝不完整的半写条目，不触发消费端动作。
