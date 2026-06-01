import { getCurrentWindow } from '@tauri-apps/api/window';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { LogicalSize, LogicalPosition } from '@tauri-apps/api/dpi';
import { sendNotification, requestPermission } from '@tauri-apps/plugin-notification';
import sitImg from './sit-new.png';
import standImg from './stand-new.png';

import angryImg from './angry.png';
import relaxImg from './relax.png';
import dreamImg from './dream.png';

// --- Funny messages ---
const sassMessages = [
  // 通用吐槽
  '又来摸鱼？', '别戳我，烦死了', '你是不是又不想站了', '工作去！别烦我',
  '我要生气了哦', '你再戳试试', '我不是按钮！', '啊啊啊别碰我',
  '你有完没完', '我在思考猫生...', '别看我，看屏幕', '代码写完了吗',
  '摸鱼被我逮到了', '我是有尊严的！', '再戳我就罢工', 'KPI完成了吗',
  '你是不是忘了什么', '我也想躺着啊', '站不站随你，别烦我', '你开心就好...',
  '喵？你在干嘛', '我假装没看到你', '别以为卖萌有用', '我想安静坐着',
  '你是不是很闲', '戳我也没年终奖', '你手不酸吗', '你当我屏保了？',
  '别摸了别摸了！', '戳了我100下了', '你戳我比站的多', '我存在就是让你站',
  '你不动我动，再见', '我要跳出屏幕了', '你信不信我罢工', '不站我就不说话了',
  '哼！', '摸鱼技术又进步了', '站起来思考人生吧', '我要有腿早跑了',
  '你的椅子比你还累', '活动一下别扛着', '你已经是一尊佛了', '你在修仙吗',
  '假装去开会也行', '去茶水间动动', '假装接电话站起来', '我要能动早替你站了',
  '你再坐我也没办法',

  // 健康提醒
  '腰：求你了站一会儿', '你的腰说谢谢你', '走两步你会感谢我', '外卖到了顺便站',
  '水喝完了去接水', '坐好久了确定不站？', '隔壁都站起来了', '我不是宠物别盯我',
  '我还要提醒别人呢', '我代表腰向你抗议', '今天只站了0次', '微信步数又是0吧',

  // 猫咪视角
  '朕允许你站起来', '你比我还懒？不可能', '饿了去喂我顺便站', '铲屎的，动一动！',
  '我睡16h都比你健康', '你坐姿比猫步还歪', '喵星贺电：该运动了', '你像个沙发土豆',
  '我踩键盘都比你动', '猫优雅？因为爱伸展', '学我伸个懒腰嘛', '我趴着都比你直',
  '我总趴着？模仿你', '我追激光笔都比你勤', '毛球都比你勤快', '我在你键盘跳舞了',
  '我是猫都看不下去', '喵喵喵！翻译：快站', '本喵邀请你运动', '我踩奶都比你勤',
  '你的坐姿让我不安', '追苍蝇你也追健康', '我舔毛是清洁你是活命', '跑了酷跑你呢',
  '四条腿的都比你动', '猫爬架上比你活跃', '需要健康的铲屎官', '开个罐头顺便动动',
  '跑酷都比你白天多', '你要和猫窝融合了', 'cos我的午睡？',

  // 猫咪自言自语
  '阳光不错...等等在室内', '窗外有只鸟想去抓', '尾巴怎么又自己动了', '好困...但你该站',
  '我要是老虎叼你起来', '打喷嚏没人关心吗', '又被静电了讨厌', '那个红点好久没出现',
  '换了新猫粮还行吧', '左耳朵痒痒的', '梦见自己会飞了', '快递小哥来了叫两声',
  '晚上吃罐头还是鱼干', '隔壁狗又叫了真烦', '好像变胖了...不可能', '那个人偷拍我？',
  '爪子该剪了算了', '下午该晒太阳了', '差点掉下来还好优雅', '键盘踩着手感不错',
  '能上网自己买罐头', '今日计划睡觉监督你', '铃铛响了走路不便', '鼠标动了不是激光笔',
  '零食被发现了', '今天是发呆好日子', '猫咖的猫真幸福', '碗里没水了等会再说',
  '打哈欠嘴巴好酸', '下雨了不用出门开心', '奶茶好香', '罐头开了吗没有吗',
  '掉毛了春天到了', '在练眼神杀对象是你',
];

