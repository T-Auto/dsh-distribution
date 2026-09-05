# Contributing

本仓库维护公共环境元协议，不承载 TUI 市场政策或运行时实现。请先读 [AGENTS.md](AGENTS.md)、[架构](docs/architecture.md) 与[提案索引](docs/proposals/README.md)。

## 变更归属

- 通用环境语义：`docs/proposals/` + 对应 `packages/`。
- 组件 API/manifest/协商：dsh-std，不在此复制。
- 生态治理、入门入口、产品准入：dsh-ecosystem-spec；TUI 专有要求标 TUI-*。
- 单产品绑定细节：`adapters/` informative note，不提升为公共约束。
- 协议索引：`registry/`，不夹带推荐列表或可执行安装来源。

## 规范性变更说明

```text
Status:
Scope:
Normative change:
Compatibility impact:
Evidence:
Fixtures:
Conformance impact:
Migration:
Rollback:
```

每份实质协议变更同时更新 proposal、类型声明、schema、语义 validator、正反例、tests、包 CHANGELOG、changeset。不能用实现便利、某产品限制或仓库布局规定所有发行物。公共 MUST/MUST NOT 必须在 conformance matrix 指出证据位置；需要执行器才能证明的条目标为 not-tested，不伪装静态测试已覆盖。

## 本地门禁

```sh
pnpm install --frozen-lockfile
pnpm check
git diff --check
```

JSON Schema 从 typed schema 生成：`pnpm schemas:write`。不要手改 lockfile、workspace 依赖版本或生成 schema。新增依赖使用包管理器并检查 supply-chain；默认不增加第三方 runtime dependency。

## 治理与授权

所有契约当前 Draft。任何人可以提出规范修改，不能凭本仓库名称宣称官方授权或安全认证。Candidate/Stable 晋级需要独立实现证据和明确审查决策。代码、协议和治理评审是不同判断，不自动联动。

在当前受管工作区内，未经风雪明确同意不 commit、不 push、不发表评论、不发布包、不改变远端设置。此规定不阻止本地读写、构建、测试和差异分析。
