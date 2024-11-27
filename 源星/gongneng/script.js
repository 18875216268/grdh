document.addEventListener('DOMContentLoaded', function() {
    // 获取功能块元素
    const 投稿块 = document.getElementById('投稿块');
    const 应用块 = document.getElementById('应用块');

    // 设置导航链接
    const navLinks = {
        'tougao': 'tougao.html',
        'yingyong': 'yingyong.html'
    };

    // 处理导航
    function handleNavigation(href) {
        try {
            if (href) {
                window.location.href = href;
            } else {
                alert('正在开发中......');
            }
        } catch (error) {
            console.error('Navigation error:', error);
            alert('正在开发中......');
        }
    }

    // 添加点击事件监听器
    投稿块.addEventListener('click', () => handleNavigation(navLinks['tougao']));
    应用块.addEventListener('click', () => handleNavigation(navLinks['yingyong']));
});