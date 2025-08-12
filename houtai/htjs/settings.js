// 设置管理模块
const Settings = {
    // 初始化
    async init() {
        await this.loadBasicSettings();
        await this.loadAccountInfo();
    },

    // 加载基础设置
    async loadBasicSettings() {
        try {
            await waitForFirebase();
            const settings = await window.FirebaseAuth.getSettings();
            
            if (settings) {
                document.getElementById('avatarUrl').value = settings.avatarUrl || '';
                document.getElementById('siteTitle').value = settings.siteTitle || '';
                document.getElementById('siteSubtitle').value = settings.siteSubtitle || '';
                document.getElementById('footerText').value = settings.footerText || '';
                document.getElementById('footerLink').value = settings.footerLink || '';
            }
        } catch (error) {
            console.error('加载基础设置失败:', error);
            tongzhi.error('设置加载失败');
        }
    },

    // 加载账户信息
    async loadAccountInfo() {
        try {
            await waitForFirebase();
            
            const currentAccount = await window.FirebaseAuth.getCurrentAccount();
            document.getElementById('currentUsername').value = currentAccount || 'admin';
            
            const currentPassword = await window.FirebaseAuth.getCurrentPassword();
            document.getElementById('currentPassword').value = currentPassword || '';
        } catch (error) {
            console.error('加载账号信息失败:', error);
            document.getElementById('currentUsername').value = 'admin';
            document.getElementById('currentPassword').value = '';
        }
    },

    // 保存基础设置
    async saveBasic() {
        try {
            await waitForFirebase();
            
            const settings = {
                avatarUrl: document.getElementById('avatarUrl').value.trim(),
                siteTitle: document.getElementById('siteTitle').value.trim(),
                siteSubtitle: document.getElementById('siteSubtitle').value.trim(),
                footerText: document.getElementById('footerText').value.trim(),
                footerLink: document.getElementById('footerLink').value.trim()
            };

            const success = await window.FirebaseAuth.saveSettings(settings);
            
            if (success) {
                tongzhi.success('基础设置已保存');
            } else {
                tongzhi.error('保存失败，请重试');
            }
        } catch (error) {
            console.error('保存基础设置失败:', error);
            tongzhi.error('保存失败，请重试');
        }
    },

    // 保存账户信息
    async saveAccount() {
        const newUsername = document.getElementById('newUsername').value.trim();
        const newPassword = document.getElementById('newPassword').value.trim();
        
        if (!newUsername && !newPassword) {
            tongzhi.warning('请输入新账号或新密码');
            return;
        }
        
        try {
            await waitForFirebase();
            
            const success = await window.FirebaseAuth.updateUserInfo(newUsername, newPassword);
            
            if (success) {
                tongzhi.success('账户信息已更新');
                
                document.getElementById('newUsername').value = '';
                document.getElementById('newPassword').value = '';
                
                if (newUsername) {
                    document.getElementById('currentUsername').value = newUsername;
                }
                if (newPassword) {
                    document.getElementById('currentPassword').value = newPassword;
                }
            } else {
                tongzhi.error('更新失败，请重试');
            }
        } catch (error) {
            console.error('保存账户信息失败:', error);
            tongzhi.error('更新失败，请重试');
        }
    }
};

// 将Settings暴露到全局
window.Settings = Settings;