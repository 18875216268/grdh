// 顶部导航模块
const toubuNav = {
    init() {
        this.render();
    },
    
    render() {
        const container = document.querySelector('.nav-section-top');
        if (!container) return;
        
        container.innerHTML = `
            <div class="admin-nav-item active" data-section="project">
                <span class="admin-nav-icon">🌐</span>
                <span>项目配置</span>
            </div>
        `;
    }
};

// 项目配置模块
const projectModule = {
    currentEditKey: null,
    currentIcon: '',
    loadedCount: 0,
    allItems: [],
    filteredItems: [],
    searchKeyword: '',
    icons: [],
    draggedElement: null,
    
    async init() {
        try {
            const response = await fetch('tubiao.json');
            const data = await response.json();
            this.icons = data.icons || [];
        } catch (error) {
            console.error('加载图标失败:', error);
            this.icons = ['📚', '🔍', '🧭', '📱', '👥', '⛅', '📦', '🌐', '💾', '🗂️'];
        }
    },
    
    render() {
        const container = document.getElementById('projectCardsGrid');
        container.innerHTML = '';
        
        // 包含所有导航项（包括other）
        this.allItems = Object.entries(firebase.xiangmuData)
            .filter(([key, value]) => value && typeof value === 'object' && value.name)
            .map(([key, value]) => ({ key, ...value }))
            .sort((a, b) => (a.xuhao ?? 999) - (b.xuhao ?? 999));
        
        if (this.allItems.length === 0) {
            container.innerHTML = '<div class="empty-card">暂无导航配置，点击右上角+添加</div>';
            return;
        }
        
        this.applySearch();
    },
    
    applySearch() {
        const container = document.getElementById('projectCardsGrid');
        
        this.filteredItems = searchModule.filterItems(this.allItems, this.searchKeyword);
        
        if (this.filteredItems.length === 0) {
            container.innerHTML = '<div class="empty-card">未找到匹配的导航配置</div>';
            return;
        }
        
        container.innerHTML = '';
        this.loadedCount = 0;
        this.loadMore();
    },
    
    loadMore() {
        const container = document.getElementById('projectCardsGrid');
        const startIndex = this.loadedCount;
        const endIndex = Math.min(startIndex + lazyLoadConfig.batchSize, this.filteredItems.length);
        
        for (let i = startIndex; i < endIndex; i++) {
            const item = this.filteredItems[i];
            const stats = utils.calcNavStats(item.key, firebase.xiangmuData, firebase.ruanjiankuData);
            
            // other导航项：删除按钮禁用
            const isOther = item.key === 'other';
            const deleteBtn = isOther 
                ? '<button class="btn btn-danger" disabled>删除</button>'
                : `<button class="btn btn-danger" onclick="projectModule.delete('${item.key}')">删除</button>`;
            
            // 添加设置按钮
            const settingsBtn = `<button class="btn btn-primary" onclick="guizeModule.showModal('${item.key}')" title="过滤规则设置">⚙️</button>`;
            
            container.insertAdjacentHTML('beforeend', `
                <div class="project-card" data-key="${item.key}" draggable="${!isOther}">
                    <div class="project-card-header">
                        <div class="project-card-title">${item.icon || '📁'} ${item.name}</div>
                        <div class="project-card-actions">
                            ${settingsBtn}
                            <button class="btn btn-primary" onclick="projectModule.showModal('${item.key}')">编辑</button>
                            ${deleteBtn}
                        </div>
                    </div>
                    <div class="project-card-stats">
                        <table class="stats-table">
                            <thead>
                                <tr>
                                    <th>资源</th>
                                    <th>子项</th>
                                    <th>未审</th>
                                    <th>失效</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>${stats.total}</td>
                                    <td>${stats.types}</td>
                                    <td>${stats.unreviewed}</td>
                                    <td>${stats.invalid}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div class="project-card-footer">
                        <span class="project-card-date">日期：${utils.formatDate(item.time)}</span>
                        <span>|</span>
                        <span class="project-card-order">序号：${item.xuhao ?? 999}</span>
                    </div>
                </div>
            `);
        }
        
        this.loadedCount = endIndex;
        
        if (currentSection === 'project' && endIndex > startIndex && !this.searchKeyword) {
            setTimeout(() => this.initDragAndDrop(), 100);
        }
    },
    
    initDragAndDrop() {
        const cards = document.querySelectorAll('#projectCardsGrid .project-card[draggable="true"]');
        const handlers = {
            dragstart: (e) => {
                this.draggedElement = e.currentTarget;
                e.currentTarget.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
            },
            dragover: (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
            },
            dragenter: (e) => {
                if (e.currentTarget !== this.draggedElement && e.currentTarget.getAttribute('draggable') === 'true') {
                    e.currentTarget.classList.add('drag-over');
                }
            },
            dragleave: (e) => {
                e.currentTarget.classList.remove('drag-over');
            },
            drop: (e) => {
                e.stopPropagation();
                if (this.draggedElement !== e.currentTarget && e.currentTarget.getAttribute('draggable') === 'true') {
                    const allCards = Array.from(document.querySelectorAll('#projectCardsGrid .project-card[draggable="true"]'));
                    const draggedIndex = allCards.indexOf(this.draggedElement);
                    const targetIndex = allCards.indexOf(e.currentTarget);
                    
                    if (draggedIndex < targetIndex) {
                        e.currentTarget.parentNode.insertBefore(this.draggedElement, e.currentTarget.nextSibling);
                    } else {
                        e.currentTarget.parentNode.insertBefore(this.draggedElement, e.currentTarget);
                    }
                    
                    this.updateOrderAfterDrag();
                }
                e.currentTarget.classList.remove('drag-over');
            },
            dragend: () => {
                document.querySelectorAll('#projectCardsGrid .project-card').forEach(card => {
                    card.classList.remove('dragging', 'drag-over');
                });
                this.draggedElement = null;
            }
        };
        
        cards.forEach(card => {
            Object.entries(handlers).forEach(([event, handler]) => {
                card.removeEventListener(event, handler);
                card.addEventListener(event, handler);
            });
        });
    },

    async updateOrderAfterDrag() {
        const cards = document.querySelectorAll('#projectCardsGrid .project-card[draggable="true"]');
        const updates = {};
        
        cards.forEach((card, index) => {
            const key = card.dataset.key;
            if (key) updates[`xiangmu/${key}/xuhao`] = index + 1;
        });
        
        try {
            await window.firebaseDB.update(window.firebaseDB.ref(window.firebaseDB.database), updates);
            Toast.show('排序已更新', 'success');
        } catch (error) {
            console.error('更新序号失败:', error);
        }
    },

    showModal(key = null) {
        this.currentEditKey = key;
        const item = key ? firebase.xiangmuData[key] : null;
        
        document.getElementById('modalNavName').value = item?.name || '';
        this.currentIcon = item?.icon || '';
        document.getElementById('modalNavConfig').value = item ? utils.convertConfigToText(item) : '';
        
        this.renderIconGrid();
        
        document.getElementById('editNavModal').classList.add('show');
    },

    hideModal() {
        document.getElementById('editNavModal').classList.remove('show');
    },
    
    renderIconGrid() {
        const container = document.getElementById('iconGrid');
        container.innerHTML = '';
        
        this.icons.forEach(icon => {
            const item = document.createElement('div');
            item.className = 'icon-item';
            if (icon === this.currentIcon) item.classList.add('selected');
            item.textContent = icon;
            item.onclick = () => {
                document.querySelectorAll('.icon-item').forEach(i => i.classList.remove('selected'));
                item.classList.add('selected');
                this.currentIcon = icon;
            };
            container.appendChild(item);
        });
    },

    async save() {
        const name = document.getElementById('modalNavName').value.trim();
        const configText = document.getElementById('modalNavConfig').value.trim();

        if (!name) {
            Toast.show('请填写导航项名称', 'error');
            return;
        }
        
        if (!this.currentIcon) {
            Toast.show('请选择图标', 'error');
            return;
        }
        
        const newConfig = utils.convertTextToConfig(configText);
        const updates = {};

        if (this.currentEditKey) {
            const item = firebase.xiangmuData[this.currentEditKey];
            const oldConfig = utils.extractConfig(item);
            
            // 更新基本信息
            if (item.name !== name) updates[`xiangmu/${this.currentEditKey}/name`] = name;
            if (item.icon !== this.currentIcon) updates[`xiangmu/${this.currentEditKey}/icon`] = this.currentIcon;
            
            // 配置更新逻辑
            const oldTypes = Object.keys(oldConfig);
            const newTypes = Object.keys(newConfig);
            
            // 删除不存在的类型
            oldTypes.forEach(type => {
                if (!newTypes.includes(type)) {
                    updates[`xiangmu/${this.currentEditKey}/${type}`] = null;
                }
            });
            
            // 新增或更新类型
            newTypes.forEach(type => {
                const oldData = oldConfig[type];
                const newData = newConfig[type];
                
                if (!oldData) {
                    updates[`xiangmu/${this.currentEditKey}/${type}`] = newData;
                } else {
                    if (oldData.yuming !== newData.yuming) {
                        updates[`xiangmu/${this.currentEditKey}/${type}/yuming`] = newData.yuming;
                    }
                    if (oldData.xuhao !== newData.xuhao) {
                        updates[`xiangmu/${this.currentEditKey}/${type}/xuhao`] = newData.xuhao;
                    }
                }
            });
        } else {
            // 新增导航项
            const existingOrders = Object.values(firebase.xiangmuData)
                .filter(item => item && typeof item === 'object' && item.xuhao !== undefined)
                .map(item => item.xuhao);
            const newOrder = existingOrders.length > 0 ? Math.max(...existingOrders) + 1 : 1;
            
            const key = `nav_${Date.now()}`;
            updates[`xiangmu/${key}`] = {
                xuhao: newOrder,
                name: name,
                icon: this.currentIcon,
                time: Date.now(),
                ...newConfig
            };
        }
        
        try {
            await window.firebaseDB.update(window.firebaseDB.ref(window.firebaseDB.database), updates);
            Toast.show('保存成功', 'success');
            this.hideModal();
        } catch (error) {
            console.error('保存失败:', error);
            Toast.show('保存失败，请重试', 'error');
        }
    },

    async delete(key) {
        // 禁止删除other导航项
        if (key === 'other') {
            Toast.show('其它资源不能删除', 'error');
            return;
        }
        
        try {
            await window.firebaseDB.remove(window.firebaseDB.ref(window.firebaseDB.database, `xiangmu/${key}`));
            Toast.show('删除成功！', 'success');
            
            const remaining = Object.entries(firebase.xiangmuData)
                .filter(([k, v]) => k !== key && k !== 'other' && v && typeof v === 'object' && v.name)
                .sort((a, b) => (a[1].xuhao ?? 999) - (b[1].xuhao ?? 999));
            
            if (remaining.length > 0) {
                const updates = {};
                remaining.forEach(([k], index) => {
                    updates[`xiangmu/${k}/xuhao`] = index + 1;
                });
                await window.firebaseDB.update(window.firebaseDB.ref(window.firebaseDB.database), updates);
            }
        } catch (error) {
            console.error('删除失败:', error);
            Toast.show('删除失败，请重试', 'error');
        }
    }
};