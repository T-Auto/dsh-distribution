# Package index

本文面向需要导入代码库的工具开发者。整合包作者通过[环境接入指南](../docs/getting-started.md)采用统一的 dsh-distribution 协议，由工具映射项目的真实信息，不必逐个选择、安装或学习这些包。七个包是内部代码分工，不是面向作者的七项产品选项；`conformance` 是聚合校验工具。

全部包为 ESM、Draft、初始版本 `0.1.0-alpha.1`，尚未发布。实现可只采用规范，不依赖 TypeScript 包。

| Package | 职责 | Runtime dependencies |
| --- | --- | --- |
| [core](core/README.md) | 身份、声明、catalog、兼容报告、typed schema 工具 | 无 |
| [composition](composition/README.md) | 外部组件引用/DAG | core |
| [layout](layout/README.md) | 存储角色/归属/可迁移性标签 | core |
| [discovery](discovery/README.md) | 实例记录/provider 边界 | core |
| [lifecycle](lifecycle/README.md) | 状态观察/revision | core |
| [portability](portability/README.md) | 纯计划与 recovery journal | core、layout |
| [conformance](conformance/README.md) | 聚合校验和只读 CLI | 上述六包 |

包出口：主入口 `@dsh-distribution/<name>`，schema 文件 `@dsh-distribution/<name>/schema/<name>.schema.json`（具体文件见各包 schema 目录；conformance 无新 wire schema）。所有包独立 CHANGELOG、LICENSE、类型声明与 exports。根 tsconfig 使用 project references 按依赖构建，不导入相邻仓库源码。
