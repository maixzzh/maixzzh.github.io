/* 悬浮胶囊导航：滚动收缩 + hover/上划/轻触展开 + 移动端汉堡面板
   ---------------------------------------------------------------
   展开触发（任一）：
     1. 滚动到顶部附近（≤ 40px）
     2. 上划 —— 向上滚动累计超过 8px
     3. 鼠标悬停在胶囊上（仅限支持 hover 的设备）
     4. 轻触收缩态胶囊（仅 ≤768px；移动端灵动岛，收缩态只显示头像）
   收缩触发：
     向下滚动累计超过 8px，且已滚过 50px，且不处于 hover / 轻触展开状态
   滚动收缩在 solid 风格下无视觉作用（相关 CSS 仅在 liquid/frost 生效），
   故 JS 不判断风格，只负责切类名；无依赖、defer 加载 */
(function () {
  'use strict';

  var header = document.getElementById('site-header');
  if (!header) { return; }

  var toggle  = document.getElementById('nav-toggle');
  var menuMq  = window.matchMedia ? window.matchMedia('(max-width: 768px)') : null;
  var hoverMq = window.matchMedia ? window.matchMedia('(hover: hover)') : null;

  /* ---------- 1. 状态 ---------- */
  var SHRINK_AT    = 50;   /* 下滑超过 50px 才可能收缩 */
  var EXPAND_AT    = 40;   /* 回到 40px 以内一律展开（与上者构成迟滞区间） */
  var REVEAL_DELTA = 8;    /* 上划累计超过 8px 才认定「在往上翻」 */
  var HIDE_DELTA   = 8;    /* 下划累计超过 8px 才认定「在往下翻」 */

  var shrinkByScroll = false;   /* 由滚动决定的目标态（不含 hover 覆盖） */
  var hovering       = false;
  var tappedOpen     = false;   /* 移动端轻触收缩态胶囊后的「临时展开」（仅 ≤768px 生效） */
  var lastY          = 0;
  var upAccum        = 0;       /* 向上滚动的累计位移 */
  var downAccum      = 0;       /* 向下滚动的累计位移 */
  var ticking        = false;

  function scrollY() {
    return window.pageYOffset || document.documentElement.scrollTop || 0;
  }

  /* 综合当前滚动位置与方向，算出「该不该收缩」 */
  function computeShrink() {
    if (lastY <= EXPAND_AT) { return false; }                 /* 一、顶部附近 → 展开 */
    if (upAccum >= REVEAL_DELTA) { return false; }            /* 二、上划 → 展开 */
    if (lastY > SHRINK_AT && downAccum >= HIDE_DELTA) { return true; }  /* 三、下划越过阈值 → 收缩 */
    /* 四、其余情况（40~50 迟滞区间内、或抖动不足 8px）维持现状，
       否则 y 停在 50px 附近时会来回抽搐 */
    return shrinkByScroll;
  }

  function apply() {
    shrinkByScroll = computeShrink();
    /* 回顶 / 上划展开之后，临时展开已无意义，顺手清掉；
       否则它会一直挂着，之后再下划胶囊就永远不再收缩 */
    if (tappedOpen && !shrinkByScroll) { tappedOpen = false; }
    /* hover 与轻触语义相同：内容展开、顶边钉在收缩位（见 CSS 里 .is-hovered 的说明）。
       两者各用一个布尔量、只共享类名：混合设备上 (hover:hover) 成立，轻触会合成
       mouseenter/mouseleave，共用一个变量会互相把对方抹掉 */
    var expanded = hovering || tappedOpen;
    header.classList.toggle('is-shrunk', shrinkByScroll && !expanded);
    header.classList.toggle('is-hovered', shrinkByScroll && expanded);
    /* 收缩时若移动端面板开着，一并收起，避免「瘪胶囊 + 展开面板」的怪状态 */
    if (shrinkByScroll && !expanded && header.classList.contains('nav-open')) {
      setMenu(false);
    }
  }

  /* ---------- 2. 滚动：位置 + 方向 ---------- */
  function onScroll() {
    var y = scrollY();
    var delta = y - lastY;
    lastY = y;
    /* 方向判定带死区：惯性滚动时一两像素的抖动不该让胶囊来回切换，
       所以按方向累计位移，换方向时清零对方的累计值 */
    if (delta > 0) {
      downAccum += delta;
      upAccum = 0;
    } else if (delta < 0) {
      upAccum -= delta;
      downAccum = 0;
    }
    /* 轻触展开是「临时」的：再次下划累计到阈值就收回，
       与 computeShrink() 第三条用同一把尺子（HIDE_DELTA） */
    if (tappedOpen && downAccum >= HIDE_DELTA) { tappedOpen = false; }
    apply();
  }

  /* rAF 节流：scroll 高频触发，但每帧最多算一次；passive 保证不阻塞滚动 */
  window.addEventListener('scroll', function () {
    if (ticking) { return; }
    ticking = true;
    window.requestAnimationFrame(function () {
      ticking = false;
      onScroll();
    });
  }, { passive: true });

  /* ---------- 3. 鼠标悬停展开（仅支持 hover 的设备）----------
     用 (hover: hover) 判断：触摸屏上浏览器会在轻触时合成 mouseenter，
     不拦的话手机点一下胶囊就会误展开 */
  if (!hoverMq || hoverMq.matches) {
    header.addEventListener('mouseenter', function () { hovering = true;  apply(); });
    header.addEventListener('mouseleave', function () { hovering = false; apply(); });
  }

  /* ---------- 4. 移动端灵动岛：轻触收缩态胶囊即展开 ----------
     收缩态下胶囊里剩下的可点内容只有 <a class="brand" href="/">，不拦就会跳首页。
     只在移动端断点拦截：桌面端收缩态的品牌是普通链接，点它本就该回首页 */
  header.addEventListener('click', function (e) {
    if (!menuMq || !menuMq.matches) { return; }               /* 仅移动端 */
    if (!header.classList.contains('is-shrunk')) { return; }  /* 仅收缩态 */
    /* 搜索展开时 CSS 把胶囊钉在全宽（不走灵动岛），此时轻触不该被吞掉 */
    if (header.classList.contains('is-searching')) { return; }
    /* 落在真实控件上的点击不拦：收缩态下它们 visibility:hidden 收不到点击，
       这里只是形变过程中的兜底 */
    if (e.target && e.target.closest && e.target.closest('button')) { return; }
    e.preventDefault();
    tappedOpen = true;
    upAccum = 0;      /* 清掉方向累计：刚置位的临时展开不该被上一次的滚动余量立刻收回 */
    downAccum = 0;
    apply();
  });

  /* ---------- 5. 移动端汉堡面板 ---------- */
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
    var onMqChange = function () {
      if (!menuMq.matches) { setMenu(false); }
      /* 跨断点清掉临时展开态：桌面端没有灵动岛，留着它收缩态就永远展不开 */
      if (tappedOpen) { tappedOpen = false; }
      apply();
    };
    if (menuMq.addEventListener) { menuMq.addEventListener('change', onMqChange); }
    else if (menuMq.addListener) { menuMq.addListener(onMqChange); }   /* 旧版 Safari */
  }

  /* ---------- 6. 初始化 ----------
     首屏可能已是滚动状态（刷新保留滚动位置 / 锚点跳转），此时没有方向信息，
     按「已下划」处理，直接落到正确的收缩态，而不是先展开再收缩 */
  lastY = scrollY();
  downAccum = lastY > SHRINK_AT ? HIDE_DELTA : 0;
  apply();
})();
