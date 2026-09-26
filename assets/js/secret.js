/* 私密文章（secret: 2）：访问门禁 + 限时分享链接
   ---------------------------------------------------------------
   门禁：页面由 _layouts/default.html 在 <html> 上写 data-secret="2"，
   secret.css 据此先把正文藏起来（防「先闪正文再跳 404」）。本脚本校验
   token 通过后加 .secret-ok 放开；失败则 location.replace 到一个随机的
   不存在路径，落到站点真实的 404.html（带真 404 状态码，地址栏也看不到
   原文章 URL，且不留历史记录）。

   分享：文章页的「分享」按钮 → 选有效期 → 生成 <文章URL>#token=xxx。
   读取时用 history.replaceState 把 hash 清掉，token 转存 sessionStorage，
   刷新仍可用、关掉标签页即失效。

   作者自举：分享按钮长在文章页里，而文章页本身要令牌才打得开——作者发布后
   拿不到第一条令牌。所以另有一条出路：在二级文章地址后加 ?author=1 会显示
   口令输入框，口令正确就签发一枚 10 年有效的**通配**令牌存进 localStorage，
   之后本设备打开任何二级文章（含搜索结果里的链接）都直接放行。
   不带 ?author=1 时行为不变：无有效令牌一律跳真 404。

   token 结构（整体过自定义 Base64）：
     encodeURIComponent(<日期>/<slug>) | <开始毫秒> | <结束毫秒> | <64位签名>
   时间戳用毫秒：Date.now() 的 Number 精确到 2^53（约 28 万年），根本不存在
   2038 问题（那是 32 位「秒」的问题），所以 64 位是为了签名宽度，不是为了绕 2038。
   encodeURIComponent 是必需的：page.slug 直接取自文件名且不做 slugify，
   中文文件名会产生 >255 的字符码，直接取位会越出 0~63 的字母表下标。

   算法已在 Node 下与 BigInt 参考实现交叉验证：4-limb FNV-1a 逐位一致，命中
   ""→cbf29ce484222325 / "a"→af63dc4c8601ec8c / "foobar"→85944171f73967e8
   三个标准向量；token 往返覆盖正常、过期、未开始、起止边界、换文章、篡改、
   乱码、空串、中文 slug、2100 年时间戳。

   注意：这一切都只是抬高门槛，不是访问控制。正文仍在页面 HTML 里，算法是
   明文的，仓库也是公开的。无依赖、defer 加载 */
