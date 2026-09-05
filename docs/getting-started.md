# 接入指南

## 发行物作者

1. 先读[最小示例](../examples/minimal.json)，给发行物分配稳定 namespaced URI ID 和 release token。
2. 只添加需要的协议声明。完整示例见 [managed.json](../examples/managed.json)；不要为了「完整」而声称尚未实现的功能。
3. 组件使用外部 ref，不复制其 manifest；配置/状态/数据分别标注资源归属、敏感性与可迁移性。
4. 提供一种消费方可以取得 descriptor 的机制；文件名、OCI annotation、远程服务都由实现选择。
5. `pnpm check` 后使用 CLI 校验实际 descriptor。未知协议须提供可信 definition 和独立 fixtures；`complete: false` 不是完整通过。
6. 交给生态项目时附上所采用坐标、版本、fixture 结果及尚未证明的运行时要求，不宣称官方认证。

## Manager 作者

- 单独维护 EnvironmentInstance；同一 release 的两次安装分配不同实例 ID。
- 对 provider 的输入做网络/文件来源策略，不自动获取任何 descriptor URI。
- 用 `checkDescriptor` 检查数据，再用 `assessCompatibility` 与**实际支持坐标**比较。
- 安全边界以 OS/容器/远程服务权限为准，不以 ownership 标签为准。
- 生命周期是观察 vocabulary，不要求 Manager 支持 activate 命令。
- 迁移先 dry-run，再绑定 source revision 和目标 staging；即便 ready=true，也需要执行器的真实路径、完整性和回滚验证。

可运行示例：

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm examples
node packages/conformance/lib/cli.js examples/minimal.json
```

## 私有协议

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

该 definition 的规范权威属于对应命名空间的协议文档，不属于本仓库。Definition 是可执行本地代码，只注册可信实现。若要扩展公共 catalog，可 `createPublicCatalog().register(definition)`。未知 optional 声明可以保留/跳过，但不能把其 spec 当成经过检查的数据去执行。

## 独立语言实现

读取 `registry/protocols.json` 和 `packages/*/schema/*.schema.json`，使用 JSON Schema 2020-12，再实现各提案的语义规则：唯一坐标、DAG、归属一致性、实例绑定、revision、copy 决策、journal FSM。纯 schema 检查不能替代这些规则。

运行 `conformance/fixtures/descriptors.json` 中的用例，并移植 tests 中针对各 domain 的输入。提交证据时报告 schema/semantic/implementation 三层覆盖，不只提供一个「通过」徽章。
