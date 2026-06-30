# 📚 学术论文检索助手 (Agent_ai)

> 基于 Dify AI Workflow + ChatGPT 风格界面的智能学术论文检索工具

<p align="center">
  <img src="https://img.shields.io/badge/status-active-success" alt="Status" />
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="License" />
  <img src="https://img.shields.io/badge/platform-web-brightgreen" alt="Platform" />
</p>

---

## ✨ 功能特性

- 🔍 **智能学术检索** — 基于 Dify AI Workflow，支持多数据源（arXiv、Semantic Scholar 等）的论文检索
- 📝 **结构化输入** — 支持研究主题、任务类型、年份范围、偏好数据源、输出语言等精确配置
- 💬 **ChatGPT 风格界面** — 简洁美观的对话式交互，支持深色模式
- ⚡ **实时流式输出** — SSE 流式传输，检索结果实时渲染为 Markdown
- 📊 **进度可视化** — 直观展示检索流程：规划 → 检索 → 综合分析
- 💾 **本地历史记录** — 自动保存搜索历史，方便回溯查看
- 🎨 **代码高亮** — 集成 highlight.js，代码和 LaTeX 公式完美渲染

## 🚀 快速开始

### 前置条件

- 一个 [Dify](https://cloud.dify.ai) 账号和已配置的学术检索工作流
- Dify API Key

### 本地运行

```bash
# 克隆仓库
git clone git@github.com:lianjunl13-sudo/Agent_ai.git
cd Agent_ai

# 使用任意 HTTP 服务器启动
npx serve -s . -p 3456

# 或使用 Python
python3 -m http.server 3456
```

然后打开浏览器访问 `http://localhost:3456`

### 在线使用

🌐 在线体验地址：https://agent-ai-xxx.edgeonepages.com （部署中）

使用时输入你的 Dify API Key 即可开始检索。

---

## 📖 使用说明

### 输入参数

| 参数 | 说明 | 示例 |
|------|------|------|
| 研究主题 | 要检索的核心主题 | "Transformer 注意力机制优化" |
| 任务类型 | 检索目的 | 文献综述 / 论文对比 / 方法总结 |
| 最大结果数 | 返回论文数量 | 5 ~ 20 |
| 起始年份 | 论文发表年份下限 | 2020 |
| 偏好数据源 | 检索来源 | arXiv / Semantic Scholar / 混合 |
| 输出语言 | 结果报告语言 | 中文 / English |
| 自定义约束 | 额外筛选条件 | "仅包含顶会论文" |

### 检索流程

```
用户输入 → 规划检索策略 → 多源检索 → 综合分析 → 生成报告
```

---

## 🛠️ 技术栈

| 技术 | 用途 |
|------|------|
| **HTML5 + CSS3** | 页面结构与现代化样式 |
| **原生 JavaScript** | 业务逻辑、SSE 流处理、状态管理 |
| **Dify Workflow API** | 学术检索 AI 引擎 |
| **marked.js** | Markdown 实时渲染 |
| **highlight.js** | 代码块语法高亮 |
| **LocalStorage** | 搜索历史持久化 |

---

## 📁 项目结构

```
Agent_ai/
├── index.html        # 单文件应用（HTML + CSS + JS）
└── README.md         # 项目文档
```

---

## 🔑 环境变量

本项目为纯前端应用，无需环境变量。API Key 通过界面输入框配置，存储在浏览器本地。

---

## 📄 License

MIT © 2025

---

<p align="center">Made with ❤️ + Dify AI</p>
