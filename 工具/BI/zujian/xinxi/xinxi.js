// 信息显示模块 (v1.0)
const XinxiModule = (function() {
    const weekDays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    let clockInterval = null;
    
    // 启动实时时钟
    function startRealtimeClock() {
        function updateClock() {
            const now = new Date();
            
            // 时分秒
            const clockTime = document.getElementById('clockTime');
            if (clockTime) {
                const hours = String(now.getHours()).padStart(2, '0');
                const minutes = String(now.getMinutes()).padStart(2, '0');
                const seconds = String(now.getSeconds()).padStart(2, '0');
                clockTime.textContent = `${hours}:${minutes}:${seconds}`;
            }
            
            // 年月日
            const clockDate = document.getElementById('clockDate');
            if (clockDate) {
                const year = now.getFullYear();
                const month = String(now.getMonth() + 1).padStart(2, '0');
                const day = String(now.getDate()).padStart(2, '0');
                clockDate.textContent = `${year}/${month}/${day}`;
            }
            
            // 星期
            const clockWeek = document.getElementById('clockWeek');
            if (clockWeek) {
                clockWeek.textContent = weekDays[now.getDay()];
            }
        }
        
        updateClock();
        
        // 清除旧的定时器
        if (clockInterval) {
            clearInterval(clockInterval);
        }
        
        // 设置新的定时器
        clockInterval = setInterval(updateClock, 1000);
    }
    
    // 更新时间进度
    function updateTimeProgress() {
        const now = new Date();
        const currentDay = now.getDate() - 1;
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const percentage = Math.round((currentDay / daysInMonth) * 100);
        
        const element = document.getElementById('timeProgress');
        if (element) {
            element.textContent = `${percentage}%`;
        }
    }
    
    // 更新人数
    function updatePeopleCount(count) {
        const element = document.getElementById('peopleCount');
        if (element) {
            element.textContent = count;
        }
    }
    
    // 更新连接状态
    function updateConnectionStatus(connected) {
        const indicator = document.getElementById('statusIndicator');
        if (indicator) {
            indicator.className = connected ? 'status-dot' : 'status-dot disconnected';
        }
    }
    
    // 更新数据更新时间显示
    function updateDataTime(shijian, jindu) {
        const element = document.getElementById('updateText');
        if (element) {
            element.textContent = `当前数据更新于${shijian || '--'}，时间进度为${jindu || '--'}`;
        }
    }
    
    // 初始化
    function init() {
        // 启动实时时钟
        startRealtimeClock();
        
        // 初始化时间进度
        updateTimeProgress();
        
        // 初始化连接状态
        updateConnectionStatus(false);
    }
    
    // 销毁
    function destroy() {
        if (clockInterval) {
            clearInterval(clockInterval);
            clockInterval = null;
        }
    }
    
    // 公开接口
    return {
        init,
        destroy,
        updateTimeProgress,
        updatePeopleCount,
        updateConnectionStatus,
        updateDataTime
    };
})();