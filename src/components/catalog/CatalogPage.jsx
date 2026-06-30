import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { getDataSources, getDataSourceMetrics, getDataSourceDimensionTypes, getAllDimensions, getDataSourceUrls } from '../../api/bond_api';
import { useThemeWatcher } from '../../hooks/useThemeWatcher';

// ─── design tokens — all CSS vars so they auto-adapt to any theme ─────────────
const C = {
  blue:'var(--blue)', blueLt:'var(--blue-s)', blueMid:'#DBEAFE',
  text:'var(--tx)', textSec:'var(--tx2)', textMut:'var(--tx3)', textFaint:'var(--tx4)',
  bg:'var(--bg)', card:'var(--sf)', hdr:'#F9FAFB',
  border:'#E5E7EB', borderStr:'#D1D5DB', hoverRow:'#F5F9FF',
  success:'var(--green)', successLt:'var(--green-s)',
  danger:'var(--red)',
  shadowSm:'var(--shsm)',
  shadowMd:'var(--shmd)',
  shadowHov:'0 8px 20px -4px rgba(37,99,235,.15)',
};

// Badge style maps — computed per-theme inside the component (see mkBadgeStyles)
function mkBadgeStyles(isDark) {
  const SRC = isDark ? {
    rbi:  {background:'rgba(37,99,235,.18)', color:'#93C5FD',border:'1px solid rgba(37,99,235,.35)'},
    nse:  {background:'rgba(22,163,74,.18)',  color:'#86EFAC',border:'1px solid rgba(22,163,74,.35)'},
    sebi: {background:'rgba(245,158,11,.18)', color:'#FCD34D',border:'1px solid rgba(245,158,11,.35)'},
    ccil: {background:'rgba(109,63,192,.18)', color:'#C4B5FD',border:'1px solid rgba(109,63,192,.35)'},
    fbil: {background:'rgba(14,116,144,.18)', color:'#67E8F9', border:'1px solid rgba(14,116,144,.35)'},
    bse:  {background:'rgba(234,88,12,.18)',  color:'#FDBA74', border:'1px solid rgba(234,88,12,.35)'},
    amfi: {background:'rgba(107,33,168,.18)', color:'#D8B4FE',border:'1px solid rgba(107,33,168,.35)'},
    other:{background:'rgba(107,114,128,.18)',color:'#D1D5DB',border:'1px solid rgba(107,114,128,.35)'},
  } : {
    rbi:  {background:'#EFF6FF',color:'#1D4ED8',border:'1px solid #BFDBFE'},
    nse:  {background:'#F0FDF4',color:'#166534',border:'1px solid #BBF7D0'},
    sebi: {background:'#FFFBEB',color:'#92400E',border:'1px solid #FDE68A'},
    ccil: {background:'#F5F3FF',color:'#5B21B6',border:'1px solid #DDD6FE'},
    fbil: {background:'#ECFEFF',color:'#155E75',border:'1px solid #A5F3FC'},
    bse:  {background:'#FFF7ED',color:'#9A3412',border:'1px solid #FED7AA'},
    amfi: {background:'#FDF4FF',color:'#6B21A8',border:'1px solid #E9D5FF'},
    other:{background:'#F9FAFB',color:'#374151',border:'1px solid #E5E7EB'},
  };
  const FREQ = isDark ? {
    daily:    {background:'rgba(22,163,74,.18)',  color:'#86EFAC',border:'1px solid rgba(22,163,74,.35)'},
    weekly:   {background:'rgba(37,99,235,.18)',  color:'#93C5FD',border:'1px solid rgba(37,99,235,.35)'},
    monthly:  {background:'rgba(245,158,11,.18)', color:'#FCD34D',border:'1px solid rgba(245,158,11,.35)'},
    quarterly:{background:'rgba(109,63,192,.18)', color:'#C4B5FD',border:'1px solid rgba(109,63,192,.35)'},
    yearly:   {background:'rgba(234,88,12,.18)',  color:'#FDBA74', border:'1px solid rgba(234,88,12,.35)'},
  } : {
    daily:    {background:'#F0FDF4',color:'#166534',border:'1px solid #BBF7D0'},
    weekly:   {background:'#EFF6FF',color:'#1D4ED8',border:'1px solid #BFDBFE'},
    monthly:  {background:'#FFFBEB',color:'#92400E',border:'1px solid #FDE68A'},
    quarterly:{background:'#F5F3FF',color:'#5B21B6',border:'1px solid #DDD6FE'},
    yearly:   {background:'#FFF7ED',color:'#9A3412',border:'1px solid #FED7AA'},
  };
  const STATUS = isDark ? {
    active:  {bg:'rgba(22,163,74,.18)',  color:'#86EFAC',dot:'#4ADE80',label:'Active'},
    inactive:{bg:'rgba(107,114,128,.18)',color:'#9CA3AF',dot:'#6B7280',label:'Inactive'},
    pending: {bg:'rgba(245,158,11,.18)', color:'#FCD34D',dot:'#FBBF24',label:'Pending'},
    failed:  {bg:'rgba(239,68,68,.18)',  color:'#FCA5A5',dot:'#F87171',label:'Failed'},
  } : {
    active:  {bg:'#F0FDF4',color:'#166534',dot:'#22C55E',label:'Active'},
    inactive:{bg:'#F9FAFB',color:'#6B7280',dot:'#9CA3AF',label:'Inactive'},
    pending: {bg:'#FFFBEB',color:'#92400E',dot:'#F59E0B',label:'Pending'},
    failed:  {bg:'#FEF2F2',color:'#991B1B',dot:'#EF4444',label:'Failed'},
  };
  const ACCENT = isDark ? {
    blue:  {bg:'rgba(37,99,235,.2)',  ic:'#93C5FD'},
    green: {bg:'rgba(22,163,74,.2)',  ic:'#86EFAC'},
    purple:{bg:'rgba(109,63,192,.2)', ic:'#C4B5FD'},
    orange:{bg:'rgba(217,119,6,.2)',  ic:'#FCD34D'},
  } : {
    blue:  {bg:'#EFF6FF',ic:'#2563EB'},
    green: {bg:'#DCFCE7',ic:'#16A34A'},
    purple:{bg:'#EDE9FE',ic:'#7C3AED'},
    orange:{bg:'#FEF3C7',ic:'#D97706'},
  };
  return { SRC, FREQ, STATUS, ACCENT };
}

