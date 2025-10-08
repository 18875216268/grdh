// 底部导航模块
const dibuNav = {
    init() {
        this.render();
    },
    
    render() {
        const container = document.querySelector('.nav-section-bottom');
        if (!container) return;
        
        container.innerHTML = `
            <div class="admin-nav-item" data-section="filter">
                <span class="admin-nav-icon">🔍</span>
                <span>过滤规则</span>
            </div>
            <div class="admin-nav-item" data-section="status">
                <span class="admin-nav-icon">📊</span>
                <span>状态管理</span>
            </div>
        `;
    }
};

// 过滤规则模块
const filterModule = {
    currentEditKey: null,
    currentEditType: null,
    loadedCount: 0,
    allCards: [],
    filteredCards: [],
    searchKeyword: '',
    
    render() {
        const container = document.getElementById('filterCardsGrid');
        if (!container) return;
        
        container.innerHTML = '';
        this.allCards = [];
        
        const tongyong = firebase.xinxiData.tongyong || {};
        this.allCards.push({
            type: 'general',
            key: 'tongyong',
            title: '通用过滤规则',
            ...tongyong,  // 包含所有字段
            order: -1
        });
        
        Object.entries(firebase.xinxiData).forEach(([key, value]) => {
            if (key !== 'tongyong' && value && typeof value === 'object' && value.name) {
                const guize = value.guize || {};
                if (guize.youxiao || guize.wuxiao) {
                    this.allCards.push({
                        type: 'netdisk',
                        key: key,
                        title: value.name,
                        ...value,     // 包含网盘的所有字段
                        ...guize,     // 包含规则的所有字段
                        order: value.xuhao || 999
                    });
                }
            }
        });
        
        this.allCards.sort((a, b) => a.order - b.order);
        
        if (this.allCards.length === 1 && !this.allCards[0].youxiao && !this.allCards[0].wuxiao) {
            container.innerHTML = '<div class="empty-card">暂无过滤规则，点击右上角+添加</div>';
            return;
        }
        
        this.applySearch();
    },
    
    applySearch() {
        const container = document.getElementById('filterCardsGrid');
        
        // 使用公共搜索模块进行全字段过滤
        this.filteredCards = searchModule.filterItems(
            this.allCards,
            this.searchKeyword
            // 不传递getSearchText，使用默认的getAllFieldsText
        );
        
        if (this.filteredCards.length === 0) {
            container.innerHTML = '<div class="empty-card">未找到匹配的过滤规则</div>';
            return;
        }
        
        container.innerHTML = '';
        this.loadedCount = 0;
        this.loadMore();
    },
    
    loadMore() {
        const container = document.getElementById('filterCardsGrid');
        const startIndex = this.loadedCount;
        const endIndex = Math.min(startIndex + lazyLoadConfig.batchSize, this.filteredCards.length);
        
        for (let i = startIndex; i < endIndex; i++) {
            const card = this.filteredCards[i];
            const isGeneral = card.type === 'general';
            const validRules = card.youxiao || '';
            const invalidRules = card.wuxiao || '';
            const cardHtml = `
                <div class="unified-card" data-key="${card.key}" data-type="${card.type}">
                    <div class="card-header">
                        <div class="card-title">${card.title}</div>
                        <div class="card-actions">
                            <button class="btn btn-primary" onclick="filterModule.edit('${card.key}', '${card.type}')">编辑</button>
                            <button class="btn btn-danger" ${isGeneral ? 'disabled' : ''} 
                                ${!isGeneral ? `onclick="filterModule.delete('${card.key}')"` : ''}>删除</button>
                        </div>
                    </div>
                    <div class="card-content">
                        <div class="filter-content-area">
                            <div class="filter-section">
                                <div class="filter-section-header">有效</div>
                                <div class="filter-section-content">
                                    ${validRules || '<div class="empty-content">无</div>'}
                                </div>
                            </div>
                            <div class="filter-section">
                                <div class="filter-section-header">无效</div>
                                <div class="filter-section-content">
                                    ${invalidRules || '<div class="empty-content">无</div>'}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="card-footer">
                        <span class="card-date">日期：${utils.formatDate(card.time)}</span>
                        <span>|</span>
                        <span class="card-order">序号：${isGeneral ? '0' : card.order}</span>
                    </div>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', cardHtml);
        }
        
        this.loadedCount = endIndex;
    },
    
    handleSearch() {
        searchModule.handleSearch('filterSearchInput', 'filterSearchClear', (keyword) => {
            this.searchKeyword = keyword;
            this.applySearch();
        });
    },
    
    clearSearch() {
        searchModule.clearSearch('filterSearchInput', 'filterSearchClear', () => {
            this.searchKeyword = '';
            this.applySearch();
        });
    },

    showAddModal() {
        this.currentEditKey = null;
        this.currentEditType = null;
        this.updateNetdiskOptions();
        document.getElementById('ruleNetdiskSelect').value = '';
        document.getElementById('ruleValidKeywords').value = '';
        document.getElementById('ruleInvalidKeywords').value = '';
        document.getElementById('ruleNetdiskGroup').style.display = 'block';
        document.querySelector('#addRuleModal .modal-title').textContent = '添加过滤规则';
        const btn = document.getElementById('confirmRuleBtn');
        btn.textContent = '添加';
        btn.onclick = () => this.save();
        document.getElementById('addRuleModal').classList.add('show');
    },

    hideModal() {
        document.getElementById('addRuleModal').classList.remove('show');
    },

    updateNetdiskOptions() {
        const select = document.getElementById('ruleNetdiskSelect');
        select.innerHTML = '<option value="">请选择网盘</option>';
        
        const netdiskOptions = [];
        Object.entries(firebase.xinxiData).forEach(([key, value]) => {
            if (key !== 'tongyong' && value && typeof value === 'object' && value.name) {
                netdiskOptions.push({
                    key: key,
                    name: value.name,
                    xuhao: value.xuhao || 999
                });
            }
        });
        
        netdiskOptions.sort((a, b) => a.xuhao - b.xuhao);
        netdiskOptions.forEach(item => {
            const option = document.createElement('option');
            option.value = item.key;
            option.textContent = item.name;
            select.appendChild(option);
        });
    },

    edit(key, type) {
        this.currentEditKey = key;
        this.currentEditType = type;
        
        let validRules = '', invalidRules = '';
        
        if (type === 'general') {
            const tongyong = firebase.xinxiData.tongyong || {};
            validRules = tongyong.youxiao || '';
            invalidRules = tongyong.wuxiao || '';
            document.getElementById('ruleNetdiskGroup').style.display = 'none';
        } else {
            const netdiskData = firebase.xinxiData[key];
            if (netdiskData && netdiskData.guize) {
                validRules = netdiskData.guize.youxiao || '';
                invalidRules = netdiskData.guize.wuxiao || '';
            }
            document.getElementById('ruleNetdiskGroup').style.display = 'block';
            this.updateNetdiskOptions();
            document.getElementById('ruleNetdiskSelect').value = key;
        }
        
        document.getElementById('ruleValidKeywords').value = validRules;
        document.getElementById('ruleInvalidKeywords').value = invalidRules;
        document.querySelector('#addRuleModal .modal-title').textContent = '编辑过滤规则';
        const btn = document.getElementById('confirmRuleBtn');
        btn.textContent = '保存';
        btn.onclick = () => this.save();
        document.getElementById('addRuleModal').classList.add('show');
    },

    async save() {
        const validKeywords = document.getElementById('ruleValidKeywords').value.trim();
        const invalidKeywords = document.getElementById('ruleInvalidKeywords').value.trim();
        
        if (!validKeywords && !invalidKeywords) {
            Toast.show('请至少填写一个关键字', 'error');
            return;
        }
        
        if (this.currentEditType === 'general') {
            await firebase.updateXinxiNode('tongyong', {
                youxiao: validKeywords,
                wuxiao: invalidKeywords,
                time: firebase.xinxiData.tongyong?.time || Date.now()
            });
        } else {
            const netdiskKey = this.currentEditKey || document.getElementById('ruleNetdiskSelect').value;
            
            if (!netdiskKey) {
                Toast.show('请选择网盘', 'error');
                return;
            }
            
            await firebase.updateXinxiNode(`${netdiskKey}/guize`, {
                youxiao: validKeywords,
                wuxiao: invalidKeywords,
                time: firebase.xinxiData[netdiskKey]?.guize?.time || Date.now()
            });
        }
        
        this.hideModal();
    },

    async delete(key) {
        await firebase.deleteXinxiNode(`${key}/guize`);
    }
};

// 状态管理模块
const statusModule = {
    loadedCount: 0,
    allLinks: [],
    filteredLinks: [],
    searchKeyword: '',
    
    render() {
        const container = document.getElementById('statusCardsGrid');
        if (!container) return;
        
        container.innerHTML = '';
        this.allLinks = [];
        
        Object.entries(firebase.ruanjiankuData).forEach(([key, value]) => {
            if (value && typeof value === 'object') {
                this.allLinks.push({
                    key: key,
                    ...value  // 包含所有字段
                });
            }
        });
        
        if (this.allLinks.length === 0) {
            container.innerHTML = '<div class="empty-card">暂无链接数据</div>';
            return;
        }
        
        this.applySearch();
    },
    
    applySearch() {
        const container = document.getElementById('statusCardsGrid');
        
        // 使用公共搜索模块进行全字段过滤
        this.filteredLinks = searchModule.filterItems(
            this.allLinks,
            this.searchKeyword
            // 不传递getSearchText，使用默认的getAllFieldsText
        );
        
        if (this.filteredLinks.length === 0) {
            container.innerHTML = '<div class="empty-card">未找到匹配的链接</div>';
            return;
        }
        
        this.filteredLinks.sort((a, b) => (b.time || 0) - (a.time || 0));
        
        container.innerHTML = '';
        this.loadedCount = 0;
        this.loadMore();
    },
    
    loadMore() {
        const container = document.getElementById('statusCardsGrid');
        const startIndex = this.loadedCount;
        const endIndex = Math.min(startIndex + lazyLoadConfig.batchSize, this.filteredLinks.length);
        
        for (let i = startIndex; i < endIndex; i++) {
            const link = this.filteredLinks[i];
            const type = link.type || zhongjianNav.detectNetdiskType(link.url);
            const cardHtml = `
                <div class="status-card" data-key="${link.key}">
                    <div class="status-card-header">
                        <div class="status-card-title">${link.name || '未命名'}</div>
                        <div class="status-card-actions">
                            <button class="status-toggle-btn ${link.zhuangtai === '有效' ? 'active-valid' : 'active-invalid'}" 
                                onclick="statusModule.toggleStatus('${link.key}', 'zhuangtai')">
                                ${link.zhuangtai || '有效'}
                            </button>
                            <button class="status-toggle-btn ${link.shenhe === '已审' ? 'active-reviewed' : 'active-pending'}" 
                                onclick="statusModule.toggleStatus('${link.key}', 'shenhe')">
                                ${link.shenhe || '已审'}
                            </button>
                            <button class="btn btn-danger" onclick="statusModule.delete('${link.key}')">删除</button>
                        </div>
                    </div>
                    <div class="status-card-info">${utils.formatDate(link.time)}</div>
                    <div class="status-card-url">
                        <a href="${link.url}" target="_blank" title="${link.url}">${link.url || ''}</a>
                    </div>
                    <div class="status-card-footer">
                        <span>${link.tougao || '木小匣'} | ${type} | 访问：${link.visits || 0}</span>
                    </div>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', cardHtml);
        }
        
        this.loadedCount = endIndex;
    },
    
    handleSearch() {
        searchModule.handleSearch('statusSearchInput', 'statusSearchClear', (keyword) => {
            this.searchKeyword = keyword;
            this.applySearch();
        });
    },
    
    clearSearch() {
        searchModule.clearSearch('statusSearchInput', 'statusSearchClear', () => {
            this.searchKeyword = '';
            this.applySearch();
        });
    },
    
    async toggleStatus(key, field) {
        const item = firebase.ruanjiankuData[key];
        if (!item) return;
        
        let newValue;
        if (field === 'zhuangtai') {
            newValue = item.zhuangtai === '有效' ? '无效' : '有效';
        } else if (field === 'shenhe') {
            newValue = item.shenhe === '已审' ? '未审' : '已审';
        }
        
        await firebase.updateRuanjiankuNode(`${key}/${field}`, newValue);
    },
    
    async delete(key) {
        await firebase.deleteRuanjiankuNode(key);
    }
};