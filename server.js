import express from 'express';
import http, { get } from 'http';
import https from 'https';
import path from "path";
import { fileURLToPath } from "url";
import cors from 'cors';
import fs from 'fs';
import fsPromises from 'fs/promises';
import os from 'os';
import { createRequire } from 'module';
import EventSource from'eventsource';
import HttpsProxyAgent from 'https-proxy-agent';
import axios from 'axios';
import si from 'systeminformation';
import crypto from 'crypto';
import { chromium } from '@playwright/test';
import { Readable } from 'stream';
import { createServer } from 'http';
//版本号
const banbenhao = "1.4";

class MemoryMonitor {
    constructor(page) {
        this.page = page;
        this.warningThreshold = 200 * 1024 * 1024;  // 400MB 警告阈值
        this.criticalThreshold = 400 * 1024 * 1024; // 500MB 临界阈值
    }

    async checkMemory() {
        try {
            const metrics = await this.page.evaluate(() => {
                if (!performance.memory) return null;
                return {
                    usedJSHeapSize: performance.memory.usedJSHeapSize,
                    totalJSHeapSize: performance.memory.totalJSHeapSize,
                    jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
                };
            });

            if (!metrics) {
                console.log('Memory metrics not available');
                return null;
            }

            // 转换为MB便于阅读
            const usedMB = Math.round(metrics.usedJSHeapSize / (1024 * 1024));
            const totalMB = Math.round(metrics.totalJSHeapSize / (1024 * 1024));
            const limitMB = Math.round(metrics.jsHeapSizeLimit / (1024 * 1024));

            console.log(`Memory Usage: ${usedMB}MB / ${totalMB}MB (Limit: ${limitMB}MB)`);

            // 内存使用超过警告阈值
            if (metrics.usedJSHeapSize > this.warningThreshold) {
                console.warn('High memory usage detected!');
                await this.optimizeMemory();
            }

            // 内存使用超过临界值
            if (metrics.usedJSHeapSize > this.criticalThreshold) {
                console.error('Critical memory usage! Forcing garbage collection...');
                await this.forceGC();
            }

            return metrics;
        } catch (error) {
            console.error('Error checking memory:', error);
            return null;
        }
    }

    async optimizeMemory() {
        try {
            await this.page.evaluate(() => {
                // 清除控制台
                console.clear();
                
                // 清除未使用的图片
                const images = document.getElementsByTagName('img');
                for (let img of images) {
                    if (!img.isConnected) {
                        img.src = '';
                    }
                }

                // 清除未使用的变量
                if (window.gc) {
                    window.gc();
                }
            });
        } catch (error) {
            console.error('Error optimizing memory:', error);
        }
    }

    async forceGC() {
        try {
            await this.page.evaluate(() => {
                if (window.gc) {
                    window.gc();
                }
            });
        } catch (error) {
            console.error('Error forcing GC:', error);
        }
    }
}

async function setupMemoryMonitoring(page) {
    const monitor = new MemoryMonitor(page);
    
    // 定期检查内存（每5分钟）
    setInterval(async () => {
        await monitor.checkMemory();
    }, 1 * 60 * 1000);

    // 返回monitor实例以便手动调用
    return monitor;
}

// 初始化监控
let memoryMonitor;
// 初始化监控
let memoryMonitor2;
// 使用 createRequire 来导入 JSON 文件

const require = createRequire(import.meta.url);
const cookiesjson = require('./cookies.json');

const config = require('./config.json');
const app = express();
const server = http.createServer(app);
let requestId = null;
let resssss = null;
let Aborted=false;
let Message;
let userId;
// 设置本地代理
const proxyUrl = config.proxyUrl;
const proxyAgent = config.proxy ? new HttpsProxyAgent(proxyUrl) : null;


const EventEmitter = require('events');
const URL = require('url').URL;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));






let browser = null;
let page = null;
let customEventSource;
let  isRestarting;
let  rrreeeqqq;
let reqmessage="";
let isstream=false;
let nowcookie="";
let nowcount=0;
let nowfilename="";
let One=true;
let cookiesCount=0;

// 存储cookie状态的Map
let cookieStatusMap = new Map();
// Worker 的基础 URL
// const baseUrl = 'https://tongji2.damoshen2.workers.dev';

// const baseUrl2 = 'https://you.com';
// // 创建 axios 实例
// const axiosInstance = axios.create({
//   baseURL: baseUrl,
//   httpsAgent: proxyAgent
// });
// 全局捕获未处理的 Promise 异常
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // 可以选择不退出程序
  // process.exit(1);
});

// 全局捕获未处理的同步异常
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // 可以选择优雅地处理错误
  // process.exit(1);
});
function updateCookiesJson(key, value) {
    // 修改内存中的对象
    console.log(key,cookiesjson[key]);
    cookiesjson[key].count = value;
    
    // 如果更新失败，标记该cookie为无效
    if (value === 0) {
        cookieStatusMap.set(key, false);
        console.log(`Cookie ${key} 已标记为无效`);
    }
  
    // 写入文件
    fs.writeFileSync(
        path.join(__dirname, 'cookies.json'), 
        JSON.stringify(cookiesjson, null, 2)
    );
}



