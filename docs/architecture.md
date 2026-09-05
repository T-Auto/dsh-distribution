# 架构与职责边界

Status: Draft。本文是 informative 架构说明；规范性约束见[提案索引](proposals/README.md)。

## 1. 正交而非强制堆叠

```text
                 ecosystem guidance / admission profiles
                            /
         dsh-std interaction            dsh-distribution environment
         core -> domain protocols       core -> environment protocols
                       \                  /
                 implementations and adapters
```

环境是否由某组件实现，与外界能否发现该环境是两个问题。没有 dsh 插件的远程服务仍可声明 distribution；没有 distribution 的程序仍可采用 dsh-std 协议。

借鉴 dsh-std 的理念是「元协议小、领域独立、规范权威来自坐标和文档、实现可替换」，不是复制其完整框架或发明第二套组件 manifest。

## 2. Core 做什么

Core 只包含：发行物身份；描述符；协议坐标与 required 声明；definition catalog 调度；精确坐标兼容报告。Core 不认识 config、provider、component、migration 等领域字段。

```
                         core
              /     /     |      \
     composition layout discovery lifecycle
                    \
                     portability
                         \
                           conformance
```

准确依赖：composition/layout/discovery/lifecycle -> core；portability -> core + layout；conformance -> 六个协议包。Conformance 是聚合工具，不是新的元协议，也不作为其他包的依赖。

Schema/type/checker 在同一 typed schema declaration 上生成，独立 Ajv 检查 JSON Schema 2020-12 的结构一致性；对象关系、图、迁移规则仍由语义校验器处理。规范文档高于参考代码，生成 schema 不是修改规范的捷径。

## 3. 三种身份、三个版本

| 概念 | 表示 | 比较 |
| --- | --- | --- |
| 协议身份 | `apiVersion + kind` | 精确字符串，不隐式兼容 alpha/beta/stable |
| 发行物身份 | `distribution.id + version` | 精确字符串，不排序 opaque 版本 |
| 环境实例 | 全局唯一 `instanceId` URI | 克隆生成新 ID；外部持久注册表保证唯一性 |

npm 包版本不参与 wire 判断。来源 URI 不等于内容摘要；两个引用指向同一对象不意味着两个 URI 字符串相等。Core 不进行网络解析、版本选优或摘要验证。

## 4. dsh-std 引用映射（只读基线）

本地审阅基线：`Yan-Zero/dsh-std@3ef11dac51e82625a345b51051b2bab90649d804`。

| distribution 概念 | dsh-std 对应概念 | 边界 |
| --- | --- | --- |
| ProtocolDeclaration | ApiReference 的 `apiVersion + kind` 语法 | 本仓库 required/spec 是静态环境声明，不直接冒充 ProtocolDeclaration 的 participant/requires/supports |
| composition.components[].ref | Component 的外部引用 | 不内嵌/复制 facet、activation、permissions 或 entrypoint |
| composition.components[].contracts | 例如 `connection.dsh/v1alpha1 + EndpointConnection` | 仅外部契约引用，不声明 live support，不协商 connection |
| EnvironmentInstance | 与 activation instance / participant 均不同 | 一个环境可拥有多个 activation/participant，二者生命周期不绑定 |
| EnvironmentObservation | 与组件 lifecycle 不同 | migrating 表示管理观察，不代表组件停机或隔离 |

产品 adapter 读取组件自身 manifest，再通过原 dsh-std catalog 校验/协商；本仓库不从安装引用合成活动 participant。跨项目映射详见 [adapter note](../adapters/dsh-std.md)。

## 5. dsh-ecosystem-spec 分工

本地审阅基线：`T-Auto/dsh-ecosystem-spec@c7b1b61e0692ec36dc66221058757249d858df85`。当前 README 声明修订中，并将 `old/` 作为既有规范备份；当前介绍将 dsh-distribution 定位为发行物/整合包作者的环境元协议。

本项目据此提供公共环境契约，而不把旧 TUI admission 要求搬进 core。准入版本、认证标志、推荐列表、治理晋级由生态项目决定。任何 TUI 专有政策应标 `TUI-*`；不得因本仓库本地测试通过就声称「市场已接纳」。本次不修改生态仓库入口或其 vendor revision。

## 6. 信任模型

描述符是不可信数据。Catalog 是调用方信任的代码，未信任的 schema/definition 不能通过远程描述符自动加载。Descriptor MAY 被缓存，但 Manager 自行验证来源、签名、完整性、权限和 freshness。

公开 schema 标识使用 GitHub URL 作为名称，并非可用的远程 schema 服务。校验离线完成，不自动解引用 `$id` 或 component URI。声明 exclusive 只是声明管理归属，不是 OS 安全隔离证明。
