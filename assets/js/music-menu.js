/* 背景音乐：顶栏选歌图标 + 曲目面板 + 播放列表
   ---------------------------------------------------------------
   三件事：
     1. 拉 /music.json（构建期扫 music/ 生成的清单），渲染成分组列表
     2. 面板开合（点外部 / Esc / 跨 768px 断点关闭，同 theme-menu.js 的约定）
     3. 驱动播放列表：选曲 → 顺序往下播 → 放完回到第一首

   播放本身交给 audio-player.js 的中央事件中枢。#nav-music-audio 带
   data-playlist，它据此在 ended/error 时不停表、不收顶栏（否则放完一首
   顶栏就消失了）；本文件只负责"下一首是谁"。两边靠这一个属性解耦，
   没有函数调用依赖。
   无依赖、defer 加载 */
(function () {
  'use strict';

  var picker  = document.getElementById('nav-music-picker');
  var layer   = document.getElementById('nav-music-layer');
  var list    = document.getElementById('nav-music-list');
  var status  = document.getElementById('nav-music-status');
  var header  = document.getElementById('site-header');
  var titleEl = document.getElementById('nav-music-title');
  var audio   = document.getElementById('nav-music-audio');
  /* 任一缺失就静默退出（同 theme-menu.js 的写法） */
  if (!picker || !layer || !list || !audio) { return; }

  var INDEX_URL  = window.MUSIC_INDEX || '/music.json';
  /* 根目录那组的显示名；子目录组直接用目录名（如「2026年4月4日」） */
  var ROOT_LABEL = '单曲收藏';

  /* ============ 1. 状态 ============ */
  var tracks  = null;    /* /music.json 的内容；null = 还没拉过（失败也不写，好重试） */
  var index   = -1;      /* 当前曲目下标（tracks 里的下标）；-1 = 本次会话还没点过 */
  var order   = [];      /* 播放顺序 = 面板显示顺序（render 时重建）。
                            不直接用 tracks 下标递增：清单是按路径字典序排的，而面板
                            把根目录那组提到了最前，两者顺序不保证一致 —— 用显示顺序
                            才能让"下一首"正好是用户在列表里看到的下一个 */
  var fails   = 0;       /* 连续失败计数：整个列表都放不了就停住，绝不死循环跳歌 */
  var loading = false;

  /* ============ 2. 工具 ============ */
  function setStatus(text) {
    if (status) { status.textContent = text || ''; }
  }

  function isOpen() { return layer.classList.contains('is-open'); }

  /* 面板顶边贴胶囊底边。header 是 fixed，getBoundingClientRect().bottom
     就是视口坐标（同 search.js 写 --nav-search-top 的做法） */
  function place() {
    if (!header) { return; }
    var bottom = header.getBoundingClientRect().bottom;
    layer.style.setProperty('--nav-music-top', Math.round(bottom + 8) + 'px');
  }

  function setOpen(open) {
    layer.classList.toggle('is-open', open);
    picker.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (!open) {
      /* 关掉就清空行 DOM：留着 57 行没意义，下次打开也要按新的当前曲目重新高亮 */
      list.innerHTML = '';
      return;
    }
    place();
    loadTracks();     /* 懒加载：第一次打开才拉清单 */
    syncCurrent();
    focusRow();
  }

  /* ============ 3. 拉清单（懒加载） ============ */
  function loadTracks() {
    if (tracks || loading) { return; }
    loading = true;
    setStatus('正在加载曲目…');

    var xhr = new XMLHttpRequest();
    xhr.open('GET', INDEX_URL, true);
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) { return; }
      loading = false;
      if (xhr.status < 200 || xhr.status >= 300) {
        /* 失败不缓存（tracks 保持 null），下次打开面板会重试 */
        setStatus('曲目清单加载失败（' + INDEX_URL + '）');
        return;
      }
      var data = null;
      try { data = JSON.parse(xhr.responseText); } catch (e) { data = null; }
      if (!data || !data.length) {
        tracks = [];
        /* 这条提示对应 music.json 里那个 ★：清单是构建期扫盘生成的，
           music/ 不在仓库里就会是空的 */
        setStatus('曲目清单是空的 —— 检查 music/ 里的音频是否已提交进仓库');
        return;
      }
      tracks = data;
      setStatus('');
      render();
      focusRow();
    };
    xhr.send();
  }

  /* ============ 4. 渲染 ============ */
  /* 分组顺序：根目录（group 为空串）永远第一，其余按清单里首次出现的先后 */
  function groupOrder() {
    var order = [];
    for (var i = 0; i < tracks.length; i++) {
      var g = tracks[i].group || '';
      if (g === '') { continue; }
      var seen = false;
      for (var j = 0; j < order.length; j++) { if (order[j] === g) { seen = true; break; } }
      if (!seen) { order.push(g); }
    }
    order.unshift('');
    return order;
  }

  function render() {
    list.innerHTML = '';          /* 只用来清空，不拼 HTML */
    var groups = groupOrder();
    order = [];

    for (var k = 0; k < groups.length; k++) {
      var g = groups[k];
      var rows = [];
      for (var i = 0; i < tracks.length; i++) {
        if ((tracks[i].group || '') === g) { rows.push(i); }
      }
      if (!rows.length) { continue; }

      var head = document.createElement('div');
      head.className = 'nav-music-group';
      head.setAttribute('role', 'presentation');   /* status 之外的分组标题不参与菜单语义 */
      head.textContent = (g === '') ? ROOT_LABEL : g;
      list.appendChild(head);

      for (var m = 0; m < rows.length; m++) {
        order.push(rows[m]);
        list.appendChild(buildRow(rows[m]));
      }
    }
  }

  function buildRow(i) {
    var t = tracks[i];
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'nav-music-item';
    btn.setAttribute('role', 'menuitem');
    btn.tabIndex = -1;
    btn.__idx = i;                 /* 行是分组排列的，DOM 顺序 ≠ tracks 顺序 */

    var span = document.createElement('span');
    span.className = 'nav-music-item-title';
    /* 用 textContent 而不是拼 HTML：文件名里有空格、逗号、括号、日文，
       将来还可能有 < & —— 交给浏览器转义最省心 */
    span.textContent = t.title;
    span.setAttribute('title', t.title);
    btn.appendChild(span);

    /* 选完就收起面板（同 theme-menu.js 的「选中即关」）。关闭放在这里而不是
       keydown 里：<button> 的 Enter/空格是靠原生行为派发 click 的，
       若在 keydown 阶段就清空列表 DOM，那个 click 根本不会发生 */
    btn.addEventListener('click', function () {
      play(i);
      setOpen(false);
    });
    return btn;
  }

  /* ============ 5. 高亮 ============ */
  /* 身份用 src 比对，**不能**用标题：花海.mp3 在根目录与 2026年4月4日/ 各有一份，
     比标题会同时点亮两行 */
  function rowState(i) {
    if (!tracks || i !== index) { return false; }
    if (audio.getAttribute('src') !== tracks[i].src) { return false; }
    if (!audio.paused) { return true; }
    /* 暂停中还得确认顶栏显示的就是这一首 —— 被文章里的音轨顶掉时 .has-track
       仍在，但音乐区的标题已经换人了 */
    return !!(titleEl && titleEl.textContent === tracks[i].title);
  }

  function syncCurrent() {
    var rows = list.querySelectorAll('.nav-music-item');
    for (var i = 0; i < rows.length; i++) {
      var on = rowState(rows[i].__idx);
      rows[i].classList.toggle('is-current', on);
      if (on) { rows[i].setAttribute('aria-current', 'true'); }
      else { rows[i].removeAttribute('aria-current'); }
    }
  }

  /* ============ 6. 选曲与续播 ============ */
  function play(i) {
    if (!tracks || i < 0 || i >= tracks.length) { return; }
    var t = tracks[i];
    /* 点的就是正在放的那一首：回到开头重放即可，不重新赋值 src
       （重新 load 会多一次往返，还会打断当前播放） */
    if (i === index && audio.getAttribute('src') === t.src && !audio.paused) {
      audio.currentTime = 0;
      return;
    }
    index = i;
    fails = 0;
    /* data-title 是 audio-player.js 标题优先级链的第一档，顶栏与锁屏都读它 */
    audio.setAttribute('data-title', t.title);
    audio.setAttribute('src', t.src);
    var pr = audio.play();
    if (pr && pr.catch) { pr.catch(playFailed); }
  }

  /* play() 被拒不一定是资源坏了：自动播放策略也会拒。只有 audio.error 真的存在
     才算放不了 —— 否则这里一跳下一首，会一路把整个列表跳完。
     判据与 audio-player.js 的 playFailed 一致 */
  function playFailed() {
    if (audio.error) { next(true); return; }
    setStatus('浏览器阻止了自动播放，点顶栏的 ▶ 继续');
  }

  /* 往下走一首；afterFail 表示这是失败跳过的，连续失败到全表就停住 */
  function next(afterFail) {
    if (!tracks || !tracks.length) { return; }
    if (afterFail) {
      fails++;
      if (fails >= tracks.length) {
        fails = 0;
        setStatus('这个列表里的曲目都放不了，检查文件是否存在');
        return;
      }
    } else {
      fails = 0;
    }
    /* 按面板显示的顺序往下走（见 order 的说明），放完最后一首回到第一首。
       at 找不到时 -1 → (0) % len → 从第一首重新开始，是个安全的降级 */
    var at = -1;
    for (var i = 0; i < order.length; i++) {
      if (order[i] === index) { at = i; break; }
    }
    play(order.length ? order[(at + 1) % order.length] : (index + 1) % tracks.length);
  }

  /* 单曲自然播完 → 下一首。
     注意给 src 赋新值**不会**触发 ended（走的是 load 算法，派发的是
     abort/emptied），所以切歌不会引起"多跳一首" —— 最直觉的实现会踩这里 */
  audio.addEventListener('ended', function () { next(false); });
  audio.addEventListener('error', function () { next(true); });

  audio.addEventListener('play', function () {
    fails = 0;
    setStatus('');
    syncCurrent();
  });
  audio.addEventListener('pause', function () { syncCurrent(); });

  /* ============ 7. 面板开合 ============ */
  picker.addEventListener('click', function () { setOpen(!isOpen()); });

  /* 点面板外关闭。与搜索面板互为"外部"：点搜索图标时本面板判定为面板外而自动
     关闭，反之亦然 —— 所以两者互斥是白送的，不需要任何耦合代码 */
  document.addEventListener('click', function (e) {
    if (!isOpen()) { return; }
    if (picker.contains(e.target) || layer.contains(e.target)) { return; }
    setOpen(false);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isOpen()) {
      setOpen(false);
      picker.focus();
    }
  });

  /* 跨 768px 断点自动关闭：断点两侧胶囊的内边距与外边距整套换人，
     收缩态还会把图标藏起来，面板悬在那里很怪 */
  var mq = window.matchMedia ? window.matchMedia('(max-width: 768px)') : null;
  if (mq) {
    var onMq = function () { if (isOpen()) { setOpen(false); } };
    if (mq.addEventListener) { mq.addEventListener('change', onMq); }
    else if (mq.addListener) { mq.addListener(onMq); }   /* 旧版 Safari */
  }

  /* 滚动 / 缩放时重算位置。rAF 节流，scroll 高频触发也每帧最多算一次 */
  var ticking = false;
  function onMove() {
    if (ticking) { return; }
    ticking = true;
    window.requestAnimationFrame(function () {
      ticking = false;
      if (isOpen()) { place(); }
    });
  }
  window.addEventListener('scroll', onMove);
  window.addEventListener('resize', onMove);

  /* ============ 8. 键盘导航 ============ */
  /* 方向键只移动焦点、不选曲 —— 一按就换歌会让人崩溃 */
  function focusRow() {
    var rows = list.querySelectorAll('.nav-music-item');
    if (!rows.length) { return; }
    var target = 0;
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].classList.contains('is-current')) { target = i; break; }
    }
    rows[target].focus();
  }

  layer.addEventListener('keydown', function (e) {
    var rows = list.querySelectorAll('.nav-music-item');
    if (!rows.length) { return; }
    var at = -1;
    for (var i = 0; i < rows.length; i++) {
      if (rows[i] === document.activeElement) { at = i; break; }
    }
    if (at < 0) { return; }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      rows[at + 1 < rows.length ? at + 1 : 0].focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      rows[at > 0 ? at - 1 : rows.length - 1].focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      rows[0].focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      rows[rows.length - 1].focus();
    } else if (e.key === 'Tab') {
      /* 让焦点交还给浏览器的自然顺序；跑出面板后还留着它没有意义 */
      setOpen(false);
    }
    /* Enter / 空格不在这里处理：交给 <button> 的原生行为派发 click，
       由上面那个 click 处理器统一负责「播放 + 收起」 */
  });
})();