// --- State ---
let state = {
  mode: 'sit', // 'sit' | 'stand' | 'remind-sit' | 'remind-stand'
  paused: false,
  miniMode: false,
  character: 'cat', // 'bear' | 'cat'
  sitMinutes: 45,
  standMinutes: 5,
  remaining: 45 * 60,
  total: 45 * 60,
  endTime: 0,       // wall-clock timestamp when timer ends
  pausedRemaining: 0, // remaining seconds when paused
  timerId: null,
  remindTimeoutId: null,
  showingSass: false,
  initDone: false,
  savedMiniPos: null, // in-memory position
};

let win;
try {
  win = getCurrentWindow();
  console.log('Window object:', win);
  console.log('startDragging method:', typeof win.startDragging);
} catch (e) {
  console.error('Failed to get window:', e);
}

// --- Character SVGs ---
function getBearSVG(mode) {
  const isStanding = mode === 'stand' || mode.startsWith('remind');
  const isRemind = mode.startsWith('remind');
  if (isStanding) {
    return `
      <circle cx="70" cy="35" r="18" fill="#D4A56A"/><circle cx="70" cy="35" r="11" fill="#E8C99B"/>
      <circle cx="130" cy="35" r="18" fill="#D4A56A"/><circle cx="130" cy="35" r="11" fill="#E8C99B"/>
      <circle cx="100" cy="60" r="35" fill="#D4A56A"/><circle cx="100" cy="65" r="25" fill="#E8C99B"/>
      <ellipse cx="88" cy="58" rx="4" ry="5" fill="#5C4033"/><ellipse cx="112" cy="58" rx="4" ry="5" fill="#5C4033"/>
      <circle cx="90" cy="56" r="1.5" fill="white"/><circle cx="114" cy="56" r="1.5" fill="white"/>
      <ellipse cx="100" cy="70" rx="6" ry="4" fill="#5C4033"/>
      <path d="M92 76 Q100 84 108 76" stroke="#5C4033" stroke-width="2" fill="none" stroke-linecap="round"/>
      <ellipse cx="78" cy="70" rx="7" ry="5" fill="rgba(255,155,80,0.3)"/><ellipse cx="122" cy="70" rx="7" ry="5" fill="rgba(255,155,80,0.3)"/>
      <ellipse cx="100" cy="130" rx="30" ry="35" fill="#D4A56A"/><ellipse cx="100" cy="130" rx="22" ry="27" fill="#E8C99B"/>
      <g transform="rotate(-30, 70, 110)"><ellipse cx="60" cy="110" rx="12" ry="25" fill="#D4A56A"/></g>
      <g transform="rotate(30, 140, 110)"><ellipse cx="140" cy="110" rx="12" ry="25" fill="#D4A56A"/></g>
      <ellipse cx="85" cy="168" rx="12" ry="20" fill="#D4A56A"/><ellipse cx="115" cy="168" rx="12" ry="20" fill="#D4A56A"/>
      <ellipse cx="85" cy="188" rx="14" ry="8" fill="#C4956A"/><ellipse cx="115" cy="188" rx="14" ry="8" fill="#C4956A"/>
      ${isRemind ? '<text x="100" y="25" text-anchor="middle" font-size="16" fill="#FF9B50">✨</text>' : ''}
    `;
  }
  return `
    <circle cx="70" cy="45" r="18" fill="#D4A56A"/><circle cx="70" cy="45" r="11" fill="#E8C99B"/>
    <circle cx="130" cy="45" r="18" fill="#D4A56A"/><circle cx="130" cy="45" r="11" fill="#E8C99B"/>
    <circle cx="100" cy="70" r="35" fill="#D4A56A"/><circle cx="100" cy="75" r="25" fill="#E8C99B"/>
    <ellipse cx="88" cy="68" rx="4" ry="5" fill="#5C4033"/><ellipse cx="112" cy="68" rx="4" ry="5" fill="#5C4033"/>
    <circle cx="90" cy="66" r="1.5" fill="white"/><circle cx="114" cy="66" r="1.5" fill="white"/>
    <ellipse cx="100" cy="80" rx="6" ry="4" fill="#5C4033"/>
    <path d="M94 86 Q100 91 106 86" stroke="#5C4033" stroke-width="2" fill="none" stroke-linecap="round"/>
    <ellipse cx="78" cy="80" rx="7" ry="5" fill="rgba(255,155,80,0.3)"/><ellipse cx="122" cy="80" rx="7" ry="5" fill="rgba(255,155,80,0.3)"/>
    <ellipse cx="100" cy="135" rx="32" ry="30" fill="#D4A56A"/><ellipse cx="100" cy="135" rx="24" ry="22" fill="#E8C99B"/>
    <ellipse cx="65" cy="130" rx="12" ry="18" fill="#D4A56A" transform="rotate(15, 65, 130)"/>
    <ellipse cx="135" cy="130" rx="12" ry="18" fill="#D4A56A" transform="rotate(-15, 135, 130)"/>
    <rect x="55" y="145" width="90" height="6" rx="3" fill="#8B7355"/>
    <rect x="60" y="128" width="80" height="18" rx="3" fill="#A0A0B0" transform="rotate(-5, 100, 137)"/>
    <rect x="63" y="130" width="74" height="13" rx="2" fill="#C0C0D0" transform="rotate(-5, 100, 137)"/>
    <ellipse cx="78" cy="160" rx="14" ry="12" fill="#D4A56A"/><ellipse cx="122" cy="160" rx="14" ry="12" fill="#D4A56A"/>
    <ellipse cx="78" cy="172" rx="15" ry="8" fill="#C4956A"/><ellipse cx="122" cy="172" rx="15" ry="8" fill="#C4956A"/>
  `;
}

