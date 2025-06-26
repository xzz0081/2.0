# 钱包管理系统 - Docker 部署指南

## 概述

本项目提供了完整的 Docker 化解决方案，支持快速部署和运行钱包管理系统前端。

## 系统要求

- Docker 20.10+
- Docker Compose 2.0+
- 至少 2GB 可用内存
- 至少 1GB 可用磁盘空间

## 快速开始

### 方法一：使用 Docker Compose（推荐）

```bash
# 构建并启动服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

### 方法二：使用 Docker 命令

```bash
# 构建镜像
docker build -t wallet-admin-frontend:latest .

# 运行容器
docker run -d -p 3000:80 --name wallet-admin-frontend wallet-admin-frontend:latest

# 查看容器状态
docker ps

# 查看日志
docker logs wallet-admin-frontend

# 停止容器
docker stop wallet-admin-frontend

# 删除容器
docker rm wallet-admin-frontend
```

## 访问应用

启动成功后，在浏览器中访问：

- **前端应用**: http://localhost:3000
- **登录页面**: http://localhost:3000/login

## 配置说明

### 环境变量

- `NODE_ENV`: 运行环境（production）
- `API_BASE_URL`: 后端API地址（默认：http://host.docker.internal:8080）

### 端口映射

- 容器内部端口：80 (Nginx)
- 主机端口：3000

### 网络配置

- 网络名称：wallet-network
- 驱动类型：bridge
- API代理：自动代理 `/api/*` 请求到后端服务

## 镜像信息

### 基础镜像

- **构建阶段**: node:18-alpine
- **运行阶段**: nginx:alpine

### 镜像大小

- 最终镜像大小：约 50MB
- 多阶段构建优化，仅包含生产必需文件

### 安全特性

- 非root用户运行
- 最小化攻击面
- 静态文件服务
- Gzip压缩启用

## 故障排除

### 常见问题

1. **端口冲突**
   ```bash
   # 检查端口占用
   netstat -an | findstr :3000
   
   # 使用其他端口
   docker run -d -p 8080:80 --name wallet-admin-frontend wallet-admin-frontend:latest
   ```

2. **构建失败**
   ```bash
   # 清理Docker缓存
   docker system prune -a
   
   # 重新构建
   docker build --no-cache -t wallet-admin-frontend:latest .
   ```

3. **容器无法启动**
   ```bash
   # 查看详细日志
   docker logs wallet-admin-frontend
   
   # 检查容器状态
   docker inspect wallet-admin-frontend
   ```

### 性能优化

1. **启用缓存**
   - 静态资源缓存：1年
   - Gzip压缩：已启用

2. **资源限制**
   ```yaml
   # 在 docker-compose.yml 中添加
   deploy:
     resources:
       limits:
         memory: 512M
         cpus: '0.5'
   ```

## 开发模式

如需开发模式运行：

```bash
# 使用开发服务器
docker run -d -p 5173:5173 -v $(pwd):/app node:18-alpine sh -c "cd /app && npm install && npm run dev -- --host"
```

## 生产部署建议

1. **使用反向代理**
   - 配置 Nginx 或 Apache 作为反向代理
   - 启用 HTTPS
   - 配置负载均衡

2. **监控和日志**
   - 集成日志收集系统
   - 配置健康检查
   - 设置监控告警

3. **备份策略**
   - 定期备份配置文件
   - 镜像版本管理
   - 数据持久化

## 技术栈

- **前端框架**: React 18 + TypeScript
- **构建工具**: Vite
- **UI组件**: Ant Design
- **状态管理**: Zustand
- **HTTP客户端**: Axios
- **Web服务器**: Nginx Alpine

## 支持

如遇问题，请检查：
1. Docker 版本兼容性
2. 端口占用情况
3. 网络连接状态
4. 后端服务可用性
