// 中间导航模块
const zhongjianNav = {
    currentFilter: 'all',
    netdiskCategories: [],
    
    // 初始化中间导航
    init() {
        this.generateCategories();
        this.render();
    },
    
    // 生成网盘分类（只显示有链接的）
    generateCategories() {
        this.netdiskCategories = [];
        
        // 统计各网盘的链接数量
        const categoryCounts = {};
        let othersCount = 0;
        let totalCount = 0;
        
        Object.values(firebase.ruanjiankuData).forEach(link => {
            if (link && typeof link === 'object') {
                totalCount++;
                const type = this.detectNetdiskType(link.url);
                if (type === '未分类') {
                    othersCount++;
                } else {
                    categoryCounts[type] = (categoryCounts[type] || 0) + 1;
                }
            }
        });
        
        // 添加"全部"选项（总是显示）
        this.netdiskCategories.push({
            key: 'all',
            name: '全部',
            icon: '📚',
            count: totalCount
        });
        
        // 只添加有链接的网盘分类
        const netdisksWithLinks = [];
        Object.entries(firebase.xinxiData).forEach(([key, value]) => {
            if (key !== 'tongyong' && value && typeof value === 'object' && value.name) {
                // 检查是否有链接
                if (categoryCounts[value.name] && categoryCounts[value.name] > 0) {
                    netdisksWithLinks.push({
                        key: key,
                        name: value.name,
                        icon: '⛅︎',  // 使用用户指定的图标
                        xuhao: value.xuhao || 999,
                        count: categoryCounts[value.name]
                    });
                }
            }
        });
        
        // 按序号排序
        netdisksWithLinks.sort((a, b) => a.xuhao - b.xuhao);
        this.netdiskCategories.push(...netdisksWithLinks);
        
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
    
    // 检测网盘类型
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
        
        return '未分类';
    },
    
    // 渲染导航
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
                <span>${cat.name}</span>
                ${cat.count > 0 ? `<span class="nav-count">${cat.count}</span>` : ''}
            `;
            
            navItem.addEventListener('click', () => {
                this.setFilter(cat.key);
            });
            
            container.appendChild(navItem);
        });
    },
    
    // 设置过滤器
    setFilter(filter) {
        this.currentFilter = filter;
        linksModule.searchKeyword = ''; // 重置搜索
        document.getElementById('linksSearchInput').value = '';
        document.getElementById('linksSearchClear').style.display = 'none';
        
        // 更新导航状态
        document.querySelectorAll('.nav-section-middle .admin-nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.filter === filter);
        });
        
        // 更新其他导航状态
        document.querySelectorAll('.nav-section-top .admin-nav-item, .nav-section-bottom .admin-nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // 切换到链接管理页面
        currentSection = 'links';
        document.querySelectorAll('.content-section').forEach(sec => {
            sec.classList.toggle('active', sec.id === 'links-section');
        });
        
        // 渲染链接
        linksModule.render();
    },
    
    // 获取过滤后的链接
    getFilteredLinks() {
        const allLinks = [];
        
        Object.entries(firebase.ruanjiankuData).forEach(([key, value]) => {
            if (value && typeof value === 'object') {
                const type = this.detectNetdiskType(value.url);
                allLinks.push({
                    key: key,
                    ...value,  // 包含所有字段
                    type: type  // 添加计算出的type字段
                });
            }
        });
        
        // 应用过滤
        if (this.currentFilter === 'all') {
            return allLinks;
        } else if (this.currentFilter === 'others') {
            return allLinks.filter(link => link.type === '未分类');
        } else {
            const category = this.netdiskCategories.find(c => c.key === this.currentFilter);
            if (category) {
                return allLinks.filter(link => link.type === category.name);
            }
        }
        
        return allLinks;
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
        
        // 从中间导航获取过滤后的链接
        this.allLinks = zhongjianNav.getFilteredLinks();
        
        if (this.allLinks.length === 0) {
            container.innerHTML = '<div class="empty-card">暂无链接，点击右上角+添加</div>';
            return;
        }
        
        // 应用搜索过滤
        this.applySearch();
    },
    
    applySearch() {
        const container = document.getElementById('linksCardsGrid');
        
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
        
        // 按时间倒序排序
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
                        <div class="card-actions">
                            <button class="btn btn-primary" onclick="linksModule.edit('${link.key}')">编辑</button>
                        </div>
                    </div>
                    <div class="link-card-body">
                        <div class="link-card-info">${utils.formatDate(link.time)}</div>
                        <a href="${link.url}" target="_blank" class="link-card-url" title="${link.url}">${link.url || ''}</a>
                    </div>
                    <div class="link-card-footer">
                        <span>${link.tougao || '木小匣'} | ${link.type} | 访问：${link.visits || 0}</span>
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

    showAddModal() {
        this.currentEditKey = null;
        document.getElementById('modalLinkName').value = '';
        document.getElementById('modalLinkUrl').value = '';
        document.getElementById('modalLinkContributor').value = '';
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

        if (!name || !url) {
            Toast.show('请填写网站名称和链接', 'error');
            return;
        }

        const type = zhongjianNav.detectNetdiskType(url);
        
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

    async delete(key) {
        if (!confirm('确定删除这个链接？')) {
            return;
        }
        
        await firebase.deleteRuanjiankuNode(key);
        zhongjianNav.generateCategories();
        zhongjianNav.render();
    }
};