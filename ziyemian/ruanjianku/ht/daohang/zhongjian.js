// 中间导航模块 - UI交互层
const zhongjianNav = {
    currentFilter: null,
    
    init() {
        this.render();
    },
    
    render() {
        const container = document.querySelector('.nav-section-middle');
        if (!container) return;
        
        container.innerHTML = '';
        
        const navItems = Object.entries(firebase.xiangmuData)
            .filter(([key, value]) => key !== 'other' && value && typeof value === 'object' && value.name)
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
            
            navElement.addEventListener('click', () => this.setFilter(key));
            container.appendChild(navElement);
        });
    },
    
    setFilter(navKey) {
        this.currentFilter = navKey;
        
        document.getElementById('globalSearchInput').value = '';
        document.getElementById('globalSearchClear').style.display = 'none';
        linksModule.searchKeyword = '';
        
        document.querySelectorAll('.nav-section-middle .admin-nav-item, .nav-section-bottom .admin-nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.navkey === navKey);
        });
        
        document.querySelectorAll('.nav-section-top .admin-nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        currentSection = 'links';
        document.querySelectorAll('.content-section').forEach(sec => {
            sec.classList.toggle('active', sec.id === 'links-section');
        });
        
        updateHeaderControls();
        linksModule.render();
    },
    
    getFilteredLinks() {
        const allLinks = Object.entries(firebase.ruanjiankuData)
            .filter(([key, value]) => value && typeof value === 'object')
            .map(([key, value]) => ({ key, ...value }));
        
        if (!this.currentFilter) return [];
        
        return allLinks.filter(link => link.daohang === this.currentFilter);
    }
};

// 链接管理模块 - UI交互层
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
        
        this.allLinks = [];
        this.filteredLinks = [];
        this.loadedCount = 0;
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
        
        this.loadedCount = 0;
        this.filteredLinks = searchModule.filterItems(this.allLinks, this.searchKeyword);
        
        if (this.filteredLinks.length === 0) {
            container.innerHTML = '<div class="empty-card">未找到匹配的链接</div>';
            return;
        }
        
        this.filteredLinks.sort((a, b) => (b.time || 0) - (a.time || 0));
        container.innerHTML = '';
        this.loadMore();
    },
    
    loadMore() {
        if (this.loadedCount >= this.filteredLinks.length) return;
        
        const container = document.getElementById('linksCardsGrid');
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
            
            container.insertAdjacentHTML('beforeend', `
                <div class="link-card" data-key="${link.key}">
                    <div class="link-card-header">
                        <div class="link-card-title">${link.name || '未命名'}</div>
                        <div class="link-card-actions">
                            <button class="btn btn-primary" onclick="linksModule.showModal('${link.key}')">编辑</button>
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
                        <span>${footerParts.join(' | ')}</span>
                    </div>
                </div>
            `);
        }
        
        this.loadedCount = endIndex;
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
        select.innerHTML = '<option value="">请选择</option>';
        
        Object.entries(firebase.xiangmuData)
            .filter(([key, value]) => value && typeof value === 'object' && value.name)
            .sort((a, b) => (a[1].xuhao ?? 999) - (b[1].xuhao ?? 999))
            .forEach(([key, navItem]) => {
                const option = document.createElement('option');
                option.value = key;
                option.textContent = navItem.name;
                select.appendChild(option);
            });
    },
    
    populateTypeOptions(navKey) {
        const typeSelect = document.getElementById('modalLinkType');
        typeSelect.innerHTML = '<option value="">请选择</option>';
        
        if (!navKey) {
            typeSelect.disabled = true;
            return;
        }
        
        typeSelect.disabled = false;
        const navItem = firebase.xiangmuData[navKey];
        if (!navItem) return;
        
        const types = utils.getTypesFromNav(navItem);
        if (types.length === 0) {
            typeSelect.innerHTML = '<option value="*">*</option>';
            typeSelect.value = '*';
            typeSelect.disabled = true;
        } else {
            types.forEach(type => {
                const option = document.createElement('option');
                option.value = type;
                option.textContent = type;
                typeSelect.appendChild(option);
            });
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