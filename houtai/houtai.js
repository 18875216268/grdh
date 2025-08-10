let currentEditingItem = null;
let currentEditingMode = 'add';
let selectedIconName = 'plus';
let currentChart = null;
let currentStats = null;
let currentView = 'hourly';

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    // 检查登录状态
    setTimeout(() => {
        if (window.FirebaseAuth && !window.FirebaseAuth.checkLoginStatus()) {
            window.location.href = '../index.html';
        }
    }, 1000);

    // 初始化各部分
    createParticles();
    lucide.createIcons();
    initNavigation();
    initChartControls(); // 初始化图表控制
    loadVisitorStats(); // 加载真实访客统计数据
    initLinkEditModal();
    initLinkManagement();
    loadCurrentAccountInfo(); // 加载当前账号信息
    loadBasicSettings(); // 加载基础设置
    loadLinksList(); // 加载链接列表
});

// 初始化图表控制
function initChartControls() {
    // 设置日期选择器默认值为今天
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    document.getElementById('datePicker').value = `${year}-${month}-${day}`;
    
    // 日期选择器变化事件
    document.getElementById('datePicker').addEventListener('change', function() {
        updateChart();
    });
    
    // 视图切换按钮事件
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelector('.view-btn.active').classList.remove('active');
            this.classList.add('active');
            currentView = this.dataset.view;
            updateChart();
        });
    });
}

// 加载访客统计数据
async function loadVisitorStats() {
    try {
        // 等待Firebase模块加载
        if (!window.FirebaseAuth) {
            await new Promise(resolve => {
                const checkFirebase = setInterval(() => {
                    if (window.FirebaseAuth) {
                        clearInterval(checkFirebase);
                        resolve();
                    }
                }, 100);
            });
        }

        if (window.FirebaseAuth && window.FirebaseAuth.getVisitorStats) {
            const stats = await window.FirebaseAuth.getVisitorStats();
            
            if (stats) {
                currentStats = stats;
                
                // 更新统计数字
                document.querySelector('.stat-card:nth-child(1) .stat-number').textContent = 
                    stats.todayVisitors.toLocaleString();
                document.querySelector('.stat-card:nth-child(2) .stat-number').textContent = 
                    stats.monthVisitors.toLocaleString();
                document.querySelector('.stat-card:nth-child(3) .stat-number').textContent = 
                    stats.totalVisitors.toLocaleString();
                document.querySelector('.stat-card:nth-child(4) .stat-number').textContent = 
                    stats.monthGrowthRate + '%';
                
                // 初始化图表
                updateChart();
            } else {
                // 如果获取失败，显示默认值
                initChart([], []);
            }
        } else {
            initChart([], []);
        }
    } catch (error) {
        console.error('加载访客统计失败:', error);
        initChart([], []);
    }
}

// 更新图表 - 修改为使用横杠格式
function updateChart() {
    if (!currentStats || !currentStats.rawData) return;
    
    const selectedDate = new Date(document.getElementById('datePicker').value);
    let labels = [];
    let data = [];
    
    switch (currentView) {
        case 'hourly':
            // 显示选定日期的24小时数据
            const year = selectedDate.getFullYear();
            const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
            const day = String(selectedDate.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`; // 使用横杠格式
            
            for (let hour = 0; hour < 24; hour++) {
                const hourStr = String(hour).padStart(2, '0');
                const timeNode = `${dateStr} ${hourStr}`;
                labels.push(`${hour}:00`);
                data.push(currentStats.rawData[timeNode] || 0);
            }
            break;
            
        case 'daily':
            // 显示选定月份的每日数据
            const selectedYear = selectedDate.getFullYear();
            const selectedMonth = selectedDate.getMonth();
            const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
            
            for (let day = 1; day <= daysInMonth; day++) {
                const dayStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`; // 使用横杠格式
                labels.push(`${selectedMonth + 1}月${day}日`);
                
                // 统计该日所有小时的访客总和
                let dayTotal = 0;
                for (let hour = 0; hour < 24; hour++) {
                    const timeNode = `${dayStr} ${String(hour).padStart(2, '0')}`;
                    if (currentStats.rawData[timeNode]) {
                        dayTotal += currentStats.rawData[timeNode];
                    }
                }
                data.push(dayTotal);
            }
            break;
            
        case 'monthly':
            // 显示选定年份的12个月数据
            const year2 = selectedDate.getFullYear();
            const months = ['一月', '二月', '三月', '四月', '五月', '六月', 
                          '七月', '八月', '九月', '十月', '十一月', '十二月'];
            
            for (let month = 0; month < 12; month++) {
                const monthStr = `${year2}-${String(month + 1).padStart(2, '0')}`; // 使用横杠格式
                labels.push(months[month]);
                
                // 统计该月所有数据的总和
                let monthTotal = 0;
                Object.entries(currentStats.rawData).forEach(([timeNode, count]) => {
                    if (timeNode.startsWith(monthStr)) {
                        monthTotal += count;
                    }
                });
                data.push(monthTotal);
            }
            break;
    }
    
    initChart(labels, data);
}

