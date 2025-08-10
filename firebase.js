// Firebase配置和认证模块
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getDatabase, ref, get, set } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-database.js";

// Firebase配置
const firebaseConfig = {
    apiKey: "AIzaSyB3ioWABsutPeZ9LboagtxLLgo2kyi9Xnw",
    authDomain: "zhuye-fb0a6.firebaseapp.com",
    databaseURL: "https://zhuye-fb0a6-default-rtdb.asia-southeast1.firebasedatabase.app/",
    projectId: "zhuye-fb0a6",
    storageBucket: "zhuye-fb0a6.firebasestorage.app",
    messagingSenderId: "5341756226",
    appId: "1:5341756226:web:1df340a043774db92326db",
    measurementId: "G-BG1920BDX0"
};

// 初始化Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// 验证用户登录 - 基于用户输入去数据库验证
async function validateLogin(inputUsername, inputPassword) {
    try {
        const userRef = ref(database, 'users');
        const snapshot = await get(userRef);
        
        if (snapshot.exists()) {
            const userData = snapshot.val();
            // 比较用户输入的账号密码与数据库中的数据
            return userData.username === inputUsername && userData.password === inputPassword;
        } else {
            console.log('数据库中未找到用户数据');
            return false;
        }
    } catch (error) {
        console.error('验证登录失败:', error);
        return false;
    }
}

// 获取当前登录的账号
async function getCurrentAccount() {
    try {
        const userRef = ref(database, 'users');
        const snapshot = await get(userRef);
        
        if (snapshot.exists()) {
            const userData = snapshot.val();
            return userData.username;
        } else {
            console.log('数据库中未找到用户数据');
            return null;
        }
    } catch (error) {
        console.error('获取账号失败:', error);
        return null;
    }
}

// 获取当前密码
async function getCurrentPassword() {
    try {
        const userRef = ref(database, 'users');
        const snapshot = await get(userRef);
        
        if (snapshot.exists()) {
            const userData = snapshot.val();
            return userData.password;
        } else {
            console.log('数据库中未找到用户数据');
            return null;
        }
    } catch (error) {
        console.error('获取密码失败:', error);
        return null;
    }
}

// 更新用户信息
async function updateUserInfo(newUsername, newPassword) {
    try {
        const userRef = ref(database, 'users');
        const snapshot = await get(userRef);
        
        if (snapshot.exists()) {
            const userData = snapshot.val();
            
            // 构建更新对象
            const updates = {};
            if (newUsername) updates.username = newUsername;
            if (newPassword) updates.password = newPassword;
            
            // 合并现有数据和更新
            const updatedData = { ...userData, ...updates };
            
            // 更新数据库
            await set(userRef, updatedData);
            
            return true;
        } else {
            console.error('用户数据不存在');
            return false;
        }
    } catch (error) {
        console.error('更新用户信息失败:', error);
        return false;
    }
}

// 检查登录状态
function checkLoginStatus() {
    return localStorage.getItem('isLoggedIn') === 'true';
}

// 设置登录状态
function setLoginStatus(status) {
    localStorage.setItem('isLoggedIn', status);
}

// 登出
function logout() {
    localStorage.removeItem('isLoggedIn');
}

// 获取网站设置
async function getSettings() {
    try {
        const settingsRef = ref(database, 'settings');
        const snapshot = await get(settingsRef);
        
        if (snapshot.exists()) {
            return snapshot.val();
        } else {
            // 返回默认设置
            return {
                avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=NavigationHub&backgroundColor=b6e3f4,c0aede,d1d4f9&size=120',
                siteTitle: '导航中心',
                siteSubtitle: '探索 · 发现 · 连接无限可能',
                footerText: '加入社区交流群 (´▽`)ﾉ',
                footerLink: '#'
            };
        }
    } catch (error) {
        console.error('获取设置失败:', error);
        return null;
    }
}

// 保存网站设置
async function saveSettings(settings) {
    try {
        const settingsRef = ref(database, 'settings');
        await set(settingsRef, settings);
        return true;
    } catch (error) {
        console.error('保存设置失败:', error);
        return false;
    }
}

// 获取链接列表
async function getLinks() {
    try {
        const linksRef = ref(database, 'listurl');
        const snapshot = await get(linksRef);
        
        if (snapshot.exists()) {
            const links = snapshot.val();
            // 转换为数组格式
            return Object.keys(links).map(key => ({
                id: key,
                ...links[key]
            }));
        } else {
            return [];
        }
    } catch (error) {
        console.error('获取链接列表失败:', error);
        return [];
    }
}

