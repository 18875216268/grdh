// Firebase实时数据管理
const firebase = {
    xinxiData: {},
    ruanjiankuData: {},
    xinxiListener: null,
    ruanjiankuListener: null,
    
    // 初始化实时监听
    initRealtimeSync() {
        utils.updateConnectionStatus('loading', '连接中...');
        
        // 监听xinxi数据
        const xinxiRef = window.firebaseDB.ref(window.firebaseDB.database, 'xinxi');
        this.xinxiListener = window.firebaseDB.onValue(xinxiRef, (snapshot) => {
            const data = snapshot.val() || {};
            this.xinxiData = data;
            
            // 自动补充缺失的time字段
            let needUpdate = false;
            const updates = {};
            
            for (const [key, value] of Object.entries(data)) {
                if (key !== 'tongyong' && value && typeof value === 'object' && !value.time) {
                    updates[`xinxi/${key}/time`] = Date.now();
                    needUpdate = true;
                }
                if (value && value.guize && !value.guize.time) {
                    updates[`xinxi/${key}/guize/time`] = Date.now();
                    needUpdate = true;
                }
            }
            
            if (data.tongyong && !data.tongyong.time) {
                updates['xinxi/tongyong/time'] = Date.now();
                needUpdate = true;
            }
            
            if (needUpdate) {
                window.firebaseDB.update(window.firebaseDB.ref(window.firebaseDB.database), updates);
            }
            
            // 渲染当前页面
            if (currentSection === 'domain') {
                domainModule.render();
            } else if (currentSection === 'filter') {
                filterModule.render();
            }
            
            utils.updateConnectionStatus('connected', '已连接');
        }, (error) => {
            console.error('xinxi数据监听失败:', error);
            utils.updateConnectionStatus('disconnected', '连接失败');
        });
        
        // 监听ruanjianku数据
        const ruanjiankuRef = window.firebaseDB.ref(window.firebaseDB.database, 'ruanjianku');
        this.ruanjiankuListener = window.firebaseDB.onValue(ruanjiankuRef, (snapshot) => {
            const data = snapshot.val() || {};
            this.ruanjiankuData = data;
            
            // 自动补充缺失的time字段
            let needUpdate = false;
            const updates = {};
            
            for (const [key, value] of Object.entries(data)) {
                if (value && typeof value === 'object' && !value.time) {
                    updates[`ruanjianku/${key}/time`] = Date.now();
                    needUpdate = true;
                }
            }
            
            if (needUpdate) {
                window.firebaseDB.update(window.firebaseDB.ref(window.firebaseDB.database), updates);
            }
            
            // 渲染链接页面
            if (currentSection === 'links') {
                linksModule.render();
            }
        }, (error) => {
            console.error('ruanjianku数据监听失败:', error);
        });
    },
    
    // 更新xinxi特定节点
    async updateXinxiNode(path, value) {
        utils.updateConnectionStatus('loading', '保存中...');
        
        try {
            const updates = {};
            updates[`xinxi/${path}`] = value;
            await window.firebaseDB.update(window.firebaseDB.ref(window.firebaseDB.database), updates);
            utils.updateConnectionStatus('connected', '已连接');
            Toast.show('保存成功', 'success');
            return true;
        } catch (error) {
            console.error('更新失败:', error);
            utils.updateConnectionStatus('disconnected', '保存失败');
            Toast.show('保存失败，请重试', 'error');
            return false;
        }
    },
    
    // 删除xinxi节点
    async deleteXinxiNode(path) {
        utils.updateConnectionStatus('loading', '删除中...');
        
        try {
            await window.firebaseDB.remove(window.firebaseDB.ref(window.firebaseDB.database, `xinxi/${path}`));
            utils.updateConnectionStatus('connected', '已连接');
            Toast.show('删除成功', 'success');
            return true;
        } catch (error) {
            console.error('删除失败:', error);
            utils.updateConnectionStatus('disconnected', '删除失败');
            Toast.show('删除失败，请重试', 'error');
            return false;
        }
    },
    
    // 批量更新xinxi序号 - 修复：添加通知
    async updateXinxiOrders(orderUpdates) {
        try {
            const updates = {};
            for (const [key, xuhao] of Object.entries(orderUpdates)) {
                updates[`xinxi/${key}/xuhao`] = xuhao;
            }
            await window.firebaseDB.update(window.firebaseDB.ref(window.firebaseDB.database), updates);
            Toast.show('排序已更新', 'success');
            return true;
        } catch (error) {
            console.error('更新序号失败:', error);
            Toast.show('排序更新失败', 'error');
            return false;
        }
    },
    
    // 更新ruanjianku特定节点
    async updateRuanjiankuNode(path, value) {
        utils.updateConnectionStatus('loading', '保存中...');
        
        try {
            const updates = {};
            updates[`ruanjianku/${path}`] = value;
            await window.firebaseDB.update(window.firebaseDB.ref(window.firebaseDB.database), updates);
            utils.updateConnectionStatus('connected', '已连接');
            Toast.show('保存成功', 'success');
            return true;
        } catch (error) {
            console.error('更新失败:', error);
            utils.updateConnectionStatus('disconnected', '保存失败');
            Toast.show('保存失败，请重试', 'error');
            return false;
        }
    },
    
    // 删除ruanjianku节点
    async deleteRuanjiankuNode(path) {
        utils.updateConnectionStatus('loading', '删除中...');
        
        try {
            await window.firebaseDB.remove(window.firebaseDB.ref(window.firebaseDB.database, `ruanjianku/${path}`));
            utils.updateConnectionStatus('connected', '已连接');
            Toast.show('删除成功', 'success');
            return true;
        } catch (error) {
            console.error('删除失败:', error);
            utils.updateConnectionStatus('disconnected', '删除失败');
            Toast.show('删除失败，请重试', 'error');
            return false;
        }
    },
    
    // 清理监听器
    cleanup() {
        if (this.xinxiListener) {
            this.xinxiListener();
            this.xinxiListener = null;
        }
        if (this.ruanjiankuListener) {
            this.ruanjiankuListener();
            this.ruanjiankuListener = null;
        }
    }
};