import React from 'react';

export default function SourceUrlsModal() {
  return (
    <div className="modal-ov" id="modal-ov" onClick={(e) => { if (e.target === e.currentTarget) window.closeModal(); }}>
      <div className="modal">
        <div className="modal-head">
          <div>
            <div className="modal-title">Source URLs</div>
            <div className="modal-sub" id="modal-ds">&#x2014;</div>
          </div>
          <div className="modal-x" onClick={() => window.closeModal()}>&#x2715;</div>
        </div>
        <div className="modal-body" id="modal-body"></div>
        <div className="modal-foot"><button className="btn-modal-x" onClick={() => window.closeModal()}>Close</button></div>
      </div>
    </div>
  );
}