// 保存链接列表
async function saveLinks(links) {
    try {
        const linksRef = ref(database, 'listurl');
        
        // 转换数组为对象格式
        const linksObject = {};
        links.forEach((link, index) => {
            const id = link.id || `link_${Date.now()}_${index}`;
            linksObject[id] = {
                icon: link.icon,
                text: link.text,
                url: link.url
            };
        });
        
        await set(linksRef, linksObject);
        return true;
    } catch (error) {
        console.error('保存链接列表失败:', error);
        return false;
    }
}

// 添加单个链接
async function addLink(linkData) {
    try {
        const linksRef = ref(database, 'listurl');
        const snapshot = await get(linksRef);
        
        const links = snapshot.exists() ? snapshot.val() : {};
        const newId = `link_${Date.now()}`;
        
        links[newId] = {
            icon: linkData.icon,
            text: linkData.text,
            url: linkData.url
        };
        
        await set(linksRef, links);
        return newId;
    } catch (error) {
        console.error('添加链接失败:', error);
        return null;
    }
}

// 更新单个链接
async function updateLink(linkId, linkData) {
    try {
        const linkRef = ref(database, `listurl/${linkId}`);
        await set(linkRef, {
            icon: linkData.icon,
            text: linkData.text,
            url: linkData.url
        });
        return true;
    } catch (error) {
        console.error('更新链接失败:', error);
        return false;
    }
}

// 删除单个链接
async function deleteLink(linkId) {
    try {
        const linkRef = ref(database, `listurl/${linkId}`);
        await set(linkRef, null);
        return true;
    } catch (error) {
        console.error('删除链接失败:', error);
        return false;
    }
}

// 记录访客访问 - 使用扁平结构
async function recordVisit() {
    try {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hour = String(now.getHours()).padStart(2, '0');
        
        // 使用横杠分隔的扁平结构
        const timeNode = `${year}-${month}-${day} ${hour}`;
        
        // 获取该时间节点的引用
        const timeRef = ref(database, `number/${timeNode}`);
        const snapshot = await get(timeRef);
        
        // 如果节点存在，值+1；否则创建并设为1
        const currentCount = snapshot.exists() ? snapshot.val() : 0;
        await set(timeRef, currentCount + 1);
        
        return true;
    } catch (error) {
        console.error('记录访客失败:', error);
        return false;
    }
}

// 获取访客统计数据 - 使用新的数据结构
async function getVisitorStats() {
    try {
        const numberRef = ref(database, 'number');
        const snapshot = await get(numberRef);
        
        if (!snapshot.exists()) {
            return {
                todayVisitors: 0,
                monthVisitors: 0,
                totalVisitors: 0,
                monthGrowthRate: 0,
                rawData: {}
            };
        }
        
        const allData = snapshot.val();
        const now = new Date();
        const todayStr = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;
        const thisMonthStr = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`;
        const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1);
        const lastMonthStr = `${lastMonthDate.getFullYear()}/${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;
        
        let todayVisitors = 0;
        let monthVisitors = 0;
        let totalVisitors = 0;
        let lastMonthVisitors = 0;
        
        // 遍历所有时间节点进行统计
        Object.entries(allData).forEach(([timeNode, count]) => {
            totalVisitors += count;
            
            // 检查是否是今天的数据
            if (timeNode.startsWith(todayStr)) {
                todayVisitors += count;
            }
            
            // 检查是否是本月的数据
            if (timeNode.startsWith(thisMonthStr)) {
                monthVisitors += count;
            }
            
            // 检查是否是上月的数据
            if (timeNode.startsWith(lastMonthStr)) {
                lastMonthVisitors += count;
            }
        });
        
        // 计算月增长率
        const monthGrowthRate = lastMonthVisitors === 0 ? 0 : 
            ((monthVisitors - lastMonthVisitors) / lastMonthVisitors * 100).toFixed(1);
        
        return {
            todayVisitors,
            monthVisitors,
            totalVisitors,
            monthGrowthRate,
            rawData: allData // 返回原始数据供图表使用
        };
    } catch (error) {
        console.error('获取访客统计失败:', error);
        return null;
    }
}

// 导出函数
window.FirebaseAuth = {
    validateLogin,
    checkLoginStatus,
    setLoginStatus,
    logout,
    getCurrentAccount,
    getCurrentPassword,
    updateUserInfo,
    getSettings,
    saveSettings,
    getLinks,
    saveLinks,
    addLink,
    updateLink,
    deleteLink,
    recordVisit,
    getVisitorStats
};