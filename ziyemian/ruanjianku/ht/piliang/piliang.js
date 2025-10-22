// 批量操作模块
const piliangModule = {
    selectedKeys: new Set(),
    lastSelectedKey: null,
    isSelectAllActive: false,
    
    // 初始化
    init() {
        this.updateButtonStates();
        this.updateSelectAllButton();
    },
    
    // 处理卡片点击
    handleCardClick(key, event) {
        event.stopPropagation();
        
        const card = event.currentTarget;
        const allCards = this.getCurrentCards();
        
        // Shift连续选择
        if (event.shiftKey && this.lastSelectedKey) {
            const keys = allCards.map(c => c.dataset.key);
            const lastIndex = keys.indexOf(this.lastSelectedKey);
            const currentIndex = keys.indexOf(key);
            
            if (lastIndex !== -1 && currentIndex !== -1) {
                const start = Math.min(lastIndex, currentIndex);
                const end = Math.max(lastIndex, currentIndex);
                
                for (let i = start; i <= end; i++) {
                    this.selectedKeys.add(keys[i]);
                }
            }
        }
        // Ctrl多选
        else if (event.ctrlKey || event.metaKey) {
            if (this.selectedKeys.has(key)) {
                this.selectedKeys.delete(key);
            } else {
                this.selectedKeys.add(key);
            }
            this.lastSelectedKey = key;
        }
        // 单选
        else {
            if (this.selectedKeys.has(key) && this.selectedKeys.size === 1) {
                this.selectedKeys.clear();
                this.lastSelectedKey = null;
            } else {
                this.selectedKeys.clear();
                this.selectedKeys.add(key);
                this.lastSelectedKey = key;
            }
        }
        
        this.updateCardsSelection();
        this.updateButtonStates();
        this.updateSelectAllButton();
    },
    
    // 获取当前页面的所有卡片
    getCurrentCards() {
        if (currentSection === 'project') {
            return Array.from(document.querySelectorAll('#projectCardsGrid .project-card'));
        } else if (currentSection === 'links') {
            return Array.from(document.querySelectorAll('#linksCardsGrid .link-card'));
        }
        return [];
    },
    
    // 获取当前页面的所有key
    getCurrentKeys() {
        return this.getCurrentCards().map(card => card.dataset.key);
    },
    
    // 更新卡片选中状态
    updateCardsSelection() {
        const cards = this.getCurrentCards();
        cards.forEach(card => {
            const key = card.dataset.key;
            if (this.selectedKeys.has(key)) {
                card.classList.add('card-selected');
            } else {
                card.classList.remove('card-selected');
            }
        });
    },
    
    // 全选/取消全选
    toggleSelectAll() {
        const allKeys = this.getCurrentKeys();
        
        if (this.isSelectAllActive) {
            this.selectedKeys.clear();
            this.lastSelectedKey = null;
            this.isSelectAllActive = false;
        } else {
            this.selectedKeys.clear();
            allKeys.forEach(key => this.selectedKeys.add(key));
            this.lastSelectedKey = allKeys[allKeys.length - 1];
            this.isSelectAllActive = true;
        }
        
        this.updateCardsSelection();
        this.updateButtonStates();
        this.updateSelectAllButton();
    },
    
    // 更新全选按钮状态
    updateSelectAllButton() {
        const btn = document.getElementById('selectAllBtn');
        if (!btn) return;
        
        const allKeys = this.getCurrentKeys();
        this.isSelectAllActive = allKeys.length > 0 && 
            allKeys.every(key => this.selectedKeys.has(key));
        
        if (this.isSelectAllActive) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    },
    
    // 清除所有选中
    clearSelection() {
        this.selectedKeys.clear();
        this.lastSelectedKey = null;
        this.isSelectAllActive = false;
        this.updateCardsSelection();
        this.updateButtonStates();
        this.updateSelectAllButton();
    },
    
    // 更新批量操作按钮状态
    updateButtonStates() {
        const hasSelection = this.selectedKeys.size > 0;
        const isProject = currentSection === 'project';
        
        const deleteBtn = document.getElementById('batchDeleteBtn');
        const shenheBtn = document.getElementById('batchShenheBtn');
        const zhuangtaiBtn = document.getElementById('batchZhuangtaiBtn');
        
        if (deleteBtn) deleteBtn.disabled = !hasSelection;
        
        // 项目配置页面只能删除，且other不能删除
        if (isProject) {
            if (shenheBtn) shenheBtn.disabled = true;
            if (zhuangtaiBtn) zhuangtaiBtn.disabled = true;
            
            // 检查是否选中了other
            if (deleteBtn && hasSelection) {
                const hasOther = this.selectedKeys.has('other');
                deleteBtn.disabled = hasOther;
            }
        } else {
            if (shenheBtn) shenheBtn.disabled = !hasSelection;
            if (zhuangtaiBtn) zhuangtaiBtn.disabled = !hasSelection;
        }
    },
    
    // 批量删除（不清除选中）
    async batchDelete() {
        if (this.selectedKeys.size === 0) return;
        
        const isProject = currentSection === 'project';
        const count = this.selectedKeys.size;
        
        if (!confirm(`确定要删除选中的 ${count} 个${isProject ? '导航项' : '资源'}吗？`)) {
            return;
        }
        
        try {
            if (isProject) {
                // 批量删除导航项
                for (const key of this.selectedKeys) {
                    if (key === 'other') continue;
                    await window.firebaseDB.remove(
                        window.firebaseDB.ref(window.firebaseDB.database, `xiangmu/${key}`)
                    );
                }
                
                // 重新计算序号
                const remaining = Object.entries(firebase.xiangmuData)
                    .filter(([k, v]) => !this.selectedKeys.has(k) && v && typeof v === 'object' && v.name)
                    .sort((a, b) => (a[1].xuhao ?? 999) - (b[1].xuhao ?? 999));
                
                if (remaining.length > 0) {
                    const updates = {};
                    remaining.forEach(([k], index) => {
                        updates[`xiangmu/${k}/xuhao`] = index + 1;
                    });
                    await window.firebaseDB.update(
                        window.firebaseDB.ref(window.firebaseDB.database), 
                        updates
                    );
                }
            } else {
                // 批量删除资源
                const updates = {};
                this.selectedKeys.forEach(key => {
                    updates[`ruanjianku/${key}`] = null;
                });
                await window.firebaseDB.update(
                    window.firebaseDB.ref(window.firebaseDB.database), 
                    updates
                );
            }
            
            Toast.show(`成功删除 ${count} 个${isProject ? '导航项' : '资源'}`, 'success');
            // 不调用 clearSelection()
        } catch (error) {
            console.error('批量删除失败:', error);
            Toast.show('批量删除失败，请重试', 'error');
        }
    },
    
    // 批量切换审核状态（不清除选中）
    async batchToggleShenhe() {
        if (this.selectedKeys.size === 0 || currentSection !== 'links') return;
        
        const updates = {};
        this.selectedKeys.forEach(key => {
            const item = firebase.ruanjiankuData[key];
            if (item) {
                const newValue = item.shenhe === '已审' ? '未审' : '已审';
                updates[`ruanjianku/${key}/shenhe`] = newValue;
            }
        });
        
        try {
            await window.firebaseDB.update(
                window.firebaseDB.ref(window.firebaseDB.database), 
                updates
            );
            Toast.show(`成功切换 ${this.selectedKeys.size} 个资源的审核状态`, 'success');
            // 不调用 clearSelection()
        } catch (error) {
            console.error('批量切换审核失败:', error);
            Toast.show('批量切换审核失败，请重试', 'error');
        }
    },
    
    // 批量切换资源状态（不清除选中）
    async batchToggleZhuangtai() {
        if (this.selectedKeys.size === 0 || currentSection !== 'links') return;
        
        const updates = {};
        this.selectedKeys.forEach(key => {
            const item = firebase.ruanjiankuData[key];
            if (item) {
                const newValue = item.zhuangtai === '有效' ? '无效' : '有效';
                updates[`ruanjianku/${key}/zhuangtai`] = newValue;
            }
        });
        
        try {
            await window.firebaseDB.update(
                window.firebaseDB.ref(window.firebaseDB.database), 
                updates
            );
            Toast.show(`成功切换 ${this.selectedKeys.size} 个资源的状态`, 'success');
            // 不调用 clearSelection()
        } catch (error) {
            console.error('批量切换状态失败:', error);
            Toast.show('批量切换状态失败，请重试', 'error');
        }
    }
};