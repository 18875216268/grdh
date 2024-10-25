
window.onload = function () {
    document.getElementById('弹窗容器id').style.display = 'flex'; // 页面加载时显示弹窗
};

function confirmAccess() {
    document.getElementById('弹窗容器id').style.display = 'none'; // 隐藏弹窗
}

 // 返回按钮的点击事件
 function goBack() {
    window.location.href = '../index.html'; // 跳转到指定页面
}