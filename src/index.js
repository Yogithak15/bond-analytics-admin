import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// ResizeObserver fires "loop completed" when chart resize callbacks cause layout changes
// fast enough to outpace notification delivery. Wrapping callbacks in rAF breaks the
// synchronous loop so the error is never fired in the first place.
if (typeof window.ResizeObserver !== 'undefined') {
  const _RO = window.ResizeObserver;
  window.ResizeObserver = class ResizeObserver extends _RO {
    constructor(cb) {
      super((entries, observer) => {
        window.requestAnimationFrame(() => { if (entries.length) cb(entries, observer); });
      });
    }
  };
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
