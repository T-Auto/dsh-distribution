# Adapter note — dsh-std integration

Status: Draft。**Informative only**。本 note 不修改任一公共协议，不指定参考产品，不建立运行时包依赖。

读取基线和准确坐标见[架构](../docs/architecture.md)。环境组合中的组件 ref 交给组件来源 resolver；resolver 得到 manifest 后，由原组件协议 validator 检查。dsh-std 的 Component -> Facet -> Activation instance -> Participant 层次保持不变。

Manager 可以通过 adapter 把若干安装单元归入一个 EnvironmentInstance，并将配置/状态/缓存映射为 ManagedLayout resources。此映射不自动赋予 Manager plugin lifecycle、connection 或 permission 能力。

建议流程：

1. 离线验证 distribution descriptor 和已知 domain specs。
2. 认证实例来源和管理 root，建立单独 instanceId。
3. 按源协议读取组件元数据，不执行其代码来获得基本身份。
4. 由实际运行时提交 dsh-std participant declaration 并执行其协商。
5. 把运行时事实映射为环境 observation；不把静态 contracts 当作 support。
6. 迁移时使用应用提供的一致性 export/checkpoint 能力，不直接复制正在写入的 session 数据库。

本次没有实现 dsh 上游私有 API 绑定：其版本和运行形态由产品 adapter 选择，不能在通用协议包 import 某产品运行时。生态准入/市场展示在 dsh-ecosystem-spec 中决定，不能因 adapter 示例存在就认为已接入。