// 初始化图表
function initChart(labels, data) {
    const ctx = document.getElementById('visitorChart').getContext('2d');
    
    // 如果图表已存在，先销毁
    if (currentChart) {
        currentChart.destroy();
    }
    
    currentChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: 'rgba(102, 126, 234, 0.6)',
                borderColor: 'rgba(102, 126, 234, 1)',
                borderWidth: 1,
                borderRadius: 4,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    ticks: { 
                        color: 'rgba(255, 255, 255, 0.6)',
                        stepSize: 1
                    }
                },
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    ticks: { 
                        color: 'rgba(255, 255, 255, 0.6)',
                        maxRotation: 45,
                        minRotation: 0
                    }
                }
            }
        }
    });
}

// 加载当前账号信息到禁用输入框
async function loadCurrentAccountInfo() {
    try {
        if (!window.FirebaseAuth) {
            await new Promise(resolve => {
                const checkFirebase = setInterval(() => {
                    if (window.FirebaseAuth) {
                        clearInterval(checkFirebase);
                        resolve();
                    }
                }, 100);
            });
        }
        
        if (window.FirebaseAuth && window.FirebaseAuth.getCurrentAccount) {
            // 获取当前账号
            const currentAccount = await window.FirebaseAuth.getCurrentAccount();
            document.getElementById('currentUsername').value = currentAccount || 'admin';
            
            // 获取当前密码 - 明文显示
            const currentPassword = await getCurrentPassword();
            document.getElementById('currentPassword').value = currentPassword || '';
        }
    } catch (error) {
        console.error('加载账号信息失败:', error);
        document.getElementById('currentUsername').value = 'admin';
        document.getElementById('currentPassword').value = '';
    }
}

// 获取当前密码（明文显示）
async function getCurrentPassword() {
    try {
        if (!window.FirebaseAuth) {
            await new Promise(resolve => {
                const checkFirebase = setInterval(() => {
                    if (window.FirebaseAuth) {
                        clearInterval(checkFirebase);
                        resolve();
                    }
                }, 100);
            });
        }
        
        // 通过Firebase获取当前密码
        if (window.FirebaseAuth && window.FirebaseAuth.getCurrentPassword) {
            return await window.FirebaseAuth.getCurrentPassword();
        } else {
            // 如果没有专门的获取密码方法，返回空字符串
            // 实际项目中这里可以调用相应的API
            return '';
        }
    } catch (error) {
        console.error('获取密码失败:', error);
        return '';
    }
}

// 创建粒子效果
function createParticles() {
    const container = document.getElementById('particles');
    for (let i = 0; i < 30; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 20 + 's';
        particle.style.animationDuration = (15 + Math.random() * 10) + 's';
        container.appendChild(particle);
    }
}

// 初始化导航
function initNavigation() {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            document.querySelector('.nav-link.active').classList.remove('active');
            link.classList.add('active');
            
            document.querySelector('.content-section.active').classList.remove('active');
            document.getElementById(link.dataset.section).classList.add('active');
        });
    });
}

