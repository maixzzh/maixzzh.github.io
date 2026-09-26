/* 站内搜索：首页内嵌 + 顶栏全局
   两套入口共用同一份索引与匹配/高亮逻辑，只在渲染层分叉：
   首页复用 .feed-item 卡片，顶栏用精简行。
   顶栏面板刻意是高斯模糊而非 Liquid 玻璃（见 search.css）。

   密级：/search.json 在**构建期**就只收 secret 0 和 1，2 级根本不在里面；
   2 级走 /search-secret.json，只有解锁后才拉取合并。前端过滤是第二道门，
   真正起作用的是构建期的拆分（那份 JSON 含全文，谁都能 curl 下来）。
   解锁入口：?secret=1（任意真值）或 Ctrl/Cmd+Shift+.，状态存 sessionStorage。
   另支持 ?q=xxx 直接带词搜索。
   无依赖、defer 加载 */
(function () {
  'use strict';

  var INDEX_URL        = window.SEARCH_INDEX || '/search.json';
  var SECRET_INDEX_URL = window.SEARCH_SECRET_INDEX || '/search-secret.json';
  var DEBOUNCE  = 180;      /* 输入防抖：避免每敲一个字都全量重排 */
  var UNLOCK_KEY = 'search-unlocked';   /* sessionStorage：关掉标签页即失效 */

  /* ---------- 0. 密级状态 ---------- */
  var unlocked = false;     /* 是否已解锁 2 级 */
  var rerenders = [];       /* 各入口的渲染函数；解锁合并完成后统一重跑一次 */
  var openNav = null;       /* 由 initNav 填充：让外部能展开顶栏面板并填入关键词 */

  try { unlocked = sessionStorage.getItem(UNLOCK_KEY) === '1'; } catch (e) { /* 隐私模式 */ }

  /* ---------- 1. 索引：只取一次，加载期间排队等 ---------- */
  var items = null;
  var waiting = [];
  var secretWaiting = [];

  /* 统一走这里，省得两处 XHR 各写一遍错误处理。
     失败一律回空数组，渲染层显示「无结果」 */
  function get(url, cb) {
    var req = new XMLHttpRequest();
    req.open('GET', url, true);
    req.onload = function () {
      var list = [];
      try { list = JSON.parse(req.responseText); } catch (e) { list = []; }
      cb(list);
    };
    req.onerror = function () { cb([]); };
    req.send();
  }

  /* 把小写副本挂到条目上，避免每次查询都对全文重复 toLowerCase */
  function absorb(list) {
    if (!items) { items = []; }
    for (var i = 0; i < list.length; i++) {
      var it = list[i];
      it._t = (it.title || '').toLowerCase();
      it._d = (it.desc  || '').toLowerCase();
      it._b = (it.body  || '').toLowerCase();
      items.push(it);
    }
  }

  function load(cb) {
    if (items) { cb(); return; }
    waiting.push(cb);
    if (waiting.length > 1) { return; }        /* 已在加载中，排队即可 */
    get(INDEX_URL, function (list) {
      absorb(list);
      var q = waiting; waiting = [];
      for (var j = 0; j < q.length; j++) { q[j](); }
    });
  }

  /* 解锁：拉 2 级索引合并进 items，再让所有入口重跑一次渲染，
     这样已经输在框里的关键词能立刻搜到新并入的文章 */
  function unlock() {
    if (unlocked) { return; }
    unlocked = true;
    try { sessionStorage.setItem(UNLOCK_KEY, '1'); } catch (e) { /* 隐私模式 */ }
    load(function () {
      secretWaiting.push(function () {
        for (var i = 0; i < rerenders.length; i++) { rerenders[i](); }
      });
      if (secretWaiting.length > 1) { return; }   /* 已在加载中，排队即可 */
      get(SECRET_INDEX_URL, function (list) {
        absorb(list);
        var q = secretWaiting; secretWaiting = [];
        for (var j = 0; j < q.length; j++) { q[j](); }
      });
    });
  }

  /* ---------- 2. 匹配：子串 + 多词 AND + 字段加权 ---------- */
  function terms(q) {
    var raw = (q || '').toLowerCase().split(/\s+/);
    var out = [];
    for (var i = 0; i < raw.length; i++) { if (raw[i]) { out.push(raw[i]); } }
    return out;
  }

  function search(query) {
    var ts = terms(query);
    if (!ts.length || !items) { return []; }
    var out = [];
    for (var i = 0; i < items.length; i++) {
      var it = items[i], score = 0, all = true;
      /* 2 级只有在解锁后才参与匹配。构建期已经把 2 级从公开索引里拿掉了，
         这里是第二道门（索引还没合并时 items 里本来也没有它们）。
         jsonify 输出的是裸数字，但兜底一层 Number 转换，防手写索引出错 */
      if (!unlocked && Number(it.secret || 0) > 1) { continue; }
      for (var t = 0; t < ts.length; t++) {
        var term = ts[t], hit = false;
        if (it._t.indexOf(term) >= 0) { score += 100; hit = true; }   /* 标题命中权重最高 */
        if (it._d.indexOf(term) >= 0) { score += 20;  hit = true; }
        if (it._b.indexOf(term) >= 0) { score += 1;   hit = true; }
        if (!hit) { all = false; break; }                             /* 任一词未命中即淘汰 */
      }
      if (all) { out.push({ item: it, terms: ts, score: score }); }
    }
    out.sort(function (a, b) {
      if (b.score !== a.score) { return b.score - a.score; }
      return a.item.date < b.item.date ? 1 : -1;   /* 同分按日期倒序（YYYY-MM-DD 字典序即时间序） */
    });
    return out;
  }

  /* ---------- 3. 高亮：先转义再插 <mark> ----------
     顺序很关键：若先插 <mark> 再整体转义，标记本身会被转义掉；
     若直接拼接未转义的原文，文章里的 < > 会被当成标签 */
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function mark(text, ts) {
    if (!text) { return ''; }
    var lower = text.toLowerCase(), ranges = [], i, at, from;
    for (i = 0; i < ts.length; i++) {
      from = 0;
      while ((at = lower.indexOf(ts[i], from)) >= 0) {
        ranges.push([at, at + ts[i].length]);
        from = at + ts[i].length;
      }
    }
    if (!ranges.length) { return esc(text); }
    ranges.sort(function (a, b) { return a[0] - b[0]; });
    var out = '', pos = 0;
    for (i = 0; i < ranges.length; i++) {
      var s = ranges[i][0], e = ranges[i][1];
      if (s < pos) { continue; }                   /* 与前一段重叠：跳过，避免 <mark> 交叉嵌套 */
      out += esc(text.slice(pos, s)) + '<mark>' + esc(text.slice(s, e)) + '</mark>';
      pos = e;
    }
    return out + esc(text.slice(pos));
  }

  function debounce(fn, wait) {
    var timer = null;
    return function () {
      if (timer) { clearTimeout(timer); }
      timer = setTimeout(function () { timer = null; fn(); }, wait);
    };
  }

  /* 无结果卡片：标题不放 <a>，因此点击无任何效果（悬停上浮由 CSS 去掉） */
  function emptyCard() {
    return '<article class="card feed-item glass-card search-empty">' +
             '<h2 class="feed-title">没有找到你想要的文章</h2>' +
             '<p class="feed-desc">如果确实需要建议与作者联系</p>' +
           '</article>';
  }

  /* ---------- 4. 首页内嵌搜索 ---------- */
  function initHome() {
    var box = document.getElementById('home-search');
    var feed = document.getElementById('home-feed');
    if (!box || !feed) { return; }
    var input = document.getElementById('home-search-input');
    var fallback = null;      /* 首次搜索前缓存 Jekyll 渲染的 3 篇 */

    function render() {
      var q = input.value;
      if (!terms(q).length) {                 /* 空关键词 → 还原默认视图 */
        if (fallback !== null) { feed.innerHTML = fallback; }
        return;
      }
      if (fallback === null) { fallback = feed.innerHTML; }
      load(function () {
        var res = search(q);
        if (!res.length) { feed.innerHTML = emptyCard(); return; }
        var html = '';
        for (var i = 0; i < res.length; i++) {
          var it = res[i].item, ts = res[i].terms;
          html += '<article class="card feed-item glass-card">' +
            '<h2 class="feed-title"><a href="' + esc(it.url) + '">' + mark(it.title, ts) + '</a></h2>' +
            (it.desc ? '<p class="feed-desc">' + mark(it.desc, ts) + '</p>' : '') +
            '<div class="feed-meta">' +
              (it.tags ? '<span class="feed-tags">' + esc(it.tags) + '</span>' : '') +
              '<time class="feed-date">' + esc(it.date) + '</time>' +
            '</div></article>';
        }
        feed.innerHTML = html;
      });
    }

    input.addEventListener('input', debounce(render, DEBOUNCE));
    input.addEventListener('search', render);   /* 点原生 ✕ 清空时立即还原 */

    rerenders.push(render);      /* 解锁并入 2 级索引后要重跑，见 unlock() */
  }

  /* ---------- 5. 顶栏全局搜索 ---------- */
  function initNav() {
    var box   = document.getElementById('nav-search');
    var input = document.getElementById('nav-search-input');
    var layer = document.getElementById('nav-search-layer');
    var list  = document.getElementById('nav-search-results');
    var stat  = document.getElementById('nav-search-status');
    if (!box || !layer) { return; }

    var header  = document.getElementById('site-header');
    var toggle  = document.getElementById('nav-search-toggle');
    var close   = document.getElementById('nav-search-close');
    var ticking = false;

    function isOpen() { return layer.classList.contains('is-open'); }

    /* 面板位置：胶囊在收缩/展开两态间移动（top 12↔20、高 53↔57），
       写死会错位，必须实测底边；由 JS 写入 CSS 变量 */
    function place() {
      if (!header) { return; }
      layer.style.setProperty('--nav-search-top',
        Math.round(header.getBoundingClientRect().bottom + 10) + 'px');
    }

    function setOpen(open) {
      layer.classList.toggle('is-open', open);
      if (header) { header.classList.toggle('is-searching', open); }
      if (toggle) { toggle.setAttribute('aria-expanded', open ? 'true' : 'false'); }
      if (open) {
        place();
        input.focus();
      } else {
        input.value = '';
        list.innerHTML = '';
        stat.textContent = '';
      }
    }

    function render() {
      var q = input.value;
      if (!terms(q).length) { stat.textContent = ''; list.innerHTML = ''; return; }
      stat.textContent = '搜索中…';                 /* 索引首次加载时给个反馈 */
      load(function () {
        var res = search(q);
        if (!res.length) {
          stat.textContent = '没有找到你想要的文章 · 如果确实需要建议与作者联系';
          list.innerHTML = '';
          return;
        }
        stat.textContent = '共 ' + res.length + ' 篇';
        var html = '';
        for (var i = 0; i < res.length; i++) {
          var it = res[i].item, ts = res[i].terms;
          html += '<a class="nav-search-item" href="' + esc(it.url) + '">' +
            '<span class="nav-search-item-title">' + mark(it.title, ts) + '</span>' +
            '<span class="nav-search-item-meta"><time>' + esc(it.date) + '</time></span>' +
            '<span class="nav-search-item-desc">' + mark(it.desc, ts) + '</span>' +
          '</a>';
        }
        list.innerHTML = html;
      });
    }

    if (toggle) {
      toggle.addEventListener('click', function () { setOpen(!isOpen()); });
    }
    if (close) {
      close.addEventListener('click', function () {
        setOpen(false);
        if (toggle) { toggle.focus(); }
      });
    }
    input.addEventListener('input', debounce(render, DEBOUNCE));

    /* 点结果 → 跳转前先收起 */
    layer.addEventListener('click', function (e) {
      if (e.target && e.target.closest && e.target.closest('a')) { setOpen(false); }
    });

    /* 点外部关闭（同 nav-shrink.js 的写法） */
    document.addEventListener('click', function (e) {
      if (!isOpen()) { return; }
      if (box.contains(e.target) || layer.contains(e.target)) { return; }
      setOpen(false);
    });

    /* Esc 关闭并把焦点还给图标（同 theme-menu.js 的约定） */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen()) {
        setOpen(false);
        if (toggle) { toggle.focus(); }
      }
    });

    /* 胶囊因滚动收缩/展开时面板跟着走：rAF 节流 + passive */
    window.addEventListener('scroll', function () {
      if (!isOpen() || ticking) { return; }
      ticking = true;
      window.requestAnimationFrame(function () { ticking = false; place(); });
    }, { passive: true });

    window.addEventListener('resize', function () { if (isOpen()) { place(); } });

    rerenders.push(render);      /* 解锁并入 2 级索引后要重跑，见 unlock() */

    /* 对外只暴露「展开面板并填入关键词」这一件事，用于 ?q= */
    openNav = function (q) {
      setOpen(true);
      if (q) { input.value = q; render(); }
    };
  }

  /* ---------- 6. 入口参数与快捷键 ---------- */
  function readParam(name) {
    var m = new RegExp('[?&]' + name + '=([^&#]*)').exec(window.location.search);
    if (!m) { return null; }
    try { return decodeURIComponent(m[1].replace(/\+/g, ' ')); } catch (e) { return m[1]; }
  }

  /* 把参数从地址栏抹掉，不刷新页面（replaceState 不触发导航） */
  function stripParam(name) {
    var s = window.location.search;
    if (!s || s.length < 2) { return; }
    var parts = s.slice(1).split('&'), out = [], i, k;
    for (i = 0; i < parts.length; i++) {
      if (!parts[i]) { continue; }
      k = parts[i].split('=')[0];
      try { k = decodeURIComponent(k); } catch (e) { /* 非法编码：按原样比 */ }
      if (k === name) { continue; }
      out.push(parts[i]);
    }
    try {
      window.history.replaceState(null, '', window.location.pathname +
        (out.length ? '?' + out.join('&') : '') + window.location.hash);
    } catch (e) { /* 老浏览器：保留参数，只是地址栏没那么干净 */ }
  }

  /* 先把两个入口初始化好（rerenders 才有内容），再处理 URL 参数。
     ?secret 的解锁是异步的（要拉索引），未解锁时的重渲染由 unlock() 负责 */
  function boot() {
    if (readParam('secret') !== null) {
      unlock();
      stripParam('secret');
    }
    var q = readParam('q');
    if (q !== null) {
      if (openNav) { openNav(q); }    /* 面板不存在（非首页/无顶栏）时静默跳过 */
      stripParam('q');
    }
  }

  /* 快捷键 Ctrl/Cmd + Shift + . —— 不想在地址栏留痕时的解锁入口 */
  document.addEventListener('keydown', function (e) {
    if (e.key === '.' && e.shiftKey && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      unlock();
    }
  });

  initHome();
  initNav();
  boot();
})();
