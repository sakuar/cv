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
      { name: 'bullets', label: '工作内容（每行一条）', type: 'textarea', full: true },
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
      { name: 'label', label: '名称（如 GitHub）' }, { name: 'url', label: '网址' },
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
    buildEditor();
    renderPreview();
  }

  // 字号调节：通过 --rs 缩放因子作用于整篇简历
  function applyFontScale() {
    const v = data.settings.fontScale || 1;
    resumeRoot.style.setProperty('--rs', v);
    $('#font-val').textContent = Math.round(v * 100) + '%';
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
  function renderPreview() { Render.render(resumeRoot, data); }

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
  }

  // ============================================================
  //  编辑器表单生成
  // ============================================================
  function buildEditor() {
    editorEl.innerHTML = '';
    SCHEMA.forEach(sec => editorEl.appendChild(buildSection(sec)));
  }

  function buildSection(sec) {
    const box = document.createElement('div');
    box.className = 'ed-section';

    const head = document.createElement('div');
    head.className = 'ed-head';
    head.innerHTML = `<span>${sec.title}</span><span class="chevron">▾</span>`;
    head.addEventListener('click', () => box.classList.toggle('collapsed'));
    box.appendChild(head);

    const body = document.createElement('div');
    body.className = 'ed-body';

    if (sec.type === 'object') {
      body.appendChild(buildFieldGrid(sec, sec.fields, null));
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
  //  启动：若已有会话则直接进入
  // ============================================================
  const existing = Auth.currentUser();
  if (existing) enterApp(existing);
})();
