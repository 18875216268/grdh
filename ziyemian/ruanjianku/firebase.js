// ==========================================
// Firebase 数据管理模块 - xiangmu架构
// ==========================================

const FirebaseModule = (() => {
    let database = null;
    let xiangmuData = {};
    let ruanjiankuData = {};
    let onDataChange = null;
    let passwordCache = {};
    
    // 初始化
    async function init() {
        await waitForFirebase();
        database = window.firebaseDB.database;
        await startRealtimeListeners();
    }
    
    // 等待 Firebase SDK 加载
    function waitForFirebase() {
        return new Promise(resolve => {
            const check = setInterval(() => {
                if (window.firebaseDB) {
                    clearInterval(check);
                    resolve();
                }
            }, 50);
        });
    }
    
    // 启动实时监听器
    function startRealtimeListeners() {
        return new Promise(resolve => {
            let xiangmuLoaded = false;
            let ruanjiankuLoaded = false;
            
            // 监听 xiangmu
            window.firebaseDB.onValue(window.firebaseDB.ref(database, 'xiangmu'), snapshot => {
                xiangmuData = snapshot.val() || {};
                console.log('xiangmu 更新:', Object.keys(xiangmuData).length, '个导航项');
                
                if (!xiangmuLoaded) {
                    xiangmuLoaded = true;
                    if (ruanjiankuLoaded) resolve();
                } else if (onDataChange) {
                    onDataChange();
                }
            });
            
            // 监听 ruanjianku
            window.firebaseDB.onValue(window.firebaseDB.ref(database, 'ruanjianku'), snapshot => {
                ruanjiankuData = snapshot.val() || {};
                console.log('ruanjianku 更新:', Object.keys(ruanjiankuData).length, '个资源');
                
                if (!ruanjiankuLoaded) {
                    ruanjiankuLoaded = true;
                    if (xiangmuLoaded) resolve();
                } else if (onDataChange) {
                    onDataChange();
                }
            });
        });
    }
    
    // 获取处理后的资源列表
    function getResources() {
        const resources = [];
        
        for (const key in ruanjiankuData) {
            const value = ruanjiankuData[key];
            if (value?.shenhe === '已审') {
                resources.push({
                    id: key,
                    name: value.name || '未命名',
                    url: value.url || '',
                    daohang: value.daohang || 'other',
                    type: value.type || '*',
                    time: value.time || Date.now(),
                    visits: value.visits || 0,
                    tougao: value.tougao || '匿名',
                    zhuangtai: value.zhuangtai || '有效'
                });
            }
        }
        
        // 【优化】移除此处的时间排序，由调用方决定排序逻辑
        return resources;
    }
    
    // 获取导航项配置
    function getXiangmuData() {
        return xiangmuData;
    }
    
    // 根据URL自动判断导航和类型
    function detectNavAndType(url) {
        if (!url) return { daohang: 'other', type: '*' };
        
        const lowerUrl = url.toLowerCase();
        
        // 遍历所有导航项
        for (const navKey in xiangmuData) {
            const navData = xiangmuData[navKey];
            if (!navData) continue;
            
            // 遍历导航项下的资源类型
            for (const typeKey in navData) {
                const typeData = navData[typeKey];
                
                // 跳过非资源类型字段
                if (typeof typeData !== 'object' || !typeData.yuming) continue;
                
                const domains = typeData.yuming.split(',');
                for (const domain of domains) {
                    const trimmedDomain = domain.trim().toLowerCase();
                    if (trimmedDomain && lowerUrl.includes(trimmedDomain)) {
                        return { daohang: navKey, type: typeKey };
                    }
                }
            }
        }
        
        return { daohang: 'other', type: '*' };
    }
    
    // 验证密码
    function verifyPassword(navKey, password) {
        const navData = xiangmuData[navKey];
        if (!navData) return false;
        
        const mima = navData.mima || '';
        
        // 无密码直接通过
        if (!mima) {
            passwordCache[navKey] = true;
            return true;
        }
        
        // 验证密码
        if (password === mima) {
            passwordCache[navKey] = true;
            return true;
        }
        
        return false;
    }
    
    // 检查是否已验证
    function isPasswordVerified(navKey) {
        const navData = xiangmuData[navKey];
        if (!navData) return true;
        
        const mima = navData.mima || '';
        return !mima || passwordCache[navKey] === true;
    }
    
    // 设置数据变化回调
    function setDataChangeCallback(callback) {
        onDataChange = callback;
    }
    
    // 更新访问次数
    async function updateVisits(id, visits) {
        try {
            const ref = window.firebaseDB.ref(database, `ruanjianku/${id}/visits`);
            await window.firebaseDB.set(ref, parseInt(visits || 0) + 1);
            return true;
        } catch (error) {
            console.error('更新访问次数失败:', error);
            return false;
        }
    }
    
    // 添加资源
    async function addResource(data) {
        try {
            const id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
            const ref = window.firebaseDB.ref(database, `ruanjianku/${id}`);
            await window.firebaseDB.set(ref, {
                name: data.name,
                url: data.url,
                daohang: data.daohang,
                type: data.type,
                time: Date.now(),
                visits: 0,
                tougao: data.tougao,
                shenhe: '未审',
                zhuangtai: '有效'
            });
            return true;
        } catch (error) {
            console.error('添加资源失败:', error);
            return false;
        }
    }
    
    return {
        init,
        getResources,
        getXiangmuData,
        detectNavAndType,
        verifyPassword,
        isPasswordVerified,
        setDataChangeCallback,
        updateVisits,
        addResource
    };
})();

window.FirebaseModule = FirebaseModule;