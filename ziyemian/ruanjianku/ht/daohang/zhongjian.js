// 中间导航模块 - 优化版
const zhongjianNav = {
    currentFilter: null,
    
    render() {
        const container = document.querySelector('.nav-section-middle');
        if (!container) return;
        
        const fragment = document.createDocumentFragment();
        
        // 渲染weizhi='中部'的导航项（包括weizhi为空的兼容旧数据）
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
            if (link.daohang !== zhongjianNav.currentFilter) continue;
            
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
        
        // 加载更多后更新选中状态
        if (typeof piliangModule !== 'undefined') {
            setTimeout(() => piliangModule.updateCardsSelection(), 0);
        }
    },
    
    onUrlInput() {
        const urlInput = document.getElementById('modalLinkUrl');
        const navSelect = document.getElementById('modalLinkNav');
        const typeSelect = document.getElementById('modalLinkType');
        const url = urlInput.value.trim();
        
        if (!url) {
            if (!this.isEditMode) {
                navSelect.disabled = true;
                typeSelect.disabled = true;
                navSelect.value = '';
                typeSelect.innerHTML = '<option value="">请选择</option>';
            }
            return;
        }
        
        if (!this.isEditMode) {
            const existingKey = zujianModule.checkUrlExists(url);
            if (existingKey) {
                Toast.show('该链接已存在，将加载现有信息', 'warning');
                this.showModal(existingKey);
                return;
            }
        }
        
        const { navKey, type } = utils.detectNavAndType(url, firebase.xiangmuData);
        this.urlDetectedNav = navKey;
        this.urlDetectedType = type;
        
        navSelect.disabled = false;
        
        if (navKey && type) {
            navSelect.value = navKey;
            this.populateTypeOptions(navKey);
            typeSelect.value = type;
        } else {
            navSelect.value = zhongjianNav.currentFilter || 'other';
            this.populateTypeOptions(navSelect.value);
        }
    },
    
    populateNavOptions() {
        const select = document.getElementById('modalLinkNav');
        const fragment = document.createDocumentFragment();
        
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = '请选择';
        fragment.appendChild(defaultOption);
        
        Object.entries(firebase.xiangmuData)
            .filter(([key, value]) => value && typeof value === 'object' && value.name)
            .sort((a, b) => (a[1].xuhao ?? 999) - (b[1].xuhao ?? 999))
            .forEach(([key, navItem]) => {
                const option = document.createElement('option');
                option.value = key;
                option.textContent = navItem.name;
                fragment.appendChild(option);
            });
        
        select.innerHTML = '';
        select.appendChild(fragment);
    },
    
    populateTypeOptions(navKey) {
        const typeSelect = document.getElementById('modalLinkType');
        const fragment = document.createDocumentFragment();
        
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = '请选择';
        fragment.appendChild(defaultOption);
        
        if (!navKey) {
            typeSelect.innerHTML = '';
            typeSelect.appendChild(fragment);
            typeSelect.disabled = true;
            return;
        }
        
        typeSelect.disabled = false;
        const navItem = firebase.xiangmuData[navKey];
        if (!navItem) return;
        
        const types = utils.getTypesFromNav(navItem);
        if (types.length === 0) {
            const option = document.createElement('option');
            option.value = '*';
            option.textContent = '*';
            fragment.appendChild(option);
            typeSelect.innerHTML = '';
            typeSelect.appendChild(fragment);
            typeSelect.value = '*';
            typeSelect.disabled = true;
        } else {
            types.forEach(type => {
                const option = document.createElement('option');
                option.value = type;
                option.textContent = type;
                fragment.appendChild(option);
            });
            typeSelect.innerHTML = '';
            typeSelect.appendChild(fragment);
        }
    },
    
    onNavChange() {
        const navKey = document.getElementById('modalLinkNav').value;
        this.populateTypeOptions(navKey);
    },

    showModal(key = null) {
        this.currentEditKey = key;
        this.isEditMode = !!key;
        this.urlDetectedNav = null;
        this.urlDetectedType = null;
        
        const modal = document.getElementById('addLinkModal');
        const urlInput = document.getElementById('modalLinkUrl');
        const navSelect = document.getElementById('modalLinkNav');
        const typeSelect = document.getElementById('modalLinkType');
        const nameInput = document.getElementById('modalLinkName');
        const contributorInput = document.getElementById('modalLinkContributor');
        
        this.populateNavOptions();
        
        if (this.isEditMode) {
            const item = firebase.ruanjiankuData[key];
            nameInput.value = item?.name || '';
            urlInput.value = item?.url || '';
            contributorInput.value = item?.tougao || '';
            
            navSelect.disabled = false;
            navSelect.value = item?.daohang || '';
            
            this.populateTypeOptions(item?.daohang);
            typeSelect.value = item?.type || '';
        } else {
            nameInput.value = '';
            urlInput.value = '';
            contributorInput.value = '';
            
            navSelect.disabled = true;
            typeSelect.disabled = true;
            navSelect.value = '';
            typeSelect.innerHTML = '<option value="">请选择</option>';
        }
        
        urlInput.oninput = () => this.onUrlInput();
        navSelect.onchange = () => this.onNavChange();
        
        document.querySelector('#addLinkModal .modal-title').textContent = '@编辑资源';
        modal.classList.add('show');
    },

    hideModal() {
        document.getElementById('addLinkModal').classList.remove('show');
    },

    async save() {
        const success = await zujianModule.saveResource({
            key: this.currentEditKey,
            name: document.getElementById('modalLinkName').value,
            url: document.getElementById('modalLinkUrl').value,
            navKey: document.getElementById('modalLinkNav').value,
            type: document.getElementById('modalLinkType').value,
            contributor: document.getElementById('modalLinkContributor').value
        });
        
        if (success) {
            this.hideModal();
        }
    },

    async toggleStatus(key, field) {
        await zujianModule.toggleStatus(key, field);
    },

    async delete(key) {
        await zujianModule.deleteResource(key);
    }
};