// ====== 计时器相关变量 ======
let timerInterval = null;
let isRunning = false;
let isPaused = false;
let timeLeft = 0;
let totalSeconds = 0;
let isWorkMode = true; // true = 工作模式，false = 休息模式
let todayFocusSeconds = 0;

// ====== 存储数据相关 ======
const STORAGE_KEY_FOCUS = 'focusTimerData';
const STORAGE_KEY_REVIEW = 'reviewData';

// ====== 初始化 ======
document.addEventListener('DOMContentLoaded', function() {
    loadTodayFocusTime();
    checkDailyReview();
    setupReviewForm();
    updateEnergyValue();
    loadWeekStats();
});

// ====== 页面切换 ======
function switchPage(pageName) {
    // 隐藏所有页面
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });

    // 显示选中页面
    document.getElementById(pageName + 'Page').classList.add('active');

    // 更新导航按钮
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');

    // 如果切换到统计页面，更新数据
    if (pageName === 'stats') {
        loadWeekStats();
        loadMonthStats();
    }

    // 如果切换到复盘页面，检查是否需要自动弹出
    if (pageName === 'review') {
        setTodayReviewDate();
    }
}

// ====== 计时器功能 ======
function startTimer() {
    if (isRunning) return;

    const workDuration = parseInt(document.getElementById('workDuration').value);
    const breakDuration = parseInt(document.getElementById('breakDuration').value);

    if (!isRunning && !isPaused) {
        // 第一次启动
        totalSeconds = isWorkMode ? workDuration * 60 : breakDuration * 60;
        timeLeft = totalSeconds;
    }

    isRunning = true;
    isPaused = false;

    // 禁用输入框
    document.getElementById('workDuration').disabled = true;
    document.getElementById('breakDuration').disabled = true;

    // 按钮状态
    document.getElementById('startBtn').disabled = true;
    document.getElementById('pauseBtn').disabled = false;

    // 更新状态
    updateStatus();

    // 开始计时
    timerInterval = setInterval(() => {
        timeLeft--;

        updateTimerDisplay();

        if (timeLeft <= 0) {
            // 时间到了
            completeTimer();
        }
    }, 1000);

    // 添加动画效果
    document.getElementById('miniTimer').classList.add('active');
}

function pauseTimer() {
    isRunning = false;
    isPaused = true;
    clearInterval(timerInterval);

    // 按钮状态
    document.getElementById('startBtn').disabled = false;
    document.getElementById('pauseBtn').disabled = true;
    document.getElementById('startBtn').textContent = '继续';

    // 更新状态
    updateStatus();

    // 移除动画
    document.getElementById('miniTimer').classList.remove('active');
}

function resetTimer() {
    isRunning = false;
    isPaused = false;
    clearInterval(timerInterval);

    const workDuration = parseInt(document.getElementById('workDuration').value);
    timeLeft = workDuration * 60;
    isWorkMode = true;

    // 启用输入框
    document.getElementById('workDuration').disabled = false;
    document.getElementById('breakDuration').disabled = false;

    // 按钮状态
    document.getElementById('startBtn').disabled = false;
    document.getElementById('startBtn').textContent = '开始';
    document.getElementById('pauseBtn').disabled = true;

    updateTimerDisplay();
    updateStatus();

    // 移除动画
    document.getElementById('miniTimer').classList.remove('active');
}

function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const timeString = String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');

    document.getElementById('timerText').textContent = timeString;
    document.getElementById('miniTimerText').textContent = timeString;
}

function updateStatus() {
    let statusText = '';

    if (!isRunning && !isPaused) {
        statusText = '准备就绪';
    } else if (isRunning) {
        statusText = isWorkMode ? '⏱️ 正在专注工作中...' : '☕ 休息时间';
    } else if (isPaused) {
        statusText = '⏸️ 已暂停';
    }

    document.getElementById('statusText').textContent = statusText;
}

