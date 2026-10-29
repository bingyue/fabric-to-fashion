# 第三方材料与许可证说明

本项目的作者声明和最终项目级许可不覆盖第三方享有的权利。使用、修改或分发相关材料时，应保留其原始版权与许可声明，并遵守相应条款。以下清单基于仓库文件及当前安装依赖的 `package.json`；并非完整的传递依赖法律审计。

## 随源码分发的字体

| 字体文件                                                     | 原有版权信息                                                          | 许可文本                                        |
| ------------------------------------------------------------ | --------------------------------------------------------------------- | ----------------------------------------------- |
| `public/fonts/Manrope.woff2`、`Manrope-Regular.ttf`          | Copyright 2018 The Manrope Project Authors                            | [Manrope-OFL.txt](public/fonts/Manrope-OFL.txt) |
| `public/fonts/NotoSansSC-UI.woff2`、`NotoSansSC-Regular.ttf` | 仓库原有声明为 Copyright 2014–2021 Adobe，Reserved Font Name “Source” | [OFL.txt](public/fonts/OFL.txt)                 |

以上字体按 SIL Open Font License 1.1 提供。原有许可证保持原文，未替换为本项目作者署名。网页使用本地 WOFF2，PDF 嵌入字体；分发时须一并保留字体授权材料。

## 直接运行依赖

| 包             | 当前锁定版本 | 包声明的许可证 |
| -------------- | ------------ | -------------- |
| `archiver`     | 7.0.1        | MIT            |
| `lucide-react` | 0.577.0      | ISC            |
| `next`         | 16.4.3       | MIT            |
| `pdfkit`       | 0.17.2       | MIT            |
| `react`        | 19.3.0       | MIT            |
| `react-dom`    | 19.3.0       | MIT            |
| `server-only`  | 0.0.1        | MIT            |
| `sharp`        | 0.35.5       | Apache-2.0     |
| `zod`          | 4.6.6        | MIT            |

依赖通过 npm 安装，不将 `node_modules/` 纳入源码仓库。完整版本树见 `package-lock.json`，各包许可证及 NOTICE 见安装包内相应文件。分发构建产物、容器或依赖副本时，还需包含有关传递依赖、原生组件和构建时内嵌材料要求的声明；不要只复制此表作为完整合规清单。

## 示例图片和生成内容

`public/demo/` 中的预置图片用于 Demo 展示，制作提示词及文件对应关系保存在 [docs/demo-assets.json](docs/demo-assets.json)。它们不是用户上传面料后实时生成的结果，也不代表真实服装品牌或商业客户案例。本项目不保证 AI 生成素材具有排他版权或已完成第三方权利清理。

用户输入、真实模型输出和第三方模型服务条款不因项目许可而被替代。
