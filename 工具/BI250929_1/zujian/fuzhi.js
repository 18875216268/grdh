// 复制模块 - 路径健壮版 (v2.0)
const FuzhiModule = (function() {
    
    function init() {
        const btn = document.createElement('div');
        btn.className = 'action-btn fuzhi-btn';
        btn.innerHTML = '<i class="fas fa-copy"></i>';
        btn.title = '复制为图片';
        btn.onclick = handleCopy;
        document.body.appendChild(btn);
    }
    
    // 获取基础路径（确保无论部署在哪都能正确找到资源）
    function getBasePath() {
        const scripts = document.querySelectorAll('script[src]');
        for (const script of scripts) {
            if (script.src.includes('fuzhi.js')) {
                // fuzhi.js 在 zujian/ 目录下，所以基础路径需要去掉 zujian/fuzhi.js
                return script.src.replace(/zujian\/fuzhi\.js.*$/, '');
            }
        }
        // 备用方案：使用当前页面路径
        return window.location.href.replace(/\/[^/]*$/, '/');
    }
    
    // 预加载图片
    function preloadImage(src) {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null); // 失败时返回null，不阻塞流程
            img.src = src;
        });
    }
    
    async function handleCopy() {
        const table = document.getElementById('dataTable');
        
        if (!table || !table.querySelector('tbody tr')) {
            window.showToast('没有数据可复制。', 'warning');
            return;
        }
        
        if (typeof html2canvas === 'undefined') {
            window.showToast('截图库未加载。', 'error');
            return;
        }
        
        try {
            window.showToast('正在生成截图...', 'info');
            
            const basePath = getBasePath();
            const bgImageUrl = basePath + 'beijing.png';
            
            // 预加载背景图片
            const bgImage = await preloadImage(bgImageUrl);
            
            const tableWidth = table.scrollWidth;
            const tableHeight = table.scrollHeight;
            const viewWidth = Math.max(window.innerWidth, tableWidth + 100);
            const viewHeight = Math.max(window.innerHeight, tableHeight + 200);
            
            // 创建临时容器
            const tempContainer = document.createElement('div');
            
            // 构建背景样式（有图片用图片，没有用纯色）
            let bgStyle = 'background-color: #0a0e1a;';
            if (bgImage) {
                bgStyle += ` background-image: url("${bgImageUrl}"); background-size: cover; background-position: center;`;
            }
            
            tempContainer.style.cssText = `
                position: fixed;
                left: -99999px;
                top: 0;
                width: ${viewWidth}px;
                height: ${viewHeight}px;
                z-index: -1;
                pointer-events: none;
                ${bgStyle}
                display: flex;
                align-items: center;
                justify-content: center;
                font-family: ${window.getComputedStyle(document.body).fontFamily};
            `;
            
            // 克隆主容器
            const mainContainer = document.querySelector('.main-container');
            if (mainContainer) {
                const clonedMain = mainContainer.cloneNode(true);
                clonedMain.style.cssText = `
                    width: ${tableWidth + 60}px;
                    height: ${tableHeight + 100}px;
                    max-width: none;
                    max-height: none;
                    min-width: unset;
                    min-height: unset;
                `;
                tempContainer.appendChild(clonedMain);
                
                // 展开表格显示
                const clonedWrapper = clonedMain.querySelector('.table-wrapper');
                if (clonedWrapper) clonedWrapper.style.overflow = 'visible';
                
                const clonedScroll = clonedMain.querySelector('.table-scroll');
                if (clonedScroll) clonedScroll.style.overflow = 'visible';
                
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
            
            // 克隆信息栏函数
            function cloneInfoPanel(selector, x, y, position) {
                const element = document.querySelector(selector);
                if (!element) return;
                
                const cloned = element.cloneNode(true);
                cloned.style.position = 'absolute';
                
                if (position.includes('top')) cloned.style.top = y;
                if (position.includes('bottom')) cloned.style.bottom = y;
                if (position.includes('left')) cloned.style.left = x;
                if (position.includes('right')) cloned.style.right = x;
                if (position.includes('right')) cloned.style.left = 'auto';
                if (position.includes('bottom')) cloned.style.top = 'auto';
                
                tempContainer.appendChild(cloned);
            }
            
            // 复制信息栏
            cloneInfoPanel('.datetime-group', '16px', '16px', 'top-left');
            cloneInfoPanel('.top-info-bar', '16px', '16px', 'top-right');
            cloneInfoPanel('.update-info', '16px', '16px', 'bottom-left');
            
            // 克隆按钮函数
            function cloneButton(selector, rightOffset, isSettingBtn) {
                const btn = document.querySelector(selector);
                if (!btn) return;
                
                const cloned = btn.cloneNode(true);
                cloned.style.cssText = `
                    position: absolute;
                    right: ${rightOffset};
                    bottom: 12px;
                    width: 32px;
                    height: 32px;
                    background: rgba(20, 24, 36, 0.95);
                    border: 2px solid #0080ff;
                    color: #00ccff;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    clip-path: polygon(0 0, calc(100% - ${isSettingBtn ? '8px' : '6px'}) 0, 100% ${isSettingBtn ? '8px' : '6px'}, 100% 100%, ${isSettingBtn ? '8px' : '6px'} 100%, 0 calc(100% - ${isSettingBtn ? '8px' : '6px'}));
                    box-shadow: 0 0 20px rgba(0, 128, 255, 0.6);
                `;
                
                const icon = cloned.querySelector('i');
                if (icon) {
                    icon.style.cssText = `
                        font-size: ${isSettingBtn ? '15px' : '14px'};
                        color: #00ccff;
                        font-family: "Font Awesome 6 Free", "FontAwesome", sans-serif;
                        font-weight: 900;
                        line-height: 1;
                        display: block;
                        margin: 0;
                        padding: ${isSettingBtn ? '8px 0 9px 0' : '8px 0 10px 0'};
                        text-align: center;
                        width: 100%;
                        box-sizing: border-box;
                        text-rendering: optimizeLegibility;
                        -webkit-font-smoothing: antialiased;
                        -moz-osx-font-smoothing: grayscale;
                    `;
                }
                
                tempContainer.appendChild(cloned);
            }
            
            // 克隆右下角按钮
            cloneButton('.chakan-btn', '138px', false);
            cloneButton('.shezhi-btn', '12px', true);
            cloneButton('.xiazai-btn', '54px', false);
            cloneButton('.fuzhi-btn', '96px', false);
            
            document.body.appendChild(tempContainer);
            
            // 等待渲染
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // 截图
            const canvas = await html2canvas(tempContainer, {
                backgroundColor: '#0a0e1a', // 始终设置兜底背景色
                scale: 2,
                width: viewWidth,
                height: viewHeight,
                windowWidth: viewWidth,
                windowHeight: viewHeight,
                logging: false,
                useCORS: true,
                allowTaint: true
            });
            
            document.body.removeChild(tempContainer);
            
            // 检查 canvas 是否有效
            if (canvas.width === 0 || canvas.height === 0) {
                throw new Error('生成的画布无效');
            }
            
            // 复制到剪贴板
            canvas.toBlob(async (blob) => {
                if (!blob) {
                    window.showToast('生成图片失败', 'error');
                    return;
                }
                
                try {
                    const item = new ClipboardItem({ 'image/png': blob });
                    await navigator.clipboard.write([item]);
                    window.showToast('已复制到剪贴板。', 'success');
                } catch (err) {
                    // 剪贴板API失败时，提供下载作为备选
                    console.error('剪贴板写入失败:', err);
                    downloadAsBackup(blob);
                }
            }, 'image/png', 1.0);
            
        } catch (error) {
            // 清理临时容器
            const temp = document.querySelector('div[style*="left: -99999px"]');
            if (temp) temp.remove();
            
            console.error('复制失败:', error);
            window.showToast('复制失败：' + error.message, 'error');
        }
    }
    
    // 备用下载方案
    function downloadAsBackup(blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `截图_${new Date().toISOString().slice(0,10)}.png`;
        a.click();
        URL.revokeObjectURL(url);
        window.showToast('已下载为图片（剪贴板不可用）', 'info');
    }
    
    return { init };
})();
