/* ============================================================
   render.js — 把简历数据渲染成所选模板的 HTML
   - minimal / tech / magazine 共用单列布局（差异全在 CSS）
   - creative 使用左侧边栏布局
   ============================================================ */
(function (global) {
  'use strict';

  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const has = (s) => s && String(s).trim().length > 0;
  // 链接去掉协议头用于显示
  const stripProto = (u) => String(u || '').trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '');
  // 补全协议：没有 scheme 的链接自动加 https://，保证可点击
  const fullUrl = (u) => {
    u = String(u || '').trim();
    if (!u) return '';
    if (/^[a-z][a-z0-9+.\-]*:/i.test(u)) return u;   // 已带 http:// mailto: tel: 等
    return 'https://' + u;
  };
  const linesToList = (text) => {
    const items = String(text || '').split('\n').map(l => l.trim()).filter(Boolean);
    if (!items.length) return '';
    return '<ul class="r-bullets">' + items.map(l => `<li>${esc(l)}</li>`).join('') + '</ul>';
  };
  const tagsHtml = (text) => {
    const tags = String(text || '').split(/[,，]/).map(t => t.trim()).filter(Boolean);
    if (!tags.length) return '';
    return '<div class="r-tags">' + tags.map(t => `<span class="r-tag">${esc(t)}</span>`).join('') + '</div>';
  };

  function contactsHtml(b, social) {
    const parts = [];
    if (has(b.email)) parts.push(`<a href="mailto:${esc(b.email)}">✉ ${esc(b.email)}</a>`);
    if (has(b.phone)) parts.push(`<span>📞 ${esc(b.phone)}</span>`);
    if (has(b.location)) parts.push(`<span>📍 ${esc(b.location)}</span>`);
    if (has(b.website)) parts.push(`<a href="${esc(fullUrl(b.website))}" target="_blank">🔗 ${esc(stripProto(b.website))}</a>`);
    (social || []).forEach(s => {
      const label = has(s.label) ? esc(s.label) : '';
      if (has(s.url)) {
        parts.push(`<a href="${esc(fullUrl(s.url))}" target="_blank">${label ? label + '：' : ''}${esc(stripProto(s.url))}</a>`);
      } else if (label) {
        parts.push(`<span>${label}</span>`);   // 没有链接则只显示名称，不再是空链接
      }
    });
    return parts.length ? `<div class="r-contacts">${parts.join('')}</div>` : '';
  }

  function section(title, body) {
    if (!body) return '';
    return `<section class="r-section"><h2 class="r-sec-title">${esc(title)}</h2>${body}</section>`;
  }

  function secSummary(d) {
    return has(d.basics.summary) ? `<p class="r-desc">${esc(d.basics.summary)}</p>` : '';
  }

  function secExperience(d) {
    const arr = d.experience || [];
    if (!arr.length) return '';
    return arr.map(e => `
      <div class="r-item">
        <div class="r-item-head">
          <span class="r-role">${esc(e.role)} ${has(e.org) ? `<span class="r-org">· ${esc(e.org)}</span>` : ''}</span>
          <span class="r-date">${esc(e.date)}${has(e.location) ? ' · ' + esc(e.location) : ''}</span>
        </div>
        ${linesToList(e.bullets)}
      </div>`).join('');
  }

  function secEducation(d) {
    const arr = d.education || [];
    if (!arr.length) return '';
    return arr.map(e => `
      <div class="r-item">
        <div class="r-item-head">
          <span class="r-role">${esc(e.role)} ${has(e.org) ? `<span class="r-org">· ${esc(e.org)}</span>` : ''}</span>
          <span class="r-date">${esc(e.date)}</span>
        </div>
        ${has(e.desc) ? `<p class="r-desc">${esc(e.desc)}</p>` : ''}
      </div>`).join('');
  }

  function secProjects(d) {
    const arr = d.projects || [];
    if (!arr.length) return '';
    return arr.map(p => `
      <div class="r-item">
        <div class="r-item-head">
          <span class="r-role">${has(p.url) ? `<a href="${esc(fullUrl(p.url))}" target="_blank">${esc(p.name)}</a>` : esc(p.name)}</span>
        </div>
        ${has(p.desc) ? `<p class="r-desc">${esc(p.desc)}</p>` : ''}
        ${tagsHtml(p.tags)}
      </div>`).join('');
  }

  function secSkills(d) {
    const arr = d.skills || [];
    if (!arr.length) return '';
    return arr.map(s => `
      <div class="r-skill-group">
        ${has(s.label) ? `<span class="label">${esc(s.label)}</span>` : ''}
        ${tagsHtml(s.items)}
      </div>`).join('');
  }

  function secLanguages(d) {
    const arr = d.languages || [];
    if (!arr.length) return '';
    return arr.map(l => `<div class="r-lang"><span>${esc(l.name)}</span><span class="r-org">${esc(l.level)}</span></div>`).join('');
  }

  function secAwards(d) {
    const arr = d.awards || [];
    if (!arr.length) return '';
    return arr.map(a => `
      <div class="r-item">
        <div class="r-item-head">
          <span class="r-role">${esc(a.role)}</span>
          <span class="r-date">${esc(a.date)}</span>
        </div>
        ${has(a.desc) ? `<p class="r-desc">${esc(a.desc)}</p>` : ''}
      </div>`).join('');
  }

  /* ---------- 可排序的正文模块：key -> [标题, 渲染函数] ---------- */
  const SEC = {
    experience: ['工作经历', secExperience],
    projects:   ['项目经历', secProjects],
    education:  ['教育背景', secEducation],
    skills:     ['专业技能', secSkills],
    languages:  ['语言能力', secLanguages],
    awards:     ['荣誉奖项', secAwards],
  };
  // 按 settings.order 排列出 allowed 范围内的模块顺序（缺失的补到末尾）
  function orderedKeys(d, allowed) {
    const order = (d.settings && d.settings.order) || [];
    const seq = order.filter(k => allowed.indexOf(k) !== -1);
    allowed.forEach(k => { if (seq.indexOf(k) === -1) seq.push(k); });
    return seq;
  }
  function orderedSections(d, allowed) {
    return orderedKeys(d, allowed).map(k => {
      const e = SEC[k];
      return e ? section(e[0], e[1](d)) : '';
    }).join('');
  }

  /* ---------- 单列布局：minimal / tech / magazine 等 ---------- */
  function renderSingle(d) {
    const b = d.basics;
    return `
      <div class="r-body">
        <header class="r-top">
          <h1 class="r-name">${esc(b.name)}</h1>
          <div class="r-headline">${esc(b.headline)}</div>
          ${contactsHtml(b, d.social)}
        </header>
        ${section('个人简介', secSummary(d))}
        ${orderedSections(d, ['experience', 'projects', 'education', 'skills', 'languages', 'awards'])}
      </div>`;
  }

  /* ---------- 边栏布局：creative / sidebar ---------- */
  function renderSidebar(d) {
    const b = d.basics;
    const avatar = has(b.avatar) ? `<img class="r-avatar" src="${esc(b.avatar)}" alt="头像" />` : '';
    return `
      <aside class="r-aside">
        ${avatar}
        <h1 class="r-name">${esc(b.name)}</h1>
        <div class="r-headline">${esc(b.headline)}</div>
        ${section('联系方式', contactsHtml(b, d.social))}
        ${orderedSections(d, ['skills', 'languages'])}
      </aside>
      <main class="r-main">
        ${section('个人简介', secSummary(d))}
        ${orderedSections(d, ['experience', 'projects', 'education', 'awards'])}
      </main>`;
  }

  const Render = {
    render(root, data) {
      const tpl = data.settings.template;
      root.dataset.template = tpl;
      root.dataset.skin = data.settings.skin;
      // 这些模板使用「左侧边栏」布局，其余用单列布局
      const SIDEBAR = ['creative', 'sidebar'];
      root.innerHTML = SIDEBAR.includes(tpl) ? renderSidebar(data) : renderSingle(data);
    }
  };

  global.Render = Render;
})(window);
