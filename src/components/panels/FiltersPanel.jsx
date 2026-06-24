import React from 'react';

export default function FiltersPanel() {
  return (
    <div className="slide-panel" id="panel-filters" style={{width:'320px'}}>
      <div className="panel-head">
        <div className="panel-title">Filters</div>
      </div>
      <div className="panel-body" style={{padding:0}}>
        <div style={{padding:'14px 16px',borderBottom:'1px solid var(--bdr)'}}>
          <div style={{fontSize:'10px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em',color:'var(--tx3)',marginBottom:'10px'}}>Status</div>
          <div className="status-seg" style={{display:'flex',gap:'4px'}}>
            <div className="seg-opt on" id="st-all-mob" onClick={(e) => window.setStatus('all', e.currentTarget)}>All</div>
            <div className="seg-opt" id="st-active-mob" onClick={(e) => window.setStatus('active', e.currentTarget)}>Active</div>
            <div className="seg-opt" id="st-inactive-mob" onClick={(e) => window.setStatus('inactive', e.currentTarget)}>Inactive</div>
          </div>
        </div>
        <div style={{padding:'14px 16px',borderBottom:'1px solid var(--bdr)'}}>
          <div style={{fontSize:'10px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em',color:'var(--tx3)',marginBottom:'10px'}}>Source</div>
          <div id="mob-src-filters" style={{display:'flex',flexDirection:'column',gap:'2px'}}>
            <div className="src-row on" onClick={(e) => window.setSrc('all', e.currentTarget)}><span className="src-label">All Sources</span><span className="src-count" id="mob-src-count-all">&#x2014;</span></div>
          </div>
        </div>
        <div style={{padding:'14px 16px',borderBottom:'1px solid var(--bdr)'}}>
          <div style={{fontSize:'10px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em',color:'var(--tx3)',marginBottom:'10px'}}>Frequency</div>
          <div id="mob-freq-container" style={{display:'flex',flexDirection:'column',gap:'2px'}}>
            <div className="src-row on" onClick={(e) => window.setFreq('all', e.currentTarget)}><span className="src-label">All</span><span className="src-count" id="mob-freq-count-all">&#x2014;</span></div>
            <div className="src-row" onClick={(e) => window.setFreq('daily', e.currentTarget)}><span className="src-label">Daily</span><span className="src-count" id="mob-freq-count-daily">&#x2014;</span></div>
            <div className="src-row" onClick={(e) => window.setFreq('weekly', e.currentTarget)}><span className="src-label">Weekly</span><span className="src-count" id="mob-freq-count-weekly">&#x2014;</span></div>
            <div className="src-row" onClick={(e) => window.setFreq('monthly', e.currentTarget)}><span className="src-label">Monthly</span><span className="src-count" id="mob-freq-count-monthly">&#x2014;</span></div>
          </div>
        </div>
        <div style={{padding:'14px 16px'}}>
          <button className="btn btn-primary" style={{width:'100%',justifyContent:'center'}} onClick={() => window.closePanel('filters')}>Apply Filters</button>
        </div>
      </div>
    </div>
  );
}
