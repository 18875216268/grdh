// 顶部导航模块 - 优化版
const toubuNav = {
    render() {
        const container = document.querySelector('.nav-section-top');
        if (!container) return;
        
        const fragment = document.createDocumentFragment();
        
        // 固定显示项目配置按钮
        const projectBtn = document.createElement('div');
        projectBtn.className = 'admin-nav-item active';
        projectBtn.dataset.section = 'project';
        projectBtn.innerHTML = `
            <span class="admin-nav-icon">🌐</span>
            <span>项目配置</span>
        `;
        fragment.appendChild(projectBtn);
        
        // 渲染weizhi='顶部'的导航项
        const topNavItems = Object.entries(firebase.xiangmuData)
            .filter(([key, value]) => value && typeof value === 'object' && value.name && value.weizhi === '顶部')
            .sort((a, b) => (a[1].xuhao ?? 999) - (b[1].xuhao ?? 999));
        
        topNavItems.forEach(([key, navItem]) => {
            const navElement = document.createElement('div');
            navElement.className = 'admin-nav-item';
            navElement.dataset.section = 'links';
            navElement.dataset.navkey = key;
            navElement.innerHTML = `
                <span class="admin-nav-icon">${navItem.icon || '📁'}</span>
                <span>${navItem.name}</span>
            `;
            fragment.appendChild(navElement);
        });
        
        container.innerHTML = '';
        container.appendChild(fragment);
    }
};

