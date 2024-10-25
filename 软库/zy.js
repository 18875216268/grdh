// script.js
// 引入 Firebase 所需的库
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js";

// Firebase 应用的配置参数
const firebaseConfig = {
    apiKey: "AIzaSyDk5p6EJAe02LEeqhQm1Z1dZxlIqGrRcUo",
    authDomain: "asqrt-ed615.firebaseapp.com",
    databaseURL: "https://asqrt-ed615-default-rtdb.firebaseio.com",
    projectId: "asqrt-ed615",
    storageBucket: "asqrt-ed615.appspot.com",
    messagingSenderId: "131720495048",
    appId: "1:131720495048:web:35f43929e31c1cc3428afd",
    measurementId: "G-G7D5HRMF0E"
};

// 初始化 Firebase 应用
const app = initializeApp(firebaseConfig);
const database = getDatabase(app); // 获取数据库实例

const itemsPerPage = 20; // 每页显示 20 个软件块
let currentPage = 1; // 当前页码，默认第一页
let previousPage = 1; // 记录前一页的页码，初始为第一页

// 加载软件列表数据
function loadSoftwareList() {
    const softwareListRef = ref(database, 'sites'); // 从 Firebase 数据库获取 'sites' 节点的数据
    onValue(softwareListRef, (snapshot) => {
        const softwareList = snapshot.val(); // 获取所有软件的列表数据
        if (!softwareList) {
            // 如果数据库中没有数据，则显示无数据信息
            document.getElementById('软件列表id').innerHTML = '<p>没有可显示的软件库</p>';
            document.getElementById('pagination-controls').innerHTML = '';
            return;
        }

        const container = document.getElementById('软件列表id'); // 获取软件块的容器元素
        container.innerHTML = ''; // 清空容器内容
        const keys = Object.keys(softwareList); // 获取所有软件的 key
        const totalPages = Math.ceil(keys.length / itemsPerPage); // 计算总页数

        generatePaginationControls(totalPages); // 生成分页按钮

        const startIndex = (currentPage - 1) * itemsPerPage; // 当前页的起始索引
        const endIndex = startIndex + itemsPerPage; // 当前页的结束索引
        const currentKeys = keys.slice(startIndex, endIndex); // 获取当前页的软件列表

        // 根据页码变化应用不同的动画效果
        if (currentPage > previousPage) {
            container.classList.add('slide-in-left'); // 向右滑动动画
        } else if (currentPage < previousPage) {
            container.classList.add('slide-in-right'); // 向左滑动动画
        } else {
            container.classList.add('fade-in-out'); // 渐入渐出效果
        }
        previousPage = currentPage; // 更新前一页的页码

        // 动画完成后，移除动画类
        container.addEventListener('animationend', () => {
            container.classList.remove('slide-in-left', 'slide-in-right', 'fade-in-out');
        });

        // 为当前页的软件生成软件块并添加到容器中
        currentKeys.forEach((key) => {
            const item = softwareList[key]; // 获取软件条目
            const div = document.createElement('div'); // 创建一个新的 div 元素
            div.className = 'class="特效class 软件库块class'; // 设置样式类
            div.setAttribute('role', 'listitem'); // 为无障碍支持设置 role 属性
            div.setAttribute('tabindex', '0'); // 可通过键盘导航
            div.setAttribute('onclick', `window.open('${item.url}', '_blank')`); // 点击后在新标签页打开链接
            div.innerHTML = `<span class="特效class 文字class">${item.name}</span>`; // 显示软件名称
            container.appendChild(div); // 将新软件块添加到容器中
        });

        // 如果当前页不足 20 个软件块，则填充空白块以保持布局一致
        const remainingItems = itemsPerPage - currentKeys.length;
        if (remainingItems > 0) {
            for (let i = 0; i < remainingItems; i++) {
                const emptyDiv = document.createElement('div'); // 创建空白块
                emptyDiv.className = '软件库块class';
                emptyDiv.style.visibility = 'hidden'; // 隐藏占位块，仅用于保持布局一致
                container.appendChild(emptyDiv); // 添加到容器中
            }
        }
    });
}

// 生成分页按钮
function generatePaginationControls(totalPages) {
    const paginationControls = document.getElementById('pagination-controls'); // 获取分页按钮的容器元素
    paginationControls.innerHTML = ''; // 清空之前的分页控件

    // 定义分页按钮，包括首页、上一页、页码、下一页和末页
    const paginationButtons = [
        { text: '首页', disabled: currentPage === 1, action: () => (currentPage = 1) },
        { text: '◀', disabled: currentPage === 1, action: () => currentPage-- },
        ...Array.from({ length: totalPages }, (_, i) => ({
            text: `${i + 1}`,
            disabled: false,
            action: () => (currentPage = i + 1),
            isCurrent: currentPage === (i + 1)
        })),
        { text: '▶', disabled: currentPage === totalPages, action: () => currentPage++ },
        { text: '末页', disabled: currentPage === totalPages, action: () => (currentPage = totalPages) }
    ];

    // 逐个创建分页按钮并添加到分页控件容器中
    paginationButtons.forEach(({ text, disabled, action, isCurrent }) => {
        const button = document.createElement('button'); // 创建按钮元素
        button.textContent = text; // 设置按钮文本
        button.disabled = disabled; // 根据情况禁用按钮
        if (isCurrent) {
            button.classList.add('current-page'); // 当前页按钮的特殊样式
        }
        button.addEventListener('click', () => {
            action(); // 设置按钮点击后执行的动作
            loadSoftwareList(); // 重新加载软件列表
        });
        paginationControls.appendChild(button); // 将按钮添加到分页控件容器中
    });
}

// 初次加载软件列表
loadSoftwareList();
