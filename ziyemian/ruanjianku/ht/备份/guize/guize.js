// 过滤规则管理模块
const guizeModule = {
    currentNavKey: null,
    
    // 显示弹窗
    showModal(navKey) {
        if (!navKey) {
            Toast.show('导航项不存在', 'error');
            return;
        }
        
        this.currentNavKey = navKey;
        const modal = document.getElementById('filterRulesModal');
        const navItem = firebase.xiangmuData[navKey];
        
        if (!navItem) {
            Toast.show('导航项不存在', 'error');
            return;
        }
        
        // 更新弹窗标题显示当前导航项名称
        document.querySelector('#filterRulesModal .modal-title').textContent = 
            `@过滤规则设置 - ${navItem.name}`;
        
        // 加载规则
        const guize = navItem.guize || {};
        const youxiao = guize.youxiao || '通用:*;';
        const wuxiao = guize.wuxiao || '通用:*;';
        
        document.getElementById('validRulesInput').value = youxiao;
        document.getElementById('invalidRulesInput').value = wuxiao;
        
        modal.classList.add('show');
    },
    
    // 隐藏弹窗
    hideModal() {
        document.getElementById('filterRulesModal').classList.remove('show');
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
    validateRules(rulesObj) {
        const navItem = firebase.xiangmuData[this.currentNavKey];
        if (!navItem) return { '通用': '*' };
        
        const validTypes = utils.getTypesFromNav(navItem);
        const result = {};
        
        // 保留"通用"和有效的类型
        for (const [type, keywords] of Object.entries(rulesObj)) {
            if (type === '通用' || validTypes.includes(type)) {
                result[type] = keywords;
            }
        }
        
        return Object.keys(result).length > 0 ? result : { '通用': '*' };
    },
    
    // 保存规则
    async save() {
        if (!this.currentNavKey) {
            Toast.show('未选择导航项', 'error');
            return;
        }
        
        const validText = document.getElementById('validRulesInput').value.trim();
        const invalidText = document.getElementById('invalidRulesInput').value.trim();
        
        // 解析并验证规则
        let validRules = this.validateRules(this.parseRulesText(validText));
        let invalidRules = this.validateRules(this.parseRulesText(invalidText));
        
        // 转换为文本格式存储
        const youxiao = this.formatRulesObject(validRules);
        const wuxiao = this.formatRulesObject(invalidRules);
        
        // 保存到数据库
        const updates = {
            [`xiangmu/${this.currentNavKey}/guize/youxiao`]: youxiao,
            [`xiangmu/${this.currentNavKey}/guize/wuxiao`]: wuxiao
        };
        
        try {
            await window.firebaseDB.update(
                window.firebaseDB.ref(window.firebaseDB.database),
                updates
            );
            Toast.show('过滤规则保存成功', 'success');
            this.hideModal();
        } catch (error) {
            console.error('保存失败:', error);
            Toast.show('保存失败，请重试', 'error');
        }
    }
};