# dsh-distribution

**DSH Environment Distribution Meta-Protocol · Draft / v1alpha1**

> **dsh-std standardizes interaction.**
>
> **dsh-distribution standardizes environment identity and portability.**

它规范运行环境如何被描述，而不规范运行环境如何被实现。Distribution 是逻辑环境边界，不必然是目录、压缩包、容器或安装器。CLI、TUI、GUI、Server、云端、多路径环境均可采用，不要求使用某个 Manager 或 TypeScript SDK。

本仓库是可验证的社区草案，不是官方标准、产品运行时或安全认证。现有概念 README 的目标已落实为规范、类型、schema、纯函数校验、发现示例与迁移计划原型；没有实现安装、进程管理、实际复制、凭据传输或市场服务。

## 三项目分工

| 项目 | 权威范围 | 不在此处定义 |
| --- | --- | --- |
| [dsh-std](https://github.com/Yan-Zero/dsh-std) | 组件交互；协议声明/协商；manifest、facet、connection 等独立协议 | 发行物的环境实例管理 |
| **dsh-distribution** | 发行物身份、实例身份、环境协议声明、组合引用、存储角色、发现、可迁移性 | 插件 API、组件运行方式、安装包格式、固定目录 |
| [dsh-ecosystem-spec](https://github.com/T-Auto/dsh-ecosystem-spec) | 生态入口、采用指南、治理及产品准入 profile | 不在 profile 中重新定义公共协议；TUI 要求不倒灌公共契约 |

它与 `dsh-std` 正交，不是必须采用的上下级框架。组件协议引用使用原协议的 `apiVersion + kind`；静态引用不等于实际支持，也不等于形成协商 agreement。详见[架构与上游映射](docs/architecture.md)。

## 最小描述符

```json
{
  "apiVersion": "distribution.dsh.dev/v1alpha1",
  "kind": "DistributionDescriptor",
  "distribution": {
    "id": "urn:example:distribution:headless",
    "version": "2026.09"
  },
  "protocols": []
}
```

- `distribution.id + version` 标识发行物；版本是 opaque release token，不强制 SemVer。
- 每次安装的 `instanceId` 放在独立 `EnvironmentInstance` 记录，不写回公共发行物描述符。
- `protocols` 是可插拔协议声明；只有 core 必选，其余按需采用。
- `required: true` 表示消费者接受该描述符时必须理解并支持该协议；不是授权，更不要求所有产品采用它。
- 自有协议可直接用命名空间坐标注册 `ProtocolCatalog`，无需修改 core。
- 描述符必须可被消费者发现，但不规定文件名、全局注册表或中心目录。

## 目录与包

```text
docs/
  architecture.md          分层、依赖、dsh-std 映射
  getting-started.md       作者与 Manager 接入指南
  proposals/               六份规范性协议提案
packages/
  core/                    最小描述符、身份、catalog、兼容报告
  composition/             组件引用与逻辑依赖图
  layout/                  managed storage roles 和管理边界
  discovery/               实例记录、发现结果、provider 示例
  lifecycle/               环境状态观察，不规定激活命令
  portability/             clone/export/migrate 计划、回滚 journal
  conformance/             组合校验入口与只读 CLI
conformance/               fixtures、requirement matrix、证据规则
registry/                  本仓库协议坐标索引，不是安装源
adapters/                  非规范性集成 note
examples/                  JSON 描述符、无网络发现与 dry-run
scripts/                   schema 生成与文档/边界门禁
.changeset/                包级版本变更记录
```

[包索引](packages/README.md) · [提案索引](docs/proposals/README.md) · [安全边界](SECURITY.md) · [贡献规则](CONTRIBUTING.md)

## 本地开发和验证

需要 Node.js `^22.19.0 || >=24.0.0`、pnpm `11.21.0`。运行库无第三方运行时依赖；workspace 包仅依赖必要的其他协议包。TypeScript、Ajv 和 changesets 是开发依赖。

```sh
pnpm install --frozen-lockfile
pnpm check
node packages/conformance/lib/cli.js examples/managed.json
```

`pnpm check` 包含构建、测试、独立 Ajv schema 对照、CLI 测试、schema 漂移检查、文档链接/包边界检查和两个可运行示例。`pnpm check:pack` 另在临时目录打包七个包并离线安装，检查脱离 workspace 的 ESM、类型、schema 和 CLI 产物。`pnpm schemas:write` 重新生成 JSON Schema；不要手改生成产物。

CLI 退出码：`0` 完整检查通过；`1` 已知 contract 无效；`2` 输入/用法错误；`3` 存在未检查的协议。`valid: true, complete: false` 不能宣称完整 conformance。第三方可使用自己实现的校验器，不要求安装本仓库包。

## SDK 示例

以下 workspace 包尚未发布；先在本仓库构建，或经审查后打包接入，不要假定 npm 已存在这些版本。

```ts
import { assessCompatibility } from '@dsh-distribution/core';
import { checkDescriptor, createPublicCatalog } from '@dsh-distribution/conformance';
import { coordinate as layout } from '@dsh-distribution/layout';

const checked = checkDescriptor(descriptor); // JSON contract 是否有效/完整检查
const report = assessCompatibility(descriptor, createPublicCatalog(), [layout]);
// [layout] 是调用方实际支持的协议，不是从 catalog 自动推断出来的能力。
// report.compatible 不是身份认证、授权、隔离证明或迁移许可。
```

## 迁移安全默认值

`createMigrationPlan` 是无 IO 的保守 dry-run：secret 永远跳过；nonportable 跳过；shared/external 只引用；conditional 需要明确资源审批；可疑路径与已知重叠必须处理后才能继续。`ready` 仅表示**元数据层没有 blocked 条目**，不表示已取得文件权限或可直接运行。

执行方仍需真实路径 containment、符号链接/挂载点/URI alias 检查、SSRF 防护、来源认证、内容完整性校验、源 revision 锁定、目标 staging 与回滚证据。回滚不等于简单删除目录；源环境不会被本库退役或删除。详见[portability 提案](docs/proposals/portability.md)。

## 状态与兼容性

全部协议是 **Draft**，坐标是拟议名称，不代表域名控制权、官方注册或发布承诺。npm 初始版本为 `0.1.0-alpha.1`；wire 版本为 `v1alpha1`；发行物自己的版本是第三个独立维度。破坏性 wire 变更使用新坐标，不进行隐式版本降级。README 初稿的 `layout.roles` / `portability.config` 只是示意片段，迁移说明见[兼容性](docs/compatibility.md)。

本次建设不修改上游仓库、不升级 submodule、不自动配置 Actions、不发布 npm 包、不提交或推送 Git。可执行验证只证明本地草案实现，不构成跨实现互操作认证。

## License

[MIT](LICENSE)
