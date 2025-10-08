// Firebase实时数据管理
const firebase = {
    xinxiData: {},
    ruanjiankuData: {},
    xinxiListener: null,
    ruanjiankuListener: null,
    
    initRealtimeSync() {
        utils.updateConnectionStatus('loading', '连接中...');
        
        const xinxiRef = window.firebaseDB.ref(window.firebaseDB.database, 'xinxi');
        this.xinxiListener = window.firebaseDB.onValue(xinxiRef, (snapshot) => {
            const data = snapshot.val() || {};
            this.xinxiData = data;
            
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
            
            zhongjianNav.generateCategories();
            zhongjianNav.render();
            
            if (currentSection === 'domain') {
                domainModule.render();
            } else if (currentSection === 'filter') {
                filterModule.render();
            } else if (currentSection === 'links') {
                linksModule.render();
            }
            
            utils.updateConnectionStatus('connected', '已连接');
        }, (error) => {
            console.error('xinxi数据监听失败:', error);
            utils.updateConnectionStatus('disconnected', '连接失败');
        });
        
        const ruanjiankuRef = window.firebaseDB.ref(window.firebaseDB.database, 'ruanjianku');
        this.ruanjiankuListener = window.firebaseDB.onValue(ruanjiankuRef, (snapshot) => {
            const data = snapshot.val() || {};
            this.ruanjiankuData = data;
            
            let needUpdate = false;
            const updates = {};
            
            for (const [key, value] of Object.entries(data)) {
                if (value && typeof value === 'object') {
                    if (!value.time) {
                        updates[`ruanjianku/${key}/time`] = Date.now();
                        needUpdate = true;
                    }
                    if (!value.zhuangtai) {
                        updates[`ruanjianku/${key}/zhuangtai`] = '有效';
                        needUpdate = true;
                    }
                    if (!value.shenhe) {
                        updates[`ruanjianku/${key}/shenhe`] = '已审';
                        needUpdate = true;
                    }
                    if (!value.tougao) {
                        updates[`ruanjianku/${key}/tougao`] = '木小匣';
                        needUpdate = true;
                    }
                }
            }
            
            if (needUpdate) {
                window.firebaseDB.update(window.firebaseDB.ref(window.firebaseDB.database), updates);
            }
            
            zhongjianNav.generateCategories();
            zhongjianNav.render();
            
            if (currentSection === 'links') {
                linksModule.render();
            } else if (currentSection === 'status') {
                statusModule.render();
            }
        }, (error) => {
            console.error('ruanjianku数据监听失败:', error);
        });
    },
    
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
    
    async deleteXinxiNode(path) {
        utils.updateConnectionStatus('loading', '删除中...');
        
        try {
            await window.firebaseDB.remove(window.firebaseDB.ref(window.firebaseDB.database, `xinxi/${path}`));
            utils.updateConnectionStatus('connected', '已连接');
            Toast.show('删除成功！', 'success');
            return true;
        } catch (error) {
            console.error('删除失败:', error);
            utils.updateConnectionStatus('disconnected', '删除失败');
            Toast.show('删除失败，请重试', 'error');
            return false;
        }
    },
    
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
    
    async deleteRuanjiankuNode(path) {
        utils.updateConnectionStatus('loading', '删除中...');
        
        try {
            await window.firebaseDB.remove(window.firebaseDB.ref(window.firebaseDB.database, `ruanjianku/${path}`));
            utils.updateConnectionStatus('connected', '已连接');
            Toast.show('删除成功！', 'success');
            return true;
        } catch (error) {
            console.error('删除失败:', error);
            utils.updateConnectionStatus('disconnected', '删除失败');
            Toast.show('删除失败，请重试', 'error');
            return false;
        }
    },
    
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