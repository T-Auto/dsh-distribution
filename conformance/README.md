# Conformance and evidence

Status: Draft。一致性校验不等于安全认证、运行成功或市场准入。

## 分层结果

1. **Structure**：JSON Schema 2020-12 + typed structural validator，独立 Ajv 对照。
2. **Semantics**：跨字段、唯一性、DAG、绑定、revision、计划决策和 journal 状态边。
3. **Implementation evidence**：真实认证、发现、权限、路径解析、复制、完整性和 crash recovery。本仓库没有执行器，第三层未验证。

`checkDescriptor` 返回 valid / complete / issues / unchecked。未知协议保留为 unchecked，即使 required=false 也不能完整认证。`assessCompatibility` 另检查实际 consumer support；描述符完整校验与消费者兼容不是同一结论。

CLI：退出 0=完整通过，1=无效，2=输入错误，3=存在未知协议；stdout 是 JSON 报告（help 除外）。读取常规 UTF-8 文件，最多 1 MiB；库有 128 层 JSON 嵌套保护。业务实现仍需自己的大小/数量 policy。

## 两条分层纪律

**Schema 与语义校验器都必须能独立拒绝。** 生成 schema 由 typed schema DSL 产出（`pnpm schemas:write`，生成物不手改），独立 Ajv 对照测试要求两者对同一组样本给出相同结论。**有意的差异只有两类，必须落在矩阵里**：

- **schema 表达不了的补充词法规则**：如 Windows device name、尾点等平台别名（`UNSAFE_PATH`）。JSON Schema 无法表达"不区分大小写的保留名集合"，这类规则只能由语义校验器承担。
- **跨字段规则**：如 digest 的算法↔十六进制长度对应（`INVALID_DIGEST`）。JSON Schema 的 `pattern` 只能约束语法形状。

除这两类外，任何"schema 放行、校验器拒绝"或反过来的差异都是缺陷：只读 schema 的独立实现会与参考实现不一致。

**每条规范性条款必须有可指认的证据位置。** 提案正文给条款稳定 ID（`XXX-nn`），矩阵逐行指出它的 schema 来源、fixture 或自动化用例，以及**未覆盖的实现行为**。不能用"仓库测试全绿"代替运行时证据；需要执行器才能证明的条款一律标 not-tested（COEX-10 明确禁止这种推理）。

## Error code registry

错误码是稳定契约：实现与消费端 SHOULD 依赖 `code`，而非解析 `message`。下表是当前**全部**会被发出的错误码及其出处，避免出现"只活在代码里、未登记"的码。

