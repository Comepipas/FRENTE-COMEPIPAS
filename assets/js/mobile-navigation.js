(() => {
  'use strict';
  function init() {
    document.querySelectorAll('.site-header .nav-links').forEach((nav, index) => {
      const parent = nav.parentElement;
      if (parent.querySelector('.menu-btn')) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'fc-mobile-menu';
      button.textContent = 'Menú';
      nav.id ||= `fc-mobile-navigation-${index}`;
      button.setAttribute('aria-controls', nav.id);
      button.setAttribute('aria-expanded', 'false');
      const close = () => { nav.classList.remove('open'); button.setAttribute('aria-expanded', 'false'); };
      button.addEventListener('click', () => { const open = !nav.classList.contains('open'); nav.classList.toggle('open', open); button.setAttribute('aria-expanded', String(open)); });
      nav.addEventListener('click', event => { if (event.target.closest('a')) close(); });
      parent.addEventListener('keydown', event => { if (event.key === 'Escape' && nav.classList.contains('open')) { close(); button.focus(); } });
      document.addEventListener('click', event => { if (!parent.contains(event.target)) close(); });
      parent.insertBefore(button, nav);
    });
    function tables() {
      document.querySelectorAll('table').forEach(table => {
        if (table.closest('.fc-table-scroll') || getComputedStyle(table.parentElement).overflowX === 'auto') return;
        const wrapper = document.createElement('div');
        wrapper.className = 'fc-table-scroll';
        wrapper.tabIndex = 0;
        wrapper.setAttribute('role', 'region');
        wrapper.setAttribute('aria-label', table.caption?.textContent || 'Tabla: desliza horizontalmente para consultar todas las columnas');
        table.before(wrapper);
        wrapper.appendChild(table);
      });
    }
    tables();
    let scheduled = false;
    new MutationObserver(records => {
      if (scheduled || !records.some(record => [...record.addedNodes].some(node => node.nodeType === 1 && (node.matches('table') || node.querySelector('table'))))) return;
      scheduled = true;
      requestAnimationFrame(() => { tables(); scheduled = false; });
    }).observe(document.body, {childList:true,subtree:true});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
