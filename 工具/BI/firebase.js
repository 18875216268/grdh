// Firebase数据库模块 - 更新调用xinxi模块 (v1.21)
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
        
        refs.connection.on('value', (snapshot) => connectionCallback(snapshot.val()));
        
        initializeData();
    }

    function initializeData() {
        Promise.all([
            refs.fuzeren.once('value'),
            refs.peizhi.once('value')
        ]).then(([fuzerenSnapshot, peizhiSnapshot]) => {
            const fuzerenData = fuzerenSnapshot.val();
            const peizhiData = peizhiSnapshot.val() || {};
            
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
            
            checkAndUpdateFieldConfigs(fuzerenData, peizhiData);
            
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

    function extractAllFields(fuzerenData) {
        if (!fuzerenData) return ['name'];
        
        const fieldsSet = new Set(['name']);
        Object.values(fuzerenData).forEach(person => {
            if (person.jieguo) {
                Object.keys(person.jieguo).forEach(key => fieldsSet.add(key));
            }
        });
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
            updates[`/peizhi/shunxu/${fieldName}`] = maxOrder + 1000;
        }
        
        if (!currentStatus.hasOwnProperty(fieldName) ||
            (currentStatus[fieldName] !== 0 && currentStatus[fieldName] !== 1)) {
            updates[`/peizhi/zhuangtai/${fieldName}`] = 1;
        }
        
        return updates;
    }
    
    function checkAndUpdateFieldConfigs(fuzerenData, peizhiData) {
        if (!fuzerenData) return;
        
        const allFields = extractAllFields(fuzerenData);
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
                    refs.peizhi.once('value')
                ]).then(([fuzerenSnapshot, peizhiSnapshot]) => {
                    checkAndUpdateFieldConfigs(
                        fuzerenSnapshot.val(),
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

    function deleteField(fieldName) {
        if (fieldName === 'name') return;
        
        const updates = {};
        
        refs.fuzeren.once('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                Object.keys(data).forEach(operatorId => {
                    updates[`/fuzeren/${operatorId}/jieguo/${fieldName}`] = null;
                });
            }
            
            updates[`/peizhi/shunxu/${fieldName}`] = null;
            updates[`/peizhi/zhuangtai/${fieldName}`] = null;
            
            database.ref().update(updates).then(() => {
                window.showToast(`字段 "${fieldName}" 已删除`, 'success');
            });
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