| Code | 层 | 出处 | 含义 |
| --- | --- | --- | --- |
| `NOT_JSON` | 通用 | core `schema.ts` | 非有限、无环、深度 ≤128 的 JSON 数据 |
| `SCHEMA_INVALID` | 结构 | core `schema.ts` + 各包 | 字段缺失、类型错误、未知字段、语法不符 |
| `DUPLICATE` | 语义 | core `schema.ts` `unique()` | 同一标识在唯一性域内重复 |
| `INVALID_SUPPORT` | 语义 | core `index.ts` | 调用方声明的 support 坐标本身非法 |
| `DEFINITION_ERROR` | 语义 | core `index.ts` | definition 校验时抛出（fail closed，不泄漏内部异常） |
| `REQUIRED_PROTOCOL_UNAVAILABLE` | 语义 | core `index.ts` | required 协议为 unknown 或 unsupported |
| `INVALID_REFERENCE` | 语义 | composition / discovery | 引用形状非法、悬空或自依赖 |
| `COMPOSITION_CYCLE` | 语义 | composition | 组件依赖图成环 |
| `UNSAFE_PATH` | 语义 | layout | 通过语法但命中平台保留名或尾点 |
| `OWNERSHIP_CONFLICT` | 语义 | layout | external ownership 与 external portability 未同时出现 |
| `SENSITIVITY_CONFLICT` | 语义 | layout | secrets role 未标为 secret |
| `IDENTITY_MISMATCH` | 语义 | discovery / lifecycle | 携带的 identity 与 descriptor 或观察流不一致 |
| `REFERENCE_MISMATCH` | 语义 | discovery | resolution 返回的 reference 与请求不一致 |
| `INVALID_TIMEOUT` | 语义 | discovery | timeout 超出可配置范围 |
| `NOT_FOUND` | 运行反馈 | discovery | provider 未解析该 reference |
| `TIMEOUT` | 运行反馈 | discovery | 超过有界 timeout |
| `ABORTED` | 运行反馈 | discovery | 收到 abort 后终止 |
| `PROVIDER_ERROR` | 运行反馈 | discovery | provider 内部错误（详情应隐藏） |
| `INVALID_STATES` | 语义 | lifecycle | states 为空、重复或含词表外取值 |
| `REVISION_CONFLICT` | 语义 | lifecycle / portability | expectedRevision 不等于现值，或安全整数耗尽 |
| `INVALID_MODES` | 语义 | portability | modes 为空、重复或含词表外取值 |
| `IDENTITY_CONFLICT` | 语义 | portability | source/target 实例相同 |
| `INVALID_APPROVAL` | 语义 | portability | approvedConditionalResources 含非 conditional 资源 |
| `PLAN_INCONSISTENT` | 语义 | portability | ready / action / reason / request 之间不自洽 |
| `OVERLAPPING_LOCATION` | 语义 | portability | 拟 copy 路径与其它声明资源重叠 |
| `INVALID_TRANSITION` | 语义 | portability | journal 状态迁移不在显式边上 |
| `NOT_OWNED` | 计划 reason | portability | ownership=shared/external，只能 reference |
| `SECRET_EXCLUDED` | 计划 reason | portability | sensitivity=secret，无开关可携带 |
| `NONPORTABLE` | 计划 reason | portability | portability=nonportable |
| `CONDITION_REQUIRED` | 计划 reason | portability | exclusive+conditional 未获批准 |
| `CONDITION_APPROVED` | 计划 reason | portability | exclusive+conditional 已获批准 |
| `PORTABLE` | 计划 reason | portability | exclusive+portable |
| `DUPLICATE_INSTANCE_ID` | 语义 | lodgement | 同一 instanceId 在 lodgement 或 staged 中重复 |
| `INVALID_DIGEST` | 语义 | lodgement | digest 非 `<algorithm>:<lowercase hex>`，或算法与十六进制长度不匹配 |
| `INVALID_STATUS_TRANSITION` | 语义 | lodgement | 只允许 published → removed |
| `FORBIDDEN_REMOVAL` | 语义 | lodgement | 非发布者且未获授权者尝试移除条目 |
| `NOT_STAGED` | 语义 | lodgement | commit 的 instanceId 没有 staged 记录 |
| `INPUT_ERROR` | CLI | conformance `cli.ts` | 输入文件不可读、过大或非 UTF-8 常规文件 |

`action` / `reason` / 状态词表取值（如 `copy`、`skip`、`blocked`、`planned`）不是错误码；它们出现在 `MigrationPlan.entries` 与 `MigrationJournal.state`，由 schema enum 约束。

## Requirement matrix

