import { useState, useCallback, useEffect, useRef } from "react";

const NOW_M = 4;
const MO   = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MO_S = ['J','F','M','A','M','J','J','A','S','O','N','D'];

const SP = [
  {id:1,  name:"Cherry Blossom",  inat:"Prunus serrulata",            type:"ornamental", pm:[3,4],     ns:7,  c:"#f9a8c0"},
  {id:2,  name:"Eastern Redbud",  inat:"Cercis canadensis",            type:"ornamental", pm:[3,4],     ns:6,  c:"#c084fc"},
  {id:3,  name:"Dandelion",        inat:"Taraxacum officinale",         type:"forage",     pm:[3,4,5],   ns:7,  c:"#fbbf24"},
  {id:4,  name:"Wild Violet",      inat:"Viola sororia",                type:"wildflower", pm:[4,5],     ns:4,  c:"#a78bfa"},
  {id:5,  name:"Apple Blossom",    inat:"Malus domestica",              type:"orchard",    pm:[4,5],     ns:8,  c:"#fda4af"},
  {id:6,  name:"Phacelia",         inat:"Phacelia tanacetifolia",       type:"forage",     pm:[4,5],     ns:9,  c:"#6d9af5"},
  {id:7,  name:"White Clover",     inat:"Trifolium repens",             type:"forage",     pm:[5,6,7],   ns:9,  c:"#6ee7b7"},
  {id:8,  name:"Black Locust",     inat:"Robinia pseudoacacia",         type:"forage",     pm:[5,6],     ns:10, c:"#bef264"},
  {id:9,  name:"Linden",           inat:"Tilia americana",              type:"forage",     pm:[6,7],     ns:10, c:"#7dd3fc"},
  {id:10, name:"Lavender",         inat:"Lavandula angustifolia",       type:"garden",     pm:[6,7,8],   ns:8,  c:"#c4b5fd"},
  {id:11, name:"Black-eyed Susan", inat:"Rudbeckia hirta",              type:"wildflower", pm:[6,7,8],   ns:5,  c:"#fb923c"},
  {id:12, name:"Sunflower",        inat:"Helianthus annuus",            type:"garden",     pm:[7,8,9],   ns:7,  c:"#fde047"},
  {id:13, name:"Buckwheat",        inat:"Fagopyrum esculentum",         type:"forage",     pm:[7,8],     ns:8,  c:"#d4a76a"},
  {id:14, name:"Goldenrod",        inat:"Solidago canadensis",          type:"forage",     pm:[8,9,10],  ns:8,  c:"#fbbf24"},
  {id:15, name:"Aster",            inat:"Symphyotrichum novae-angliae", type:"wildflower", pm:[9,10,11], ns:7,  c:"#a855f7"},
];

const TYPES = {
  forage:     {label:"Forage",     c:"#f0a030"},
  ornamental: {label:"Ornamental", c:"#e879a0"},
  wildflower: {label:"Wildflower", c:"#a78bfa"},
  garden:     {label:"Garden",     c:"#4dd892"},
  orchard:    {label:"Orchard",    c:"#fb7185"},
};

const ST = {
  blooming:{label:"Blooming",   bg:"rgba(74,222,128,0.12)", tc:"#4dd892"},
  opening: {label:"Opening",    bg:"rgba(45,212,191,0.12)", tc:"#2dd4bf"},
  fading:  {label:"Fading",     bg:"rgba(251,146,60,0.12)", tc:"#fb923c"},
  soon:    {label:"Coming Soon",bg:"rgba(167,139,250,0.12)",tc:"#a78bfa"},
  dormant: {label:"Dormant",    bg:"rgba(100,116,139,0.12)",tc:"#64748b"},
};

// ── Theme ──────────────────────────────────────────────────────────────────
const T = {
  bg:      '#f5f2ea',
  surf:    '#ffffff',
  surf2:   '#ede9df',
  border:  'rgba(0,0,0,0.07)',
  border2: 'rgba(0,0,0,0.12)',
  text:    '#1a2e1f',
  muted:   '#4a6a54',
  dim:     '#8aaa8f',
  accent:  '#2d8a52',
  amber:   '#b87010',
};

const ANTHROPIC_KEY = (typeof window !== 'undefined' && window.__ANTHROPIC_KEY__) || '';
const SUPABASE_URL  = (typeof window !== 'undefined' && window.__SUPABASE_URL__)  || '';
const SUPABASE_KEY  = (typeof window !== 'undefined' && window.__SUPABASE_KEY__)  || '';

const apiHeaders = () => ({
  "Content-Type":"application/json",
  ...(ANTHROPIC_KEY?{"x-api-key":ANTHROPIC_KEY,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"}:{})
});
const sbHeaders = () => ({
  'Content-Type':'application/json','apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`,
});

function getStatus(sp,m){
  if(sp.pm.includes(m)) return sp.pm.indexOf(m)===0?'opening':'blooming';
  if(sp.pm.includes(m-1)) return 'fading';
  if(sp.pm.includes(m+1)) return 'soon';
  return 'dormant';
}
function flowInfo(s){
  if(s<3) return ['Dearth','#ef4444'];
  if(s<5) return ['Low Flow','#f97316'];
  if(s<7) return ['Building','#eab308'];
  if(s<8.5) return ['Good Flow',T.accent];
  return ['Peak Flow','#22d87a'];
}

const photoCache={};
async function fetchINatPhoto(q){
  if(photoCache[q]!==undefined) return photoCache[q];
  const ctrl=new AbortController(),t=setTimeout(()=>ctrl.abort(),8000);
  try{
    const r=await fetch(`https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(q)}&per_page=1&is_active=true&rank=species`,{signal:ctrl.signal});
    clearTimeout(t);if(!r.ok){photoCache[q]=null;return null;}
    const d=await r.json();
    const url=d.results?.[0]?.default_photo?.medium_url||d.results?.[0]?.default_photo?.square_url||null;
    photoCache[q]=url;return url;
  }catch{clearTimeout(t);photoCache[q]=null;return null;}
}
function usePhoto(q){
  const[url,setUrl]=useState(photoCache[q]??null);
  const[loading,setLoading]=useState(photoCache[q]===undefined);
  useEffect(()=>{
    if(!q){setLoading(false);return;}
    if(photoCache[q]!==undefined){setUrl(photoCache[q]);setLoading(false);return;}
    setLoading(true);fetchINatPhoto(q).then(u=>{setUrl(u);setLoading(false);});
  },[q]);
  return{url,loading};
}

function Thumb({query,color,size=52}){
  const{url,loading}=usePhoto(query);
  return(
    <div style={{width:size,height:size,borderRadius:12,flexShrink:0,overflow:'hidden',
      border:`1px solid ${color}30`,background:color+'14',display:'flex',alignItems:'center',justifyContent:'center'}}>
      {loading?<div style={{width:'50%',height:'50%',borderRadius:'50%',background:`${color}50`,animation:'pulse 1.6s ease-in-out infinite'}}/>
       :url?<img src={url} alt="" style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}/>
       :<span style={{fontSize:size*0.38,opacity:0.6}}>🌸</span>}
    </div>
  );
}
function Banner({query,color,height=140}){
  const{url,loading}=usePhoto(query);
  return(
    <div style={{width:'100%',height,overflow:'hidden',background:`${color}14`,display:'flex',alignItems:'center',justifyContent:'center'}}>
      {loading?<div style={{width:40,height:40,borderRadius:'50%',background:`${color}40`,animation:'pulse 1.6s ease-in-out infinite'}}/>
       :url?<img src={url} alt="" style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}/>
       :<span style={{fontSize:40,opacity:0.5}}>🌸</span>}
    </div>
  );
}

