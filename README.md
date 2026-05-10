# 螺母车尾派对 MCP Server

[![npm version](https://badge.fury.io/js/hiito-mcp-server.svg)](https://www.npmjs.com/package/hiito-mcp-server)
[![GitHub stars](https://img.shields.io/github/stars/Qiuzer/Hiito-MCP.svg)](https://github.com/Qiuzer/Hiito-MCP)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

让 AI 助手帮你发现附近的车尾派对活动。

> **MCP (Model Context Protocol)** 服务器，为 Claude Desktop、Cursor、Cline 等 AI 客户端提供查询螺母车尾派对的能力。

---

## 🎯 一分钟使用

### 推荐：腾讯云 MCP 广场一键开通

1. 访问 [腾讯云 MCP 广场](https://cloud.tencent.com/developer/mcp)
2. 搜索 **"螺母车尾派对"** 或 **"Hiito"**
3. 一键开通，无需配置

开通后，在任意支持 MCP 的 AI 客户端中即可使用。

> **为什么推荐 MCP 广场？** 本项目依赖腾讯云 CloudBase 专有环境与密钥，本地运行需要对应环境的访问权限。MCP 广场已部署完整的云托管服务，用户无需关心底层配置。

### 本地开发

如果你有自己的腾讯云 CloudBase 环境，可以基于本源码开发自己的 MCP Server：

```bash
git clone https://github.com/Qiuzer/Hiito-MCP.git
cd Hiito-MCP
npm install

# 配置你自己的环境变量
cp .env.example .env
# 编辑 .env，填入你自己的腾讯云环境 ID 和密钥

npm run build
npm start
```

> **注意**：使用你自己的密钥只能访问你自己环境的数据，无法访问 Hiito 的派对数据。这是腾讯云 IAM 鉴权的保护机制。

---

## ✨ 功能

### 🔍 `party_search_nearby` — 搜索附近派对

根据经纬度和搜索半径，查找附近的派对活动，返回派对名称、地点、距离等信息。

**参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `latitude` | number | ✅ | 纬度，-90 ~ 90 |
| `longitude` | number | ✅ | 经度，-180 ~ 180 |
| `radius` | number | ❌ | 搜索半径（米），默认 5000，最大 50000 |
| `limit` | number | ❌ | 返回数量，默认 20，最大 50 |
| `offset` | number | ❌ | 分页偏移，默认 0 |

**示例对话：**

```
用户: "附近有什么派对？"
AI: 调用 party_search_nearby（需要用户授权位置）

用户: "上海外滩附近有什么车尾派对？"
AI: 调用 party_search_nearby（latitude=31.2304, longitude=121.4737）
```

**返回格式：**

```markdown
## 🎉 附近派对活动

### 周末复古市集派对
- 📍 **地点**: 上海市黄浦区外滩XX号
- 📏 **距离**: 1200m
- 🕐 **时间**: 2026/05/15 14:00

---
```

---

## 🔌 接入 AI 客户端

### 方式一：直接配置（推荐）

支持 HTTP + SSE 传输模式的 AI 客户端，直接复制以下配置即可使用，**无需鉴权**：

```json
{
  "mcpServers": {
    "hiito": {
      "type": "http",
      "url": "https://hiito-mcp-server-254685-6-1375170188.sh.run.tcloudbase.com/mcp"
    }
  }
}
```

**支持的客户端：**
- Claude Desktop（新版支持 HTTP 模式）
- Cursor
- Cline
- 其他支持 MCP HTTP 传输的客户端

### 方式二：腾讯云 MCP 广场

访问 [腾讯云 MCP 广场](https://cloud.tencent.com/developer/mcp) 搜索 **"螺母车尾派对"** 一键开通。

### 本地开发模式

如需本地调试，使用 stdio 模式：

```json
{
  "mcpServers": {
    "hiito": {
      "command": "node",
      "args": ["/path/to/Hiito-MCP/dist/index.js"]
    }
  }
}
```

---

## 🔒 安全说明

### 为什么开源？

本项目源码开放的核心目的是**透明可审计**：

- 用户可以验证 MCP Server 只做**只读查询**，不会写入、修改或删除任何数据
- 用户可以确认没有收集或上传任何个人隐私信息
- 社区可以帮助发现和修复安全问题

### 数据安全保障

| 安全层 | 机制 |
|--------|------|
| **传输层** | HTTPS 加密传输 |
| **应用层** | 云函数白名单（仅允许调用 `post`） |
| **数据层** | 只读操作，`readOnlyHint: true` |
| **防护层** | 速率限制（15 分钟 / 100 次 / IP） |

### 服务安全

本服务部署在腾讯云 CloudBase 云托管环境：

- **只读服务**：仅提供派对查询功能，不写入、不修改、不删除任何数据
- **数据隔离**：通过腾讯云 IAM 确保不同环境间的数据隔离
- **环境变量**：密钥通过 CloudBase 环境变量管理，源码中不包含任何敏感信息

---

## 🏗️ 技术架构

```
┌───────────────────────────────────┐
│        AI 客户端                    │
│  (Claude / Cursor / Cline / ...)  │
└──────────────┬────────────────────┘
               │ MCP Protocol (JSON-RPC 2.0)
               ▼
┌───────────────────────────────────┐
│     MCP Server（云托管）            │
│                                   │
│  ┌─────────────────────────────┐ │
│  │  Transport                   │ │
│  │  ├── Stdio（本地模式）       │ │
│  │  └── Streamable HTTP（远程） │ │
│  │                              │ │
│  │  Tools                       │ │
│  │  └── party_search_nearby    │ │
│  └─────────────────────────────┘ │
└──────────────┬────────────────────┘
               │ 云间调用（callFunction）
               │ 腾讯云 IAM 鉴权
               ▼
┌───────────────────────────────────┐
│     Hiito 生产环境                  │
│                                   │
│  ┌─────────────────────────────┐ │
│  │  云函数（查询路由）           │ │
│  │  └── 地理位置查询（geoNear） │ │
│  └─────────────────────────────┘ │
│                                   │
│  ┌─────────────────────────────┐ │
│  │  数据库                      │ │
│  │  ├── party_sessions         │ │
│  │  └── organizer_bios         │ │
│  └─────────────────────────────┘ │
└───────────────────────────────────┘
```

### 技术栈

| 组件 | 技术 |
|------|------|
| 协议标准 | Model Context Protocol (MCP) 1.0 |
| 传输模式 | HTTP + SSE / stdio |
| 运行环境 | Node.js 18+ / CloudBase 云托管 |
| MCP SDK | `@modelcontextprotocol/sdk` |
| 云开发 SDK | `@cloudbase/node-sdk` |
| 构建工具 | TypeScript |

---

## 📁 项目结构

```
MCP-Server/
├── src/                          # 源代码
│   ├── index.ts                 # MCP Server 入口
│   ├── types.ts                 # TypeScript 类型定义
│   ├── tools/
│   │   ├── party_tools.ts      # 派对搜索工具
│   │   └── formatters.ts       # 响应格式化
│   ├── schemas/
│   │   └── index.ts            # Zod 参数校验 Schema
│   ├── services/
│   │   └── cloudbase.ts        # CloudBase 云函数调用
│   └── utils/
│       └── errors.ts            # 错误处理
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

---

## 🧪 测试

```bash
# 单元测试
npm test

# 使用 MCP Inspector 交互式调试
npx @modelcontextprotocol/inspector
```

---

## 📄 许可证

[MIT License](LICENSE) — 你可以自由使用本源码作为模板开发自己的 MCP Server，但无法通过本源码访问 Hiito 的数据。

---

## 🔗 相关链接

- **微信小程序**: 搜索 "螺母车尾派对" 或 "Hiito"
- **MCP 协议文档**: https://modelcontextprotocol.io/
- **CloudBase 文档**: https://docs.cloudbase.net/
- **问题反馈**: https://github.com/Qiuzer/Hiito-MCP/issues

---

## ⭐ Star History

如果这个项目对您有帮助，请给个 Star ⭐️！

[![Star History Chart](https://api.star-history.com/svg?repos=Qiuzer/Hiito-MCP&type=Date)](https://star-history.com/#Qiuzer/Hiito-MCP&Date)

---

**Made with ❤️ by [Churze](https://github.com/Qiuzer)**