| Requirement | Schema / source | Fixture / automated evidence | 未覆盖的实现行为 |
| --- | --- | --- | --- |
| CORE-01..04 | core/descriptor | [JSON fixtures](fixtures/descriptors.json)、[core tests](../tests/core.test.mjs) | 发布者 ID 所有权、release immutability |
| CORE-05 | descriptor + discovery | 最小 descriptor、memory discovery 示例 | 部署可发现性，not-tested |
| CORE-06..09 | core catalog/assessment | 私有坐标、required、optional、重复、抛错、support 测试（含 `INVALID_SUPPORT`） | 可信插件加载 policy，not-tested |
| COMP-01..03 | composition | [domain tests](../tests/domains.test.mjs)：DAG、重复、悬空、自环、环 | 来源 URI 的内容真实性 |
| COMP-04 | 无 IO validator | component ref 校验不解析代码 | 下载授权/完整性，not-tested |
| LAYOUT-01..04 | layout | [domain tests](../tests/domains.test.mjs)：16 条路径攻击（含 `../escape`、`./a//b`、`./CON`、`./a.`、NUL/换行）、归属、敏感性、唯一性 | 物理资源归属 |
| LAYOUT-02（schema 侧） | layout（`location` 判别联合） | [schema tests](../tests/schema-cli.test.mjs) 的 Ajv 对照 + `oneOf` 结构 | — |
| LAYOUT-02（语义侧） | layout validator | `UNSAFE_PATH`：平台保留名与尾点，**schema 表达不了**（已声明差异） | 平台别名语义的真实文件系统行为，not-tested |
| LAYOUT-05..06 | layout + portability | 不复制非独占；conditional 默认阻断 | realpath/ACL/alias/审批真实性，not-tested |
| DISC-01..03 | discovery/instance/resolution | [discovery tests](../tests/discovery.test.mjs)：多实例、绑定、不同 ref、detached snapshot | 持久全局唯一 registry，not-tested |
| DISC-04 | discovery wrapper | not-found/error/invalid/`INVALID_TIMEOUT`/abort/迟到结果 | 非协作 provider 的 IO 终止 |
| DISC-05 | discovery client | 有界 timeout、AbortSignal、迟到结果丢弃、timer/listener 清理 | 忽略 signal 的工作无法被强制终止，not-tested |
| DISC-06 | 无自动 resolver | memory provider 示例 | SSRF/认证/redirect policy，not-tested |
| LIFE-01..03 | lifecycle | `INVALID_STATES`、revision、跨实例 `IDENTITY_MISMATCH`、跳跃观察 | 真实进程状态 |
| LIFE-04 | observation model | 单条记录验证 | descriptor 状态子集绑定与来源认证，not-tested |
| PORT-01..02 | portability/request | `INVALID_MODES`、身份 `IDENTITY_CONFLICT`、`INVALID_APPROVAL`、plan tests | descriptor 模式绑定、源 revision 真实性，not-tested |
| PORT-03..05 | portability/plan | 默认动作、secret、conditional、重叠（含大小写折叠）、伪造 readiness/reason | 真实路径 alias、外来计划与实际 layout 绑定 |
| PORT-06..07 | portability/journal | 全状态对矩阵、失败回滚/重试、`REVISION_CONFLICT`/溢出、`INVALID_TRANSITION` | 持久原子 CAS，not-tested |
| PORT-08..10 | 执行器 obligation | 无执行器；明确 not-tested | 全部实际迁移/校验/崩溃恢复/源退役 |
| LOD-01..02 | lodgement + entry（JSON Schema 2020-12） | [lodgement fixtures](fixtures/lodgement.json)：published / removed | 真实载体位置，not-tested |
| LOD-03 | lodgement（proposal）+ `digestSchema`/`digestIssue` | [lodgement fixtures](fixtures/lodgement.json)：`digest-wrong-length`（`INVALID_DIGEST`）+ 长度/算法用例；语法由 schema，算法↔长度由语义（已声明差异） | 摘要是否真的对内容可复现（需要真实字节），not-tested |
| LOD-04 | lodgement（proposal） | 纯函数不持有 IO/timer（[lodgement tests](../tests/lodgement.test.mjs)） | 消费端发现时机/轮询/推送/性能，not-tested |
| LOD-05..07 | lodgement + discovery | [lodgement fixtures](fixtures/lodgement.json) + semantic tests | 多来源选择、来源认证、Lodgement 仅作候选全集的真实运行时证据，not-tested |
| LOD-08..09 | lodgement（proposal） | staged half-write 不可见、`FORBIDDEN_REMOVAL`、`NOT_STAGED`、共享载体不可删 | 真实软删除事务、崩溃恢复/清理重试、跨进程权限，not-tested |
| COEX-01..03 | [coexistence](../docs/proposals/coexistence.zh.md)（proposal，无 schema） | 无可离线判定结构：单例区分粒度与重复启动收敛属运行时行为 | 两个不同实例同时运行互不干扰、同实例重复启动收敛、不夺焦另一实例：not-tested |
| COEX-04..05 | coexistence（proposal，无 schema） | 无 fixtures：子进程生命周期绑定与归属判定属运行时行为 | owner 强制终止后子进程与独占句柄释放、按共享 OS 属性批量终止的防护：not-tested |
| COEX-06..09 | coexistence（proposal，无 schema） | 无 fixtures：主机状态位置与自恢复属运行时行为 | 主机共享位置不承载实例状态、共享位置仅删自有条目、陈旧锁自恢复、共享命名空间冲突处理：not-tested |
| COEX-10 | coexistence（proposal，无 schema） | 无 fixtures：证据诚实性由评审与实现自证 | 实测证据（OS/revision/命令/退出码/未覆盖项）是否齐备：not-tested |
| 跨语言 schema | 全部 14 份 schema | [Ajv/CLI tests](../tests/schema-cli.test.mjs) | 非 JS 独立实现尚无证据 |