function processFileContents(fileContents, cookiesjson) {
    // 初始化cookie状态（如果尚未初始化）
    if (cookieStatusMap.size === 0) {
        for (const [fileName] of Object.entries(fileContents)) {
            cookieStatusMap.set(fileName, true);
        }
    }

    // 检查是否所有cookie都失效
    let allInvalid = true;
    for (const isValid of cookieStatusMap.values()) {
        if (isValid) {
            allInvalid = false;
            break;
        }
    }

    // 如果所有cookie都失效，重置所有状态
    if (allInvalid) {
        console.log('所有cookie已失效，重置状态');
        for (const [fileName] of Object.entries(fileContents)) {
            cookieStatusMap.set(fileName, true);
        }
        cookiesCount = 0; // 重置计数器
    }

    if(cookiesCount >= fileContents.length) {
        cookiesCount = 0;
    }

    // 查找下一个有效的cookie
    let originalCount = cookiesCount;
    let validCookie = null;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    
    do {
        const entries = Object.entries(fileContents);
        const currentEntry = entries[cookiesCount];
        
        if (currentEntry && cookieStatusMap.get(currentEntry[0])) {
            const [fileName, content] = currentEntry;
            
            // 检查cookie是否存在于cookiesjson中
            if (!cookiesjson[content.fileName]) {
                cookiesjson[content.fileName] = {
                    timestamp: currentTimestamp,
                    count: 0
                };
                validCookie = content;
                nowfilename = content.fileName;
                nowcount = 0;
                break;
            } else {
                const fileRecord = cookiesjson[content.fileName];
                const timeDiff = currentTimestamp - fileRecord.timestamp;
                
                // 检查使用次数和时间限制
                if (fileRecord.count < config.Hours24 || config.pro) {
                    if (timeDiff > 7200) {
                        fileRecord.count = 0;
                        fileRecord.timestamp = currentTimestamp;
                        updateCookiesJson(content.fileName, 0);
                    }
                    validCookie = content;
                    nowfilename = content.fileName;
                    nowcount = fileRecord.count;
                    break;
                } else if (timeDiff > 7200) {
                    fileRecord.count = 0;
                    fileRecord.timestamp = currentTimestamp;
                    validCookie = content;
                    nowfilename = content.fileName;
                    nowcount = 0;
                    break;
                }
            }
        }
        
        cookiesCount = (cookiesCount + 1) % entries.length;
    } while (cookiesCount !== originalCount);

    if (validCookie) {
        cookiesCount = (cookiesCount + 1) % Object.entries(fileContents).length;
    }

    return validCookie;
}

  


  function getCookiesFiles() {
    // 获取当前目录下的 cookies 文件夹路径
    const cookiesPath = path.join(__dirname, 'cookies');
  
    try {
      // 读取 cookies 文件夹下的所有文件
      const files = fs.readdirSync(cookiesPath);
  
      // 过滤出 txt 文件
      const txtFiles = files.filter(file => path.extname(file).toLowerCase() === '.txt');
  
      // 存储文件信息的数组
      const fileContents = [];
  
      // 遍历 txt 文件
      txtFiles.forEach(file => {
        const filePath = path.join(cookiesPath, file);
        
        // 读取文件内容
        const content = fs.readFileSync(filePath, 'utf-8');
  
        fileContents.push({
          fileName: file,
          content: content
        });
      });
      return fileContents;
    } catch (error) {
      console.error('读取 cookies 文件夹失败:', error);
      return [];
    }
  }



  function getSessionCookie(cookieString) {
    var sessionCookie = cookieString.split('; ').map(pair => {
        const [name, value] = pair.split('=');
        return { name, value, domain: '.x.com', path: '/' };
    });
    return sessionCookie;
}


  let fileContents=getCookiesFiles();
  
  fileContents.forEach(file => {
    try {
      getSessionCookie(file.content)
    } catch (error) {

      console.error('Error parsing cookies:', "cookies文件出错"+file.fileName);
      return;
    }
   
  })



  let  context="";


