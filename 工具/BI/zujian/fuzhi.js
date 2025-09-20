// 复制模块 - 修复设置按钮图标位置
const FuzhiModule = (function() {
    
    function init() {
        createButton();
    }
    
    function createButton() {
        const btn = document.createElement('div');
        btn.className = 'action-btn fuzhi-btn';
        btn.innerHTML = '<i class="fas fa-copy"></i>';
        btn.title = '复制为图片';
        btn.onclick = handleCopy;
        document.body.appendChild(btn);
    }
    
    async function handleCopy() {
        const table = document.getElementById('dataTable');
        
        if (!table || !table.querySelector('tbody tr')) {
            window.showToast('没有数据可复制', 'warning');
            return;
        }
        
        if (typeof html2canvas === 'undefined') {
            window.showToast('截图库未加载', 'error');
            return;
        }
        
        try {
            window.showToast('正在生成截图...', 'info');
            
            // 获取表格完整尺寸
            const tableWidth = table.scrollWidth;
            const tableHeight = table.scrollHeight;
            const viewWidth = Math.max(window.innerWidth, tableWidth + 100);
            const viewHeight = Math.max(window.innerHeight, tableHeight + 200);
            
            // 创建临时容器
            const tempContainer = document.createElement('div');
            tempContainer.style.cssText = `
                position: fixed;
                left: -99999px;
                top: 0;
                width: ${viewWidth}px;
                height: ${viewHeight}px;
                z-index: -1;
                pointer-events: none;
                background-color: #0a0e1a;
                background-image: url("beijing.png");
                background-size: cover;
                background-position: center;
                display: flex;
                align-items: center;
                justify-content: center;
                font-family: ${window.getComputedStyle(document.body).fontFamily};
            `;
            
            // 克隆主容器
            const mainContainer = document.querySelector('.main-container');
            if (mainContainer) {
                const clonedMain = mainContainer.cloneNode(true);
                clonedMain.style.width = `${tableWidth + 60}px`;
                clonedMain.style.height = `${tableHeight + 100}px`;
                clonedMain.style.maxWidth = 'none';
                clonedMain.style.maxHeight = 'none';
                clonedMain.style.minWidth = 'unset';
                clonedMain.style.minHeight = 'unset';
                tempContainer.appendChild(clonedMain);
                
                // 展开表格显示
                const clonedWrapper = clonedMain.querySelector('.table-wrapper');
                if (clonedWrapper) {
                    clonedWrapper.style.overflow = 'visible';
                }
                
                const clonedScroll = clonedMain.querySelector('.table-scroll');
                if (clonedScroll) {
                    clonedScroll.style.overflow = 'visible';
                }
                
                // 修复表格sticky定位
                const clonedTable = clonedMain.querySelector('.data-table');
                if (clonedTable) {
                    clonedTable.querySelectorAll('thead, thead th:first-child, tbody td:first-child').forEach(el => {
                        el.style.position = 'relative';
                        el.style.left = '0';
                        el.style.top = '0';
                    });
                }
            }
            
            // 复制所有固定定位的信息栏
            // 左上角时间组
            const datetimeGroup = document.querySelector('.datetime-group');
            if (datetimeGroup) {
                const cloned = datetimeGroup.cloneNode(true);
                cloned.style.position = 'absolute';
                cloned.style.left = '16px';
                cloned.style.top = '16px';
                tempContainer.appendChild(cloned);
            }
            
            // 右上角信息条
            const topInfoBar = document.querySelector('.top-info-bar');
            if (topInfoBar) {
                const cloned = topInfoBar.cloneNode(true);
                cloned.style.position = 'absolute';
                cloned.style.right = '16px';
                cloned.style.top = '16px';
                cloned.style.left = 'auto';
                tempContainer.appendChild(cloned);
            }
            
            // 左下角更新信息
            const updateInfo = document.querySelector('.update-info');
            if (updateInfo) {
                const cloned = updateInfo.cloneNode(true);
                cloned.style.position = 'absolute';
                cloned.style.left = '16px';
                cloned.style.bottom = '16px';
                cloned.style.top = 'auto';
                tempContainer.appendChild(cloned);
            }
            
            // 右下角按钮组 - 修复设置按钮特殊处理
            function cloneButton(selector, rightOffset, isSettingBtn = false) {
                const btn = document.querySelector(selector);
                if (!btn) return;
                
                const cloned = btn.cloneNode(true);
                
                // 按钮容器样式
                cloned.style.cssText = `
                    position: absolute;
                    right: ${rightOffset};
                    bottom: 12px;
                    width: 32px;
                    height: 32px;
                    border-radius: 0;
                    background: rgba(20, 24, 36, 0.95);
                    backdrop-filter: blur(10px);
                    border: 2px solid #0080ff;
                    cursor: pointer;
                    z-index: 999;
                    box-shadow: 0 0 20px rgba(0, 128, 255, 0.6);
                    color: #00ccff;
                    padding: 0;
                    margin: 0;
                    box-sizing: border-box;
                    overflow: hidden;
                    clip-path: polygon(0 0, calc(100% - ${isSettingBtn ? '8px' : '6px'}) 0, 100% ${isSettingBtn ? '8px' : '6px'}, 100% 100%, ${isSettingBtn ? '8px' : '6px'} 100%, 0 calc(100% - ${isSettingBtn ? '8px' : '6px'}));
                `;
                
                // 图标样式 - 移除所有动画和类名
                const icon = cloned.querySelector('i');
                if (icon) {
                    // 清除所有类名和样式，重新设置
                    icon.className = isSettingBtn ? 'fas fa-cog' : icon.className;
                    icon.style.cssText = `
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        font-size: ${isSettingBtn ? '15px' : '14px'};
                        color: #00ccff;
                        margin: 0;
                        padding: 0;
                        line-height: 1;
                        display: block;
                        width: auto;
                        height: auto;
                        animation: none !important;
                        transition: none !important;
                    `;
                }
                
                tempContainer.appendChild(cloned);
            }
            
            // 克隆三个按钮
            cloneButton('.shezhi-btn', '12px', true);
            cloneButton('.xiazai-btn', '54px');
            cloneButton('.fuzhi-btn', '96px');
            
            // 添加到页面
            document.body.appendChild(tempContainer);
            
            // 等待渲染完成
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // 截图
            const canvas = await html2canvas(tempContainer, {
                backgroundColor: null,
                scale: 2,
                width: viewWidth,
                height: viewHeight,
                windowWidth: viewWidth,
                windowHeight: viewHeight,
                logging: false,
                useCORS: true,
                allowTaint: true
            });
            
            // 移除临时容器
            document.body.removeChild(tempContainer);
            
            // 复制到剪贴板
            await copyToClipboard(canvas);
            
            window.showToast('已复制到剪贴板', 'success');
            
        } catch (error) {
            // 清理临时容器
            const temp = document.querySelector('div[style*="left: -99999px"]');
            if (temp) temp.remove();
            
            window.showToast('复制失败: ' + error.message, 'error');
        }
    }
    
    async function copyToClipboard(canvas) {
        return new Promise((resolve, reject) => {
            canvas.toBlob(async (blob) => {
                try {
                    const item = new ClipboardItem({ 'image/png': blob });
                    await navigator.clipboard.write([item]);
                    resolve();
                } catch (err) {
                    reject(err);
                }
            }, 'image/png', 1.0);
        });
    }
    
    return { init };
})();