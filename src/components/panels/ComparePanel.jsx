import React from 'react';

export default function ComparePanel() {
  return (
    <div className="slide-panel panel-compare" id="panel-compare">
      <div className="panel-head">
        <div className="panel-title">Compare Bonds</div>
        <div className="panel-close" onClick={() => window.closePanel('compare')}>&#x2715;</div>
      </div>
      <div className="panel-body">
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '48px 20px', gap: 8, color: 'var(--tx3)', textAlign: 'center',
        }}>
          <div style={{ fontSize: 28, opacity: 0.3 }}>⇄</div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx2)' }}>No bonds selected</div>
          <div style={{ fontSize: 11 }}>Select two bonds from the catalog to compare them here</div>
        </div>
      </div>
    </div>
  );
}