// ── Honey Predictor ─────────────────────────────────────────────────────────
function HoneyPredictor({bloomingSpecies,location}){
  const[open,setOpen]=useState(false);
  const[result,setResult]=useState(null);
  const[loading,setLoading]=useState(false);
  const predict=async()=>{
    setLoading(true);setResult(null);
    const names=bloomingSpecies.map(s=>s.name).join(', ');
    try{
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{...apiHeaders()},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:800,
          system:"You are a master beekeeper and honey sommelier. Respond with only a raw JSON object, no markdown.",
          messages:[{role:"user",content:
            `Flowers blooming${location?' in '+location:''}: ${names}. Predict honey varieties. Return JSON:
{"varieties":[{"name":"","flavor":"","color":"","rarity":"Common|Seasonal|Rare","dominant_flower":""}],"blend_note":"","harvest_timing":""}`
          }]})});
      const d=await res.json();
      const raw=d.content?.filter(b=>b.type==='text').map(b=>b.text).join('')||'';
      let p=null;
      try{p=JSON.parse(raw.trim());}catch{}
      if(!p){const m=raw.match(/\{[\s\S]*\}/);if(m)try{p=JSON.parse(m[0]);}catch{}}
      setResult(p||null);
    }catch{}finally{setLoading(false);}
  };
  const rc={'Common':T.accent,'Seasonal':T.amber,'Rare':'#c084fc'};
  return(
    <div style={{background:T.surf,borderRadius:16,overflow:'hidden',border:`1px solid ${T.border}`}}>
      <button onClick={()=>{setOpen(v=>!v);if(!open&&!result)predict();}}
        style={{width:'100%',padding:'14px 18px',background:'none',border:'none',cursor:'pointer',
          display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{fontSize:22}}>🍯</div>
          <div style={{textAlign:'left'}}>
            <div style={{fontSize:14,fontWeight:600,color:T.amber,letterSpacing:-0.2}}>Honey Predictor</div>
            <div style={{fontSize:12,color:T.muted,marginTop:1}}>What will your bees make this season?</div>
          </div>
        </div>
        <div style={{color:T.dim,fontSize:12}}>{open?'▲':'▼'}</div>
      </button>
      {open&&(
        <div style={{padding:'0 18px 18px',borderTop:`1px solid ${T.border}`}}>
          {loading&&(
            <div style={{paddingTop:16,display:'flex',flexDirection:'column',gap:8}}>
              {[85,60,72].map((w,i)=><div key={i} style={{height:11,borderRadius:6,background:T.surf2,width:`${w}%`,animation:'pulse 1.6s ease-in-out infinite'}}/>)}
            </div>
          )}
          {!loading&&result&&(
            <div style={{paddingTop:14,display:'flex',flexDirection:'column',gap:10}}>
              {result.blend_note&&<p style={{margin:0,fontSize:13,lineHeight:1.65,color:T.muted,fontStyle:'italic'}}>{result.blend_note}</p>}
              {result.varieties?.map((v,i)=>(
                <div key={i} style={{background:T.bg,borderRadius:12,padding:'12px 14px',border:`1px solid ${T.border}`}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                    <div style={{fontSize:15,fontWeight:600,color:'#f5c842'}}>{v.name}</div>
                    <div style={{fontSize:11,padding:'2px 8px',borderRadius:99,background:`${rc[v.rarity]||T.accent}18`,color:rc[v.rarity]||T.accent}}>{v.rarity}</div>
                  </div>
                  <p style={{margin:'0 0 6px',fontSize:13,color:T.muted,lineHeight:1.6}}>{v.flavor}</p>
                  <div style={{display:'flex',gap:14,fontSize:11,color:T.dim}}>
                    <span>{v.color}</span><span>via {v.dominant_flower}</span>
                  </div>
                </div>
              ))}
              {result.harvest_timing&&<div style={{fontSize:12,color:T.amber,padding:'8px 12px',background:`${T.amber}10`,borderRadius:8,border:`1px solid ${T.amber}20`}}>Harvest window: {result.harvest_timing}</div>}
              <button onClick={predict} style={{background:'none',border:`1px solid ${T.border2}`,borderRadius:8,color:T.muted,padding:'6px',cursor:'pointer',fontSize:12}}>Regenerate</button>
            </div>
          )}
          {!loading&&!result&&(
            <div style={{paddingTop:14,textAlign:'center'}}>
              <button onClick={predict} style={{background:T.amber,border:'none',borderRadius:10,color:'#0b1410',padding:'9px 24px',cursor:'pointer',fontSize:13,fontWeight:700}}>Predict My Honey</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Community Tab ────────────────────────────────────────────────────────────
function CommunityTab(){
  const[reports,setReports]=useState([]);
  const[loading,setLoading]=useState(true);
  const[form,setForm]=useState({species:'',status:'blooming',location:'',note:''});
  const[submitting,setSubmitting]=useState(false);
  const[submitted,setSubmitted]=useState(false);
  const[error,setError]=useState('');

  const loadReports=async()=>{
    setLoading(true);
    try{
      const r=await fetch(`${SUPABASE_URL}/rest/v1/reports?order=ts.desc&limit=50`,{headers:sbHeaders()});
      if(r.ok)setReports(await r.json());
    }catch{}
    setLoading(false);
  };
  useEffect(()=>{loadReports();},[]);

  const submit=async()=>{
    if(!form.species.trim()||!form.location.trim()){setError('Species and location required.');return;}
    setError('');setSubmitting(true);
    if(!SUPABASE_URL||!SUPABASE_KEY){setError('Supabase not configured.');setSubmitting(false);return;}
    try{
      const r=await fetch(`${SUPABASE_URL}/rest/v1/reports`,{method:'POST',
        headers:{...sbHeaders(),'Prefer':'return=minimal'},body:JSON.stringify({...form,ts:Date.now()})});
      if(r.ok||r.status===201){
        setForm({species:'',status:'blooming',location:'',note:''});
        setSubmitted(true);setTimeout(()=>setSubmitted(false),3000);
        await loadReports();
      }else{const t=await r.text();setError(`Error ${r.status}: ${t}`);}
    }catch(e){setError(`Connection error: ${e.message}`);}
    setSubmitting(false);
  };

  const stC={blooming:T.accent,opening:'#2dd4bf',fading:'#fb923c','not yet':'#a78bfa'};
  const inp={background:T.bg,border:`1px solid ${T.border2}`,borderRadius:10,color:T.text,
    padding:'10px 14px',fontSize:13,outline:'none',width:'100%',boxSizing:'border-box',fontFamily:'inherit'};

  return(
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      <div style={{background:T.surf,borderRadius:16,padding:18,border:`1px solid ${T.border}`}}>
        <div style={{fontSize:11,color:T.muted,fontWeight:600,letterSpacing:'0.07em',marginBottom:14,textTransform:'uppercase'}}>Log a Sighting</div>
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          <input style={inp} placeholder="Species (e.g. Black Locust, Wild Violet…)" value={form.species} onChange={e=>setForm(f=>({...f,species:e.target.value}))}/>
          <select style={{...inp,cursor:'pointer'}} value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
            <option value="blooming">Blooming</option>
            <option value="opening">Just Opening</option>
            <option value="fading">Fading</option>
            <option value="not yet">Not Yet</option>
          </select>
          <input style={inp} placeholder="Your location (e.g. Hudson Valley, NY)" value={form.location} onChange={e=>setForm(f=>({...f,location:e.target.value}))}/>
          <textarea style={{...inp,resize:'none',height:64}} placeholder="Notes — bee activity, density, conditions (optional)" value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))}/>
          {error&&<div style={{fontSize:12,color:'#ef4444'}}>{error}</div>}
          <button onClick={submit} disabled={submitting}
            style={{background:submitted?T.surf2:T.accent,color:submitted?T.accent:'#0b1410',
              border:`1px solid ${submitted?T.accent+'40':'transparent'}`,borderRadius:10,
              padding:'10px',fontWeight:700,cursor:'pointer',fontSize:13,fontFamily:'inherit'}}>
            {submitted?'✓ Sighting Logged':submitting?'Submitting…':'Submit Sighting'}
          </button>
        </div>
      </div>

      <div style={{fontSize:11,color:T.muted,fontWeight:600,letterSpacing:'0.07em',textTransform:'uppercase',paddingLeft:4}}>Community Sightings</div>
      {loading&&<div style={{background:T.surf,borderRadius:16,padding:18,color:T.dim,fontSize:13,border:`1px solid ${T.border}`}}>Loading…</div>}
      {!loading&&reports.length===0&&(
        <div style={{background:T.surf,borderRadius:16,padding:24,color:T.dim,fontSize:13,textAlign:'center',border:`1px solid ${T.border}`}}>No sightings yet — be the first.</div>
      )}
      {!loading&&reports.map((r,i)=>(
        <div key={i} style={{background:T.surf,borderRadius:14,padding:'14px 16px',border:`1px solid ${T.border}`}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:4}}>
            <div style={{fontSize:14,fontWeight:600,color:T.text}}>{r.species}</div>
            <div style={{fontSize:11,padding:'2px 8px',borderRadius:99,
              background:`${stC[r.status]||T.accent}15`,color:stC[r.status]||T.accent,flexShrink:0,marginLeft:8}}>{r.status}</div>
          </div>
          <div style={{fontSize:12,color:T.dim}}>📍 {r.location} · {new Date(r.ts).toLocaleDateString()}</div>
          {r.note&&<p style={{margin:'6px 0 0',fontSize:13,color:T.muted,lineHeight:1.5}}>{r.note}</p>}
        </div>
      ))}
    </div>
  );
}

// ── Species Detail ───────────────────────────────────────────────────────────
function SpeciesDetail({sp,onBack}){
  const[info,setInfo]=useState(null);
  const[loading,setLoading]=useState(true);
  const[error,setError]=useState(false);
  const st=getStatus(sp,NOW_M),ss=ST[st]||ST.blooming,ti=TYPES[sp.type]||TYPES.wildflower;
  const[,fc]=flowInfo(sp.ns||5);

  const load=useCallback(()=>{
    setLoading(true);setInfo(null);setError(false);
    fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{...apiHeaders()},
      body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:900,
        system:"You are a botanist and beekeeping expert. Respond with a single raw JSON object only. No markdown. Begin with { and end with }.",
        messages:[{role:"user",content:`JSON profile for ${sp.name} (${sp.inat}). Keys: description, habitat, beekeeping, did_you_know, peak_tip.`}]})})
    .then(r=>r.json())
    .then(d=>{
      const raw=d.content?.filter(b=>b.type==='text').map(b=>b.text).join('')||'';
      let p=null;
      try{p=JSON.parse(raw.trim());}catch{}
      if(!p)try{p=JSON.parse(raw.replace(/```[\w]*/g,'').replace(/```/g,'').trim());}catch{}
      if(!p){const m=raw.match(/\{[\s\S]*\}/);if(m)try{p=JSON.parse(m[0]);}catch{}}
      if(p){setInfo(p);}else setError(true);
    })
    .catch(()=>setError(true))
    .finally(()=>setLoading(false));
  },[sp.id]);
  useEffect(()=>{load();},[load]);

  const Card=({children,style={}})=>(
    <div style={{background:T.surf,border:`1px solid ${T.border}`,borderRadius:16,padding:'16px 18px',...style}}>{children}</div>
  );
  const Label=({children,color=T.muted})=>(
    <div style={{fontSize:10,color,fontWeight:600,letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:8}}>{children}</div>
  );

  return(
    <div style={{background:T.bg,minHeight:'100vh',color:T.text,fontFamily:'system-ui,sans-serif'}}>
      <div style={{background:T.surf,borderBottom:`1px solid ${T.border}`,padding:'12px 16px',display:'flex',alignItems:'center',gap:12}}>
        <button onClick={onBack} style={{background:T.surf2,border:`1px solid ${T.border2}`,borderRadius:10,
          color:T.accent,padding:'6px 14px',cursor:'pointer',fontSize:13,fontWeight:600,fontFamily:'inherit'}}>← Back</button>
        <div>
          <div style={{fontSize:17,fontWeight:700,color:T.text,letterSpacing:-0.3}}>{sp.name}</div>
          <div style={{fontSize:12,color:T.muted,fontStyle:'italic'}}>{sp.inat}</div>
        </div>
      </div>

      <div style={{maxWidth:580,margin:'0 auto',padding:14,display:'flex',flexDirection:'column',gap:12}}>
        {/* Hero */}
        <div style={{borderRadius:20,overflow:'hidden',position:'relative'}}>
          <Banner query={sp.inat} color={sp.c} height={220}/>
          <div style={{position:'absolute',inset:0,background:'linear-gradient(to bottom,transparent 35%,rgba(245,242,234,0.97) 100%)'}}/>
          <div style={{position:'absolute',bottom:16,left:18,right:18,display:'flex',justifyContent:'space-between',alignItems:'flex-end'}}>
            <div style={{display:'flex',gap:6}}>
              <div style={{padding:'4px 10px',borderRadius:99,fontSize:11,background:ss.bg,color:ss.tc,fontWeight:600}}>{ss.label}</div>
              <div style={{padding:'4px 10px',borderRadius:99,fontSize:11,background:'rgba(255,255,255,0.7)',color:ti.c,fontWeight:600}}>{ti.label}</div>
            </div>
            <div style={{fontSize:13,fontWeight:700,color:fc}}>Nectar {sp.ns}/10</div>
          </div>
        </div>

        {/* Stats */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
          {[[sp.ns+'/10','Nectar',fc],[sp.pm.length,'Bloom months',T.accent],[sp.pm.map(m=>MO[m-1][0]).join(''),'Season','#a78bfa']].map(([v,l,c])=>(
            <div key={l} style={{background:T.surf,border:`1px solid ${T.border}`,borderRadius:14,padding:'14px 10px',textAlign:'center'}}>
              <div style={{fontSize:24,fontWeight:300,color:c,letterSpacing:-1,lineHeight:1}}>{v}</div>
              <div style={{fontSize:11,color:T.muted,marginTop:5}}>{l}</div>
            </div>
          ))}
        </div>

        {/* Timeline */}
        <Card>
          <Label>Bloom Season</Label>
          <div style={{display:'flex',gap:3}}>
            {Array.from({length:12},(_,i)=>i+1).map(m=>(
              <div key={m} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
                <div style={{width:'100%',height:8,borderRadius:99,
                  background:sp.pm.includes(m)?sp.c:T.surf2,
                  opacity:sp.pm.includes(m)?(m===NOW_M?1:0.55):1,
                  outline:m===NOW_M?`2px solid ${T.amber}40`:'none'}}/>
                <div style={{fontSize:8,color:m===NOW_M?T.amber:T.dim}}>{MO_S[m-1]}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Nectar bar */}
        <Card>
          <Label>Nectar Value</Label>
          <div style={{background:T.bg,borderRadius:99,height:6,overflow:'hidden',marginBottom:8}}>
            <div style={{height:'100%',borderRadius:99,width:`${(sp.ns/10)*100}%`,background:`linear-gradient(90deg,${fc}60,${fc})`,transition:'width 1s ease'}}/>
          </div>
          <div style={{fontSize:12,color:T.muted}}>
            {sp.ns>=9?'Exceptional producer — a primary nectar source for bees'
            :sp.ns>=7?'Strong source — reliable contribution to hive production'
            :sp.ns>=5?'Moderate value — good supplemental forage'
            :'Lower yield — valuable for pollen diversity'}
          </div>
        </Card>

        {loading&&(
          <Card>
            {['Description','Habitat','Beekeeping'].map(l=>(
              <div key={l} style={{marginBottom:16}}>
                <div style={{fontSize:10,color:T.dim,fontWeight:600,letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:8}}>{l}</div>
                <div style={{height:11,borderRadius:6,background:T.surf2,marginBottom:6,animation:'pulse 1.6s ease-in-out infinite'}}/>
                <div style={{height:11,borderRadius:6,background:T.surf2,width:'70%',animation:'pulse 1.6s ease-in-out infinite'}}/>
              </div>
            ))}
          </Card>
        )}

        {!loading&&error&&(
          <Card style={{textAlign:'center'}}>
            <div style={{color:T.muted,fontSize:13,marginBottom:12}}>Failed to load species details.</div>
            <button onClick={load} style={{background:T.surf2,border:`1px solid ${T.border2}`,borderRadius:10,color:T.accent,padding:'8px 18px',cursor:'pointer',fontSize:13,fontWeight:600,fontFamily:'inherit'}}>Try Again</button>
          </Card>
        )}

        {!loading&&info&&(
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            <Card><Label>Description</Label><p style={{margin:0,fontSize:13,lineHeight:1.7,color:T.muted}}>{info.description}</p></Card>
            <Card><Label>Habitat</Label><p style={{margin:0,fontSize:13,lineHeight:1.7,color:T.muted}}>{info.habitat}</p></Card>
            <Card style={{borderColor:`${T.accent}40`,background:'#f0f7f2'}}>
              <Label color={T.amber}>🐝 Beekeeping Notes</Label>
              <p style={{margin:0,fontSize:13,lineHeight:1.7,color:T.text}}>{info.beekeeping}</p>
            </Card>
            <Card><Label>Field Tip</Label><p style={{margin:0,fontSize:13,lineHeight:1.7,color:T.muted}}>{info.peak_tip}</p></Card>
            <Card style={{borderStyle:'dashed'}}><Label>Did You Know</Label><p style={{margin:0,fontSize:13,lineHeight:1.7,color:T.muted,fontStyle:'italic'}}>{info.did_you_know}</p></Card>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Satellite Map Helpers ────────────────────────────────────────────────────
const loadScript = src => new Promise((res, rej) => {
  if (document.querySelector(`script[src="${src}"]`)) { res(); return; }
  const s = document.createElement('script');
  s.src = src; s.onload = res; s.onerror = rej;
  document.head.appendChild(s);
});
const loadCss = href => {
  if (document.querySelector(`link[href="${href}"]`)) return;
  const l = document.createElement('link');
  l.rel = 'stylesheet'; l.href = href; document.head.appendChild(l);
};

// Fetch real GPS observation data from iNaturalist
async function fetchRealHeatPoints(lat, lng, species, month) {
  const blooming = species.filter(s => s.pm.includes(month));
  if (!blooming.length) return [];

  const fetchSpecies = async sp => {
    try {
      const url = `https://api.inaturalist.org/v1/observations?` +
        `taxon_name=${encodeURIComponent(sp.inat)}` +
        `&lat=${lat}&lng=${lng}&radius=40` +
        `&month=${month}&per_page=200` +
        `&quality_grade=research&geo=true&order_by=observed_on`;
      const r = await fetch(url);
      if (!r.ok) return [];
      const d = await r.json();
      const weight = sp.ns / 10;
      return (d.results || [])
        .filter(o => o.location)
        .map(o => {
          const [olat, olng] = o.location.split(',').map(Number);
          return [olat, olng, weight];
        });
    } catch { return []; }
  };

  const all = await Promise.all(blooming.map(fetchSpecies));
  return all.flat();
}

function SatelliteMap({ location, allSpecies, month, hive }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const heatRef = useRef(null);
  const [status, setStatus] = useState('idle');
  const [obsCount, setObsCount] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    const init = async () => {
      setStatus('loading');
      setObsCount(0);
      try {
        loadCss('https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css');
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js');
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/leaflet.heat/0.2.0/leaflet-heat.js');
        if (cancelled) return;

        const L = window.L;

        // Force clean any existing map on this container
        if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; heatRef.current = null; }
        if (containerRef.current._leaflet_id) {
          containerRef.current._leaflet_id = undefined;
        }

        // Geocode
        let lat = 40.7128, lng = -74.006;
        if (location) {
          try {
            const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`);
            const d = await r.json();
            if (d[0]) { lat = parseFloat(d[0].lat); lng = parseFloat(d[0].lon); }
          } catch {}
        }
        if (cancelled) return;

        // Create map
        const map = L.map(containerRef.current, { zoomControl: true }).setView([lat, lng], 12);
        mapRef.current = map;

        // Satellite tiles
        L.tileLayer(
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          { attribution: '© Esri', maxZoom: 19 }
        ).addTo(map);

        // Critical: force Leaflet to recalculate container size
        setTimeout(() => { if (mapRef.current) mapRef.current.invalidateSize(); }, 150);

        // Hive marker
        if (hive) {
          const icon = L.divIcon({
            html: '<div style="font-size:22px;filter:drop-shadow(0 1px 4px rgba(0,0,0,0.6))">🐝</div>',
            className: '', iconSize: [28,28], iconAnchor: [14,14]
          });
          L.marker([lat, lng], { icon }).addTo(map).bindPopup(`<b>${hive.name}</b>`);
        }

        if (cancelled) return;
        setStatus('fetching');

        // Fetch real iNaturalist observations
        const pts = await fetchRealHeatPoints(lat, lng, allSpecies, month);
        if (cancelled) return;

        if (pts.length > 0) {
          const heat = L.heatLayer(pts, {
            radius: 22, blur: 18, maxZoom: 17,
            gradient: { 0.2:'#86efac', 0.5:'#22c55e', 0.75:'#bef264', 1:'#f0a030' }
          }).addTo(map);
          heatRef.current = heat;
          setObsCount(pts.length);
          setStatus('ready');
        } else {
          setStatus('nodata');
        }
      } catch(e) {
        console.error('Map error:', e);
        if (!cancelled) setStatus('error');
      }
    };

    init();
    return () => {
      cancelled = true;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; heatRef.current = null; }
    };
  }, [location, month]);

  const active = allSpecies.filter(s => s.pm.includes(month));

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
      <div style={{ position:'relative', borderRadius:16, overflow:'hidden', border:`1px solid ${T.border}` }}>
        {/* Map container — explicit pixel height so Leaflet can measure it */}
        <div ref={containerRef} style={{ width:'100%', height:'400px', display:'block' }}/>

        {(status==='loading'||status==='fetching')&&(
          <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center',
            background:`${T.bg}cc`, flexDirection:'column', gap:10, pointerEvents:'none', zIndex:1000 }}>
            <div style={{ width:36, height:36, borderRadius:'50%', background:T.surf2, animation:'pulse 1.6s ease-in-out infinite' }}/>
            <div style={{ fontSize:13, color:T.muted }}>
              {status==='loading' ? 'Loading satellite imagery…' : `Fetching ${active.length} species from iNaturalist…`}
            </div>
          </div>
        )}

        {status==='idle'&&(
          <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center',
            background:T.bg, fontSize:13, color:T.muted, flexDirection:'column', gap:8, zIndex:1000 }}>
            <div style={{fontSize:32}}>🛰️</div>
            <div>Enter a region above to load the satellite map</div>
          </div>
        )}

        {status==='ready'&&obsCount>0&&(
          <div style={{ position:'absolute', bottom:14, left:'50%', transform:'translateX(-50%)',
            background:'rgba(0,0,0,0.65)', borderRadius:99, padding:'6px 14px',
            fontSize:12, color:'#fff', whiteSpace:'nowrap', zIndex:1000 }}>
            {obsCount.toLocaleString()} real observations · iNaturalist
          </div>
        )}

        {status==='nodata'&&(
          <div style={{ position:'absolute', bottom:14, left:'50%', transform:'translateX(-50%)',
            background:'rgba(0,0,0,0.65)', borderRadius:99, padding:'6px 14px',
            fontSize:12, color:'#fff', whiteSpace:'nowrap', zIndex:1000 }}>
            No observations found — try a broader region name
          </div>
        )}
      </div>

      {/* Legend */}
      <div style={{ background:T.surf, borderRadius:14, padding:'12px 16px', border:`1px solid ${T.border}`,
        display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <div style={{ fontSize:10, color:T.muted, fontWeight:600, letterSpacing:'0.07em', textTransform:'uppercase', marginBottom:6 }}>Bloom Density</div>
          <div style={{ display:'flex', alignItems:'center', gap:1 }}>
            {['#86efac','#22c55e','#bef264','#f0a030'].map((c,i)=>(
              <div key={i} style={{ width:30, height:8, background:c,
                borderRadius:i===0?'99px 0 0 99px':i===3?'0 99px 99px 0':'0' }}/>
            ))}
            <div style={{ display:'flex', justifyContent:'space-between', width:60, marginLeft:8 }}>
              <span style={{ fontSize:10, color:T.muted }}>Low</span>
              <span style={{ fontSize:10, color:T.muted }}>High</span>
            </div>
          </div>
        </div>
        {hive&&<div style={{ fontSize:12, color:T.amber }}>🐝 {hive.name}</div>}
      </div>

      {active.length>0&&(
        <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
          {active.map(s=>(
            <div key={s.id} style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 10px',
              borderRadius:99, background:`${s.c}18`, border:`1px solid ${s.c}30`, fontSize:12 }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:s.c }}/>
              <span style={{ color:T.muted }}>{s.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main App ─────────────────────────────────────────────────────────────────
export default function App(){
  const[tab,setTab]=useState('dashboard');
  const[viewMonth,setViewMonth]=useState(NOW_M);
  const[locInput,setLocInput]=useState('');
  const[location,setLocation]=useState('');
  const[brief,setBrief]=useState('');
  const[briefLoad,setBriefLoad]=useState(false);
  const[typeFilter,setTypeFilter]=useState('all');
  const[locBloom,setLocBloom]=useState(null);
  const[locLoad,setLocLoad]=useState(false);
  const[selected,setSelected]=useState(null);
  const[hive,setHive]=useState(null);
  const[hiveInput,setHiveInput]=useState('');
  const[showHiveForm,setShowHiveForm]=useState(false);

  useEffect(()=>{
    try{const s=localStorage.getItem('bc-hive');if(s)setHive(JSON.parse(s));}catch{}
  },[]);

  const saveHive=()=>{
    if(!hiveInput.trim())return;
    const h={name:hiveInput.trim(),saved:Date.now()};
    try{localStorage.setItem('bc-hive',JSON.stringify(h));}catch{}
    setHive(h);setHiveInput('');setShowHiveForm(false);
    setLocation(h.name);fetchBrief(h.name);fetchLocSpecies(h.name);
  };

  const fetchBrief=useCallback(async loc=>{
    setBriefLoad(true);setBrief('');
    try{
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{...apiHeaders()},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,
          system:"You are BloomCast. Write in flowing prose, no bullets. Be regionally specific.",
          messages:[{role:"user",content:`Bloom briefing for ${loc}, April 4 2026. 4–5 sentences: blooming now, nectar flow next 2–3 weeks, one beekeeper tip, seasonal outlook.`}]})});
      const d=await res.json();
      setBrief(d.content?.filter(b=>b.type==='text').map(b=>b.text).join('')||'Unable to generate.');
    }catch{setBrief('Connection error.');}finally{setBriefLoad(false);}
  },[]);

  const fetchLocSpecies=useCallback(async loc=>{
    setLocLoad(true);setLocBloom(null);
    try{
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{...apiHeaders()},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:900,
          system:"Return ONLY valid JSON — no markdown, no backticks.",
          messages:[{role:"user",content:`Region "${loc}", April 4 2026. JSON:
"blooming":[{name,inat,nectar(1-10),type,color(hex),status("blooming"|"opening"|"fading")}]
"upcoming":[names] 5-9 blooming, 3-5 upcoming. JSON only.`}]})});
      const d=await res.json();
      const raw=d.content?.filter(b=>b.type==='text').map(b=>b.text).join('')||'';
      setLocBloom(JSON.parse(raw.replace(/```[\w]*/g,'').replace(/```/g,'').trim()));
    }catch{setLocBloom(null);}finally{setLocLoad(false);}
  },[]);

  const handleSubmit=()=>{
    const loc=locInput.trim();if(!loc)return;
    setLocation(loc);fetchBrief(loc);fetchLocSpecies(loc);
  };

  const resolveToSP=s=>SP.find(sp=>sp.name.toLowerCase()===s.name?.toLowerCase())
    ||{...SP[2],...s,c:s.color||s.c||'#4dd892',ns:s.nectar||5};

  const bloomNow=SP.filter(s=>s.pm.includes(NOW_M));
  const upcomingSP=SP.filter(s=>s.pm.includes(NOW_M+1)&&!s.pm.includes(NOW_M));
  const dBloom=locBloom?locBloom.blooming:bloomNow;
  const dUpcoming=locBloom?locBloom.upcoming:upcomingSP.map(s=>s.name);
  const avgNec=dBloom.length?Math.round(dBloom.reduce((a,b)=>a+(b.ns||b.nectar||0),0)/dBloom.length*10)/10:0;
  const[flowLabel,flowColor]=flowInfo(avgNec);
  const filtered=typeFilter==='all'?SP:SP.filter(s=>s.type===typeFilter);

  if(selected) return <SpeciesDetail sp={selected} onBack={()=>setSelected(null)}/>;

  return(
    <div style={{background:T.bg,minHeight:'100vh',color:T.text,fontFamily:'system-ui,sans-serif'}}>
      <style>{`@keyframes pulse{0%,100%{opacity:.25}50%{opacity:.7}} .spc{transition:transform 0.15s,opacity 0.15s} .spc:hover{opacity:0.82;transform:translateY(-1px)}`}</style>

      {/* ── Header ── */}
      <div style={{background:T.surf,borderBottom:`1px solid ${T.border}`,padding:'12px 16px'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
          <div>
            <div style={{fontSize:20,fontWeight:700,color:T.text,letterSpacing:-0.5,lineHeight:1}}>🌿 BloomCast</div>
            <div style={{fontSize:11,color:T.muted,marginTop:2}}>Bloom & Nectar Intelligence</div>
          </div>
          <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:4}}>
            <button onClick={()=>setShowHiveForm(v=>!v)}
              style={{background:hive?`${T.amber}18`:'transparent',border:`1px solid ${hive?T.amber+'40':T.border2}`,
                borderRadius:99,color:hive?T.amber:T.muted,padding:'4px 12px',cursor:'pointer',fontSize:11,fontWeight:600,fontFamily:'inherit'}}>
              📍 {hive?hive.name:'Set Hive'}
            </button>
            <div style={{fontSize:10,color:T.dim}}>Apr 4, 2026 · Early Spring</div>
          </div>
        </div>

        {showHiveForm&&(
          <div style={{display:'flex',gap:8,marginBottom:10}}>
            <input style={{background:T.bg,border:`1px solid ${T.border2}`,borderRadius:10,color:T.text,
              padding:'8px 12px',fontSize:13,outline:'none',flex:1,fontFamily:'inherit'}}
              placeholder="Hive name or location…" value={hiveInput}
              onChange={e=>setHiveInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&saveHive()}/>
            <button style={{background:T.amber,color:'#0b1410',border:'none',borderRadius:10,padding:'8px 14px',fontWeight:700,cursor:'pointer',fontSize:13,fontFamily:'inherit'}} onClick={saveHive}>Save</button>
          </div>
        )}

        <div style={{display:'flex',gap:8}}>
          <input style={{background:T.bg,border:`1px solid ${T.border2}`,borderRadius:12,color:T.text,
            padding:'10px 14px',fontSize:14,outline:'none',flex:1,fontFamily:'inherit'}}
            placeholder="Enter region (e.g. Hudson Valley, Willamette Valley…)"
            value={locInput} onChange={e=>setLocInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleSubmit()}/>
          <button style={{background:T.accent,color:'#0b1410',border:'none',borderRadius:12,padding:'10px 18px',fontWeight:700,cursor:'pointer',fontSize:13,fontFamily:'inherit'}} onClick={handleSubmit}>Brief Me</button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{padding:'10px 14px',background:T.surf,borderBottom:`1px solid ${T.border}`,display:'flex',gap:4,overflowX:'auto'}}>
        {[['dashboard','Dashboard'],['map','Radar'],['calendar','Calendar'],['species','Species'],['community','Community']].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)} style={{
            padding:'7px 14px',borderRadius:99,border:'none',cursor:'pointer',fontSize:12,fontFamily:'inherit',
            background:tab===k?T.accent:'transparent',
            color:tab===k?'#0b1410':T.muted,
            fontWeight:tab===k?700:400,whiteSpace:'nowrap',transition:'all 0.15s'}}>
            {l}
          </button>
        ))}
      </div>

      <div style={{padding:14,maxWidth:580,margin:'0 auto',display:'flex',flexDirection:'column',gap:12}}>

        {/* ── DASHBOARD ── */}
        {tab==='dashboard'&&(
          <div style={{display:'flex',flexDirection:'column',gap:12}}>

            {/* Weather-app hero: Nectar Index */}
            <div style={{background:T.surf,borderRadius:20,padding:'22px 20px',border:`1px solid ${T.border}`,textAlign:'center'}}>
              {location&&<div style={{fontSize:13,color:T.muted,marginBottom:2}}>{location}</div>}
              <div style={{fontSize:72,fontWeight:200,color:flowColor,letterSpacing:-4,lineHeight:1}}>{avgNec}</div>
              <div style={{fontSize:14,color:T.muted,marginBottom:16}}>Nectar Flow Index · <span style={{color:flowColor,fontWeight:600}}>{flowLabel}</span></div>
              <div style={{background:T.bg,borderRadius:99,height:5,overflow:'hidden',maxWidth:280,margin:'0 auto 12px'}}>
                <div style={{height:'100%',borderRadius:99,width:`${(avgNec/10)*100}%`,background:flowColor,transition:'width 1s ease'}}/>
              </div>
              <div style={{fontSize:12,color:T.dim,lineHeight:1.5}}>{locLoad?'Loading…':dBloom.map(s=>s.name).join('  ·  ')}</div>
            </div>

            {/* Stats row */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
              {[[locLoad?'…':dBloom.length,'Blooming Now',T.accent],[locLoad?'…':dUpcoming.length,'Coming Soon','#a78bfa'],['Apr','Season',T.amber]].map(([v,l,c])=>(
                <div key={l} style={{background:T.surf,border:`1px solid ${T.border}`,borderRadius:14,padding:'14px 10px',textAlign:'center'}}>
                  <div style={{fontSize:28,fontWeight:300,color:c,letterSpacing:-1,lineHeight:1}}>{v}</div>
                  <div style={{fontSize:11,color:T.muted,marginTop:5}}>{l}</div>
                </div>
              ))}
            </div>

            {/* AI Brief */}
            <div style={{background:T.surf,borderRadius:16,padding:'16px 18px',border:`1px solid ${T.border}`}}>
              <div style={{fontSize:10,color:T.muted,fontWeight:600,letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:10}}>
                AI Bloom Briefing {location&&<span style={{color:T.dim,fontWeight:400,textTransform:'none',letterSpacing:0}}>· {location}</span>}
              </div>
              {briefLoad&&(
                <div style={{display:'flex',flexDirection:'column',gap:6}}>
                  {[95,80,88,65].map((w,i)=><div key={i} style={{height:11,borderRadius:6,background:T.surf2,width:`${w}%`,animation:'pulse 1.6s ease-in-out infinite'}}/>)}
                </div>
              )}
              {!briefLoad&&!brief&&<div style={{fontSize:13,color:T.dim,lineHeight:1.65}}>Enter your region above to generate a personalized bloom briefing.</div>}
              {!briefLoad&&brief&&<div style={{fontSize:13,lineHeight:1.7,color:T.muted}}>{brief}</div>}
            </div>

            {/* Honey predictor */}
            {dBloom.length>0&&<HoneyPredictor bloomingSpecies={dBloom} location={location}/>}

            {/* Blooming Now */}
            <div style={{fontSize:11,color:T.muted,fontWeight:600,letterSpacing:'0.07em',textTransform:'uppercase',paddingLeft:2}}>
              Blooming Now {location&&<span style={{color:T.dim,fontWeight:400,textTransform:'none',letterSpacing:0}}>· {location}</span>}
            </div>
            {locLoad&&<div style={{background:T.surf,borderRadius:16,padding:18,color:T.dim,fontSize:13,border:`1px solid ${T.border}`}}>Loading regional bloom data…</div>}
            {!locLoad&&dBloom.map((s,i)=>{
              const spObj=resolveToSP(s);
              const ns=spObj.ns||s.nectar||5;
              const st=s.status||getStatus(spObj,NOW_M);
              const ss=ST[st]||ST.blooming;
              const tc=spObj.c||s.color||T.accent;
              const ti=TYPES[s.type]||TYPES.wildflower;
              return(
                <div key={i} className="spc" onClick={()=>setSelected(spObj)}
                  style={{background:T.surf,border:`1px solid ${T.border}`,borderRadius:16,display:'flex',alignItems:'center',gap:14,padding:'12px 14px',cursor:'pointer'}}>
                  <Thumb query={spObj.inat||s.name} color={tc} size={52}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,marginBottom:3}}>
                      <div style={{fontSize:14,fontWeight:600,color:T.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.name}</div>
                      <div style={{fontSize:11,padding:'2px 8px',borderRadius:99,background:ss.bg,color:ss.tc,flexShrink:0}}>{ss.label}</div>
                    </div>
                    <div style={{fontSize:11,color:ti.c,marginBottom:5}}>{ti.label}</div>
                    <div style={{display:'flex',gap:2}}>
                      {Array.from({length:10},(_,i)=>(
                        <div key={i} style={{flex:1,height:3,borderRadius:99,background:i<ns?tc:T.surf2}}/>
                      ))}
                    </div>
                  </div>
                  <div style={{color:T.dim,fontSize:16,flexShrink:0}}>›</div>
                </div>
              );
            })}

            {!locLoad&&dUpcoming.length>0&&(
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                <div style={{fontSize:11,color:T.muted,fontWeight:600,letterSpacing:'0.07em',textTransform:'uppercase',paddingLeft:2}}>Coming Soon</div>
                <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                  {dUpcoming.map((s,i)=>(
                    <div key={i} style={{padding:'5px 12px',borderRadius:99,fontSize:12,
                      background:`${'#a78bfa'}14`,color:'#a78bfa',border:`1px solid ${'#a78bfa'}25`}}>
                      {typeof s==='string'?s:s.name}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── RADAR ── */}
        {tab==='map'&&(
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            <div style={{background:T.surf,borderRadius:20,padding:18,border:`1px solid ${T.border}`}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
                <div style={{fontSize:14,fontWeight:600,color:T.text}}>Satellite Bloom Map</div>
                {!location&&<div style={{fontSize:11,color:T.muted}}>Enter a region to load</div>}
              </div>
              <div style={{fontSize:12,color:T.muted,marginBottom:14}}>Flowering plant density heatmap — select month</div>
              <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                {MO.map((m,i)=>(
                  <button key={i} onClick={()=>setViewMonth(i+1)} style={{padding:'4px 9px',borderRadius:99,border:'none',cursor:'pointer',fontSize:11,fontFamily:'inherit',
                    background:viewMonth===i+1?T.accent:'transparent',color:viewMonth===i+1?'#fff':T.muted,fontWeight:viewMonth===i+1?700:400}}>{m}</button>
                ))}
              </div>
            </div>
            <SatelliteMap location={location} allSpecies={SP} month={viewMonth} hive={hive}/>
          </div>
        )}

        {/* ── CALENDAR ── */}
        {tab==='calendar'&&(
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            <div style={{background:T.surf,borderRadius:20,padding:18,border:`1px solid ${T.border}`}}>
              <div style={{fontSize:14,fontWeight:600,color:T.text,marginBottom:16}}>Bloom Season Calendar · 2026</div>
              <div style={{overflowX:'auto'}}><div style={{minWidth:400}}>
                <div style={{display:'grid',gridTemplateColumns:'100px repeat(12,1fr)',gap:2,marginBottom:8}}>
                  <div/>
                  {MO_S.map((m,i)=><div key={i} style={{textAlign:'center',fontSize:9,color:i+1===NOW_M?T.amber:T.dim,fontWeight:i+1===NOW_M?700:400}}>{m}</div>)}
                </div>
                {SP.map(s=>(
                  <div key={s.id} style={{display:'grid',gridTemplateColumns:'100px repeat(12,1fr)',gap:2,marginBottom:3,alignItems:'center'}}>
                    <div style={{fontSize:10,color:T.muted,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',paddingRight:6}}>{s.name}</div>
                    {Array.from({length:12},(_,i)=>i+1).map(m=>(
                      <div key={m} style={{height:8,borderRadius:99,
                        background:s.pm.includes(m)?s.c:T.surf2,
                        opacity:s.pm.includes(m)?(m===NOW_M?1:0.5):1,
                        outline:m===NOW_M?`1px solid ${T.amber}40`:'none'}}/>
                    ))}
                  </div>
                ))}
                <div style={{marginTop:12,display:'flex',alignItems:'center',gap:6,fontSize:10,color:T.amber}}>
                  <div style={{width:14,height:3,background:T.amber,borderRadius:99}}/>Current month
                </div>
              </div></div>
            </div>
            <div style={{background:T.surf,borderRadius:20,padding:18,border:`1px solid ${T.border}`}}>
              <div style={{fontSize:14,fontWeight:600,color:T.text,marginBottom:14}}>Monthly Nectar Flow Forecast</div>
              <div style={{display:'flex',gap:3,alignItems:'flex-end',height:80}}>
                {Array.from({length:12},(_,i)=>{
                  const m=i+1,bl=SP.filter(s=>s.pm.includes(m));
                  const sc=bl.length?bl.reduce((a,b)=>a+b.ns,0)/bl.length:0;
                  const[,fc]=flowInfo(sc);
                  return(<div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
                    <div style={{width:'100%',borderRadius:'4px 4px 0 0',height:`${(sc/10)*100}%`,minHeight:2,background:m===NOW_M?fc:T.surf2}}/>
                    <div style={{fontSize:9,color:m===NOW_M?T.amber:T.dim,fontWeight:m===NOW_M?700:400}}>{MO_S[i]}</div>
                  </div>);
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── SPECIES ── */}
        {tab==='species'&&(
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
              <button onClick={()=>setTypeFilter('all')} style={{padding:'6px 14px',borderRadius:99,border:'none',cursor:'pointer',fontSize:12,fontFamily:'inherit',
                background:typeFilter==='all'?T.accent:'transparent',color:typeFilter==='all'?'#0b1410':T.muted,fontWeight:typeFilter==='all'?700:400}}>All</button>
              {Object.entries(TYPES).map(([k,v])=>(
                <button key={k} onClick={()=>setTypeFilter(k)} style={{padding:'6px 14px',borderRadius:99,border:'none',cursor:'pointer',fontSize:12,fontFamily:'inherit',
                  background:typeFilter===k?`${v.c}22`:'transparent',color:typeFilter===k?v.c:T.muted,fontWeight:typeFilter===k?600:400}}>{v.label}</button>
              ))}
            </div>
            {filtered.map(s=>{
              const st=getStatus(s,NOW_M),ss=ST[st];
              return(
                <div key={s.id} className="spc" onClick={()=>setSelected(s)}
                  style={{background:T.surf,border:`1px solid ${T.border}`,borderRadius:18,overflow:'hidden',cursor:'pointer'}}>
                  <div style={{position:'relative',overflow:'hidden'}}>
                    <Banner query={s.inat} color={s.c} height={140}/>
                    <div style={{position:'absolute',inset:0,background:'linear-gradient(to bottom,transparent 20%,rgba(255,255,255,0.97) 100%)'}}/>
                    <div style={{position:'absolute',bottom:12,left:14,right:14,display:'flex',justifyContent:'space-between',alignItems:'flex-end'}}>
                      <div>
                        <div style={{fontSize:16,fontWeight:700,color:T.text,letterSpacing:-0.3}}>{s.name}</div>
                        <div style={{fontSize:11,color:T.muted,fontStyle:'italic',marginTop:1}}>{s.inat}</div>
                      </div>
                      <div style={{display:'flex',gap:6,alignItems:'center'}}>
                        <div style={{padding:'3px 9px',borderRadius:99,fontSize:11,background:ss.bg,color:ss.tc,fontWeight:500}}>{ss.label}</div>
                        <div style={{color:T.dim,fontSize:16}}>›</div>
                      </div>
                    </div>
                  </div>
                  <div style={{padding:'12px 14px'}}>
                    <div style={{display:'flex',gap:3,marginBottom:8}}>
                      {Array.from({length:12},(_,i)=>i+1).map(m=>(
                        <div key={m} style={{flex:1,height:5,borderRadius:99,
                          background:s.pm.includes(m)?s.c:T.surf2,
                          opacity:s.pm.includes(m)?(m===NOW_M?1:0.45):1}}/>
                      ))}
                    </div>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:12}}>
                      <span style={{color:T.muted}}>Peak: {s.pm.map(m=>MO[m-1]).join(', ')}</span>
                      <span style={{color:s.ns>=8?T.amber:s.ns>=6?T.accent:T.muted,fontWeight:600}}>Nectar {s.ns}/10</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab==='community'&&<CommunityTab/>}

      </div>

      <div style={{padding:20,textAlign:'center',fontSize:11,color:T.dim,borderTop:`1px solid ${T.border}`,marginTop:8}}>
        BloomCast · Photos via iNaturalist · Phenology via USA-NPN
      </div>
    </div>
  );
}