function getCatSVG(mode) {
  const isStanding = mode === 'stand' || mode.startsWith('remind');
  const isRemind = mode.startsWith('remind');
  if (isStanding) {
    return `
      <polygon points="65,10 55,40 75,35" fill="#F5A623"/><polygon points="65,12 60,38 73,34" fill="#FFD98E"/>
      <polygon points="135,10 145,40 125,35" fill="#F5A623"/><polygon points="135,12 140,38 127,34" fill="#FFD98E"/>
      <circle cx="100" cy="65" r="33" fill="#F5A623"/><circle cx="100" cy="68" r="24" fill="#FFD98E"/>
      <ellipse cx="87" cy="60" rx="5" ry="6" fill="#2D2D2D"/><ellipse cx="113" cy="60" rx="5" ry="6" fill="#2D2D2D"/>
      <circle cx="89" cy="58" r="2" fill="white"/><circle cx="115" cy="58" r="2" fill="white"/>
      <ellipse cx="100" cy="72" rx="4" ry="3" fill="#FF8C94"/>
      <path d="M94 77 Q100 83 106 77" stroke="#2D2D2D" stroke-width="1.5" fill="none" stroke-linecap="round"/>
      <line x1="72" y1="68" x2="55" y2="65" stroke="#2D2D2D" stroke-width="1" opacity="0.5"/>
      <line x1="72" y1="72" x2="54" y2="73" stroke="#2D2D2D" stroke-width="1" opacity="0.5"/>
      <line x1="128" y1="68" x2="145" y2="65" stroke="#2D2D2D" stroke-width="1" opacity="0.5"/>
      <line x1="128" y1="72" x2="146" y2="73" stroke="#2D2D2D" stroke-width="1" opacity="0.5"/>
      <ellipse cx="100" cy="132" rx="28" ry="33" fill="#F5A623"/><ellipse cx="100" cy="132" rx="20" ry="25" fill="#FFD98E"/>
      <g transform="rotate(-35, 68, 110)"><ellipse cx="58" cy="110" rx="10" ry="24" fill="#F5A623"/></g>
      <g transform="rotate(35, 132, 110)"><ellipse cx="142" cy="110" rx="10" ry="24" fill="#F5A623"/></g>
      <ellipse cx="85" cy="168" rx="11" ry="18" fill="#F5A623"/><ellipse cx="115" cy="168" rx="11" ry="18" fill="#F5A623"/>
      <ellipse cx="85" cy="187" rx="13" ry="7" fill="#E8942E"/><ellipse cx="115" cy="187" rx="13" ry="7" fill="#E8942E"/>
      <path d="M100 170 Q120 175 140 160" stroke="#F5A623" stroke-width="4" fill="none" stroke-linecap="round"/>
      ${isRemind ? '<text x="100" y="20" text-anchor="middle" font-size="14" fill="#FF9B50">✨</text>' : ''}
    `;
  }
  return `
    <polygon points="65,20 55,50 75,45" fill="#F5A623"/><polygon points="65,22 60,48 73,44" fill="#FFD98E"/>
    <polygon points="135,20 145,50 125,45" fill="#F5A623"/><polygon points="135,22 140,48 127,44" fill="#FFD98E"/>
    <circle cx="100" cy="72" r="33" fill="#F5A623"/><circle cx="100" cy="75" r="24" fill="#FFD98E"/>
    <ellipse cx="87" cy="68" rx="5" ry="6" fill="#2D2D2D"/><ellipse cx="113" cy="68" rx="5" ry="6" fill="#2D2D2D"/>
    <circle cx="89" cy="66" r="2" fill="white"/><circle cx="115" cy="66" r="2" fill="white"/>
    <ellipse cx="100" cy="80" rx="4" ry="3" fill="#FF8C94"/>
    <path d="M95 84 Q100 89 105 84" stroke="#2D2D2D" stroke-width="1.5" fill="none" stroke-linecap="round"/>
    <line x1="72" y1="76" x2="55" y2="73" stroke="#2D2D2D" stroke-width="1" opacity="0.5"/>
    <line x1="72" y1="80" x2="54" y2="81" stroke="#2D2D2D" stroke-width="1" opacity="0.5"/>
    <line x1="128" y1="76" x2="145" y2="73" stroke="#2D2D2D" stroke-width="1" opacity="0.5"/>
    <line x1="128" y1="80" x2="146" y2="81" stroke="#2D2D2D" stroke-width="1" opacity="0.5"/>
    <ellipse cx="100" cy="138" rx="30" ry="30" fill="#F5A623"/><ellipse cx="100" cy="138" rx="22" ry="22" fill="#FFD98E"/>
    <ellipse cx="65" cy="132" rx="10" ry="16" fill="#F5A623" transform="rotate(15, 65, 132)"/>
    <ellipse cx="135" cy="132" rx="10" ry="16" fill="#F5A623" transform="rotate(-15, 135, 132)"/>
    <rect x="55" y="148" width="90" height="6" rx="3" fill="#8B7355"/>
    <rect x="60" y="130" width="80" height="18" rx="3" fill="#A0A0B0" transform="rotate(-5, 100, 139)"/>
    <rect x="63" y="132" width="74" height="13" rx="2" fill="#C0C0D0" transform="rotate(-5, 100, 139)"/>
    <ellipse cx="78" cy="162" rx="13" ry="11" fill="#F5A623"/><ellipse cx="122" cy="162" rx="13" ry="11" fill="#F5A623"/>
    <ellipse cx="78" cy="173" rx="14" ry="7" fill="#E8942E"/><ellipse cx="122" cy="173" rx="14" ry="7" fill="#E8942E"/>
    <path d="M100 170 Q120 178 145 165" stroke="#F5A623" stroke-width="4" fill="none" stroke-linecap="round"/>
  `;
}

