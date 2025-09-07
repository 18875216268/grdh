// Firebase配置和认证模块
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getDatabase, ref, get, set, onValue, off } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-database.js";

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

// 存储监听器引用
const listeners = {
    settings: null,
    links: null,
    sites: null
};

// 验证用户登录
async function validateLogin(inputUsername, inputPassword) {
    try {
        const userRef = ref(database, 'users');
        const snapshot = await get(userRef);
        
        if (snapshot.exists()) {
            const userData = snapshot.val();
            return userData.username === inputUsername && userData.password === inputPassword;
        }
        return false;
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
        }
        return null;
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
        }
        return null;
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
            
            const updates = {};
            if (newUsername) updates.username = newUsername;
            if (newPassword) updates.password = newPassword;
            
            const updatedData = { ...userData, ...updates };
            
            await set(userRef, updatedData);
            
            return true;
        }
        return false;
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

// 监听网站设置（实时）
function listenToSettings(callback) {
    if (listeners.settings) {
        off(listeners.settings);
    }
    
    const settingsRef = ref(database, 'settings');
    listeners.settings = settingsRef;
    
    onValue(settingsRef, (snapshot) => {
        if (snapshot.exists()) {
            callback(snapshot.val());
        } else {
            callback({
                avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=NavigationHub&backgroundColor=b6e3f4,c0aede,d1d4f9&size=120',
                siteTitle: '导航中心',
                siteSubtitle: '探索 · 发现 · 连接无限可能',
                footerText: '加入社区交流群 (´▽`)ﾉ',
                footerLink: '#'
            });
        }
    }, (error) => {
        console.error('监听设置失败:', error);
    });
}

