// 中间导航模块 - 优化版
const zhongjianNav = {
    currentFilter: null,
    
    render() {
        const container = document.querySelector('.nav-section-middle');
        if (!container) return;
        
        const fragment = document.createDocumentFragment();
        
        // 固定显示"全部"导航项(第一个位置)
        const allNavItem = document.createElement('div');
        allNavItem.className = 'admin-nav-item';
        allNavItem.dataset.section = 'links';
        allNavItem.dataset.navkey = 'all';
        if (this.currentFilter === 'all') {
            allNavItem.classList.add('active');
        }
        allNavItem.innerHTML = `
            <span class="admin-nav-icon">📚</span>
            <span>全部</span>
        `;
        fragment.appendChild(allNavItem);
        
        // 渲染weizhi='中部'的导航项(包括weizhi为空的兼容旧数据)
        const navItems = Object.entries(firebase.xiangmuData)
            .filter(([key, value]) => {
                if (!value || typeof value !== 'object' || !value.name) return false;
                const weizhi = value.weizhi || '中部';
                return weizhi === '中部';
            })
            .sort((a, b) => (a[1].xuhao ?? 999) - (b[1].xuhao ?? 999));
        
        navItems.forEach(([key, navItem]) => {
            const navElement = document.createElement('div');
            navElement.className = 'admin-nav-item';
            navElement.dataset.section = 'links';
            navElement.dataset.navkey = key;
            
            if (this.currentFilter === key) {
                navElement.classList.add('active');
            }
            
            navElement.innerHTML = `
                <span class="admin-nav-icon">${navItem.icon || '📁'}</span>
                <span>${navItem.name}</span>
            `;
            
            fragment.appendChild(navElement);
        });
        
        container.innerHTML = '';
        container.appendChild(fragment);
    },
    
    setFilter(navKey) {
        this.currentFilter = navKey;
        
        // 清除搜索
        document.getElementById('globalSearchInput').value = '';
        document.getElementById('globalSearchClear').style.display = 'none';
        linksModule.searchKeyword = '';
        
        // 更新导航激活状态
        document.querySelectorAll('.admin-nav-item').forEach(item => {
            if (item.dataset.navkey) {
                item.classList.toggle('active', item.dataset.navkey === navKey);
            } else {
                item.classList.remove('active');
            }
        });
        
        // 切换到链接页面
        currentSection = 'links';
        document.querySelectorAll('.content-section').forEach(sec => {
            sec.classList.toggle('active', sec.id === 'links-section');
        });
        
        updateHeaderControls();
        linksModule.render();
    },
    
    getFilteredLinks() {
        // 全部导航项显示所有链接
        if (this.currentFilter === 'all') {
            return Object.entries(firebase.ruanjiankuData)
                .filter(([key, value]) => value && typeof value === 'object')
                .map(([key, value]) => ({ key, ...value }));
        }
        
        if (!this.currentFilter) return [];
        
        return Object.entries(firebase.ruanjiankuData)
            .filter(([key, value]) => value && typeof value === 'object' && value.daohang === this.currentFilter)
            .map(([key, value]) => ({ key, ...value }));
    }
};

