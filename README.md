# Hiito MCP Server

[![npm version](https://badge.fury.io/js/hiito-mcp-server.svg)](https://www.npmjs.com/package/hiito-mcp-server)
[![GitHub stars](https://img.shields.io/github/stars/Qiuzer/Hiito-MCP.svg)](https://github.com/Qiuzer/Hiito-MCP)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

随时随地搜索附近的派对与流动市集，让线下同频社交触手可及。

Discover nearby parties and pop-up markets anytime, anywhere—making real-life, like-minded social connections always within reach.

---

## ✨ 功能特性

### 🔍 派对搜索
- **`party_search_nearby`** - 根据经纬度和搜索半径，查找附近的派对活动
- **`party_list_upcoming`** - 获取近期即将开始的派对列表（按时间升序）
- **`party_list_by_organizer`** - 查询指定主办方举办的所有派对

### 📋 派对详情
- **`party_get_detail`** - 获取派对的完整信息（时间、地点、主办方、报名人数等）

### 🔗 深度链接生成
- **`party_generate_deep_link`** - 生成打开小程序的短链接（URL Scheme / URL Link），支持微信内和浏览器打开

### 👤 主办方信息
- **`organizer_get_info`** - 获取主办方的完整资料（名称、简介、认证状态、统计数据）

---

## 🚀 快速开始

### 方式一：本地开发（stdio 模式）

```bash
# 克隆仓库
git clone git@github.com:Qiuzer/Hiito-MCP.git
cd Hiito-MCP

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填入真实配置

# 编译 TypeScript
npm run build

# 启动服务（stdio 模式）
TRANSPORT_MODE=stdio npm start
```

---

### 方式二：HTTP 服务器模式

```bash
# 配置环境变量后
TRANSPORT_MODE=http npm start

# 服务运行在 http://localhost:8080
# 健康检查: http://localhost:8080/health
# MCP 端点: http://localhost:8080/mcp
```

---

## 📦 部署指南

### 部署到 CloudBase 云托管

1. 访问 [CloudBase 控制台](https://console.cloud.tencent.com/tcb)
2. 选择环境
3. 进入 **云托管** → **服务列表**
4. 点击 **新建服务**
5. 选择 **从 Git 仓库部署**
6. 连接 GitHub 仓库 `Qiuzer/Hiito-MCP`
7. 配置环境变量（参考 `.env.example`）
8. 点击 **立即部署**

详细步骤请查看 👉 [CLOUDBASE_DEPLOYMENT.md](CLOUDBASE_DEPLOYMENT.md)

---

## 🔧 配置说明

### 环境变量

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `WECHAT_APP_ID` | ✅ | 微信小程序 AppID |
| `CLOUD_ENV_ID` | ✅ | CloudBase 源环境 ID |
| `TARGET_ENV_ID` | ✅ | CloudBase 目标环境 ID |
| `MCP_AUTH_TOKEN` | 🔒 | MCP 认证 Token（HTTP 模式推荐配置） |
| `TRANSPORT_MODE` | ❌ | 传输模式：`stdio` 或 `http`（默认 `stdio`） |
| `PORT` | ❌ | HTTP 模式监听端口（默认 `8080`） |
| `NODE_ENV` | ❌ | 环境模式：`production` 或 `development` |
| `CORS_ORIGINS` | ❌ | CORS 允许的源列表（逗号分隔） |

完整配置说明请查看 `.env.example` 文件。

---

## 🎯 应用场景

### 1. AI 助手查询附近派对
```
用户: "附近有什么派对？"
AI: 调用 party_search_nearby 工具，返回附近派对列表
```

### 2. 自动生成派对分享链接
```
用户: "帮我生成一个派对分享链接"
AI: 调用 party_generate_deep_link 工具，返回小程序打开链接
```

### 3. 智能推荐即将开始的派对
```
用户: "这周有什么派对推荐吗？"
AI: 调用 party_list_upcoming 工具，返回近期派对列表
```

### 4. 主办方可信度评估
```
用户: "这个主办方靠谱吗？"
AI: 调用 organizer_get_info 工具，返回主办方详细资料
```

---

## 🔌 集成到 Claude Desktop

编辑 Claude Desktop 配置文件：

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "hiito": {
      "command": "node",
      "args": ["/path/to/Hiito-MCP/dist/index.js"],
      "env": {
        "TRANSPORT_MODE": "stdio",
        "WECHAT_APP_ID": "your_app_id",
        "CLOUD_ENV_ID": "your_cloud_env_id",
        "TARGET_ENV_ID": "your_target_env_id"
      }
    }
  }
}
```

重启 Claude Desktop 后，即可使用 Hiito 工具。

---

## ☁️ 部署到腾讯云 MCP 广场

### 方式一：云托管部署（推荐用于 MCP 广场）

1. 访问 [腾讯云 MCP 广场](https://cloud.tencent.com/developer/mcp)
2. 点击 **"我是 MCP 开发者"** → **"上架 MCP"**
3. 选择环境变量部署方式
4. 填写以下配置：

```json
{
  "service": {
    "framework": "express",
    "containerPort": 8080
  },
  "envVariables": {
    "WECHAT_APP_ID": "your_wechat_app_id",
    "CLOUD_ENV_ID": "your_cloud_env_id",
    "TARGET_ENV_ID": "your_target_env_id",
    "MCP_AUTH_TOKEN": "your_secure_token",
    "TRANSPORT_MODE": "http",
    "PORT": "8080"
  }
}
```

5. 提交审核

详细文档请查看 👉 [MCP_SQUARE_DEPLOYMENT.md](MCP_SQUARE_DEPLOYMENT.md)

### 方式二：手动云托管部署

1. 访问 [CloudBase 控制台](https://console.cloud.tencent.com/tcb)
2. 选择环境 → **云托管** → **服务列表**
3. 点击 **新建服务**
4. 选择 **从 Git 仓库部署**
5. 连接 GitHub 仓库 `Qiuzer/Hiito-MCP`
6. 配置环境变量（参考 `.env.example`）
7. 点击 **立即部署**

### 方式三：云函数部署（现有部署）

参考 👉 [CLOUDBASE_DEPLOYMENT.md](CLOUDBASE_DEPLOYMENT.md)

---

## 🏗️ 技术架构

| 组件 | 技术栈 |
|------|----------|
| **协议标准** | Model Context Protocol (MCP) 1.0 |
| **传输模式** | stdio / HTTP / SSE (三模式) |
| **运行环境** | Node.js 18+ / CloudRun (容器化) |
| **数据存储** | CloudBase (腾讯云开发) |
| **小程序平台** | 微信小程序 |
| **构建工具** | TypeScript + Docker |

---

## 📁 项目结构

```
Hiito-MCP/
├── src/                        # 源代码
│   ├── index.ts               # 主入口文件
│   ├── tools/                 # MCP 工具定义
│   │   ├── party_tools.ts            # 派对相关工具
│   │   └── link_and_organizer_tools.ts  # 链接和主办方工具
│   ├── services/              # 后端服务
│   │   └── cloudbase.ts             # CloudBase 数据库查询
│   └── utils/                # 工具函数
│       └── validators.ts             # 参数验证
├── dist/                       # 编译输出（git ignore）
├── Dockerfile                  # 容器化配置
├── .env.example               # 环境变量模板
├── package.json               # 项目配置
├── tsconfig.json              # TypeScript 配置
└── README.md                 # 项目文档
```

---

## 🔒 安全特性

- **认证中间件**: HTTP/SSE 端点支持 Bearer Token 认证（`MCP_AUTH_TOKEN`），生产环境强制要求
- **速率限制**: 15 分钟窗口内每 IP 最多 100 次请求（express-rate-limit）
- **安全头**: Helmet 中间件自动添加安全响应头
- **CORS**: 可配置的跨域策略（`CORS_ORIGINS`）
- **健康检查**: `/health` 端点不泄露任何敏感配置信息
- **SSE 会话清理**: 自动清理过期会话（TTL 1 小时），防止内存泄漏

---

## 🧪 测试

### 本地测试 HTTP 模式

```bash
# 启动服务
TRANSPORT_MODE=http npm start

# 健康检查
curl http://localhost:8080/health

# 预期返回：
# {
#   "status": "ok",
#   "service": "hiito-mcp-server",
#   "version": "1.0.0",
#   "timestamp": "2026-05-07T...",
#   "uptime": 42.5
# }
```

### 测试 MCP 端点

使用 [MCP Inspector](https://github.com/modelcontextprotocol/inspector)：

```bash
npx @modelcontextprotocol/inspector
```

然后连接到 `http://localhost:8080/mcp`

---

## 🤝 贡献指南

欢迎贡献代码、提出建议或报告问题！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

---

## 📝 更新日志

### v1.0.0 (2026-05-07)

- ✅ 初始版本发布
- ✅ 支持 6 个 MCP 工具
- ✅ 支持 stdio、HTTP、SSE 三种传输模式
- ✅ 支持 Docker 容器化部署
- ✅ 集成 CloudBase 云开发
- 🔒 安全审计：认证/限流/安全头/SSE 会话管理
- 🔧 代码质量：统一 Zod schema 来源，消除类型重复定义

---

## 📄 许可证

[MIT License](LICENSE)

---

## 🔗 相关链接

- **微信小程序**: 螺母车尾派对（搜索 "Hiito" 或 "螺母车尾派对"）
- **MCP 协议文档**: https://modelcontextprotocol.io/
- **CloudBase 文档**: https://docs.cloudbase.net/
- **问题反馈**: https://github.com/Qiuzer/Hiito-MCP/issues

---

## ⭐ Star History

如果这个项目对您有帮助，请给个 Star ⭐️！

[![Star History Chart](https://api.star-history.com/svg?repos=Qiuzer/Hiito-MCP&type=Date)](https://star-history.com/#Qiuzer/Hiito-MCP&Date)

---

**Made with ❤️ by [Churze](https://github.com/Qiuzer)**
