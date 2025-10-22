// Firebase实时数据管理 - 优化版
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
            
            // 重新渲染导航
            toubuNav.render();
            zhongjianNav.render();
            dibuNav.render();
            
            // 重新渲染当前页面
            if (currentSection === 'project') {
                projectModule.render();
            } else if (currentSection === 'links') {
                linksModule.render();
            }
            
            // 首次加载后的数据变化才触发刷新
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
            
            // 重新渲染当前页面
            if (currentSection === 'links' || currentSection === 'project') {
                if (currentSection === 'links') {
                    linksModule.render();
                }
                if (currentSection === 'project') {
                    projectModule.render();
                }
            }
        });
    },
    
    // 确保"其它资源"导航项存在
    async ensureOtherNavExists() {
        const other = this.xiangmuData.other;
        if (!other) {
            // 计算当前最大序号
            const maxXuhao = Object.values(this.xiangmuData)
                .filter(item => item && typeof item === 'object' && item.xuhao !== undefined)
                .map(item => item.xuhao)
                .reduce((max, xuhao) => Math.max(max, xuhao), 0);
            
            await this.updateNode('xiangmu/other', {
                name: '其它资源',
                icon: '📦',
                xuhao: maxXuhao + 1,
                weizhi: '底部',
                time: Date.now()
            });
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