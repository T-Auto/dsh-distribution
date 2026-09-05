# Conformance and evidence

Status: Draft。一致性校验不等于安全认证、运行成功或市场准入。

## 分层结果

1. **Structure**：JSON Schema 2020-12 + typed structural validator，独立 Ajv 对照。
2. **Semantics**：跨字段、唯一性、DAG、绑定、revision、计划决策和 journal 状态边。
3. **Implementation evidence**：真实认证、发现、权限、路径解析、复制、完整性和 crash recovery。本仓库没有执行器，第三层未验证。

`checkDescriptor` 返回 valid / complete / issues / unchecked。未知协议保留为 unchecked，即使 required=false 也不能完整认证。`assessCompatibility` 另检查实际 consumer support；描述符完整校验与消费者兼容不是同一结论。

CLI：退出 0=完整通过，1=无效，2=输入错误，3=存在未知协议；stdout 是 JSON 报告（help 除外）。读取常规 UTF-8 文件，最多 1 MiB；库有 128 层 JSON 嵌套保护。业务实现仍需自己的大小/数量 policy。

## Requirement matrix

| Requirement | Schema / source | Fixture / automated evidence | 未覆盖的实现行为 |
| --- | --- | --- | --- |
| CORE-01..04 | core/descriptor | [JSON fixtures](fixtures/descriptors.json)、[core tests](../tests/core.test.mjs) | 发布者 ID 所有权、release immutability |
| CORE-05 | descriptor + discovery | 最小 descriptor、memory discovery 示例 | 部署可发现性，not-tested |
| CORE-06..09 | core catalog/assessment | 私有坐标、required、optional、重复、抛错、support 测试 | 可信插件加载 policy，not-tested |
| COMP-01..03 | composition | [domain tests](../tests/domains.test.mjs)：DAG、重复、悬空、自环、环 | 来源 URI 的内容真实性 |
| COMP-04 | 无 IO validator | component ref 校验不解析代码 | 下载授权/完整性，not-tested |
| LAYOUT-01..04 | layout | 路径攻击、归属、敏感性、唯一性 tests | 物理资源归属 |
| LAYOUT-05..06 | layout + portability | 不复制非独占；conditional 默认阻断 | realpath/ACL/alias/审批真实性，not-tested |
| DISC-01..03 | discovery/instance/resolution | [discovery tests](../tests/discovery.test.mjs)：多实例、绑定、不同 ref、detached snapshot | 持久全局唯一 registry，not-tested |
| DISC-04..05 | discovery wrapper | not-found/error/invalid/timeout/abort/迟到结果 | 非协作 provider 的 IO 终止 |
| DISC-06 | 无自动 resolver | memory provider 示例 | SSRF/认证/redirect policy，not-tested |
| LIFE-01..03 | lifecycle | 状态集合、revision、跨实例、跳跃观察 | 真实进程状态 |
| LIFE-04 | observation model | 单条记录验证 | descriptor 状态子集绑定与来源认证，not-tested |
| PORT-01..02 | portability/request | modes、身份、审批、plan tests | descriptor 模式绑定、源 revision 真实性，not-tested |
| PORT-03..05 | portability/plan | 默认动作、secret、conditional、重叠、伪造 readiness/reason tests | 真实路径 alias、外来计划与实际 layout 绑定 |
| PORT-06..07 | portability/journal | 全状态对矩阵、失败回滚/重试、stale/overflow | 持久原子 CAS，not-tested |
| PORT-08..10 | 执行器 obligation | 无执行器；明确 not-tested | 全部实际迁移/校验/崩溃恢复/源退役 |
| 跨语言 schema | 全部 12 份 schema | [Ajv/CLI tests](../tests/schema-cli.test.mjs) | 非 JS 独立实现尚无证据 |

## 运行与提交证据

```sh
pnpm install --frozen-lockfile
pnpm check
node --test --experimental-test-coverage tests/*.test.mjs
git diff --check
```

静态 JSON fixtures 可由其他语言加载；更多 domain cases 位于命名的测试用例，测试运行结果由 Node test runner 生成，不在仓库放伪造的永久「全绿」证书。

交付证据至少记录：被测 revision（dirty 时注明）、OS/Node/pnpm、命令和退出码、协议坐标、测试范围、未知协议、not-tested 列表。包 tarball 的本地消费验证与运行时互操作验证是两件事。任何执行器宣称符合 PORT-08..10 时必须增加独立测试，不沿用此静态 suite 的结论。
