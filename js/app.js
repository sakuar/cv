/* ============================================================
   app.js — 应用主控：登录界面、编辑器生成、实时预览、导入导出
   ============================================================ */
(function () {
  'use strict';

  // ---------- 编辑器结构定义（数据驱动生成表单） ----------
  const SCHEMA = [
    { key: 'basics', title: '基本信息', type: 'object', fields: [
      { name: 'name', label: '姓名' },
      { name: 'headline', label: '职位头衔' },
      { name: 'avatar', label: '头像（创意模板显示）', type: 'avatar', full: true },
      { name: 'email', label: '邮箱' },
      { name: 'phone', label: '电话' },
      { name: 'location', label: '所在地' },
      { name: 'website', label: '个人网站' },
      { name: 'summary', label: '个人简介', type: 'textarea', full: true },
    ]},
    { key: 'experience', title: '工作经历', type: 'list', addLabel: '+ 添加工作经历', fields: [
      { name: 'role', label: '职位' }, { name: 'org', label: '公司' },
      { name: 'date', label: '时间（如 2022 — 至今）' }, { name: 'location', label: '地点' },
      { name: 'bullets', label: '工作内容（可逐条增减）', type: 'bullets', full: true },
    ]},
    { key: 'projects', title: '项目经历', type: 'list', addLabel: '+ 添加项目', fields: [
      { name: 'name', label: '项目名称' }, { name: 'url', label: '链接' },
      { name: 'desc', label: '描述', type: 'textarea', full: true },
      { name: 'tags', label: '技术标签（逗号分隔）', full: true },
    ]},
    { key: 'education', title: '教育背景', type: 'list', addLabel: '+ 添加教育经历', fields: [
      { name: 'role', label: '专业 / 学位' }, { name: 'org', label: '学校' },
      { name: 'date', label: '时间' },
      { name: 'desc', label: '补充说明', type: 'textarea', full: true },
    ]},
    { key: 'skills', title: '专业技能', type: 'list', addLabel: '+ 添加技能分类', fields: [
      { name: 'label', label: '分类名（如 前端）' },
      { name: 'items', label: '技能项（逗号分隔）', full: true },
    ]},
    { key: 'languages', title: '语言能力', type: 'list', addLabel: '+ 添加语言', fields: [
      { name: 'name', label: '语言' }, { name: 'level', label: '水平' },
    ]},
    { key: 'social', title: '社交链接', type: 'list', addLabel: '+ 添加链接', fields: [
      { name: 'label', label: '名称（如 GitHub）' },
      { name: 'url', label: '链接（如 github.com/you）' },
    ]},
    { key: 'awards', title: '荣誉奖项', type: 'list', addLabel: '+ 添加奖项', fields: [
      { name: 'role', label: '奖项名称' }, { name: 'date', label: '时间' },
      { name: 'desc', label: '说明', type: 'textarea', full: true },
    ]},
  ];

  const SKINS = [
    { id: 'indigo', color: '#6366f1' }, { id: 'emerald', color: '#10b981' },
    { id: 'rose', color: '#f43f5e' }, { id: 'amber', color: '#f59e0b' },
    { id: 'violet', color: '#8b5cf6' }, { id: 'cyan', color: '#06b6d4' },
    { id: 'slate', color: '#475569' },
  ];

  // 页头模块固定在顶部（社交链接并入基本信息卡片内）；其余为可拖动排序的正文模块
  const PINNED = ['basics'];
  const SORTABLE = ['experience', 'projects', 'education', 'skills', 'languages', 'awards'];
  const schemaByKey = {};
  SCHEMA.forEach(s => { schemaByKey[s.key] = s; });

  // ---------- DOM 引用 ----------
  const $ = (s) => document.querySelector(s);
  const authView = $('#auth-view'), appView = $('#app-view');
  const authForm = $('#auth-form'), authMsg = $('#auth-msg');
  const usernameEl = $('#auth-username'), passwordEl = $('#auth-password');
  const confirmField = $('#auth-confirm-field'), confirmEl = $('#auth-confirm');
  const authSubmit = $('#auth-submit');
  const editorEl = $('#editor'), resumeRoot = $('#resume-root');

  let mode = 'login';
  let currentUser = null;
  let data = null;

  // ============================================================
  //  登录 / 注册
  // ============================================================
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      mode = tab.dataset.mode;
      confirmField.hidden = mode !== 'register';
      authSubmit.textContent = mode === 'register' ? '注 册' : '登 录';
      hideMsg();
    });
  });

  function showMsg(text, ok) {
    authMsg.textContent = text;
    authMsg.classList.toggle('ok', !!ok);
    authMsg.hidden = false;
  }
  function hideMsg() { authMsg.hidden = true; }

  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideMsg();
    const u = usernameEl.value, p = passwordEl.value;
    try {
      if (mode === 'register') {
        if (p !== confirmEl.value) throw new Error('两次输入的密码不一致');
        await Auth.register(u, p);
      } else {
        await Auth.login(u, p);
      }
      enterApp(Auth.currentUser());
    } catch (err) {
      showMsg(err.message || '操作失败');
    }
  });

  // ============================================================
  //  进入 / 退出应用
  // ============================================================
  function enterApp(user) {
    currentUser = user;
    data = Store.load(user);
    authView.hidden = true;
    appView.hidden = false;
    $('#user-chip').textContent = '👤 ' + user;
    buildSkins();
    $('#template-select').value = data.settings.template;
    $('#font-range').value = data.settings.fontScale || 1;
    applyFontScale();
    applyZoom(parseFloat(localStorage.getItem('rs_zoom')) || 1);
    buildEditor();
    renderPreview();
  }

  // 字号调节：通过 --rs 缩放因子作用于整篇简历
  function applyFontScale() {
    const v = data.settings.fontScale || 1;
    resumeRoot.style.setProperty('--rs', v);
    $('#font-val').textContent = Math.round(v * 100) + '%';
    relayoutZoom();
  }
  $('#font-range').addEventListener('input', (e) => {
    data.settings.fontScale = parseFloat(e.target.value);
    applyFontScale();
    persist();
  });

  $('#btn-logout').addEventListener('click', () => {
    Auth.logout();
    currentUser = null; data = null;
    appView.hidden = true;
    authView.hidden = false;
    authForm.reset();
    confirmField.hidden = true;
    mode = 'login';
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.toggle('active', t.dataset.mode === 'login'));
    authSubmit.textContent = '登 录';
  });

  // ============================================================
  //  保存 + 预览
  // ============================================================
  function persist() { Store.save(currentUser, data); }
  function renderPreview() {
    Render.render(resumeRoot, data);
    applyCustomSkinTo(resumeRoot, data.settings);
    relayoutZoom();
  }

  // ---------- 自定义皮肤颜色 ----------
  function hexToRgb(h) {
    h = String(h || '').replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => Math.round(x).toString(16).padStart(2, '0')).join('');
  }
  function mixWhite(hex, t) {           // 与白色混合，t 越大越浅
    const a = hexToRgb(hex);
    return rgbToHex(a[0] + (255 - a[0]) * t, a[1] + (255 - a[1]) * t, a[2] + (255 - a[2]) * t);
  }
  function customVars(settings) {       // 返回自定义皮肤的 CSS 变量；非自定义返回 null
    if (settings.skin === 'custom' && settings.customColor) {
      const c = settings.customColor;
      return { '--accent': c, '--accent-2': mixWhite(c, 0.45), '--accent-wash': mixWhite(c, 0.88) };
    }
    return null;
  }
  function applyCustomSkinTo(el, settings) {
    const v = customVars(settings);
    ['--accent', '--accent-2', '--accent-wash'].forEach(k => {
      if (v) el.style.setProperty(k, v[k]);
      else el.style.removeProperty(k);   // 预设皮肤时清除内联，交回 CSS 控制
    });
  }

  // ============================================================
  //  模板 / 皮肤选择
  // ============================================================
  $('#template-select').addEventListener('change', (e) => {
    data.settings.template = e.target.value;
    persist(); renderPreview();
  });

  function buildSkins() {
    const wrap = $('#skin-swatches');
    wrap.innerHTML = '';
    SKINS.forEach(s => {
      const dot = document.createElement('span');
      dot.className = 'swatch' + (s.id === data.settings.skin ? ' active' : '');
      dot.style.background = s.color;
      dot.title = s.id;
      dot.addEventListener('click', () => {
        data.settings.skin = s.id;
        persist(); renderPreview();
        wrap.querySelectorAll('.swatch').forEach(x => x.classList.remove('active'));
        dot.classList.add('active');
      });
      wrap.appendChild(dot);
    });

    // 自定义取色板（任意颜色）
    const custom = document.createElement('label');
    custom.className = 'swatch swatch-custom' + (data.settings.skin === 'custom' ? ' active' : '');
    custom.title = '自定义颜色';
    const picker = document.createElement('input');
    picker.type = 'color';
    picker.value = data.settings.customColor || '#6d7cff';
    picker.addEventListener('input', () => {
      data.settings.skin = 'custom';
      data.settings.customColor = picker.value;
      persist(); renderPreview();
      wrap.querySelectorAll('.swatch').forEach(x => x.classList.remove('active'));
      custom.classList.add('active');
    });
    custom.appendChild(picker);
    wrap.appendChild(custom);
  }

  // ============================================================
  //  编辑器表单生成
  // ============================================================
  function buildEditor() {
    editorEl.innerHTML = '';
    // 顶部固定：基本信息 + 社交链接
    PINNED.forEach(k => editorEl.appendChild(buildSection(schemaByKey[k], false)));
    // 可排序正文模块（按 settings.order）
    const sortWrap = document.createElement('div');
    sortWrap.id = 'ed-sortable';
    const order = orderForEditor();
    order.forEach(k => sortWrap.appendChild(buildSection(schemaByKey[k], true)));
    editorEl.appendChild(sortWrap);
    setupSortable(sortWrap);
  }

  // 返回有效的排序数组：过滤非法 key、补齐缺失项
  function orderForEditor() {
    let order = (data.settings.order || []).filter(k => SORTABLE.indexOf(k) !== -1);
    SORTABLE.forEach(k => { if (order.indexOf(k) === -1) order.push(k); });
    data.settings.order = order;
    return order;
  }

  function buildSection(sec, sortable) {
    const box = document.createElement('div');
    box.className = 'ed-section';
    box.dataset.key = sec.key;

    const head = document.createElement('div');
    head.className = 'ed-head';
    const grip = sortable ? '<span class="drag-handle" title="拖动排序">⠿</span>' : '';
    head.innerHTML = `<span>${grip}${sec.title}</span><span class="chevron">▾</span>`;
    head.addEventListener('click', () => box.classList.toggle('collapsed'));
    box.appendChild(head);

    const body = document.createElement('div');
    body.className = 'ed-body';

    if (sec.type === 'object') {
      body.appendChild(buildFieldGrid(sec, sec.fields, null));
      if (sec.key === 'basics') body.appendChild(buildSocialBlock());  // 社交链接嵌入基本信息
    } else {
      const arr = data[sec.key] || (data[sec.key] = []);
      arr.forEach((item, idx) => body.appendChild(buildListItem(sec, idx)));
      const addBtn = document.createElement('button');
      addBtn.className = 'btn-add';
      addBtn.textContent = sec.addLabel || '+ 添加';
      addBtn.addEventListener('click', () => {
        const blank = {};
        sec.fields.forEach(f => blank[f.name] = '');
        data[sec.key].push(blank);
        persist(); buildEditor(); renderPreview();
      });
      body.appendChild(addBtn);
    }
    box.appendChild(body);
    return box;
  }

  // 社交链接子块（嵌在基本信息卡片内）
  function buildSocialBlock() {
    const sec = schemaByKey['social'];
    const block = document.createElement('div');
    block.className = 'ed-subblock';
    const title = document.createElement('div');
    title.className = 'ed-subtitle';
    title.textContent = '社交链接';
    block.appendChild(title);

    const arr = data.social || (data.social = []);
    arr.forEach((item, idx) => block.appendChild(buildListItem(sec, idx)));

    const addBtn = document.createElement('button');
    addBtn.className = 'btn-add';
    addBtn.textContent = sec.addLabel || '+ 添加链接';
    addBtn.addEventListener('click', () => {
      const blank = {};
      sec.fields.forEach(f => blank[f.name] = '');
      data.social.push(blank);
      persist(); buildEditor(); renderPreview();
    });
    block.appendChild(addBtn);
    return block;
  }

  function buildListItem(sec, idx) {
    const wrap = document.createElement('div');
    wrap.className = 'ed-item';

    // 顶部独立操作栏：左侧序号，右侧删除（不再覆盖输入框）
    const bar = document.createElement('div');
    bar.className = 'ed-item-bar';
    const no = document.createElement('span');
    no.className = 'ed-item-no';
    no.textContent = '#' + (idx + 1);
    const rm = document.createElement('button');
    rm.className = 'item-remove';
    rm.innerHTML = '✕';
    rm.title = '删除';
    rm.addEventListener('click', () => {
      data[sec.key].splice(idx, 1);
      persist(); buildEditor(); renderPreview();
    });
    bar.append(no, rm);
    wrap.appendChild(bar);

    wrap.appendChild(buildFieldGrid(sec, sec.fields, idx));
    return wrap;
  }

  function buildFieldGrid(sec, fields, idx) {
    const grid = document.createElement('div');
    grid.className = 'ed-grid';
    fields.forEach(f => grid.appendChild(buildField(sec, f, idx)));
    return grid;
  }

  function getVal(sec, field, idx) {
    return idx === null ? (data[sec.key][field] ?? '') : (data[sec.key][idx][field] ?? '');
  }
  function setVal(sec, field, idx, val) {
    if (idx === null) data[sec.key][field] = val;
    else data[sec.key][idx][field] = val;
  }

  // 文本域随内容自适应高度
  function autoGrow(ta) {
    ta.style.height = 'auto';
    ta.style.height = (ta.scrollHeight + 2) + 'px';
  }

  function buildField(sec, f, idx) {
    const label = document.createElement('label');
    label.className = 'field' + (f.full || f.type === 'textarea' || f.type === 'avatar' ? ' full' : '');
    const span = document.createElement('span');
    span.textContent = f.label;
    label.appendChild(span);

    if (f.type === 'avatar') {
      const row = document.createElement('div');
      row.className = 'avatar-row';
      const img = document.createElement('img');
      img.className = 'avatar-prev';
      img.src = getVal(sec, f.name, idx) || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="56" height="56"%3E%3C/svg%3E';
      const file = document.createElement('input');
      file.type = 'file'; file.accept = 'image/*';
      file.addEventListener('change', () => {
        const fl = file.files[0];
        if (!fl) return;
        const reader = new FileReader();
        reader.onload = () => {
          setVal(sec, f.name, idx, reader.result);
          img.src = reader.result;
          persist(); renderPreview();
        };
        reader.readAsDataURL(fl);
      });
      const clear = document.createElement('button');
      clear.className = 'btn btn-ghost btn-tiny'; clear.type = 'button'; clear.textContent = '清除';
      clear.addEventListener('click', () => {
        setVal(sec, f.name, idx, ''); img.src = ''; persist(); renderPreview();
      });
      row.append(img, file, clear);
      label.appendChild(row);
      return label;
    }

    // 可逐条增减的条目列表（工作内容）
    if (f.type === 'bullets') {
      let arr = getVal(sec, f.name, idx);
      if (!Array.isArray(arr)) {                       // 兼容旧的换行字符串
        arr = arr ? String(arr).split('\n').map(s => s.trim()).filter(Boolean) : [];
        setVal(sec, f.name, idx, arr);
      }
      const list = document.createElement('div');
      list.className = 'bullets-list';

      const renderRows = () => {
        list.innerHTML = '';
        arr.forEach((text, i) => {
          const rowEl = document.createElement('div');
          rowEl.className = 'bullet-row';
          const ta = document.createElement('textarea');
          ta.rows = 1; ta.value = text; ta.placeholder = '一条工作内容 / 成果';
          ta.addEventListener('input', () => { arr[i] = ta.value; autoGrow(ta); persist(); renderPreview(); });
          const del = document.createElement('button');
          del.type = 'button'; del.className = 'bullet-rm'; del.innerHTML = '✕'; del.title = '删除此条';
          del.addEventListener('click', () => { arr.splice(i, 1); persist(); renderRows(); renderPreview(); });
          rowEl.append(ta, del);
          list.appendChild(rowEl);
        });
        const add = document.createElement('button');
        add.type = 'button'; add.className = 'btn-add'; add.textContent = '+ 添加一条';
        add.addEventListener('click', () => {
          arr.push(''); persist(); renderRows(); renderPreview();
          const last = list.querySelector('.bullet-row:last-of-type textarea');
          if (last) last.focus();
        });
        list.appendChild(add);
        requestAnimationFrame(() => list.querySelectorAll('textarea').forEach(autoGrow));
      };
      renderRows();
      label.appendChild(list);
      return label;
    }

    const input = f.type === 'textarea' ? document.createElement('textarea') : document.createElement('input');
    if (f.type !== 'textarea') input.type = 'text';
    input.value = getVal(sec, f.name, idx);
    input.addEventListener('input', () => {
      setVal(sec, f.name, idx, input.value);
      persist(); renderPreview();
    });
    label.appendChild(input);
    return label;
  }

  // ============================================================
  //  拖动排序正文模块
  // ============================================================
  function setupSortable(container) {
    container.querySelectorAll('.ed-section').forEach(section => {
      const handle = section.querySelector('.drag-handle');
      if (!handle) return;
      handle.addEventListener('click', (e) => e.stopPropagation());           // 不触发折叠
      handle.addEventListener('mousedown', () => { section.draggable = true; });
      handle.addEventListener('mouseup', () => { section.draggable = false; });
      section.addEventListener('dragstart', (e) => {
        section.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', section.dataset.key);
      });
      section.addEventListener('dragend', () => {
        section.classList.remove('dragging');
        section.draggable = false;
        commitOrder(container);
      });
    });
    container.addEventListener('dragover', (e) => {
      e.preventDefault();
      const dragging = container.querySelector('.ed-section.dragging');
      if (!dragging) return;
      const after = dragAfter(container, e.clientY);
      if (after == null) container.appendChild(dragging);
      else container.insertBefore(dragging, after);
    });
  }

  function dragAfter(container, y) {
    const els = [].slice.call(container.querySelectorAll('.ed-section:not(.dragging)'));
    let closest = null, closestOffset = -Infinity;
    els.forEach(el => {
      const box = el.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closestOffset) { closestOffset = offset; closest = el; }
    });
    return closest;
  }

  function commitOrder(container) {
    const keys = [].slice.call(container.querySelectorAll('.ed-section')).map(s => s.dataset.key);
    data.settings.order = keys;
    persist();
    renderPreview();
  }

  // ============================================================
  //  导入 / 备份 / 打印
  // ============================================================
  $('#btn-export').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `简历_${currentUser}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  });

  $('#btn-import').addEventListener('click', () => $('#import-file').click());
  $('#import-file').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = JSON.parse(reader.result);
        data = Object.assign(Store.defaultData(), imported, {
          settings: Object.assign(Store.defaultData().settings, imported.settings || {}),
          basics: Object.assign(Store.defaultData().basics, imported.basics || {})
        });
        persist();
        $('#template-select').value = data.settings.template;
        $('#font-range').value = data.settings.fontScale || 1;
        buildSkins(); applyFontScale(); buildEditor(); renderPreview();
      } catch {
        alert('导入失败：文件格式不正确');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  $('#btn-print').addEventListener('click', () => window.print());

  // ============================================================
  //  重置为示例模板内容（保留模板/皮肤/字号）
  // ============================================================
  $('#btn-reset').addEventListener('click', () => {
    if (!confirm('确定重置为示例模板内容吗？\n\n当前所有简历内容会被清空并恢复成示例（被删除的模块也会回来）。\n你选的模板、皮肤、字号会保留。此操作不可撤销。')) return;
    const keep = {
      template: data.settings.template,
      skin: data.settings.skin,
      fontScale: data.settings.fontScale,
    };
    data = Store.defaultData();
    Object.assign(data.settings, keep);
    persist();
    buildSkins();
    $('#template-select').value = data.settings.template;
    buildEditor();
    renderPreview();
    toast('已重置为示例模板内容 ✓');
  });

  // ============================================================
  //  主题（日间 / 夜间）
  // ============================================================
  function applyTheme(t) {
    document.documentElement.dataset.theme = t;
    localStorage.setItem('rs_theme', t);
    const btn = $('#btn-theme');
    if (btn) btn.textContent = (t === 'light') ? '☀️' : '🌙';
  }
  $('#btn-theme').addEventListener('click', () => {
    applyTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light');
  });
  applyTheme(localStorage.getItem('rs_theme') || 'dark');

  // ============================================================
  //  预览缩放（视图放大/缩小，不改内容）
  // ============================================================
  let zoom = 1;
  // 把简历整体等比缩放，并预留出缩放后的尺寸，使滚动条/居中正确
  function relayoutZoom() {
    const sizer = document.getElementById('zoom-sizer');
    if (!sizer) return;
    const natW = resumeRoot.offsetWidth || 820;   // 自然宽（不受 transform 影响）
    const natH = resumeRoot.offsetHeight || 1050;  // 自然高
    sizer.style.transform = 'scale(' + zoom + ')';
    sizer.style.width = (natW * zoom) + 'px';
    sizer.style.height = (natH * zoom) + 'px';
  }
  function applyZoom(z) {
    zoom = Math.max(0.4, Math.min(2, Math.round(z * 100) / 100));
    $('#zoom-val').textContent = Math.round(zoom * 100) + '%';
    localStorage.setItem('rs_zoom', zoom);
    relayoutZoom();
  }
  $('#zoom-out').addEventListener('click', () => applyZoom(zoom - 0.1));
  $('#zoom-in').addEventListener('click', () => applyZoom(zoom + 0.1));
  $('#zoom-val').addEventListener('click', () => applyZoom(1));
  $('#zoom-fit').addEventListener('click', () => {
    const wrap = document.querySelector('.preview-wrap');
    const avail = wrap.clientWidth - 72;   // 减去左右内边距
    applyZoom(avail / 820);                 // 820 = 简历基准宽度
  });

  // ============================================================
  //  预览模式（隐藏编辑表单）
  // ============================================================
  $('#btn-focus').addEventListener('click', () => {
    const on = appView.classList.toggle('focus');
    $('#btn-focus').textContent = on ? '退出预览' : '预览模式';
  });

  // ============================================================
  //  Toast 轻提示
  // ============================================================
  let toastTimer = null;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg; el.hidden = false;
    requestAnimationFrame(() => el.classList.add('show'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => { el.hidden = true; }, 250);
    }, 2800);
  }

  // ============================================================
  //  分享链接：把数据压缩编码进 URL 的 #cv=...
  // ============================================================
  function bytesToB64url(bytes) {
    let bin = ''; const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function b64urlToBytes(s) {
    s = s.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    const bin = atob(s); const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }
  async function deflate(str) {
    const cs = new CompressionStream('deflate');
    const w = cs.writable.getWriter(); w.write(new TextEncoder().encode(str)); w.close();
    return new Uint8Array(await new Response(cs.readable).arrayBuffer());
  }
  async function inflate(bytes) {
    const ds = new DecompressionStream('deflate');
    const w = ds.writable.getWriter(); w.write(bytes); w.close();
    return new TextDecoder().decode(await new Response(ds.readable).arrayBuffer());
  }
  async function encodeShare(obj) {
    const json = JSON.stringify(obj);
    if (window.CompressionStream) return 'z' + bytesToB64url(await deflate(json));
    return 'r' + bytesToB64url(new TextEncoder().encode(json));
  }
  async function decodeShare(token) {
    const flag = token[0], bytes = b64urlToBytes(token.slice(1));
    if (flag === 'z' && window.DecompressionStream) return await inflate(bytes);
    return new TextDecoder().decode(bytes);
  }
  async function buildShareLink() {
    const base = location.origin + location.pathname;
    let url = base + '#cv=' + await encodeShare(data);
    let dropped = false;
    if (url.length > 12000 && data.basics.avatar) {     // 头像太大 → 省略以保证链接可用
      const clone = JSON.parse(JSON.stringify(data));
      clone.basics.avatar = '';
      url = base + '#cv=' + await encodeShare(clone);
      dropped = true;
    }
    return { url, dropped };
  }
  $('#btn-share').addEventListener('click', async () => {
    try {
      const { url, dropped } = await buildShareLink();
      let copied = false;
      try { await navigator.clipboard.writeText(url); copied = true; } catch (e) {}
      if (!copied) window.prompt('复制下面的分享链接发给别人：', url);
      toast(copied
        ? (dropped ? '链接已复制（头像过大已省略，需含头像请用「导出网页」）' : '分享链接已复制 ✓')
        : '请手动复制链接');
    } catch (e) {
      toast('生成链接失败：' + (e.message || e));
    }
  });

  // ============================================================
  //  导出独立网页（自包含 HTML，含头像，可直接发给别人）
  // ============================================================
  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  $('#btn-export-html').addEventListener('click', async () => {
    let css = '';
    try { css = await (await fetch('css/templates.css')).text(); }
    catch (e) { toast('无法读取模板样式（本地直接打开时请改用部署后的网址）'); return; }
    const name = (data.basics.name || '简历').trim();
    const tpl = resumeRoot.dataset.template, skin = resumeRoot.dataset.skin;
    const rs = resumeRoot.style.getPropertyValue('--rs') || 1;
    let styleStr = '--rs:' + rs + ';';
    const cv = customVars(data.settings);
    if (cv) Object.keys(cv).forEach(k => { styleStr += k + ':' + cv[k] + ';'; });
    const html =
      '<!DOCTYPE html>\n<html lang="zh-CN"><head><meta charset="UTF-8">' +
      '<meta name="viewport" content="width=device-width, initial-scale=1">' +
      '<title>' + escapeHtml(name) + ' · 简历</title><style>\n' +
      ':root{--r-sm:8px;--r-md:12px;--r-lg:16px;}\n' +
      'body{margin:0;background:#d7dbe6;display:flex;justify-content:center;padding:32px;' +
      'font-family:-apple-system,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;}\n' +
      '.resume{width:100%;max-width:820px;}\n' +
      '@media print{body{background:#fff;padding:0;}.resume{box-shadow:none!important;border-radius:0!important;}@page{margin:12mm;}}\n' +
      css + '\n</style></head><body>' +
      '<div class="resume" data-template="' + tpl + '" data-skin="' + skin + '" style="' + styleStr + '">' +
      resumeRoot.innerHTML + '</div></body></html>';
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    a.download = name + '_简历.html';
    a.click();
    URL.revokeObjectURL(a.href);
    toast('已导出独立网页，可直接发给别人或托管 ✓');
  });

  // ============================================================
  //  只读查看页（分享链接打开后）
  // ============================================================
  function showViewer(d) {
    authView.hidden = true; appView.hidden = true;
    $('#viewer-view').hidden = false;
    const vr = $('#viewer-resume');
    Render.render(vr, d);
    applyCustomSkinTo(vr, d.settings || {});
    vr.style.setProperty('--rs', (d.settings && d.settings.fontScale) || 1);
    $('#viewer-make').href = location.pathname;
    if (d.basics && d.basics.name) document.title = d.basics.name + ' · 简历';
  }
  $('#viewer-print').addEventListener('click', () => window.print());
  function tryViewer() {
    const h = location.hash || '';
    if (h.indexOf('#cv=') !== 0) return false;
    authView.hidden = true; appView.hidden = true;
    decodeShare(h.slice(4))
      .then(json => showViewer(JSON.parse(json)))
      .catch(() => { authView.hidden = false; });
    return true;
  }

  // ============================================================
  //  可拖动分隔条：调整编辑器 / 预览 宽度
  // ============================================================
  (function setupSplitter() {
    const splitter = $('#splitter');
    const workspace = document.querySelector('.workspace');
    const WKEY = 'rs_editor_w';
    const DEFAULT_W = 468, MIN_W = 300;

    // 恢复上次宽度
    const saved = parseInt(localStorage.getItem(WKEY), 10);
    if (saved) editorEl.style.setProperty('--editor-w', saved + 'px');

    let dragging = false;
    const maxW = () => Math.max(MIN_W, workspace.getBoundingClientRect().width - 380);

    function onMove(e) {
      if (!dragging) return;
      const rect = workspace.getBoundingClientRect();
      let w = Math.round(e.clientX - rect.left);
      w = Math.max(MIN_W, Math.min(maxW(), w));
      editorEl.style.setProperty('--editor-w', w + 'px');
    }
    function onUp() {
      if (!dragging) return;
      dragging = false;
      splitter.classList.remove('dragging');
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      const w = parseInt(getComputedStyle(editorEl).width, 10);
      localStorage.setItem(WKEY, w);
    }
    splitter.addEventListener('pointerdown', (e) => {
      dragging = true;
      splitter.classList.add('dragging');
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';
      e.preventDefault();
    });
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);

    // 双击复位
    splitter.addEventListener('dblclick', () => {
      editorEl.style.setProperty('--editor-w', DEFAULT_W + 'px');
      localStorage.removeItem(WKEY);
    });
  })();

  // ============================================================
  //  启动：分享链接 → 只读查看页；否则若已有会话则直接进入
  // ============================================================
  if (!tryViewer()) {
    const existing = Auth.currentUser();
    if (existing) enterApp(existing);
  }
})();