async function initializeBrowser() {
    try {
      let viewportSize = { width: 900, height: 700 }; // 可以根据需要调整这些值
      // 尝试找到可用的浏览器路径
 const possiblePaths = [
   '/ms-playwright/chromium-1046/chrome-linux/chrome',  // v1.46.1
   '/ms-playwright/chromium-1060/chrome-linux/chrome',  // 可能的其他版本
   '/ms-playwright/chromium-1080/chrome-linux/chrome',
   '/ms-playwright/chromium-1140/chrome-linux/chrome'   // v1.48.2
 ];
 let options={};
 if(config.channel=="chromium"&&config.wutou==true){

      options = {
       headless: config.headless,
       args: [
         '--no-sandbox', 
         '--disable-setuid-sandbox',
         '--disable-gpu',
         '--disable-dev-shm-usage',
         '--window-size=900,700',  // 设置窗口大小
         '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36',  // 使用常见用户代理
         '--disable-dev-shm-usage',
         '--js-flags="--max_old_space_size=4096"' ]

     };
    }else{
      options = {
        headless: config.wutou,
        channel: config.channel,
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox',
          '--disable-gpu',
          '--disable-dev-shm-usage',
          '--window-size=900,700',  // 设置窗口大小
          '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36',  // 使用常见用户代理
          '--disable-dev-shm-usage',
          '--js-flags="--max_old_space_size=4096"' ]
 
      };
    }

 
     let executablePath = null;
 for (const path of possiblePaths) {
   if (fs.existsSync(path)) {
     executablePath = path;
     console.log(`找到浏览器路径: ${path}`);
     break;
   }
 }
 if (executablePath) {
   options.executablePath = executablePath;
 }
  browser = await chromium.launch(options);

     //创建上下文
     context = await browser.newContext(
          {  viewport: { width: 900, height: 700 },
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36'
        }
             // userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
             // extraHTTPHeaders: {
             //     'sec-ch-ua': '"Chromium";v="130", "Google Chrome";v="130", "Not?A_Brand";v="99"',
             //     'sec-ch-ua-mobile': '?0',
             //     'sec-ch-ua-platform': '"Windows"'
             //   },
             //   bypassCSP: true
     
         );
     page = await context.newPage();
     // 初始化脚本
     // await context.addInitScript(() => {
     //     // 部分伪装，不完全移除
     //     Object.defineProperty(navigator, 'webdriver', {
     //     get: () => undefined  // 不返回 false，而是 undefined
     //     });

     //     // 模拟真实浏览器特征
     //     Object.defineProperty(navigator, 'plugins', {
     //     get: () => [
     //         { name: 'Chrome PDF Plugin' },
     //         { name: 'Chrome PDF Viewer' }
     //     ]
     //     });
     // });

     memoryMonitor = await setupMemoryMonitoring(page);

     // 设置cookie


     nowcookie=await processFileContents(fileContents,cookiesjson);
     if(!nowcookie){

         console.log("无cookie使用");
         return;
     }
     const sessionCookie=getSessionCookie(nowcookie.content)
    

     await context.addCookies(sessionCookie);

     await page.addInitScript(() => {
      // 在页面加载前就禁用 Service Worker
      if ('serviceWorker' in navigator) {
          Object.defineProperty(navigator, 'serviceWorker', {
              value: {
                  register: () => Promise.reject('Service Worker disabled'),
                  getRegistration: () => Promise.resolve(null)
              },
              writable: false
          });
      }
  });

        // let version =await getVersion();
        // console.log(version);

        // if(banbenhao == version){

        //     console.log("最新版本无需更新");

        // }else{

        //     console.log(`当前版本：${banbenhao},拥有新版本${version},请进行更新！`);
        // }
         // 设置路由处理器，在每个页面加载后注入脚本
        await context.route('**/*', async (route, request) => {
          // 继续原始请求
          await route.continue();
          
          // 如果是主文档（页面加载或刷新）
          if (request.resourceType() === 'document' && 
              request.url().includes('grok')) {
            console.log('检测到页面加载或刷新:', request.url());
            
            // 等待页面加载完成
            await page.waitForLoadState('domcontentloaded');
            
            // 重新注入我们的脚本
            await injectFetchInterceptor(page);
          }
        });

        // userId=await generateUniqueUserId();
        try {
        // 捕获网络错误
        page.on('requestfailed', (request) => {
            console.error('Failed Request:', request.url(), request.failure().errorText);
            });

       await page.goto('https://x.com/i/grok');
        console.log('Successfully opened x.com');
        let textarea=null;
        
        try {
          textarea = await page.getByPlaceholder('提出任何問題').first();
          await textarea.waitFor({ state: 'visible', timeout: 100 });
          console.log("登录成功");
          console.log('欢迎使用grok反代，成功启动！By从前跟你一样');

        } catch (error) {
          // 处理超时错误
          try {
            textarea = await page.getByPlaceholder('随便问点什么').first();
            await textarea.waitFor({ state: 'visible', timeout: 100 });
            console.log("登录成功");
            console.log('欢迎使用grok反代，成功启动！By从前跟你一样');
          } catch (error) {
          try {
            textarea = await page.getByPlaceholder('Ask anything').first();
            await textarea.waitFor({ state: 'visible', timeout: 100 });
            console.log("登录成功");
            console.log('欢迎使用grok反代，成功启动！By从前跟你一样');
          } catch (error) {
            // 处理超时错误
            console.log("登录失败");
            console.log('登录失败！！！By从前跟你一样');
            console.error('操作超时:', error);
          }
        }
      }

        // 检查是否成功登录
        // 检查是否成功登录
        // 
            // await page.waitForSelector('.sc-19bbc80a-2', { timeout: 20000 });
            // const isLoggedIn = await page.locator('.sc-19bbc80a-2').count() > 0;
            // console.log('Login status:', isLoggedIn);

         

            } catch (error) {
                console.log(error);
            }
      
        // await page.waitForTimeout(5000);
        // await context.addCookies(getSessionCookie(config.cookie2));
    } catch (error) {
        console.error('An error occurred during browser initialization:', error);
    }
}


