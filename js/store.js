/* ============================================================
   store.js — 简历数据读写（localStorage，按账号隔离）
   每个账号一份数据，key = rs_data_<用户名>
   ============================================================ */
(function (global) {
  'use strict';

  function key(user) { return 'rs_data_' + user; }

  function defaultData() {
    return {
      settings: {
        template: 'minimal', skin: 'indigo', customColor: '#6d7cff', fontScale: 1,
        order: ['experience', 'projects', 'education', 'skills', 'languages', 'awards']
      },
      basics: {
        name: '你的名字',
        headline: '高级前端工程师',
        avatar: '',
        email: 'you@example.com',
        phone: '138-0000-0000',
        location: '上海',
        website: '',
        summary: '在此用一两句话介绍你的核心优势与职业定位，让招聘方一眼记住你。'
      },
      social: [
        { label: 'GitHub', url: 'https://github.com/yourname' }
      ],
      experience: [
        {
          role: '高级前端工程师', org: '某科技公司', date: '2022 — 至今', location: '上海',
          bullets: '主导核心产品前端架构升级，性能提升 40%\n带领 3 人小组完成组件库建设，复用率达 70%'
        }
      ],
      education: [
        { role: '计算机科学与技术 学士', org: '某某大学', date: '2014 — 2018', desc: 'GPA 3.8 / 4.0，曾获校级奖学金' }
      ],
      projects: [
        { name: '开源组件库', url: '', desc: '一套基于 Web Components 的跨框架 UI 库', tags: 'TypeScript, Web Components, Vite' }
      ],
      skills: [
        { label: '前端', items: 'JavaScript, TypeScript, React, Vue' },
        { label: '工程化', items: 'Webpack, Vite, CI/CD' }
      ],
      languages: [
        { name: '英语', level: '流利 (CET-6)' }
      ],
      awards: [
        { role: '优秀员工', date: '2023', desc: '年度技术贡献奖' }
      ]
    };
  }

  const Store = {
    defaultData,

    load(user) {
      try {
        const raw = localStorage.getItem(key(user));
        if (!raw) return defaultData();
        const data = JSON.parse(raw);
        // 与默认结构做浅合并，兼容旧数据缺字段
        return Object.assign(defaultData(), data, {
          settings: Object.assign(defaultData().settings, data.settings || {}),
          basics: Object.assign(defaultData().basics, data.basics || {})
        });
      } catch { return defaultData(); }
    },

    save(user, data) {
      localStorage.setItem(key(user), JSON.stringify(data));
    }
  };

  global.Store = Store;
})(window);
