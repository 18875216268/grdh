// 中间导航模块
const zhongjianNav = {
    currentFilter: 'all',
    netdiskCategories: [],
    
    init() {
        this.generateCategories();
        this.render();
    },
    
    // 生成网盘分类（直接基于type字段统计）
    generateCategories() {
        this.netdiskCategories = [];
        
        const categoryCounts = {};
        let othersCount = 0;
        let totalCount = 0;
        
        // 统计各类型的链接数量
        Object.values(firebase.ruanjiankuData).forEach(link => {
            if (link && typeof link === 'object') {
                totalCount++;
                const type = link.type || '其它网盘';
                if (type === '其它网盘') {
                    othersCount++;
                } else {
                    categoryCounts[type] = (categoryCounts[type] || 0) + 1;
                }
            }
        });
        
        // 添加"全部"选项
        this.netdiskCategories.push({
            key: 'all',
            name: '全部',
            icon: '📚',
            count: totalCount
        });
        
        // 添加有链接的网盘分类
        Object.entries(firebase.xinxiData)
            .filter(([key, value]) => key !== 'tongyong' && value && value.name)
            .filter(([key, value]) => categoryCounts[value.name] > 0)
            .sort((a, b) => (a[1].xuhao || 999) - (b[1].xuhao || 999))
            .forEach(([key, value]) => {
                this.netdiskCategories.push({
                    key: key,
                    name: value.name,
                    icon: '⛅︎',
                    count: categoryCounts[value.name]
                });
            });
        
        // 如果有其它网盘，添加到最后
        if (othersCount > 0) {
            this.netdiskCategories.push({
                key: 'others',
                name: '其它网盘',
                icon: '📦',
                count: othersCount
            });
        }
    },
    
    // 检测网盘类型（仅用于URL输入时自动判断）
    detectNetdiskType(url) {
        const lowerUrl = url.toLowerCase();
        
        for (const [key, value] of Object.entries(firebase.xinxiData)) {
            if (key !== 'tongyong' && value && value.yuming) {
                const domains = value.yuming.split(',').map(d => d.trim());
                for (const domain of domains) {
                    if (domain && lowerUrl.includes(domain)) {
                        return value.name;
                    }
                }
            }
        }
        
        return '其它网盘';
    },
    
    render() {
        const container = document.querySelector('.nav-section-middle');
        if (!container) return;
        
        container.innerHTML = '';
        
        this.netdiskCategories.forEach(cat => {
            const navItem = document.createElement('div');
            navItem.className = 'admin-nav-item';
            navItem.dataset.section = 'links';
            navItem.dataset.filter = cat.key;
            
            if (this.currentFilter === cat.key) {
                navItem.classList.add('active');
            }
            
            navItem.innerHTML = `
                <span class="admin-nav-icon">${cat.icon}</span>
                <span class="nav-text">${cat.name}</span>
                <span class="nav-settings-icon" data-key="${cat.key}">⚙️</span>
            `;
            
            navItem.addEventListener('click', (e) => {
                if (!e.target.classList.contains('nav-settings-icon')) {
                    this.setFilter(cat.key);
                }
            });
            
            const settingsIcon = navItem.querySelector('.nav-settings-icon');
            settingsIcon.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openFilterSettings(cat.key);
            });
            
            container.appendChild(navItem);
        });
    },
    
    openFilterSettings(filterKey) {
        if (filterKey === 'all') {
            filterModule.edit('tongyong');
        } else if (filterKey === 'others') {
            Toast.show('其它网盘暂无专属过滤规则', 'warning');
        } else {
            filterModule.edit(filterKey);
        }
    },
    
    setFilter(filter) {
        this.currentFilter = filter;
        linksModule.searchKeyword = '';
        document.getElementById('linksSearchInput').value = '';
        document.getElementById('linksSearchClear').style.display = 'none';
        
        document.querySelectorAll('.nav-section-middle .admin-nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.filter === filter);
        });
        
        document.querySelectorAll('.nav-section-top .admin-nav-item, .nav-section-bottom .admin-nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        currentSection = 'links';
        document.querySelectorAll('.content-section').forEach(sec => {
            sec.classList.toggle('active', sec.id === 'links-section');
        });
        
        linksModule.render();
    },
    
    // 获取过滤后的链接（直接基于type字段过滤）
    getFilteredLinks() {
        const allLinks = Object.entries(firebase.ruanjiankuData)
            .filter(([key, value]) => value && typeof value === 'object')
            .map(([key, value]) => ({ key, ...value }));
        
        if (this.currentFilter === 'all') {
            return allLinks;
        }
        
        if (this.currentFilter === 'others') {
            return allLinks.filter(link => !link.type || link.type === '其它网盘');
        }
        
        const category = this.netdiskCategories.find(c => c.key === this.currentFilter);
        return category ? allLinks.filter(link => link.type === category.name) : allLinks;
    }
};

