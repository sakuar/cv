/* ============================================================
   auth.js — 纯前端账号系统（localStorage）
   说明：这是“软门槛”，用于防止陌生人随手浏览，并非服务器级安全。
   密码以 SHA-256 + 随机盐 存储，不保存明文。
   ============================================================ */
(function (global) {
  'use strict';

  const USERS_KEY = 'rs_users';        // { username: {salt, hash} }
  const SESSION_KEY = 'rs_session';    // 当前登录用户名

  function loadUsers() {
    try { return JSON.parse(localStorage.getItem(USERS_KEY)) || {}; }
    catch { return {}; }
  }
  function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  // 生成随机盐（hex）
  function randomSalt() {
    const a = new Uint8Array(16);
    crypto.getRandomValues(a);
    return Array.from(a, b => b.toString(16).padStart(2, '0')).join('');
  }

  // SHA-256(salt + password) -> hex
  // 优先用 Web Crypto；个别 file:// 环境拿不到 crypto.subtle 时降级为简单哈希
  // （本就是软门槛，降级仅影响本地双击场景，部署到 https 的 Pages 始终走 SHA-256）
  async function hashPassword(password, salt) {
    const input = salt + ':' + password;
    if (global.crypto && crypto.subtle && crypto.subtle.digest) {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
      return Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, '0')).join('');
    }
    return 'fb_' + fallbackHash(input);
  }

  // 降级哈希（FNV-1a 变体），仅在 crypto.subtle 不可用时使用
  function fallbackHash(str) {
    let h1 = 0x811c9dc5, h2 = 0x1505;
    for (let i = 0; i < str.length; i++) {
      const c = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
      h2 = ((h2 << 5) + h2 + c) >>> 0;
    }
    return (h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0');
  }

  const Auth = {
    /** 当前登录的用户名，未登录返回 null */
    currentUser() {
      return sessionStorageOrLocal();
    },

    async register(username, password) {
      username = (username || '').trim();
      if (username.length < 2) throw new Error('用户名至少 2 个字符');
      if (password.length < 4) throw new Error('密码至少 4 位');
      const users = loadUsers();
      if (users[username]) throw new Error('该用户名已存在，请直接登录');
      const salt = randomSalt();
      const hash = await hashPassword(password, salt);
      users[username] = { salt, hash };
      saveUsers(users);
      localStorage.setItem(SESSION_KEY, username);
      return username;
    },

    async login(username, password) {
      username = (username || '').trim();
      const users = loadUsers();
      const rec = users[username];
      if (!rec) throw new Error('用户名不存在，请先注册');
      const hash = await hashPassword(password, rec.salt);
      if (hash !== rec.hash) throw new Error('密码错误');
      localStorage.setItem(SESSION_KEY, username);
      return username;
    },

    logout() {
      localStorage.removeItem(SESSION_KEY);
    },
  };

  function sessionStorageOrLocal() {
    return localStorage.getItem(SESSION_KEY) || null;
  }

  global.Auth = Auth;
})(window);
