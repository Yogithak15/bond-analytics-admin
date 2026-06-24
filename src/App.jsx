import { useEffect, useLayoutEffect, useRef, useState, useCallback, } from 'react';
import ReactDOM from 'react-dom';
import * as echarts from 'echarts';
import { authClient } from './lib/auth-client';
import LoginPage from './components/auth/LoginPage';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import DashboardPage from './components/dashboard/DashboardPage';
import CatalogPage from './components/catalog/CatalogPage';
import OverviewPage from './components/overview/OverviewPage';
import MarketPulsePage from './components/marketpulse/MarketPulsePage';
import DebtMarketsPage from './components/debtmarket/DebtMarketsPage';
import FpiTrackerPage from './components/fpitracker/FpiTrackerPage';
import DerivativesPage from './components/derivatives/DerivativesPage';
import PrimaryMarketsPage from './components/primarymarkets/PrimaryMarketsPage';
import MutualFundsPage from './components/mutualfunds/MutualFundsPage';
import WealthManagementPage from './components/wealthmanagement/WealthManagementPage';
import ODIPNotesPage from './components/oditracker/ODIPNotesPage';
import CommodityMarketsPage from './components/commodity/CommodityMarketsPage';
import IntermediariesPage from './components/intermediaries/IntermediariesPage';
import MacroIndicatorsPage from './components/macroindicators/MacroIndicatorsPage';
import InsightsPage from './components/insights/InsightsPage';
import DatasetDetailPage from './components/detail/DatasetDetailPage';
import FiltersPanel from './components/panels/FiltersPanel';
import PivotPanel from './components/panels/PivotPanel';
import ComparePanel from './components/panels/ComparePanel';
import WatchlistPanel from './components/panels/WatchlistPanel';
import SourceUrlsModal from './components/SourceUrlsModal';
import IndiaMap from './components/IndiaMap';

window.echarts = echarts;

const CDN_CHARTJS = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js';

function loadScript(src) {
  return new Promise((resolve) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = resolve;
    document.body.appendChild(s);
  });
}

function getInitialPage() {
  const rawHash = window.location.hash.replace('#', '');
  const hash    = rawHash === 'dashboard' ? 'dash' : rawHash;
  const valid   = ['overview', 'mp', 'dm', 'fpi', 'deriv', 'prim', 'mf', 'wm', 'odi', 'comm', 'im', 'macro', 'insights', 'dash', 'catalog', 'detail', 'ref'];
  const start   = valid.includes(hash) ? hash : 'overview';
  return start === 'detail' ? 'dash' : start;
}

