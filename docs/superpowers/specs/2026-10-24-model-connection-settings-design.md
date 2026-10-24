# 明律模型连接配置规格

日期：2026-10-24  
状态：待用户审核

## 目标

为已部署的“明律”网站增加可由访客操作的模型连接设置，使站点在没有可用公共
API 时仍能通过访客自己的 DeepSeek API Key 获得智能解释。

默认模式必须始终是“本站公共接口”。访客主动填写个人 API Key 后，才切换到
“使用我的 API Key”。

## 非目标

- 不在浏览器或数据库中保存公共 API Key。
- 不提供账户系统、额度计费或多人 Key 管理。
- 不允许访客指定任意模型服务器地址。
- 不把 API Key 写入 Netlify 部署包、源码、日志或错误响应。

## 配置来源与优先级

公共接口配置保存在服务端环境变量中：

```dotenv
LEGAL_LLM_BASE_URL=https://api.deepseek.com/v1
LEGAL_LLM_API_KEY=
LEGAL_LLM_MODEL=deepseek-chat
```

本地写入项目根目录 `.env.local`；线上写入 Netlify 的
`Site configuration -> Environment variables`，作用域为所有部署上下文。

访客个人配置只保存在浏览器 `sessionStorage`，关闭标签页后失效。请求规则：

1. 默认发送 `mode: "public"`，服务端只读取环境变量。
2. 访客选择个人 API 时发送 `mode: "personal"`、DeepSeek 模型名和个人 Key。
3. 个人模式配置完整时优先调用访客 Key。
4. 个人模式失败后不回退到公共 Key，避免未经提示消耗站点额度。
5. 公共模式未配置时返回 `not_configured` 和法条检索结果。

## 服务商限制

首版个人模式只支持 DeepSeek：

```text
provider: deepseek
baseUrl: https://api.deepseek.com/v1
models: deepseek-chat, deepseek-reasoner
```

浏览器不能提交任意 `baseUrl`。服务端根据 `provider` 使用固定地址，防止
SSRF 和把本站当作任意网络代理。

公共模式仍允许管理员通过环境变量配置 HTTPS 的 OpenAI 兼容地址。

## 界面

顶部导航增加“模型连接”按钮。设置面板使用带遮罩的侧边面板，包含：

- 连接方式：本站公共接口 / 使用我的 API Key。
- 当前公共接口状态：可用 / 未配置。
- 服务商：DeepSeek。
- 模型选择：`deepseek-chat` / `deepseek-reasoner`。
- API Key 密码输入框，支持显示和隐藏。
- “测试连接”“保存并使用”“清除我的配置”。
- 安全说明：“个人 Key 只保存在当前浏览器会话，不会写入服务器。”

法条结果页的“智能解释还没开启”提示增加“配置模型”按钮，直接打开设置面板。

保存个人配置成功后，如果当前页面存在法律问题，自动重新提交该问题，以便立即
获得智能解释。

## 接口

### `POST /api/model/test`

公共模式请求：

```json
{
  "mode": "public"
}
```

个人模式请求：

```json
{
  "mode": "personal",
  "provider": "deepseek",
  "model": "deepseek-chat",
  "apiKey": "..."
}
```

成功返回：

```json
{
  "ok": true,
  "mode": "personal",
  "model": "deepseek-chat"
}
```

### `POST /api/ask`

在现有请求体上增加可选 `modelConnection` 字段：

```json
{
  "question": "问题",
  "history": [],
  "modelConnection": {
    "mode": "public"
  }
}
```

或：

```json
{
  "modelConnection": {
    "mode": "personal",
    "provider": "deepseek",
    "model": "deepseek-chat",
    "apiKey": "..."
  }
}
```

`/api/health` 继续只返回公共接口是否配置，不返回 Key、地址或模型。

## 服务端结构

- `src/server/config.ts`：公共配置、DeepSeek 固定服务商配置、请求配置解析与
  基本校验。
- `src/server/legal-answer.ts`：接收已解析的模型配置，不再直接读取全局环境变量。
- `src/app/api/ask/route.ts`：解析并校验 `modelConnection`。
- `src/app/api/model/test/route.ts`：提供最小连接测试。
- `src/components/legal-workbench.tsx`：设置面板、会话存储和请求接入。
- `src/app/globals.css`：设置面板及状态样式。

## 错误处理

- 公共模式未配置：显示“本站公共接口未配置”，提供个人 Key 入口。
- 个人 Key 缺失：前端阻止提交并聚焦 Key 输入框。
- 上游返回 401/403：显示“API Key 无效或无权限”。
- 上游超时或网络失败：显示“模型服务暂时无法连接”。
- 个人模式失败：保留个人配置，允许用户修改后重试。
- 不向上游发送除用户问题、最近对话和系统提示词之外的数据。

## 安全要求

- 个人 Key 只存 `sessionStorage`，不使用 `localStorage`。
- Key 不进入 URL、分析事件、应用日志或错误响应。
- 设置面板关闭后，密码输入框清空显示值。
- 服务端只接受 DeepSeek 服务商标识，不接受任意地址。
- API 请求体限制长度，Key 和模型名执行白名单与长度校验。

## 测试

1. 公共模式、公共环境变量完整时返回智能解释。
2. 个人模式使用有效 Key 时返回智能解释。
3. 公共模式未配置且无个人 Key 时只返回法条。
4. 个人 Key 错误时返回明确错误，不泄漏 Key。
5. 关闭页面后 `sessionStorage` 中的个人 Key 消失。
6. 默认选中公共模式。
7. 设置面板在 390px 和 1440px 视口无溢出或遮挡。
8. Netlify 部署包不包含 `.env.local` 或浏览器会话中的 Key。
