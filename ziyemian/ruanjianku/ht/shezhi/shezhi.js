// 设置管理模块（资源分类配置 + 过滤规则）
const shezhiModule = {
    currentNavKey: null,
    
    // 显示设置弹窗
    showModal(navKey) {
        if (!navKey) {
            Toast.show('导航项不存在', 'error');
            return;
        }
        
        this.currentNavKey = navKey;
        const modal = document.getElementById('settingsModal');
        const navItem = firebase.xiangmuData[navKey];
        
        if (!navItem) {
            Toast.show('导航项不存在', 'error');
            return;
        }
        
        // 更新弹窗标题
        document.querySelector('#settingsModal .modal-title').textContent = 
            `@设置 - ${navItem.name}`;
        
        // 加载资源分类配置
        const configText = this.convertConfigToText(navItem);
        document.getElementById('modalResourceConfig').value = configText;
        
        // 加载过滤规则
        const guize = navItem.guize || {};
        const youxiao = guize.youxiao || '通用:*;';
        const wuxiao = guize.wuxiao || '通用:*;';
        
        document.getElementById('validRulesInput').value = youxiao;
        document.getElementById('invalidRulesInput').value = wuxiao;
        
        modal.classList.add('show');
    },
    
    // 隐藏弹窗
    hideModal() {
        document.getElementById('settingsModal').classList.remove('show');
    },
    
    // 提取配置（排除name、icon、xuhao、time、guize、weizhi、mima）
    extractConfig(navItem) {
        if (!navItem || typeof navItem !== 'object') return {};
        const config = {};
        for (const [key, value] of Object.entries(navItem)) {
            if (!['name', 'icon', 'xuhao', 'time', 'guize', 'weizhi', 'mima'].includes(key) && 
                value && typeof value === 'object') {
                config[key] = value;
            }
        }
        return config;
    },
    
    // 配置对象转文本
    convertConfigToText(navItem) {
        const config = this.extractConfig(navItem);
        return Object.entries(config)
            .sort((a, b) => (a[1].xuhao ?? 999) - (b[1].xuhao ?? 999))
            .map(([typeName, typeData]) => `${typeName}:${typeData.yuming || ''}`)
            .join('\n');
    },
    
    // 文本转配置对象
    convertTextToConfig(text) {
        if (!text || !text.trim()) return {};
        const result = {};
        text.split('\n').map(l => l.trim()).filter(l => l).forEach((line, index) => {
            const colonIndex = line.indexOf(':');
            if (colonIndex === -1) return;
            const typeName = line.substring(0, colonIndex).trim();
            const yuming = line.substring(colonIndex + 1).trim();
            if (typeName) {
                result[typeName] = { yuming, xuhao: index + 1, time: Date.now() };
            }
        });
        return result;
    },
    
    // 解析规则文本为对象
    parseRulesText(text) {
        if (!text || !text.trim()) return { '通用': '*' };
        
        const result = {};
        text.split(';')
            .map(line => line.trim())
            .filter(line => line && line.includes(':'))
            .forEach(line => {
                const colonIndex = line.indexOf(':');
                const type = line.substring(0, colonIndex).trim();
                const keywords = line.substring(colonIndex + 1).trim();
                if (type) result[type] = keywords || '*';
            });
        
        return Object.keys(result).length > 0 ? result : { '通用': '*' };
    },
    
    // 规则对象转文本
    formatRulesObject(rulesObj) {
        return Object.entries(rulesObj)
            .map(([type, keywords]) => `${type}:${keywords};`)
            .join('\n');
    },
    
    // 验证并过滤规则
    validateRules(rulesObj, validTypes) {
        const result = {};
        
        // 保留"通用"和有效的类型
        for (const [type, keywords] of Object.entries(rulesObj)) {
            if (type === '通用' || validTypes.includes(type)) {
                result[type] = keywords;
            }
        }
        
        return Object.keys(result).length > 0 ? result : { '通用': '*' };
    },
    
    // 保存配置和规则
    async save() {
        if (!this.currentNavKey) {
            Toast.show('未选择导航项', 'error');
            return;
        }
        
        const navItem = firebase.xiangmuData[this.currentNavKey];
        if (!navItem) {
            Toast.show('导航项不存在', 'error');
            return;
        }
        
        const updates = {};
        
        // 1. 处理资源分类配置
        const configText = document.getElementById('modalResourceConfig').value.trim();
        const newConfig = this.convertTextToConfig(configText);
        const oldConfig = this.extractConfig(navItem);
        
        const oldTypes = Object.keys(oldConfig);
        const newTypes = Object.keys(newConfig);
        
        // 删除不存在的类型
        oldTypes.forEach(type => {
            if (!newTypes.includes(type)) {
                updates[`xiangmu/${this.currentNavKey}/${type}`] = null;
            }
        });
        
        // 新增或更新类型
        newTypes.forEach(type => {
            const oldData = oldConfig[type];
            const newData = newConfig[type];
            
            if (!oldData) {
                updates[`xiangmu/${this.currentNavKey}/${type}`] = newData;
            } else {
                if (oldData.yuming !== newData.yuming) {
                    updates[`xiangmu/${this.currentNavKey}/${type}/yuming`] = newData.yuming;
                }
                if (oldData.xuhao !== newData.xuhao) {
                    updates[`xiangmu/${this.currentNavKey}/${type}/xuhao`] = newData.xuhao;
                }
            }
        });
        
        // 2. 处理过滤规则
        const validText = document.getElementById('validRulesInput').value.trim();
        const invalidText = document.getElementById('invalidRulesInput').value.trim();
        
        // 解析规则
        let validRules = this.parseRulesText(validText);
        let invalidRules = this.parseRulesText(invalidText);
        
        // 验证并过滤规则（使用新的配置中的类型）
        validRules = this.validateRules(validRules, newTypes);
        invalidRules = this.validateRules(invalidRules, newTypes);
        
        // 转换为文本格式存储
        const youxiao = this.formatRulesObject(validRules);
        const wuxiao = this.formatRulesObject(invalidRules);
        
        updates[`xiangmu/${this.currentNavKey}/guize/youxiao`] = youxiao;
        updates[`xiangmu/${this.currentNavKey}/guize/wuxiao`] = wuxiao;
        
        // 3. 保存到数据库
        try {
            await window.firebaseDB.update(
                window.firebaseDB.ref(window.firebaseDB.database),
                updates
            );
            Toast.show('设置保存成功', 'success');
            this.hideModal();
        } catch (error) {
            console.error('保存失败:', error);
            Toast.show('保存失败，请重试', 'error');
        }
    }
};