# 模型接入与 API 说明

## 设置页面

打开 `/settings`。文本模型和图像模型独立填写；即使使用同一供应商，也需分别录入 Key（可以相同）。Key 留空保留之前的密钥，点击“清除密钥”并保存才能移除。设置修改后需保存，才能测试连接或用于下一次生成。

真实模式要求两个 Key 均已配置；设置保存不代表实际调用成功。连接测试不生成图片：Gemini 查询指定模型，OpenAI / Seedream 查询模型列表。部分代理或方舟接入点不实现 `/models`，这时连接测试可能报错，实际请求能否使用须运行生成任务确认。

同一个系列禁止在 Demo / 真实模式之间混用单款图片。请使用相同模式继续，或创建新系列。

## Gemini 原生示例

- Provider：Google Gemini
- Base URL：`https://generativelanguage.googleapis.com/v1beta`
- 文本模型示例：`gemini-2.5-flash`
- 图像模型示例：`gemini-2.5-flash-image`
- 验证头：`x-goog-api-key`

应用使用 `generateContent` 协议；选择任何其他模型前，确认其支持此协议和所需输入 / 输出能力。图像请求携带 `responseModalities: ["TEXT", "IMAGE"]`、`imageConfig.aspectRatio` 与 `inlineData` 参考图。模型拒绝生成或没有返回图像时显示错误，不回退 Demo。

官方参考：[Gemini generateContent 图片生成与编辑](https://ai.google.dev/gemini-api/docs/generate-content/image-generation)。

## Seedream / 火山方舟示例

- 图像 Provider：Seedream
- Base URL：`https://ark.cn-beijing.volces.com/api/v3`
- 模型：填写账户可调用的模型名称或接入点 ID，界面预填 `doubao-seedream-4-0-250828` 仅作示例。
- 验证头：`Authorization: Bearer ...`
- 请求：`POST /images/generations`
- `image`：包含面料图、辅助参考图与编辑目标图的 data URL 数组。
- `response_format`: `b64_json`。也支持供应商返回 `data[0].url`，服务端下载后转存。
- 3:4 → 1728×2304，9:16 → 1440×2560，16:9 → 2560×1440。使用能接受这些尺寸和多参考图的模型；不兼容将显示参数错误。

官方参考：[火山方舟图像生成 API](https://www.volcengine.com/docs/82379/1541523)。

## OpenAI 兼容示例

文本使用 `chat/completions`，内容包含 `image_url`，输出要求 `response_format: { type: "json_object" }`，需要多模态和 JSON 能力。

图像始终使用 `POST /images/edits` 的 multipart 请求；输入字段为多个 `image[]`、`prompt`、`model`、`n=1`、`size`。图像模型需支持多参考输入，不能把仅支持文生图的旧接口直接当作编辑接口使用。示例模型为 `gpt-image-1.5`；如账户使用其他兼容模型，直接替换。

OpenAI 兼容服务之间的协议差异较大；若服务要求非标准字段，请在 `providers.ts` 中新增 Provider 分支，而不要修改共用任务 / 页面逻辑。

## 服务端边界

- Base URL 填接口前缀，不包含末尾的 `chat/completions`、`images/edits` 或 `generateContent` 路径。
- 不允许 URL 中包含密钥、用户名、密码、查询字符串或片段。
- 默认禁止私网与 HTTP；仅本地测试可设置 `ALLOW_PRIVATE_API=true`。不要在公开部署中启用。
- `PROVIDER_HOST_ALLOWLIST` 可限制配置的模型主机。生成图片的 CDN 下载独立验证 HTTPS 与私网，允许供应商返回预签名图片 URL。
- `APP_ORIGIN` 可固定公开站点的完整来源，例如 `https://fabric.example.com`。反向代理应正确转发 Host；所有写入请求检查 Origin，跨站请求被拒绝。
- `STUDIO_PASSWORD` 为可选全站访问密码；HTTPS 部署同时设置 `COOKIE_SECURE=true`。

## 本地应用 API

接口按 HttpOnly 工作空间 Cookie 隔离；不要向浏览器暴露服务端文件路径或服务商密钥。

| 方法与路径                              | 功能                                                                          |
| --------------------------------------- | ----------------------------------------------------------------------------- |
| GET /api/projects                       | 当前空间项目列表                                                              |
| POST /api/projects                      | 新建项目                                                                      |
| GET /api/projects/:id                   | 项目、素材、分析、配置、系列及任务状态                                        |
| PATCH /api/projects/:id                 | 修改名称、分析、参数、单款说明、收藏或移除素材                                |
| DELETE /api/projects/:id                | 删除项目及其素材                                                              |
| POST /api/projects/:id/upload           | multipart：files（多文件）、role=fabric/reference；或 sample=true             |
| POST /api/projects/:id/analyze          | 使用当前设置执行分析，Demo 返回预设分析                                       |
| POST /api/projects/:id/generate         | `{}` 生成系列；`{lookId,instruction}` 调整单款；`{retry:true}` 重试未完成款式 |
| GET /api/projects/:id/export?format=pdf | PDF 提案                                                                      |
| GET /api/projects/:id/export?format=zip | 图片与设计清单打包                                                            |
| GET /api/assets/:projectId/:filename    | 归属验证后读取原图 / 生成图，加 download=1 触发附件下载                       |
| GET /api/settings                       | 模型配置摘要与 hasKey，不返回 Key                                             |
| PUT /api/settings                       | 保存并加密配置                                                                |
| POST /api/settings                      | `{target:"text"}` 或 `{target:"image"}` 测试已保存连接                        |

## 扩展

目前采用显式 Provider 分支，任务层只依赖 `analyze`、`plan`、`generateImage`、`testProvider`，无需修改工作台即可更换实现。扩展新供应商时同步添加类型枚举、设置项及协议测试。使用分布式部署时，将 `store.ts` 替换为数据库 / 对象存储，将 `jobs.ts` 的进程内任务替换为持久队列。