(function () {
  'use strict';

  /* ---------- 0. 常量 ---------- */
  /* 自定义 Base64 字母表：标准 64 字符的一个固定置换（URL 安全，含 - 和 _）。
     用置换而非标准表，是为了让 atob 直接解不出来——仅是混淆 */
  var TAB = 'y1w8u9jaRcV3OkCPFmKsx4pY250B_lDbNvzhJgtMnoiWIAQSdqL6TGrXZ-7EHUfe';
  var TABI = (function () {
    var m = {}, i;
    for (i = 0; i < 64; i++) { m[TAB.charAt(i)] = i; }
    return m;
  })();

  /* 签名盐：拆成几段运行时拼接，避免在源码里留下一个可直接 grep 的常量 */
  var S1 = 'mX', S2 = '9q', S3 = '-Zt', S4 = '4K';
  function salt() { return S1 + S4 + S3 + S2; }

  /* 允许的有效期（毫秒），必须与 _includes/secret-share.html 的 data-ms 一一对应 */
  var DUR = [3600000, 7200000, 86400000, 259200000, 604800000, 1296000000];

  /* ---------- 0b. 作者口令 ----------
     没有它就没法自举：分享按钮长在文章页里，而文章页本身要 token 才打得开，
     作者发布后永远拿不到第一条 token。见 README「私密文章怎么用」。

     PHRASE_HASH 是口令的 FNV-1a64（加盐防彩虹表），不是明文——仓库是公开的，
     口令不能直接躺在源码里。换口令：改下面这个常量，值用仓库根目录的
     tools/authorhash.js 算（`node tools/authorhash.js 你的新口令`）。
     默认口令见 README，**请务必改掉**。

     说清楚：这仍然是"防君子"。算法和盐都在这个文件里，会读 JS 的人可以
     直接伪造作者令牌。它的作用是让口令不能从源码里直接读出来。 */
  var PHRASE_HASH = '4e142287059007c1';
  var AUTHOR_ID   = '*';              /* 通配 id：一枚作者令牌通吃所有二级文章 */
  var AUTHOR_DUR  = 315360000000;     /* 10 年 */
  var AUTHOR_KEY  = 'secret-author';  /* localStorage：跨设备会话长期记住 */

  var STORE = 'secret-token:';

  /* ---------- 1. 64 位 FNV-1a（纯 ES5） ----------
     项目是严格 ES5，BigInt 是 ES2020 且 `123n` 字面量会让老浏览器直接语法报错，
     所以用 4 个 16 位 limb 做 Number 运算：单项乘积最大 65535² ≈ 2³²，三项相加
     仍 < 2³⁴，远在 2⁵³ 内，不会丢精度 */
  function sig(str) {
    var L = [0x2325, 0x8422, 0x9ce4, 0xcbf2];   /* offset basis 0xcbf29ce484222325（LSB 在前） */
    var P = [0x01b3, 0x0000, 0x0100, 0x0000];   /* prime 0x100000001b3（LSB 在前） */
    var i, k, r0, r1, r2, r3, c, h, s;
    for (i = 0; i < str.length; i++) {
      L[0] ^= (str.charCodeAt(i) & 0xff);
      r0 = L[0] * P[0];
      r1 = L[0] * P[1] + L[1] * P[0];
      r2 = L[0] * P[2] + L[1] * P[1] + L[2] * P[0];
      r3 = L[0] * P[3] + L[1] * P[2] + L[2] * P[1] + L[3] * P[0];
      L[0] = r0 & 0xffff; c = Math.floor(r0 / 0x10000);
      r1 += c; L[1] = r1 & 0xffff; c = Math.floor(r1 / 0x10000);
      r2 += c; L[2] = r2 & 0xffff; c = Math.floor(r2 / 0x10000);
      r3 += c; L[3] = r3 & 0xffff;
    }
    h = '';
    for (k = 3; k >= 0; k--) {
      s = L[k].toString(16);
      while (s.length < 4) { s = '0' + s; }
      h += s;
    }
    return h;
  }

  /* ---------- 2. 自定义 Base64（手写，不用 btoa/atob） ---------- */
  function pack(str) {
    var out = '', i, c1, c2, c3, e2, e3;
    for (i = 0; i < str.length; i += 3) {
      c1 = str.charCodeAt(i);
      e2 = i + 1 < str.length; c2 = e2 ? str.charCodeAt(i + 1) : 0;
      e3 = i + 2 < str.length; c3 = e3 ? str.charCodeAt(i + 2) : 0;
      out += TAB.charAt(c1 >> 2);
      out += TAB.charAt(((c1 & 3) << 4) | (c2 >> 4));
      out += e2 ? TAB.charAt(((c2 & 15) << 2) | (c3 >> 6)) : '=';
      out += e3 ? TAB.charAt(c3 & 63) : '=';
    }
    return out;
  }

  function unpack(str) {
    var out = '', i, c1, c2, c3, c4;
    if (str.length % 4 !== 0) { return null; }
    for (i = 0; i < str.length; i += 4) {
      c1 = TABI[str.charAt(i)];
      c2 = TABI[str.charAt(i + 1)];
      c3 = TABI[str.charAt(i + 2)];
      c4 = TABI[str.charAt(i + 3)];
      if (c1 === undefined || c2 === undefined) { return null; }
      out += String.fromCharCode((c1 << 2) | (c2 >> 4));
      if (c3 !== undefined) { out += String.fromCharCode(((c2 & 15) << 4) | (c3 >> 2)); }
      if (c4 !== undefined) { out += String.fromCharCode(((c3 & 3) << 6) | c4); }
    }
    return out;
  }

  /* ---------- 3. token 生成与校验 ---------- */
  function makeToken(id, start, end) {
    var p = encodeURIComponent(id) + '|' + start + '|' + end;
    return pack(p + '|' + sig(p + '|' + salt()));
  }

  /* 任一步不通过即判无效。顺序：可解码 → 4 段 → 签名 → 文章标识 → 数字 →
     区间合法且时长在白名单内 → 当前时间落在 [start, end] 闭区间。

     两类令牌共用这条校验：普通分享令牌的 id 是「日期/slug」，只对签发时那一篇
     有效；作者令牌的 id 是通配符 *，能开任何二级文章。时长白名单按类型分开，
     免得一枚 10 年的作者令牌在别处被当成分享链接接受 */
  function readToken(tok, id, now) {
    var raw = unpack(tok), p, s, e, isAuthor;
    if (raw === null) { return false; }
    p = raw.split('|');
    if (p.length !== 4) { return false; }
    if (sig(p[0] + '|' + p[1] + '|' + p[2] + '|' + salt()) !== p[3]) { return false; }
    isAuthor = (p[0] === AUTHOR_ID);
    if (!isAuthor && p[0] !== encodeURIComponent(id)) { return false; }
    if (!/^\d+$/.test(p[1]) || !/^\d+$/.test(p[2])) { return false; }
    s = Number(p[1]); e = Number(p[2]);
    if (!isFinite(s) || !isFinite(e) || e <= s) { return false; }
    if (isAuthor) {
      if (e - s !== AUTHOR_DUR) { return false; }
    } else if (DUR.indexOf(e - s) < 0) {
      return false;
    }
    return now >= s && now <= e;
  }

  /* ---------- 4. 访问门禁 ---------- */
  var page = window.SECRET_PAGE;
  var root = document.documentElement;

  function hashToken() {
    var h = window.location.hash || '';
    var m = /^#token=([^&]+)/.exec(h);
    if (!m) { m = /[#&]token=([^&]+)/.exec(h); }
    return m ? decodeURIComponent(m[1]) : null;
  }

  function store(tok) {
    try { sessionStorage.setItem(STORE + page.id, tok); } catch (e) { /* 隐私模式忽略 */ }
  }

  function restore() {
    try { return sessionStorage.getItem(STORE + page.id); } catch (e) { return null; }
  }

  /* 作者令牌存 localStorage（要跨标签页、跨重启长期记住），
     外加一份内存副本：localStorage 不可用（隐私模式）时本次页面仍能解锁 */
  var authorMem = null;

  function authorStore(tok) {
    authorMem = tok;
    try { localStorage.setItem(AUTHOR_KEY, tok); } catch (e) { /* 隐私模式：仅本次有效 */ }
  }

  function authorRestore() {
    if (authorMem) { return authorMem; }
    try { return localStorage.getItem(AUTHOR_KEY); } catch (e) { return null; }
  }

  /* 解锁后把地址栏擦干净：#token 和 ?author 都不该留在历史记录里。
     replaceState 不触发导航也不刷新页面，用户察觉不到 */
  function cleanUrl() {
    var s = window.location.search, out = [], i, parts, k;
    if (s && s.length > 1) {
      parts = s.slice(1).split('&');
      for (i = 0; i < parts.length; i++) {
        if (!parts[i]) { continue; }
        k = parts[i].split('=')[0];
        if (k === 'author') { continue; }
        out.push(parts[i]);
      }
    }
    try {
      window.history.replaceState(null, '',
        window.location.pathname + (out.length ? '?' + out.join('&') : ''));
    } catch (e) {
      window.location.hash = '';              /* 老浏览器回退：至少把 token 抹掉 */
    }
  }

  /* 校验失败：跳到一个确实不存在的随机路径。
     GitHub Pages / jekyll serve 会用真实的 404.html 响应并带真 404 状态码，
     于是「假 404」在状态码、地址栏、页面外观上都与真 404 完全一致。
     location.replace 不写历史记录，后退键回不到这里 */
  function bail() {
    var hex = '', i;
    for (i = 0; i < 8; i++) {
      hex += '0123456789abcdef'.charAt(Math.floor(Math.random() * 16));
    }
    window.location.replace('/' + hex + '/');
  }

  /* 只有显式带 ?author=1 才出口令框。普通访客（含搜索引擎爬虫）看到的
     仍然是与打错网址无异的真 404，保持「任何一处对不上就跳 404」的规格 */
  function wantAuthor() {
    return /[?&]author=1(&|$)/.test(window.location.search);
  }

  var authTries = 0;

  function askAuthor() {
    var box   = document.getElementById('secret-auth');
    var input = document.getElementById('secret-auth-input');
    var btn   = document.getElementById('secret-auth-submit');
    var note  = document.getElementById('secret-auth-note');
    if (!box || !input || !btn) { bail(); return; }   /* 标记缺失：退回 404 */

    box.hidden = false;

    function submit() {
      var v = input.value || '';
      if (!v) { return; }
      if (sig(v + '|' + salt()) !== PHRASE_HASH) {
        authTries++;
        note.textContent = '口令不正确' + (authTries >= 3 ? '（连错 3 次了，确认下大小写）' : '');
        input.select();
        return;
      }
      var start = Date.now();
      authorStore(makeToken(AUTHOR_ID, start, start + AUTHOR_DUR));
      box.hidden = true;
      cleanUrl();
      root.classList.add('secret-ok');
    }

    btn.addEventListener('click', submit);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); submit(); }
    });
    input.focus();
  }

  function gate() {
    if (!page || !page.id) { return; }        /* 非 2 级文章：零开销直接返回 */
    var now = Date.now();
    var urlTok = hashToken();
    var sess, auth, tok = null;

    /* 依次尝试三枚令牌：URL 里带来的分享令牌 → 本标签页记住的分享令牌 →
       本设备记住的作者令牌（通配，能开任何二级文章） */
    if (urlTok && readToken(urlTok, page.id, now)) {
      tok = urlTok;
      store(tok);                             /* 转存，刷新仍可访问 */
    } else {
      sess = restore();
      auth = authorRestore();
      if (sess && readToken(sess, page.id, now)) { tok = sess; }
      else if (auth && readToken(auth, page.id, now)) { tok = auth; }
    }

    if (!tok) {
      if (wantAuthor()) { askAuthor(); } else { bail(); }
      return;
    }
    if (urlTok) { cleanUrl(); }               /* 令牌已转存，地址栏不必再留着 */
    root.classList.add('secret-ok');
  }

  /* ---------- 5. 分享弹窗 ---------- */
  function initShare() {
    var btn   = document.getElementById('post-share');
    var modal = document.getElementById('secret-modal');
    if (!btn || !modal) { return; }

    var linkEl  = document.getElementById('secret-modal-link');
    var resEl   = document.getElementById('secret-modal-result');
    var noteEl  = document.getElementById('secret-modal-note');
    var copyEl  = document.getElementById('secret-modal-copy');
    var closeEl = document.getElementById('secret-modal-close');
    var id      = modal.getAttribute('data-id') || (page && page.id);

    function isOpen() { return modal.classList.contains('is-open'); }

    function setOpen(open) {
      modal.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) {
        if (closeEl) { closeEl.focus(); }
      } else {
        resEl.hidden = true;
        linkEl.value = '';
        noteEl.textContent = '';
        btn.focus();
      }
    }

    /* 分享链接用当前页面的地址拼，而不是写死 permalink——
       这样本地预览、自定义域名、带 baseurl 的情况都能正确工作 */
    function origin() {
      return window.location.protocol + '//' + window.location.host;
    }

    function make(ms) {
      var start = Date.now();
      var tok = makeToken(id, start, start + ms);
      return origin() + window.location.pathname + '#token=' + encodeURIComponent(tok);
    }

    /* 复制：现代接口优先，回退到选中 + execCommand。
       项目无 polyfill，全部特性探测 */
    function copy() {
      var text = linkEl.value;
      function done(ok) {
        noteEl.textContent = ok ? '已复制到剪贴板' : '复制失败，请手动选中链接复制';
      }
      function fallback() {
        var ok = false;
        linkEl.removeAttribute('readonly');
        linkEl.select();
        try { linkEl.setSelectionRange(0, 99999); } catch (e) { /* 部分类型不支持 */ }
        try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
        linkEl.setAttribute('readonly', 'readonly');
        done(ok);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { done(true); }, fallback);
      } else {
        fallback();
      }
    }

    btn.addEventListener('click', function () {
      setOpen(!isOpen());
    });

    if (closeEl) {
      closeEl.addEventListener('click', function () { setOpen(false); });
    }

    if (copyEl) {
      copyEl.addEventListener('click', copy);
    }

    var durs = modal.querySelectorAll('.secret-modal-durations button');
    for (var i = 0; i < durs.length; i++) {
      (function (b) {
        b.addEventListener('click', function () {
          var cfg = b.getAttribute('data-ms');
          var ms = Number(cfg);
          if (!isFinite(ms) || DUR.indexOf(ms) < 0) { return; }
          linkEl.value = make(ms);
          resEl.hidden = false;
          noteEl.textContent = '链接有效期：' + b.textContent.trim();
          linkEl.focus();
          linkEl.select();
        });
      })(durs[i]);
    }

    /* 点弹窗外关闭 */
    modal.addEventListener('click', function (e) {
      if (e.target === modal) { setOpen(false); }
    });

    /* Esc 关闭，焦点还给分享按钮（与 theme-menu.js 的约定一致） */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen()) { setOpen(false); }
    });
  }

  /* ---------- 6. 初始化 ---------- */
  gate();
  initShare();
})();