// ─── helpers ──────────────────────────────────────────────────────────────────
function useWindowWidth() {
  const [w, setW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return w;
}

function extractPeriodFromS3Url(url) {
  if (!url) return null;
  try { const m = new URL(url).pathname.match(/\/(\d{4}[^/]*)\//); return m ? m[1] : null; }
  catch { return null; }
}

function relativeTime(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d)) return '';
    const days = Math.floor((Date.now() - d.getTime()) / 86400000);
    if (days < 0)  return '';
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7)  return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    if (days < 365) return `${Math.floor(days / 30)}mo ago`;
    return `${Math.floor(days / 365)}y ago`;
  } catch { return ''; }
}

function exportCSV(rows) {
  const h = ['Dataset','Identifier','Source','Frequency','Metrics','Dimensions','Last Updated','Status'];
  const b = rows.map(d => [`"${(d.title||'').replace(/"/g,'""')}"`,d.id,d.srcLabel,d.freq,d.metrics,d.dims,d.updated,d.status].join(','));
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([[h.join(','),...b].join('\n')],{type:'text/csv'})),
    download:'bond-analytics-datasets.csv',
  });
  a.click();
}

function mapSource(raw) {
  const sn = (raw.source_name||'').toLowerCase();
  let src='other';
  if(sn.includes('nse')) src='nse';
  else if(sn.includes('rbi')) src='rbi';
  else if(sn.includes('sebi')) src='sebi';
  else if(sn.includes('ccil')) src='ccil';
  else if(sn.includes('fbil')) src='fbil';
  else if(sn.includes('bse')) src='bse';
  else if(sn.includes('amfi')) src='amfi';
  const rf=(raw.update_interval||raw.frequency||'').toLowerCase();
  let freq='weekly';
  if(rf.includes('daily')) freq='daily';
  else if(rf.includes('month')) freq='monthly';
  else if(rf.includes('quarter')) freq='quarterly';
  let updated=raw.updated_at||raw.last_updated||'';
  if(updated){try{const d=new Date(updated);if(!isNaN(d))updated=d.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});}catch(_){}}
  const rawId=raw.data_source_id??raw.source_id??raw.id;
  return {
    sourceId:rawId||undefined,
    id:raw.dataset_code||String(rawId||''),
    title:raw.dataset_name||raw.name||raw.title||'Untitled Dataset',
    src,srcLabel:raw.source_name||src.toUpperCase(),
    freq,metrics:0,dims:0,updated,
    createdAt:raw.created_at||'',
    status:raw.is_active===false?'inactive':'active',
    desc:raw.description||'',cat:raw.category||'',
  };
}

