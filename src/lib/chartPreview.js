let overlay = null;
let canvasEl = null;
let titleEl = null;

function ensureModal() {
  if (overlay) return;
  overlay = document.createElement('div');
  overlay.className = 'cp-overlay';
  overlay.innerHTML = `
    <div class="cp-box">
      <div class="cp-hd">
        <div class="cp-title" id="cp-title"></div>
        <button class="cp-close" id="cp-close" aria-label="Close">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div class="cp-chart" id="cp-chart"></div>
    </div>
  `;
  document.body.appendChild(overlay);
  canvasEl = overlay.querySelector('#cp-chart');
  titleEl  = overlay.querySelector('#cp-title');
  overlay.querySelector('#cp-close').addEventListener('click', closeChartPreview);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeChartPreview(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeChartPreview(); });
}

export function closeChartPreview() {
  if (!overlay) return;
  overlay.classList.remove('cp-open');
  if (canvasEl?._ro) { canvasEl._ro.disconnect(); delete canvasEl._ro; }
  setTimeout(() => {
    const inst = window.echarts?.getInstanceByDom(canvasEl);
    if (inst) inst.dispose();
  }, 230);
}

export function openChartPreview(domEl, title) {
  if (!domEl) return;
  const src = window.echarts?.getInstanceByDom(domEl);
  if (!src) return;
  const option = src.getOption();

  ensureModal();
  titleEl.textContent = title || '';
  overlay.classList.add('cp-open');

  requestAnimationFrame(() => {
    let inst = window.echarts?.getInstanceByDom(canvasEl);
    if (!inst && window.echarts) inst = window.echarts.init(canvasEl, null, { renderer: 'canvas' });
    if (!inst) return;
    inst.setOption(option, true);
    inst.resize();
    const ro = new ResizeObserver(() => inst.resize());
    ro.observe(canvasEl);
    canvasEl._ro = ro;
  });
}
