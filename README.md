# Agent AI 学术论文检索助手

一个通过服务端代理调用 Dify Workflow API 的学术论文检索网页应用。前端负责表单、历史记录、Markdown 展示；Dify API Key 只放在服务器 `.env`，不会暴露到浏览器。

## 本地运行

```bash
npm install
cp .env.example .env
npm run dev
```

`.env` 中需要配置：

```bash
DIFY_API_BASE=https://api.dify.ai/v1
DIFY_API_KEY=app-your-dify-api-key
PORT=3000
```

浏览器打开 `http://localhost:3000`。

## 部署

服务器需要 Node.js 18+：

```bash
npm install --omit=dev
npm start
```

生产环境建议用 PM2 托管进程，并用 Nginx 反向代理到应用端口。
