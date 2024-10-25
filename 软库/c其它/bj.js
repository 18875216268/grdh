document.addEventListener('DOMContentLoaded', function() {
    const defaultBackground = '#0d1117'; // 默认背景颜色
    const remoteBackground = 'https://vip.helloimg.com/i/2024/07/22/669e30bf7238a.jpg'; // 远程背景图片
    const localBackground = 'c其它/背景.png'; // 本地背景图片

    const bodyElement = document.body;

    // 尝试加载本地图片
    const img = new Image();
    img.src = localBackground;
    img.onload = function() {
        // 如果本地图片存在，设置为背景
        bodyElement.style.backgroundImage = `url('${localBackground}')`;
    };
    img.onerror = function() {
        // 如果本地图片不存在，尝试加载远程图片
        const remoteImg = new Image();
        remoteImg.src = remoteBackground;
        remoteImg.onload = function() {
            bodyElement.style.backgroundImage = `url('${remoteBackground}')`;
        };
        remoteImg.onerror = function() {
            // 如果远程图片也加载失败，使用默认背景颜色
            bodyElement.style.backgroundColor = defaultBackground;
        };
    };
});