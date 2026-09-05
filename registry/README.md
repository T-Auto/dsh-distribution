# 协议坐标索引

[protocols.json](protocols.json) 是本仓库 Draft 协议和数据记录的离线目录，不是发行物 registry、可信发布者名单、安装源或生态认证名单。`formatVersion: 1` 是目录文件格式，不是公共 wire apiVersion。

`protocols` 收录可声明协议（core descriptor 是元协议入口），`records` 收录 instance/observation/plan/journal 数据记录。Record 坐标不是自动的 capability/support；不要把它们直接注册成 domain definition。

每项协议有完整坐标、包、提案和 schema 路径；目录路径相对于仓库根。私有协议不要求登记在此；通过调用方的 ProtocolCatalog 注册即可。此目录不宣称对 `dsh.dev` 或其他域名拥有官方命名权。
