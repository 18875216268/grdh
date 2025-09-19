// 复制模块 - 截图复制到剪贴板（修复第一列）
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
            
            // 克隆整个表格容器
            const originalContainer = document.querySelector('.table-container');
            const clonedContainer = originalContainer.cloneNode(true);
            
            // 获取克隆的内部元素
            const clonedWrapper = clonedContainer.querySelector('.table-wrapper');
            const clonedScroll = clonedContainer.querySelector('.table-scroll');
            const clonedTable = clonedContainer.querySelector('.data-table');
            
            // 获取表格实际尺寸
            const tableWidth = table.scrollWidth;
            const tableHeight = table.scrollHeight;
            
            // 计算容器尺寸
            const containerPadding = 24;
            const wrapperBorder = 2;
            const totalWidth = tableWidth + containerPadding + wrapperBorder;
            const totalHeight = tableHeight + containerPadding + wrapperBorder;
            
            // 设置克隆容器的样式
            clonedContainer.style.cssText = `
                width: ${totalWidth}px;
                height: ${totalHeight}px;
                max-width: none;
                max-height: none;
                position: fixed;
                left: -99999px;
                top: 0;
                background: rgba(20, 24, 36, 0.4);
                border: 2px solid #0080ff;
                padding: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 0 20px rgba(0, 128, 255, 0.6), inset 0 0 50px rgba(0, 128, 255, 0.1);
                clip-path: polygon(0 10px, 10px 0, calc(100% - 10px) 0, 100% 10px, 100% calc(100% - 10px), calc(100% - 10px) 100%, 10px 100%, 0 calc(100% - 10px));
                z-index: -1;
            `;
            
            clonedWrapper.style.cssText = `
                width: ${tableWidth + wrapperBorder}px;
                height: ${tableHeight + wrapperBorder}px;
                overflow: visible;
                border: 1px solid #2a3447;
                background: rgba(10, 14, 26, 0.2);
                position: relative;
            `;
            
            clonedScroll.style.cssText = `
                width: ${tableWidth}px;
                height: ${tableHeight}px;
                overflow: visible;
                background: rgba(10, 14, 26, 0.3);
                position: relative;
            `;
            
            clonedTable.style.cssText = `
                width: 100%;
                border-collapse: separate;
                border-spacing: 0;
                position: relative;
            `;
            
            // 修复第一列和表头的sticky定位
            // 将sticky改为relative，因为在截图时不需要固定效果
            clonedTable.querySelectorAll('thead th:first-child, tbody td:first-child').forEach(cell => {
                cell.style.position = 'relative';
                cell.style.left = '0';
                cell.style.zIndex = 'auto';
            });
            
            clonedTable.querySelector('thead').style.position = 'relative';
            clonedTable.querySelector('thead').style.top = '0';
            
            // 将克隆的容器添加到body
            document.body.appendChild(clonedContainer);
            
            // 等待渲染
            await new Promise(resolve => requestAnimationFrame(resolve));
            
            // 计算缩放
            const maxWidth = 3000;
            const scale = totalWidth > maxWidth ? maxWidth / totalWidth : 1;
            
            // 生成canvas
            const canvas = await html2canvas(clonedContainer, {
                backgroundColor: '#0a0e1a',
                scale: 2,
                width: totalWidth,
                height: totalHeight,
                windowWidth: totalWidth,
                windowHeight: totalHeight,
                x: 0,
                y: 0,
                scrollX: 0,
                scrollY: 0,
                logging: false,
                useCORS: true,
                allowTaint: true,
                foreignObjectRendering: false
            });
            
            // 移除克隆的容器
            document.body.removeChild(clonedContainer);
            
            // 处理缩放
            let finalCanvas = canvas;
            if (scale < 1) {
                finalCanvas = document.createElement('canvas');
                const ctx = finalCanvas.getContext('2d');
                finalCanvas.width = Math.floor(canvas.width * scale);
                finalCanvas.height = Math.floor(canvas.height * scale);
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(canvas, 0, 0, finalCanvas.width, finalCanvas.height);
            }
            
            // 复制到剪贴板
            await copyToClipboard(finalCanvas);
            
            window.showToast('已复制到剪贴板', 'success');
            
        } catch (error) {
            // 清理可能残留的克隆元素
            const cloned = document.querySelector('.table-container[style*="left: -99999px"]');
            if (cloned) {
                document.body.removeChild(cloned);
            }
            
            window.showToast('复制失败: ' + error.message, 'error');
        }
    }
    
    async function copyToClipboard(canvas) {
        return new Promise((resolve, reject) => {
            canvas.toBlob(async (blob) => {
                try {
                    if (navigator.clipboard && window.ClipboardItem) {
                        const item = new ClipboardItem({ 'image/png': blob });
                        await navigator.clipboard.write([item]);
                        resolve();
                    } else {
                        reject(new Error('浏览器不支持剪贴板API'));
                    }
                } catch (err) {
                    reject(err);
                }
            }, 'image/png', 1.0);
        });
    }
    
    return { init };
})();