async function openSourceUrlsModal(sourceId, title) {
  const bodyEl=document.getElementById('modal-body');
  const dsEl=document.getElementById('modal-ds');
  const modalEl=document.getElementById('modal-ov');
  if(!modalEl)return;
  if(dsEl)dsEl.textContent=title;
  if(bodyEl)bodyEl.innerHTML='<div style="padding:24px;text-align:center;font-size:12px;color:#6B7280">Loading…</div>';
  modalEl.classList.add('on');
  try{
    const urls=await getDataSourceUrls(sourceId);
    const list=(Array.isArray(urls)?urls:[]).filter(i=>i.s3_url);
    if(!bodyEl)return;
    if(!list.length){bodyEl.innerHTML='<div style="padding:24px;text-align:center;font-size:12px;color:#6B7280">No source URLs found.</div>';return;}
    bodyEl.innerHTML=list.map((item,i)=>{
      const period=extractPeriodFromS3Url(item.s3_url)||item.name||`File ${i+1}`;
      const note=(item.note||'').replace(/"/g,'&quot;');
      const href=item.s3_url.replace(/'/g,'%27');
      return `<div class="src-item"${note?` title="${note}"`:''}><div class="src-ico"><svg viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></div><div style="flex:1;min-width:0"><div class="src-name">${period}</div>${note?`<div class="src-note">${note}</div>`:''}</div><button class="btn-src" onclick="window.open('${href}','_blank')">Download <svg viewBox="0 0 24 24"><polyline points="15 3 21 3 21 9"/><line x1="21" y1="3" x2="14" y2="10"/></svg></button></div>`;
    }).join('');
  }catch{if(bodyEl)bodyEl.innerHTML='<div style="padding:24px;text-align:center;font-size:12px;color:#EF4444">Failed to load.</div>';}
}

// ─── StatCard ─────────────────────────────────────────────────────────────────
function StatCard({ icon, title, value, desc, accent, loading, enriching, isMobile, isDark }) {
  const [hov,setHov]=useState(false);
  const ACCENT = isDark ? {
    blue:  {bg:'rgba(37,99,235,.2)',  ic:'#93C5FD'},
    green: {bg:'rgba(22,163,74,.2)',  ic:'#86EFAC'},
    purple:{bg:'rgba(109,63,192,.2)', ic:'#C4B5FD'},
    orange:{bg:'rgba(217,119,6,.2)',  ic:'#FCD34D'},
  } : {
    blue:  {bg:'#EFF6FF',ic:'#2563EB'},
    green: {bg:'#DCFCE7',ic:'#16A34A'},
    purple:{bg:'#EDE9FE',ic:'#7C3AED'},
    orange:{bg:'#FEF3C7',ic:'#D97706'},
  };
  const a=ACCENT[accent]||ACCENT.blue;
  return(
    <div onMouseOver={()=>setHov(true)} onMouseOut={()=>setHov(false)} style={{
      background:C.card,border:`1px solid ${hov?C.borderStr:C.border}`,
      borderRadius:10,padding:isMobile?'14px 16px':'16px 18px',
      display:'flex',alignItems:'center',gap:14,
      transform:hov?'translateY(-2px)':'translateY(0)',
      transition:'all .18s ease',
    }}>
      <div style={{width:44,height:44,borderRadius:10,background:a.bg,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke={a.ic} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{icon}</svg>
      </div>
      <div style={{minWidth:0}}>
        {loading
          ?<div style={{height:28,width:60,background:'#F3F4F6',borderRadius:5,marginBottom:4}}/>
          :<div style={{fontSize:isMobile?22:28,fontWeight:700,color:C.text,lineHeight:1,fontVariantNumeric:'tabular-nums',letterSpacing:'-0.5px'}}>
            {typeof value==='number'?value.toLocaleString('en-IN'):value}
            {enriching&&<span style={{fontSize:10,color:C.textFaint,marginLeft:4,fontWeight:400}}>…</span>}
          </div>
        }
        <div style={{fontSize:12,fontWeight:600,color:C.textSec,marginTop:3}}>{title}</div>
        <div style={{fontSize:11,color:C.textFaint,marginTop:1}}>{desc}</div>
      </div>
    </div>
  );
}

function StatusPill({status,isDark}){
  const STATUS = isDark ? {
    active:  {bg:'rgba(22,163,74,.18)',  color:'#86EFAC',dot:'#4ADE80',label:'Active'},
    inactive:{bg:'rgba(107,114,128,.18)',color:'#9CA3AF',dot:'#6B7280',label:'Inactive'},
    pending: {bg:'rgba(245,158,11,.18)', color:'#FCD34D',dot:'#FBBF24',label:'Pending'},
    failed:  {bg:'rgba(239,68,68,.18)',  color:'#FCA5A5',dot:'#F87171',label:'Failed'},
  } : {
    active:  {bg:'#F0FDF4',color:'#166534',dot:'#22C55E',label:'Active'},
    inactive:{bg:'#F9FAFB',color:'#6B7280',dot:'#9CA3AF',label:'Inactive'},
    pending: {bg:'#FFFBEB',color:'#92400E',dot:'#F59E0B',label:'Pending'},
    failed:  {bg:'#FEF2F2',color:'#991B1B',dot:'#EF4444',label:'Failed'},
  };
  const cfg=STATUS[status]||STATUS.inactive;
  return(
    <span style={{display:'inline-flex',alignItems:'center',gap:5,fontSize:11.5,fontWeight:600,padding:'3px 9px',borderRadius:20,background:cfg.bg,color:cfg.color,whiteSpace:'nowrap'}}>
      <span style={{width:5,height:5,borderRadius:'50%',background:cfg.dot,flexShrink:0}}/>
      {cfg.label}
    </span>
  );
}

function ActionBtn({title:tip,onClick,children}){
  const [hov,setHov]=useState(false);
  return(
    <button title={tip} onClick={onClick} onMouseOver={()=>setHov(true)} onMouseOut={()=>setHov(false)} style={{
      width:28,height:28,borderRadius:7,border:`1px solid ${hov?C.borderStr:C.border}`,
      background:hov?C.blueLt:C.card,color:hov?C.blue:C.textFaint,
      display:'flex',alignItems:'center',justifyContent:'center',
      cursor:'pointer',transition:'all .14s',transform:hov?'scale(1.08)':'scale(1)',flexShrink:0,
    }}>
      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
    </button>
  );
}

function SortIcon({active,dir}){
  return(
    <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke={active?C.blue:C.textFaint} strokeWidth="2.5" strokeLinecap="round">
      {dir==='asc'?<><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></>:<><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></>}
    </svg>
  );
}

function SkeletonRow(){
  const p={background:'linear-gradient(90deg,#F3F4F6 25%,#E9EAEC 50%,#F3F4F6 75%)',backgroundSize:'200% 100%',animation:'skel-shimmer 1.4s ease-in-out infinite',borderRadius:4};
  return(
    <tr>
      <td style={{padding:'11px 12px'}}><div style={{display:'flex',alignItems:'center',gap:8}}><div style={{width:30,height:30,borderRadius:7,...p}}/><div><div style={{height:11,width:140,...p,marginBottom:5}}/><div style={{height:9,width:90,...p}}/></div></div></td>
      <td style={{padding:'11px 12px'}}><div style={{height:20,width:44,borderRadius:20,...p}}/></td>
      <td style={{padding:'11px 12px'}}><div style={{height:20,width:54,borderRadius:20,...p}}/></td>
      <td style={{padding:'11px 12px'}}><div style={{height:11,width:60,...p}}/></td>
      <td style={{padding:'11px 12px'}}><div style={{height:11,width:80,...p}}/></td>
      <td style={{padding:'11px 12px'}}><div style={{height:11,width:70,...p}}/></td>
      <td style={{padding:'11px 12px'}}><div style={{height:20,width:56,borderRadius:20,...p}}/></td>
      <td style={{padding:'11px 12px'}}><div style={{display:'flex',gap:5}}><div style={{width:28,height:28,borderRadius:7,...p}}/><div style={{width:28,height:28,borderRadius:7,...p}}/></div></td>
    </tr>
  );
}

function PreviewDrawer({ds,onClose,favorites,toggleFav,isDark}){
  const fav=favorites.has(ds.sourceId);
  const {SRC}=mkBadgeStyles(isDark);
  return(
    <>
      <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.18)',zIndex:999,backdropFilter:'blur(2px)'}}/>
      <div style={{position:'fixed',top:0,right:0,bottom:0,width:'min(400px, 95vw)',background:C.card,borderLeft:`1px solid ${C.border}`,boxShadow:'-16px 0 40px rgba(0,0,0,.1)',zIndex:1000,display:'flex',flexDirection:'column',fontFamily:'inherit',overflowY:'auto'}}>
        <div style={{padding:'16px 18px',borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'flex-start',gap:10,flexShrink:0}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:'flex',gap:6,marginBottom:5,flexWrap:'wrap'}}>
              <span style={{...SRC[ds.src]||SRC.other,fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:20,display:'inline-flex'}}>{ds.srcLabel}</span>
              <StatusPill status={ds.status} isDark={isDark}/>
            </div>
            <div style={{fontSize:15,fontWeight:700,color:C.text,lineHeight:1.3}}>{ds.title}</div>
            <div style={{fontSize:10.5,color:C.textFaint,fontFamily:'monospace',marginTop:3}}>{ds.id}</div>
          </div>
          <div style={{display:'flex',gap:5,flexShrink:0}}>
            <button onClick={()=>toggleFav(ds.sourceId)} style={{width:30,height:30,borderRadius:7,border:`1px solid ${C.border}`,background:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:fav?'#F59E0B':C.textFaint}}>
              <svg viewBox="0 0 24 24" width="14" height="14" fill={fav?'#F59E0B':'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            </button>
            <button onClick={onClose} style={{width:30,height:30,borderRadius:7,border:`1px solid ${C.border}`,background:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:C.textMut}}>
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',borderBottom:`1px solid ${C.border}`}}>
          {[{l:'Frequency',v:ds.freq.charAt(0).toUpperCase()+ds.freq.slice(1)},{l:'Metrics',v:ds.metrics||'—'},{l:'Dimensions',v:ds.dims?ds.dims.toLocaleString('en-IN'):'—'}].map((s,i)=>(
            <div key={i} style={{padding:'12px 14px',borderRight:i<2?`1px solid ${C.border}`:'none'}}>
              <div style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'.07em',color:C.textFaint,marginBottom:3}}>{s.l}</div>
              <div style={{fontSize:18,fontWeight:700,color:C.text}}>{s.v}</div>
            </div>
          ))}
        </div>
        {ds.desc&&<div style={{padding:'14px 18px',borderBottom:`1px solid ${C.border}`}}><div style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'.07em',color:C.textFaint,marginBottom:6}}>Description</div><div style={{fontSize:12.5,color:C.textSec,lineHeight:1.6}}>{ds.desc}</div></div>}
        <div style={{padding:'14px 18px',borderBottom:`1px solid ${C.border}`}}>
          <div style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'.07em',color:C.textFaint,marginBottom:6}}>Last Updated</div>
          <div style={{fontSize:13,color:C.text,fontWeight:500}}>{ds.updated||'—'}</div>
          {ds.updated&&<div style={{fontSize:11,color:C.textFaint,marginTop:1}}>{relativeTime(ds.updated)}</div>}
        </div>
        <div style={{padding:'16px 18px',marginTop:'auto',flexShrink:0}}>
          <button onClick={()=>{onClose();window.openDetail?.(ds.sourceId);}} style={{width:'100%',padding:'9px 0',borderRadius:9,background:C.blue,color:'#fff',border:'none',fontSize:13,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6,transition:'opacity .15s'}} onMouseOver={e=>e.currentTarget.style.opacity='.88'} onMouseOut={e=>e.currentTarget.style.opacity='1'}>
            Open Full Analysis
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </button>
        </div>
      </div>
    </>
  );
}