function completeTimer() {
    clearInterval(timerInterval);
    isRunning = false;
    isPaused = false;

    if (isWorkMode) {
        // 工作完成 - 记录时间
        const workDuration = parseInt(document.getElementById('workDuration').value);
        recordFocusTime(workDuration * 60);

        // 显示提醒
        showNotification('工作时间完成！', '准备休息一下吧 ☕');
        playSound();

        // 自动切换到休息模式
        isWorkMode = false;
        const breakDuration = parseInt(document.getElementById('breakDuration').value);
        timeLeft = breakDuration * 60;
    } else {
        // 休息完成 - 切换回工作模式
        showNotification('休息时间结束！', '该继续工作了 💪');
        playSound();

        isWorkMode = true;
        const workDuration = parseInt(document.getElementById('workDuration').value);
        timeLeft = workDuration * 60;
    }

    updateTimerDisplay();
    updateStatus();

    // 自动重新开始
    setTimeout(() => {
        startTimer();
    }, 2000);
}

// ====== 时间记录功能 ======
function recordFocusTime(seconds) {
    const today = getToday();
    const data = getFocusData();

    if (!data[today]) {
        data[today] = 0;
    }

    data[today] += seconds;
    localStorage.setItem(STORAGE_KEY_FOCUS, JSON.stringify(data));

    loadTodayFocusTime();
}

function loadTodayFocusTime() {
    const today = getToday();
    const data = getFocusData();
    const seconds = data[today] || 0;

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    document.getElementById('todayFocusTime').textContent = 
        `${hours}小时 ${minutes}分钟`;
}

function getFocusData() {
    const data = localStorage.getItem(STORAGE_KEY_FOCUS);
    return data ? JSON.parse(data) : {};
}

// ====== 统计功能 ======
function loadWeekStats() {
    const data = getFocusData();
    const weekData = getWeekData(data);

    // 生成列表
    let html = '';
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = formatDate(date);
        const dayName = getDayName(date);
        const seconds = weekData[dateStr] || 0;
        const hours = (seconds / 3600).toFixed(1);

        html += `
            <div class="stats-item">
                <span class="stats-item-date">${dayName} (${dateStr})</span>
                <span class="stats-item-time">${hours}小时</span>
            </div>
        `;
    }

    document.getElementById('statsList').innerHTML = html;
}

function loadMonthStats() {
    const data = getFocusData();
    let totalSeconds = 0;
    let workDays = 0;

    // 计算本月数据
    const today = new Date();
    const month = today.getMonth();
    const year = today.getFullYear();

    for (const dateStr in data) {
        const [y, m, d] = dateStr.split('-').map(Number);
        if (y === year && m === month + 1) {
            totalSeconds += data[dateStr];
            if (data[dateStr] > 0) {
                workDays++;
            }
        }
    }

    const totalHours = Math.floor(totalSeconds / 3600);
    const avgMinutes = workDays > 0 ? Math.floor((totalSeconds / workDays) / 60) : 0;

    document.getElementById('totalFocusTime').textContent = `${totalHours}小时`;
    document.getElementById('avgFocusTime').textContent = `${avgMinutes}分钟`;
    document.getElementById('workDays').textContent = `${workDays}天`;
}

function getWeekData(data) {
    const weekData = {};
    for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = formatDate(date);
        weekData[dateStr] = data[dateStr] || 0;
    }
    return weekData;
}

// ====== 复盘功能 ======
function setupReviewForm() {
    document.getElementById('reviewForm').addEventListener('submit', function(e) {
        e.preventDefault();
        saveReview();
    });

    // 精力值滑块
    document.getElementById('energy').addEventListener('input', function(e) {
        document.getElementById('energyValue').textContent = e.target.value;
    });
}

function setTodayReviewDate() {
    const today = new Date();
    const dateStr = today.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
    });
    document.getElementById('reviewDate').textContent = dateStr;
}

