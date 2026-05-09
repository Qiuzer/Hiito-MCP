# 螺母车尾派对 MCP Server

[![npm version](https://badge.fury.io/js/hiito-mcp-server.svg)](https://www.npmjs.com/package/hiito-mcp-server)
[![GitHub stars](https://img.shields.io/github/stars/Qiuzer/Hiito-MCP.svg)](https://github.com/Qiuzer/Hiito-MCP)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

让 AI 助手帮你发现附近的车尾派对活动，一键生成小程序打开链接。

> **MCP (Model Context Protocol)** 服务器，为 Claude Desktop、Cursor、Cline 等 AI 客户端提供查询螺母车尾派对的能力。

---

## ✨ 功能特性

### 🔍 搜索附近派对
- **`party_search_nearby`** - 根据经纬度和搜索半径，查找附近的派对活动，返回派对名称、地点、距离等信息

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
# 必需: TARGET_ENV_ID（hiito 生产环境 ID）

# 编译 TypeScript
npm run build

# 启动服务（stdio 模式）
npm start
```

---

### 方式二：HTTP 服务器模式

```bash
# 配置环境变量后
npm run start:http

# 服务运行在 http://localhost:8080
# 健康检查: http://localhost:8080/health
# MCP 端点: http://localhost:8080/mcp
```

> **注意**：MCP Server 部署在独立的 `hiito-mcp-prod` 环境，通过云间调用访问 hiito 生产环境数据。

---

## 🔧 配置说明

### 环境变量

| 变量名 | 必填 | 说明 | 示例值 |
|--------|------|------|--------|
| `TARGET_ENV_ID` | ✅ | hiito 生产环境 ID（云间调用目标） | `nut-4gpjbl8q5edaad32` |
| `WXP_APP_ID` | ✅ | 微信小程序 AppID | `wx25b365a4b50a0958` |
| `TRANSPORT_MODE` | ❌ | 传输模式：`stdio` 或 `http`（默认 `stdio`） | `stdio` |
| `PORT` | ❌ | HTTP 模式监听端口（默认 `8080`） | `8080` |
| `MCP_AUTH_TOKEN` | 🔒 | MCP 认证 Token（HTTP 模式推荐） | - |
| `NODE_ENV` | ❌ | 环境模式：`production` 或 `development` | `production` |
| `CORS_ORIGINS` | ❌ | CORS 允许的源列表（逗号分隔） | - |

> **架构说明**：MCP Server 部署在独立的 `hiito-mcp-prod` 环境（纯代码环境，不存数据），通过 `TARGET_ENV_ID` 云间调用 hiito 生产环境的数据。

完整配置说明请查看 `.env.example` 文件。

---

## 🎯 应用场景

### 查询附近派对
```
用户: "附近有什么派对？"
AI: 调用 party_search_nearby 工具（需要经纬度），返回附近派对列表
```

```
用户: "上海外滩附近有什么车尾派对？"
AI: 调用 party_search_nearby 工具（latitude=31.2304, longitude=121.4737），返回附近派对列表
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
      "args": ["/path/to/MCP-Server/dist/index.js"],
      "env": {
        "TARGET_ENV_ID": "nut-4gpjbl8q5edaad32",
        "WXP_APP_ID": "wx25b365a4b50a0958"
      }
    }
  }
}
```

重启 Claude Desktop 后，即可使用 Hiito MCP 工具。

---

## ☁️ 部署到腾讯云 MCP 广场

### 方式一：云托管部署（推荐）

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
    "TARGET_ENV_ID": "nut-4gpjbl8q5edaad32",
    "WXP_APP_ID": "wx25b365a4b50a0958",
    "TRANSPORT_MODE": "http",
    "PORT": "8080",
    "MCP_AUTH_TOKEN": "your_secure_token"
  }
}
```

5. 提交审核

详细文档请查看 👉 [MCP_SQUARE_DEPLOYMENT.md](MCP_SQUARE_DEPLOYMENT.md)

### 方式二：CloudBase 云函数部署

部署到 `hiito-mcp-prod` 环境（独立 MCP Server 环境）：

```bash
# 1. 编译 TypeScript
npm run build

# 2. 部署云函数
tcb fn deploy hiito-mcp-server --envId hiito-mcp-prod-xxxx
```

> **注意**：`hiito-mcp-prod` 是纯代码环境，不存储数据，通过云间调用访问 hiito 生产环境。

详细步骤请查看 👉 [CLOUDBASE_DEPLOYMENT.md](CLOUDBASE_DEPLOYMENT.md)

---

## 🏗️ 技术架构

```
┌─────────────────────────────────────────────────────┐
│              用户在 AI 客户端                        │
│  （Claude Desktop / Cursor / Cline / 其他）         │
└────────────────────┬────────────────────────────┘
                     │  MCP Protocol (JSON-RPC 2.0)
                     ▼
┌─────────────────────────────────────────────────────┐
│           MCP Server（云函数/本地）                 │
│                                                     │
│  ┌────────────────────────────────────────────┐   │
│  │  Transport Layer                             │   │
│  │  ├── StdioServerTransport（本地模式）     │   │
│  │  └── StreamableHTTPServerTransport        │   │
│  │      （远程模式，HTTP 触发器）             │   │
│  │                                              │   │
│  │  Tools Layer                              │   │
│  │  └── party_search_nearby                 │   │
│  └────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────┘
                     │  云间调用（callFunction）
                     ▼
┌─────────────────────────────────────────────────────┐
│           hiito 环境（生产）                        │
│           environment: nut-4gpjbl8q5edaad32        │
│                                                     │
│  ┌────────────────────────────────────────────┐   │
│  │  discover 云函数                           │   │
│  │  - 路由：queryNearby                      │   │
│  │  - 功能：地理位置查询（geoNear）           │   │
│  └────────────────────────────────────────────┘   │
│                                                     │
│  ┌────────────────────────────────────────────┐   │
│  │  数据库集合                                │   │
│  │  - party_sessions（派对数据）             │   │
│  │  - organizer_bios（主办方资料）           │   │
│  └────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### 技术栈

| 组件 | 技术栈 |
|------|----------|
| **协议标准** | Model Context Protocol (MCP) 1.0 |
| **传输模式** | stdio / Streamable HTTP |
| **运行环境** | Node.js 18+ / CloudBase 云函数 |
| **MCP SDK** | `@modelcontextprotocol/sdk` |
| **云开发 SDK** | `@cloudbase/node-sdk` |
| **小程序平台** | 微信小程序（AppID: wx25b365a4b50a0958） |
| **构建工具** | TypeScript + Docker |

---

## 📁 项目结构

```
MCP-Server/
├── src/                        # 源代码
│   ├── index.ts               # MCP Server 入口
│   ├── tools/                 # Tool 定义
│   │   ├── party_tools.ts     # 派对搜索工具
│   │   └── formatters.ts     # 响应格式化
│   ├── schemas/               # 参数校验 Schema
│   │   └── index.ts          # Schema 导出
│   ├── services/              # 后端服务
│   │   └── cloudbase.ts      # CloudBase 云函数调用
│   ├── utils/                 # 工具函数
│   │   └── errors.ts         # 错误处理
│   └── types.ts              # TypeScript 类型定义
├── dist/                       # 编译输出（git ignore）
├── functions/                  # CloudBase 云函数配置
├── Dockerfile                  # 容器化配置
├── .env.example               # 环境变量模板
├── package.json               # 项目配置
├── tsconfig.json              # TypeScript 配置
└── README.md                 # 项目文档
```

---

## 🔒 安全特性

- **认证中间件**: HTTP 端点支持 Bearer Token 认证（`MCP_AUTH_TOKEN`），生产环境推荐配置
- **速率限制**: 15 分钟窗口内每 IP 最多 100 次请求（express-rate-limit）
- **安全头**: Helmet 中间件自动添加安全响应头
- **CORS**: 可配置的跨域策略（`CORS_ORIGINS`）
- **健康检查**: `/health` 端点不泄露任何敏感配置信息
- **会话管理**: 自动清理过期 MCP 会话，防止内存泄漏

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

### v3.0 (2026-05-09)

> **简化架构**：只保留核心搜索功能

- ✅ 只保留 `party_search_nearby` 工具（搜索附近派对）
- ✅ 移除已废弃工具：`generate_deep_link`、`get_party_detail`、`find_parties`、`find_organizer`
- ✅ 简化代码结构：所有工具定义集中在 `party_tools.ts`
- ✅ 传输层支持：StdioServerTransport + StreamableHTTPServerTransport
- ✅ 数据源：通过 `discover` 云函数 `queryNearby` 路由查询

### v1.0.0 (2026-05-07)

- ✅ 初始版本发布
- ✅ 支持 6 个 MCP 工具
- ✅ 支持 stdio、HTTP、SSE 三种传输模式
- ✅ 支持 Docker 容器化部署
- ✅ 集成 CloudBase 云开发

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
