# 协议提案索引

所有提案状态为 **Draft**，规范词 MUST / MUST NOT / SHOULD / SHOULD NOT / MAY 采用 RFC 2119 / RFC 8174 含义。中文「必须/禁止/应/不应/可以」分别等价。它们是拟议公共契约，而非已被生态治理接纳的 Stable 规则。

| ID | 提案 | 包 | Schema |
| --- | --- | --- | --- |
| DIST-001 | [Core](core.md) | core | [descriptor](../../packages/core/schema/descriptor.schema.json) |
| DIST-002 | [Composition](composition.md) | composition | [composition](../../packages/composition/schema/composition.schema.json) |
| DIST-003 | [Managed Layout](layout.md) | layout | [layout](../../packages/layout/schema/layout.schema.json) |
| DIST-004 | [Discovery](discovery.md) | discovery | [resolution](../../packages/discovery/schema/resolution.schema.json) |
| DIST-005 | [Lifecycle Observation](lifecycle.md) | lifecycle | [observation](../../packages/lifecycle/schema/observation.schema.json) |
| DIST-006 | [Portability](portability.md) | portability | [plan](../../packages/portability/schema/plan.schema.json) |
| DIST-007 | [Enumerable Lodgement](lodgement.md) | discovery | lodgement / entry |

公共格式是有限、无环 JSON。每个 object 的字段默认封闭；新增私有语义通过 namespaced 协议声明，不通过任意顶层字段。JSON Schema 2020-12 只承担结构约束，提案和语义校验器共同定义完整 conformance。未知字段失败不等于拒绝未知协议：后者的 `spec` 是可保留的任意 JSON。

共同适用：调用方必须在执行 IO 前完成认证授权和输入大小限制；本仓库校验器不能证明实际行为。实现层证据见[一致性矩阵](../../conformance/README.md)，不得把未测试的运行时安全要求报告为已通过。
