/* 颜色主题切换：浅色 / 深色 / 自动（自动 = 跟随系统 prefers-color-scheme）
   写入 <html data-theme> 并持久化到 localStorage('glass-theme')；
   全文档委托：任意 button[data-theme]（导航菜单 / /theme/ 页控件）点击即生效，
   并同步文档中全部同类按钮的 .active / aria-pressed；
   'auto' 模式监听系统偏好变化实时跟随；
   无依赖、defer 加载；head 内联脚本已预置 data-theme 防 FOUC */
(function () {
  'use strict';

  var THEMES = ['light', 'dark', 'auto'];   /* 合法值白名单 */
  var root = document.documentElement;
  var mql = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  var current = 'auto';                     /* 当前用户选择（含 auto） */

  /* 把用户选择解析为最终主题：auto → 系统偏好 */
  function resolve(choice) {
    if (choice === 'auto') {
      return (mql && mql.matches) ? 'dark' : 'light';
    }
    return choice;
  }

  /* 应用主题：data-theme 写入解析值；全部按钮态按用户选择显示 */
  function apply(choice) {
    root.dataset.theme = resolve(choice);
    var buttons = document.querySelectorAll('button[data-theme]');
    for (var i = 0; i < buttons.length; i++) {
      var on = buttons[i].getAttribute('data-theme') === choice;
      if (on) { buttons[i].classList.add('active'); }
      else    { buttons[i].classList.remove('active'); }
      buttons[i].setAttribute('aria-pressed', on ? 'true' : 'false');
    }
  }

  /* 切换主题并持久化（仅此处写 localStorage，系统变化不写） */
  function setTheme(choice) {
    if (THEMES.indexOf(choice) === -1) { return; }   /* 非法值兜底，忽略 */
    current = choice;
    apply(choice);
    try { localStorage.setItem('glass-theme', choice); } catch (e) { /* 隐私模式忽略 */ }
  }

  /* 事件委托：document 级，点击任意主题按钮即切换 */
  document.addEventListener('click', function (e) {
    var btn = e.target && e.target.closest ? e.target.closest('button[data-theme]') : null;
    if (btn) { setTheme(btn.getAttribute('data-theme')); }
  });

  /* auto 模式：系统偏好变化时实时跟随 */
  if (mql) {
    var onChange = function () {
      if (current === 'auto') { apply('auto'); }
    };
    if (mql.addEventListener) { mql.addEventListener('change', onChange); }
    else if (mql.addListener) { mql.addListener(onChange); }   /* 旧版 Safari */
  }

  /* 初始化：localStorage 为用户选择的唯一来源；
     不可用时按 auto 处理（与内联脚本的解析一致，无闪烁） */
  var initial = 'auto';
  try {
    var stored = localStorage.getItem('glass-theme');
    if (THEMES.indexOf(stored) !== -1) { initial = stored; }
  } catch (e) { /* 隐私模式：按 auto */ }
  setTheme(initial);
})();
