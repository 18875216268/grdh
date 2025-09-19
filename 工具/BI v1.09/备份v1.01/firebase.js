// Firebase数据库模块 - 全面更新版（v1.06）- 统一使用name字段
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
            
            // 检查并补充字段配置（初始化时使用立即检查）
            checkAndUpdateFieldConfigs(fuzerenData, peizhiData);
            
            // 更新表格
            TableModule.setFieldOrder(peizhiData.shunxu);
            TableModule.setFieldStatus(peizhiData.zhuangtai);
            TableModule.updateTable(fuzerenData);
            updateStatus(true);
            
            if (!isInitialized) {
                setupRealtimeListeners();
                isInitialized = true;
                
                // 延迟初始化计算模块
                setTimeout(() => {
                    if (typeof JisuanModule !== 'undefined') {
                        JisuanModule.init();
                    }
                }, 1000);
            }
        });
    }

    // 统一字段提取函数 - 统一使用name字段
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

    // 检查并补充字段配置 - 统一使用name字段
    function checkAndUpdateFieldConfigs(fuzerenData, peizhiData) {
        if (!fuzerenData) return;
        
        const allFields = extractAllFields(fuzerenData);
        const currentOrder = peizhiData.shunxu || {};
        const currentStatus = peizhiData.zhuangtai || {};
        const updates = {};
        
        // 获取当前最大顺序值，只考虑有效的数字值
        const validOrders = Object.values(currentOrder).filter(v => 
            typeof v === 'number' && !isNaN(v) && isFinite(v)
        );
        const maxOrder = validOrders.length > 0 ? Math.max(...validOrders) : 0;
        let nextOrder = maxOrder + 1000;
        
        // 检查每个字段的配置
        allFields.forEach(field => {
            // 严格检查字段顺序配置：只有真正不存在或值无效时才分配
            const hasValidOrder = currentOrder.hasOwnProperty(field) && 
                                 currentOrder[field] !== null && 
                                 currentOrder[field] !== undefined &&
                                 typeof currentOrder[field] === 'number' &&
                                 !isNaN(currentOrder[field]) &&
                                 isFinite(currentOrder[field]);
            
            // 严格检查字段状态配置
            const hasValidStatus = currentStatus.hasOwnProperty(field) && 
                                  currentStatus[field] !== null && 
                                  currentStatus[field] !== undefined &&
                                  (currentStatus[field] === 0 || currentStatus[field] === 1);
            
            // 补充缺失的顺序配置
            if (!hasValidOrder) {
                updates[`/peizhi/shunxu/${field}`] = nextOrder;
                nextOrder += 1000;
            }
            
            // 补充缺失的状态配置（默认显示）
            if (!hasValidStatus) {
                updates[`/peizhi/zhuangtai/${field}`] = 1;
            }
        });
        
        // 执行更新
        if (Object.keys(updates).length > 0) {
            database.ref().update(updates);
        }
    }

    function setupRealtimeListeners() {
        // 监听负责人数据变化 - 延时读取配置
        refs.fuzeren.on('value', (snapshot) => {
            const fuzerenData = snapshot.val();
            globalData = fuzerenData || {};
            
            // 立即更新表格数据，不影响用户体验
            TableModule.updateTable(fuzerenData);
            
            // 通知字段管理模块
            if (typeof LiebiaoModule !== 'undefined' && LiebiaoModule.handleDataChange) {
                LiebiaoModule.handleDataChange(fuzerenData);
            }
            
            // 延时读取配置并检查字段 - 解决竞争条件问题
            if (fuzerenData) {
                setTimeout(() => {
                    refs.peizhi.once('value', (peizhiSnapshot) => {
                        const latestPeizhiData = peizhiSnapshot.val() || {};
                        checkAndUpdateFieldConfigs(fuzerenData, latestPeizhiData);
                    });
                }, 200); // 200ms延时，确保其他程序的配置写入完成
            }
        });
        
        // 监听字段配置变化
        refs.peizhi.child('shunxu').on('value', (snapshot) => {
            TableModule.setFieldOrder(snapshot.val());
        });
        
        refs.peizhi.child('zhuangtai').on('value', (snapshot) => {
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
        
        // 删除所有负责人的该字段数据
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
        return refs.peizhi.child('biaozhi');
    }

    function toggleBiaozhi() {
        refs.peizhi.child('biaozhi').set(Date.now());
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
            // 只考虑有效的数字顺序值
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
        extractAllFields  // 导出统一的字段提取函数
    };
})();