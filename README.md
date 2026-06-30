# Agent AI

一个通过服务端代理调用 Dify Workflow API 的轻量网页应用。当前页面匹配该 Dify App 的研究调研表单字段。

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

服务器安装 Node.js 18+ 后：

```bash
npm install --omit=dev
npm start
```

建议用 PM2 托管进程，并用 Nginx 反向代理到应用端口。
