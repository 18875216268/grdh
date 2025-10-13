// Firebase实时数据管理
const firebase = {
    xiangmuData: {},
    ruanjiankuData: {},
    xiangmuListener: null,
    ruanjiankuListener: null,
    isFirstXiangmuLoad: true,
    
    initRealtimeSync() {
        utils.updateConnectionStatus('loading');
        
        // 监听项目配置
        const xiangmuRef = window.firebaseDB.ref(window.firebaseDB.database, 'xiangmu');
        this.xiangmuListener = window.firebaseDB.onValue(xiangmuRef, (snapshot) => {
            this.xiangmuData = snapshot.val() || {};
            
            this.ensureOtherNavExists();
            
            zhongjianNav.render();
            dibuNav.render();
            
            if (currentSection === 'project') {
                projectModule.render();
            } else if (currentSection === 'links') {
                linksModule.render();
            }
            
            if (!this.isFirstXiangmuLoad) {
                zujianModule.refresh();
            }
            this.isFirstXiangmuLoad = false;
            
            utils.updateConnectionStatus('connected');
        });
        
        // 监听资源库
        const ruanjiankuRef = window.firebaseDB.ref(window.firebaseDB.database, 'ruanjianku');
        this.ruanjiankuListener = window.firebaseDB.onValue(ruanjiankuRef, (snapshot) => {
            this.ruanjiankuData = snapshot.val() || {};
            this.fillBasicFields();
            
            if (currentSection === 'links' || currentSection === 'project') {
                linksModule.render();
                projectModule.render();
            }
        });
    },
    
    // 确保"其它资源"导航项存在
    async ensureOtherNavExists() {
        const other = this.xiangmuData.other;
        if (!other) {
            await this.updateNode('xiangmu/other', {
                name: '其它资源',
                icon: '📦',
                xuhao: 0,
                time: Date.now()
            });
        } else if (other.xuhao !== 0) {
            await this.updateNode('xiangmu/other/xuhao', 0);
        }
    },
    
    // 补充基础缺失字段
    async fillBasicFields() {
        const updates = {};
        
        for (const [key, value] of Object.entries(this.ruanjiankuData)) {
            if (value && typeof value === 'object') {
                if (!value.time) updates[`ruanjianku/${key}/time`] = Date.now();
                if (!value.zhuangtai) updates[`ruanjianku/${key}/zhuangtai`] = '有效';
                if (!value.shenhe) updates[`ruanjianku/${key}/shenhe`] = '已审';
                if (!value.tougao) updates[`ruanjianku/${key}/tougao`] = '木小匣';
            }
        }
        
        if (Object.keys(updates).length > 0) {
            await this.batchUpdate(updates);
        }
    },
    
    // 统一的更新方法
    async updateNode(path, value) {
        utils.updateConnectionStatus('loading');
        try {
            const updates = { [path]: value };
            await window.firebaseDB.update(window.firebaseDB.ref(window.firebaseDB.database), updates);
            utils.updateConnectionStatus('connected');
            Toast.show('保存成功', 'success');
            return true;
        } catch (error) {
            console.error('更新失败:', error);
            utils.updateConnectionStatus('disconnected');
            Toast.show('保存失败，请重试', 'error');
            return false;
        }
    },
    
    // 批量更新方法（不显示Toast）
    async batchUpdate(updates) {
        utils.updateConnectionStatus('loading');
        try {
            await window.firebaseDB.update(window.firebaseDB.ref(window.firebaseDB.database), updates);
            utils.updateConnectionStatus('connected');
            return true;
        } catch (error) {
            console.error('批量更新失败:', error);
            utils.updateConnectionStatus('disconnected');
            Toast.show('更新失败，请重试', 'error');
            return false;
        }
    },
    
    // 统一的删除方法
    async deleteNode(path) {
        utils.updateConnectionStatus('loading');
        try {
            await window.firebaseDB.remove(window.firebaseDB.ref(window.firebaseDB.database, path));
            utils.updateConnectionStatus('connected');
            Toast.show('删除成功！', 'success');
            return true;
        } catch (error) {
            console.error('删除失败:', error);
            utils.updateConnectionStatus('disconnected');
            Toast.show('删除失败，请重试', 'error');
            return false;
        }
    },
    
    cleanup() {
        if (this.xiangmuListener) {
            this.xiangmuListener();
            this.xiangmuListener = null;
        }
        if (this.ruanjiankuListener) {
            this.ruanjiankuListener();
            this.ruanjiankuListener = null;
        }
    }
};