// 全局变量
let currentChart = null;
let currentStats = null;
let currentView = 'hourly';

// 公共函数 - 等待Firebase加载
async function waitForFirebase() {
    if (!window.FirebaseAuth) {
        await new Promise(resolve => {
            const checkInterval = setInterval(() => {
                if (window.FirebaseAuth) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100);
        });
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

// 初始化图表控制
function initChartControls() {
    const today = new Date();
    document.getElementById('datePicker').value = 
        `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    document.getElementById('datePicker').addEventListener('change', updateChart);
    
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelector('.view-btn.active').classList.remove('active');
            this.classList.add('active');
            currentView = this.dataset.view;
            updateChart();
        });
    });
}

// 加载访客统计
async function loadVisitorStats() {
    try {
        await waitForFirebase();
        const stats = await window.FirebaseAuth.getVisitorStats();
        
        if (stats) {
            currentStats = stats;
            const numbers = document.querySelectorAll('.stat-number');
            numbers[0].textContent = stats.todayVisitors.toLocaleString();
            numbers[1].textContent = stats.monthVisitors.toLocaleString();
            numbers[2].textContent = stats.totalVisitors.toLocaleString();
            numbers[3].textContent = stats.monthGrowthRate + '%';
            updateChart();
        } else {
            initChart([], []);
        }
    } catch (error) {
        console.error('加载访客统计失败:', error);
        initChart([], []);
    }
}

// 更新图表
function updateChart() {
    if (!currentStats?.rawData) return;
    
    const selectedDate = new Date(document.getElementById('datePicker').value);
    let labels = [], data = [];
    
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    
    switch (currentView) {
        case 'hourly':
            const dateStr = `${year}-${month}-${day}`;
            for (let hour = 0; hour < 24; hour++) {
                labels.push(`${hour}:00`);
                data.push(currentStats.rawData[`${dateStr} ${String(hour).padStart(2, '0')}`] || 0);
            }
            break;
            
        case 'daily':
            const daysInMonth = new Date(year, selectedDate.getMonth() + 1, 0).getDate();
            for (let d = 1; d <= daysInMonth; d++) {
                const dayStr = `${year}-${month}-${String(d).padStart(2, '0')}`;
                labels.push(`${selectedDate.getMonth() + 1}月${d}日`);
                let dayTotal = 0;
                for (let h = 0; h < 24; h++) {
                    dayTotal += currentStats.rawData[`${dayStr} ${String(h).padStart(2, '0')}`] || 0;
                }
                data.push(dayTotal);
            }
            break;
            
        case 'monthly':
            const months = ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'];
            for (let m = 0; m < 12; m++) {
                labels.push(months[m]);
                let monthTotal = 0;
                const monthStr = `${year}-${String(m + 1).padStart(2, '0')}`;
                Object.entries(currentStats.rawData).forEach(([timeNode, count]) => {
                    if (timeNode.startsWith(monthStr)) monthTotal += count;
                });
                data.push(monthTotal);
            }
            break;
    }
    
    initChart(labels, data);
}

// 初始化图表
function initChart(labels, data) {
    if (currentChart) currentChart.destroy();
    
    currentChart = new Chart(document.getElementById('visitorChart').getContext('2d'), {
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
            plugins: { legend: { display: false } },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    ticks: { color: 'rgba(255, 255, 255, 0.6)', stepSize: 1 }
                },
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    ticks: { color: 'rgba(255, 255, 255, 0.6)', maxRotation: 45, minRotation: 0 }
                }
            }
        }
    });
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

// 页面初始化
document.addEventListener('DOMContentLoaded', async function() {
    // 检查登录状态
    setTimeout(() => {
        if (window.FirebaseAuth && !window.FirebaseAuth.checkLoginStatus()) {
            window.location.href = '../index.html';
        }
    }, 1000);

    // 初始化各模块
    createParticles();
    lucide.createIcons();
    initNavigation();
    initChartControls();
    loadVisitorStats();
    
    // 初始化链接管理
    LinkManager.init();
    
    // 初始化站点访问管理
    SiteManager.init();
    
    // 初始化设置管理
    Settings.init();
});

// ESC键关闭弹窗
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const linkModal = document.getElementById('linkEditModal');
        const siteModal = document.getElementById('siteEditModal');
        
        if (linkModal.classList.contains('show')) {
            LinkManager.closeModal();
        }
        if (siteModal.classList.contains('show')) {
            SiteManager.closeModal();
        }
    }
});