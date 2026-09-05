# 工具开发与仓库开发指南

本文面向环境管理器、校验工具、协议扩展和仓库贡献者。**只想给整合包加说明文件，请看[作者接入指南](getting-started.md)**，不需要执行下面整套开发流程。

## 1. 本地构建和验证

需要 Node.js `^22.19.0 || >=24.0.0`、pnpm `11.21.0`。以下命令在本仓库根目录执行。

```sh
pnpm install --frozen-lockfile
pnpm check
node packages/conformance/lib/cli.js examples/managed.json
```

`pnpm check` 包含构建、测试、独立 Ajv schema 对照、CLI 测试、schema 漂移检查、文档链接/包边界检查和两个可运行示例。`pnpm check:pack` 在临时目录打包七个包并离线安装，检查脱离 workspace 的 ESM、类型、schema 和 CLI 产物。`pnpm schemas:write` 重新生成 JSON Schema，不要手改生成产物。

CLI 退出码：`0` 完整检查通过；`1` 已知 contract 无效；`2` 输入/用法错误；`3` 存在未检查的协议。`valid: true, complete: false` 不能宣称完整 conformance。检查结果不等于环境健康、来源可信或有权执行管理操作。

运行库无第三方运行时依赖；workspace 包只依赖必要的其他协议包。TypeScript、Ajv、changesets 是开发依赖。包尚未发布，不要假定 npm 上已有这些版本；先在本仓库构建，或按项目需要打包接入。

## 2. 仓库结构

| 路径 | 内容 |
| --- | --- |
| `packages/core` | 最小描述符、身份、catalog 和静态兼容报告 |
| `packages/composition` | 组件来源引用与逻辑依赖图 |
| `packages/layout` | 存储角色、归属与可迁移性标签 |
| `packages/discovery` | 安装实例记录、发现接口和示例 |
| `packages/lifecycle` | 环境状态观察，不规定通用激活命令 |
| `packages/portability` | 迁移计划和回滚日志，不执行真实迁移 |
| `packages/conformance` | 聚合校验和只读 CLI；不是第七份领域协议 |
| `docs/proposals` | 六份规范提案 |
| `conformance` | fixtures、要求矩阵和证据边界 |
| `registry` | 离线协议坐标索引，不是安装源 |
| `adapters` | 非规范性的产品集成说明 |
| `examples` | 环境说明示例、结构边界样例和可运行示例 |

**对作者呈现一个完整的环境协议，对实现保留清晰的模块边界。** 包和独立坐标是工具内部的组织方式，不应转成面向作者的“基础＋扩展”采用菜单。接入工具应调查整套环境，把适用的真实信息映射到同一套描述与管理模型；不同形态的环境不必伪装成拥有相同功能。

技术上，只有 core 身份字段的描述符仍合法，`examples/minimal.json` 保留为结构边界样例。但校验这种文档通过，不证明项目的组成、数据和管理信息已被完整调查或接入；不应以它代替面向作者的整体接入流程。

## 3. 管理器接入顺序

1. 从受信任/受限制的渠道取得说明，对输入大小、URI、来源和凭据实施策略。
2. 用 `checkDescriptor` 检查数据，再以实际支持的坐标调用 `assessCompatibility`。
3. 单独维护 `EnvironmentInstance`；同一发行物的两次安装具有不同实例 ID。
4. 只绑定当前确实实现的能力，不从静态声明推导运行时支持或授权。

```ts
import { assessCompatibility } from '@dsh-distribution/core';
import { checkDescriptor, createPublicCatalog } from '@dsh-distribution/conformance';
import { coordinate as layout } from '@dsh-distribution/layout';

const checked = checkDescriptor(descriptor);
const report = assessCompatibility(descriptor, createPublicCatalog(), [layout]);
// [layout] 必须来自该管理器实际实现的支持列表，不能从 catalog 自动推断。
// checked 检查说明，report 检查静态兼容；两者都不授予文件操作权限。
```

Core 的 `required: true` 表示消费者接受描述符时必须理解并支持该协议，不表示所有发行物都必须采用它。required 值依据实际消费约定决定，不因统一的对外介绍而全部设为 true，也不为了简化接入而一律设为 false。产品准入要求由相应 profile 明确指定；整体采用叙事不改变各协议的规范边界。

组件的 `contracts` 只是原协议 `apiVersion + kind` 的引用，不等于 dsh-std 的 live support 或 agreement。[准确映射和基线](architecture.md)单独维护。

## 4. 状态和迁移

环境状态只是观察，不强制 activate/deactivate 命令，也不能据此判断文件系统安全边界。状态来源、描述符绑定和 revision 持久化由管理器负责。

`createMigrationPlan` 是无 IO 的保守预览：secret 跳过；nonportable 跳过；shared/external 只引用；conditional 需要明确资源审批；已知路径重叠会阻断复制。`ready` 只表示元数据层没有 blocked 条目，不表示操作已授权或执行前提全部满足。

执行方仍需真实路径 containment、符号链接/挂载点/URI alias 检查、SSRF 防护、来源认证、内容完整性验证、源 revision 锁定、目标 staging 与回滚证据。Journal 的成功转换不是实际复制/回滚成功证明。详见[迁移提案](proposals/portability.md)和[安全边界](../SECURITY.md)。

运行本仓库示例，不会启动真实环境或迁移文件：

```sh
pnpm build
pnpm examples
```

## 5. 私有扩展

```ts
import { ProtocolCatalog, s, validate } from '@dsh-distribution/core';

const snapshotSpec = s.object({ backend: s.enum('object-store', 'local') });
const definition = {
  apiVersion: 'example.org/v1alpha1',
  kind: 'SnapshotBackend',
  validate: (value: unknown) => validate(snapshotSpec, value),
};
const catalog = new ProtocolCatalog().register(definition);
```

私有协议与公共协议走同一机制，无需修改 core；定义的权威属于相应协议文档。Definition 是可执行本地代码，只注册可信实现，不根据描述符自动下载或执行。可用 `createPublicCatalog().register(definition)` 扩展公共 catalog。

未知 optional 声明可以保留/跳过，但不能把其 spec 当作已校验的数据执行。不兼容的新协议坐标不会被隐式降级。

## 6. 独立语言实现和贡献

读取[协议索引](../registry/protocols.json)与各包 JSON Schema 2020-12，再实现提案规定的关系语义：唯一坐标、DAG、实例绑定、归属一致性、revision、迁移决策和日志状态转换。只跑 schema 不等于完整验证。

使用[共享 fixtures](../conformance/fixtures/descriptors.json)并移植 domain 测试输入；提交证据时区分结构、语义和真实执行三层覆盖，未实现的能力标明未验证。

更多入口：[包索引](../packages/README.md) · [规范提案](proposals/README.md) · [一致性矩阵](../conformance/README.md) · [版本与兼容性](compatibility.md) · [贡献规则](../CONTRIBUTING.md)。
