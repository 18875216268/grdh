// Firebase数据库模块 - 支持镜像节点版 (v2.0)
const FirebaseModule = (function() {
    const firebaseConfig = {
        apiKey: "AIzaSyA0FUYw_qt1PRBklf-QvJscHFDh7oLKhb4",
        databaseURL: "https://server-d137e-default-rtdb.asia-southeast1.firebasedatabase.app"
    };

    firebase.initializeApp(firebaseConfig);
    const database = firebase.database();
    
    let refs = {};
    let isInitialized = false;
    let lastBiaozhiValue = undefined;

    function init(connectionCallback) {
        refs.connection = database.ref('.info/connected');
        refs.fuzeren = database.ref('/fuzeren');
        refs.peizhi = database.ref('/peizhi');
        refs.biaozhi = database.ref('/peizhi/biaozhi');
        refs.gongshi = database.ref('/peizhi/config/bi/gongshi');
        refs.shijian = database.ref('/peizhi/shijian');
        refs.jindu = database.ref('/peizhi/jindu');
        refs.jingxiang = database.ref('/peizhi/jingxiang');
        
        refs.connection.on('value', (snapshot) => connectionCallback(snapshot.val()));
        
        initializeData();
    }

    function initializeData() {
        Promise.all([
            refs.fuzeren.once('value'),
            refs.peizhi.once('value'),
            refs.jingxiang.once('value')
        ]).then(([fuzerenSnapshot, peizhiSnapshot, jingxiangSnapshot]) => {
            const fuzerenData = fuzerenSnapshot.val();
            const peizhiData = peizhiSnapshot.val() || {};
            const jingxiangData = jingxiangSnapshot.val();
            
            lastBiaozhiValue = peizhiData.biaozhi;
            
            const configBi = peizhiData.config?.bi;
            if (!configBi || configBi.gongshi === undefined) {
                database.ref('/peizhi/config/bi/gongshi').set('');
            }
            
            const updates = {};
            const now = new Date();
            
            if (!peizhiData.hasOwnProperty('shijian')) {
                updates['/peizhi/shijian'] = formatDateTime(now);
            }
            
            if (!peizhiData.hasOwnProperty('jindu')) {
                const currentDay = now.getDate() - 1;
                const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
                const percentage = Math.round((currentDay / daysInMonth) * 100);
                updates['/peizhi/jindu'] = `${percentage}%`;
            }
            
            if (Object.keys(updates).length > 0) {
                database.ref().update(updates);
            }
            
            // 使用XinxiModule更新显示
            XinxiModule.updateDataTime(
                updates['/peizhi/shijian'] || peizhiData.shijian,
                updates['/peizhi/jindu'] || peizhiData.jindu
            );
            
            checkAndUpdateFieldConfigs(fuzerenData, jingxiangData, peizhiData);
            
            // 使用XinxiModule更新状态
            XinxiModule.updateConnectionStatus(true);
            
            if (!isInitialized) {
                setupRealtimeListeners();
                isInitialized = true;
                
                if (typeof TableModule !== 'undefined') {
                    TableModule.init();
                }
                
                setTimeout(() => {
                    if (typeof JisuanModule !== 'undefined') {
                        JisuanModule.init();
                    }
                }, 1000);
            }
        });
    }

    function formatDateTime(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
    }

    // 提取所有字段（包含镜像节点字段）
    function extractAllFields(fuzerenData, jingxiangData) {
        const fieldsSet = new Set(['name']);
        
        // 提取原始数据字段
        if (fuzerenData) {
            Object.values(fuzerenData).forEach(person => {
                if (person.jieguo) {
                    Object.keys(person.jieguo).forEach(key => fieldsSet.add(key));
                }
            });
        }
        
        // 提取镜像数据字段
        if (jingxiangData) {
            Object.values(jingxiangData).forEach(person => {
                if (person.jieguo) {
                    Object.keys(person.jieguo).forEach(key => fieldsSet.add(key));
                }
            });
        }
        
        return Array.from(fieldsSet);
    }
    
    function calculateMaxOrder(data, type) {
        if (type === 'field') {
            const orders = Object.values(data || {}).filter(v => 
                typeof v === 'number' && isFinite(v)
            );
            return orders.length > 0 ? Math.max(...orders) : 0;
        } else if (type === 'operator') {
            const orders = Object.values(data || {}).map(d => d.order || 0);
            return Math.max(...orders, 0);
        }
        return 0;
    }
    
    function generateFieldConfig(fieldName, currentOrder, currentStatus) {
        const updates = {};
        
        if (!currentOrder.hasOwnProperty(fieldName) || 
            currentOrder[fieldName] == null ||
            !isFinite(currentOrder[fieldName])) {
            const maxOrder = calculateMaxOrder(currentOrder, 'field');
            updates[`/peizhi/shunxu/${fieldName}`] = maxOrder + 1;
        }
        
        if (!currentStatus.hasOwnProperty(fieldName) ||
            (currentStatus[fieldName] !== 0 && currentStatus[fieldName] !== 1)) {
            updates[`/peizhi/zhuangtai/${fieldName}`] = 1;
        }
        
        return updates;
    }
    
    function checkAndUpdateFieldConfigs(fuzerenData, jingxiangData, peizhiData) {
        if (!fuzerenData && !jingxiangData) return;
        
        const allFields = extractAllFields(fuzerenData, jingxiangData);
        const currentOrder = peizhiData.shunxu || {};
        const currentStatus = peizhiData.zhuangtai || {};
        const updates = {};
        
        allFields.forEach(field => {
            Object.assign(updates, generateFieldConfig(field, currentOrder, currentStatus));
        });
        
        if (Object.keys(updates).length > 0) {
            database.ref().update(updates);
        }
    }

    function setupRealtimeListeners() {
        refs.biaozhi.on('value', (snapshot) => {
            const biaozhiValue = snapshot.val();
            
            if (lastBiaozhiValue !== undefined && biaozhiValue !== lastBiaozhiValue) {
                const now = new Date();
                const currentDay = now.getDate() - 1;
                const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
                const percentage = Math.round((currentDay / daysInMonth) * 100);
                
                const timeStr = formatDateTime(now);
                const progressStr = `${percentage}%`;
                
                database.ref().update({
                    '/peizhi/shijian': timeStr,
                    '/peizhi/jindu': progressStr
                }).then(() => {
                    XinxiModule.updateDataTime(timeStr, progressStr);
                });
            }
            
            lastBiaozhiValue = biaozhiValue;
            
            if (biaozhiValue !== null) {
                Promise.all([
                    refs.fuzeren.once('value'),
                    refs.peizhi.once('value'),
                    refs.jingxiang.once('value')
                ]).then(([fuzerenSnapshot, peizhiSnapshot, jingxiangSnapshot]) => {
                    checkAndUpdateFieldConfigs(
                        fuzerenSnapshot.val(),
                        jingxiangSnapshot.val(),
                        peizhiSnapshot.val() || {}
                    );
                });
            }
        });
        
        refs.shijian.on('value', (snapshot) => {
            const shijian = snapshot.val();
            if (shijian) {
                refs.jindu.once('value', (jinduSnapshot) => {
                    const jindu = jinduSnapshot.val();
                    if (jindu) {
                        XinxiModule.updateDataTime(shijian, jindu);
                    }
                });
            }
        });
    }

    function reconnect() {
        Object.values(refs).forEach(ref => ref?.off());
        isInitialized = false;
        lastBiaozhiValue = undefined;
        init(...arguments);
    }

    // 删除字段（同时删除原始节点和镜像节点数据）
    function deleteField(fieldName) {
        if (fieldName === 'name') return;
        
        const updates = {};
        
        Promise.all([
            refs.fuzeren.once('value'),
            refs.jingxiang.once('value')
        ]).then(([fuzerenSnapshot, jingxiangSnapshot]) => {
            // 删除原始节点数据
            const fuzerenData = fuzerenSnapshot.val();
            if (fuzerenData) {
                Object.keys(fuzerenData).forEach(operatorId => {
                    updates[`/fuzeren/${operatorId}/jieguo/${fieldName}`] = null;
                });
            }
            
            // 删除镜像节点数据
            const jingxiangData = jingxiangSnapshot.val();
            if (jingxiangData) {
                Object.keys(jingxiangData).forEach(operatorId => {
                    updates[`/peizhi/jingxiang/${operatorId}/jieguo/${fieldName}`] = null;
                });
            }
            
            // 删除配置
            updates[`/peizhi/shunxu/${fieldName}`] = null;
            updates[`/peizhi/zhuangtai/${fieldName}`] = null;
            
            return database.ref().update(updates);
        }).then(() => {
            window.showToast(`字段 "${fieldName}" 已删除！`, 'success');
        }).catch(error => {
            window.showToast('删除失败: ' + error.message, 'error');
        });
    }

    function getFormula(callback) {
        database.ref('/peizhi/config/bi/gongshi').once('value', (snapshot) => {
            callback(snapshot.val() || '');
        });
    }

    function saveFormula(formula) {
        return database.ref('/peizhi/config/bi/gongshi').set(formula);
    }

    function getAllFuzerenData(callback) {
        refs.fuzeren.once('value', (snapshot) => {
            callback(snapshot.val());
        });
    }

    return {
        init,
        reconnect,
        deleteField,
        getBiaozhiRef: () => refs.biaozhi,
        getFormula,
        saveFormula,
        getAllFuzerenData,
        extractAllFields,
        calculateMaxOrder,
        generateFieldConfig
    };
})();