// 链接管理模块 - 优化版
const linksModule = {
    currentEditKey: null,
    isEditMode: false,
    loadedCount: 0,
    allLinks: [],
    filteredLinks: [],
    searchKeyword: '',
    urlDetectedNav: null,
    urlDetectedType: null,
    
    render() {
        const container = document.getElementById('linksCardsGrid');
        if (!container) return;
        
        this.loadedCount = 0;
        container.innerHTML = '';
        
        this.allLinks = zhongjianNav.getFilteredLinks();
        
        if (this.allLinks.length === 0) {
            container.innerHTML = '<div class="empty-card">暂无链接，点击右上角+添加</div>';
            return;
        }
        
        this.applySearch();
        
        // 渲染后更新批量操作状态
        if (typeof piliangModule !== 'undefined') {
            setTimeout(() => piliangModule.updateCardsSelection(), 0);
        }
    },
    
    applySearch() {
        this.filteredLinks = searchModule.filterItems(this.allLinks, this.searchKeyword);
        
        const container = document.getElementById('linksCardsGrid');
        if (this.filteredLinks.length === 0) {
            container.innerHTML = '<div class="empty-card">未找到匹配的链接</div>';
            return;
        }
        
        this.filteredLinks.sort((a, b) => (b.time || 0) - (a.time || 0));
        this.loadedCount = 0;
        container.innerHTML = '';
        this.loadMore();
    },
    
    loadMore() {
        if (this.loadedCount >= this.filteredLinks.length) return;
        
        const container = document.getElementById('linksCardsGrid');
        const fragment = document.createDocumentFragment();
        const startIndex = this.loadedCount;
        const endIndex = Math.min(startIndex + lazyLoadConfig.batchSize, this.filteredLinks.length);
        
        for (let i = startIndex; i < endIndex; i++) {
            const link = this.filteredLinks[i];
            
            const footerParts = [link.tougao || '木小匣'];
            if (link.type && link.type !== '*') {
                footerParts.push(link.type);
            }
            footerParts.push(`访问：${link.visits || 0}`);
            
            const card = document.createElement('div');
            card.className = 'link-card';
            card.dataset.key = link.key;
            
            card.innerHTML = `
                <div class="link-card-header">
                    <div class="link-card-title">${link.name || '未命名'}</div>
                    <div class="link-card-actions">
                        <button class="btn btn-primary" data-action="edit" data-key="${link.key}">编辑</button>
                        <button class="btn btn-danger" data-action="delete" data-key="${link.key}">删除</button>
                        <button class="status-toggle-btn ${link.shenhe === '已审' ? 'active-reviewed' : 'active-pending'}" 
                            data-action="toggle" data-key="${link.key}" data-field="shenhe">
                            ${link.shenhe || '已审'}
                        </button>
                        <button class="status-toggle-btn ${link.zhuangtai === '有效' ? 'active-valid' : 'active-invalid'}" 
                            data-action="toggle" data-key="${link.key}" data-field="zhuangtai">
                            ${link.zhuangtai || '有效'}
                        </button>
                    </div>
                </div>
                <div class="link-card-body">
                    <div class="link-card-info">${utils.formatDate(link.time)}</div>
                    <a href="${link.url}" target="_blank" class="link-card-url" title="${link.url}">${link.url || ''}</a>
                </div>
                <div class="link-card-footer">
                    <span>${footerParts.join(' | ')}</span>
                </div>
            `;
            
            fragment.appendChild(card);
        }
        
        container.appendChild(fragment);
        this.loadedCount = endIndex;
        
        if (typeof piliangModule !== 'undefined') {
            setTimeout(() => piliangModule.updateCardsSelection(), 0);
        }
    },
    
    async showModal(key = null) {
        this.currentEditKey = key;
        this.isEditMode = !!key;
        const link = key ? firebase.ruanjiankuData[key] : null;
        
        document.getElementById('modalLinkName').value = link?.name || '';
        document.getElementById('modalLinkUrl').value = link?.url || '';
        document.getElementById('modalLinkContributor').value = link?.tougao || '';
        
        const navSelect = document.getElementById('modalLinkNav');
        navSelect.innerHTML = '';
        
        const sortedNavItems = Object.entries(firebase.xiangmuData)
            .filter(([_, v]) => v && typeof v === 'object' && v.name)
            .sort((a, b) => (a[1].xuhao ?? 999) - (b[1].xuhao ?? 999));
        
        sortedNavItems.forEach(([navKey, navItem]) => {
            const option = document.createElement('option');
            option.value = navKey;
            option.textContent = navItem.name;
            if (link?.daohang === navKey) option.selected = true;
            navSelect.appendChild(option);
        });
        
        const selectedNavKey = navSelect.value;
        this.updateTypeSelect(selectedNavKey, link?.type);
        
        if (link?.url) {
            const detected = utils.detectNavAndType(link.url, firebase.xiangmuData);
            this.urlDetectedNav = detected.navKey;
            this.urlDetectedType = detected.type;
        } else {
            this.urlDetectedNav = null;
            this.urlDetectedType = null;
        }
        
        document.getElementById('addLinkModal').classList.add('show');
    },
    
    hideModal() {
        document.getElementById('addLinkModal').classList.remove('show');
    },
    
    updateTypeSelect(navKey, selectedType = null) {
        const typeSelect = document.getElementById('modalLinkType');
        typeSelect.innerHTML = '';
        
        const navItem = firebase.xiangmuData[navKey];
        const types = utils.getTypesFromNav(navItem);
        
        const allOption = document.createElement('option');
        allOption.value = '*';
        allOption.textContent = '通用';
        typeSelect.appendChild(allOption);
        
        types.forEach(typeName => {
            const option = document.createElement('option');
            option.value = typeName;
            option.textContent = typeName;
            typeSelect.appendChild(option);
        });
        
        if (selectedType) {
            const cleanType = selectedType.replace(/^\*/, '');
            if (types.includes(cleanType)) {
                typeSelect.value = cleanType;
            } else {
                typeSelect.value = '*';
            }
        } else {
            typeSelect.value = '*';
        }
    },
    
    async save() {
        const name = document.getElementById('modalLinkName').value.trim();
        const url = document.getElementById('modalLinkUrl').value.trim();
        const navKey = document.getElementById('modalLinkNav').value;
        const type = document.getElementById('modalLinkType').value;
        const contributor = document.getElementById('modalLinkContributor').value.trim();
        
        const success = await zujianModule.saveResource({
            key: this.currentEditKey,
            name,
            url,
            navKey,
            type,
            contributor
        });
        
        if (success) {
            this.hideModal();
        }
    },
    
    async delete(key) {
        const success = await zujianModule.deleteResource(key);
        if (success) {
            piliangModule.selectedKeys.delete(key);
            piliangModule.updateButtonStates();
        }
    },
    
    async toggleStatus(key, field) {
        await zujianModule.toggleStatus(key, field);
    }
};