function drawCharacter(mode) {
  const isStanding = mode === 'stand' || mode.startsWith('remind');
  const mainSvg = document.getElementById('bearSvg');
  const miniSvg = document.getElementById('miniBearSvg');

  if (state.character === 'custom') {
    const src = isStanding ? standImg : sitImg;
    mainSvg.outerHTML = `<img id="bearSvg" src="${src}" class="bear" draggable="false" style="width:100%;height:100%;object-fit:contain;" />`;
    miniSvg.outerHTML = `<img id="miniBearSvg" src="${src}" class="mini-bear" draggable="false" style="width:100%;height:100%;object-fit:contain;" />`;
  } else {
    // Restore to SVG if switching from custom
    const mainEl = document.getElementById('bearSvg');
    const miniEl = document.getElementById('miniBearSvg');
    if (mainEl.tagName === 'IMG') {
      mainEl.outerHTML = '<svg id="bearSvg" viewBox="0 0 200 200" class="bear"></svg>';
      miniEl.outerHTML = '<svg id="miniBearSvg" viewBox="0 0 200 200" class="mini-bear"></svg>';
    }
    const svg = state.character === 'cat' ? getCatSVG(mode) : getBearSVG(mode);
    document.getElementById('bearSvg').innerHTML = svg;
    document.getElementById('miniBearSvg').innerHTML = svg;
  }
}

