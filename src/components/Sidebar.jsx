import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { applyTheme, getSavedTheme } from '../lib/theme';

/* ─── Search pages list ───────────────────────────────────── */
const PAGES_LIST = [
  { id:'overview', label:'Overview',          desc:'Indian Capital Markets summary'              },
  { id:'mp',       label:'Market Pulse',       desc:'NSE & BSE equity cash markets'               },
  { id:'dm',       label:'Debt Markets',       desc:'G-Sec curves, debt issuance, bond trading'   },
  { id:'fpi',      label:'FPI Tracker',        desc:'Foreign Portfolio Investment flows'           },
  { id:'deriv',    label:'Derivatives',        desc:'Equity F&O & Currency derivatives'           },
  { id:'prim',     label:'Primary Markets',    desc:'QIP & IPO fundraising activities'            },
  { id:'mf',       label:'Mutual Funds',       desc:'AMFI AUM, SIP flows, fund categories'        },
  { id:'wm',       label:'Wealth Management',  desc:'PMS & AIF, HNI portfolio trends'             },
  { id:'odi',      label:'ODI & P-Notes',      desc:'Offshore derivative instruments'             },
  { id:'comm',     label:'Commodity Markets',  desc:'MCX metals, energy & agri futures'           },
  { id:'im',       label:'Intermediaries',     desc:'Brokers, depositories, clearing houses'      },
  { id:'macro',    label:'Macro Indicators',   desc:'Repo rate, forex, inflation, PMI'            },
  { id:'insights', label:'Insights',           desc:'Capital Markets Command Center'              },
  { id:'dash',     label:'Dashboard',          desc:'Executive overview & KPIs'                   },
  { id:'catalog',  label:'Dataset Catalog',    desc:'Browse all available datasets'               },
];

function PageIcon({ id }) {
  const map = {
    overview: <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></>,
    mp:       <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>,
    dm:       <><rect x="3" y="3" width="18" height="4" rx="1"/><path d="M3 10h18M3 17h18"/><circle cx="7" cy="7" r="1" fill="currentColor"/><circle cx="7" cy="14" r="1" fill="currentColor"/></>,
    fpi:      <><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></>,
    deriv:    <><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></>,
    prim:     <><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></>,
    mf:       <><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></>,
    wm:       <><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></>,
    odi:      <><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></>,
    comm:     <><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>,
    im:       <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
    macro:    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>,
    insights: <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>,
    dash:     <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></>,
    catalog:  <><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/></>,
  };
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      {map[id] || <circle cx="12" cy="12" r="10"/>}
    </svg>
  );
}


const DRAWER_PAGES = PAGES_LIST.filter(p => p.id !== 'dash');

const BADGE_MAP = {
  mp: 'NSE/BSE', dm: 'BONDS', deriv: 'F&O', prim: 'QIP/IPO',
  mf: 'AUM', wm: 'PM/AUM', comm: 'MCX',
};

