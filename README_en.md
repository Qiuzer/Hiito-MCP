# Hiito MCP Server

[![npm version](https://badge.fury.io/js/hiito-mcp-server.svg)](https://www.npmjs.com/package/hiito-mcp-server)
[![GitHub stars](https://img.shields.io/github/stars/Qiuzer/Hiito-MCP.svg)](https://github.com/Qiuzer/Hiito-MCP)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A **Model Context Protocol (MCP)** server for the 「Luomachewei Party」 WeChat Mini Program.

🌐 Enables AI assistants (Claude Desktop, Cursor, etc.) to search for nearby parties, get party details, and generate mini program share links.

---

## ✨ Features

### 🔍 Party Search
- **`party_search_nearby`** - Search for nearby parties by latitude, longitude, and radius
- **`party_list_upcoming`** - Get upcoming parties (sorted by time ascending)
- **`party_list_by_organizer`** - Query all parties hosted by a specific organizer

### 📋 Party Details
- **`party_get_detail`** - Get complete party information (time, location, organizer, attendee count, etc.)

### 🔗 Deep Link Generation
- **`party_generate_deep_link`** - Generate short links to open the mini program (URL Scheme / URL Link), supporting both WeChat and browser access

### 👤 Organizer Information
- **`organizer_get_info`** - Get complete organizer profile (name, bio, verification status, statistics)

---

## 🚀 Quick Start

### Option 1: Local Development (stdio mode)

```bash
# Clone the repository
git clone git@github.com:Qiuzer/Hiito-MCP.git
cd Hiito-MCP

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env file with your actual configuration

# Build TypeScript
npm run build

# Start service (stdio mode)
TRANSPORT_MODE=stdio npm start
```

---

### Option 2: HTTP Server Mode

```bash
# After configuring environment variables
TRANSPORT_MODE=http npm start

# Service runs at http://localhost:8080
# Health check: http://localhost:8080/health
# MCP endpoint: http://localhost:8080/mcp
```

---

## 📦 Deployment

### Deploy to CloudBase Cloud Hosting

1. Visit [CloudBase Console](https://console.cloud.tencent.com/tcb)
2. Select your environment
3. Go to **Cloud Hosting** → **Services**
4. Click **Create Service**
5. Select **Deploy from Git Repository**
6. Connect to GitHub repository `Qiuzer/Hiito-MCP`
7. Configure environment variables (see `.env.example`)
8. Click **Deploy Now**

For detailed steps, see 👉 [CLOUDBASE_DEPLOYMENT.md](CLOUDBASE_DEPLOYMENT.md)

---

## 🔧 Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `WECHAT_APP_ID` | ✅ | WeChat Mini Program AppID |
| `CLOUD_ENV_ID` | ✅ | CloudBase Source Environment ID |
| `TARGET_ENV_ID` | ✅ | CloudBase Target Environment ID |
| `MCP_AUTH_TOKEN` | 🔒 | MCP Auth Token (recommended for HTTP mode) |
| `TRANSPORT_MODE` | ❌ | Transport mode: `stdio` or `http` (default: `stdio`) |
| `PORT` | ❌ | HTTP mode listening port (default: `8080`) |
| `CHARACTER_LIMIT` | ❌ | Response character limit (default: `25000`) |

See `.env.example` for complete configuration details.

---

## 🎯 Use Cases

### 1. AI Assistant Queries Nearby Parties
```
User: "What's happening nearby?"
AI: Calls party_search_nearby tool, returns nearby party list
```

### 2. Auto-generate Party Share Links
```
User: "Generate a share link for this party"
AI: Calls party_generate_deep_link tool, returns mini program link
```

### 3. Smart Recommendations for Upcoming Parties
```
User: "Any party recommendations this week?"
AI: Calls party_list_upcoming tool, returns upcoming party list
```

### 4. Organizer Credibility Assessment
```
User: "Is this organizer reliable?"
AI: Calls organizer_get_info tool, returns organizer details
```

---

## 🔌 Integration with Claude Desktop

Edit Claude Desktop configuration file:

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

After restarting Claude Desktop, you can use Hiito tools.

---

## ☁️ Deploy to Tencent Cloud MCP Square

### Option 1: Cloud Hosting Deployment (Recommended for MCP Square)

1. Visit [Tencent Cloud MCP Square](https://cloud.tencent.com/developer/mcp)
2. Click **"I'm an MCP Developer"** → **"Publish MCP"**
3. Select environment variable deployment method
4. Fill in the following configuration:

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

5. Submit for review

For detailed documentation, see 👉 [MCP_SQUARE_DEPLOYMENT.md](MCP_SQUARE_DEPLOYMENT.md)

### Option 2: Manual Cloud Hosting Deployment

1. Visit [CloudBase Console](https://console.cloud.tencent.com/tcb)
2. Select environment → **Cloud Hosting** → **Services**
3. Click **Create Service**
4. Select **Deploy from Git Repository**
5. Connect to GitHub repository `Qiuzer/Hiito-MCP`
6. Configure environment variables (see `.env.example`)
7. Click **Deploy Now**

### Option 3: Cloud Function Deployment (Existing)

See 👉 [CLOUDBASE_DEPLOYMENT.md](CLOUDBASE_DEPLOYMENT.md)

---

## 🏗️ Architecture

| Component | Technology |
|-----------|------------|
| **Protocol** | Model Context Protocol (MCP) 1.0 |
| **Transport** | stdio / HTTP (dual mode) |
| **Runtime** | Node.js 18+ / CloudRun (containerized) |
| **Database** | CloudBase (Tencent Cloud Base) |
| **Mini Program** | WeChat Mini Program |
| **Build Tools** | TypeScript + Docker |

---

## 📁 Project Structure

```
Hiito-MCP/
├── src/                        # Source code
│   ├── index.ts               # Main entry
│   ├── tools/                 # MCP tool definitions
│   │   ├── party_tools.ts            # Party-related tools
│   │   └── link_and_organizer_tools.ts  # Link and organizer tools
│   ├── services/              # Backend services
│   │   └── cloudbase.ts             # CloudBase database queries
│   └── utils/                # Utility functions
│       └── validators.ts             # Parameter validation
├── dist/                       # Build output (git ignore)
├── Dockerfile                  # Container configuration
├── .env.example               # Environment variable template
├── package.json               # Project configuration
├── tsconfig.json              # TypeScript configuration
└── README.md                 # Project documentation
```

---

## 🧪 Testing

### Test HTTP Mode Locally

```bash
# Start service
TRANSPORT_MODE=http npm start

# Health check
curl http://localhost:8080/health

# Expected response:
# {
#   "status": "ok",
#   "service": "hiito-mcp-server",
#   "version": "1.0.0",
#   "config": {...}
# }
```

### Test MCP Endpoint

Use [MCP Inspector](https://github.com/modelcontextprotocol/inspector):

```bash
npx @modelcontextprotocol/inspector
```

Then connect to `http://localhost:8080/mcp`

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 Changelog

### v1.0.0 (2026-05-07)

- ✅ Initial release
- ✅ Support for 6 MCP tools
- ✅ Dual transport mode (stdio and HTTP)
- ✅ Docker containerization support
- ✅ CloudBase integration

---

## 📄 License

[MIT License](LICENSE)

---

## 🔗 Links

- **WeChat Mini Program**: Luomachewei Party (Search "Hiito" or "螺母车尾派对")
- **MCP Protocol Docs**: https://modelcontextprotocol.io/
- **CloudBase Docs**: https://docs.cloudbase.net/
- **Issue Tracker**: https://github.com/Qiuzer/Hiito-MCP/issues

---

## ⭐ Star History

If this project helps you, please give it a Star ⭐️!

[![Star History Chart](https://api.star-history.com/svg?repos=Qiuzer/Hiito-MCP&type=Date)](https://star-history.com/#Qiuzer/Hiito-MCP&Date)

---

**Made with ❤️ by [Churze](https://github.com/Qiuzer)**