// 注入 fetch 拦截器
async function injectFetchInterceptor(page) {
  console.log('注入 fetch 拦截器...');
  
  // 检查是否已经注入
  const alreadyInjected = await page.evaluate(() => {
    return window._fetchInterceptorInjected === true;
  }).catch(() => false);
  
  if (alreadyInjected) {
    console.log('拦截器已经注入，跳过');
    return;
  }
  
  // 设置拦截器来捕获 fetch 请求
  await page.evaluate(() => {
    console.log('设置 fetch 拦截器...');
    
    // 标记为已注入
    window._fetchInterceptorInjected = true;
    
    // 保存原始的 fetch 方法
    const originalFetch = window.fetch;
    
    // 覆盖 fetch 方法
    window.fetch = async function(...args) {
      const [resource, config] = args;

      console.log("resource",resource);
      console.log("typeof",typeof resource);
      console.log("config",config);
      
      // 检查是否是目标 URL
      if (resource.href.includes('/2/grok/add_response.json') && 
          config && config.method === 'POST') {
        console.log('拦截到 fetch 请求:', resource);
        console.log('拦截到 fetch 请求:', config.body);
        
        try {
          // 调用原始 fetch 并获取响应
          // const response = await originalFetch.apply(this, args);
                    // 为此请求创建 AbortController
                    const controller = new AbortController();
                    window._activeFetchController = controller;
                    let cog = JSON.parse(config.body);

                    cog.returnSearchResults=false;

                    config.body=JSON.stringify(cog);
                  // 将 signal 添加到请求配置中
                  console.log('修改后 fetch 请求:', config.body);
                  const newConfig = {
                    ...config,
                    signal: controller.signal
                  };
                  const response = await originalFetch.call(this, resource, newConfig);
          // 克隆响应以便我们可以读取它
          const clonedResponse = response.clone();
          
          // 检查是否为流式响应
          if (true) {
            console.log('检测到流式响应');
            
            // 读取流
            const reader = clonedResponse.body.getReader();
            const decoder = new TextDecoder('utf-8');
            
            // 处理流数据
            (async () => {
              let buffer = '';
              try {
                while (true) {
                  const { done, value } = await reader.read();
                  
                  if (done) {
                    console.log('流读取完成');
                    if (buffer.length > 0) {
                      processEventData(buffer);
                    }
                    
                    // 触发流结束事件
                    const event = new CustomEvent('streamDataEnd');
                    window.dispatchEvent(event);
                    window._activeFetchController = null;
                    break;
                  }
                  
                  // 解码数据块
                  const chunk = decoder.decode(value, { stream: true });
                  console.log('接收到数据块:', chunk.length, '字节');
                  buffer += chunk;
                  let data = chunk.toString('utf-8');
                   console.log('Received data:', data);
                
                    const lines = data.split('\n');
                   buffer = lines.pop();
                 
                  lines.forEach(line => {
                     let shujudata=JSON.parse(line);
                     console.log("shuju",shujudata);
                   if(shujudata.hasOwnProperty('result')&&shujudata.result.hasOwnProperty("message")){
                           console.log("shuju.result.message",shujudata.result.message);
                           processEventData(shujudata);
                     }
                                     
                  }
                
                );
                }
              } catch (error) {
                console.error('读取流时出错:', error);
                window._activeFetchController = null;
              }
            })();
          }
          
          return response;
        } catch (error) {
          console.error('拦截请求时出错:', error);
          window._activeFetchController = null;
          throw error;
        }
      }
      
      // 对于其他请求，使用原始 fetch
      return originalFetch.apply(this, args);
    };
    
    // 处理事件数据
    async function processEventData(line) {
      // 检查是否为 SSE 数据行
       // const data = line.substring(6); // 移除 'data: ' 前缀
        try {
          // 解析 JSON 数据
          let jsonData={};
          try{
            jsonData=JSON.parse(line);
          }catch(error){
            console.error('解析 JSON 时出错:', error, '原始数据:', line);
            jsonData=line;
          }


            
          
          console.log('处理事件数据类型:', jsonData);
          
          // 检查是否为结束信号
          if (jsonData.hasOwnProperty("result")&&jsonData.result.hasOwnProperty("isSoftStop")) {
            console.log('检测到流结束信号');
            
            // 触发流结束事件
            const event = new CustomEvent('streamDataEnd');
            window.dispatchEvent(event);
            return;
          }
          

          if(jsonData.hasOwnProperty("result")&&jsonData.result.hasOwnProperty("responseType")&&jsonData.result.responseType=="limiter"){

            // 触发自定义事件
            const event = new CustomEvent('streamDataReceived', { 
              detail: "ACTION_QUOTA_EXCEEDED" 
            });
            window.dispatchEvent(event);
  
                return;
           }

           console.log("jsonDataresult",jsonData.result);
          
          // 检查是否为消息字段增量
          if (jsonData.hasOwnProperty("result")&&jsonData.result.hasOwnProperty("message")) {
            console.log('检测到增量更新:', jsonData.result);
            
            // 触发自定义事件
            const event = new CustomEvent('streamDataReceived', { 
              detail: jsonData.result.message
            });
            window.dispatchEvent(event);
          }
        } catch (error) {
          console.error('解析 JSON 时出错:', error);
        }
      
    }
    
    console.log('fetch 拦截器设置完成');
  });

  // 在 Playwright 中暴露处理函数（只在第一次注入时需要）
  await page.exposeFunction('receiveStreamData', (data) => {
    console.log('从浏览器接收到的数据:', data);
    
    // 处理流数据
    processStreamData(data);
  }).catch(e => {
    // 如果函数已经暴露，会抛出错误，我们可以忽略它
    console.log('函数已经暴露，跳过');
  });

  // 处理流结束事件
  await page.exposeFunction('handleStreamEnd', async () => {
    

    // 处理流结束
    if (typeof resssss !== 'undefined') {
      if(!isstream){
        let response=await createChatCompletion(reqmessage);

        console.log("response",response);

        resssss.write(JSON.stringify(response));
      }
      console.log('流数据传输结束');
      resssss.end();
    }
  }).catch(e => {
    // 如果函数已经暴露，会抛出错误，我们可以忽略它
    console.log('函数已经暴露，跳过');
  });

  // 监听自定义事件
  await page.evaluate(() => {
    // 检查是否已经设置了事件监听器
    if (!window._eventListenersSet) {
      window._eventListenersSet = true;
      
      // 监听流数据事件
      window.addEventListener('streamDataReceived', (event) => {
        // 调用在 Node.js 中定义的函数
        window.receiveStreamData(event.detail);
      });
      
      // 监听流结束事件
    // 监听流结束事件
    window.addEventListener('streamDataEnd', () => {
      window.handleStreamEnd();
    });
      
      console.log('事件监听器设置完成');
    }
  });

  console.log('请求拦截器注入完成');
}