// 项目配置模块 - 优化版
const projectModule = {
    currentEditKey: null,
    loadedCount: 0,
    allProjects: [],
    filteredProjects: [],
    searchKeyword: '',
    currentIcon: '',
    draggedElement: null,
    dragHandlers: null,
    icons: [],

    async init() {
        await this.loadIcons();
        this.initDragHandlers();
    },
    
    async loadIcons() {
        try {
            const response = await fetch('tubiao.json');
            const data = await response.json();
            this.icons = data.icons || [];
        } catch (error) {
            console.error('加载图标失败:', error);
            this.icons = ['📁', '🌐', '📚', '🔍', '🧭', '📱', '👥', '⛅', '📦', '💾'];
        }
    },
    
    render() {
        const container = document.getElementById('projectCardsGrid');
        if (!container) return;
        
        this.loadedCount = 0;
        container.innerHTML = '';
        
        this.allProjects = Object.entries(firebase.xiangmuData)
            .filter(([key, value]) => value && typeof value === 'object' && value.name)
            .map(([key, value]) => ({ key, ...value }));
        
        if (this.allProjects.length === 0) {
            container.innerHTML = '<div class="empty-card">暂无项目配置</div>';
            return;
        }
        
        this.applySearch();
        
        // 渲染后更新批量操作状态
        if (typeof piliangModule !== 'undefined') {
            setTimeout(() => piliangModule.updateCardsSelection(), 0);
        }
    },
    
    applySearch() {
        this.filteredProjects = searchModule.filterItems(this.allProjects, this.searchKeyword);
        
        const container = document.getElementById('projectCardsGrid');
        if (this.filteredProjects.length === 0) {
            container.innerHTML = '<div class="empty-card">未找到匹配的项目配置</div>';
            return;
        }
        
        this.filteredProjects.sort((a, b) => (a.xuhao ?? 999) - (b.xuhao ?? 999));
        this.loadedCount = 0;
        container.innerHTML = '';
        this.loadMore();
    },
    
    loadMore() {
        if (this.loadedCount >= this.filteredProjects.length) return;
        
        const container = document.getElementById('projectCardsGrid');
        const fragment = document.createDocumentFragment();
        const startIndex = this.loadedCount;
        const endIndex = Math.min(startIndex + lazyLoadConfig.batchSize, this.filteredProjects.length);
        
        for (let i = startIndex; i < endIndex; i++) {
            const item = this.filteredProjects[i];
            const stats = utils.calcNavStats(item.key, firebase.xiangmuData, firebase.ruanjiankuData);
            
            const card = document.createElement('div');
            card.className = 'project-card';
            card.dataset.key = item.key;
            card.draggable = !this.searchKeyword;
            
            // 获取当前状态，默认为"显示"
            const zhuangtai = item.zhuangtai || '显示';
            const isOther = item.key === 'other';
            
            card.innerHTML = `
                <div class="project-card-header">
                    <div class="project-card-title">${item.icon || '📁'} ${item.name}</div>
                    <div class="project-card-actions">
                        <button class="btn btn-primary" data-action="settings" data-key="${item.key}" title="资源分类与过滤规则">⚙️</button>
                        <button class="btn ${zhuangtai === '显示' ? 'btn-primary' : 'btn-danger'}" 
                            data-action="toggle-zhuangtai" data-key="${item.key}" title="切换显示/隐藏">
                            ${zhuangtai}
                        </button>
                        <button class="btn btn-primary" data-action="edit" data-key="${item.key}">编辑</button>
                        <button class="btn btn-danger" data-action="delete" data-key="${item.key}" ${isOther ? 'disabled' : ''}>删除</button>
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
            `;
            
            fragment.appendChild(card);
        }
        
        container.appendChild(fragment);
        this.loadedCount = endIndex;
        
        if (currentSection === 'project' && endIndex > startIndex && !this.searchKeyword) {
            this.attachDragEvents();
        }
        
        // 加载更多后更新选中状态
        if (typeof piliangModule !== 'undefined') {
            setTimeout(() => piliangModule.updateCardsSelection(), 0);
        }
    },
    
    initDragHandlers() {
        this.dragHandlers = {
            dragstart: (e) => {
                const card = e.target.closest('.project-card');
                if (!card || card.getAttribute('draggable') !== 'true') return;
                
                this.draggedElement = card;
                card.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
            },
            dragover: (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
            },
            dragenter: (e) => {
                const card = e.target.closest('.project-card');
                if (card && card !== this.draggedElement && card.getAttribute('draggable') === 'true') {
                    card.classList.add('drag-over');
                }
            },
            dragleave: (e) => {
                const card = e.target.closest('.project-card');
                if (card) {
                    card.classList.remove('drag-over');
                }
            },
            drop: (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const targetCard = e.target.closest('.project-card');
                if (!targetCard || !this.draggedElement || targetCard === this.draggedElement) return;
                if (targetCard.getAttribute('draggable') !== 'true') return;
                
                const allCards = Array.from(document.querySelectorAll('#projectCardsGrid .project-card[draggable="true"]'));
                const draggedIndex = allCards.indexOf(this.draggedElement);
                const targetIndex = allCards.indexOf(targetCard);
                
                if (draggedIndex < targetIndex) {
                    targetCard.parentNode.insertBefore(this.draggedElement, targetCard.nextSibling);
                } else {
                    targetCard.parentNode.insertBefore(this.draggedElement, targetCard);
                }
                
                targetCard.classList.remove('drag-over');
                this.updateOrderAfterDrag();
            },
            dragend: () => {
                document.querySelectorAll('#projectCardsGrid .project-card').forEach(card => {
                    card.classList.remove('dragging', 'drag-over');
                });
                this.draggedElement = null;
            }
        };
    },

    attachDragEvents() {
        const container = document.getElementById('projectCardsGrid');
        if (!container || container.dataset.dragAttached) return;
        
        Object.entries(this.dragHandlers).forEach(([event, handler]) => {
            container.addEventListener(event, handler);
        });
        
        container.dataset.dragAttached = 'true';
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

    // 切换项目配置的显示/隐藏状态
    async toggleZhuangtai(key) {
        const item = firebase.xiangmuData[key];
        if (!item) {
            Toast.show('项目配置不存在', 'error');
            return false;
        }

        const currentZhuangtai = item.zhuangtai || '显示';
        const newZhuangtai = currentZhuangtai === '显示' ? '隐藏' : '显示';

        try {
            await window.firebaseDB.update(
                window.firebaseDB.ref(window.firebaseDB.database),
                { [`xiangmu/${key}/zhuangtai`]: newZhuangtai }
            );
            Toast.show(`已切换为${newZhuangtai}`, 'success');
            return true;
        } catch (error) {
            console.error('切换状态失败:', error);
            Toast.show('切换状态失败，请重试', 'error');
            return false;
        }
    },

    showModal(key = null) {
        this.currentEditKey = key;
        const item = key ? firebase.xiangmuData[key] : null;
        
        document.getElementById('modalNavName').value = item?.name || '';
        this.currentIcon = item?.icon || '';
        
        const position = item?.weizhi || '中部';
        document.getElementById('modalNavPosition').value = position;
        
        const password = item?.mima || '';
        document.getElementById('modalNavPassword').value = password;
        
        this.renderIconGrid();
        document.getElementById('editNavModal').classList.add('show');
    },

    hideModal() {
        document.getElementById('editNavModal').classList.remove('show');
    },
    
    renderIconGrid() {
        const container = document.getElementById('iconGrid');
        const fragment = document.createDocumentFragment();
        
        this.icons.forEach(icon => {
            const item = document.createElement('div');
            item.className = 'icon-item';
            if (icon === this.currentIcon) item.classList.add('selected');
            item.textContent = icon;
            item.onclick = () => {
                container.querySelectorAll('.icon-item').forEach(i => i.classList.remove('selected'));
                item.classList.add('selected');
                this.currentIcon = icon;
            };
            fragment.appendChild(item);
        });
        
        container.innerHTML = '';
        container.appendChild(fragment);
    },

    async save() {
        const name = document.getElementById('modalNavName').value.trim();

        if (!name) {
            Toast.show('请填写导航项名称', 'error');
            return;
        }
        
        if (!this.currentIcon) {
            Toast.show('请选择图标', 'error');
            return;
        }
        
        const position = document.getElementById('modalNavPosition').value.trim();
        const password = document.getElementById('modalNavPassword').value.trim();
        const updates = {};

        if (this.currentEditKey) {
            const item = firebase.xiangmuData[this.currentEditKey];
            if (item.name !== name) updates[`xiangmu/${this.currentEditKey}/name`] = name;
            if (item.icon !== this.currentIcon) updates[`xiangmu/${this.currentEditKey}/icon`] = this.currentIcon;
            if (item.weizhi !== position) updates[`xiangmu/${this.currentEditKey}/weizhi`] = position;
            if (item.mima !== password) updates[`xiangmu/${this.currentEditKey}/mima`] = password;
        } else {
            const existingOrders = Object.values(firebase.xiangmuData)
                .filter(item => item && typeof item === 'object' && item.xuhao !== undefined)
                .map(item => item.xuhao);
            const newOrder = existingOrders.length > 0 ? Math.max(...existingOrders) + 1 : 1;
            
            const key = `nav_${Date.now()}`;
            updates[`xiangmu/${key}`] = {
                xuhao: newOrder,
                name: name,
                icon: this.currentIcon,
                weizhi: position,
                mima: password,
                time: Date.now(),
                zhuangtai: '显示'  // 新建项目配置默认为"显示"
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
        if (key === 'other') {
            Toast.show('其它资源不能删除', 'error');
            return;
        }
        
        try {
            await window.firebaseDB.remove(window.firebaseDB.ref(window.firebaseDB.database, `xiangmu/${key}`));
            Toast.show('删除成功！', 'success');
            
            const remaining = Object.entries(firebase.xiangmuData)
                .filter(([k, v]) => k !== key && v && typeof v === 'object' && v.name)
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