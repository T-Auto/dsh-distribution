# Security boundaries

Status: Draft. 此项目不是安全隔离器、迁移执行器或官方认证服务。

## Threat model

描述符、component refs、存储 URI、resource roles 和实例 observation 都可能来自不可信来源。攻击者可能伪造身份、把外部目录标为 exclusive、把 secret 隐藏在 config 内、提供内网 URI、使用符号链接/挂载点/大小写别名、重放旧 revision 或伪造迁移完成记录。

## 本仓库保证的范围

- 无自动网络请求、进程启动、安装、文件复制或删除；CLI 只读取调用方明确指定的单个 JSON 文件。
- 严格结构、未知字段、协议坐标、关系语义检查；未知协议明确未检查。
- 迁移计划 secret 优先排除、shared/external 不复制、conditional 审批、显式已知 overlap 阻断。
- 发现 wrapper 提供 timeout/abort，错误不直接回显 provider 私有异常。
- schema 校验库和 CLI 使用受限输入；库不是运行任意 JS getter/proxy 或不可信 definition 的沙箱。

## 执行器仍需实现

来源认证、签名/digest、SSRF/redirect/URI scheme policy、最小权限、输入大小和深度限制、真实路径 containment、symlink/junction/挂载点检查、隐藏 secret 扫描或应用级 export、源快照一致性、原子 revision CAS、目标 staging、完整性验证、crash recovery、真正的 rollback 和审计。

`portable` 不表示「可以公开」，`ready` 不表示「可以直接执行」，`active` 不表示「健康」，`compatible` 不表示「被授权」，`valid` 不表示「安全」。计划日志只记录声明的事件，不自动提供实际执行证据。

## Disclosure

请勿在公开 issue 或 fixture 中粘贴真实 token、私有目录内容或客户数据。优先通过仓库 GitHub Security 页面提供的私密报告能力联系维护者；若该能力未启用，先确认私密联系方式，不把秘密发布到公开 issue。本仓库不虚构已存在的安全邮箱、响应 SLA 或已开启的私密报告服务。
