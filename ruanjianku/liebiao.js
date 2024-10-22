// Firebase配置
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js";

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

// 初始化Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// 从Firebase读取软件库列表
function loadSoftwareList() {
    const softwareListRef = ref(database, 'sites'); // 使用你提供的路径 'sites'
    
    onValue(softwareListRef, (snapshot) => {
        const softwareList = snapshot.val();
        const container = document.getElementById('软件库列表id');
        container.innerHTML = ''; // 清空容器

        // 遍历数据并动态生成列表项
        for (const key in softwareList) {
            const item = softwareList[key];
            const div = document.createElement('div');
            div.className = '软件库块class';
            div.setAttribute('onclick', `window.open('${item.url}', '_blank')`);
            div.innerHTML = `<span class="lbk-wz-class">${item.name}</span>`;
            container.appendChild(div);
        }
    });
}

// 调用函数加载软件库列表
loadSoftwareList();
