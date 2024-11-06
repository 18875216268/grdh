// 导入 Firebase 的核心模块和实时数据库模块
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

// Firebase 配置信息，用于初始化 Firebase 应用
const firebaseConfig = {
  apiKey: "AIzaSyDk5p6EJAe02LEeqhQm1Z1dZxlIqGrRcUo",
  authDomain: "asqrt-ed615.firebaseapp.com",
  databaseURL: "https://asqrt-ed615-default-rtdb.firebaseio.com",
  projectId: "asqrt-ed615",
  storageBucket: "asqrt-ed615.firebasestorage.app",
  messagingSenderId: "131720495048",
  appId: "1:131720495048:web:35f43929e31c1cc3428afd",
  measurementId: "G-G7D5HRMF0E"
};

// 初始化 Firebase 应用并获取数据库实例
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// 页面加载后执行的函数
document.addEventListener('DOMContentLoaded', () => {
  // 获取页面中的元素
  const listContainer = document.getElementById('software-list'); // 用于显示软件列表的容器
  const homeButton = document.getElementById('home-btn'); // 主页按钮元素
  const backButton = document.getElementById('back-btn'); // 返回按钮元素
  const forwardButton = document.getElementById('forward-btn'); // 前进按钮元素

  let currentData = []; // 存储从数据库获取的数据
  let history = []; // 存储用户的浏览历史记录
  let historyIndex = -1; // 当前浏览历史的位置

  // 更新显示的计数
  const updateCount = (count) => {
    document.getElementById('count').textContent = count; // 动态更新软件计数
  };

  // 渲染软件列表
  const renderList = (data) => {
    updateCount(data.length); // 更新软件数量
    listContainer.innerHTML = data.length ? '' : '<p>未搜索到软件库</p>'; // 无数据时显示提示

    data.forEach(item => { // 遍历软件数据，生成每个软件项
      const listItem = document.createElement('div'); // 创建列表项容器
      listItem.classList.add('software-item'); // 添加样式类

      const textLogoContainer = createLogoAndText(item); // 创建图标和名称容器
      const loadTime = createLoadTimeElement(); // 创建加载时间显示

      listItem.append(textLogoContainer, loadTime); // 将内容添加到列表项
      listItem.addEventListener('click', () => handleItemClick(item)); // 添加点击事件
      listContainer.appendChild(listItem); // 将列表项添加到列表容器
    });
  };

  // 创建图标和名称容器
  const createLogoAndText = (item) => {
    const textLogoContainer = document.createElement('div');
    textLogoContainer.classList.add('text-logo-container');

    const logoImg = document.createElement('img'); // 创建软件图标
    logoImg.src = getLogoSrc(item.url); // 根据 URL 设置图标
    logoImg.alt = 'Logo';
    logoImg.classList.add('software-logo');

    const textDiv = document.createElement('div'); // 创建软件名称
    textDiv.classList.add('software-text');
    textDiv.textContent = item.name; // 设置软件名称

    textLogoContainer.append(logoImg, textDiv); // 添加图标和名称
    return textLogoContainer;
  };

  // 根据URL获取相应的图标路径
  const getLogoSrc = (url) => {
    try {
      const hostname = new URL(url).hostname;
      if (hostname.includes('lanzou')) return '网盘图标/蓝奏.png';
      if (hostname.includes('baidu')) return '网盘图标/百度.png';
      if (hostname.includes('quark')) return '网盘图标/夸克.png';
      if (hostname.includes('123')) return '网盘图标/123.png';
      if (hostname.includes('feiji')) return '网盘图标/小飞机.png';
      if (hostname.includes('xunlei')) return '网盘图标/迅雷.png';
      if (hostname.includes('ali')) return '网盘图标/阿里.png';
    } catch (e) {
      console.error('Invalid URL:', url);
    }
    return '网盘图标/默认.png';
  };

  // 创建加载时间元素
  const createLoadTimeElement = () => {
    const loadTime = document.createElement('div');
    loadTime.classList.add('load-time');
    loadTime.textContent = `${Math.floor(Math.random() * 100)} ms`; // 随机生成加载时间
    return loadTime;
  };

  // 处理软件项点击事件
  const handleItemClick = (item) => {
    history = history.slice(0, historyIndex + 1); // 截断未来历史记录
    history.push({ type: 'content', data: item }); // 添加新记录，保存完整的数据以供返回
    historyIndex++; // 更新历史索引位置
    renderContent(item.url); // 加载内容
  };

  // 通过 iframe 加载并显示内容
  const renderContent = (url) => {
    listContainer.innerHTML = `<iframe src="${url}" class="content-frame"></iframe>`; // 使用 iframe 加载指定 URL 的内容
  };

  // 从 Firebase 数据库获取数据
  const fetchData = () => {
    const sitesRef = ref(db, 'sites'); // 引用数据库路径
    onValue(sitesRef, (snapshot) => { // 监听数据变化
      currentData = []; // 清空当前数据
      snapshot.forEach((childSnapshot) => { // 遍历每个数据节点
        currentData.push(childSnapshot.val());
      });
      if (historyIndex === -1) { // 初始化时，确保只记录一次
        history.push({ type: 'list', data: currentData }); // 保存当前列表页面为历史记录
        historyIndex++; // 更新历史索引位置
      }
      renderList(currentData); // 渲染软件列表
    });
  };

  // 主页按钮点击事件，跳转到主页
  homeButton.addEventListener('click', () => window.location.href = 'https://www.quruanpu.cn');

  // 返回按钮点击事件
  backButton.addEventListener('click', () => {
    if (historyIndex > 0) { // 确保可以返回上一个页面
      historyIndex--; // 更新历史索引位置，指向上一步操作
      const previousState = history[historyIndex]; // 获取上一个历史状态
      if (previousState.type === 'list') { // 如果历史状态是列表页面
        renderList(previousState.data); // 渲染软件列表
      } else if (previousState.type === 'content') { // 如果历史状态是内容页面
        renderContent(previousState.data.url); // 显示软件内容
      }
    } else {
      console.warn("无法返回 - 已经是历史记录的最初位置"); // 调整为警告信息，以更符合常见的调试逻辑
    }
  });

  // 前进按钮点击事件
  forwardButton.addEventListener('click', () => {
    if (historyIndex < history.length - 1) { // 确保可以前进
      historyIndex++; // 更新历史索引
      const nextState = history[historyIndex]; // 获取下一个历史状态
      if (nextState.type === 'list') { // 如果是列表页面
        renderList(nextState.data); // 渲染列表
      } else if (nextState.type === 'content') { // 如果是内容页面
        renderContent(nextState.data.url); // 显示内容
      }
    } else {
      console.warn("无法前进 - 已经是历史记录的最末位置"); // 调整为警告信息，以更符合常见的调试逻辑
    }
  });

  fetchData(); // 获取数据并渲染软件列表
});