function TableRow({d,isFav,onFav,onPreview,isDark}){
  const [hov,setHov]=useState(false);
  const {SRC,FREQ}=mkBadgeStyles(isDark);
  const ss=SRC[d.src]||SRC.other;
  const fs=FREQ[d.freq]||FREQ.weekly;
  return(
    <tr onMouseOver={()=>setHov(true)} onMouseOut={()=>setHov(false)} style={{background:hov?C.hoverRow:C.card,transition:'background .1s',borderBottom:`1px solid ${C.border}`}}>
      <td style={{padding:'10px 12px',maxWidth:220}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <div style={{minWidth:0}}>
            <div onClick={()=>onPreview(d)} title={d.title} style={{fontSize:13,fontWeight:600,color:hov?C.blue:C.text,cursor:'pointer',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:190,transition:'color .12s'}}>
              {d.title}
            </div>
            <div title={d.id} style={{fontSize:10,color:C.textFaint,fontFamily:'monospace',marginTop:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:190}}>
              {d.id}
            </div>
          </div>
          {isFav&&<span style={{color:'#F59E0B',flexShrink:0,fontSize:11,lineHeight:1}}>★</span>}
        </div>
      </td>
      <td style={{padding:'10px 12px'}}>
        <span style={{...ss,fontSize:10.5,fontWeight:700,padding:'2px 8px',borderRadius:20,display:'inline-flex',whiteSpace:'nowrap'}}>{d.srcLabel}</span>
      </td>
      <td style={{padding:'10px 12px'}}>
        <span style={{...fs,fontSize:10.5,fontWeight:600,padding:'2px 8px',borderRadius:20,display:'inline-flex',whiteSpace:'nowrap'}}>{d.freq.charAt(0).toUpperCase()+d.freq.slice(1)}</span>
      </td>
      <td style={{padding:'10px 12px',whiteSpace:'nowrap'}}>
        <span style={{fontSize:13,fontWeight:700,color:C.text,fontVariantNumeric:'tabular-nums'}}>{d.metrics}</span>
        <span style={{fontSize:10.5,color:C.textFaint,marginLeft:3}}>metrics</span>
      </td>
      <td style={{padding:'10px 12px',whiteSpace:'nowrap'}}>
        <span style={{fontSize:13,fontWeight:600,color:C.textSec,fontVariantNumeric:'tabular-nums'}}>{d.dims.toLocaleString('en-IN')}</span>
        <span style={{fontSize:10.5,color:C.textFaint,marginLeft:3}}>dims</span>
      </td>
      <td style={{padding:'10px 12px',minWidth:100}}>
        <div style={{fontSize:12.5,color:C.textSec,fontWeight:500}}>{d.updated||'—'}</div>
        {d.updated&&<div style={{fontSize:10.5,color:C.textFaint,marginTop:1}}>{relativeTime(d.updated)}</div>}
      </td>
      <td style={{padding:'10px 12px'}}><StatusPill status={d.status} isDark={isDark}/></td>
      <td style={{padding:'10px 12px'}}>
        <div style={{display:'flex',gap:4}}>
          <ActionBtn title="Full Analysis" onClick={()=>window.openDetail?.(d.sourceId)}>
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </ActionBtn>
          <ActionBtn title="Quick Preview" onClick={()=>onPreview(d)}>
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
          </ActionBtn>
          {/* <ActionBtn title={isFav?'Unstar':'Star'} onClick={()=>onFav(d.sourceId)}>
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill={isFav?'#F59E0B':'none'} stroke={isFav?'#F59E0B':'currentColor'}/>
          </ActionBtn> */}
          <ActionBtn title="Source files" onClick={()=>openSourceUrlsModal(d.sourceId,d.title)}>
            <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
          </ActionBtn>
        </div>
      </td>
    </tr>
  );
}

function SkeletonGridCard(){
  const p={background:'linear-gradient(90deg,#F3F4F6 25%,#E9EAEC 50%,#F3F4F6 75%)',backgroundSize:'200% 100%',animation:'skel-shimmer 1.4s ease-in-out infinite',borderRadius:4};
  return(
    <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:14,display:'flex',flexDirection:'column',gap:10}}>
      <div><div style={{height:13,width:'78%',...p,marginBottom:6}}/><div style={{height:9,width:'50%',...p}}/></div>
      <div style={{display:'flex',gap:5}}><div style={{height:18,width:44,borderRadius:20,...p}}/><div style={{height:18,width:54,borderRadius:20,...p}}/><div style={{height:18,width:50,borderRadius:20,...p}}/></div>
      <div style={{display:'flex',gap:12,borderTop:`1px solid ${C.border}`,paddingTop:8}}>
        <div><div style={{height:16,width:28,...p,marginBottom:4}}/><div style={{height:9,width:40,...p}}/></div>
        <div><div style={{height:16,width:36,...p,marginBottom:4}}/><div style={{height:9,width:60,...p}}/></div>
      </div>
    </div>
  );
}