// 初始化链接编辑弹窗
function initLinkEditModal() {
    const iconGrid = document.getElementById('iconGrid');
    
    // 创建图标选项
    ADMIN_ICONS.forEach(iconName => {
        const option = document.createElement('div');
        option.className = 'icon-option';
        option.setAttribute('data-icon', iconName);
        option.innerHTML = `<i data-lucide="${iconName}"></i>`;
        option.onclick = () => selectIconInModal(iconName);
        iconGrid.appendChild(option);
    });
    
    lucide.createIcons();
}

// 初始化链接管理
function initLinkManagement() {
    document.getElementById('addLinkBtn').onclick = () => {
        openLinkEditModal('add');
    };
}

// 加载链接列表
async function loadLinksList() {
    try {
        // 等待Firebase模块加载
        if (!window.FirebaseAuth) {
            await new Promise(resolve => {
                const checkFirebase = setInterval(() => {
                    if (window.FirebaseAuth) {
                        clearInterval(checkFirebase);
                        resolve();
                    }
                }, 100);
            });
        }

        if (window.FirebaseAuth && window.FirebaseAuth.getLinks) {
            const links = await window.FirebaseAuth.getLinks();
            
            // 清空现有列表
            const linkList = document.getElementById('linkList');
            linkList.innerHTML = '';
            
            // 添加从数据库加载的链接
            links.forEach(link => {
                addLinkItemFromData(link);
            });
        }
    } catch (error) {
        console.error('加载链接列表失败:', error);
        tongzhi.error('链接列表加载失败');
    }
}

// 从数据创建链接项（不触发数据库操作）
function addLinkItemFromData(linkData) {
    const linkList = document.getElementById('linkList');
    const item = document.createElement('li');
    item.className = 'link-item';
    item.setAttribute('data-link-id', linkData.id);
    item.setAttribute('data-link-icon', linkData.icon);
    
    item.innerHTML = `
        <div class="link-info">
            <div class="link-icon">
                <i data-lucide="${linkData.icon}"></i>
            </div>
            <div class="link-details">
                <div class="link-text">${linkData.text}</div>
                <div class="link-url">${linkData.url}</div>
            </div>
        </div>
        <div class="link-actions">
            <button class="btn btn-secondary edit-btn" onclick="editLink(this)">编辑</button>
            <button class="btn btn-success" onclick="visitLink(this)">访问</button>
            <button class="btn btn-danger" onclick="removeLink(this)">删除</button>
        </div>
    `;
    linkList.appendChild(item);
    lucide.createIcons();
}

// 添加链接项
function addLinkItem(data = {}) {
    const linkList = document.getElementById('linkList');
    const item = document.createElement('li');
    item.className = 'link-item';
    
    // 设置默认值
    const linkData = {
        id: data.id || `temp_${Date.now()}`,
        icon: data.icon || 'plus',
        text: data.text || '未命名链接',
        url: data.url || '#'
    };
    
    item.setAttribute('data-link-id', linkData.id);
    item.setAttribute('data-link-icon', linkData.icon);
    
    item.innerHTML = `
        <div class="link-info">
            <div class="link-icon">
                <i data-lucide="${linkData.icon}"></i>
            </div>
            <div class="link-details">
                <div class="link-text">${linkData.text}</div>
                <div class="link-url">${linkData.url}</div>
            </div>
        </div>
        <div class="link-actions">
            <button class="btn btn-secondary edit-btn" onclick="editLink(this)">编辑</button>
            <button class="btn btn-success" onclick="visitLink(this)">访问</button>
            <button class="btn btn-danger" onclick="removeLink(this)">删除</button>
        </div>
    `;
    linkList.appendChild(item);
    lucide.createIcons();
    
    return linkData.id;
}

// 编辑链接
function editLink(btn) {
    const linkItem = btn.closest('.link-item');
    currentEditingItem = linkItem;
    
    openLinkEditModal('edit', {
        text: linkItem.querySelector('.link-text').textContent,
        url: linkItem.querySelector('.link-url').textContent,
        icon: linkItem.getAttribute('data-link-icon') || 'plus'
    });
}