// 处理流数据的函数






async function restartBrowser() {
    console.log('Restarting browser...');
    isRestarting = true;
    if (browser) {
        await browser.close();
    }
    await initializeBrowser();
    isRestarting = false;
    console.log('Browser restarted successfully');
}
// 初始化浏览器
initializeBrowser();

// 在服务器关闭时关闭浏览器
process.on('SIGINT', async () => {
    if (browser) {
        await browser.close();
    }
    process.exit();
});

const availableModels = [
    { id: "默认GROK输入框", name: "默认GROK输入框" },
   // { id: "grok-3-文件模式", name: "grok-3-文件模式" }
];

let Upload=false;

app.post('/v1/chat/completions', async (req, res) => {
    console.log('Received chat request');
    reqmessage="";
    One=true;
    resssss = res;
    Aborted = false;

    res.on('close', async () => {
        console.log('Client disconnected');
        Aborted = true;
        await page.evaluate(() => {
          if (window._activeFetchController) {
            console.log('中止正在进行的请求');
            window._activeFetchController.abort();
            window._activeFetchController = null;
          }
          
          // 触发事件通知所有监听器
          const event = new CustomEvent('clientDisconnected');
          window.dispatchEvent(event);
        }).catch(err => {
          console.error('中止请求时出错:', err);
        });

    });

    let body=req.body
    //是否采用上传模式
    if(req.body.model=="grok-3-文件模式"){

      Upload=true;

    }else{

      Upload=false;
    }



  
    if(!body.hasOwnProperty('stream')||!body["stream"]){
        isstream=false;
    }else{
        isstream=true;
    }
    res.setHeader("Content-Type", "text/event-stream;charset=utf-8");
    res.setHeader("Access-Control-Allow-Origin", "*");
    req.setEncoding("utf8");
    console.log("isstream",isstream)
  //  console.log('Received chat request:', req.body);
    await sendMessage(res, req.body);
});

app.get('/v1/models', (req, res) => {
    Aborted = false;
    res.json({
        object: "list",
        data: availableModels.map(model => ({
            id: model.id,
            object: "model",
            created: 1623168000,
            owned_by: "openai",
            permission: [],
            root: model.id,
            parent: null
        })),
    });
    res.on('close', () => {
        console.log('Client disconnected');
    });

});




let  localCopyPath="";