// --- Timer ---
function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function updateDisplay() {
  const display = document.getElementById('timerDisplay');
  const label = document.getElementById('timerLabel');
  const ring = document.getElementById('progressRing');
  const miniRing = document.getElementById('miniProgressRing');
  const miniTime = document.getElementById('miniTime');
  const miniLabel = document.getElementById('miniTooltipLabel');
  const app = document.getElementById('app');
  const miniMode = document.getElementById('miniMode');

  const timeStr = formatTime(state.remaining);
  display.textContent = timeStr;
  if (!state.showingSass) {
    miniTime.textContent = timeStr;
  }

  const circumference = 2 * Math.PI * 88;
  const miniCircumference = 2 * Math.PI * 36;
  const progress = state.remaining / state.total;
  ring.style.strokeDashoffset = circumference * (1 - progress);
  miniRing.style.strokeDashoffset = miniCircumference * (1 - progress);

  const isStand = state.mode === 'stand';
  if (isStand) {
    label.textContent = '站姿时间';
    if (!state.showingSass) miniLabel.textContent = '后可以坐下';
    app.classList.add('stand-mode');
    miniMode.classList.add('stand-mode');
  } else {
    label.textContent = '坐姿时间';
    if (!state.showingSass) miniLabel.textContent = '后站起来';
    app.classList.remove('stand-mode');
    miniMode.classList.remove('stand-mode');
  }
}

function startTimer() {
  if (state.timerId) clearInterval(state.timerId);

  // Set wall-clock end time
  state.endTime = Date.now() + state.remaining * 1000;

  state.timerId = setInterval(() => {
    if (state.paused) return;

    // Calculate remaining from real clock
    const now = Date.now();
    state.remaining = Math.max(0, Math.ceil((state.endTime - now) / 1000));

    if (state.remaining <= 0) {
      clearInterval(state.timerId);
      state.timerId = null;
      triggerReminder();
    }

    updateDisplay();
  }, 500); // Check every 500ms for precision
}

function triggerReminder() {
  if (state.mode === 'sit') {
    state.mode = 'remind-sit';
    showReminder('该站起来啦！', '活动一下，保护你的腰~');
  } else {
    state.mode = 'remind-stand';
    showReminder('可以坐下了', '休息一下吧~');
  }
}

function showReminder(text, subtext) {
  try {
    sendNotification({ title: '坐站提醒', body: text });
  } catch (e) {
    console.log('Notification failed:', e);
  }

  // Store reminder text for later
  document.getElementById('reminderText').textContent = text;
  document.querySelector('.reminder-subtext').textContent = subtext;

  if (state.miniMode) {
    // Mini mode: show persistent bubble + shake + confirm button
    const miniEl = document.getElementById('miniMode');
    miniEl.classList.add('reminding');
    state.showingSass = true;
    document.getElementById('miniTime').textContent = '';
    document.getElementById('miniTooltipLabel').textContent = text;
    const tooltip = document.getElementById('miniTooltip');
    tooltip.classList.add('reminder-bubble');

    // Show confirm button
    const btn = document.getElementById('miniConfirmBtn');
    btn.textContent = state.mode === 'remind-sit' ? '我站起来了' : '好的！我坐下！';
    btn.style.display = 'block';

    // 30s auto-dismiss
    state.remindTimeoutId = setInterval(() => {
      // no-op countdown, just wait
    }, 30000);
    setTimeout(() => {
      if (state.mode.startsWith('remind')) {
        dismissReminder();
      }
    }, 30000);
  } else {
    // Normal mode: show overlay directly
    document.getElementById('reminderOverlay').style.display = 'flex';
  }

  drawCharacter(state.mode);

  // Auto-dismiss after 30s
  let countdown = 30;
  const countdownEl = document.getElementById('reminderCountdown');
  countdownEl.textContent = `${countdown} 秒后自动切换`;

  state.remindTimeoutId = setInterval(() => {
    countdown--;
    if (countdown <= 0) {
      dismissReminder();
    } else {
      countdownEl.textContent = `${countdown} 秒后自动切换`;
    }
  }, 1000);
}