// 访问链接
function visitLink(btn) {
    const url = btn.closest('.link-item').querySelector('.link-url').textContent.trim();
    if (url && url !== '#') {
        window.open(/^https?:\/\//.test(url) ? url : 'https://' + url, '_blank');
    }
}

// 删除链接
async function removeLink(btn) {
    const linkItem = btn.closest('.link-item');
    const linkId = linkItem.getAttribute('data-link-id');
    
    try {
        if (window.FirebaseAuth && window.FirebaseAuth.deleteLink) {
            const success = await window.FirebaseAuth.deleteLink(linkId);
            
            if (success) {
                linkItem.remove();
                tongzhi.success('链接已删除');
            } else {
                tongzhi.error('删除失败，请重试');
            }
        } else {
            // 如果Firebase未加载，仅从UI移除
            linkItem.remove();
            tongzhi.info('链接已删除');
        }
    } catch (error) {
        console.error('删除链接失败:', error);
        tongzhi.error('删除失败，请重试');
    }
}

// 打开链接编辑弹窗
function openLinkEditModal(mode, data = {}) {
    currentEditingMode = mode;
    const modal = document.getElementById('linkEditModal');
    
    document.getElementById('linkNameInput').value = data.text || '';
    document.getElementById('linkUrlInput').value = data.url || '';
    
    selectedIconName = data.icon || 'plus';
    selectIconInModal(selectedIconName);
    
    modal.classList.add('show');
    document.getElementById('linkNameInput').focus();
}

// 关闭链接编辑弹窗
function closeLinkEditModal() {
    const modal = document.getElementById('linkEditModal');
    modal.classList.remove('show');
    currentEditingItem = null;
    currentEditingMode = 'add';
    selectedIconName = 'plus';
    
    // 清空输入
    document.getElementById('linkNameInput').value = '';
    document.getElementById('linkUrlInput').value = '';
    
    // 清除选中状态
    document.querySelectorAll('#iconGrid .icon-option').forEach(option => {
        option.classList.remove('selected');
    });
}

// 选择图标
function selectIconInModal(iconName) {
    selectedIconName = iconName;
    
    document.querySelectorAll('#iconGrid .icon-option').forEach(option => {
        option.classList.toggle('selected', option.getAttribute('data-icon') === iconName);
    });
}

// 保存链接 - 与数据库同步
async function saveLinkFromModal() {
    const linkData = {
        text: document.getElementById('linkNameInput').value.trim() || '未命名链接',
        url: document.getElementById('linkUrlInput').value.trim() || '#',
        icon: selectedIconName
    };
    
    try {
        if (currentEditingMode === 'add') {
            // 添加新链接
            if (window.FirebaseAuth && window.FirebaseAuth.addLink) {
                const linkId = await window.FirebaseAuth.addLink(linkData);
                
                if (linkId) {
                    // 添加到UI
                    addLinkItem({ ...linkData, id: linkId });
                    tongzhi.success('链接添加成功');
                } else {
                    tongzhi.error('添加失败，请重试');
                    return;
                }
            } else {
                // Firebase未加载时的本地添加
                addLinkItem(linkData);
                tongzhi.info('链接添加成功');
            }
            
        } else if (currentEditingMode === 'edit' && currentEditingItem) {
            // 编辑现有链接
            const linkId = currentEditingItem.getAttribute('data-link-id');
            
            if (window.FirebaseAuth && window.FirebaseAuth.updateLink) {
                const success = await window.FirebaseAuth.updateLink(linkId, linkData);
                
                if (success) {
                    // 更新UI
                    currentEditingItem.setAttribute('data-link-icon', linkData.icon);
                    currentEditingItem.querySelector('.link-text').textContent = linkData.text;
                    currentEditingItem.querySelector('.link-url').textContent = linkData.url;
                    
                    // 更新图标
                    const iconContainer = currentEditingItem.querySelector('.link-icon');
                    iconContainer.innerHTML = `<i data-lucide="${linkData.icon}"></i>`;
                    lucide.createIcons({ nodes: [iconContainer] });
                    
                    tongzhi.success('链接修改成功');
                } else {
                    tongzhi.error('修改失败，请重试');
                    return;
                }
            } else {
                // Firebase未加载时的本地更新
                currentEditingItem.setAttribute('data-link-icon', linkData.icon);
                currentEditingItem.querySelector('.link-text').textContent = linkData.text;
                currentEditingItem.querySelector('.link-url').textContent = linkData.url;
                
                const iconContainer = currentEditingItem.querySelector('.link-icon');
                iconContainer.innerHTML = `<i data-lucide="${linkData.icon}"></i>`;
                lucide.createIcons({ nodes: [iconContainer] });
                
                tongzhi.info('链接修改成功');
            }
        }
        
        closeLinkEditModal();
        
    } catch (error) {
        console.error('保存链接失败:', error);
        tongzhi.error('保存失败，请重试');
    }
}

// 加载基础设置
async function loadBasicSettings() {
    try {
        // 等待Firebase模块加载
        if (!window.FirebaseAuth) {
            await new Promise(resolve => {
                const checkFirebase = setInterval(() => {
                    if (window.FirebaseAuth) {
                        clearInterval(checkFirebase);
                        resolve();
                    }
                }, 100);
            });
        }

        if (window.FirebaseAuth && window.FirebaseAuth.getSettings) {
            const settings = await window.FirebaseAuth.getSettings();
            
            if (settings) {
                // 填充表单数据
                document.getElementById('avatarUrl').value = settings.avatarUrl || '';
                document.getElementById('siteTitle').value = settings.siteTitle || '';
                document.getElementById('siteSubtitle').value = settings.siteSubtitle || '';
                document.getElementById('footerText').value = settings.footerText || '';
                document.getElementById('footerLink').value = settings.footerLink || '';
            }
        }
    } catch (error) {
        console.error('加载基础设置失败:', error);
        tongzhi.error('设置加载失败');
    }
}

// 保存基础设置
async function saveBasicSettings() {
    try {
        // 等待Firebase模块加载
        if (!window.FirebaseAuth || !window.FirebaseAuth.saveSettings) {
            tongzhi.warning('系统正在加载，请稍后重试');
            return;
        }

        // 获取表单数据
        const settings = {
            avatarUrl: document.getElementById('avatarUrl').value.trim(),
            siteTitle: document.getElementById('siteTitle').value.trim(),
            siteSubtitle: document.getElementById('siteSubtitle').value.trim(),
            footerText: document.getElementById('footerText').value.trim(),
            footerLink: document.getElementById('footerLink').value.trim()
        };

        // 保存到数据库
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
}

// 保存账户信息
async function saveAccountInfo() {
    const newUsername = document.getElementById('newUsername').value.trim();
    const newPassword = document.getElementById('newPassword').value.trim();
    
    if (!newUsername && !newPassword) {
        tongzhi.warning('请输入新账号或新密码');
        return;
    }
    
    try {
        if (!window.FirebaseAuth || !window.FirebaseAuth.updateUserInfo) {
            tongzhi.warning('系统正在加载，请稍后重试');
            return;
        }
        
        const success = await window.FirebaseAuth.updateUserInfo(newUsername, newPassword);
        
        if (success) {
            tongzhi.success('账户信息已更新');
            
            // 清空新账号和密码输入框
            document.getElementById('newUsername').value = '';
            document.getElementById('newPassword').value = '';
            
            // 更新当前显示的账号信息
            if (newUsername) {
                document.getElementById('currentUsername').value = newUsername;
            }
            
            // 如果修改了密码，更新当前密码显示
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

// 退出登录
function logout() {
    if (window.FirebaseAuth) {
        window.FirebaseAuth.setLoginStatus('false');
    }
    
    try {
        if (window.opener && !window.opener.closed) {
            window.opener.postMessage({ type: 'logout' }, '*');
        }
    } catch (e) {}
    
    window.location.href = '../index.html';
}

// ESC键关闭弹窗
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const modal = document.getElementById('linkEditModal');
        if (modal.classList.contains('show')) {
            closeLinkEditModal();
        }
    }
});