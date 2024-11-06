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
    window.history.pushState({ type: 'content', data: item }, '', ''); // 将状态推入浏览器历史记录
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
      if (window.history.state === null) { // 初始化时，确保只记录一次
        window.history.replaceState({ type: 'list', data: currentData }, '', '');
      }
      renderList(currentData); // 渲染软件列表
    });
  };

  // 主页按钮点击事件，跳转到主页
  homeButton.addEventListener('click', () => {
    // 返回到软件库列表界面
    if (window.history.state && window.history.state.type === 'list') {
      renderList(window.history.state.data);
    } else {
      fetchData(); // 确保数据加载并渲染
    }
  });

  // 返回按钮点击事件，使用浏览器历史记录
  backButton.addEventListener('click', () => {
    if (window.history.state && window.history.state.type !== 'list') {
      window.history.back();
    } else {
      console.warn("已经是最初的软件库列表界面，无法再返回");
    }
  });

  // 前进按钮点击事件，使用浏览器历史记录
  forwardButton.addEventListener('click', () => {
    if (window.history.length > 1) {
      window.history.forward();
    } else {
      console.warn("已经是最末状态，无法再前进");
    }
  });

  // 浏览器历史记录状态变化事件
  window.addEventListener('popstate', (event) => {
    if (event.state) {
      const state = event.state;
      if (state.type === 'list') {
        renderList(state.data); // 渲染软件列表
      } else if (state.type === 'content') {
        renderContent(state.data.url); // 显示软件内容
      }
    }
  });

  fetchData(); // 获取数据并渲染软件列表
});