function dismissReminder() {
  document.getElementById('reminderOverlay').style.display = 'none';
  document.getElementById('miniMode').classList.remove('reminding');
  document.getElementById('miniTooltip').classList.remove('reminder-bubble');
  document.getElementById('miniConfirmBtn').style.display = 'none';
  state.showingSass = false;

  if (state.remindTimeoutId) {
    clearInterval(state.remindTimeoutId);
    state.remindTimeoutId = null;
  }

  if (state.mode === 'remind-sit') {
    state.mode = 'stand';
    state.total = state.standMinutes * 60;
    state.remaining = state.standMinutes * 60;
  } else {
    state.mode = 'sit';
    state.total = state.sitMinutes * 60;
    state.remaining = state.sitMinutes * 60;
  }

  drawCharacter(state.mode);
  updateDisplay();
  startTimer();
}

function togglePause() {
  state.paused = !state.paused;
  const pauseIcon = document.getElementById('pauseIcon');
  const playIcon = document.getElementById('playIcon');
  const status = document.getElementById('statusMessage');

  if (state.paused) {
    // Save remaining time at pause moment
    state.pausedRemaining = state.remaining;
    pauseIcon.style.display = 'none';
    playIcon.style.display = 'block';
    status.textContent = '已暂停';
  } else {
    // Resume: set new end time from saved remaining
    state.remaining = state.pausedRemaining;
    state.endTime = Date.now() + state.remaining * 1000;
    pauseIcon.style.display = 'block';
    playIcon.style.display = 'none';
    status.textContent = '';
  }
}

function resetTimer() {
  if (state.timerId) {
    clearInterval(state.timerId);
    state.timerId = null;
  }

  state.mode = 'sit';
  state.paused = false;
  state.total = state.sitMinutes * 60;
  state.remaining = state.sitMinutes * 60;

  document.getElementById('pauseIcon').style.display = 'block';
  document.getElementById('playIcon').style.display = 'none';
  document.getElementById('statusMessage').textContent = '';
  document.getElementById('miniMode').classList.remove('reminding');

  drawCharacter(state.mode);
  updateDisplay();
  startTimer();
}

// --- Settings ---
function updateCharacterButtons() {
  document.querySelectorAll('.char-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.char === state.character);
  });
}

function toggleSettings() {
  const panel = document.getElementById('settingsPanel');
  const isHidden = panel.style.display === 'none';
  panel.style.display = isHidden ? 'block' : 'none';

  if (isHidden) {
    document.getElementById('sitMinutes').value = state.sitMinutes;
    document.getElementById('standMinutes').value = state.standMinutes;
    updateCharacterButtons();
  }
}

function saveSettings() {
  const sitMin = parseInt(document.getElementById('sitMinutes').value) || 45;
  const standMin = parseInt(document.getElementById('standMinutes').value) || 5;

  state.sitMinutes = Math.max(1, Math.min(120, sitMin));
  state.standMinutes = Math.max(1, Math.min(60, standMin));

  localStorage.setItem('sitMinutes', state.sitMinutes);
  localStorage.setItem('standMinutes', state.standMinutes);

  resetTimer();
  toggleSettings();
}

// --- Sass Message (separate bubble window) ---
let bubbleWin = null;
let bubbleTimeout = null;

