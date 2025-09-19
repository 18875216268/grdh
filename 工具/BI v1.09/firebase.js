// Firebase数据库模块 - 基于biaozhi同步版本（v1.06）
const FirebaseModule = (function() {
    const firebaseConfig = {
        apiKey: "AIzaSyA0FUYw_qt1PRBklf-QvJscHFDh7oLKhb4",
        databaseURL: "https://server-d137e-default-rtdb.asia-southeast1.firebasedatabase.app"
    };

    firebase.initializeApp(firebaseConfig);
    const database = firebase.database();
    
    let refs = {};
    let isInitialized = false;

    function init(connectionCallback) {
        // 初始化引用
        refs.connection = database.ref('.info/connected');
        refs.fuzeren = database.ref('/fuzeren');
        refs.peizhi = database.ref('/peizhi');
        refs.biaozhi = database.ref('/peizhi/biaozhi');
        
        // 监听连接状态
        refs.connection.on('value', (snapshot) => connectionCallback(snapshot.val()));
        
        initializeData();
    }

    function initializeData() {
        // 并行加载数据
        Promise.all([
            refs.fuzeren.once('value'),
            refs.peizhi.once('value')
        ]).then(([fuzerenSnapshot, peizhiSnapshot]) => {
            const fuzerenData = fuzerenSnapshot.val();
            const peizhiData = peizhiSnapshot.val() || {};
            
            // 初始化公式节点
            if (peizhiData.jisuan === undefined) {
                refs.peizhi.child('jisuan').set('');
            }
            
            // 初始化时检查配置
            checkAndUpdateFieldConfigs(fuzerenData, peizhiData);
            
            // 更新表格
            TableModule.setFieldOrder(peizhiData.shunxu);
            TableModule.setFieldStatus(peizhiData.zhuangtai);
            TableModule.updateTable(fuzerenData);
            updateStatus(true);
            
            if (!isInitialized) {
                setupRealtimeListeners();
                isInitialized = true;
                
                setTimeout(() => {
                    if (typeof JisuanModule !== 'undefined') {
                        JisuanModule.init();
                    }
                }, 1000);
            }
        });
    }

    // 统一字段提取函数
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

    // 简洁的配置检查函数
    function checkAndUpdateFieldConfigs(fuzerenData, peizhiData) {
        if (!fuzerenData) return;
        
        const allFields = extractAllFields(fuzerenData);
        const currentOrder = peizhiData.shunxu || {};
        const currentStatus = peizhiData.zhuangtai || {};
        const updates = {};
        
        // 获取当前最大顺序值
        const validOrders = Object.values(currentOrder).filter(v => 
            typeof v === 'number' && !isNaN(v) && isFinite(v)
        );
        const maxOrder = validOrders.length > 0 ? Math.max(...validOrders) : 0;
        let nextOrder = maxOrder + 1000;
        
        // 检查每个字段的配置
        allFields.forEach(field => {
            // 检查字段顺序配置
            const hasValidOrder = currentOrder.hasOwnProperty(field) && 
                                 currentOrder[field] !== null && 
                                 currentOrder[field] !== undefined &&
                                 typeof currentOrder[field] === 'number' &&
                                 !isNaN(currentOrder[field]) &&
                                 isFinite(currentOrder[field]);
            
            // 检查字段状态配置
            const hasValidStatus = currentStatus.hasOwnProperty(field) && 
                                  currentStatus[field] !== null && 
                                  currentStatus[field] !== undefined &&
                                  (currentStatus[field] === 0 || currentStatus[field] === 1);
            
            // 补充缺失的顺序配置
            if (!hasValidOrder) {
                updates[`/peizhi/shunxu/${field}`] = nextOrder;
                console.log(`自动分配顺序: ${field} = ${nextOrder}`);
                nextOrder += 1000;
            }
            
            // 补充缺失的状态配置（默认显示）
            if (!hasValidStatus) {
                updates[`/peizhi/zhuangtai/${field}`] = 1;
                console.log(`自动分配状态: ${field} = 1`);
            }
        });
        
        // 执行更新
        if (Object.keys(updates).length > 0) {
            console.log('执行配置补充:', updates);
            database.ref().update(updates);
        }
    }

    function setupRealtimeListeners() {
        console.log('设置实时监听器 - 混合模式：表格实时更新 + biaozhi配置同步');
        
        // 保持原有的fuzeren监听器 - 用于表格实时更新
        refs.fuzeren.on('value', (snapshot) => {
            const fuzerenData = snapshot.val();
            globalData = fuzerenData || {};
            
            console.log('fuzeren数据变化 - 立即更新表格');
            
            // 立即更新表格数据，不影响用户体验
            TableModule.updateTable(fuzerenData);
            
            // 移除了对LiebiaoModule.handleDataChange的调用
            // 设置列表现在直接监听peizhi节点，不需要通过fuzeren触发
        });
        
        // 新增：监听biaozhi变化作为配置同步信号
        refs.biaozhi.on('value', (snapshot) => {
            const biaozhiValue = snapshot.val();
            console.log('biaozhi变化触发配置同步检查:', biaozhiValue);
            
            if (biaozhiValue !== null) {
                // biaozhi更新说明其他程序的所有操作已完成，现在安全进行配置检查
                Promise.all([
                    refs.fuzeren.once('value'),
                    refs.peizhi.once('value')
                ]).then(([fuzerenSnapshot, peizhiSnapshot]) => {
                    const fuzerenData = fuzerenSnapshot.val();
                    const peizhiData = peizhiSnapshot.val() || {};
                    
                    console.log('biaozhi同步 - 配置检查开始:', {
                        personCount: fuzerenData ? Object.keys(fuzerenData).length : 0,
                        configKeys: Object.keys(peizhiData)
                    });
                    
                    // 只执行配置检查，不更新表格（表格由fuzeren监听器负责）
                    // 也不需要通知设置列表（设置列表直接监听peizhi）
                    checkAndUpdateFieldConfigs(fuzerenData, peizhiData);
                });
            }
        });
        
        // 保留原有的配置变化监听 - 用于表格字段显示同步
        refs.peizhi.child('shunxu').on('value', (snapshot) => {
            console.log('字段顺序配置变化');
            TableModule.setFieldOrder(snapshot.val());
        });
        
        refs.peizhi.child('zhuangtai').on('value', (snapshot) => {
            console.log('字段状态配置变化');
            TableModule.setFieldStatus(snapshot.val());
        });
    }

    function reconnect() {
        Object.values(refs).forEach(ref => ref?.off());
        isInitialized = false;
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
            
            // 删除配置
            updates[`/peizhi/shunxu/${fieldName}`] = null;
            updates[`/peizhi/zhuangtai/${fieldName}`] = null;
            
            // 执行删除
            database.ref().update(updates).then(() => {
                window.showToast(`字段 "${fieldName}" 已删除`, 'success');
            });
        });
    }

    function getBiaozhiRef() {
        return refs.biaozhi;
    }

    function toggleBiaozhi() {
        const timestamp = Date.now();
        console.log('触发biaozhi同步信号:', timestamp);
        refs.biaozhi.set(timestamp);
    }

    function getFormula(callback) {
        refs.peizhi.child('jisuan').once('value', (snapshot) => {
            callback(snapshot.val() || '');
        });
    }

    function saveFormula(formula) {
        return refs.peizhi.child('jisuan').set(formula);
    }

    function getAllFuzerenData(callback) {
        refs.fuzeren.once('value', (snapshot) => {
            callback(snapshot.val());
        });
    }

    function getMaxOrder(callback) {
        refs.peizhi.child('shunxu').once('value', (snapshot) => {
            const orders = snapshot.val() || {};
            const validOrders = Object.values(orders).filter(v => 
                typeof v === 'number' && !isNaN(v) && isFinite(v)
            );
            const maxOrder = validOrders.length > 0 ? Math.max(...validOrders) : 0;
            callback(maxOrder);
        });
    }

    return {
        init,
        reconnect,
        deleteField,
        getBiaozhiRef,
        toggleBiaozhi,
        getFormula,
        saveFormula,
        getAllFuzerenData,
        getMaxOrder,
        extractAllFields
    };
})();