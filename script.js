// 创建粒子效果
function createParticles() {
    const particlesContainer = document.getElementById('particles');
    const particleCount = 40;

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 20 + 's';
        particle.style.animationDuration = (15 + Math.random() * 10) + 's';
        particlesContainer.appendChild(particle);
    }
}

// 更新登录按钮状态
function updateLoginButton() {
    const loginBtnText = document.getElementById('loginBtnText');
    if (window.FirebaseAuth && window.FirebaseAuth.checkLoginStatus()) {
        loginBtnText.textContent = '管理';
    } else {
        loginBtnText.textContent = '登录';
    }
}

// 登录相关功能
function initLogin() {
    const loginBtn = document.getElementById('loginBtn');
    const loginModal = document.getElementById('loginModal');
    const closeModal = document.getElementById('closeModal');
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');
    const submitBtn = document.getElementById('submitBtn');

    // 登录按钮点击事件
    loginBtn.addEventListener('click', function() {
        if (window.FirebaseAuth && window.FirebaseAuth.checkLoginStatus()) {
            // 已登录，跳转到后台
            window.open('houtai/houtai.html', '_blank');
        } else {
            // 未登录，显示登录弹窗
            loginModal.classList.add('show');
            document.getElementById('username').focus();
        }
    });

    // 关闭弹窗
    closeModal.addEventListener('click', function() {
        loginModal.classList.remove('show');
        errorMessage.style.display = 'none';
        loginForm.reset();
    });

    // 登录表单提交
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const inputUsername = document.getElementById('username').value.trim();
        const inputPassword = document.getElementById('password').value.trim();

        if (!inputUsername || !inputPassword) {
            showError('请输入账号和密码');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = '登录中...';

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

            // 基于用户输入验证登录
            const isValid = await window.FirebaseAuth.validateLogin(inputUsername, inputPassword);
            
            if (isValid) {
                // 设置登录状态
                window.FirebaseAuth.setLoginStatus('true');
                
                // 关闭弹窗
                loginModal.classList.remove('show');
                loginForm.reset();
                errorMessage.style.display = 'none';
                
                // 更新按钮状态
                updateLoginButton();
                
                // 跳转到后台
                setTimeout(() => {
                    window.open('houtai/houtai.html', '_blank');
                }, 500);
            } else {
                showError('账号或密码错误');
            }
        } catch (error) {
            console.error('登录失败:', error);
            showError('登录失败，请重试');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = '登录';
        }
    });

    // 显示错误信息
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
    }
}

// 监听网站设置（实时更新）
async function listenToSiteSettings() {
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

        if (window.FirebaseAuth && window.FirebaseAuth.listenToSettings) {
            window.FirebaseAuth.listenToSettings((settings) => {
                if (settings) {
                    // 更新头像
                    const avatar = document.getElementById('avatar');
                    if (settings.avatarUrl) {
                        avatar.style.backgroundImage = `url('${settings.avatarUrl}')`;
                    }
                    
                    // 更新标题
                    const siteTitle = document.getElementById('siteTitle');
                    if (settings.siteTitle) {
                        siteTitle.textContent = settings.siteTitle;
                        document.title = settings.siteTitle;
                    }
                    
                    // 更新副标题
                    const siteSubtitle = document.getElementById('siteSubtitle');
                    if (settings.siteSubtitle) {
                        siteSubtitle.textContent = settings.siteSubtitle;
                    }
                    
                    // 更新底部链接
                    const footerLink = document.getElementById('footerLink');
                    if (settings.footerText) {
                        footerLink.textContent = settings.footerText;
                    }
                    if (settings.footerLink) {
                        footerLink.href = settings.footerLink;
                    }
                }
            });
        }
    } catch (error) {
        console.error('监听网站设置失败:', error);
        // 使用默认值
        document.getElementById('siteTitle').textContent = '导航中心';
        document.getElementById('siteSubtitle').textContent = '探索 · 发现 · 连接无限可能';
        document.getElementById('footerLink').textContent = '加入社区交流群 (´▽`)ﾉ';
    }
}

// 监听链接列表（实时更新）
async function listenToLinksList() {
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

        if (window.FirebaseAuth && window.FirebaseAuth.listenToLinks) {
            window.FirebaseAuth.listenToLinks((links) => {
                // 清空现有列表
                const linkList = document.getElementById('linkList');
                linkList.innerHTML = '';
                
                // 添加链接项，带有动画延迟
                links.forEach((link, index) => {
                    const li = document.createElement('li');
                    li.className = 'link-item';
                    li.style.animationDelay = `${0.1 * (index + 1)}s`;
                    
                    const a = document.createElement('a');
                    a.href = link.url || '#';
                    a.target = '_blank';
                    
                    a.innerHTML = `
                        <i class="link-icon" data-lucide="${link.icon || 'link'}"></i>
                        <span class="link-text">${link.text || '未命名链接'}</span>
                        <span class="link-arrow">></span>
                    `;
                    
                    li.appendChild(a);
                    linkList.appendChild(li);
                });
                
                // 重新初始化图标
                lucide.createIcons();
            });
        }
    } catch (error) {
        console.error('监听链接列表失败:', error);
        // 显示加载失败提示
        const linkList = document.getElementById('linkList');
        linkList.innerHTML = '<li class="link-item"><span style="color: rgba(255,255,255,0.6); text-align: center; display: block;">链接加载失败</span></li>';
    }
}

// 记录访客访问
async function recordVisitorAccess() {
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

        if (window.FirebaseAuth && window.FirebaseAuth.recordVisit) {
            await window.FirebaseAuth.recordVisit();
        }
    } catch (error) {
        console.error('记录访客访问失败:', error);
    }
}

// 检查并更新登录状态（等待Firebase加载后执行）
function checkLoginStatusWhenReady() {
    const checkInterval = setInterval(() => {
        if (window.FirebaseAuth) {
            clearInterval(checkInterval);
            updateLoginButton();
        }
    }, 100);
}

// 监听来自后台页面的消息
function initMessageListener() {
    window.addEventListener('message', function(event) {
        if (event.data && event.data.type === 'logout') {
            // 收到退出登录消息，更新按钮状态
            updateLoginButton();
        }
    });
}

// 监听页面可见性变化，确保切换回页面时状态同步
function initVisibilityListener() {
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden && window.FirebaseAuth) {
            // 页面变为可见时，重新检查登录状态
            updateLoginButton();
        }
    });
}

// 页面卸载时清理监听器
function cleanupOnUnload() {
    window.addEventListener('beforeunload', () => {
        if (window.FirebaseAuth && window.FirebaseAuth.cleanupListeners) {
            window.FirebaseAuth.cleanupListeners();
        }
    });
}

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    createParticles();
    
    // 初始化Lucide图标
    lucide.createIcons();

    // 初始化登录功能
    initLogin();
    
    // 检查登录状态（等待Firebase模块加载）
    checkLoginStatusWhenReady();
    
    // 监听退出登录消息
    initMessageListener();
    
    // 监听页面可见性变化
    initVisibilityListener();
    
    // 监听网站设置（实时）
    listenToSiteSettings();
    
    // 监听链接列表（实时）
    listenToLinksList();
    
    // 记录访客访问
    recordVisitorAccess();
    
    // 页面卸载时清理
    cleanupOnUnload();
});