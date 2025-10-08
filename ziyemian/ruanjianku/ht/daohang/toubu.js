// 顶部导航模块
const toubuNav = {
    init() {
        this.render();
    },
    
    render() {
        const container = document.querySelector('.nav-section-top');
        if (!container) return;
        
        container.innerHTML = `
            <div class="admin-nav-item active" data-section="domain">
                <span class="admin-nav-icon">🌐</span>
                <span>域名配置</span>
            </div>
        `;
    }
};

// 域名配置模块
const domainModule = {
    currentEditKey: null,
    loadedCount: 0,
    allItems: [],
    filteredItems: [],
    searchKeyword: '',
    
    render() {
        const container = document.getElementById('domainCardsGrid');
        container.innerHTML = '';
        
        this.allItems = [];
        for (const [key, value] of Object.entries(firebase.xinxiData)) {
            if (key !== 'tongyong' && typeof value === 'object' && value.name) {
                this.allItems.push({
                    key: key,
                    ...value  // 包含所有字段
                });
            }
        }
        
        this.allItems.sort((a, b) => (a.xuhao || 999) - (b.xuhao || 999));
        
        if (this.allItems.length === 0) {
            container.innerHTML = '<div class="empty-card">暂无网盘配置，点击右上角+添加</div>';
            return;
        }
        
        this.applySearch();
    },
    
    applySearch() {
        const container = document.getElementById('domainCardsGrid');
        
        // 使用公共搜索模块进行全字段过滤
        this.filteredItems = searchModule.filterItems(
            this.allItems,
            this.searchKeyword
            // 不传递getSearchText，使用默认的getAllFieldsText
        );
        
        if (this.filteredItems.length === 0) {
            container.innerHTML = '<div class="empty-card">未找到匹配的网盘配置</div>';
            return;
        }
        
        container.innerHTML = '';
        this.loadedCount = 0;
        this.loadMore();
    },
    
    loadMore() {
        const container = document.getElementById('domainCardsGrid');
        const startIndex = this.loadedCount;
        const endIndex = Math.min(startIndex + lazyLoadConfig.batchSize, this.filteredItems.length);
        
        for (let i = startIndex; i < endIndex; i++) {
            const item = this.filteredItems[i];
            const cardHtml = `
                <div class="unified-card" data-key="${item.key}" draggable="true">
                    <div class="card-header">
                        <div class="card-title">${item.name}</div>
                        <div class="card-actions">
                            <button class="btn btn-primary" onclick="domainModule.edit('${item.key}')">编辑</button>
                            <button class="btn btn-danger" onclick="domainModule.delete('${item.key}')">删除</button>
                        </div>
                    </div>
                    <div class="card-content">
                        <div class="domain-content-area">${item.yuming || ''}</div>
                    </div>
                    <div class="card-footer">
                        <span class="card-date">日期：${utils.formatDate(item.time)}</span>
                        <span>|</span>
                        <span class="card-order">序号：${item.xuhao || 999}</span>
                    </div>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', cardHtml);
        }
        
        this.loadedCount = endIndex;
        
        // 只有在没有搜索关键词时才启用拖拽
        if (currentSection === 'domain' && endIndex > startIndex && !this.searchKeyword) {
            setTimeout(this.initDragAndDrop, 100);
        }
    },
    
    handleSearch() {
        searchModule.handleSearch('domainSearchInput', 'domainSearchClear', (keyword) => {
            this.searchKeyword = keyword;
            this.applySearch();
        });
    },
    
    clearSearch() {
        searchModule.clearSearch('domainSearchInput', 'domainSearchClear', () => {
            this.searchKeyword = '';
            this.applySearch();
        });
    },
    
    initDragAndDrop() {
        const cards = document.querySelectorAll('#domainCardsGrid .unified-card');
        cards.forEach(card => {
            card.removeEventListener('dragstart', domainModule.handleDragStart);
            card.removeEventListener('dragover', domainModule.handleDragOver);
            card.removeEventListener('drop', domainModule.handleDrop);
            card.removeEventListener('dragend', domainModule.handleDragEnd);
            card.removeEventListener('dragenter', domainModule.handleDragEnter);
            card.removeEventListener('dragleave', domainModule.handleDragLeave);
            
            card.addEventListener('dragstart', domainModule.handleDragStart);
            card.addEventListener('dragover', domainModule.handleDragOver);
            card.addEventListener('drop', domainModule.handleDrop);
            card.addEventListener('dragend', domainModule.handleDragEnd);
            card.addEventListener('dragenter', domainModule.handleDragEnter);
            card.addEventListener('dragleave', domainModule.handleDragLeave);
        });
    },

    handleDragStart(e) {
        draggedElement = this;
        this.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
    },

    handleDragOver(e) {
        if (e.preventDefault) e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        return false;
    },

    handleDragEnter(e) {
        if (this !== draggedElement) {
            this.classList.add('drag-over');
        }
    },

    handleDragLeave(e) {
        this.classList.remove('drag-over');
    },

    handleDrop(e) {
        if (e.stopPropagation) e.stopPropagation();
        
        if (draggedElement !== this) {
            const allCards = Array.from(document.querySelectorAll('#domainCardsGrid .unified-card'));
            const draggedIndex = allCards.indexOf(draggedElement);
            const targetIndex = allCards.indexOf(this);
            
            if (draggedIndex < targetIndex) {
                this.parentNode.insertBefore(draggedElement, this.nextSibling);
            } else {
                this.parentNode.insertBefore(draggedElement, this);
            }
            
            domainModule.updateOrderAfterDrag();
        }
        
        this.classList.remove('drag-over');
        return false;
    },

    handleDragEnd(e) {
        document.querySelectorAll('#domainCardsGrid .unified-card').forEach(card => {
            card.classList.remove('dragging', 'drag-over');
        });
        draggedElement = null;
    },

    async updateOrderAfterDrag() {
        const cards = document.querySelectorAll('#domainCardsGrid .unified-card');
        const orderUpdates = {};
        
        cards.forEach((card, index) => {
            const key = card.dataset.key;
            if (key) {
                orderUpdates[key] = index + 1;
            }
        });
        
        await firebase.updateXinxiOrders(orderUpdates);
    },

    showAddModal() {
        this.currentEditKey = null;
        document.getElementById('modalNetdiskName').value = '';
        document.getElementById('modalNetdiskDomain').value = '';
        document.querySelector('#addNetdiskModal .modal-title').textContent = '添加新网盘';
        const btn = document.getElementById('confirmNetdiskBtn');
        btn.textContent = '添加';
        btn.onclick = () => this.save();
        document.getElementById('addNetdiskModal').classList.add('show');
    },

    hideModal() {
        document.getElementById('addNetdiskModal').classList.remove('show');
    },

    edit(key) {
        const item = firebase.xinxiData[key];
        if (!item) return;

        this.currentEditKey = key;
        document.getElementById('modalNetdiskName').value = item.name || '';
        document.getElementById('modalNetdiskDomain').value = item.yuming || '';
        document.querySelector('#addNetdiskModal .modal-title').textContent = '编辑网盘';
        const btn = document.getElementById('confirmNetdiskBtn');
        btn.textContent = '保存';
        btn.onclick = () => this.save();
        document.getElementById('addNetdiskModal').classList.add('show');
    },

    async save() {
        const name = document.getElementById('modalNetdiskName').value.trim();
        const domain = document.getElementById('modalNetdiskDomain').value.trim();

        if (!name || !domain) {
            Toast.show('请填写网盘名称和域名关键字', 'error');
            return;
        }

        if (this.currentEditKey) {
            const updateData = {
                ...firebase.xinxiData[this.currentEditKey],
                name: name,
                yuming: domain
            };
            await firebase.updateXinxiNode(this.currentEditKey, updateData);
        } else {
            const existingOrders = Object.values(firebase.xinxiData)
                .filter(item => item && typeof item === 'object' && item.xuhao)
                .map(item => item.xuhao);
            const newOrder = existingOrders.length > 0 ? Math.max(...existingOrders) + 1 : 1;
            
            const key = `netdisk_${Date.now()}`;
            const newData = {
                xuhao: newOrder,
                name: name,
                yuming: domain,
                time: Date.now()
            };
            await firebase.updateXinxiNode(key, newData);
        }

        this.hideModal();
    },

    async delete(key) {
        await firebase.deleteXinxiNode(key);
        
        const remainingNetdisks = Object.entries(firebase.xinxiData)
            .filter(([k, v]) => k !== 'tongyong' && k !== key && v && typeof v === 'object' && v.name)
            .sort((a, b) => (a[1].xuhao || 999) - (b[1].xuhao || 999));
        
        const orderUpdates = {};
        remainingNetdisks.forEach(([k], index) => {
            orderUpdates[k] = index + 1;
        });
        
        if (Object.keys(orderUpdates).length > 0) {
            await firebase.updateXinxiOrders(orderUpdates);
        }
    }
};