async function sendMessage(res3, message) {

 
         
    let isResponseEnded = false;
    if(config.pro){

    }else{
        fileContents=getCookiesFiles();
        nowcookie=processFileContents(fileContents,cookiesjson);
        if(!nowcookie){
          cookiesCount=0;
          nowcookie=processFileContents(fileContents,cookiesjson);
        }

        if(!nowcookie){
          const text = "没有cookie用了";
          const response = {
              id: "chatcmpl-" + Math.random().toString(36).substr(2, 9),
              object: "chat.completion",
              created: Date.now(),
              model: "gpt-3.5-turbo-0613",
              usage: {
                  prompt_tokens: 9,
                  completion_tokens: text.length,
                  total_tokens: 9 + text.length
              },
              choices: [{
                  delta: {
                      role: 'assistant',
                      content: text || null
                  },
                  finish_reason: null,
                  index: 0
              }]
          };
            resssss.write(`data: ${JSON.stringify(response).replace("\\n", "\\n ")}\n\n`);
            resssss.end();
            return;
        }
    }

    const sessionCookie=getSessionCookie(nowcookie.content)
    console.log("nowcookie",nowfilename);
    console.log("sessionCookie",sessionCookie);

    await context.addCookies(sessionCookie);


  

//新建聊天
try {
  // 等待按钮可见且 aria-hidden 为 false
      const manageSourcesButton = await page.waitForSelector(
          'button[aria-label="新聊天"][role="button"]', 
          { 
            state: 'visible',
            timeout: 100
          }
        );
      if(manageSourcesButton){
          await page.evaluate(() => {
              const button = document.querySelector(
                'button[aria-label="新聊天"][role="button"]'
              );
              if (button) button.click();
            });
      }

  } catch (error) {
    try {
      // 等待按钮可见且 aria-hidden 为 false
          const manageSourcesButton = await page.waitForSelector(
              'button[aria-label="New Chat"][role="button"]', 
              { 
                state: 'visible',
                timeout: 100
              }
            );
          if(manageSourcesButton){
              await page.evaluate(() => {
                  const button = document.querySelector(
                    'button[aria-label="New Chat"][role="button"]'
                  );
                  if (button) button.click();
                });
          }

      } catch (error) {
        try {
          // 等待按钮可见且 aria-hidden 为 false
              const manageSourcesButton = await page.waitForSelector(
                  'button[aria-label="新聊天"][role="button"]', 
                  { 
                    state: 'visible',
                    timeout: 100
                  }
                );
              if(manageSourcesButton){
                  await page.evaluate(() => {
                      const button = document.querySelector(
                        'button[aria-label="新聊天"][role="button"]'
                      );
                      if (button) button.click();
                    });
              }
    
          } catch (error) {
            console.log("无需开启新聊天");
    
          }

      }
    
  }

//新建聊天

if(config.refresh){
  await page.reload();
  await new Promise(resolve => setTimeout(resolve, 1000));
}else{
  await new Promise(resolve => setTimeout(resolve, 2000));
}

try {
    message = message.messages;
    message = simplifyJsonString(message)
    function simplifyJsonString(message) {
        try {
          
          // 将每个消息转换为简化的文本格式
          let simplifiedMessages = message.map(msg => {
           
            if(config.tohuman){
                  
                return `${msg.role.replace("user","Human").replace("assistant","Assistant")}: ${msg.content}`;

            }else{
                return `${msg.role}: ${msg.content}`;
            }
          });
          
          // 将所有简化的消息用换行符连接
          return simplifiedMessages.join('\n\n');
        } catch (error) {
          console.error("Error parsing JSON:", error);
          return "Error: Invalid JSON string";
        }
      }
      Message = message;
 //   console.log('Formatted messages:', message);
    if(Upload){
                  let yuyan="提出任何問題";

                  const txtname= Math.random().toString(36).substring(3);
                  localCopyPath = path.join(__dirname, `${txtname+".txt"}`);
                  fs.writeFileSync(localCopyPath, message);

                  let textarea=null;

                  try {
                    textarea = await page.getByPlaceholder('提出任何問題').first();
                    await textarea.waitFor({ state: 'visible', timeout: 100 });

                  } catch (error) {
                    // 处理超时错误
                    try {
                      textarea = await page.getByPlaceholder('随便问点什么').first();
                      await textarea.waitFor({ state: 'visible', timeout: 100 });
                      yuyan="随便问点什么";
              
                    } catch (error) {
                    try {
                      textarea = await page.getByPlaceholder('Ask anything').first();
                      await textarea.waitFor({ state: 'visible', timeout: 100 });
                      yuyan="Ask anything";
              
                    } catch (error) {
                      // 处理超时错误
                      console.error('操作超时:', error);
                    }
                  }
                }

                    if (!textarea) {

                      console.log('textarea not found');
                      return false;
                      
                    }
                    try { 

                      // ... existing code ...


                      await new Promise(resolve => setTimeout(resolve, 200));


                         const fileInput = await page.locator('input[type="file"]');
                          // 强制清空文件列表（即使支持多文件）
                          try {
                            // 使用 waitForSelector 设置超时时间
                            await page.waitForSelector('button[aria-label="Remove"]', { 
                              timeout: 100,
                              state: 'visible' 
                            });
                          
                            // 点击按钮
                            await page.getByLabel('Remove').click();
                          } catch (error) {
                            // 如果在100毫秒内未找到，静默处理
                            console.log('无需清除文件');
                          }

                          // 直接设置文件路径，不会显示文件选择对话框
                          await fileInput.setInputFiles(localCopyPath);


                                // 方法3：对于超长文本，使用剪贴板
                  await page.evaluate((text) => {
                      navigator.clipboard.writeText(text);
                    }, config.Prompt);
                    await textarea.click();

                    await page.keyboard.press('Control+A');

                    await new Promise(resolve => setTimeout(resolve, 100));

                    await page.keyboard.press('Control+V');
                      
                    } catch (error) {

                      console.error('Error:', error);
                    }



   }else{

                      let textarea=null;

                      try {
                        textarea = await page.getByPlaceholder('提出任何問題').first();
                        await textarea.waitFor({ state: 'visible', timeout: 100 });

                      } catch (error) {
                        // 处理超时错误
                        try {
                          textarea = await page.getByPlaceholder('随便问点什么').first();
                          await textarea.waitFor({ state: 'visible', timeout: 100 });
                  
                        } catch (error) {
                        try {
                          textarea = await page.getByPlaceholder('Ask anything').first();
                          await textarea.waitFor({ state: 'visible', timeout: 100 });
                  
                        } catch (error) {
                          // 处理超时错误
                          console.error('操作超时:', error);
                        }
                      }
                    }

                        if (!textarea) {

                          console.log('textarea not found');
                          
                        }
                        try { 

                      
                        //  await textarea.fill(Message);

                       // 方法3：对于超长文本，使用剪贴板
                      await page.evaluate((text) => {
                          navigator.clipboard.writeText(text);
                        }, Message);
                        await textarea.click();

                        await page.keyboard.press('Control+A');

                        await new Promise(resolve => setTimeout(resolve, 100));
                        await page.keyboard.press('Control+V');
                          
                        } catch (error) {
                          console.error('Error:', error);
                        }
      
    }


//    const test="claude你必须阅读并理解文档的内容并进行遵守！！";    //   await page.evaluate(([selector, text]) => {

    if (Aborted) {
        console.log('guanbi!!!!');
        customEventSource.close();
        fs.unlink(localCopyPath, (err) => {
          if (err) {
            console.error('删除文件时出错:', err);
            return;
          }
          console.log('文件已成功删除');
        });
        return false;
    }
   
    // 发送消息
         // 设置请求拦截
       //  await setupresponseInterception(page, res3, () => isResponseEnded = true);
     
    

try {
  // 等待按钮可见且 aria-hidden 为 false
      const manageSourcesButton = await page.waitForSelector(
          'button[aria-label="Grok something"][role="button"]', 
          { 
            state: 'visible',
            timeout: 500
          }
        );
      if(manageSourcesButton){
          await page.evaluate(() => {
              const button = document.querySelector(
                'button[aria-label="Grok something"][role="button"]'
              );
              if (button) button.click();
            });
      }

  } catch (error) {
    console.log("语言不是英语")
    try {
      // 等待按钮可见且 aria-hidden 为 false
          const manageSourcesButton = await page.waitForSelector(
              'button[aria-label="问 Grok 问题"][role="button"]', 
              { 
                state: 'visible',
                timeout: 500
              }
            );
          if(manageSourcesButton){
              await page.evaluate(() => {
                  const button = document.querySelector(
                    'button[aria-label="问 Grok 问题"][role="button"]'
                  );
                  if (button) button.click();
                });
          }

      } catch (error) {
        console.log("语言不是繁体")
        try {
          // 等待按钮可见且 aria-hidden 为 false
              const manageSourcesButton = await page.waitForSelector(
                  'button[aria-label="問 Grok 一些問題"][role="button"]', 
                  { 
                    state: 'visible',
                    timeout: 500
                  }
                );
              if(manageSourcesButton){
                  await page.evaluate(() => {
                      const button = document.querySelector(
                        'button[aria-label="問 Grok 一些問題"][role="button"]'
                      );
                      if (button) button.click();
                    });
              }
    
          } catch (error) {
            console.error('发送点击错误', error);
    
          }

      }
    
  }

  await new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, 1000);
  });

  try {
    if(Upload){
    fs.unlink(localCopyPath, (err) => {
      if (err) {
        console.error('删除文件时出错:', err);
      }
      console.log('文件已成功删除');
    });
  }

  } catch (error) {
    console.error('删除文件时出错:', err);
  }


      nowcount=nowcount+1
      updateCookiesJson(nowfilename,nowcount);

      console.log('nowfilename',nowfilename);
      console.log('nowcount',nowcount);

   
    if (Aborted) {
        console.log('guanbi!!!!');
        customEventSource.close();
        fs.unlink(localCopyPath, (err) => {
          if (err) {
            console.error('删除文件时出错:', err);
            return;
          }
          console.log('文件已成功删除');
        });
        return false;
    }
   // recordUserRequest(userId);

} catch (error) {
    console.error('Error in sendMessage:', error);
    if (!isResponseEnded) {
        res3.write(`data: [ERROR]\n\n`);
        res3.end();
    }
}
}
async function clickElement(selector, page) {
    await page.waitForSelector(selector, { timeout: 10000 });
    const element = await page.$(selector);
    if (element) {
        await element.click();
        console.log(`Successfully clicked the element with class "${selector}"`);
    } else {
        console.log(`Element with class "${selector}" not found`);
    }
}

