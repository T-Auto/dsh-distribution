# DIST-001 — Environment Identity and Declaration

Status: Draft
Scope: implementation-independent environment meta-protocol
Coordinates: `distribution.dsh.dev/v1alpha1` + `DistributionDescriptor`

## 1. 数据模型与规范性行为

**CORE-01**：描述符 MUST 包含固定坐标、`distribution: { id, version }` 和 `protocols` 数组。`displayName` MAY 存在。其他顶层字段 MUST NOT 存在。发行物是逻辑环境，不要求具有某个文件名、目录、进程、格式或本地安装。

**CORE-02**：`id` MUST 是符合 schema 的绝对 URI 形状字符串；`version` MUST 是非空无空白 token。二者 MUST 精确比较；实现 MUST NOT 将版本解释为协议版本或擅自按 SemVer 升降级。URI 形状校验仅定义词法表达，不保证资源存在或某方案可用。若需要 URI canonicalization，由方案 profile 定义；默认不进行。

**CORE-03**：同一发行物 MAY 有多个实例。实例身份 MUST NOT 写入此描述符；实例另见 DIST-004。发行物发布者 SHOULD 在同一 id/version 下保持描述内容不变；消费端仍需独立校验完整性和 freshness，不以此建议替代 digest。

**CORE-04**：每条协议声明 MUST 有 `apiVersion`、`kind`、`required: boolean` 和 JSON `spec`。apiVersion 语法为命名空间 `/v<positive major>[alpha|beta<positive revision>]`，kind 以大写字母开始，仅含 ASCII 字母数字。同一坐标 MUST NOT 重复。声明顺序不表示依赖优先级。

**CORE-05**：一个 Distribution MUST 有可被消费方取得的描述符。此要求不规定 discovery 机制；只采用 core 的实现 MAY 使用带外传递、容器 metadata、文件、URI 或服务。单独的 JSON fixture 只能证明描述符格式，不能证明部署可发现。

## 2. 可拔插 definition 与兼容判断

**CORE-06**：Catalog MUST 以完整坐标定位 definition，MUST NOT 按包名、kind 单独匹配或 implicit major compatibility。私有坐标与公共坐标走同一机制。重复 definition 注册 MUST 失败。

**CORE-07**：Catalog knowledge、consumer support、协议 agreement 和 authorization 是不同事实。静态兼容判断 MUST 接收调用方独立声明的实际 support；MUST NOT 把 catalog 中存在 validator 解释成运行时 support。Core 不产生 dsh-std agreement。

**CORE-08**：未知或未支持的 required 协议 MUST 使兼容结果失败；未知 optional 协议 MAY 被保留并跳过，但 MUST 可诊断。已理解协议的无效 spec 即使 optional 也 MUST 报无效，不以 optional 掩盖损坏数据。Definition 抛错 MUST 失败封闭，不暴露内部异常中的凭据。

**CORE-09**：Core MUST NOT 解释 domain spec。定义实现是调用方信任的本地代码，MUST NOT 依据不可信描述符自动 import、下载或执行 definition。

## 3. 报告与错误

`assessCompatibility` 返回 `compatible`、`issues[]`、逐协议状态 `accepted/unsupported/invalid/unknown`。`accepted` 仅指本次静态检查和显式 support 匹配；不代表运行授权或协商成功。

Issue 包含稳定 code、JSON Pointer path 和面向人的 message。实现 SHOULD 依赖 code，而非解析 message。结构无效返回 `SCHEMA_INVALID`；非 JSON 返回 `NOT_JSON`；重复返回 `DUPLICATE`；required 不可用返回 `REQUIRED_PROTOCOL_UNAVAILABLE`；definition 抛错返回 `DEFINITION_ERROR`。报告顺序遵循输入顺序，不改变输入。

Conformance 聚合报告区分 valid 与 complete：未知协议可以结构有效但未检查，不能宣称完整符合该私有协议。

## 4. 生命周期、兼容与安全

描述符本身无执行生命周期；动态实例观察另见 DIST-005。破坏性语义 MUST 使用新坐标；移除旧坐标前 SHOULD 有明确兼容窗口。对未知新版本 MUST NOT 静默降级。

Descriptor MUST 被当作数据；它不授予文件、网络或进程权限。调用方 MUST 限制输入尺寸/嵌套深度并处理恶意 JSON；参考 CLI 限制为 1 MiB，库 API 面向已受限的 JSON 数据。非 JSON 的 getter/proxy 等主动对象不属于 wire 输入，库不是执行这类对象的安全沙箱。

## 5. Evidence / Fixtures / Conformance impact

[Schema](../../packages/core/schema/descriptor.schema.json)、[实现](../../packages/core/src/index.ts)、[fixtures](../../conformance/fixtures/descriptors.json)、[测试](../../tests/core.test.mjs)。CORE-05 的部署可发现性与 CORE-09 的宿主 IO policy 需要实现层证据，不能由这些静态测试证明。

Normative change: 初次建立元协议契约。Compatibility impact: 无既有已发布 wire contract。Migration / Rollback: 概念片段转换见[兼容性](../compatibility.md)；不识别 v1alpha1 的消费者保留原描述符并拒绝 required 采用，不修改环境。
