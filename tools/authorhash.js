/* 算出作者口令的哈希，用来替换 assets/js/secret.js 里的 PHRASE_HASH。
 *
 *   node tools/authorhash.js '你的新口令'
 *
 * 为什么存哈希而不是明文：这个仓库是公开的，明文口令等于贴在门口。
 * 哈希不能阻止会读 JS 的人绕过校验（算法和盐都在前端），但至少口令本身
 * 不会被人从源码里一眼读走。
 *
 * 这个脚本和 secret.js 里的 sig() 必须保持一致——算法是 64 位 FNV-1a，
 * 用 4 个 16 位 limb 做纯 Number 运算（那里不能用 BigInt，项目是 ES5）。
 */
'use strict';

/* 与 assets/js/secret.js 里的 S1/S4/S3/S2 拼接顺序一致 */
var SALT = 'mX4K-Zt9q';

function sig(str) {
  var L = [0x2325, 0x8422, 0x9ce4, 0xcbf2];   /* offset basis 0xcbf29ce484222325 */
  var P = [0x01b3, 0x0000, 0x0100, 0x0000];   /* prime 0x100000001b3 */
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

var phrase = process.argv[2];
if (!phrase) {
  console.error('用法: node tools/authorhash.js \'你的新口令\'');
  process.exit(1);
}

console.log('口令          = ' + phrase);
console.log('PHRASE_HASH   = ' + sig(phrase + '|' + SALT));
console.log('');
console.log('把上面这个 16 位十六进制值填进 assets/js/secret.js 的 PHRASE_HASH，');
console.log('然后重新构建部署。改完旧口令立即失效（已解锁的设备需重新输入）。');
