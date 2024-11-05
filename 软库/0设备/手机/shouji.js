// 导入Firebase的核心模块和实时数据库模块
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js"; // 初始化Firebase应用
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js"; // 实时数据库相关功能

// Firebase 配置信息，用于连接您的Firebase项目
const firebaseConfig = {
  apiKey: "AIzaSyDk5p6EJAe02LEeqhQm1Z1dZxlIqGrRcUo", // Firebase API 密钥
  authDomain: "asqrt-ed615.firebaseapp.com", // 授权域，用于验证Firebase项目
  databaseURL: "https://asqrt-ed615-default-rtdb.firebaseio.com", // Firebase实时数据库的URL
  projectId: "asqrt-ed615", // Firebase项目ID
  storageBucket: "asqrt-ed615.firebasestorage.app", // Firebase存储桶
  messagingSenderId: "131720495048", // Firebase消息发送ID
  appId: "1:131720495048:web:35f43929e31c1cc3428afd", // Firebase应用ID
  measurementId: "G-G7D5HRMF0E" // Firebase测量ID
};

// 初始化 Firebase 应用实例
const app = initializeApp(firebaseConfig); // 使用配置信息初始化Firebase应用
const db = getDatabase(app); // 获取Firebase数据库实例，关联到初始化的应用

// 当网页文档加载完成时执行主程序
document.addEventListener('DOMContentLoaded', () => { 
  const listContainer = document.getElementById('software-list'); // 获取用于显示软件列表的HTML容器
  const searchButton = document.getElementById('search-btn'); // 获取搜索按钮
  const searchInput = document.getElementById('search-input'); // 获取搜索输入框
  const homeButton = document.getElementById('home-btn'); // 获取主页按钮
  const backButton = document.getElementById('back-btn'); // 获取返回按钮
  const forwardButton = document.getElementById('forward-btn'); // 获取前进按钮

  let currentData = []; // 保存当前从数据库获取的软件数据的数组
  let history = []; // 保存浏览历史记录的数组
  let historyIndex = -1; // 跟踪当前的历史记录位置

  // 函数：渲染软件列表
  const renderList = (data) => { 
    document.getElementById('count').textContent = data.length; // 更新软件计数显示
    listContainer.innerHTML = ''; // 清空列表容器

    if (data.length === 0) { // 如果没有找到数据
      listContainer.innerHTML = '<p>未搜索到软件库</p>'; // 显示“未搜索到软件库”的提示
      return; // 终止函数执行
    }

    data.forEach(item => { // 遍历每个软件项目
      const listItem = document.createElement('div'); // 创建列表项元素
      listItem.classList.add('software-item'); // 为列表项添加样式类

      const logoImg = document.createElement('img'); // 创建软件图标元素
      try {
        const url = new URL(item.url); // 解析软件链接URL
        const hostname = url.hostname; // 获取主机名
        if (hostname.includes('lanzou')) {
          logoImg.src = '网盘图标/蓝奏.png'; // 使用蓝奏网盘图标
        } else if (hostname.includes('baidu')) {
          logoImg.src = '网盘图标/百度.png'; // 使用百度网盘图标
        } else if (hostname.includes('quark')) {
          logoImg.src = '网盘图标/夸克.png'; // 使用夸克网盘图标
        } else if (hostname.includes('123')) {
          logoImg.src = '网盘图标/123.png'; // 使用123网盘图标
        } else if (hostname.includes('feiji')) {
          logoImg.src = '网盘图标/小飞机.png'; // 使用小飞机网盘图标
        } else if (hostname.includes('xunlei')) {
          logoImg.src = '网盘图标/迅雷.png'; // 使用迅雷网盘图标
        } else if (hostname.includes('ali')) {
          logoImg.src = '网盘图标/阿里.png'; // 使用阿里网盘图标
        } else {
          logoImg.src = '网盘图标/默认.png'; // 使用默认图标
        }
      } catch (e) {
        console.error('Invalid URL:', item.url); // 输出URL解析错误信息
        logoImg.src = '网盘图标/默认.png'; // 设置为默认图标
      }
      logoImg.alt = 'Logo'; // 设置图标的alt文本
      logoImg.classList.add('software-logo'); // 为图标添加样式类

      const textLogoContainer = document.createElement('div'); // 创建包含图标和文字的容器
      textLogoContainer.classList.add('text-logo-container'); // 为容器添加样式类
      textLogoContainer.appendChild(logoImg); // 将图标加入容器

      const textDiv = document.createElement('div'); // 创建软件名称元素
      textDiv.classList.add('software-text'); // 为软件名称添加样式类
      textDiv.textContent = item.name; // 设置软件名称
      textLogoContainer.appendChild(textDiv); // 将名称元素添加到容器中

      const loadTime = document.createElement('div'); // 创建显示加载时间的元素
      loadTime.classList.add('load-time'); // 为加载时间元素添加样式
      loadTime.textContent = Math.floor(Math.random() * 100) + ' ms'; // 设置随机加载时间

      listItem.appendChild(textLogoContainer); // 将图标和名称容器添加到列表项
      listItem.appendChild(loadTime); // 将加载时间添加到列表项

      listItem.addEventListener('click', () => { // 点击事件：打开软件链接
        history = history.slice(0, historyIndex + 1); // 截断历史记录
        history.push({ type: 'content', url: item.url }); // 将当前内容加入历史记录
        historyIndex++; // 更新历史索引
        renderContent(item.url); // 显示软件内容
      });

      listItem.addEventListener('mouseenter', () => { // 鼠标悬停事件
        listItem.style.backgroundColor = '#e0e0e0'; // 改变背景颜色
      });

      listItem.addEventListener('mouseleave', () => { // 鼠标离开事件
        listItem.style.backgroundColor = 'transparent'; // 恢复背景颜色
      });

      listContainer.appendChild(listItem); // 将列表项添加到列表容器
    });
  };

  // 函数：通过 iframe 加载并显示内容
  const renderContent = (url) => {
    listContainer.innerHTML = `<iframe src="${url}" class="content-frame"></iframe>`; // 使用 iframe 显示内容
  };

  // 函数：从Firebase数据库获取数据
  const fetchData = () => { 
    const sitesRef = ref(db, 'sites'); // 获取数据库的引用
    onValue(sitesRef, (snapshot) => { // 监听数据变化事件
      currentData = []; // 清空当前数据数组
      snapshot.forEach((childSnapshot) => { // 遍历数据节点
        const childData = childSnapshot.val(); // 获取节点数据
        currentData.push(childData); // 添加数据到当前数组
      });
      history = history.slice(0, historyIndex + 1); // 更新历史记录
      history.push({ type: 'list', data: currentData }); // 将当前数据加入历史
      historyIndex++; // 更新历史索引
      renderList(currentData); // 渲染数据列表
    });
  };

  searchButton.addEventListener('click', () => { // 搜索按钮点击事件
      const query = searchInput.value.toLowerCase().trim(); // 获取输入内容并转换为小写
      if (query) { // 如果有搜索内容
          const filteredData = currentData.filter(item => item.name.toLowerCase().includes(query)); // 筛选符合条件的数据
          renderList(filteredData); // 渲染筛选后的数据
      } else {
          renderList(currentData); // 渲染完整数据
      }
  });

  homeButton.addEventListener('click', () => { // 主页按钮点击事件
    window.location.href = 'https://www.quruanpu.cn'; // 跳转到主页
  });

  backButton.addEventListener('click', () => { // 返回按钮点击事件
    if (historyIndex > 0) { // 如果可以返回
      historyIndex--; // 更新历史索引
      const previousState = history[historyIndex]; // 获取上一个历史状态
      if (previousState.type === 'list') { // 如果是列表状态
        renderList(previousState.data); // 渲染列表
      } else if (previousState.type === 'content') { // 如果是内容状态
        renderContent(previousState.url); // 显示内容
      }
    }
  });

  forwardButton.addEventListener('click', () => { // 前进按钮点击事件
    if (historyIndex < history.length - 1) { // 如果可以前进
      historyIndex++; // 更新历史索引
      const nextState = history[historyIndex]; // 获取下一个历史状态
      if (nextState.type === 'list') { // 如果是列表状态
        renderList(nextState.data); // 渲染列表
      } else if (nextState.type === 'content') { // 如果是内容状态
        renderContent(nextState.url); // 显示内容
      }
    }
  });

  fetchData(); // 调用获取数据函数，初始化软件列表
});
