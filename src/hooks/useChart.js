import { useEffect } from 'react';

export function useChart(ref, build) {
  useEffect(() => {
    if (!ref.current || !window.echarts) return;
    if (ref.current.offsetParent === null) return;
    const opts = build();
    if (!opts) {
      ref.current.classList.add('chart-loading');
      return;
    }
    ref.current.classList.remove('chart-loading');
    const inst = window.echarts.getInstanceByDom(ref.current) ||
      window.echarts.init(ref.current, null, { renderer: 'canvas' });
    inst.setOption(opts, true);
    inst.resize();
    const ro = new ResizeObserver(() => inst.resize());
    ro.observe(ref.current);
    return () => ro.disconnect();
  });
}