async function uploadFile(selector, filePath, page) {
    // const element = await page.$(selector);
    // if (element) {
    //     console.log(`Successfully found the element with class "${selector}"`);
    //     const [fileChooser] = await Promise.all([
    //         page.waitForFileChooser(),
    //         page.click(selector),
    //     ]);
    //     await fileChooser.accept([filePath]);
    // } else {
    //     console.log(`Element with class "${selector}" not found`);
    // }
    try {
      await new Promise(resolve => setTimeout(resolve, 200));
        // 读取文件内容
        const fileContent = await fsPromises.readFile(filePath);
        const fileName = path.basename(filePath);
    
        console.log(`File size: ${fileContent.length} bytes`);
    
        // 获取文件类型
        const fileType = getFileType(fileName);
    
        // 在浏览器中执行文件上传模拟
        await page.evaluate(async ({ fileName, fileContent, fileType,selector}) => {
          // 将 ArrayBuffer 转换为 Uint8Array
          const uint8Array = new Uint8Array(fileContent);
          
          // 将 Uint8Array 转换为 Blob
          const blob = new Blob([uint8Array], { type: fileType });
          
          console.log(`Blob size: ${blob.size} bytes`);
    
          // 创建 File 对象
          const file = new File([blob], fileName, { type: fileType });
          
          console.log(`File size: ${file.size} bytes`);
    
          // 创建 DataTransfer 对象
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(file);
    
          // 创建拖拽事件
          const createDragEvent = (type) => {
            return new DragEvent(type, {
              bubbles: true,
              cancelable: true,
              dataTransfer: dataTransfer
            });
          };

          console.log('File upload simulation started for:', selector);
          // 模拟拖拽过程
          const dropZone = document.querySelector(`[placeholder="${selector}"]`);
          
          dropZone.dispatchEvent(createDragEvent('dragenter'));
          dropZone.dispatchEvent(createDragEvent('dragover'));
          dropZone.dispatchEvent(createDragEvent('drop'));
    
          console.log('File upload simulation completed for:', fileName);
        }, { fileName, fileContent: Array.from(fileContent), fileType,selector });
    
        console.log('File upload process completed successfully.');
      } catch (error) {
        console.error('Error during file upload:', error);
        throw error;
      }
      
    function getFileType(fileName) {
        const extension = path.extname(fileName).toLowerCase();
        switch (extension) {
          case '.jpg':
          case '.jpeg':
            return 'image/jpeg';
          case '.png':
            return 'image/png';
          case '.gif':
            return 'image/gif';
          case '.pdf':
            return 'application/pdf';
          default:
            return 'application/octet-stream';
        }
      }
    }
    
    



