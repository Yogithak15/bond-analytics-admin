import React from 'react';

export default function WatchlistPanel() {
  return (
    <div className="slide-panel panel-watchlist" id="panel-watchlist">
      <div className="panel-head">
        <div className="panel-title">Watchlist <span style={{fontSize:'11px',color:'var(--tx3)',fontWeight:400,marginLeft:'5px'}}>0 bonds</span></div>
        <div className="panel-close" onClick={() => window.closePanel('watchlist')}>&#x2715;</div>
      </div>
      <div className="panel-body">
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '40px 20px', gap: 8, color: 'var(--tx3)', textAlign: 'center',
        }}>
          <div style={{ fontSize: 28, opacity: 0.3 }}>☆</div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx2)' }}>No bonds in watchlist</div>
          <div style={{ fontSize: 11 }}>Add bonds from the catalog to track them here</div>
        </div>
        <div><button className="btn btn-primary" style={{width:'100%',justifyContent:'center'}}>+ Add Bond to Watchlist</button></div>
      </div>
    </div>
  );
}
