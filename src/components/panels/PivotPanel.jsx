import React from 'react';

export default function PivotPanel() {
  return (
    <div className="slide-panel" id="panel-pivot" style={{width:'320px'}}>
      <div className="panel-head">
        <div className="panel-title">Pivot &amp; Chart Builder</div>
        <div className="panel-close" onClick={() => window.closePanel('pivot')}>&#x2715;</div>
      </div>
      <div className="panel-body" style={{padding:'16px 18px 32px'}}>
        <div className="ctrl-blk" style={{marginBottom:'14px'}}>
          <div className="ctrl-lbl" style={{marginBottom:'5px'}}>Dataset</div>
          <select className="ctrl-sel" id="exp-ds-mob" onChange={(e) => { document.getElementById('exp-ds').value = e.target.value; window.buildExpChart(); }}><option id="exp-ds-opt-mob">&#x2014;</option></select>
        </div>
        <div className="ctrl-blk" style={{marginBottom:'14px'}}>
          <div className="ctrl-lbl" style={{marginBottom:'5px'}}>Metric</div>
          <select className="ctrl-sel" id="exp-metric-mob" onChange={(e) => { document.getElementById('exp-metric').value = e.target.value; window.buildExpChart(); }}>
            <option value="base_issue_size">base_issue_size</option>
            <option value="ytm">ytm</option>
            <option value="clean_price">clean_price</option>
            <option value="volume_cr">volume_cr</option>
            <option value="trade_count">trade_count</option>
          </select>
        </div>
        <div className="ctrl-blk" style={{marginBottom:'14px'}}>
          <div className="ctrl-lbl" style={{marginBottom:'5px'}}>Aggregation</div>
          <select className="ctrl-sel" id="exp-agg-mob" onChange={(e) => { document.getElementById('exp-agg').value = e.target.value; window.buildExpChart(); }}>
            <option>SUM</option><option>AVG</option><option>COUNT</option><option>MIN</option><option>MAX</option>
          </select>
        </div>
        <div className="ctrl-blk" style={{marginBottom:'14px'}}>
          <div className="ctrl-lbl" style={{marginBottom:'5px'}}>Periodicity</div>
          <select className="ctrl-sel" id="exp-period-mob" onChange={(e) => { document.getElementById('exp-period').value = e.target.value; window.buildExpChart(); }}>
            <option>YEARLY</option><option>QUARTERLY</option><option>MONTHLY</option>
          </select>
        </div>
        <div className="ctrl-blk" style={{marginBottom:'14px'}}>
          <div className="ctrl-lbl" style={{marginBottom:'5px'}}>Date Attribute</div>
          <select className="ctrl-sel" id="exp-dateattr-mob" onChange={(e) => { document.getElementById('exp-dateattr').value = e.target.value; }}>
            <option>Bidding Date</option><option>Issue Date</option><option>Maturity Date</option><option>Allotment Date</option>
          </select>
        </div>
        <div className="ctrl-blk" style={{marginBottom:'20px'}}>
          <div className="ctrl-lbl" style={{marginBottom:'5px'}}>Filter by Dimension</div>
          <select className="ctrl-sel" id="exp-dim-mob" onChange={(e) => { document.getElementById('exp-dim').value = e.target.value; }}>
            <option>All Dimensions</option><option>NSE EBP</option><option>RBI</option><option>SEBI</option>
          </select>
        </div>
        <button className="btn btn-primary" style={{width:'100%',justifyContent:'center'}} onClick={() => { window.buildExpChart(); window.closePanel('pivot'); }}>
          Build Chart
        </button>
      </div>
    </div>
  );
}