// 获取网站设置
async function getSettings() {
    try {
        const settingsRef = ref(database, 'settings');
        const snapshot = await get(settingsRef);
        
        if (snapshot.exists()) {
            return snapshot.val();
        } else {
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

// 监听链接列表（实时）
function listenToLinks(callback) {
    if (listeners.links) {
        off(listeners.links);
    }
    
    const linksRef = ref(database, 'listurl');
    listeners.links = linksRef;
    
    onValue(linksRef, (snapshot) => {
        if (snapshot.exists()) {
            const links = snapshot.val();
            const linksArray = Object.keys(links).map(key => ({
                id: key,
                ...links[key]
            }));
            // 按序号排序
            linksArray.sort((a, b) => (a.xuhao || 0) - (b.xuhao || 0));
            callback(linksArray);
        } else {
            callback([]);
        }
    }, (error) => {
        console.error('监听链接失败:', error);
    });
}

// 获取链接列表
async function getLinks() {
    try {
        const linksRef = ref(database, 'listurl');
        const snapshot = await get(linksRef);
        
        if (snapshot.exists()) {
            const links = snapshot.val();
            const linksArray = Object.keys(links).map(key => ({
                id: key,
                ...links[key]
            }));
            // 按序号排序
            return linksArray.sort((a, b) => (a.xuhao || 0) - (b.xuhao || 0));
        } else {
            return [];
        }
    } catch (error) {
        console.error('获取链接列表失败:', error);
        return [];
    }
}

// 添加单个链接
async function addLink(linkData) {
    try {
        const linksRef = ref(database, 'listurl');
        const snapshot = await get(linksRef);
        
        const links = snapshot.exists() ? snapshot.val() : {};
        const newId = `link_${Date.now()}`;
        
        // 计算新序号（最大序号+1）
        let maxXuhao = 0;
        Object.values(links).forEach(link => {
            if (link.xuhao && link.xuhao > maxXuhao) {
                maxXuhao = link.xuhao;
            }
        });
        
        links[newId] = {
            icon: linkData.icon,
            text: linkData.text,
            url: linkData.url,
            xuhao: maxXuhao + 1
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
        const snapshot = await get(linkRef);
        const oldData = snapshot.exists() ? snapshot.val() : {};
        
        await set(linkRef, {
            icon: linkData.icon,
            text: linkData.text,
            url: linkData.url,
            xuhao: oldData.xuhao || 0
        });
        return true;
    } catch (error) {
        console.error('更新链接失败:', error);
        return false;
    }
}

// 删除单个链接并重排序号
async function deleteLink(linkId) {
    try {
        const linksRef = ref(database, 'listurl');
        const snapshot = await get(linksRef);
        
        if (!snapshot.exists()) return false;
        
        const links = snapshot.val();
        const deletedXuhao = links[linkId]?.xuhao || 0;
        delete links[linkId];
        
        // 重排序号：大于删除项序号的都减1
        Object.keys(links).forEach(key => {
            if (links[key].xuhao > deletedXuhao) {
                links[key].xuhao--;
            }
        });
        
        await set(linksRef, links);
        return true;
    } catch (error) {
        console.error('删除链接失败:', error);
        return false;
    }
}

// 批量更新链接序号
async function updateLinkOrders(orderData) {
    try {
        const linksRef = ref(database, 'listurl');
        const snapshot = await get(linksRef);
        
        if (!snapshot.exists()) return false;
        
        const links = snapshot.val();
        
        // 更新序号
        orderData.forEach(item => {
            if (links[item.id]) {
                links[item.id].xuhao = item.xuhao;
            }
        });
        
        await set(linksRef, links);
        return true;
    } catch (error) {
        console.error('更新链接序号失败:', error);
        return false;
    }
}

// 监听站点列表（实时）
function listenToSites(callback) {
    if (listeners.sites) {
        off(listeners.sites);
    }
    
    const sitesRef = ref(database, 'zdfw');
    listeners.sites = sitesRef;
    
    onValue(sitesRef, (snapshot) => {
        if (snapshot.exists()) {
            const sites = snapshot.val();
            const sitesArray = Object.keys(sites).map(key => ({
                id: key,
                ...sites[key]
            }));
            // 按序号排序
            sitesArray.sort((a, b) => (a.xuhao || 0) - (b.xuhao || 0));
            callback(sitesArray);
        } else {
            callback([]);
        }
    }, (error) => {
        console.error('监听站点失败:', error);
    });
}

// 获取站点列表
async function getSites() {
    try {
        const sitesRef = ref(database, 'zdfw');
        const snapshot = await get(sitesRef);
        
        if (snapshot.exists()) {
            const sites = snapshot.val();
            const sitesArray = Object.keys(sites).map(key => ({
                id: key,
                ...sites[key]
            }));
            // 按序号排序
            return sitesArray.sort((a, b) => (a.xuhao || 0) - (b.xuhao || 0));
        } else {
            return [];
        }
    } catch (error) {
        console.error('获取站点列表失败:', error);
        return [];
    }
}

// 添加单个站点
async function addSite(siteData) {
    try {
        const sitesRef = ref(database, 'zdfw');
        const snapshot = await get(sitesRef);
        
        const sites = snapshot.exists() ? snapshot.val() : {};
        const newId = `site_${Date.now()}`;
        
        // 计算新序号（最大序号+1）
        let maxXuhao = 0;
        Object.values(sites).forEach(site => {
            if (site.xuhao && site.xuhao > maxXuhao) {
                maxXuhao = site.xuhao;
            }
        });
        
        sites[newId] = {
            icon: siteData.icon,
            text: siteData.text,
            url: siteData.url,
            xuhao: maxXuhao + 1
        };
        
        await set(sitesRef, sites);
        return newId;
    } catch (error) {
        console.error('添加站点失败:', error);
        return null;
    }
}

// 更新单个站点
async function updateSite(siteId, siteData) {
    try {
        const siteRef = ref(database, `zdfw/${siteId}`);
        const snapshot = await get(siteRef);
        const oldData = snapshot.exists() ? snapshot.val() : {};
        
        await set(siteRef, {
            icon: siteData.icon,
            text: siteData.text,
            url: siteData.url,
            xuhao: oldData.xuhao || 0
        });
        return true;
    } catch (error) {
        console.error('更新站点失败:', error);
        return false;
    }
}

// 删除单个站点并重排序号
async function deleteSite(siteId) {
    try {
        const sitesRef = ref(database, 'zdfw');
        const snapshot = await get(sitesRef);
        
        if (!snapshot.exists()) return false;
        
        const sites = snapshot.val();
        const deletedXuhao = sites[siteId]?.xuhao || 0;
        delete sites[siteId];
        
        // 重排序号：大于删除项序号的都减1
        Object.keys(sites).forEach(key => {
            if (sites[key].xuhao > deletedXuhao) {
                sites[key].xuhao--;
            }
        });
        
        await set(sitesRef, sites);
        return true;
    } catch (error) {
        console.error('删除站点失败:', error);
        return false;
    }
}

// 批量更新站点序号
async function updateSiteOrders(orderData) {
    try {
        const sitesRef = ref(database, 'zdfw');
        const snapshot = await get(sitesRef);
        
        if (!snapshot.exists()) return false;
        
        const sites = snapshot.val();
        
        // 更新序号
        orderData.forEach(item => {
            if (sites[item.id]) {
                sites[item.id].xuhao = item.xuhao;
            }
        });
        
        await set(sitesRef, sites);
        return true;
    } catch (error) {
        console.error('更新站点序号失败:', error);
        return false;
    }
}

// 记录访客访问
async function recordVisit() {
    try {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hour = String(now.getHours()).padStart(2, '0');
        
        const timeNode = `${year}-${month}-${day} ${hour}`;
        
        const timeRef = ref(database, `number/${timeNode}`);
        const snapshot = await get(timeRef);
        
        const currentCount = snapshot.exists() ? snapshot.val() : 0;
        await set(timeRef, currentCount + 1);
        
        return true;
    } catch (error) {
        console.error('记录访客失败:', error);
        return false;
    }
}

// 获取访客统计数据
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
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const thisMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1);
        const lastMonthStr = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;
        
        let todayVisitors = 0;
        let monthVisitors = 0;
        let totalVisitors = 0;
        let lastMonthVisitors = 0;
        
        Object.entries(allData).forEach(([timeNode, count]) => {
            totalVisitors += count;
            
            if (timeNode.startsWith(todayStr)) {
                todayVisitors += count;
            }
            
            if (timeNode.startsWith(thisMonthStr)) {
                monthVisitors += count;
            }
            
            if (timeNode.startsWith(lastMonthStr)) {
                lastMonthVisitors += count;
            }
        });
        
        let monthGrowthRate;
        if (lastMonthVisitors === 0) {
            monthGrowthRate = monthVisitors > 0 ? 100 : 0;
        } else {
            monthGrowthRate = ((monthVisitors - lastMonthVisitors) / lastMonthVisitors * 100).toFixed(1);
        }
        
        return {
            todayVisitors,
            monthVisitors,
            totalVisitors,
            monthGrowthRate,
            rawData: allData
        };
    } catch (error) {
        console.error('获取访客统计失败:', error);
        return null;
    }
}

// 清理所有监听器
function cleanupListeners() {
    if (listeners.settings) {
        off(listeners.settings);
        listeners.settings = null;
    }
    if (listeners.links) {
        off(listeners.links);
        listeners.links = null;
    }
    if (listeners.sites) {
        off(listeners.sites);
        listeners.sites = null;
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
    addLink,
    updateLink,
    deleteLink,
    updateLinkOrders,
    getSites,
    addSite,
    updateSite,
    deleteSite,
    updateSiteOrders,
    recordVisit,
    getVisitorStats,
    listenToSettings,
    listenToLinks,
    listenToSites,
    cleanupListeners
};