async function showSassMessage() {
  // Clear previous timeout and close old bubble
  if (bubbleTimeout) { clearTimeout(bubbleTimeout); bubbleTimeout = null; }
  if (bubbleWin) { try { await bubbleWin.close(); } catch (e) {} bubbleWin = null; }

  const idx = Math.floor(Math.random() * sassMessages.length);
  const msg = sassMessages[idx];
  const miniEl = document.getElementById('miniMode');
  const miniBear = document.getElementById('miniBearSvg');

  state.showingSass = true;
  miniEl.classList.add('annoyed');

  // Block interaction on mini window
  try { await win.setIgnoreCursorEvents(true); } catch (e) {}

  // Change expression
  let exprSrc = null;
  if (idx < 42) exprSrc = angryImg;
  else if (idx >= 54 && idx <= 84) exprSrc = relaxImg;
  else if (idx >= 85) exprSrc = dreamImg;

  if (exprSrc && miniBear) {
    miniBear.outerHTML = `<img id="miniBearSvg" src="${exprSrc}" class="mini-bear" draggable="false" style="width:100%;height:100%;object-fit:contain;" />`;
  }

  // Create bubble window above mini window
  const pos = await win.outerPosition();
  const scale = await win.scaleFactor();
  const bubbleW = 260, bubbleH = 60;
  const x = Math.round(pos.x / scale + (140 - bubbleW) / 2);
  const y = Math.round(pos.y / scale - bubbleH - 2);
  try {
    bubbleWin = new WebviewWindow('bubble-' + Date.now(), {
      url: 'src/bubble.html?msg=' + encodeURIComponent(msg),
      width: bubbleW,
      height: bubbleH,
      x, y,
      decorations: false,
      transparent: true,
      shadow: false,
      alwaysOnTop: true,
      resizable: false,
      skipTaskbar: true,
      focus: false,
    });
  } catch (e) {}

  bubbleTimeout = setTimeout(async () => {
    if (bubbleWin) {
      try { await bubbleWin.close(); } catch (e) {}
      bubbleWin = null;
    }
    bubbleTimeout = null;
    miniEl.classList.remove('annoyed');
    state.showingSass = false;
    // Re-enable interaction
    try { await win.setIgnoreCursorEvents(false); } catch (e) {}
    if (exprSrc) {
      const el = document.getElementById('miniBearSvg');
      if (el) {
        el.outerHTML = '<svg id="miniBearSvg" viewBox="0 0 200 200" class="mini-bear"></svg>';
        drawCharacter(state.mode);
      }
    }
    updateDisplay();
  }, 3500);
}

// --- Mini Mode ---
async function enterMiniMode() {
  state.miniMode = true;
  const app = document.getElementById('app');

  // Hide main content, show mini
  document.querySelector('.titlebar').style.display = 'none';
  document.querySelector('.content').style.display = 'none';
  document.getElementById('reminderOverlay').style.display = 'none';
  document.getElementById('miniMode').style.display = 'flex';

  // Remove rounded corners and background for seamless look
  app.style.borderRadius = '0';
  app.style.background = 'transparent';
  app.style.boxShadow = 'none';

  try {
    await win.setAlwaysOnTop(true);
    await win.setDecorations(false);
    await win.setShadow(false);
    await win.setResizable(false);

    // Position first, then resize to fit actual content
    const monitor = await win.currentMonitor();
    if (monitor) {
      const scale = monitor.scaleFactor;
      const screenW = monitor.size.width / scale;
      const screenH = monitor.size.height / scale;

      if (state.savedMiniPos) {
        const { x, y } = state.savedMiniPos;
        await win.setPosition(new LogicalPosition(Math.round(x / scale), Math.round(y / scale)));
      } else {
        await win.setPosition(new LogicalPosition(screenW - 260, screenH - 240));
      }
    }

    await win.setSize(new LogicalSize(140, 150));
  } catch (e) {
    console.log('Mini mode setup error:', e);
  }

  // If there's a pending reminder, show reminding state
  if (state.mode.startsWith('remind')) {
    document.getElementById('miniMode').classList.add('reminding');
  }

  drawCharacter(state.mode);
  updateDisplay();
}

