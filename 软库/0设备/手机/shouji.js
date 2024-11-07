// JavaScript 文件的修改 (shouji.js)
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
  const listContainer = document.getElementById('software-list'); // 用于显示软件列表的容器
  const searchPage = document.getElementById('search-page'); // 搜索页面元素
  const searchInput = document.getElementById('search-input'); // 搜索输入框
  const searchResults = document.getElementById('search-results'); // 搜索结果显示容器
  const cancelSearch = document.getElementById('cancel-search'); // 取消搜索按钮
  const homeButton = document.getElementById('home-btn'); // 主页按钮元素
  const backButton = document.getElementById('back-btn'); // 返回按钮元素
  const forwardButton = document.getElementById('forward-btn'); // 前进按钮元素
  let currentData = []; // 存储从数据库获取的数据

  // 更新显示的计数
  const updateCount = (count) => {
    document.getElementById('count').textContent = count; // 动态更新软件计数
  };

  // 初始化搜索框按钮事件
  const initSearch = () => {
    // 在列表顶部增加搜索框
    const topSearchBox = document.createElement('div');
    topSearchBox.classList.add('top-search-box');
    topSearchBox.innerHTML = `<input type="text" id="top-search-input" class="top-search-input" placeholder="🔍 搜索">`;
    listContainer.prepend(topSearchBox); // 将搜索框添加到软件列表的顶部

    const topSearchInput = document.getElementById('top-search-input'); // 获取顶部搜索框元素

    // 当点击顶部搜索框时，显示搜索页面
    topSearchInput.addEventListener('click', () => {
      searchPage.style.display = 'block'; // 显示搜索页面
      searchInput.focus(); // 聚焦搜索输入框
    });

    // 取消按钮事件
    cancelSearch.addEventListener('click', () => {
      searchPage.style.display = 'none'; // 隐藏搜索页面
      searchInput.value = ''; // 清空搜索输入框
      searchResults.innerHTML = ''; // 清空搜索结果
    });

    // 搜索输入框事件
    searchInput.addEventListener('input', (event) => {
      const keyword = event.target.value; // 获取输入框中的关键字
      if (keyword.trim() === '') {
        searchResults.innerHTML = '<p>请输入关键词进行搜索</p>'; // 提示用户输入关键词
      } else {
        const filteredData = fuzzySearch(currentData, keyword.trim().toLowerCase());
        renderSearchResults(filteredData); // 渲染匹配的结果
      }
    });
  };

  // 模糊搜索功能
  const fuzzySearch = (data, keyword) => {
    const regex = new RegExp(keyword.split('').join('.*'), 'i'); // 创建模糊匹配的正则表达式
    return data.filter(item => regex.test(item.name)); // 通过正则表达式匹配名称
  };

  // 渲染搜索结果
  const renderSearchResults = (data) => {
    searchResults.innerHTML = ''; // 清空当前的搜索结果
    if (data.length === 0) {
      searchResults.innerHTML = '<p>未找到匹配的软件</p>'; // 无匹配结果时显示提示
      return;
    }
    data.forEach(item => {
      const listItem = document.createElement('div'); // 创建列表项容器
      listItem.classList.add('software-item'); // 添加样式类

      const link = document.createElement('a'); // 创建链接元素
      link.href = '#'; // 链接为空，点击时执行事件
      link.textContent = item.name; // 设置链接文本为软件名称
      link.addEventListener('click', (e) => {
        e.preventDefault(); // 阻止默认链接跳转行为
        searchPage.style.display = 'none'; // 隐藏搜索页面
        handleItemClick(item); // 点击后处理项目的加载
      });

      listItem.appendChild(link); // 将链接添加到列表项
      searchResults.appendChild(listItem); // 将列表项添加到搜索结果容器
    });
  };

  // 初始化Firebase获取数据
  const fetchData = () => {
    const sitesRef = ref(db, 'sites'); // 引用数据库路径
    onValue(sitesRef, (snapshot) => { // 监听数据变化
      currentData = []; // 清空当前数据
      snapshot.forEach((childSnapshot) => {
        currentData.push(childSnapshot.val()); // 将每个节点数据加入到currentData中
      });
      renderList(currentData); // 渲染软件列表
    });
  };

  // 渲染软件列表
  const renderList = (data) => {
    updateCount(data.length); // 更新软件数量
    listContainer.innerHTML = ''; // 清空现有内容
    
    // 始终在列表顶部添加搜索框
    initSearch();
    
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

  // 获取数据
  fetchData();
});
