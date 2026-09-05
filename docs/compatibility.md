# 兼容性、迁移与发布

Status: Draft。没有已发布 npm 包或已晋级 Stable 的 wire contract。

## 三个独立版本

- npm 包：初始 `0.1.0-alpha.1`，由各包 CHANGELOG + changesets 维护。
- 公共 wire：各 namespaced `v1alpha1` 坐标，独立演进；npm patch 不自动创造 wire compatibility。
- distribution.version：发行物作者定义的非空无空白 release token，不要求 SemVer，不参与协议匹配。

破坏性 wire 变化使用新的坐标；不允许只提升 npm 版本而悄悄改变同一 wire 坐标语义。不同协议不必同步升级。消费端只做精确匹配，双版本支持通过明确注册两个 definition 实现，不推测兼容。

## 从概念 README 迁移

初始 README 只有说明性 JSON 片段，不是完整格式，不能直接作为 v1alpha1 输入。

| 概念片段 | 新格式 | 风险处理 |
| --- | --- | --- |
| my-dist@version | distribution.id URI + version | 不从字符串随意猜出发行者命名空间 |
| local-uuid | EnvironmentInstance.instanceId URI | 为每次安装分配唯一身份，不使用发行物身份替代 |
| components: [{ ref }] | composition 协议 spec + 逻辑 id | 不复制插件 manifest |
| layout.roles.config = ./config | layout.resources[] | 补充 id、role、location、ownership、portability、sensitivity |
| portability.config = portable | 每个 resource 的 portability | 不自动把路径认定为独占或非敏感 |
| 生命周期状态清单 | lifecycle.states + 单独 observation | 不生成虚假的进程状态或 revision 历史 |

没有安全的无交互自动转换器：原示意缺少归属和敏感性，猜测会导致误复制或凭据泄露。转换由作者确认，原始描述符备份保留，校验失败时不修改实际环境。

## 晋级和发布

遵循[贡献规则](../CONTRIBUTING.md)。状态词为 Draft / Experimental / Candidate / Stable / Deprecated；当前只使用 Draft。晋级需要协议审阅、独立实现证据、迁移/回滚方案和生态采用方确认，不因仓库自测通过自动晋级。

可本地执行 `pnpm changeset` 创建包级变更记录，`pnpm version-packages` 在经批准的发布分支应用版本。发布前检查 package tarball 的 exports、schema、LICENSE、CHANGELOG，并跑 frozen install + check。发布 npm、修改远端 CI、commit/push 均需另行明确授权；仓库没有自动 publish 脚本。

首次包 CHANGELOG 已记录初始版本，不叠加一个会提前再次 bump 的虚假 changeset。后续每项公共 contract 变更增加 changeset 并同步 proposal/schema/tests/CHANGELOG。