function saveReview() {
    const today = getToday();
    const formData = new FormData(document.getElementById('reviewForm'));
    const reviewData = Object.fromEntries(formData);

    const allReviews = localStorage.getItem(STORAGE_KEY_REVIEW);
    const reviews = allReviews ? JSON.parse(allReviews) : {};

    reviews[today] = {
        date: today,
        ...reviewData,
        savedAt: new Date().toISOString()
    };

    localStorage.setItem(STORAGE_KEY_REVIEW, JSON.stringify(reviews));
    alert('复盘已保存！');
    
    // 清空表单
    document.getElementById('reviewForm').reset();
    document.getElementById('energyValue').textContent = '5';
}

function viewPastReview() {
    const allReviews = localStorage.getItem(STORAGE_KEY_REVIEW);
    const reviews = allReviews ? JSON.parse(allReviews) : {};

    const reviewsList = document.getElementById('reviewsList');
    const pastReviewsList = document.getElementById('pastReviewsList');

    if (Object.keys(reviews).length === 0) {
        alert('还没有保存过复盘记录');
        return;
    }

    let html = '';
    for (const dateStr in reviews) {
        const review = reviews[dateStr];
        const preview = review.performance || review.mood || review.plan || '暂无预览';
        html += `
            <div class="review-item" onclick="loadReview('${dateStr}')">
                <div class="review-item-date">${dateStr}</div>
                <div class="review-item-preview">${preview.substring(0, 50)}...</div>
            </div>
        `;
    }

    reviewsList.innerHTML = html;
    pastReviewsList.style.display = 'block';
}

function loadReview(dateStr) {
    const allReviews = localStorage.getItem(STORAGE_KEY_REVIEW);
    const reviews = JSON.parse(allReviews);
    const review = reviews[dateStr];

    // 填充表单
    for (const key in review) {
        if (key !== 'date' && key !== 'savedAt') {
            const field = document.getElementsByName(key)[0];
            if (field) {
                field.value = review[key];
            }
        }
    }

    // 更新精力值显示
    const energyField = document.getElementsByName('energy')[0];
    if (energyField) {
        document.getElementById('energyValue').textContent = energyField.value;
    }

    // 隐藏列表
    document.getElementById('pastReviewsList').style.display = 'none';

    // 滚动到表单
    document.querySelector('.review-container').scrollIntoView({ behavior: 'smooth' });
}

function checkDailyReview() {
    const today = getToday();
    const allReviews = localStorage.getItem(STORAGE_KEY_REVIEW);
    const reviews = allReviews ? JSON.parse(allReviews) : {};

    // 检查今天是否已有复盘
    if (reviews[today]) {
        return; // 今天已复盘
    }

    // 检查现在是否是11点
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();

    // 如果是11:00-11:59之间，或者有提醒标记
    if (hours === 11) {
        // 检查最后一次提醒时间
        const lastReminder = localStorage.getItem('lastReviewReminder');
        if (lastReminder !== today) {
            showReviewReminder();
            localStorage.setItem('lastReviewReminder', today);
        }
    }
}

function showReviewReminder() {
    const message = '是时候进行每日复盘了！📝';
    showNotification('每日复盘提醒', message);
    playSound();

    // 自动跳转到复盘页面
    setTimeout(() => {
        switchPage('review');
        document.querySelector('[onclick="switchPage(\'review\')"]').click();
    }, 1000);
}

// ====== 通知和声音 ======
function showNotification(title, message) {
    // 浏览器通知
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
            body: message,
            icon: '⏱️'
        });
    }

    // 页面内通知（备选）
    alert(`${title}\n${message}`);
}

function playSound() {
    // 使用Web Audio API 生成简单的铃声
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';

    gain.gain.setValueAtTime(0.3, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
}

// ====== 工具函数 ======
function getToday() {
    const today = new Date();
    return formatDate(today);
}

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getDayName(date) {
    const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return days[date.getDay()];
}

function updateEnergyValue() {
    document.getElementById('energy').addEventListener('input', function(e) {
        document.getElementById('energyValue').textContent = e.target.value;
    });
}

// ====== 请求通知权限 ======
if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
}

// ====== 定时检查复盘（每分钟检查一次） ======
setInterval(checkDailyReview, 60000);