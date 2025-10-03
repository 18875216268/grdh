// ==========================================
// Firebase 数据管理模块 - 实时监听版
// ==========================================

const FirebaseModule = (() => {
    let database = null;
    let xinxiData = {};
    let ruanjiankuData = {};
    let onDataChange = null;
    
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
            let xinxiLoaded = false;
            let ruanjiankuLoaded = false;
            
            // 监听 xinxi
            window.firebaseDB.onValue(window.firebaseDB.ref(database, 'xinxi'), snapshot => {
                xinxiData = snapshot.val() || {};
                console.log('xinxi 更新:', Object.keys(xinxiData).length, '个配置');
                
                if (!xinxiLoaded) {
                    xinxiLoaded = true;
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
                    if (xinxiLoaded) resolve();
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
                    type: detectType(value.url),
                    time: value.time || Date.now(),
                    visits: value.visits || 0,
                    tougao: value.tougao || '匿名',
                    zhuangtai: value.zhuangtai || '有效'
                });
            }
        }
        
        return resources.sort((a, b) => b.time - a.time);
    }
    
    // 检测网盘类型
    function detectType(url) {
        if (!url) return '未分类';
        const lowerUrl = url.toLowerCase();
        
        for (const key in xinxiData) {
            const value = xinxiData[key];
            if (key !== 'tongyong' && value?.yuming) {
                const domains = value.yuming.split(',');
                for (let i = 0; i < domains.length; i++) {
                    const domain = domains[i].trim();
                    if (domain && lowerUrl.includes(domain.toLowerCase())) {
                        return value.name;
                    }
                }
            }
        }
        
        return '未分类';
    }
    
    // 获取网盘配置
    function getXinxiData() {
        return xinxiData;
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
                type: detectType(data.url),
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
        getXinxiData,
        setDataChangeCallback,
        updateVisits,
        addResource
    };
})();

window.FirebaseModule = FirebaseModule;