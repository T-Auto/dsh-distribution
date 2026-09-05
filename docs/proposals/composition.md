# DIST-002 — Environment Composition

Status: Draft
Scope: logical component references, not component manifests
Coordinates: `composition.distribution.dsh.dev/v1alpha1` + `EnvironmentComposition`

## 数据模型

Spec 是 `{ components: [...] }`。每个 component 有 `id`、`ref`，可选 `contracts` 和 `dependsOn`。空组合合法，不要求环境由 dsh 插件组成。

**COMP-01**：`id` MUST 在该组合内唯一，采用 schema 的非空 ASCII identifier 语法；它不是安装实例 ID。`ref` MUST 是绝对 URI 形状的 opaque 引用，可使用 registry、pkg、OCI、HTTP 或自有方案；解析权属于对应 provider。相同 ref MAY 被不同逻辑组件引用。

**COMP-02**：`contracts` MAY 引用其他协议的 `apiVersion + kind`，坐标 MUST 遵守 DIST-001 的语法且不重复。引用 MUST NOT 被解释成 live participant support、activation、binding 或 agreement。

**COMP-03**：`dependsOn` 表示逻辑组成依赖，不是启动顺序。每条依赖 MUST 指向同一组合内的另一组件，不得重复、自依赖或成环。该图 MUST 是 DAG。是否安装、何时激活、如何解析版本交给组件协议或 Manager。

## 行为与边界

**COMP-04**：消费端 MUST NOT 为校验组合图而加载组件代码。包 URL 不等于可信来源或摘要；执行方在获取内容之前 MUST 实施授权、来源校验和网络 policy。

Component 的 facets、plugin API、permission、entrypoint、生命周期及能力协商 MUST NOT 在此处重新定义；它们属于 dsh-std 或其他被引用的协议。`contracts` 没有 spec 和 required，不表达环境级要求；需要环境要求时使用 core.protocols 中独立协议声明。

## 错误与安全

无效字段/URI/坐标：`SCHEMA_INVALID`；重复：`DUPLICATE`；悬空/自依赖：`INVALID_REFERENCE`；环：`COMPOSITION_CYCLE`。验证不进行网络请求，不解析包版本。大型组合图执行方 SHOULD 设置资源上限；原型使用迭代 DAG 检查，不使用递归遍历图。

## 兼容与证据

[Schema](../../packages/composition/schema/composition.schema.json)、[实现](../../packages/composition/src/index.ts)、[测试](../../tests/domains.test.mjs)。COMP-04 的实际下载授权需要 provider/Manager 证据。

Normative change: 初次定义组合引用协议。Compatibility impact: 无既有发布依赖；只有声明此坐标的环境受约束。Migration: 旧 README 的无 id 引用片段需增加稳定逻辑 id，不改组件 manifest。Rollback: 可移除 optional 声明并保留组件本身；不得将协议移除解释成卸载组件。