function GridCard({d,isFav,onFav,onPreview,isDark}){
  const [hov,setHov]=useState(false);
  const {SRC,FREQ}=mkBadgeStyles(isDark);
  const ss=SRC[d.src]||SRC.other;
  const fs=FREQ[d.freq]||FREQ.weekly;
  return(
    <div onMouseOver={()=>setHov(true)} onMouseOut={()=>setHov(false)} style={{
      background:C.card,border:`1px solid ${hov?C.borderStr:C.border}`,borderRadius:10,
      padding:14,display:'flex',flexDirection:'column',gap:10,
      transform:hov?'translateY(-2px)':'none',transition:'all .15s',
    }}>
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:8}}>
        <div style={{minWidth:0,flex:1}}>
          <div onClick={()=>onPreview(d)} style={{fontSize:13,fontWeight:700,color:hov?C.blue:C.text,cursor:'pointer',lineHeight:1.4,transition:'color .12s',overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical'}}>
            {d.title}
          </div>
          <div style={{fontSize:10,color:C.textFaint,fontFamily:'monospace',marginTop:3,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
            {d.id}
          </div>
        </div>
        {isFav&&<span style={{color:'#F59E0B',flexShrink:0,fontSize:13,lineHeight:1}}>★</span>}
      </div>
      <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
        <span style={{...ss,fontSize:10,fontWeight:700,padding:'2px 7px',borderRadius:20,display:'inline-flex',whiteSpace:'nowrap'}}>{d.srcLabel}</span>
        <span style={{...fs,fontSize:10,fontWeight:600,padding:'2px 7px',borderRadius:20,display:'inline-flex',whiteSpace:'nowrap'}}>{d.freq.charAt(0).toUpperCase()+d.freq.slice(1)}</span>
        <StatusPill status={d.status} isDark={isDark}/>
      </div>
      <div style={{display:'flex',alignItems:'flex-end',gap:12,borderTop:`1px solid ${C.border}`,paddingTop:8}}>
        <div>
          <div style={{fontSize:16,fontWeight:700,color:C.text,fontVariantNumeric:'tabular-nums',lineHeight:1}}>{d.metrics}</div>
          <div style={{fontSize:10,color:C.textFaint,marginTop:2}}>Metrics</div>
        </div>
        <div>
          <div style={{fontSize:16,fontWeight:700,color:C.text,fontVariantNumeric:'tabular-nums',lineHeight:1}}>{d.dims.toLocaleString('en-IN')}</div>
          <div style={{fontSize:10,color:C.textFaint,marginTop:2}}>Dimensions</div>
        </div>
        {d.updated&&<div style={{marginLeft:'auto',textAlign:'right'}}>
          <div style={{fontSize:11,color:C.textSec,fontWeight:500}}>{d.updated}</div>
          <div style={{fontSize:10,color:C.textFaint}}>{relativeTime(d.updated)}</div>
        </div>}
      </div>
      <div style={{display:'flex',gap:4,justifyContent:'flex-end'}}>
        <ActionBtn title="Full Analysis" onClick={()=>window.openDetail?.(d.sourceId)}>
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
        </ActionBtn>
        <ActionBtn title="Quick Preview" onClick={()=>onPreview(d)}>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
        </ActionBtn>
        <ActionBtn title="Source files" onClick={()=>openSourceUrlsModal(d.sourceId,d.title)}>
          <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
        </ActionBtn>
      </div>
    </div>
  );
}

function PgBtn({children,disabled,active,onClick,title}){
  const [hov,setHov]=useState(false);
  return(
    <button onClick={onClick} disabled={disabled} title={title} onMouseOver={()=>setHov(true)} onMouseOut={()=>setHov(false)} style={{minWidth:30,height:30,padding:'0 7px',borderRadius:6,border:`1px solid ${active?C.blue:C.border}`,background:active?C.blue:hov&&!disabled?C.blueLt:C.card,color:active?'#fff':disabled?C.textFaint:hov?C.blue:C.textSec,fontSize:12.5,fontWeight:active?700:400,cursor:disabled?'not-allowed':'pointer',transition:'all .13s'}}>
      {children}
    </button>
  );
}

function buildPages(page,total){
  if(total<=7)return Array.from({length:total},(_,i)=>i+1);
  if(page<=4) return[1,2,3,4,5,'…',total];
  if(page>=total-3)return[1,'…',total-4,total-3,total-2,total-1,total];
  return[1,'…',page-1,page,page+1,'…',total];
}

// ─── main ─────────────────────────────────────────────────────────────────────
export default function CatalogPage({isActive}){
  useThemeWatcher();
  const isDark=document.documentElement.getAttribute('data-theme')==='dark';
  // Override structural colors — the app's --bdr vars are too strong for this page's design
  C.border    = isDark ? 'rgba(255,255,255,.1)'  : '#E5E7EB';
  C.borderStr = isDark ? 'rgba(255,255,255,.18)' : '#D1D5DB';
  C.hdr       = isDark ? 'rgba(255,255,255,.04)' : '#F9FAFB';
  C.hoverRow  = isDark ? 'rgba(255,255,255,.05)' : '#F5F9FF';
  C.blueMid   = isDark ? 'rgba(37,99,235,.3)'    : '#DBEAFE';
  C.shadowHov = isDark ? '0 8px 20px rgba(37,99,235,.3)' : '0 8px 20px -4px rgba(37,99,235,.15)';
  const w=useWindowWidth();
  const isMobile=w<640;
  const isTablet=w>=640&&w<1024;

  const [datasets,setDatasets]=useState([]);
  const [loading,setLoading]=useState(false);
  const [enriching,setEnriching]=useState(false);
  const [error,setError]=useState(null);
  const [search,setSearch]=useState('');
  const [srcFilter,setSrcFilter]=useState('all');
  const [freqFilter,setFreqFilter]=useState('all');
  const [statusFilter,setStatusFilter]=useState('all');
  const [sortCol,setSortCol]=useState('created');
  const [sortDir,setSortDir]=useState('desc');
  const [page,setPage]=useState(1);
  const [favorites,setFavorites]=useState(()=>{try{return new Set(JSON.parse(localStorage.getItem('bb-fav')||'[]'));}catch{return new Set();}});
  const [preview,setPreview]=useState(null);
  const [filtersOpen,setFiltersOpen]=useState(false);
  const [viewMode,setViewMode]=useState('table');
  const searchRef=useRef(null);
  const PAGE_SIZE=isMobile?8:12;

  const toggleFav=useCallback((id)=>{
    setFavorites(prev=>{const n=new Set(prev);n.has(id)?n.delete(id):n.add(id);try{localStorage.setItem('bb-fav',JSON.stringify([...n]));}catch{}return n;});
  },[]);

  useEffect(()=>{
    const h=(e)=>{if((e.ctrlKey||e.metaKey)&&e.key==='k'){e.preventDefault();searchRef.current?.focus();}};
    window.addEventListener('keydown',h);
    return()=>window.removeEventListener('keydown',h);
  },[]);

  const loadData=useCallback(async()=>{
    setLoading(true);setError(null);
    try{
      const PG=50;let skip=0;const all=[];
      while(true){
        const p=await getDataSources(skip,PG);
        const rows=Array.isArray(p)?p:(p.items||p.data||[]);
        if(!rows.length)break;
        all.push(...rows);
        if(rows.length<PG)break;
        skip+=PG;
      }
      const mapped=all.map(mapSource).filter(d=>d.sourceId!==11);
      setDatasets(mapped);window.DATASETS=mapped;setLoading(false);
      window.dispatchEvent(new CustomEvent('catalog-count',{detail:{count:mapped.length}}));
      setEnriching(true);
      const enriched=await Promise.all(mapped.map(async(d)=>{
        try{
          const[mr,dt]=await Promise.all([getDataSourceMetrics(d.sourceId),getDataSourceDimensionTypes(d.sourceId)]);
          let td=0;
          if(Array.isArray(dt)&&dt.length){const dc=await Promise.all(dt.map(t=>getAllDimensions(t.dimension_type_id||t.id)));td=dc.reduce((s,d)=>s+(Array.isArray(d)?d.length:0),0);}
          return{...d,metrics:Array.isArray(mr)?mr.length:0,dims:td};
        }catch{return d;}
      }));
      setDatasets(enriched);window.DATASETS=enriched;
    }catch(err){setError(err.message);setLoading(false);}
    finally{setEnriching(false);}
  },[]);

  useEffect(()=>{loadData();},[loadData]);

  const summary=useMemo(()=>({
    total:datasets.length,
    active:datasets.filter(d=>d.status==='active').length,
    metrics:datasets.reduce((s,d)=>s+(d.metrics||0),0),
    dims:datasets.reduce((s,d)=>s+(d.dims||0),0),
  }),[datasets]);

  const uniqueSources=useMemo(()=>{const m={};datasets.forEach(d=>{m[d.src]=d.srcLabel;});return m;},[datasets]);

  const handleSort=(col)=>{if(sortCol===col)setSortDir(d=>d==='asc'?'desc':'asc');else{setSortCol(col);setSortDir('asc');}setPage(1);};

  const filtered=useMemo(()=>{
    let ds=[...datasets];
    if(srcFilter!=='all')ds=ds.filter(d=>d.src===srcFilter);
    if(statusFilter!=='all')ds=ds.filter(d=>d.status===statusFilter);
    if(freqFilter!=='all')ds=ds.filter(d=>d.freq===freqFilter);
    const q=search.toLowerCase().trim();
    if(q)ds=ds.filter(d=>d.title.toLowerCase().includes(q)||d.id.toLowerCase().includes(q)||d.srcLabel.toLowerCase().includes(q)||d.desc.toLowerCase().includes(q)||d.freq.toLowerCase().includes(q)||d.status.toLowerCase().includes(q));
    const m=sortDir==='asc'?1:-1;
    const sm={
      name:(a,b)=>m*a.title.localeCompare(b.title),
      src:(a,b)=>m*a.srcLabel.localeCompare(b.srcLabel),
      freq:(a,b)=>m*a.freq.localeCompare(b.freq),
      metrics:(a,b)=>m*(a.metrics-b.metrics),
      dims:(a,b)=>m*(a.dims-b.dims),
      updated:(a,b)=>m*a.updated.localeCompare(b.updated),
      created:(a,b)=>m*a.createdAt.localeCompare(b.createdAt),
      status:(a,b)=>m*a.status.localeCompare(b.status),
    };
    if(sm[sortCol])ds.sort(sm[sortCol]);
    return ds;
  },[datasets,srcFilter,statusFilter,freqFilter,search,sortCol,sortDir]);

  useEffect(()=>{setPage(1);},[search,srcFilter,statusFilter,freqFilter,sortCol,sortDir]);

  const totalPages=Math.ceil(filtered.length/PAGE_SIZE);
  const paginated=filtered.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE);
  const hasFilters=search||srcFilter!=='all'||statusFilter!=='all'||freqFilter!=='all';

  const resetFilters=()=>{setSearch('');setSrcFilter('all');setStatusFilter('all');setFreqFilter('all');};


  const COLS=[
    {key:'name',   label:'Dataset',      w:'auto'},
    {key:'src',    label:'Source',       w:90},
    {key:'freq',   label:'Frequency',    w:100},
    {key:'metrics',label:'Metrics',      w:90},
    {key:'dims',   label:'Dimensions',   w:110},
    {key:'updated',label:'Last Updated', w:110},
    {key:'status', label:'Status',       w:90},
    {key:'actions',label:'Actions',      w:130,noSort:true},
  ];

  // responsive: on mobile hide some cols
  const visibleCols=isMobile
    ?COLS.filter(c=>['name','status','actions'].includes(c.key))
    :isTablet
    ?COLS.filter(c=>!['dims'].includes(c.key))
    :COLS;

  // padding based on screen
  const px=isMobile?12:isTablet?20:28;
  const py=isMobile?14:20;

  return(
    <div className={`page${isActive?' on':''}`} id="page-catalog" style={{background:C.bg,color:C.text,fontFamily:'Inter,-apple-system,BlinkMacSystemFont,sans-serif',overflowY:'auto',WebkitOverflowScrolling:'touch'}}>
      <div style={{padding:`${py}px ${px}px 36px`}}>


        {/* Header */}
        <div style={{display:'flex',alignItems:isMobile?'flex-start':'center',justifyContent:'space-between',marginBottom:isMobile?14:18,gap:10,flexWrap:'wrap'}}>
          <div>
            <h1 style={{fontSize:isMobile?20:24,fontWeight:700,color:C.text,letterSpacing:'-.4px',margin:0,lineHeight:1.2}}>Dataset Catalog</h1>
            <p style={{fontSize:isMobile?12:13,color:C.textFaint,margin:'3px 0 0',fontWeight:400}}>Manage datasets, metrics, dimensions and ingestion status.</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr 1fr':isTablet?'1fr 1fr':'repeat(4,1fr)',gap:isMobile?8:12,marginBottom:isMobile?14:18}}>
          <StatCard icon={<><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/></>} title="Total Datasets" value={loading?0:summary.total} desc="All sources" accent="blue" loading={loading} enriching={false} isMobile={isMobile} isDark={isDark}/>
          <StatCard icon={<><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>} title="Active" value={loading?0:summary.active} desc="Datasets" accent="green" loading={loading} enriching={false} isMobile={isMobile} isDark={isDark}/>
          <StatCard icon={<><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>} title="Total Metrics" value={loading?0:summary.metrics} desc="Across datasets" accent="purple" loading={loading} enriching={enriching} isMobile={isMobile} isDark={isDark}/>
          <StatCard icon={<><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></>} title="Dimensions" value={loading?0:summary.dims} desc="Unique values" accent="orange" loading={loading} enriching={enriching} isMobile={isMobile} isDark={isDark}/>
        </div>

        {/* Search + Freq + Status row */}
        <div style={{display:'flex',gap:8,marginBottom:10,alignItems:'center',flexWrap:'wrap'}}>
          <div style={{position:'relative',flex:1,minWidth:160,maxWidth:420}}>
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke={C.textFaint} strokeWidth="2" strokeLinecap="round" style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',pointerEvents:'none'}}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input ref={searchRef} value={search} onChange={e=>setSearch(e.target.value)}
              placeholder={isMobile?'Search…':'Search datasets…'}
              style={{width:'100%',height:34,padding:'0 28px 0 32px',border:`1.5px solid ${C.border}`,borderRadius:8,background:C.card,color:C.text,fontSize:12.5,fontFamily:'inherit',outline:'none',transition:'border-color .15s,box-shadow .15s'}}
              onFocus={e=>{e.target.style.borderColor=C.blue;e.target.style.boxShadow=`0 0 0 3px rgba(37,99,235,.1)`;}}
              onBlur={e=>{e.target.style.borderColor=C.border;e.target.style.boxShadow='none';}}
            />
            {search&&<button onClick={()=>setSearch('')} style={{position:'absolute',right:7,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:C.textFaint,display:'flex',padding:2}}><svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>}
          </div>
          <select value={freqFilter} onChange={e=>setFreqFilter(e.target.value)} style={{marginLeft:'auto',height:34,padding:'0 26px 0 10px',borderRadius:8,border:`1.5px solid ${C.border}`,background:C.card,color:C.textSec,fontSize:12,fontFamily:'inherit',cursor:'pointer',outline:'none',appearance:'none',backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='9' height='9' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2.5' stroke-linecap='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,backgroundRepeat:'no-repeat',backgroundPosition:'right 7px center'}}>
            <option value="all">All Frequencies</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
          </select>
          <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} style={{height:34,padding:'0 26px 0 10px',borderRadius:8,border:`1.5px solid ${C.border}`,background:C.card,color:C.textSec,fontSize:12,fontFamily:'inherit',cursor:'pointer',outline:'none',appearance:'none',backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='9' height='9' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2.5' stroke-linecap='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,backgroundRepeat:'no-repeat',backgroundPosition:'right 7px center'}}>
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          {hasFilters&&(
            <button onClick={resetFilters} style={{height:34,padding:'0 12px',borderRadius:8,border:'none',background:'var(--red)',color:'#fff',fontSize:12,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:4,whiteSpace:'nowrap'}}>
              <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              Reset
            </button>
          )}
        </div>

        {/* Source pill chips */}
        <div style={{display:'flex',flexWrap:'wrap',gap:5,marginBottom:12,alignItems:'center'}}>
          <span style={{fontSize:10.5,color:C.textFaint,fontWeight:700,textTransform:'uppercase',letterSpacing:'.07em',whiteSpace:'nowrap'}}>Source:</span>
          {[{k:'all',v:'All'},...Object.entries(uniqueSources).map(([k,v])=>({k,v}))].map(({k,v})=>{
            const on=srcFilter===k;
            return(
              <button key={k} onClick={()=>setSrcFilter(k)} style={{height:26,padding:'0 11px',borderRadius:20,border:`1px solid ${on?C.blue:C.border}`,background:on?C.blue:'transparent',color:on?'#fff':C.textSec,fontSize:11.5,fontWeight:on?600:400,cursor:'pointer',transition:'all .13s',whiteSpace:'nowrap'}}>
                {v}
              </button>
            );
          })}
        </div>

        {/* Table card */}
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,overflow:'hidden'}}>

          {/* Top bar: count + filters + view toggle */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',borderBottom:`1px solid ${C.border}`,gap:8,flexWrap:'wrap'}}>
            <div style={{fontSize:12.5,color:C.textMut}}>
              {loading?'Loading…':<>
                Showing <span style={{fontWeight:600,color:C.text}}>{filtered.length}</span> dataset{filtered.length!==1?'s':''}
                {enriching&&<span style={{marginLeft:6,fontSize:10.5,color:C.textFaint}}>· loading counts…</span>}
              </>}
            </div>
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <div style={{display:'flex',gap:4}}>
                {[
                  {m:'table',icon:<><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>},
                  {m:'grid', icon:<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>},
                ].map(({m,icon})=>(
                  <button key={m} onClick={()=>setViewMode(m)} title={m==='table'?'Table view':'Grid view'} style={{width:28,height:28,borderRadius:7,border:`1px solid ${viewMode===m?C.blue:C.border}`,background:viewMode===m?C.blueLt:C.card,color:viewMode===m?C.blue:C.textFaint,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',transition:'all .13s'}}>
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">{icon}</svg>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Grid view */}
          {viewMode==='grid'&&(
            <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':isTablet?'repeat(2,1fr)':'repeat(3,1fr)',gap:12,padding:14}}>
              {loading
                ?[...Array(isMobile?4:9)].map((_,i)=><SkeletonGridCard key={i}/>)
                :error
                ?<div style={{gridColumn:'1/-1',padding:'40px 16px',textAlign:'center'}}>
                  <div style={{fontSize:13,fontWeight:600,color:C.danger,marginBottom:6}}>Failed to load</div>
                  <div style={{fontSize:11.5,color:C.textMut,marginBottom:12}}>{error}</div>
                  <button onClick={loadData} style={{padding:'6px 14px',borderRadius:8,background:C.blue,color:'#fff',border:'none',fontSize:12,fontWeight:600,cursor:'pointer'}}>Retry</button>
                </div>
                :filtered.length===0
                ?<div style={{gridColumn:'1/-1',display:'flex',flexDirection:'column',alignItems:'center',padding:'48px 16px',gap:10}}>
                  <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke={C.borderStr} strokeWidth="1.2" strokeLinecap="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/></svg>
                  <div style={{fontSize:14,fontWeight:700,color:C.textSec}}>No datasets found</div>
                  <div style={{fontSize:12.5,color:C.textMut,textAlign:'center',maxWidth:280}}>Try adjusting your filters or search query.</div>
                  {hasFilters&&<button onClick={resetFilters} style={{marginTop:4,padding:'6px 16px',borderRadius:8,background:'var(--red)',color:'#fff',border:'none',fontSize:12,fontWeight:600,cursor:'pointer'}}>Reset Filters</button>}
                </div>
                :paginated.map(d=>(
                  <GridCard key={d.id} d={d} isFav={favorites.has(d.sourceId)} onFav={toggleFav} onPreview={setPreview} isDark={isDark}/>
                ))
              }
            </div>
          )}

          {/* Table view */}
          {viewMode==='table'&&(
            <div style={{overflowX:'auto',WebkitOverflowScrolling:'touch'}}>
              <table style={{width:'100%',borderCollapse:'collapse',minWidth:isMobile?360:860}}>
                <thead>
                  <tr style={{background:C.hdr}}>
                    {visibleCols.map(col=>(
                      <th key={col.key} onClick={col.noSort?undefined:()=>handleSort(col.key)} style={{padding:'9px 12px',textAlign:'left',fontSize:10.5,fontWeight:700,letterSpacing:'.06em',textTransform:'uppercase',color:sortCol===col.key?C.blue:C.textMut,borderBottom:`1px solid ${C.border}`,cursor:col.noSort?'default':'pointer',whiteSpace:'nowrap',userSelect:'none',transition:'color .13s',width:col.w||'auto'}}>
                        <div style={{display:'flex',alignItems:'center',gap:4}}>
                          {col.label}
                          {!col.noSort&&<SortIcon active={sortCol===col.key} dir={sortDir}/>}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading
                    ?[...Array(isMobile?5:8)].map((_,i)=><SkeletonRow key={i}/>)
                    :error
                    ?<tr><td colSpan={visibleCols.length} style={{padding:'40px 16px',textAlign:'center'}}>
                      <div style={{fontSize:13,fontWeight:600,color:C.danger,marginBottom:6}}>Failed to load</div>
                      <div style={{fontSize:11.5,color:C.textMut,marginBottom:12}}>{error}</div>
                      <button onClick={loadData} style={{padding:'6px 14px',borderRadius:8,background:C.blue,color:'#fff',border:'none',fontSize:12,fontWeight:600,cursor:'pointer'}}>Retry</button>
                    </td></tr>
                    :filtered.length===0
                    ?<tr><td colSpan={visibleCols.length}>
                      <div style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'48px 16px',gap:10}}>
                        <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke={C.borderStr} strokeWidth="1.2" strokeLinecap="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/></svg>
                        <div style={{fontSize:14,fontWeight:700,color:C.textSec}}>No datasets found</div>
                        <div style={{fontSize:12.5,color:C.textMut,textAlign:'center',maxWidth:280}}>Try adjusting your filters or search query.</div>
                        {hasFilters&&<button onClick={resetFilters} style={{marginTop:4,padding:'6px 16px',borderRadius:8,background:'var(--red)',color:'#fff',border:'none',fontSize:12,fontWeight:600,cursor:'pointer'}}>Reset Filters</button>}
                      </div>
                    </td></tr>
                    :paginated.map(d=>(
                      <TableRow
                        key={d.id} d={d}
                        isFav={favorites.has(d.sourceId)}
                        onFav={toggleFav}
                        onPreview={setPreview}
                        isDark={isDark}
                      />
                    ))
                  }
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!loading&&!error&&filtered.length>PAGE_SIZE&&(
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',borderTop:`1px solid ${C.border}`,flexWrap:'wrap',gap:8}}>
              <span style={{fontSize:12,color:C.textMut}}>{(page-1)*PAGE_SIZE+1}–{Math.min(page*PAGE_SIZE,filtered.length)} of {filtered.length}</span>
              <div style={{display:'flex',gap:4,alignItems:'center',flexWrap:'wrap'}}>
                <PgBtn disabled={page===1} onClick={()=>setPage(1)}>«</PgBtn>
                <PgBtn disabled={page===1} onClick={()=>setPage(p=>p-1)}>‹</PgBtn>
                {!isMobile&&buildPages(page,totalPages).map((p,i)=>
                  p==='…'
                    ?<span key={`e${i}`} style={{padding:'0 3px',color:C.textFaint,fontSize:12}}>…</span>
                    :<PgBtn key={p} active={p===page} onClick={()=>setPage(p)}>{p}</PgBtn>
                )}
                {isMobile&&<span style={{fontSize:12,color:C.textMut,padding:'0 6px'}}>{page}/{totalPages}</span>}
                <PgBtn disabled={page===totalPages} onClick={()=>setPage(p=>p+1)}>›</PgBtn>
                <PgBtn disabled={page===totalPages} onClick={()=>setPage(totalPages)}>»</PgBtn>
              </div>
            </div>
          )}
        </div>

      </div>

      {preview&&<PreviewDrawer ds={preview} onClose={()=>setPreview(null)} favorites={favorites} toggleFav={toggleFav} isDark={isDark}/>}
    </div>
  );
}
