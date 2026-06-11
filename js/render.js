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
    if (has(b.website)) parts.push(`<a href="${esc(b.website)}" target="_blank">🔗 ${esc(b.website)}</a>`);
    (social || []).forEach(s => {
      if (has(s.url) || has(s.label)) {
        parts.push(`<a href="${esc(s.url)}" target="_blank">${esc(s.label || s.url)}</a>`);
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
          <span class="r-role">${has(p.url) ? `<a href="${esc(p.url)}" target="_blank">${esc(p.name)}</a>` : esc(p.name)}</span>
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

  /* ---------- 单列布局：minimal / tech / magazine ---------- */
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
        ${section('工作经历', secExperience(d))}
        ${section('项目经历', secProjects(d))}
        ${section('教育背景', secEducation(d))}
        ${section('专业技能', secSkills(d))}
        ${section('语言能力', secLanguages(d))}
        ${section('荣誉奖项', secAwards(d))}
      </div>`;
  }

  /* ---------- 边栏布局：creative ---------- */
  function renderSidebar(d) {
    const b = d.basics;
    const avatar = has(b.avatar) ? `<img class="r-avatar" src="${esc(b.avatar)}" alt="头像" />` : '';
    return `
      <aside class="r-aside">
        ${avatar}
        <h1 class="r-name">${esc(b.name)}</h1>
        <div class="r-headline">${esc(b.headline)}</div>
        ${section('联系方式', contactsHtml(b, d.social))}
        ${section('专业技能', secSkills(d))}
        ${section('语言能力', secLanguages(d))}
      </aside>
      <main class="r-main">
        ${section('个人简介', secSummary(d))}
        ${section('工作经历', secExperience(d))}
        ${section('项目经历', secProjects(d))}
        ${section('教育背景', secEducation(d))}
        ${section('荣誉奖项', secAwards(d))}
      </main>`;
  }

  const Render = {
    render(root, data) {
      root.dataset.template = data.settings.template;
      root.dataset.skin = data.settings.skin;
      root.innerHTML = (data.settings.template === 'creative')
        ? renderSidebar(data)
        : renderSingle(data);
    }
  };

  global.Render = Render;
})(window);
