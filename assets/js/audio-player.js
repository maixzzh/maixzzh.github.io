/* 文章 <audio> → 自定义播放器 + 顶栏灵动岛音乐区
   ---------------------------------------------------------------
   为什么不用原生控件：<audio controls> 内部是浏览器 shadow DOM，往里塞不了东西，
   而「文件名（不带扩展名）」恰恰是这里最该显示的信息；顺带样式也才有机会
   跟站点的玻璃 / Fluent 风格对齐。

   顶栏的状态类名全部切在 #site-header 上，视觉由 audio.css 承担
   （同 search.js 的 .is-searching 范式，nav-shrink.js 的状态机不感知音乐）：
     .has-audio   本页存在激活音轨（播放中或暂停中）→ 显示音乐区 + 禁用收缩
     .is-playing  正在播放 → 只负责切换 ▶/⏸ 图标

   媒体事件（play / pause / timeupdate…）不冒泡，只能在 document 上用 capture
   阶段委托；同一处中枢顺带负责多音轨互斥。
   无依赖、defer 加载 */
(function () {
  'use strict';

  /* ============ 0. 元素 ============ */
  var header      = document.getElementById('site-header');
  var musicTitle  = document.getElementById('nav-music-title');
  var musicToggle = document.getElementById('nav-music-toggle');
  var musicRange  = document.getElementById('nav-music-progress');

  /* 站点名与头像：给 MediaSession 的 artist / artwork 用，取不到就留空，不阻断任何逻辑 */
  var siteName = '';
  var brandText = document.querySelector('.brand-text');
  if (brandText) { siteName = trim(brandText.textContent); }

  var artworkUrl = '';
  var brandAvatar = document.querySelector('.brand-avatar');
  if (brandAvatar) { artworkUrl = brandAvatar.src || ''; }

  /* ============ 1. 工具 ============ */

  var PROGRESS_MAX = 1000;   /* 进度条刻度用千分比：整数运算，省去浮点数抖动 */
  /* 去扩展名走白名单而非 /\.[^.]+$/：「某某 - Live 版.ver2.mp3」这类名字
     用贪婪正则会削掉后半截，白名单只认已知音频后缀 */
  var AUDIO_EXT = /\.(mp3|m4a|m4b|aac|ogg|oga|opus|wav|flac|weba|mp4)$/i;

  function trim(s) {
    return String(s == null ? '' : s).replace(/^\s+|\s+$/g, '');
  }

  function fmt(sec) {
    if (!isFinite(sec) || sec < 0) { return '--:--'; }
    sec = Math.floor(sec);
    var s = sec % 60;
    var m = Math.floor(sec / 60) % 60;
    var h = Math.floor(sec / 3600);
    return (h ? h + ':' + (m < 10 ? '0' : '') + m : m) + ':' + (s < 10 ? '0' : '') + s;
  }

  /* 从地址里剥出文件名：去锚点 → 去查询串 → 取末段 → 解码 → 去扩展名 */
  function basename(src) {
    if (!src) { return ''; }
    var s = String(src).split('#')[0].split('?')[0];
    var cut = s.lastIndexOf('/');
    if (cut >= 0) { s = s.slice(cut + 1); }
    /* 中文文件名在 src 属性里是原样、在 currentSrc 里是百分号编码，
       两种都得吃下；非法编码（比如裸百分号）保持原样即可 */
    try { s = decodeURIComponent(s); } catch (e) { /* 保持原样 */ }
    return s.replace(AUDIO_EXT, '');
  }

  /* 标题优先级：data-title（作者可覆盖）→ 地址末段 → <audio> 内的文本 → 兜底。
     currentSrc 要等资源选定后才非空，建壳时通常还是空串，所以必须逐级回落 */
  function titleOf(audio) {
    var t = trim(audio.getAttribute('data-title'));
    if (t) { return t; }
    var src = audio.currentSrc || audio.getAttribute('src');
    if (!src) {
      var source = audio.querySelector('source');
      if (source) { src = source.getAttribute('src'); }
    }
    return basename(src) || trim(audio.textContent) || '音频';
  }

  function durationOf(audio) {
    var d = audio.duration;
    return isFinite(d) && d > 0 ? d : 0;
  }

  function timeText(audio, at) {
    var d = durationOf(audio);
    var cur = (at === undefined) ? audio.currentTime : at;
    return fmt(cur) + ' / ' + (d ? fmt(d) : '--:--');
  }

  /* 进度条填充：JS 只写一个 CSS 变量，渐变由 audio.css 画 */
  function setFill(range, value, text) {
    if (!range) { return; }
    range.value = value;
    range.style.setProperty('--ap-fill', (value / PROGRESS_MAX * 100) + '%');
    /* aria-valuetext 只在内容变化时写：timeupdate 每秒约 4 次，
       次次都写会把读屏刷爆 */
    if (text && range.getAttribute('aria-valuetext') !== text) {
      range.setAttribute('aria-valuetext', text);
    }
  }

  /* 播完 / 出错后把进度条拨回起点 */
  function resetPlayer(p) {
    var text = timeText(p.audio, 0);
    setFill(p.range, 0, text);
    p.time.textContent = text;
  }

  /* ============ 2. 状态 ============ */
  var current = null;    /* 当前音轨：正在播放或暂停中的那个 <audio> */
  var players = [];      /* 已建壳的播放器。互切换轨时要遍历收尾，见 activate() */
  var scrubbing = [];    /* 用户正拖着的进度条。ES5 没有 Set，用数组 */

  function isScrubbing(range) {
    for (var i = 0; i < scrubbing.length; i++) {
      if (scrubbing[i] === range) { return true; }
    }
    return false;
  }

  function markScrub(range) {
    if (!isScrubbing(range)) { scrubbing.push(range); }
  }

  function unmarkScrub(range) {
    for (var i = 0; i < scrubbing.length; i++) {
      if (scrubbing[i] === range) { scrubbing.splice(i, 1); return; }
    }
  }

  /* ============ 3. 顶栏音乐区 ============ */
  function flag(cls, on) {
    if (header) { header.classList[on ? 'add' : 'remove'](cls); }
  }

  function islandShow(audio) {
    var name = titleOf(audio);
    if (musicTitle) {
      musicTitle.textContent = name;
      musicTitle.setAttribute('title', name);   /* 省略号截断后仍可悬停看全名 */
    }
    if (musicToggle) {
      musicToggle.setAttribute('aria-label', (audio.paused ? '播放：' : '暂停：') + name);
    }
    syncIsland(audio);
  }

  function islandClear() {
    flag('has-track', false);
    flag('has-audio', false);
    flag('is-playing', false);
    if (musicTitle) { musicTitle.textContent = ''; }
    setFill(musicRange, 0, '');
  }

  /* ✕：暂停 + 进度归零 + 收起音乐区。作用于「当前音轨」——
     文章里的音轨与背景音乐共用这一条，不区分来源。
     顺序无关且幂等：current 置空后，随后到达的 pause 事件会被 onMedia 里
     那句 `audio !== current` 短路，最终态与这里显式写的一致 */
  function stopCurrent() {
    var audio = current;
    if (!audio) { return; }
    setSession(audio, 'none');
    audio.pause();
    try { audio.currentTime = 0; } catch (e) { /* 资源未就绪时个别浏览器会抛 */ }
    if (audio.__ap) { resetPlayer(audio.__ap); restUI(audio.__ap); }
    current = null;
    islandClear();
    if (musicToggle) { musicToggle.setAttribute('aria-label', '播放'); }
  }

  /* 顶栏进度回写。用户正拖着这一条时必须跳过，否则会和手指抢值 */
  function syncIsland(audio) {
    if (!musicRange || !audio) { return; }
    if (isScrubbing(musicRange)) { return; }
    var d = durationOf(audio);
    setFill(musicRange, d ? Math.round(audio.currentTime / d * PROGRESS_MAX) : 0, timeText(audio));
  }

  /* ============ 4. 文章内播放器 ============ */

  /* 顶栏缺失时的图标兜底。正常路径是从 #nav-music-toggle 里 cloneNode ——
     SVG 路径只留一份真源，省得同一份 d 在 JS 里再写一遍 */
  var FALLBACK_ICONS =
    '<svg class="ico-play" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">' +
    '<path d="M7 4.5v15l13-7.5z"></path></svg>' +
    '<svg class="ico-pause" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">' +
    '<path d="M7 4h3.5v16H7zM13.5 4H17v16h-3.5z"></path></svg>';

  function copyIcons(btn, tpl) {
    var copied = 0;
    if (tpl) {
      var kids = tpl.childNodes;
      for (var i = 0; i < kids.length; i++) {
        if (kids[i].nodeType === 1) {
          btn.appendChild(kids[i].cloneNode(true));
          copied++;
        }
      }
    }
    if (!copied) { btn.innerHTML = FALLBACK_ICONS; }
  }

  function toggleAudio(audio) {
    if (!audio.paused) { audio.pause(); return; }
    /* 播完后再点：显式回到 0，各浏览器对「ended 后直接 play」的行为不一致 */
    if (audio.ended) { audio.currentTime = 0; }
    var pr = audio.play();
    if (pr && pr.catch) { pr.catch(function () { playFailed(audio); }); }
  }

  /* play() 被拒不一定是资源坏了：快速切换时 pause 会打断 play 抛 AbortError，
     自动播放策略也会拒。只有 audio.error 真的存在才算播放不了 */
  function playFailed(audio) {
    if (!audio.error) { return; }
    if (audio.__ap) { markError(audio.__ap); }
    if (audio === current) { current = null; islandClear(); }
  }

  function syncPlayer(p) {
    if (isScrubbing(p.range)) { return; }
    var known = durationOf(p.audio) > 0;
    /* 时长未知时禁用拖动：没有依据可 seek，且 iOS 要等 loadedmetadata 才给 duration */
    p.range.disabled = !known;
    var text = timeText(p.audio);
    p.time.textContent = text;
    setFill(p.range, known ? Math.round(p.audio.currentTime / p.audio.duration * PROGRESS_MAX) : 0, text);
  }

  /* 播放/暂停两种外观。互切音轨时被顶掉的那一轨收不到有效的 pause 回调
     （current 已经换人，onMedia 里那条 guard 会把它滤掉），所以不能只靠
     事件驱动，必须由 activate() 主动调用 restUI() 收尾 */
  function restUI(p) {
    p.root.classList.remove('is-playing');
    p.btn.setAttribute('aria-label', '播放：' + p.title.textContent);
  }

  function activeUI(p) {
    p.root.classList.add('is-playing');
    p.btn.disabled = false;
    p.btn.setAttribute('aria-label', '暂停：' + p.title.textContent);
  }

  function markError(p) {
    p.root.classList.add('is-error');
    p.range.disabled = true;
    p.btn.disabled = true;
    p.time.textContent = '无法播放';
  }

  /* 绑定目标从「固定的 audio」改成「取 audio 的函数」：
     文章播放器恒返回自己那一轨，顶栏控件返回动态变化的 current ——
     两者要的语义完全一样，不这么改就得给顶栏单写一套 */
  function bindToggle(btn, getAudio) {
    btn.addEventListener('click', function () {
      var audio = getAudio();
      if (audio) { toggleAudio(audio); }   /* 没有当前音轨（音乐区不可见时）静默 */
    });
  }

  function bindRange(range, getAudio) {
    /* input 事件里直接写 currentTime：本地音频拖动即试听。
       同时把这一条标记为「用户正拖着」—— timeupdate 的持续回写会让手感打架 */
    range.addEventListener('input', function () {
      var audio = getAudio();
      if (!audio) { return; }
      markScrub(range);
      var d = durationOf(audio);
      var t = d * (range.value / PROGRESS_MAX);
      setFill(range, range.value, fmt(t) + ' / ' + (d ? fmt(d) : '--:--'));
      if (d) { audio.currentTime = t; }
    });
    range.addEventListener('change', function () { unmarkScrub(range); });
    range.addEventListener('blur', function () { unmarkScrub(range); });
    /* 按下就标记：从按下到第一次 input 之间，timeupdate 也可能插进来抢值 */
    range.addEventListener('pointerdown', function () { markScrub(range); });
    /* pointerdown 不是所有浏览器都有，补一对旧事件（重复标记无副作用） */
    range.addEventListener('mousedown', function () { markScrub(range); });
    range.addEventListener('touchstart', function () { markScrub(range); });
  }

  /* 把 <audio> 包进自建外壳：元素本身隐藏但照常播放，控件由我们驱动 */
  function buildPlayer(audio) {
    var name = titleOf(audio);

    var root = document.createElement('div');
    root.className = 'audio-player';

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'audio-toggle';
    copyIcons(btn, musicToggle);

    var title = document.createElement('span');
    title.className = 'audio-player-title';
    title.textContent = name;
    title.setAttribute('title', name);

    var range = document.createElement('input');
    range.type = 'range';
    range.className = 'audio-progress';
    range.min = '0';
    range.max = String(PROGRESS_MAX);
    range.step = '1';
    range.value = '0';
    range.setAttribute('aria-label', '播放进度');

    var time = document.createElement('span');
    time.className = 'audio-player-time';
    /* 读屏信息已由进度条的 aria-valuetext 承担，这行可视化时间不必重复播报 */
    time.setAttribute('aria-hidden', 'true');

    var row = document.createElement('div');
    row.className = 'audio-player-row';
    row.appendChild(range);
    row.appendChild(time);

    var main = document.createElement('div');
    main.className = 'audio-player-main';
    main.appendChild(title);
    main.appendChild(row);

    root.appendChild(btn);
    root.appendChild(main);

    /* 外壳插到 <audio> 原位置，再把 audio 搬进来 —— 作者写的文档顺序保持不变 */
    audio.parentNode.insertBefore(root, audio);
    root.appendChild(audio);
    /* 原生控件已由自建 UI 取代。摘掉它，audio.css 里 html[data-audio="on"] 的
       门禁才会藏起这个元素；它只在关 JS 时才是降级路径 */
    audio.removeAttribute('controls');
    if (!audio.getAttribute('preload')) { audio.preload = 'metadata'; }

    var player = { audio: audio, root: root, btn: btn, range: range, time: time, title: title };
    audio.__ap = player;   /* 事件中枢靠它在元素上反查外壳 */
    players.push(player);

    /* 文章播放器的控件永远作用于自己那一轨，所以取音轨函数是个常量 */
    var selfAudio = function () { return audio; };
    bindToggle(btn, selfAudio);
    bindRange(range, selfAudio);
    restUI(player);        /* 初值是暂停态：顺带把按钮的 aria-label 写上，别留空 */
    syncPlayer(player);
  }

  function initPlayers() {
    var list = document.querySelectorAll('main audio');
    for (var i = 0; i < list.length; i++) {
      var audio = list[i];
      if (audio.__ap) { continue; }                          /* 已建壳（防将来重跑） */
      if (audio.hasAttribute('data-keep-native')) { continue; }
      try {
        buildPlayer(audio);
      } catch (e) {
        /* 建壳失败就把原生控件还给作者：否则元素既隐形又没 UI，彻底用不了 */
        audio.setAttribute('data-audio-failed', '1');
        audio.setAttribute('controls', '');
      }
      /* 作者写了 autoplay、或脚本跑到时它已经在播：没有 play 事件可等，主动点亮 */
      if (audio.__ap && !audio.paused) { activate(audio); }
    }
  }

  /* ============ 5. 事件中枢 ============
     媒体事件不冒泡，只能在 document 上以 capture 阶段委托。
     error 的 target 可能是 <audio> 里的 <source>，所以先回到宿主元素 */
  var MEDIA_EVENTS = ['play', 'pause', 'ended', 'timeupdate',
                      'loadedmetadata', 'durationchange', 'error'];

  function audioOf(node) {
    if (!node || node.nodeType !== 1) { return null; }
    if (node.tagName === 'AUDIO') { return node; }
    if (node.tagName === 'SOURCE' && node.parentNode && node.parentNode.tagName === 'AUDIO') {
      return node.parentNode;
    }
    return null;
  }

  /* 多音轨互斥。用 getElementsByTagName 而非缓存列表：
     作者标了 data-keep-native、没被建壳的 audio 也一并互斥掉 */
  function pauseOthers(keep) {
    var list = document.getElementsByTagName('audio');
    for (var i = 0; i < list.length; i++) {
      if (list[i] !== keep && !list[i].paused) { list[i].pause(); }
    }
  }

  /* 背景音乐宿主（#nav-music-audio 带 data-playlist）与文章里的 <audio> 靠这个区分 */
  function isPlaylistTrack(audio) {
    return audio.hasAttribute('data-playlist');
  }

  /* 认下当前音轨并点亮两处 UI：play 事件与「初始化时已在播」共用这一条路径 */
  function activate(audio) {
    /* 先把其它播放器按回「已暂停」的外观：互切时被顶掉的那一轨等不到
       属于自己的 pause 收尾（见 restUI 的说明） */
    for (var i = 0; i < players.length; i++) {
      if (players[i] !== audio.__ap) { restUI(players[i]); }
    }
    current = audio;
    flag('has-track', true);          /* 有音轨 → 显示音乐区（两种来源都算） */
    /* 只有文章里的音轨才禁止胶囊收缩。背景音乐是循环的，一直不收缩会把正文
       永久压在胶囊下面，所以它不加 .has-audio —— glass-overrides.css 那几处
       :not(.has-audio) 门禁自然就不拦它，滚动照常收缩 */
    if (!isPlaylistTrack(audio)) { flag('has-audio', true); }
    flag('is-playing', true);
    islandShow(audio);
    if (audio.__ap) { activeUI(audio.__ap); }
    setSession(audio, 'playing');
  }

  function onMedia(type, e) {
    var audio = audioOf(e.target);
    if (!audio) { return; }
    var p = audio.__ap;

    if (type === 'play') {
      /* 先认下新音轨再去暂停旧的，顺序反了就出事：旧轨的 pause 回调会
         按「当前音轨暂停」把刚点亮的顶栏清掉 */
      current = audio;
      pauseOthers(audio);
      activate(audio);
      return;
    }

    if (type === 'pause') {
      if (audio !== current) { return; }   /* 互斥切换时旧轨的收尾，忽略 */
      /* 只摘 .is-playing：暂停后音乐区要留在顶栏（用户可从那里恢复播放），
         所以 .has-audio 不能跟着一起摘 */
      flag('is-playing', false);
      if (p) { restUI(p); }
      if (musicToggle) { musicToggle.setAttribute('aria-label', '播放：' + titleOf(audio)); }
      setSession(audio, 'paused');
      return;
    }

    if (type === 'ended') {
      if (audio !== current) { return; }
      flag('is-playing', false);
      if (p) {
        restUI(p);
        resetPlayer(p);
      }
      /* 列表音轨（data-playlist）不收顶栏、也**不丢 current**：下一首的
         loadedmetadata 要靠 audio === current 才会回写顶栏进度。
         续不续播、续哪一首由 music-menu.js 决定（它直接在元素上监听 ended） */
      if (!isPlaylistTrack(audio)) {
        current = null;
        islandClear();        /* 播完才收起顶栏，与「暂停保留」相区分 */
      }
      setSession(audio, 'none');
      return;
    }

    if (type === 'timeupdate' || type === 'loadedmetadata' || type === 'durationchange') {
      if (p) { syncPlayer(p); }
      if (audio === current) { syncIsland(audio); }
      return;
    }

    /* error */
    if (p) { markError(p); }
    /* 列表音轨出错同样不清岛：music-menu.js 会跳下一首，顶栏平滑换成新标题 */
    if (audio === current && !isPlaylistTrack(audio)) { current = null; islandClear(); }
  }

  /* ============ 6. MediaSession：锁屏 / 通知栏 / 耳机线控 ============ */
  var session = (typeof navigator !== 'undefined' && 'mediaSession' in navigator)
    ? navigator.mediaSession : null;
  var canMeta = typeof window.MediaMetadata === 'function';

  function setHandler(name, fn) {
    if (!session || !session.setActionHandler) { return; }
    /* 各浏览器支持的 action 不尽相同，不支持的会直接抛 */
    try { session.setActionHandler(name, fn); } catch (e) { /* 忽略 */ }
  }

  function setSession(audio, state) {
    if (!session) { return; }
    if (canMeta) {
      try {
        session.metadata = new window.MediaMetadata({
          title: titleOf(audio),
          artist: siteName,
          artwork: artworkUrl ? [{ src: artworkUrl, sizes: '512x512', type: 'image/jpeg' }] : []
        });
      } catch (e) { /* 某些实现会挑 artwork 的毛病，元数据本身不重要 */ }
    }
    try { session.playbackState = state; } catch (e) { /* 忽略 */ }
  }

  setHandler('play', function () {
    if (!current) { return; }
    var pr = current.play();
    if (pr && pr.catch) { pr.catch(function () { /* 同上，不弹错 */ }); }
  });

  setHandler('pause', function () {
    if (current) { current.pause(); }
  });

  setHandler('seekto', function (details) {
    if (!current || !details || typeof details.seekTime !== 'number') { return; }
    if (details.fastSeek && current.fastSeek) { current.fastSeek(details.seekTime); return; }
    current.currentTime = details.seekTime;
  });

  /* ============ 7. 启动 ============ */
  initPlayers();

  /* 顶栏控件作用于「当前音轨」，所以传取音轨函数而不是某个固定元素。
     这段接线是上一轮遗漏的：音乐区一直只同步显示，点它、拖它都没有任何反应 */
  var currentAudio = function () { return current; };
  if (musicToggle) { bindToggle(musicToggle, currentAudio); }
  if (musicRange) { bindRange(musicRange, currentAudio); }

  var musicStop = document.getElementById('nav-music-stop');
  if (musicStop) { musicStop.addEventListener('click', stopCurrent); }

  /* bfcache 返回（前进/后退）时脚本不重跑、DOM 类名原样留着，但媒体已被暂停，
     会出现「显示 ⏸、其实没在放」的错位，这里校正一次 */
  window.addEventListener('pageshow', function (e) {
    if (!e.persisted || !current || !current.paused) { return; }
    flag('is-playing', false);
    if (current.__ap) { restUI(current.__ap); }
  });

  function listen(type) {
    document.addEventListener(type, function (e) { onMedia(type, e); }, true);
  }

  for (var i = 0; i < MEDIA_EVENTS.length; i++) { listen(MEDIA_EVENTS[i]); }
})();