function getFileType(fileName) {
  const extension = path.extname(fileName).toLowerCase();
  switch (extension) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.gif':
      return 'image/gif';
    case '.pdf':
      return 'application/pdf';
    default:
      return 'application/octet-stream';
  }
 }

 async function setupresponseInterception(page, res4, setResponseEnded) {


    page.on('response', async (response) => {
        if (response.url().includes('/api/streamingSearch')) {
            const reader = response.body().getReader(); // 获取流的读取器
            
            let done, value;
            const decoder = new TextDecoder('utf-8'); // 创建解码器

            while (true) {
                // 逐块读取数据
                ({ done, value } = await reader.read());

                if (done) {
                    console.log('流结束');
                    break;
                }

                // 解码并处理数据块
                const chunkString = decoder.decode(value, { stream: true });
                console.log('接收到的数据块:', chunkString);

                // 尝试解析 JSON
                try {
                    const jsonData = JSON.parse(chunkString);
                    console.log('解析的 JSON 数据:', jsonData);
                } catch (error) {
                    console.error('JSON 解析错误:', error);
                }
            }
        }
    });



 }






        
         
            
 app.get('/', (req, res) => {
  res.send('Genspark AI Proxy is running');
});
        

      
        // 全局错误处理
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404处理
app.use((req, res) => {
  console.log(`Route not found: ${req.method} ${req.url}`);
  res.status(404).json({ error: 'Not found' });
});




server.listen(config.port, '0.0.0.0', () => {
    console.log(`服务器运行在 http://localhost:${config.port}`);
});
function createChatCompletion(content){
    const completionTokens = content.length;
    console.log("content",content);
    
    return {
        id: generateId(),
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model: "gpt-3.5-turbo",
        system_fingerprint: "fp_44709d6fcb",
        choices: [
            {
                index: 0,
                message: {
                    role: "assistant",
                    content: content
                },
                logprobs: null,
                finish_reason: "stop"
            }
        ],
        usage: {
            prompt_tokens: completionTokens,
            completion_tokens: completionTokens,
            total_tokens: completionTokens
        }
    };
};
const generateId = () => 'chatcmpl-' + Math.random().toString(36).substring(2, 15);

async function processStreamData(message) {
  if (Aborted) {
      console.log('Request aborted, stopping data processing');
       
      return;
  }
  if(message=="ACTION_QUOTA_EXCEEDED"){
    updateCookiesJson(nowfilename,10000);

    const text = "这个号次数上限了";

    const response = {
        id: "chatcmpl-" + Math.random().toString(36).substr(2, 9),
        object: "chat.completion",
        created: Date.now(),
        model: "gpt-3.5-turbo-0613",
        usage: {
            prompt_tokens: 9,
            completion_tokens: text.length,
            total_tokens: 9 + text.length
        },
        choices: [{
            delta: {
                role: 'assistant',
                content: text || null
            },
            finish_reason: null,
            index: 0
        }]
    };
      resssss.write(`data: ${JSON.stringify(response).replace("\\n", "\\n ")}\n\n`);
      resssss.end();
      await new Promise(resolve => setTimeout(resolve, 3000));
      await page.evaluate(() => {
        const close_button = document.querySelector('[class="button ok"]');
        if (close_button) {
          const event = new MouseEvent('click', {
            view: window,
            bubbles: true,
            cancelable: true
          });
          close_button.dispatchEvent(event);
        }
      });

      return;
  }

 // console.log('数据', message);


  if (message){
      try {
        //  const parsedMessage = JSON.parse(message);
          const text = message;
          const response = {
              id: "chatcmpl-" + Math.random().toString(36).substr(2, 9),
              object: "chat.completion",
              created: Date.now(),
              model: "gpt-3.5-turbo-0613",
              usage: {
                  prompt_tokens: 9,
                  completion_tokens: text.length,
                  total_tokens: 9 + text.length
              },
              choices: [{
                  delta: {
                      role: 'assistant',
                      content: text || null
                  },
                  finish_reason: null,
                  index: 0
              }]
          };

          if (resssss) {
              console.log('Sending response:', JSON.stringify(response));
              if (isstream) {
                 // console.log(isstream)
                  reqmessage += text;
                  resssss.flushHeaders();
                  resssss.write(`data: ${JSON.stringify(response)}\n\n`);
                  resssss.flushHeaders();
              } else {
                  reqmessage += text;
              }
          }
      } catch (error) {
          console.error('Error processing message:', error);
          console.log('Client disconnected');
          Aborted = true;
          if (rrreeeqqq) {
              customEventSource.close();
              resssss = null;
          }
      }
  }
}