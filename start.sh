#!/bin/bash
echo 正在安装 Playwright...
npm install playwright

echo 正在安装 Chromium...
npm exec playwright install chromium


echo 安装依赖包
npm install

# 运行 Node.js 应用程序
node server.js

echo "按 Enter 键退出..."
read