// 链接管理模块
const linksModule = {
    currentEditKey: null,
    loadedCount: 0,
    allLinks: [],
    filteredLinks: [],
    searchKeyword: '',
    
    render() {
        const container = document.getElementById('linksCardsGrid');
        if (!container) return;
        
        container.innerHTML = '';
        this.allLinks = zhongjianNav.getFilteredLinks();
        
        if (this.allLinks.length === 0) {
            container.innerHTML = '<div class="empty-card">暂无链接，点击右上角+添加</div>';
            return;
        }
        
        this.applySearch();
    },
    
    applySearch() {
        const container = document.getElementById('linksCardsGrid');
        
        this.filteredLinks = searchModule.filterItems(this.allLinks, this.searchKeyword);
        
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
        const container = document.getElementById('linksCardsGrid');
        const startIndex = this.loadedCount;
        const endIndex = Math.min(startIndex + lazyLoadConfig.batchSize, this.filteredLinks.length);
        
        for (let i = startIndex; i < endIndex; i++) {
            const link = this.filteredLinks[i];
            const cardHtml = `
                <div class="link-card" data-key="${link.key}">
                    <div class="link-card-header">
                        <div class="link-card-title">${link.name || '未命名'}</div>
                        <div class="link-card-actions">
                            <button class="btn btn-primary" onclick="linksModule.edit('${link.key}')">编辑</button>
                            <button class="btn btn-danger" onclick="linksModule.delete('${link.key}')">删除</button>
                            <button class="status-toggle-btn ${link.shenhe === '已审' ? 'active-reviewed' : 'active-pending'}" 
                                onclick="linksModule.toggleStatus('${link.key}', 'shenhe')">
                                ${link.shenhe || '已审'}
                            </button>
                            <button class="status-toggle-btn ${link.zhuangtai === '有效' ? 'active-valid' : 'active-invalid'}" 
                                onclick="linksModule.toggleStatus('${link.key}', 'zhuangtai')">
                                ${link.zhuangtai || '有效'}
                            </button>
                        </div>
                    </div>
                    <div class="link-card-body">
                        <div class="link-card-info">${utils.formatDate(link.time)}</div>
                        <a href="${link.url}" target="_blank" class="link-card-url" title="${link.url}">${link.url || ''}</a>
                    </div>
                    <div class="link-card-footer">
                        <span>${link.tougao || '木小匣'} | ${link.type || '其它网盘'} | 访问：${link.visits || 0}</span>
                    </div>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', cardHtml);
        }
        
        this.loadedCount = endIndex;
    },
    
    handleSearch() {
        searchModule.handleSearch('linksSearchInput', 'linksSearchClear', (keyword) => {
            this.searchKeyword = keyword;
            this.applySearch();
        });
    },
    
    clearSearch() {
        searchModule.clearSearch('linksSearchInput', 'linksSearchClear', () => {
            this.searchKeyword = '';
            this.applySearch();
        });
    },
    
    // 填充类型选择框
    populateTypeOptions() {
        const select = document.getElementById('modalLinkType');
        select.innerHTML = '';
        
        Object.entries(firebase.xinxiData)
            .filter(([key, value]) => key !== 'tongyong' && value && value.name)
            .sort((a, b) => (a[1].xuhao || 999) - (b[1].xuhao || 999))
            .forEach(([key, value]) => {
                const option = document.createElement('option');
                option.value = value.name;
                option.textContent = value.name;
                select.appendChild(option);
            });
        
        const otherOption = document.createElement('option');
        otherOption.value = '其它网盘';
        otherOption.textContent = '其它网盘';
        select.appendChild(otherOption);
    },
    
    // URL变化时自动判断类型
    handleUrlChange() {
        const url = document.getElementById('modalLinkUrl').value.trim();
        if (url) {
            const detectedType = zhongjianNav.detectNetdiskType(url);
            document.getElementById('modalLinkType').value = detectedType;
        }
    },

    showAddModal() {
        this.currentEditKey = null;
        document.getElementById('modalLinkName').value = '';
        document.getElementById('modalLinkUrl').value = '';
        document.getElementById('modalLinkContributor').value = '';
        
        this.populateTypeOptions();
        document.getElementById('modalLinkType').value = '其它网盘';
        
        document.querySelector('#addLinkModal .modal-title').textContent = '添加新链接';
        const btn = document.getElementById('confirmLinkBtn');
        btn.textContent = '添加';
        btn.onclick = () => this.save();
        document.getElementById('addLinkModal').classList.add('show');
    },

    hideModal() {
        document.getElementById('addLinkModal').classList.remove('show');
    },

    edit(key) {
        const item = firebase.ruanjiankuData[key];
        if (!item) return;

        this.currentEditKey = key;
        document.getElementById('modalLinkName').value = item.name || '';
        document.getElementById('modalLinkUrl').value = item.url || '';
        document.getElementById('modalLinkContributor').value = item.tougao || '';
        
        this.populateTypeOptions();
        document.getElementById('modalLinkType').value = item.type || '其它网盘';
        
        document.querySelector('#addLinkModal .modal-title').textContent = '编辑链接';
        const btn = document.getElementById('confirmLinkBtn');
        btn.textContent = '保存';
        btn.onclick = () => this.save();
        document.getElementById('addLinkModal').classList.add('show');
    },

    async save() {
        const name = document.getElementById('modalLinkName').value.trim();
        const url = document.getElementById('modalLinkUrl').value.trim();
        const contributor = document.getElementById('modalLinkContributor').value.trim() || '木小匣';
        const type = document.getElementById('modalLinkType').value;

        if (!name || !url) {
            Toast.show('请填写网站名称和链接', 'error');
            return;
        }
        
        if (this.currentEditKey) {
            const existingData = firebase.ruanjiankuData[this.currentEditKey];
            const updateData = {
                name: name,
                url: url,
                type: type,
                time: existingData.time || Date.now(),
                visits: existingData.visits || 0,
                tougao: contributor,
                shenhe: existingData.shenhe || '已审',
                zhuangtai: existingData.zhuangtai || '有效'
            };
            await firebase.updateRuanjiankuNode(this.currentEditKey, updateData);
        } else {
            const key = utils.generateId();
            const newData = {
                name: name,
                url: url,
                type: type,
                time: Date.now(),
                visits: 0,
                tougao: contributor,
                shenhe: '已审',
                zhuangtai: '有效'
            };
            await firebase.updateRuanjiankuNode(key, newData);
        }

        this.hideModal();
        zhongjianNav.generateCategories();
        zhongjianNav.render();
    },

    async toggleStatus(key, field) {
        const item = firebase.ruanjiankuData[key];
        if (!item) return;
        
        const newValue = field === 'zhuangtai' 
            ? (item.zhuangtai === '有效' ? '无效' : '有效')
            : (item.shenhe === '已审' ? '未审' : '已审');
        
        await firebase.updateRuanjiankuNode(`${key}/${field}`, newValue);
    },

    async delete(key) {
        await firebase.deleteRuanjiankuNode(key);
        zhongjianNav.generateCategories();
        zhongjianNav.render();
    }
};