export default function Sidebar({ mobileNavOpen, onMobileNavClose, activePage }) {
  const [collapsed,  setCollapsed]  = useState(false);
  const [tooltip,    setTooltip]    = useState(null); // { label, y }
  const [srchOpen,   setSrchOpen]   = useState(false);

  const showTip = (e, label) => {
    if (!collapsed) return;
    const r = e.currentTarget.getBoundingClientRect();
    setTooltip({ label, y: r.top + r.height / 2 });
  };
  const hideTip = () => setTooltip(null);
  const [srchQuery,  setSrchQuery]  = useState('');
  const [srchIdx,    setSrchIdx]    = useState(0);
  const srchInput = useRef(null);

  useLayoutEffect(() => { applyTheme(getSavedTheme()); }, []); // eslint-disable-line

  /* ── Global Ctrl+K to open search ── */
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSrchOpen(true);
        setSrchQuery('');
        setSrchIdx(0);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  /* ── Focus search input when modal opens ── */
  useEffect(() => {
    if (srchOpen) setTimeout(() => srchInput.current?.focus(), 30);
  }, [srchOpen]);

  /* ── Keyboard nav inside modal ── */
  function onSearchKey(e) {
    if (e.key === 'Escape')   { setSrchOpen(false); setSrchQuery(''); }
    if (e.key === 'ArrowDown') { e.preventDefault(); setSrchIdx(i => Math.min(i + 1, filtered.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setSrchIdx(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter'  && filtered[srchIdx]) pickPage(filtered[srchIdx].id);
  }

  function navTo(id) {
    window._setActivePage?.(id);
    window.navigate?.(id);
  }

  function pickPage(id) {
    navTo(id);
    setSrchOpen(false);
    setSrchQuery('');
    setSrchIdx(0);
  }

  function pickPageMobile(id) {
    navTo(id);
    onMobileNavClose?.();
  }

  const filtered = PAGES_LIST.filter(p =>
    !srchQuery ||
    p.label.toLowerCase().includes(srchQuery.toLowerCase()) ||
    p.desc.toLowerCase().includes(srchQuery.toLowerCase())
  );

  return (
    <nav className={`sidebar${collapsed ? ' sb-collapsed' : ''}`}>

      {/* ── Brand header ── */}
      <div className="sb-brand">
        <div className="sb-brand-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
        </div>
        {!collapsed && <div><div className="sb-brand-name">Bond Analytics</div></div>}
        <button className="sb-collapse-btn" onClick={() => setCollapsed(c => !c)} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            {collapsed
              ? <polyline points="9 18 15 12 9 6" />
              : <polyline points="15 18 9 12 15 6" />}
          </svg>
        </button>
      </div>

      {/* ── Search ── */}
      {/* <div className="sb-search" onClick={() => { setSrchOpen(true); setSrchQuery(''); setSrchIdx(0); }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <span className="sb-search-ph">Search pages...</span>
        <span className="sb-search-kbd">Ctrl+K</span>
      </div> */}

      {/* ── Nav items ── */}
      <div className="sb-nav">

        <div className="sb-item" id="sni-overview" onClick={() => navTo('overview')} onMouseEnter={e => showTip(e,'Overview')} onMouseLeave={hideTip}>
          <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></svg>
          <span className="sb-item-label">Overview</span>
        </div>

        <div className="sb-item" id="sni-mp" onClick={() => navTo('mp')} onMouseEnter={e => showTip(e,'Market Pulse')} onMouseLeave={hideTip}>
          <svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          <span className="sb-item-label">Market Pulse</span>
          <span className="sb-badge sb-badge-teal">NSE/BSE</span>
        </div>

        <div className="sb-item" id="sni-dm" onClick={() => navTo('dm')} onMouseEnter={e => showTip(e,'Debt Markets')} onMouseLeave={hideTip}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="4" rx="1"/><path d="M3 10h18M3 17h18"/><circle cx="7" cy="7" r="1" fill="currentColor"/><circle cx="7" cy="14" r="1" fill="currentColor"/></svg>
          <span className="sb-item-label">Debt Markets</span>
          <span className="sb-badge sb-badge-blue">BONDS</span>
        </div>

        <div className="sb-item" id="sni-fpi" onClick={() => navTo('fpi')} onMouseEnter={e => showTip(e,'FPI Tracker')} onMouseLeave={hideTip}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
          <span className="sb-item-label">FPI Tracker</span>
        </div>

        <div className="sb-item" id="sni-deriv" onClick={() => navTo('deriv')} onMouseEnter={e => showTip(e,'Derivatives')} onMouseLeave={hideTip}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
          <span className="sb-item-label">Derivatives</span>
          <span className="sb-badge sb-badge-amber">F&O</span>
        </div>

        <div className="sb-item" id="sni-prim" onClick={() => navTo('prim')} onMouseEnter={e => showTip(e,'Primary Markets')} onMouseLeave={hideTip}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>
          <span className="sb-item-label">Primary Markets</span>
          <span className="sb-badge sb-badge-blue">QIP/IPO</span>
        </div>

        <div className="sb-item" id="sni-mf" onClick={() => navTo('mf')} onMouseEnter={e => showTip(e,'Mutual Funds')} onMouseLeave={hideTip}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
          <span className="sb-item-label">Mutual Funds</span>
          <span className="sb-badge sb-badge-purple">AUM</span>
        </div>

        <div className="sb-item" id="sni-wm" onClick={() => navTo('wm')} onMouseEnter={e => showTip(e,'Wealth Management')} onMouseLeave={hideTip}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>
          <span className="sb-item-label">Wealth Mgmt</span>
          <span className="sb-badge sb-badge-green">PM/AUM</span>
        </div>

        <div className="sb-item" id="sni-odi" onClick={() => navTo('odi')} onMouseEnter={e => showTip(e,'ODI & P-Notes')} onMouseLeave={hideTip}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
          <span className="sb-item-label">ODI &amp; P-Notes</span>
        </div>

        <div className="sb-item" id="sni-comm" onClick={() => navTo('comm')} onMouseEnter={e => showTip(e,'Commodity Markets')} onMouseLeave={hideTip}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
          <span className="sb-item-label">Commodity Markets</span>
          <span className="sb-badge sb-badge-orange">MCX</span>
        </div>

        <div className="sb-item" id="sni-im" onClick={() => navTo('im')} onMouseEnter={e => showTip(e,'Intermediaries')} onMouseLeave={hideTip}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          <span className="sb-item-label">Intermediaries</span>
        </div>

        <div className="sb-item" id="sni-macro" onClick={() => navTo('macro')} onMouseEnter={e => showTip(e,'Macro Indicators')} onMouseLeave={hideTip}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          <span className="sb-item-label">Macro Indicators</span>
        </div>

        <div className="sb-item" id="sni-insights" onClick={() => navTo('insights')} onMouseEnter={e => showTip(e,'Insights')} onMouseLeave={hideTip}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <span className="sb-item-label">Insights</span>
        </div>

        {/* <div className="sb-item" id="sni-dash" onClick={() => navTo('dash')}>
          <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></svg>
          <span className="sb-item-label">Dashboard</span>
        </div> */}

        <div className="sb-item" id="sni-catalog" onClick={() => navTo('catalog')} onMouseEnter={e => showTip(e,'Dataset Catalog')} onMouseLeave={hideTip}>
          <svg viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/></svg>
          <span className="sb-item-label">Dataset Catalog</span>
        </div>

      </div>


      {/* ── Collapsed tooltip portal ── */}
      {tooltip && ReactDOM.createPortal(
        <div className="sb-tip" style={{ top: tooltip.y }}>{tooltip.label}</div>,
        document.body
      )}

      {/* ── Mobile Drawer Portal ── */}
      {mobileNavOpen && ReactDOM.createPortal(
        <div
          className="mob-drawer-overlay"
          onClick={e => { if (e.target === e.currentTarget) onMobileNavClose?.(); }}
        >
          <nav className="mob-drawer">
            {/* Header */}
            <div className="mob-drawer-hd">
              <div className="mob-drawer-brand">
                <div className="mob-drawer-brand-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
                  </svg>
                </div>
                <span className="mob-drawer-brand-name">Bond Analytics</span>
              </div>
              <button className="mob-drawer-close" onClick={onMobileNavClose}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* Nav items */}
            <div className="mob-drawer-nav">
              {DRAWER_PAGES.map(p => (
                <div
                  key={p.id}
                  className={`mob-nav-item${activePage === p.id ? ' on' : ''}`}
                  onClick={() => pickPageMobile(p.id)}
                >
                  <div className="mob-nav-icon">
                    <PageIcon id={p.id} />
                  </div>
                  <span className="mob-nav-label">{p.label}</span>
                  {BADGE_MAP[p.id] && <span className="mob-nav-badge">{BADGE_MAP[p.id]}</span>}
                </div>
              ))}
            </div>
          </nav>
        </div>,
        document.body
      )}

      {/* ── Search Modal Portal ── */}
      {srchOpen && ReactDOM.createPortal(
        <div className="srch-overlay" onMouseDown={e => { if (e.target === e.currentTarget) { setSrchOpen(false); setSrchQuery(''); } }}>
          <div className="srch-modal">

            {/* Input row */}
            <div className="srch-input-row">
              <svg className="srch-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                ref={srchInput}
                className="srch-input"
                placeholder="Search pages..."
                value={srchQuery}
                onChange={e => { setSrchQuery(e.target.value); setSrchIdx(0); }}
                onKeyDown={onSearchKey}
                autoComplete="off"
                spellCheck={false}
              />
              <button className="srch-esc-btn" onClick={() => { setSrchOpen(false); setSrchQuery(''); }}>ESC</button>
            </div>

            {/* Results list */}
            <div className="srch-list">
              {filtered.length === 0
                ? <div className="srch-empty">No pages match "{srchQuery}"</div>
                : filtered.map((p, i) => (
                  <div
                    key={p.id}
                    className={`srch-item${srchIdx === i ? ' srch-item-sel' : ''}`}
                    onMouseEnter={() => setSrchIdx(i)}
                    onClick={() => pickPage(p.id)}
                  >
                    <div className="srch-item-icon">
                      <PageIcon id={p.id} />
                    </div>
                    <div className="srch-item-text">
                      <div className="srch-item-label">{p.label}</div>
                      <div className="srch-item-desc">{p.desc}</div>
                    </div>
                    {srchIdx === i && (
                      <div className="srch-item-enter">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><polyline points="9 10 4 15 9 20"/><path d="M20 4v7a4 4 0 0 1-4 4H4"/></svg>
                      </div>
                    )}
                  </div>
                ))
              }
            </div>

            {/* Footer */}
            <div className="srch-footer">
              <span><kbd>↑↓</kbd> navigate</span>
              <span><kbd>↵</kbd> select</span>
              <span><kbd>ESC</kbd> close</span>
            </div>
          </div>
        </div>,
        document.body
      )}

      <style>{`
        /* ── Collapsed item tooltip ── */
        .sb-tip{
          position:fixed;left:66px;transform:translateY(-50%);
          background:var(--sf,#1a2a40);border:1px solid var(--bdr2,rgba(255,255,255,.2));
          color:var(--tx,#f0f4ff);font-size:12px;font-weight:600;
          padding:5px 11px;border-radius:8px;white-space:nowrap;
          box-shadow:0 6px 20px rgba(0,0,0,.22);z-index:9999;pointer-events:none;
          animation:tipIn .1s ease;
        }
        @keyframes tipIn{from{opacity:0;transform:translateY(-50%) translateX(-4px)}to{opacity:1;transform:translateY(-50%) translateX(0)}}

        /* ── Collapse toggle ── */
        .sb-collapse-btn{width:24px;height:24px;border-radius:6px;border:1px solid var(--bdr);background:none;color:var(--tx3);cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-left:auto;transition:all .13s;padding:0}
        .sb-collapse-btn:hover{background:var(--sf2);color:var(--tx);border-color:var(--bdr2)}
        .sb-collapse-btn svg{width:13px;height:13px}
        .sb-collapsed .sb-collapse-btn{margin-left:0}

        /* ── Brand ── */
        .sb-brand{display:flex;align-items:center;gap:10px;padding:14px 14px 10px;flex-shrink:0}
        .sb-brand-icon{width:32px;height:32px;border-radius:9px;
          background:linear-gradient(145deg,#3a6fd8,#1e4fad);
          display:flex;align-items:center;justify-content:center;flex-shrink:0;
          box-shadow:0 3px 10px rgba(37,87,167,.35)}
        .sb-brand-icon svg{width:17px;height:17px;stroke:#fff}
        .sb-brand-name{font-size:13.5px;font-weight:700;color:var(--tx,#e0e0e0);line-height:1.2}
        .sb-brand-sub{font-size:10px;color:var(--tx3,#888);margin-top:1px}

        /* ── Search ── */
        .sb-search{display:flex;align-items:center;gap:7px;margin:0 8px 8px;
          padding:7px 10px;border-radius:8px;
          background:var(--sf2,rgba(255,255,255,.05));
          border:1px solid var(--bdr,rgba(255,255,255,.07));cursor:pointer;flex-shrink:0}
        .sb-search svg{width:12px;height:12px;stroke:var(--tx3,#888);flex-shrink:0}
        .sb-search-ph{font-size:11.5px;color:var(--tx3,#888);flex:1}
        .sb-search-kbd{font-size:9.5px;color:#fff;
          // background:var(--sf3,rgba(255,255,255,.08));
          // border:1px solid var(--bdr2,rgba(255,255,255,.12));
          border-radius:4px;padding:1px 5px;flex-shrink:0;white-space:nowrap}

        /* ── Nav item parts ── */
        .sb-item-label{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;
          white-space:nowrap;font-size:12.5px;color:inherit}
        .sb-badge{font-size:9px;font-weight:700;letter-spacing:.04em;
          padding:2px 5px;border-radius:4px;flex-shrink:0;white-space:nowrap}
        .sb-badge-teal,
        .sb-badge-blue,
        .sb-badge-amber,
        .sb-badge-purple,
        .sb-badge-green,
        .sb-badge-orange{background:rgba(74,144,217,.18);color:#7ab8f5}
        .sb-badge-new   {background:#d4a820;color:#080808;border-radius:5px}
        .sb-badge-gray  {background:rgba(128,128,128,.16);color:var(--tx3,#888)}
        .sb-item-arr{display:flex;align-items:center;flex-shrink:0;opacity:.55}
        .sb-item-arr svg{width:11px;height:11px;stroke:currentColor}

        /* ── Footer items ── */
        .sb-footer{display:flex;flex-direction:column;gap:1px;
          padding:4px 8px 2px;border-top:1px solid var(--bdr,rgba(255,255,255,.06));flex-shrink:0}

        /* ── Theme Studio section ── */
        .sb-ts-section{flex-shrink:0;padding:2px 8px 10px;
          border-top:1px solid var(--bdr,rgba(255,255,255,.06))}
        .sb-ts-toggle{display:flex;align-items:center;gap:9px;padding:7px 10px;
          border-radius:10px;cursor:pointer;transition:background .13s}
        .sb-ts-toggle:hover{background:rgba(255,255,255,.06)}

        /* Light theme overrides — sidebar is now light bg */
        [data-theme="light"] .sb-item:hover{background:rgba(26,47,85,.07)!important;color:#1e3a6a}
        [data-theme="light"] .sb-item.on{background:rgba(26,47,85,.10)!important;color:#0a1a30}
        [data-theme="light"] .sb-ts-toggle:hover{background:rgba(26,47,85,.06)!important}
        [data-theme="light"] .sb-search{background:rgba(26,47,85,.05)!important;border-color:rgba(26,47,85,.12)!important}
        [data-theme="light"] .sb-search-kbd{background:rgba(26,47,85,.07)!important;border-color:rgba(26,47,85,.14)!important}
        [data-theme="light"] .sb-ts-icon{background:rgba(26,47,85,.08)!important}
        [data-theme="light"] .sb-footer{border-top-color:rgba(26,47,85,.10)!important}
        [data-theme="light"] .sb-ts-section{border-top-color:rgba(26,47,85,.10)!important}
        [data-theme="light"] .sb-rule{background:rgba(26,47,85,.10)!important}
        .sb-ts-icon{width:28px;height:28px;border-radius:8px;background:var(--sf2,rgba(255,255,255,.08));
          display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .sb-ts-icon svg{width:14px;height:14px;stroke:var(--tx3,#888);fill:none;stroke-width:1.75;stroke-linecap:round;stroke-linejoin:round}
        .sb-ts-text{flex:1;min-width:0}
        .sb-ts-lbl{display:block;font-size:8.5px;font-weight:700;letter-spacing:.8px;
          color:var(--tx4,#666);text-transform:uppercase;margin-bottom:1px}
        .sb-ts-cur{display:block;font-size:11.5px;font-weight:600;color:var(--tx2,#ccc);
          overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .sb-ts-chevron{flex-shrink:0}
        .sb-ts-chevron svg{width:14px;height:14px;stroke:var(--tx3,#888);fill:none;stroke-width:2}

        /* ── Theme Panel ── */
        .ts-panel{width:240px}
        .ts-panel-top{padding:12px 14px 8px}
        .ts-panel-label{font-size:9px;font-weight:700;letter-spacing:.9px;text-transform:uppercase;
          color:var(--tx4,#666);margin-bottom:3px}
        .ts-panel-title{font-size:14px;font-weight:700;color:var(--tx,#e0e0e0)}

        /* Mode pill on each row */
        .ts-mode-pill{font-size:12px;flex-shrink:0;width:22px;height:22px;border-radius:50%;
          display:flex;align-items:center;justify-content:center}
        .ts-mode-pill-dark {background:rgba(26,47,85,.35);color:#8ab0d8}
        .ts-mode-pill-light{background:rgba(255,255,255,.18);color:#f0c040}

        /* Color info strip */
        .ts-color-info{padding:4px 14px 12px;display:flex;flex-direction:column;gap:5px}
        .ts-color-row{display:flex;align-items:center;gap:8px}
        .ts-color-dot{width:14px;height:14px;border-radius:4px;flex-shrink:0}
        .ts-color-lbl{font-size:10.5px;color:var(--tx3,#888);flex:1}
        .ts-color-hex{font-size:10px;font-weight:700;color:var(--tx2,#ccc);
          font-family:monospace;letter-spacing:.04em}

        /* ── Search Modal ── */
        .srch-overlay{
          position:fixed;inset:0;z-index:9999;
          background:rgba(0,0,0,.60);
          backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);
          display:flex;align-items:flex-start;justify-content:center;
          padding-top:10vh;
        }
        .srch-modal{
          width:560px;max-width:92vw;
          background:#162032;
          border:1px solid rgba(255,255,255,.10);
          border-radius:14px;
          box-shadow:0 24px 64px rgba(0,0,0,.55),0 4px 16px rgba(0,0,0,.4);
          overflow:hidden;
          animation:srchIn .15s ease;
        }
        @keyframes srchIn{from{opacity:0;transform:translateY(-10px) scale(.97)}to{opacity:1;transform:none}}
        .srch-input-row{
          display:flex;align-items:center;gap:10px;
          padding:14px 16px;
          border-bottom:1px solid rgba(255,255,255,.07);
        }
        .srch-ico{width:18px;height:18px;flex-shrink:0;stroke:#5888a8}
        .srch-input{
          flex:1;background:transparent;border:none;outline:none;
          font-size:16px;font-weight:400;color:#e8f0f8;
          caret-color:#4a90d9;
        }
        .srch-input::placeholder{color:#3a5870}
        .srch-esc-btn{
          padding:3px 9px;border-radius:6px;font-size:11px;font-weight:600;
          border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06);
          color:#5888a8;cursor:pointer;flex-shrink:0;transition:background .13s;
        }
        .srch-esc-btn:hover{background:rgba(255,255,255,.12);color:#a0c4e0}
        .srch-list{
          max-height:340px;overflow-y:auto;padding:6px;
          scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.12) transparent;
        }
        .srch-list::-webkit-scrollbar{width:5px}
        .srch-list::-webkit-scrollbar-thumb{background:rgba(255,255,255,.12);border-radius:3px}
        .srch-empty{padding:24px;text-align:center;font-size:13px;color:#3a5870}
        .srch-item{
          display:flex;align-items:center;gap:12px;
          padding:9px 10px;border-radius:9px;cursor:pointer;transition:background .10s;
        }
        .srch-item:hover,.srch-item-sel{background:rgba(74,144,217,.13)}
        .srch-item-icon{
          width:38px;height:38px;border-radius:9px;flex-shrink:0;
          background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.07);
          display:flex;align-items:center;justify-content:center;
        }
        .srch-item-icon svg{width:18px;height:18px;stroke:#5888a8;fill:none;stroke-width:1.75;stroke-linecap:round;stroke-linejoin:round}
        .srch-item-sel .srch-item-icon{background:rgba(74,144,217,.15);border-color:rgba(74,144,217,.25)}
        .srch-item-sel .srch-item-icon svg{stroke:#7ab8f5}
        .srch-item-text{flex:1;min-width:0}
        .srch-item-label{font-size:13.5px;font-weight:600;color:#c8dff0;line-height:1.3}
        .srch-item-sel .srch-item-label{color:#e8f4ff}
        .srch-item-desc{font-size:11.5px;color:#3a6080;margin-top:1px;line-height:1.3;
          overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .srch-item-sel .srch-item-desc{color:#5888a8}
        .srch-item-enter{flex-shrink:0;opacity:.45;color:#5888a8}
        .srch-footer{
          display:flex;align-items:center;gap:16px;
          padding:9px 16px;
          border-top:1px solid rgba(255,255,255,.06);
          font-size:11px;color:#3a5870;
        }
        .srch-footer kbd{
          display:inline-block;padding:1px 6px;border-radius:4px;
          background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);
          font-size:10px;font-family:inherit;color:#5888a8;margin-right:4px;
        }
      `}</style>
    </nav>
  );
}