export default function App() {
  const { data: session, isPending: sessionLoading } = authClient.useSession();
  const [mapTarget, setMapTarget]       = useState(null);
  const [sgsMapTarget, setSgsMapTarget] = useState(null);
  const [isDark, setIsDark]             = useState(() => {
    try { return localStorage.getItem('bb-color-theme') !== 'light'; } catch { return true; }
  });
  const [ovPieData, setOvPieData]       = useState([]);
  const [activePage, setActivePage]     = useState(getInitialPage);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const booted = useRef(false);
  // Lazy-mount: track which pages have ever been visited so we only mount them on first use.
  // 'dm' is pre-seeded because its DOM elements (#sdl-body-mount) are needed for the map portal.
  const [visitedPages, setVisitedPages] = useState(() => new Set([getInitialPage(), 'dm']));

  // Expose setter so DashboardPage can push market-composition data into the portal
  useEffect(() => {
    window._setOvPieData = setOvPieData;
    return () => { delete window._setOvPieData; };
  }, []);

  // Expose setter so app.js navigate() can keep React state in sync
  useEffect(() => {
    window._setActivePage = setActivePage;
    return () => { delete window._setActivePage; };
  }, []);

  // Expose so openDetail can pre-seed visitedPages before navigate,
  // allowing the detail page to mount in the same render batch.
  useEffect(() => {
    window._addVisitedPage = (page) => setVisitedPages(prev => {
      if (prev.has(page)) return prev;
      return new Set([...prev, page]);
    });
    return () => { delete window._addVisitedPage; };
  }, []);

  // Mark page as visited so it mounts for the first time
  useEffect(() => {
    setVisitedPages(prev => {
      if (prev.has(activePage)) return prev;
      return new Set([...prev, activePage]);
    });
  }, [activePage]);

  // Sync DOM page visibility whenever activePage changes (React is source of truth).
  // useLayoutEffect runs before paint so the correct page is visible on first render.
  // We set both the class AND an inline display style so there is no way for a
  // stale classList mutation to leak through between React renders.
  useLayoutEffect(() => {
    const PAGES = ['overview', 'mp', 'dm', 'fpi', 'deriv', 'prim', 'mf', 'wm', 'odi', 'comm', 'im', 'macro', 'insights', 'dash', 'catalog', 'detail', 'ref'];
    PAGES.forEach(p => {
      const el = document.getElementById('page-' + p);
      if (!el) return;
      const active = p === activePage;
      el.classList.toggle('on', active);
      el.style.display = active ? 'flex' : 'none';
    });
    document.querySelectorAll('.sb-item').forEach(n => n.classList.remove('on'));
    const ni = document.getElementById('sni-' + activePage);
    if (ni) ni.classList.add('on');
  }, [activePage]);

  const boot = useCallback(async () => {
    if (booted.current) return;
    booted.current = true;

    await loadScript(CDN_CHARTJS);
    await loadScript('/app.js');

    // Navigate to the correct page: URL hash takes priority, otherwise default to dashboard
    if (window.navigate) {
      const rawHash = window.location.hash.replace('#', '');
      const hash = rawHash === 'dashboard' ? 'dash' : rawHash;
      const pages = ['overview', 'mp', 'dm', 'fpi', 'deriv', 'prim', 'mf', 'wm', 'odi', 'comm', 'im', 'macro', 'insights', 'dash', 'catalog', 'detail', 'ref'];
      const start = pages.includes(hash) ? hash : 'overview';
      window.navigate(start === 'detail' ? 'overview' : start);
    }

    // CatalogPage is a React component — prevent app.js from fetching
    // or writing innerHTML to the catalog DOM after it loads.
    window.loadDataSources = () => {};
    window.renderCatalog   = () => {};

    // DatasetDetailPage is a React component — route openDetail through it.
    window.openDetail = (sourceId) => {
      if (!sourceId) { console.warn('[openDetail] called with falsy sourceId:', sourceId); }
      window._pendingDetailSourceId = sourceId;
      window._addVisitedPage?.('detail');
      window.navigate?.('detail');
      window._onOpenDetail?.(sourceId);
    };
    window.buildExpChart   = () => {};
    window.rebuildExpChart = () => {};

    const origSetTheme = window.setTheme;
    if (origSetTheme) {
      window.setTheme = (t) => { origSetTheme(t); setIsDark(t === 'dark'); };
    }

    // Wait for #sdl-body-mount to have real clientWidth before mounting portal
    const tryMount = () => {
      const mapEl = document.getElementById('sdl-body-mount');
      if (!mapEl) return;

      if (mapEl.clientWidth > 0) {
        setMapTarget(mapEl);
      } else {
        // Use ResizeObserver to wait for layout
        const ro = new ResizeObserver((entries) => {
          for (const entry of entries) {
            if (entry.contentRect.width > 0) {
              ro.disconnect();
              setMapTarget(mapEl);
              break;
            }
          }
        });
        ro.observe(mapEl);
      }
    };

    const trySgsMount = () => {
      const sgsEl = document.getElementById('sdl-sgs-mount');
      if (!sgsEl) return;
      if (sgsEl.clientWidth > 0) {
        setSgsMapTarget(sgsEl);
      } else {
        // Tab is hidden — observe the parent pane for when it becomes visible
        const pane = document.getElementById('dmp-issuance') || sgsEl;
        const ro = new ResizeObserver(() => {
          if (sgsEl.clientWidth > 0) {
            ro.disconnect();
            setSgsMapTarget(sgsEl);
          }
        });
        ro.observe(pane);
      }
    };

    // Give the DOM a frame to lay out first
    requestAnimationFrame(() => setTimeout(() => { tryMount(); trySgsMount(); }, 100));
    setTimeout(() => window.dispatchEvent(new Event('resize')), 300);
  }, []);

  useEffect(() => {
    boot();
  }, [boot]);

  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  if (sessionLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#040c1c', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid rgba(37,87,167,0.2)', borderTopColor: '#2557a7', animation: 'spin 0.8s linear infinite' }} />
        <span style={{ fontSize: 13, color: '#3a5070', letterSpacing: '0.05em' }}>Loading…</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!session) {
    const intended = window.location.pathname !== '/login'
      ? window.location.pathname + window.location.hash
      : '/#overview';
    if (window.location.pathname !== '/login' || window.location.hash) {
      window.history.replaceState({ intended }, '', '/login');
    }
    const afterLogin = window.history.state?.intended || '/#overview';
    return <LoginPage onLogin={() => {
      window.location.href = afterLogin;
    }} />;
  }

  if (window.location.pathname === '/login') {
    window.history.replaceState(null, '', '/#overview');
  }

  return (
    <>
      <div className="app">
        <Sidebar mobileNavOpen={mobileNavOpen} onMobileNavClose={() => setMobileNavOpen(false)} activePage={activePage} />
        <div className="body">
          <Topbar session={session} onNavigate={p => { setActivePage(p); window._setActivePage?.(p); }} onMenuOpen={() => setMobileNavOpen(true)} />
          <div className="pages">
            {visitedPages.has('overview')  && <OverviewPage       isActive={activePage === 'overview'} />}
            {visitedPages.has('mp')        && <MarketPulsePage    isActive={activePage === 'mp'}       />}
            {visitedPages.has('dm')        && <DebtMarketsPage    isActive={activePage === 'dm'}       />}
            {visitedPages.has('fpi')       && <FpiTrackerPage     isActive={activePage === 'fpi'}      />}
            {visitedPages.has('deriv')     && <DerivativesPage    isActive={activePage === 'deriv'}    />}
            {visitedPages.has('prim')      && <PrimaryMarketsPage isActive={activePage === 'prim'}     />}
            {visitedPages.has('mf')        && <MutualFundsPage        isActive={activePage === 'mf'}  />}
            {visitedPages.has('wm')        && <WealthManagementPage   isActive={activePage === 'wm'}  />}
            {visitedPages.has('odi')       && <ODIPNotesPage          isActive={activePage === 'odi'}  />}
            {visitedPages.has('comm')      && <CommodityMarketsPage   isActive={activePage === 'comm'} />}
            {visitedPages.has('im')        && <IntermediariesPage     isActive={activePage === 'im'}    />}
            {visitedPages.has('macro')     && <MacroIndicatorsPage    isActive={activePage === 'macro'} />}
            {visitedPages.has('insights')  && <InsightsPage           isActive={activePage === 'insights'} />}
            {/* {visitedPages.has('dash')      && <DashboardPage      isActive={activePage === 'dash'}     />} */}
            {visitedPages.has('detail')    && <DatasetDetailPage  isActive={activePage === 'detail'}   />}
            {visitedPages.has('catalog')   && <CatalogPage        isActive={activePage === 'catalog'}  />}
          </div>
        </div>
        <FiltersPanel />
        <PivotPanel />
        <ComparePanel />
        <WatchlistPanel />
      </div>
      {/* Panel backdrop */}
      <div
        id="panel-backdrop"
        onClick={() => {
          document.querySelectorAll('.slide-panel').forEach(p => p.classList.remove('on'));
          document.querySelectorAll('.tb-btn').forEach(b => b.classList.remove('lit'));
          document.getElementById('panel-backdrop').classList.remove('on');
        }}
        style={{display:'none'}}
      ></div>
      <SourceUrlsModal />
      {mapTarget    && ReactDOM.createPortal(<IndiaMap isDark={isDark} showRankings={false} plainMap={true} pieData={ovPieData} />, mapTarget)}
      {sgsMapTarget && ReactDOM.createPortal(<IndiaMap isDark={isDark} showRankings={true}  />, sgsMapTarget)}
    </>
  );
}
