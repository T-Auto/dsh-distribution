# DIST-003 — Managed Storage Roles

Status: Draft
Scope: logical storage ownership and portability labels
Coordinates: `layout.distribution.dsh.dev/v1alpha1` + `ManagedLayout`

## 数据模型

Spec 是 `{ resources: [...] }`。每个资源声明：`id`、`role`、`location: { type, value }`、`ownership`、`portability`、`sensitivity`。数组可以为空。一个 role MAY 有多个资源；同一资源 id MUST 唯一。目录名称不具有隐式角色。

**LAYOUT-01**：role 为 `config/extensions/state/data/cache/logs/secrets`，或 namespaced `example.org:models` 形式。`extensions` 泛指可安装扩展内容，不限定插件，也不授权 Manager 增删该目录。

**LAYOUT-02**：location.type 为 `relative-path` 或 `uri`。relative-path 是可移植词法子集：以 `./` 开头；每段以 ASCII 字母数字、下划线或连字符开头，后续可含点；不允许空段、反斜杠、percent 编码、点段、尾点、Windows device name。其精确正则及补充校验以 schema 和本条共同规定。非 ASCII、平台专属路径、对象存储或多个 root MAY 使用 URI profile；这不限制发行物实际目录布局。

relative-path 相对于 **Manager 绑定的实例管理 root**，不是进程 cwd 或远程 descriptor URI。未绑定 root 的消费者 MUST NOT 执行文件操作。URI 只检查方案形状，不在本协议中解引用。

**LAYOUT-03**：ownership 为 `exclusive/shared/external`；portability 为 `portable/conditional/nonportable/external`。external ownership 与 external portability MUST 同时出现。exclusive 仅是管理归属声明，不是文件系统隔离证明；shared 不授予删除或改写权。

**LAYOUT-04**：sensitivity 为 `public/private/secret`。secrets role MUST 标为 secret；任何其他 role 也 MAY 是 secret。未知敏感级别 MUST 校验失败，不默认当作 public。

## 管理与安全语义

**LAYOUT-05**：实现 MUST NOT 从 role 或 exclusive 标签推导写权限、删除权限或隔离能力。任何 IO 前 MUST 独立验证真实 root、目标 containment、ACL、符号链接/junction、挂载点、大小写/平台别名和 URI resolver policy。描述符位置不可信；词法检查不能阻止所有越界。

资源位置 MAY 重叠，声明这些重叠是合法的描述行为；复制规划时需要处理它们，而不是在 layout 阶段假装所有逻辑视图都互不相交。不同 URI 或路径仍可能 alias 同一物理存储，静态 validator 无法完全判断。

**LAYOUT-06**：portability=portable 表示作者声明可复制，不表示获准复制。conditional 的实际条件由版本化资源/应用协议或操作审查解释；没有审批时默认不复制。external 是外部管理引用，不在环境的可迁移字节所有权中。

## 错误、兼容与证据

`SCHEMA_INVALID` 表示格式错误；`UNSAFE_PATH` 表示补充平台词法规则失败；`DUPLICATE`、`OWNERSHIP_CONFLICT`、`SENSITIVITY_CONFLICT` 分别报告关系错误。路径错误按资源下的 JSON Pointer 定位。

[Schema](../../packages/layout/schema/layout.schema.json)、[实现](../../packages/layout/src/index.ts)、[测试](../../tests/domains.test.mjs)。LAYOUT-05 需要执行器测试，不在静态 conformance 覆盖内。

Normative change: 初次定义资源角色与归属。Compatibility impact: 不再把 README 概念示意的 role->path map 当作 wire 格式。Migration: 按资源显式补充 id/location/ownership/portability/sensitivity；未知归属先由作者确认，不猜测。Rollback: 恢复原 descriptor；不移动或删除数据。
