/* 站内搜索：首页内嵌 + 顶栏全局
   两套入口共用同一份 _posts 索引（/search.json）与匹配/高亮逻辑，
   只在渲染层分叉：首页复用 .feed-item 卡片，顶栏用精简行。
   顶栏面板刻意是高斯模糊而非 Liquid 玻璃（见 search.css）。
   无依赖、defer 加载 */
(function () {
  'use strict';

  var INDEX_URL = window.SEARCH_INDEX || '/search.json';
  var DEBOUNCE  = 180;      /* 输入防抖：避免每敲一个字都全量重排 */

  /* ---------- 1. 索引：只取一次，加载期间排队等 ---------- */
  var items = null;
  var waiting = [];

  function load(cb) {
    if (items) { cb(); return; }
    waiting.push(cb);
    if (waiting.length > 1) { return; }        /* 已在加载中，排队即可 */
    var req = new XMLHttpRequest();
    req.open('GET', INDEX_URL, true);
    req.onload = function () {
      var list = [];
      try { list = JSON.parse(req.responseText); } catch (e) { list = []; }
      items = [];
      for (var i = 0; i < list.length; i++) {
        var it = list[i];
        /* 预先小写化，避免每次查询都对全文重复 toLowerCase */
        it._t = (it.title || '').toLowerCase();
        it._d = (it.desc  || '').toLowerCase();
        it._b = (it.body  || '').toLowerCase();
        items.push(it);
      }
      var q = waiting; waiting = [];
      for (var j = 0; j < q.length; j++) { q[j](); }
    };
    req.onerror = req.onload;                  /* 失败也放行，渲染层显示「无结果」 */
    req.send();
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
  }

  initHome();
  initNav();
})();
