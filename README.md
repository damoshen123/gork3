---
title: Genspark AI Proxy
emoji: 🤖
colorFrom: blue
colorTo: green
sdk: docker
sdk_version: "latest"
app_port: 3333
pinned: false
---

# Genspark AI Proxy

这是一个使用Playwright和Node.js构建的Genspark AI代理服务。该服务在Docker容器中运行，使用虚拟显示来支持浏览器自动化。

## 功能

- 代理Genspark AI的API请求
- 使用Playwright自动化浏览器交互
- 支持流式响应处理

## 技术栈

- Node.js
- Playwright
- Docker
- Xvfb (用于虚拟显示)

## 部署

该应用程序已配置为在Hugging Face Spaces上使用Docker部署。

## 本地运行

```bash
docker build -t genspark-proxy .
docker run -p 3333:3333 genspark-proxy
投喂咖啡
如果对你有帮助，感谢投喂咖啡  
https://afdian.com/a/cqgnyy
