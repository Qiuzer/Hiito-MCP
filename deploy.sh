#!/bin/bash
# =============================================================================
# Hiito MCP Server - 一键部署脚本
# 支持云函数、云托管和开源库发布
# =============================================================================

set -e  # 遇到错误立即退出

# 加载 .env 文件（如果存在）
if [ -f "$(dirname "${BASH_SOURCE[0]}")/.env" ]; then
    echo "📦 加载 .env 环境变量..."
    set -a
    source "$(dirname "${BASH_SOURCE[0]}")/.env"
    set +a
fi

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目路径
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FUNCTIONS_DIR="$PROJECT_ROOT/functions/hiito-mcp-server"

# =============================================================================
# 函数定义
# =============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 显示帮助信息
show_help() {
    cat << EOF
Hiito MCP Server 部署脚本

用法: ./deploy.sh [选项]

选项:
    -a, --all           部署所有目标（云函数 + 云托管）[默认]
    -f, --function      仅部署云函数
    -c, --container     仅部署云托管
    -p, --package       发布开源库到 npm/GitHub
    -b, --build         仅构建，不部署
    -h, --help          显示帮助信息

示例:
    ./deploy.sh                    # 部署所有
    ./deploy.sh -f                 # 仅部署云函数
    ./deploy.sh -c                 # 仅部署云托管
    ./deploy.sh -a -p             # 部署所有 + 发布 npm 包

环境变量:
    TCB_ENV_ID        云开发环境 ID（必需）
    WECHAT_APP_ID     微信小程序 AppID

EOF
}

# 检查环境
check_environment() {
    log_info "检查部署环境..."

    # 检查 Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js 未安装"
        exit 1
    fi
    log_success "Node.js $(node -v)"

    # 检查 npm
    if ! command -v npm &> /dev/null; then
        log_error "npm 未安装"
        exit 1
    fi
    log_success "npm $(npm -v)"

    # 检查 tcb CLI
    if ! command -v tcb &> /dev/null; then
        log_warn "tcb CLI 未安装，尝试使用 npx..."
        export TCB_CMD="npx @cloudbase/cli"
    else
        export TCB_CMD="tcb"
    fi
    log_success "CloudBase CLI 就绪"
}

# 构建项目
build_project() {
    log_info "构建 TypeScript 项目..."
    cd "$PROJECT_ROOT"

    # 安装依赖
    if [ ! -d "node_modules" ]; then
        log_info "安装依赖..."
        npm install
    fi

    # 编译 TypeScript
    npm run build
    log_success "构建完成"
}

# 同步到云函数目录
sync_to_function() {
    log_info "同步代码到云函数目录..."

    # 复制构建产物
    cp -r "$PROJECT_ROOT/dist" "$FUNCTIONS_DIR/"

    # 复制 package.json（不含开发依赖）
    cd "$PROJECT_ROOT"
    npm install --production --prefix "$FUNCTIONS_DIR"

    # 复制 bootstrap 脚本
    cp "$PROJECT_ROOT/scf_bootstrap" "$FUNCTIONS_DIR/"

    log_success "云函数目录已更新"
}

# 部署云函数
deploy_function() {
    log_info "部署云函数..."
    cd "$PROJECT_ROOT"

    # 检查 cloudbaserc.json
    if [ ! -f "cloudbaserc.json" ]; then
        log_error "cloudbaserc.json 不存在，请检查配置"
        exit 1
    fi

    # 部署云函数
    $TCB_CMD fn deploy hiito-mcp-server
    log_success "云函数部署完成"
}

# 部署云托管
deploy_container() {
    log_info "部署云托管..."
    cd "$PROJECT_ROOT"

    # 检查 Dockerfile
    if [ ! -f "Dockerfile" ]; then
        log_error "Dockerfile 不存在"
        exit 1
    fi

    # 部署容器服务（使用 tcb cloudrun deploy 命令）
    $TCB_CMD cloudrun deploy -s hiito-mcp-server --source . -e "$CLOUD_ENV_ID" --force
    log_success "云托管部署完成"
}

# 发布开源库
publish_package() {
    log_info "发布开源库..."
    cd "$PROJECT_ROOT"

    # 构建
    npm run build

    # 交互式发布（支持 npm publish 或 GitHub Release）
    read -p "请选择发布方式 (1: npm, 2: GitHub Release, 3: 两者): " -n 1 -r
    echo

    case $REPLY in
        1|"")
            npm publish
            log_success "已发布到 npm"
            ;;
        2)
            # 使用 GitHub CLI 或手动创建 Release
            if command -v gh &> /dev/null; then
                gh release create "v$(node -p "require('./package.json').version")" \
                    --generate-notes
                log_success "已创建 GitHub Release"
            else
                log_warn "请手动创建 GitHub Release"
            fi
            ;;
        3)
            npm publish
            if command -v gh &> /dev/null; then
                gh release create "v$(node -p "require('./package.json').version")" \
                    --generate-notes
            fi
            log_success "已完成 npm 和 GitHub 发布"
            ;;
        *)
            log_error "无效选项"
            exit 1
            ;;
    esac
}

# =============================================================================
# 主流程
# =============================================================================

# 解析参数
DEPLOY_ALL=true
DEPLOY_FUNCTION=false
DEPLOY_CONTAINER=false
PUBLISH_PACKAGE=false
ONLY_BUILD=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -a|--all)
            DEPLOY_ALL=true
            DEPLOY_FUNCTION=true
            DEPLOY_CONTAINER=true
            shift
            ;;
        -f|--function)
            DEPLOY_FUNCTION=true
            DEPLOY_ALL=false
            shift
            ;;
        -c|--container)
            DEPLOY_CONTAINER=true
            DEPLOY_ALL=false
            shift
            ;;
        -p|--package)
            PUBLISH_PACKAGE=true
            shift
            ;;
        -b|--build)
            ONLY_BUILD=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            log_error "未知选项: $1"
            show_help
            exit 1
            ;;
    esac
done

# 显示横幅
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║          Hiito MCP Server 部署脚本                          ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# 检查环境
check_environment

# 构建项目（始终执行）
build_project

# 根据参数决定部署目标
if $ONLY_BUILD; then
    log_success "仅构建完成，未执行部署"
    exit 0
fi

# 同步到云函数目录（如果需要部署云函数）
if $DEPLOY_FUNCTION || $DEPLOY_ALL; then
    sync_to_function
fi

# 部署云函数
if $DEPLOY_FUNCTION || $DEPLOY_ALL; then
    deploy_function
fi

# 部署云托管
if $DEPLOY_CONTAINER || $DEPLOY_ALL; then
    deploy_container
fi

# 发布开源库
if $PUBLISH_PACKAGE; then
    publish_package
fi

# 完成
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                    部署完成！                              ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
