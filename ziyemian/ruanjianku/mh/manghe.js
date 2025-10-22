// ==========================================
// 盲盒模块 - 显示导航分类/资源类型
// ==========================================

const BlindBoxModule = (() => {
    let modal, boxScene, twistBtn, resultCard;
    let allResources = [];
    let gridItems = [];
    let isAnimating = false;
    
    const rotateOrder = [0, 1, 2, 4, 7, 6, 5, 3];
    
    // 初始化
    function init() {
        modal = document.getElementById('blindboxModal');
        boxScene = document.querySelector('.box-scene');
        twistBtn = document.getElementById('twistBtn');
        resultCard = document.getElementById('resultCard');
        gridItems = Array.from(document.querySelectorAll('.grid-item:not(.center)'));
        
        bindEvents();
    }
    
    // 绑定事件
    function bindEvents() {
        document.getElementById('blindboxBtn').addEventListener('click', open);
        document.getElementById('blindboxClose').addEventListener('click', close);
        twistBtn.addEventListener('click', startDraw);
        document.getElementById('visitResultBtn').addEventListener('click', visitResult);
        document.getElementById('retryBtn').addEventListener('click', reset);
    }
    
    // 打开弹窗
    function open() {
        allResources = window.FirebaseModule.getResources();
        if (allResources.length === 0) {
            window.showToast('暂无可用资源', 'warning');
            return;
        }
        modal.classList.add('show');
        reset();
    }
    
    // 关闭弹窗
    function close() {
        modal.classList.remove('show');
        reset();
    }
    
    // 开始抽取
    async function startDraw() {
        if (isAnimating) return;
        isAnimating = true;
        
        twistBtn.disabled = true;
        twistBtn.textContent = '抽取中...';
        
        const selectedResource = getRandomResource();
        const finalGridIndex = await runSlotMachine();
        
        await showResourceOnGrid(finalGridIndex, selectedResource);
        
        setTimeout(() => {
            boxScene.classList.add('hide');
            twistBtn.classList.add('hide');
            displayResult(selectedResource);
        }, 1500);
        
        isAnimating = false;
    }
    
    // 老虎机旋转
    function runSlotMachine() {
        return new Promise(resolve => {
            const stopRotateIndex = Math.floor(Math.random() * 8);
            let currentIndex = 0;
            let stepCount = 0;
            
            const baseSpeed = 30 + Math.random() * 30;
            const totalRounds = 2 + Math.random();
            const totalSteps = Math.floor(totalRounds * 8) + stopRotateIndex;
            const slowStartStep = totalSteps - 12;
            
            let timer;
            
            function rotate() {
                gridItems.forEach(item => item.classList.remove('active'));
                
                const gridIndex = rotateOrder[currentIndex];
                gridItems[gridIndex].classList.add('active');
                
                currentIndex = (currentIndex + 1) % 8;
                stepCount++;
                
                if (stepCount >= totalSteps) {
                    clearTimeout(timer);
                    const finalGridIndex = rotateOrder[(currentIndex - 1 + 8) % 8];
                    resolve(finalGridIndex);
                    return;
                }
                
                let interval = baseSpeed;
                if (stepCount >= slowStartStep) {
                    const slowProgress = (stepCount - slowStartStep) / 12;
                    interval = baseSpeed + slowProgress * slowProgress * 200;
                }
                
                timer = setTimeout(rotate, interval);
            }
            
            rotate();
        });
    }
    
    // 在九宫格显示资源
    function showResourceOnGrid(gridIndex, resource) {
        return new Promise(resolve => {
            const item = gridItems[gridIndex];
            const backFace = item.querySelector('.grid-face.back');
            
            backFace.textContent = resource.name.length > 12 
                ? resource.name.substring(0, 12) + '...' 
                : resource.name;
            
            setTimeout(() => {
                item.classList.add('flip');
                
                let blinkCount = 0;
                const blinkInterval = setInterval(() => {
                    item.style.boxShadow = blinkCount % 2 === 0 
                        ? '0 0 30px rgba(255, 215, 0, 0.8)' 
                        : '0 0 15px rgba(255, 215, 0, 0.4)';
                    blinkCount++;
                    if (blinkCount >= 6) {
                        clearInterval(blinkInterval);
                        resolve();
                    }
                }, 200);
            }, 300);
        });
    }
    
    // 获取随机资源
    function getRandomResource() {
        const valid = allResources.filter(r => r.zhuangtai === '有效');
        const list = valid.length > 0 ? valid : allResources;
        return list[Math.floor(Math.random() * list.length)];
    }
    
    // 显示结果
    function displayResult(r) {
        resultCard.dataset.id = r.id;
        resultCard.dataset.url = r.url;
        
        const date = new Date(r.time).toISOString().split('T')[0].replace(/-/g, '/');
        const xiangmuData = window.FirebaseModule.getXiangmuData();
        const navName = xiangmuData[r.daohang]?.name || '其它资源';
        const category = r.type === '*' ? navName : `${navName}/${r.type}`;
        
        document.getElementById('resultTitle').textContent = r.name;
        document.getElementById('resultAuthor').textContent = r.tougao;
        document.getElementById('resultDate').textContent = date;
        document.getElementById('resultType').textContent = category;
        document.getElementById('resultUrl').textContent = r.url;
        
        resultCard.classList.add('show');
    }
    
    // 访问结果
    async function visitResult() {
        const url = resultCard.dataset.url;
        if (!url) return;
        
        window.open(url, '_blank');
        const resource = allResources.find(r => r.id === resultCard.dataset.id);
        if (resource) {
            await window.FirebaseModule.updateVisits(resultCard.dataset.id, resource.visits);
        }
    }
    
    // 重置状态
    function reset() {
        boxScene.classList.remove('hide');
        twistBtn.classList.remove('hide');
        twistBtn.disabled = false;
        twistBtn.textContent = '随机抽取';
        resultCard.classList.remove('show');
        
        gridItems.forEach(item => {
            item.classList.remove('active', 'flip');
            item.style.boxShadow = '';
            const backFace = item.querySelector('.grid-face.back');
            if (backFace) backFace.textContent = '';
        });
        
        isAnimating = false;
    }
    
    return { init };
})();

window.BlindBoxModule = BlindBoxModule;