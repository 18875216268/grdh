// 导入Firebase核心模块和实时数据库模块
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

// Firebase 配置信息，用于连接Firebase项目
const firebaseConfig = {
  apiKey: "AIzaSyDk5p6EJAe02LEeqhQm1Z1dZxlIqGrRcUo", // Firebase API 密钥
  authDomain: "asqrt-ed615.firebaseapp.com", // 授权域
  databaseURL: "https://asqrt-ed615-default-rtdb.firebaseio.com", // Firebase数据库URL
  projectId: "asqrt-ed615", // Firebase项目ID
  storageBucket: "asqrt-ed615.firebasestorage.app", // Firebase存储桶
  messagingSenderId: "131720495048", // 消息发送ID
  appId: "1:131720495048:web:35f43929e31c1cc3428afd", // Firebase应用ID
  measurementId: "G-G7D5HRMF0E" // Firebase测量ID
};

// 初始化Firebase应用
const app = initializeApp(firebaseConfig);
const db = getDatabase(app); // 获取Firebase数据库实例

document.addEventListener('DOMContentLoaded', () => {
  const listContainer = document.getElementById('software-list'); // 获取显示软件列表的容器
  const homeButton = document.getElementById('home-btn'); // 获取主页按钮
  const backButton = document.getElementById('back-btn'); // 获取返回按钮
  const forwardButton = document.getElementById('forward-btn'); // 获取前进按钮

  let currentData = []; // 存储从数据库获取的软件数据
  let history = []; // 保存浏览历史记录
  let historyIndex = -1; // 当前历史记录位置

  // 函数：渲染软件列表
  const renderList = (data) => {
    document.getElementById('count').textContent = data.length; // 更新软件计数
    listContainer.innerHTML = ''; // 清空列表容器

    if (data.length === 0) { // 无数据时显示提示
      listContainer.innerHTML = '<p>未搜索到软件库</p>';
      return;
    }

    data.forEach(item => { // 遍历每个软件项目
      const listItem = document.createElement('div'); // 创建列表项
      listItem.classList.add('software-item'); // 添加样式类

      const logoImg = document.createElement('img'); // 创建软件图标
      try {
        const url = new URL(item.url); // 解析软件链接
        const hostname = url.hostname; // 获取主机名
        // 根据主机名设置不同网盘图标
        if (hostname.includes('lanzou')) {
          logoImg.src = '网盘图标/蓝奏.png';
        } else if (hostname.includes('baidu')) {
          logoImg.src = '网盘图标/百度.png';
        } else if (hostname.includes('quark')) {
          logoImg.src = '网盘图标/夸克.png';
        } else if (hostname.includes('123')) {
          logoImg.src = '网盘图标/123.png';
        } else if (hostname.includes('feiji')) {
          logoImg.src = '网盘图标/小飞机.png';
        } else if (hostname.includes('xunlei')) {
          logoImg.src = '网盘图标/迅雷.png';
        } else if (hostname.includes('ali')) {
          logoImg.src = '网盘图标/阿里.png';
        } else {
          logoImg.src = '网盘图标/默认.png'; // 默认图标
        }
      } catch (e) {
        console.error('Invalid URL:', item.url); // 错误处理
        logoImg.src = '网盘图标/默认.png';
      }
      logoImg.alt = 'Logo'; // 设置alt文本
      logoImg.classList.add('software-logo'); // 添加样式类

      const textLogoContainer = document.createElement('div'); // 图标和名称容器
      textLogoContainer.classList.add('text-logo-container');
      textLogoContainer.appendChild(logoImg);

      const textDiv = document.createElement('div'); // 创建软件名称
      textDiv.classList.add('software-text');
      textDiv.textContent = item.name; // 设置软件名称
      textLogoContainer.appendChild(textDiv);

      const loadTime = document.createElement('div'); // 创建加载时间显示
      loadTime.classList.add('load-time');
      loadTime.textContent = Math.floor(Math.random() * 100) + ' ms';

      listItem.appendChild(textLogoContainer); // 添加图标和名称
      listItem.appendChild(loadTime); // 添加加载时间

      listItem.addEventListener('click', () => { // 点击事件：打开软件链接
        history = history.slice(0, historyIndex + 1); // 截断历史记录
        history.push({ type: 'content', url: item.url }); // 加入历史记录
        historyIndex++; // 更新历史索引
        renderContent(item.url); // 显示软件内容
      });

      listItem.addEventListener('mouseenter', () => { // 悬停效果
        listItem.style.backgroundColor = '#e0e0e0';
      });

      listItem.addEventListener('mouseleave', () => { // 恢复背景色
        listItem.style.backgroundColor = 'transparent';
      });

      listContainer.appendChild(listItem); // 将列表项加入列表容器
    });
  };

  // 函数：通过 iframe 加载并显示内容
  const renderContent = (url) => {
    listContainer.innerHTML = `<iframe src="${url}" class="content-frame"></iframe>`; // 用iframe显示内容
  };

  // 函数：从Firebase数据库获取数据
  const fetchData = () => {
    const sitesRef = ref(db, 'sites'); // 数据库引用
    onValue(sitesRef, (snapshot) => { // 监听数据变化
      currentData = []; // 清空当前数据
      snapshot.forEach((childSnapshot) => { // 遍历数据节点
        const childData = childSnapshot.val(); // 获取数据
        currentData.push(childData); // 存入当前数据数组
      });
      history = history.slice(0, historyIndex + 1); // 更新历史记录
      history.push({ type: 'list', data: currentData });
      historyIndex++;
      renderList(currentData); // 渲染软件列表
    });
  };

  homeButton.addEventListener('click', () => { // 主页按钮点击事件
    window.location.href = 'https://www.quruanpu.cn'; // 跳转到主页
  });

  backButton.addEventListener('click', () => { // 返回按钮点击事件
    if (historyIndex > 0) { // 如果有历史记录
      historyIndex--; // 更新历史索引
      const previousState = history[historyIndex]; // 获取上一个历史状态
      if (previousState.type === 'list') { // 如果是列表
        renderList(previousState.data); // 渲染列表
      } else if (previousState.type === 'content') { // 如果是内容
        renderContent(previousState.url); // 显示内容
      }
    }
  });

  forwardButton.addEventListener('click', () => { // 前进按钮点击事件
    if (historyIndex < history.length - 1) { // 如果可以前进
      historyIndex++; // 更新历史索引
      const nextState = history[historyIndex]; // 获取下一个历史状态
      if (nextState.type === 'list') { // 如果是列表
        renderList(nextState.data); // 渲染列表
      } else if (nextState.type === 'content') { // 如果是内容
        renderContent(nextState.url); // 显示内容
      }
    }
  });

  fetchData(); // 调用获取数据函数，初始化软件列表
});