async function exitMiniMode() {
  // Save current mini position
  try {
    const pos = await win.outerPosition();
    state.savedMiniPos = { x: pos.x, y: pos.y };
  } catch (e) {}

  state.miniMode = false;
  const app = document.getElementById('app');

  // Show main content, hide mini
  document.querySelector('.titlebar').style.display = 'flex';
  document.querySelector('.content').style.display = 'flex';
  document.getElementById('miniMode').style.display = 'none';

  // Restore rounded corners
  app.style.borderRadius = '';
  app.style.background = '';
  app.style.boxShadow = '';

  try {
    await win.setAlwaysOnTop(false);
    await win.setDecorations(false);
    await win.setShadow(true);
    await win.setSize(new LogicalSize(400, 520));
    await win.center();
  } catch (e) {
    console.log('Restore mode error:', e);
  }

  // If there's a pending reminder, show overlay and clear mini remind state
  if (state.mode.startsWith('remind')) {
    document.getElementById('miniMode').classList.remove('reminding');
    document.getElementById('miniTooltip').classList.remove('reminder-bubble');
    document.getElementById('miniConfirmBtn').style.display = 'none';
    state.showingSass = false;
    document.getElementById('reminderOverlay').style.display = 'flex';
  }

  drawCharacter(state.mode);
  updateDisplay();
}

// --- Window controls ---
async function setupWindowControls() {
  document.getElementById('minimizeBtn').addEventListener('click', enterMiniMode);

  document.getElementById('closeBtn').addEventListener('click', () => {
    win.hide();
  });

  // Drag: mousedown on non-interactive areas, with click detection
  let dragStartPos = null;
  let didDrag = false;

  document.addEventListener('mousedown', async (e) => {
    if (e.target.closest('button, input, .settings-panel, .reminder-overlay')) return;
    dragStartPos = { x: e.clientX, y: e.clientY };
    didDrag = false;
  });

  document.addEventListener('mousemove', (e) => {
    if (!dragStartPos) return;
    const dx = Math.abs(e.clientX - dragStartPos.x);
    const dy = Math.abs(e.clientY - dragStartPos.y);
    if (dx > 3 || dy > 3) {
      didDrag = true;
      if (win && win.startDragging) {
        win.startDragging().catch(() => {});
        dragStartPos = null;
      }
    }
  });

  document.addEventListener('mouseup', () => {
    dragStartPos = null;
  });

  // Confirm button: dismiss reminder and start next cycle
  document.getElementById('miniConfirmBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    dismissReminder();
  });

  // Click mini bear to restore (only if not dragging)
  const miniEl = document.getElementById('miniMode');
  let lastClickTime = 0;
  miniEl.addEventListener('click', () => {
    if (didDrag) { didDrag = false; return; }

    // During remind state: click opens main window
    if (state.mode.startsWith('remind')) {
      exitMiniMode();
      return;
    }

    const now = Date.now();
    if (now - lastClickTime < 350) {
      // Double-click: show sass message
      showSassMessage();
      lastClickTime = 0;
    } else {
      lastClickTime = now;
      setTimeout(() => {
        if (lastClickTime !== 0 && state.miniMode && !didDrag) {
          exitMiniMode();
        }
        lastClickTime = 0;
      }, 350);
    }
  });
}

// --- Listen for tray events ---
async function setupTrayListeners() {
  try {
    win.listen('toggle-pause', () => {
      togglePause();
    });
  } catch (e) {
    console.log('Tray listener not available:', e);
  }
}

// --- Init ---
async function init() {
  try {
    await requestPermission();
  } catch (e) {
    console.log('Permission request failed:', e);
  }

  const savedSit = localStorage.getItem('sitMinutes');
  const savedStand = localStorage.getItem('standMinutes');
  const savedChar = localStorage.getItem('character');
  if (savedSit) state.sitMinutes = parseInt(savedSit);
  if (savedStand) state.standMinutes = parseInt(savedStand);
  if (savedChar) state.character = savedChar;

  state.total = state.sitMinutes * 60;
  state.remaining = state.sitMinutes * 60;

  drawCharacter(state.mode);
  updateDisplay();
  updateCharacterButtons();

  document.getElementById('pauseBtn').addEventListener('click', togglePause);
  document.getElementById('resetBtn').addEventListener('click', resetTimer);
  document.getElementById('settingsBtn').addEventListener('click', toggleSettings);
  document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);
  document.getElementById('reminderBtn').addEventListener('click', dismissReminder);

  // Character switch buttons
  document.querySelectorAll('.char-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.character = btn.dataset.char;
      localStorage.setItem('character', state.character);
      updateCharacterButtons();
      drawCharacter(state.mode);
    });
  });

  await setupWindowControls();
  await setupTrayListeners();


  startTimer();

  // Start in mini mode by default
  await enterMiniMode();
  state.initDone = true;
}

init();
