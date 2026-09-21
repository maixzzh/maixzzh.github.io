/* 悬浮胶囊导航：滚动收缩 + 移动端汉堡面板
   滚动收缩在 solid 风格下无视觉作用（相关 CSS 仅在 liquid/frost 生效），
   故 JS 不判断风格，只负责切 .is-shrunk；
   无依赖、defer 加载 */
(function () {
  'use strict';

  var header = document.getElementById('site-header');
  if (!header) { return; }

  var toggle = document.getElementById('nav-toggle');
  var menuMq = window.matchMedia ? window.matchMedia('(max-width: 768px)') : null;

  /* ---------- 1. 滚动收缩 ---------- */
  var SHRINK_AT = 50;    /* 下滑超过 50px → 收缩 */
  var EXPAND_AT = 40;    /* 回到 40px 以内 → 展开（迟滞区间） */
  var shrunk = false;
  var ticking = false;

  function update() {
    ticking = false;
    var y = window.pageYOffset || document.documentElement.scrollTop || 0;
    /* 迟滞：收缩/展开用不同阈值，避免 y 停在 50px 附近时来回抽搐。
       比防抖更好——防抖会让收缩延迟到停止滚动之后才发生，观感是「停下来才突然瘪掉」 */
    var next = shrunk ? (y > EXPAND_AT) : (y > SHRINK_AT);
    if (next === shrunk) { return; }
    shrunk = next;
    header.classList.toggle('is-shrunk', shrunk);
    /* 收缩时若移动端面板开着，一并收起，避免「瘪胶囊 + 展开面板」的怪状态 */
    if (shrunk && header.classList.contains('nav-open')) { setMenu(false); }
  }

  /* rAF 节流：scroll 高频触发，但每帧最多算一次；passive 保证不阻塞滚动 */
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
  }, { passive: true });

  /* ---------- 2. 移动端汉堡面板 ---------- */
  function setMenu(open) {
    header.classList.toggle('nav-open', open);
    if (toggle) { toggle.setAttribute('aria-expanded', open ? 'true' : 'false'); }
  }

  function isMenuOpen() { return header.classList.contains('nav-open'); }

  if (toggle) {
    toggle.addEventListener('click', function () { setMenu(!isMenuOpen()); });
  }

  /* 点击面板外关闭；点面板内链接后关闭 */
  document.addEventListener('click', function (e) {
    if (!isMenuOpen()) { return; }
    if (toggle && toggle.contains(e.target)) { return; }   /* 交给上面的 toggle 处理 */
    if (header.contains(e.target)) {
      if (e.target.closest && e.target.closest('.nav-links a')) { setMenu(false); }
      return;
    }
    setMenu(false);
  });

  /* Esc 关闭，焦点还给汉堡按钮 */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isMenuOpen()) {
      setMenu(false);
      if (toggle) { toggle.focus(); }
    }
  });

  /* 窗口跨回桌面断点（面板被 CSS 隐藏）时自动关闭 */
  if (menuMq) {
    var onMqChange = function () { if (!menuMq.matches) { setMenu(false); } };
    if (menuMq.addEventListener) { menuMq.addEventListener('change', onMqChange); }
    else if (menuMq.addListener) { menuMq.addListener(onMqChange); }   /* 旧版 Safari */
  }

  /* 首屏即已滚动（刷新保留滚动位置 / 锚点跳转）时立即同步一次状态 */
  update();
})();