### 范例实现的覆盖（informative）

外部范例实现可以给某些坐标提供**实现证据**。这类证据不在本仓库、不由本仓库测试产生，只作为"协议可被真实产品采用"的旁证；本仓库不认证它，也不把它当作 Candidate/Stable 晋级依据。

| 坐标 | 已知范例实现所声明的面 | 本仓库侧的处理 |
| --- | --- | --- |
| 身份与声明（`DistributionDescriptor`） | 有：描述符本体被生成并落盘 | 结构由本仓库 schema 校验；发布者所有权与不可变性仍 not-tested |
| 受管存储归属（`ManagedLayout`） | 有：两个独占资源声明（`exclusive` + `conditional`） | LAYOUT-02 的正则由 schema 与语义校验器共同保证；真实路径 containment 仍 not-tested |
| 发现与环境实例（`EnvironmentDiscovery` + `EnvironmentInstance`） | 有：描述符声明 `references`，运行期写入实例记录并校验 instanceId 唯一 | DISC-03 的"持久登记拒绝重复"在范例内成立，但不是全局唯一 registry 的证据 |
| 环境组成声明（`EnvironmentComposition`） | **无** | COMP-01..04 的实现行为无法评估 |
| 环境生命周期观察（`EnvironmentLifecycle`） | **无** | LIFE-01..04 的实现行为无法评估 |
| 可迁移性计划与恢复日志（`EnvironmentPortability`） | **无** | PORT-01..10 的实现行为无法评估 |
| 可枚举共识入口（`Lodgement`） | **无** | LOD-01..09 的实现行为无法评估 |

结论：本协议目前有**三面**存在实现证据，**四面**只有静态 conformance。任何"协议已完整实现"的说法都超出证据范围。

## 运行与提交证据

```sh
pnpm install --frozen-lockfile
pnpm check            # test + schemas:check（漂移门禁）+ check:docs + examples
pnpm check:pack       # 8 个 tarball 离线安装、exports/类型/schema/CLI 产物
node --test --experimental-test-coverage tests/*.test.mjs
git diff --check
```

静态 JSON fixtures 可由其他语言加载；更多 domain cases 位于命名的测试用例，测试运行结果由 Node test runner 生成，不在仓库放伪造的永久「全绿」证书。

交付证据至少记录：被测 revision（dirty 时注明）、OS/Node/pnpm、命令和退出码、协议坐标、测试范围、未知协议、not-tested 列表。包 tarball 的本地消费验证与运行时互操作验证是两件事。任何执行器宣称符合 PORT-08..10 时必须增加独立测试，不沿用此静态 suite 的结论。

> **本仓库验证前必须先清构建产物。** `lib/` 是不入库的 tsc 产物，`tsc -b` 依据 `*.tsbuildinfo` 的时间戳判断是否需要重建。在 fresh clone 里 `src` 与 `lib` 的 mtime 相同，改了源码后直接跑 `pnpm build` 可能被判定为"无需重建"，于是 `pnpm check` 全绿而 schema 从**旧** `lib` 生成——门禁会骗人。确认方法：比对 `src` 与 `lib` 的关键符号，或在验证前 `rm -rf packages/*/lib packages/*/tsconfig.tsbuildinfo` 再 `pnpm build && pnpm schemas:write && pnpm check`。
