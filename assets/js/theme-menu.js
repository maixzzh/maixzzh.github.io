/* 导航「主题」两级下拉菜单（仅桌面端显示，≤768px 由 CSS 隐藏）
   触发器点击开/关；点击外部、按 Esc、选择选项后关闭；
   窗口跨 768px 断点（缩到移动端）时自动关闭；同步 aria-expanded；
   无依赖、defer 加载 */
(function () {
  'use strict';

  var menu = document.getElementById('theme-menu');
  if (!menu) { return; }   /* 菜单不存在则不做事 */

  var trigger = menu.querySelector('.theme-menu-trigger');

  function isOpen() {
    return menu.classList.contains('open');
  }

  function setOpen(open) {
    menu.classList.toggle('open', open);
    if (trigger) {
      trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
  }

  /* 触发器：切换开/关 */
  if (trigger) {
    trigger.addEventListener('click', function () {
      setOpen(!isOpen());
    });
  }

  /* 点击处理：面板内选项 → 关闭；菜单外任意位置 → 关闭；触发器 → 上面 toggle */
  document.addEventListener('click', function (e) {
    if (!isOpen()) { return; }
    if (menu.contains(e.target)) {
      if (e.target.closest && e.target.closest('button[data-style], button[data-theme]')) {
        setOpen(false);
      }
      return;
    }
    setOpen(false);
  });

  /* Esc 关闭，焦点还给触发器 */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isOpen()) {
      setOpen(false);
      if (trigger) { trigger.focus(); }
    }
  });

  /* 窗口缩到移动端断点（菜单被 CSS 隐藏）时自动关闭 */
  var mq = window.matchMedia ? window.matchMedia('(max-width: 768px)') : null;
  if (mq) {
    var onChange = function () {
      if (mq.matches) { setOpen(false); }
    };
    if (mq.addEventListener) { mq.addEventListener('change', onChange); }
    else if (mq.addListener) { mq.addListener(onChange); }   /* 旧版 Safari */
  }
})();
