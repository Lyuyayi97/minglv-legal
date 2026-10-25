# 明律 · 法律科普与求助

面向中国大陆现行法律法规的法律科普与求助工具。回答先用通俗语言解释问题，
再给出可核验的法条依据和下一步建议；服务端只允许引用本次检索到的真实法条。

## 技术栈

- Next.js 16 / React 19 / TypeScript
- Node.js 24 内置 SQLite + FTS5 trigram 中文检索
- OpenAI 兼容 Chat Completions 接口
- 法规语料：`lttxzmj/chinese-law-corpus`（CC0）

当前本地法规库包含 1,513 部法规和 56,182 条逐条结构化法条。

## 启动

```powershell
pnpm install
pnpm data:sync
pnpm data:build
pnpm dev
```

打开 `http://localhost:3000`。

如果依赖已经安装且法规库已经生成，可跳过前三条命令，只运行：

```powershell
pnpm dev
```

## 填写模型 API

编辑项目根目录的 `.env.local`：

```dotenv
LEGAL_LLM_BASE_URL=https://your-endpoint.example/v1
LEGAL_LLM_API_KEY=your-key
LEGAL_LLM_MODEL=your-model
```

`LEGAL_LLM_BASE_URL` 填 OpenAI 兼容服务的 `/v1` 地址。应用会自动请求
`/chat/completions`；如果填的是完整 `/chat/completions` 地址，也会直接使用。

配置读取与接口适配位于 `src/server/config.ts`。`.env.local` 已被
`.gitignore` 排除，不会提交到版本库。

## 临时内置 API Key 的 Netlify 部署包

临时部署可以让模型配置随服务端代码打包，不依赖 Netlify 环境变量。不要把
生成的临时包或 `.env.local` 上传到 GitHub。

1. 编辑项目根目录的 `.env.local`：

```dotenv
LEGAL_LLM_BASE_URL=https://api.deepseek.com/v1
LEGAL_LLM_API_KEY=新的有效Key
LEGAL_LLM_MODEL=deepseek-chat
```

2. 生成临时包：

```powershell
pnpm netlify:package:temp
```

3. 输出文件：

```text
deliverables/minglv-netlify-temp.zip
```

4. 解压后进入目录并使用 Netlify CLI 部署：

```powershell
npx netlify deploy --build --prod
```

临时包通过 `src/server/embedded-config.ts` 的构建副本携带 Key，Key 只存在于
服务端函数中，不会进入浏览器前端；原始 `src/server/embedded-config.ts` 在
Git 仓库中保持空白。临时使用结束后应删除 ZIP，并在 API 服务商后台轮换 Key。

## 部署到 Netlify

项目已包含 `netlify.toml`、Netlify Next.js 运行时插件和数据库文件追踪配置。
法规库以 `data/legal.sqlite.gz` 保存在 Git 仓库中，Netlify 构建时自动解压。

生成部署包：

```powershell
pnpm netlify:package
```

输出文件为 `deliverables/minglv-netlify.zip`。部署包包含源码、锁文件、
`netlify.toml` 和 `data/legal.sqlite`，不包含 `.env.local`、法规原始语料、
本地缓存或 `node_modules`。

推荐部署方式：

1. 将仓库推送到 GitHub、GitLab 或 Bitbucket。
2. 在 Netlify 中选择 `Add new site`，连接该仓库。
3. `netlify.toml` 会自动提供构建命令、Node.js 版本和 Next.js 运行时。
4. 构建会先执行 `node scripts/prepare-db.mjs` 解压法规库。
5. 在 Netlify 的 `Site configuration > Environment variables` 中填写
   `LEGAL_LLM_BASE_URL`、`LEGAL_LLM_API_KEY` 和 `LEGAL_LLM_MODEL`。
6. 重新部署使环境变量生效。

也可以解压后直接使用 Netlify CLI：

```powershell
pnpm install
npx netlify deploy --build --prod
```

Netlify 的 Next.js 运行时会把 API Route 部署为服务端函数。法规 SQLite
库通过 `next.config.ts` 的 `outputFileTracingIncludes` 纳入函数文件追踪。

## 主要接口

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| `POST` | `/api/ask` | 提问和追问 |
| `GET` | `/api/laws/search?q=` | 检索法规名称与条文 |
| `GET` | `/api/articles/:articleId` | 获取单条法条 |
| `GET` | `/api/health` | 检查法规库与模型配置 |

## 引用约束

1. 先根据法规名称、条号、关键词和 FTS5 排名召回候选法条。
2. 只把候选法条的稳定 ID 和原文交给模型。
3. 模型按固定 JSON 协议输出结论、前提、分析和依据。
4. 服务端再次以候选集合为白名单校验所有 `articleId`。
5. 不存在的引用会被移除；没有有效依据时降级为“依据不足”。

## 验证

```powershell
.\node_modules\.bin\tsc.cmd --noEmit
node --test tests/legal-text.test.mjs
.\node_modules\.bin\next.cmd build
```

## 数据与免责声明

法规源数据来自国家法律法规数据库的非官方结构化整理。正式引用应以
[国家法律法规数据库](https://flk.npc.gov.cn/) 公布文本为准。

本工具输出仅供法律研究参考，不构成正式法律意见。
