import { useState, useCallback, useEffect } from "react";

const NOW_M = 4;
const MO   = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MO_S = ['J','F','M','A','M','J','J','A','S','O','N','D'];

const SP = [
  {id:1,  name:"Cherry Blossom",  inat:"Prunus serrulata",            type:"ornamental", pm:[3,4],     ns:7,  c:"#ffb7c5"},
  {id:2,  name:"Eastern Redbud",  inat:"Cercis canadensis",            type:"ornamental", pm:[3,4],     ns:6,  c:"#da77f2"},
  {id:3,  name:"Dandelion",        inat:"Taraxacum officinale",         type:"forage",     pm:[3,4,5],   ns:7,  c:"#ffd43b"},
  {id:4,  name:"Wild Violet",      inat:"Viola sororia",                type:"wildflower", pm:[4,5],     ns:4,  c:"#9775fa"},
  {id:5,  name:"Apple Blossom",    inat:"Malus domestica",              type:"orchard",    pm:[4,5],     ns:8,  c:"#ffa8b4"},
  {id:6,  name:"Phacelia",         inat:"Phacelia tanacetifolia",       type:"forage",     pm:[4,5],     ns:9,  c:"#748ffc"},
  {id:7,  name:"White Clover",     inat:"Trifolium repens",             type:"forage",     pm:[5,6,7],   ns:9,  c:"#69db7c"},
  {id:8,  name:"Black Locust",     inat:"Robinia pseudoacacia",         type:"forage",     pm:[5,6],     ns:10, c:"#c0eb75"},
  {id:9,  name:"Linden",           inat:"Tilia americana",              type:"forage",     pm:[6,7],     ns:10, c:"#74c0fc"},
  {id:10, name:"Lavender",         inat:"Lavandula angustifolia",       type:"garden",     pm:[6,7,8],   ns:8,  c:"#d0bfff"},
  {id:11, name:"Black-eyed Susan", inat:"Rudbeckia hirta",              type:"wildflower", pm:[6,7,8],   ns:5,  c:"#ffa94d"},
  {id:12, name:"Sunflower",        inat:"Helianthus annuus",            type:"garden",     pm:[7,8,9],   ns:7,  c:"#ffe066"},
  {id:13, name:"Buckwheat",        inat:"Fagopyrum esculentum",         type:"forage",     pm:[7,8],     ns:8,  c:"#e9c46a"},
  {id:14, name:"Goldenrod",        inat:"Solidago canadensis",          type:"forage",     pm:[8,9,10],  ns:8,  c:"#ffd43b"},
  {id:15, name:"Aster",            inat:"Symphyotrichum novae-angliae", type:"wildflower", pm:[9,10,11], ns:7,  c:"#cc5de8"},
];

const TYPES = {
  forage:     {label:"Forage",     c:"#f5a623"},
  ornamental: {label:"Ornamental", c:"#e879a0"},
  wildflower: {label:"Wildflower", c:"#a78bfa"},
  garden:     {label:"Garden",     c:"#4ade80"},
  orchard:    {label:"Orchard",    c:"#fb7185"},
};
const ST = {
  blooming:{label:"Blooming",   bg:"#052e16",tc:"#4ade80"},
  opening: {label:"Opening",    bg:"#042f2e",tc:"#2dd4bf"},
  fading:  {label:"Fading",     bg:"#2d1b00",tc:"#fb923c"},
  soon:    {label:"Coming Soon",bg:"#1e1b4b",tc:"#818cf8"},
  dormant: {label:"Dormant",    bg:"#111827",tc:"#4b5563"},
};

const ANTHROPIC_KEY = (typeof window !== 'undefined' && window.__ANTHROPIC_KEY__) || '';
const SUPABASE_URL  = (typeof window !== 'undefined' && window.__SUPABASE_URL__)  || '';
const SUPABASE_KEY  = (typeof window !== 'undefined' && window.__SUPABASE_KEY__)  || '';

const sbHeaders = () => ({
  'Content-Type':  'application/json',
  'apikey':        SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
});
const apiHeaders = () => ({
  "Content-Type": "application/json",
  ...(ANTHROPIC_KEY ? {
    "x-api-key": ANTHROPIC_KEY,
    "anthropic-version": "2023-06-01",
    "anthropic-dangerous-direct-browser-access": "true",
  } : {})
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
  if(s<8.5) return ['Good Flow','#84cc16'];
  return ['Peak Flow','#22c55e'];
}

const photoCache = {};
async function fetchINatPhoto(q){
  if(photoCache[q]!==undefined) return photoCache[q];
  const ctrl=new AbortController(), t=setTimeout(()=>ctrl.abort(),8000);
  try{
    const r=await fetch(`https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(q)}&per_page=1&is_active=true&rank=species`,{signal:ctrl.signal});
    clearTimeout(t);
    if(!r.ok){photoCache[q]=null;return null;}
    const d=await r.json();
    const url=d.results?.[0]?.default_photo?.medium_url||d.results?.[0]?.default_photo?.square_url||null;
    photoCache[q]=url; return url;
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

function Thumb({query,color,size=56}){
  const{url,loading}=usePhoto(query);
  return(
    <div style={{width:size,height:size,borderRadius:10,flexShrink:0,overflow:'hidden',
      border:`1px solid ${color}40`,background:color+'18',display:'flex',alignItems:'center',justifyContent:'center'}}>
      {loading?<div style={{width:'55%',height:'55%',borderRadius:'50%',background:`radial-gradient(${color}90,${color}20)`,animation:'pulse 1.4s ease-in-out infinite'}}/>
       :url?<img src={url} alt="" style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}/>
       :<span style={{fontSize:size*0.42}}>🌸</span>}
    </div>
  );
}
function Banner({query,color,height=120}){
  const{url,loading}=usePhoto(query);
  return(
    <div style={{width:'100%',height,overflow:'hidden',background:color+'18',display:'flex',alignItems:'center',justifyContent:'center'}}>
      {loading?<div style={{width:44,height:44,borderRadius:'50%',background:`radial-gradient(${color}80,${color}15)`,animation:'pulse 1.4s ease-in-out infinite'}}/>
       :url?<img src={url} alt="" style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}/>
       :<span style={{fontSize:44}}>🌸</span>}
    </div>
  );
}

// ── Honey Predictor ──────────────────────────────────────────────────────────
function HoneyPredictor({bloomingSpecies, location}){
  const[open,setOpen]=useState(false);
  const[result,setResult]=useState(null);
  const[loading,setLoading]=useState(false);

  const predict=async()=>{
    setLoading(true); setResult(null);
    const names=bloomingSpecies.map(s=>s.name).join(', ');
    try{
      const res=await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",headers:{...apiHeaders()},
        body:JSON.stringify({
          model:"claude-sonnet-4-20250514",max_tokens:800,
          system:"You are a master beekeeper and honey sommelier. Respond with only a raw JSON object, no markdown.",
          messages:[{role:"user",content:
            `Based on these flowers currently blooming${location?' in '+location:''}: ${names}.
Predict the honey varieties a beekeeper would likely harvest. Return JSON:
{"varieties":[{"name":"variety name","flavor":"evocative 1-2 sentence flavor description","color":"color description","rarity":"Common|Seasonal|Rare","dominant_flower":"main nectar source"}],"blend_note":"1 sentence about the overall honey character this season","harvest_timing":"when to expect harvest ready"}`
          }]
        })
      });
      const d=await res.json();
      const raw=d.content?.filter(b=>b.type==='text').map(b=>b.text).join('')||'';
      let parsed=null;
      try{parsed=JSON.parse(raw.trim());}catch{}
      if(!parsed){const m=raw.match(/\{[\s\S]*\}/);if(m)try{parsed=JSON.parse(m[0]);}catch{}}
      setResult(parsed||null);
    }catch{}finally{setLoading(false);}
  };

  const rarityColor={'Common':'#4ade80','Seasonal':'#f5a623','Rare':'#c084fc'};

  return(
    <div style={{background:'#0a1f14',border:'1px solid #2d7a4a',borderRadius:'12px',overflow:'hidden'}}>
      <button onClick={()=>{setOpen(!open);if(!open&&!result)predict();}}
        style={{width:'100%',padding:'12px 14px',background:'none',border:'none',cursor:'pointer',
          display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
          <span style={{fontSize:'18px'}}>🍯</span>
          <div style={{textAlign:'left'}}>
            <div style={{fontSize:'13px',fontWeight:'700',color:'#f5a623'}}>Honey Variety Predictor</div>
            <div style={{fontSize:'11px',color:'#2d7a4a'}}>What honey will your bees make this season?</div>
          </div>
        </div>
        <span style={{color:'#2d7a4a',fontSize:'16px'}}>{open?'▲':'▼'}</span>
      </button>

      {open&&(
        <div style={{padding:'0 14px 14px',borderTop:'1px solid #1a4a2e'}}>
          {loading&&(
            <div style={{paddingTop:'14px'}}>
              {[80,60,90].map((w,i)=>(
                <div key={i} style={{height:'12px',borderRadius:'4px',background:'#1a4a2e',opacity:0.5,
                  width:`${w}%`,marginBottom:'8px',animation:'pulse 1.4s ease-in-out infinite'}}/>
              ))}
            </div>
          )}
          {!loading&&result&&(
            <div style={{paddingTop:'12px',display:'flex',flexDirection:'column',gap:'10px'}}>
              <div style={{fontSize:'12px',lineHeight:'1.6',color:'#8ab8a0',fontStyle:'italic'}}>{result.blend_note}</div>
              {result.varieties?.map((v,i)=>(
                <div key={i} style={{background:'#060f0a',borderRadius:'10px',padding:'12px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'6px'}}>
                    <div style={{fontSize:'14px',fontWeight:'700',color:'#f5c842'}}>{v.name}</div>
                    <div style={{fontSize:'10px',padding:'2px 7px',borderRadius:'4px',
                      background:rarityColor[v.rarity]+'20',color:rarityColor[v.rarity],fontWeight:'600'}}>
                      {v.rarity}
                    </div>
                  </div>
                  <div style={{fontSize:'12px',color:'#a7d9ba',lineHeight:'1.6',marginBottom:'6px'}}>{v.flavor}</div>
                  <div style={{display:'flex',gap:'12px',fontSize:'11px',color:'#2d7a4a'}}>
                    <span>🎨 {v.color}</span>
                    <span>🌸 {v.dominant_flower}</span>
                  </div>
                </div>
              ))}
              {result.harvest_timing&&(
                <div style={{fontSize:'11px',color:'#f5a623',padding:'8px 12px',
                  background:'#2d1b0030',borderRadius:'8px',border:'1px solid #f5a62320'}}>
                  ⏱ {result.harvest_timing}
                </div>
              )}
              <button onClick={predict} style={{background:'none',border:'1px solid #1a4a2e',
                borderRadius:'8px',color:'#2d7a4a',padding:'6px',cursor:'pointer',fontSize:'11px'}}>
                Regenerate Prediction
              </button>
            </div>
          )}
          {!loading&&!result&&(
            <div style={{paddingTop:'12px',textAlign:'center'}}>
              <button onClick={predict} style={{background:'#f5a623',border:'none',borderRadius:'8px',
                color:'#060f0a',padding:'8px 20px',cursor:'pointer',fontSize:'13px',fontWeight:'700'}}>
                Predict My Honey
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Community Reports Tab ────────────────────────────────────────────────────
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
      const r=await fetch(
        `${SUPABASE_URL}/rest/v1/reports?order=ts.desc&limit=50`,
        {headers:sbHeaders()}
      );
      if(r.ok) setReports(await r.json());
    }catch{}
    setLoading(false);
  };

  useEffect(()=>{loadReports();},[]);

  const submit=async()=>{
    if(!form.species.trim()||!form.location.trim()){
      setError('Species and location are required.');return;
    }
    setError('');setSubmitting(true);
    if(!SUPABASE_URL||!SUPABASE_KEY){
      setError('Supabase not configured — check your environment variables.');
      setSubmitting(false);return;
    }
    try{
      const r=await fetch(`${SUPABASE_URL}/rest/v1/reports`,{
        method:'POST',
        headers:{...sbHeaders(),'Prefer':'return=minimal'},
        body:JSON.stringify({...form,ts:Date.now()}),
      });
      if(r.ok||r.status===201){
        setForm({species:'',status:'blooming',location:'',note:''});
        setSubmitted(true);
        setTimeout(()=>setSubmitted(false),3000);
        await loadReports();
      } else {
        const txt=await r.text();
        setError(`Supabase error ${r.status}: ${txt}`);
      }
    }catch(e){setError(`Connection error: ${e.message}`);}
    setSubmitting(false);
  };

  const stColor={blooming:'#4ade80',opening:'#2dd4bf',fading:'#fb923c','not yet':'#818cf8'};
  const inp={background:'#0d2014',border:'1px solid #1a4a2e',borderRadius:'8px',color:'#c9e8d4',
    padding:'8px 12px',fontSize:'13px',outline:'none',width:'100%',boxSizing:'border-box'};

  return(
    <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
      {/* Submit form */}
      <div style={{background:'#0a1f14',border:'1px solid #1a4a2e',borderRadius:'12px',padding:'14px'}}>
        <div style={{fontSize:'11px',color:'#2d7a4a',fontWeight:'700',letterSpacing:'0.05em',marginBottom:'12px'}}>
          📍 LOG A SIGHTING
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
          <input style={inp} placeholder="Species (e.g. Black Locust, Wild Violet…)"
            value={form.species} onChange={e=>setForm(f=>({...f,species:e.target.value}))}/>
          <select style={{...inp,cursor:'pointer'}} value={form.status}
            onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
            <option value="blooming">Blooming</option>
            <option value="opening">Just Opening</option>
            <option value="fading">Fading</option>
            <option value="not yet">Not Yet</option>
          </select>
          <input style={inp} placeholder="Your location (e.g. Hudson Valley, NY)"
            value={form.location} onChange={e=>setForm(f=>({...f,location:e.target.value}))}/>
          <textarea style={{...inp,resize:'none',height:'60px'}} placeholder="Note (optional) — bee activity, density, conditions…"
            value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))}/>
          {error&&<div style={{fontSize:'12px',color:'#ef4444',marginTop:'4px'}}>{error}</div>}
          <button onClick={submit} disabled={submitting}
            style={{background:submitted?'#1a4a2e':'#f5a623',color:submitted?'#4ade80':'#060f0a',
              border:'none',borderRadius:'8px',padding:'9px',fontWeight:'700',cursor:'pointer',fontSize:'13px'}}>
            {submitted?'✓ Sighting Logged!':submitting?'Submitting…':'Submit Sighting'}
          </button>
        </div>
      </div>

      {/* Reports feed */}
      <div style={{fontSize:'11px',color:'#2d7a4a',fontWeight:'700',letterSpacing:'0.05em'}}>
        COMMUNITY SIGHTINGS
      </div>
      {loading&&<div style={{background:'#0a1f14',border:'1px solid #1a4a2e',borderRadius:'12px',padding:'14px',color:'#2d7a4a',fontSize:'13px'}}>Loading reports…</div>}
                {loading&&<div style={{background:'#0a1f14',border:'1px solid #1a4a2e',borderRadius:'12px',padding:'14px',color:'#2d7a4a',fontSize:'13px'}}>Loading community reports…</div>}
      {!loading&&reports.length===0&&(
        <div style={{background:'#0a1f14',border:'1px solid #1a4a2e',borderRadius:'12px',padding:'14px',
          color:'#2d5a3d',fontSize:'13px',textAlign:'center'}}>
          No sightings yet — be the first to log one above.
        </div>
      )}
      {!loading&&reports.map((r,i)=>(
        <div key={i} style={{background:'#0a1f14',border:'1px solid #1a4a2e',borderRadius:'12px',padding:'12px 14px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'4px'}}>
            <div style={{fontSize:'14px',fontWeight:'600',color:'#c9e8d4'}}>{r.species}</div>
            <div style={{fontSize:'10px',padding:'2px 7px',borderRadius:'4px',
              background:(stColor[r.status]||'#4ade80')+'18',color:stColor[r.status]||'#4ade80',fontWeight:'600',flexShrink:0,marginLeft:'8px'}}>
              {r.status}
            </div>
          </div>
          <div style={{fontSize:'11px',color:'#2d7a4a',marginBottom:r.note?'6px':'0'}}>
            📍 {r.location} · {new Date(r.ts).toLocaleDateString()}
          </div>
          {r.note&&<div style={{fontSize:'12px',color:'#6ab890',fontStyle:'italic'}}>{r.note}</div>}
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
    fetch("https://api.anthropic.com/v1/messages",{
      method:"POST",headers:{...apiHeaders()},
      body:JSON.stringify({
        model:"claude-sonnet-4-20250514",max_tokens:900,
        system:"You are a botanist and beekeeping expert. Respond with a single raw JSON object only. No markdown. Begin with { and end with }.",
        messages:[{role:"user",content:
          `Return a JSON profile for ${sp.name} (${sp.inat}) with keys: description (2-3 sentence botanical description), habitat (1-2 sentences), beekeeping (2-3 sentences on nectar quality and hive impact), did_you_know (one surprising fact), peak_tip (one practical field tip).`
        }]
      })
    })
    .then(r=>r.json())
    .then(d=>{
      const raw=d.content?.filter(b=>b.type==='text').map(b=>b.text).join('')||'';
      let p=null;
      try{p=JSON.parse(raw.trim());}catch{}
      if(!p)try{p=JSON.parse(raw.replace(/```[\w]*/g,'').replace(/```/g,'').trim());}catch{}
      if(!p){const m=raw.match(/\{[\s\S]*\}/);if(m)try{p=JSON.parse(m[0]);}catch{}}
      if(p){setInfo(p);setError(false);}else setError(true);
    })
    .catch(()=>setError(true))
    .finally(()=>setLoading(false));
  },[sp.id]);

  useEffect(()=>{load();},[load]);

  const card={background:'#0a1f14',border:'1px solid #1a4a2e',borderRadius:'12px',padding:'14px'};
  const lbl={fontSize:'10px',color:'#2d7a4a',fontWeight:'700',letterSpacing:'0.06em',marginBottom:'6px'};

  return(
    <div style={{background:'#060f0a',minHeight:'100vh',color:'#c9e8d4',fontFamily:'system-ui,sans-serif'}}>
      <div style={{background:'#0a1f14',borderBottom:'1px solid #1a4a2e',padding:'12px 16px',display:'flex',alignItems:'center',gap:'12px'}}>
        <button onClick={onBack} style={{background:'#1a4a2e',border:'none',borderRadius:'8px',color:'#4ade80',padding:'6px 14px',cursor:'pointer',fontSize:'13px',fontWeight:'600'}}>← Back</button>
        <div>
          <div style={{fontSize:'16px',fontWeight:'800',color:'#e8f8f0'}}>{sp.name}</div>
          <div style={{fontSize:'11px',color:'#4a7c5e',fontStyle:'italic'}}>{sp.inat}</div>
        </div>
      </div>
      <div style={{maxWidth:'580px',margin:'0 auto',padding:'14px',display:'flex',flexDirection:'column',gap:'12px'}}>
        <div style={{borderRadius:'14px',overflow:'hidden',position:'relative'}}>
          <Banner query={sp.inat} color={sp.c} height={200}/>
          <div style={{position:'absolute',inset:0,background:'linear-gradient(to bottom,transparent 40%,#060f0aee 100%)'}}/>
          <div style={{position:'absolute',bottom:'14px',left:'16px',right:'16px',display:'flex',justifyContent:'space-between',alignItems:'flex-end'}}>
            <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
              <div style={{padding:'4px 10px',borderRadius:'6px',fontSize:'11px',background:ss.bg,color:ss.tc,fontWeight:'600'}}>{ss.label}</div>
              <div style={{padding:'4px 10px',borderRadius:'6px',fontSize:'11px',background:'#0008',color:ti.c,fontWeight:'600'}}>{ti.label}</div>
            </div>
            <div style={{padding:'4px 10px',borderRadius:'6px',fontSize:'11px',background:'#0008',color:fc,fontWeight:'700'}}>Nectar {sp.ns}/10</div>
          </div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'8px'}}>
          {[[sp.ns+'/10','Nectar Score',fc],[sp.pm.length,'Bloom Months','#4ade80'],[sp.pm.map(m=>MO[m-1][0]).join(''),'Season','#818cf8']].map(([v,l,c])=>(
            <div key={l} style={{...card,textAlign:'center',padding:'12px 8px'}}>
              <div style={{fontSize:'22px',fontWeight:'800',color:c,lineHeight:1}}>{v}</div>
              <div style={{fontSize:'10px',color:'#2d7a4a',marginTop:'4px'}}>{l}</div>
            </div>
          ))}
        </div>
        <div style={card}>
          <div style={lbl}>BLOOM SEASON</div>
          <div style={{display:'flex',gap:'3px',marginBottom:'6px'}}>
            {Array.from({length:12},(_,i)=>i+1).map(m=>(
              <div key={m} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:'3px'}}>
                <div style={{width:'100%',height:'10px',borderRadius:'2px',background:sp.pm.includes(m)?sp.c:'#0d2014',
                  opacity:sp.pm.includes(m)?(m===NOW_M?1:0.6):1,outline:m===NOW_M?'1px solid #f5a62360':'none'}}/>
                <div style={{fontSize:'8px',color:m===NOW_M?'#f5a623':'#2d5a3d'}}>{MO_S[m-1]}</div>
              </div>
            ))}
          </div>
          <div style={{fontSize:'11px',color:'#2d7a4a'}}>Peak: <span style={{color:'#8ab8a0'}}>{sp.pm.map(m=>MO[m-1]).join(', ')}</span></div>
        </div>
        {loading&&(
          <div style={{...card,display:'flex',flexDirection:'column',gap:'14px'}}>
            {['DESCRIPTION','HABITAT','BEEKEEPING NOTES'].map(l=>(
              <div key={l}>
                <div style={lbl}>{l}</div>
                <div style={{height:'12px',borderRadius:'4px',background:'#1a4a2e',opacity:0.5,animation:'pulse 1.4s ease-in-out infinite',marginBottom:'6px'}}/>
                <div style={{height:'12px',borderRadius:'4px',background:'#1a4a2e',opacity:0.3,width:'70%',animation:'pulse 1.4s ease-in-out infinite'}}/>
              </div>
            ))}
          </div>
        )}
        {!loading&&error&&(
          <div style={{...card,textAlign:'center'}}>
            <div style={{color:'#4a7c5e',fontSize:'13px',marginBottom:'12px'}}>Failed to load species details.</div>
            <button onClick={load} style={{background:'#1a4a2e',border:'1px solid #2d7a4a',borderRadius:'8px',color:'#4ade80',padding:'8px 18px',cursor:'pointer',fontSize:'13px',fontWeight:'600'}}>Try Again</button>
          </div>
        )}
        {!loading&&info&&(
          <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
            <div style={card}><div style={lbl}>DESCRIPTION</div><p style={{margin:0,fontSize:'13px',lineHeight:'1.7',color:'#a7d9ba'}}>{info.description}</p></div>
            <div style={card}><div style={lbl}>HABITAT</div><p style={{margin:0,fontSize:'13px',lineHeight:'1.7',color:'#a7d9ba'}}>{info.habitat}</p></div>
            <div style={{...card,borderColor:'#2d7a4a',background:'#071a10'}}>
              <div style={{...lbl,color:'#f5a623'}}>🐝 BEEKEEPING NOTES</div>
              <p style={{margin:0,fontSize:'13px',lineHeight:'1.7',color:'#c9e8d4'}}>{info.beekeeping}</p>
            </div>
            <div style={card}><div style={lbl}>FIELD TIP</div><p style={{margin:0,fontSize:'13px',lineHeight:'1.7',color:'#a7d9ba'}}>{info.peak_tip}</p></div>
            <div style={{...card,borderStyle:'dashed'}}><div style={lbl}>DID YOU KNOW</div><p style={{margin:0,fontSize:'13px',lineHeight:'1.7',color:'#6ab890',fontStyle:'italic'}}>{info.did_you_know}</p></div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Bloom Radar ──────────────────────────────────────────────────────────────
function BloomRadar({month,hiveName}){
  const active=SP.filter(s=>s.pm.includes(month)||s.pm.includes(month-1));
  const dots=active.map((s,i)=>{
    const a=i*2.39996-Math.PI/2,r=Math.min(30+(s.ns/10)*65+(i%4)*12,108);
    const isActive=s.pm.includes(month);
    return{...s,x:130+Math.cos(a)*r,y:130+Math.sin(a)*r,sz:4+s.ns*1.1*(isActive?1:0.45),isActive};
  });
  return(
    <svg width="260" height="260" viewBox="0 0 260 260" style={{display:'block',margin:'0 auto'}}>
      <defs><radialGradient id="rbg" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#0d2b1a"/><stop offset="100%" stopColor="#060f0a"/>
      </radialGradient></defs>
      <circle cx="130" cy="130" r="127" fill="url(#rbg)" stroke="#1a4a2e" strokeWidth="1"/>
      {[40,75,110].map(r=><circle key={r} cx="130" cy="130" r={r} fill="none" stroke="#1e5c35" strokeWidth="0.5" strokeDasharray="3,5"/>)}
      <line x1="130" y1="12" x2="130" y2="248" stroke="#1e5c35" strokeWidth="0.5" opacity="0.4"/>
      <line x1="12" y1="130" x2="248" y2="130" stroke="#1e5c35" strokeWidth="0.5" opacity="0.4"/>
      <text x="133" y="94" fill="#2d7a4a" fontSize="8">1 mi</text>
      <text x="133" y="58" fill="#2d7a4a" fontSize="8">2 mi</text>
      {dots.map((d,i)=>(
        <g key={i}>
          <circle cx={d.x} cy={d.y} r={d.sz+8} fill={d.c} opacity={d.isActive?0.08:0.03}/>
          <circle cx={d.x} cy={d.y} r={d.sz+3} fill={d.c} opacity={d.isActive?0.18:0.07}/>
          <circle cx={d.x} cy={d.y} r={d.sz} fill={d.c} opacity={d.isActive?0.82:0.28}/>
        </g>
      ))}
      <circle cx="130" cy="130" r="13" fill="#f5a623" opacity="0.95"/>
      <text x="130" y="133.5" textAnchor="middle" fontSize="12" dominantBaseline="middle">🐝</text>
      {hiveName&&<text x="130" y="150" textAnchor="middle" fontSize="7" fill="#f5a623" opacity="0.8">{hiveName}</text>}
    </svg>
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
  const[hive,setHive]=useState(null); // {name, location}
  const[hiveInput,setHiveInput]=useState('');
  const[showHiveForm,setShowHiveForm]=useState(false);

  // Load saved hive from storage
  useEffect(()=>{
    window.storage?.get('bc-hive').then(r=>{
      if(r) setHive(JSON.parse(r.value));
    }).catch(()=>{});
  },[]);

  const saveHive=async()=>{
    if(!hiveInput.trim()) return;
    const h={name:hiveInput.trim(),saved:Date.now()};
    await window.storage?.set('bc-hive',JSON.stringify(h)).catch(()=>{});
    setHive(h); setHiveInput(''); setShowHiveForm(false);
    // Auto-set as location
    setLocation(h.name);
    fetchBrief(h.name);
    fetchLocSpecies(h.name);
  };

  const fetchBrief=useCallback(async loc=>{
    setBriefLoad(true);setBrief('');
    try{
      const res=await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",headers:{...apiHeaders()},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,
          system:"You are BloomCast. Write in flowing prose, no bullets. Be regionally specific.",
          messages:[{role:"user",content:`Bloom briefing for ${loc}, April 4 2026. 4–5 sentences: blooming now, nectar flow next 2–3 weeks, one beekeeper tip, seasonal outlook.`}]})
      });
      const d=await res.json();
      setBrief(d.content?.filter(b=>b.type==='text').map(b=>b.text).join('')||'Unable to generate.');
    }catch{setBrief('Connection error.');}finally{setBriefLoad(false);}
  },[]);

  const fetchLocSpecies=useCallback(async loc=>{
    setLocLoad(true);setLocBloom(null);
    try{
      const res=await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",headers:{...apiHeaders()},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:900,
          system:"Return ONLY valid JSON — no markdown, no backticks.",
          messages:[{role:"user",content:`Region "${loc}", April 4 2026. JSON:
"blooming":[{name,inat,nectar(1-10),type,color(hex),status("blooming"|"opening"|"fading")}]
"upcoming":[names] — 5-9 blooming, 3-5 upcoming. JSON only.`}]})
      });
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
    ||{...SP[2],...s,c:s.color||s.c||'#88aabb',ns:s.nectar||5};

  const bloomNow=SP.filter(s=>s.pm.includes(NOW_M));
  const upcoming=SP.filter(s=>s.pm.includes(NOW_M+1)&&!s.pm.includes(NOW_M));
  const dBloom=locBloom?locBloom.blooming:bloomNow;
  const dUpcoming=locBloom?locBloom.upcoming:upcoming.map(s=>s.name);
  const avgNec=dBloom.length?Math.round(dBloom.reduce((a,b)=>a+(b.ns||b.nectar||0),0)/dBloom.length*10)/10:0;
  const[flowLabel,flowColor]=flowInfo(avgNec);
  const filtered=typeFilter==='all'?SP:SP.filter(s=>s.type===typeFilter);

  const C={
    wrap:{background:'#060f0a',minHeight:'100vh',color:'#c9e8d4',fontFamily:'system-ui,sans-serif'},
    hdr:{background:'#0a1f14',borderBottom:'1px solid #1a4a2e',padding:'12px 16px'},
    card:{background:'#0a1f14',border:'1px solid #1a4a2e',borderRadius:'12px',padding:'14px'},
    inp:{background:'#0d2014',border:'1px solid #2d7a4a',borderRadius:'8px',color:'#c9e8d4',padding:'8px 12px',fontSize:'14px',outline:'none',flex:1},
    btn:{background:'#f5a623',color:'#060f0a',border:'none',borderRadius:'8px',padding:'8px 16px',fontWeight:'700',cursor:'pointer',fontSize:'13px',whiteSpace:'nowrap'},
    tab:a=>({padding:'7px 10px',borderRadius:'6px',border:'none',cursor:'pointer',fontSize:'11px',background:a?'#1a4a2e':'transparent',color:a?'#4ade80':'#4a7c5e',fontWeight:a?'600':'400',whiteSpace:'nowrap'}),
  };

  if(selected) return <SpeciesDetail sp={selected} onBack={()=>setSelected(null)}/>;

  return(
    <div style={C.wrap}>
      <style>{`@keyframes pulse{0%,100%{opacity:.3}50%{opacity:.85}} .spc:hover{opacity:0.8}`}</style>

      <div style={C.hdr}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'10px'}}>
          <div>
            <span style={{fontSize:'18px',fontWeight:'800',color:'#4ade80',letterSpacing:'-0.5px'}}>🌿 BloomCast</span>
            <span style={{fontSize:'11px',color:'#2d7a4a',marginLeft:'8px'}}>Bloom & Nectar Intelligence</span>
          </div>
          {/* Hive pin button */}
          <button onClick={()=>setShowHiveForm(v=>!v)}
            style={{background:hive?'#1a4a2e':'#0d2014',border:'1px solid #2d7a4a',borderRadius:'8px',
              color:hive?'#f5a623':'#4a7c5e',padding:'5px 10px',cursor:'pointer',fontSize:'11px',whiteSpace:'nowrap'}}>
            📍 {hive?hive.name:'Set Hive'}
          </button>
        </div>

        {/* Hive form */}
        {showHiveForm&&(
          <div style={{marginBottom:'10px',display:'flex',gap:'8px'}}>
            <input style={{...C.inp,fontSize:'13px'}} placeholder="Hive name or location (e.g. Backyard NJ, Hudson Valley)"
              value={hiveInput} onChange={e=>setHiveInput(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&saveHive()}/>
            <button style={{...C.btn,padding:'8px 12px'}} onClick={saveHive}>Save</button>
          </div>
        )}

        <div style={{display:'flex',gap:'8px'}}>
          <input style={C.inp} placeholder="Enter region (e.g. Central Virginia, Willamette Valley…)"
            value={locInput} onChange={e=>setLocInput(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&handleSubmit()}/>
          <button style={C.btn} onClick={handleSubmit}>Brief Me</button>
        </div>
      </div>

      <div style={{display:'flex',gap:'2px',padding:'8px 12px',background:'#081510',borderBottom:'1px solid #1a4a2e',overflowX:'auto'}}>
        {[['dashboard','📊 Dashboard'],['map','🗺 Radar'],['calendar','📅 Calendar'],['species','🌸 Species'],['community','🌿 Community']].map(([k,l])=>(
          <button key={k} style={C.tab(tab===k)} onClick={()=>setTab(k)}>{l}</button>
        ))}
      </div>

      <div style={{padding:'14px',maxWidth:'580px',margin:'0 auto',display:'flex',flexDirection:'column',gap:'12px'}}>

        {tab==='dashboard'&&(
          <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
            <div style={C.card}>
              <div style={{fontSize:'11px',color:'#2d7a4a',fontWeight:'700',letterSpacing:'0.05em',marginBottom:'8px'}}>
                ✦ AI BLOOM BRIEFING {location&&<span style={{color:'#4a7c5e',fontWeight:'400'}}>· {location}</span>}
              </div>
              {briefLoad&&<div style={{color:'#2d7a4a',fontSize:'13px'}}>Querying phenology models…</div>}
              {!briefLoad&&!brief&&<div style={{color:'#2d5a3d',fontSize:'13px',lineHeight:'1.6'}}>Enter your region above to generate a personalized bloom briefing.</div>}
              {!briefLoad&&brief&&<div style={{fontSize:'13px',lineHeight:'1.7',color:'#a7d9ba'}}>{brief}</div>}
            </div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'8px'}}>
              {[[locLoad?'…':dBloom.length,'Blooming Now','#4ade80'],[avgNec,'Nectar Index',flowColor],[locLoad?'…':dUpcoming.length,'Coming Soon','#818cf8']].map(([v,l,c])=>(
                <div key={l} style={{...C.card,textAlign:'center',padding:'12px 8px'}}>
                  <div style={{fontSize:'26px',fontWeight:'800',color:c,lineHeight:1}}>{v}</div>
                  <div style={{fontSize:'10px',color:'#2d7a4a',marginTop:'4px'}}>{l}</div>
                </div>
              ))}
            </div>

            <div style={C.card}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:'8px',fontSize:'11px'}}>
                <span style={{color:'#2d7a4a',fontWeight:'700',letterSpacing:'0.05em'}}>NECTAR FLOW INDEX</span>
                <span style={{color:flowColor,fontWeight:'700'}}>{flowLabel}</span>
              </div>
              <div style={{background:'#060f0a',borderRadius:'99px',height:'7px',overflow:'hidden'}}>
                <div style={{height:'100%',borderRadius:'99px',width:`${(avgNec/10)*100}%`,
                  background:`linear-gradient(90deg,${flowColor}60,${flowColor})`,transition:'width 1s ease'}}/>
              </div>
              <div style={{marginTop:'8px',fontSize:'11px',color:'#2d5a3d',lineHeight:'1.5'}}>
                {locLoad?'Loading…':dBloom.map(s=>s.name).join('  ·  ')}
              </div>
            </div>

            {/* Honey Predictor */}
            {dBloom.length>0&&<HoneyPredictor bloomingSpecies={dBloom} location={location}/>}

            <div style={{fontSize:'11px',color:'#2d7a4a',fontWeight:'700',letterSpacing:'0.05em'}}>
              BLOOMING NOW {location&&<span style={{color:'#2d5a3d',fontWeight:'400'}}>· {location}</span>}
            </div>
            {locLoad&&<div style={{...C.card,color:'#2d7a4a',fontSize:'13px'}}>Querying regional bloom data…</div>}
            {!locLoad&&dBloom.map((s,i)=>{
              const spObj=resolveToSP(s);
              const ns=spObj.ns||s.nectar||5;
              const st=s.status||getStatus(spObj,NOW_M);
              const ss=ST[st]||ST.blooming;
              const tc=spObj.c||s.color||'#4ade80';
              const ti=TYPES[s.type]||TYPES.wildflower;
              return(
                <div key={i} className="spc" onClick={()=>setSelected(spObj)}
                  style={{...C.card,display:'flex',alignItems:'center',gap:'12px',padding:'10px 12px',cursor:'pointer'}}>
                  <Thumb query={spObj.inat||s.name} color={tc} size={56}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:'6px',marginBottom:'2px'}}>
                      <div style={{fontSize:'13px',fontWeight:'600',color:'#c9e8d4',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.name}</div>
                      <div style={{fontSize:'10px',padding:'2px 7px',borderRadius:'4px',background:ss.bg,color:ss.tc,fontWeight:'500',flexShrink:0}}>{ss.label}</div>
                    </div>
                    <div style={{fontSize:'11px',color:ti.c,marginBottom:'4px'}}>{ti.label}</div>
                    <div style={{fontSize:'11px',color:'#f5a623',letterSpacing:'1px'}}>{'▰'.repeat(ns)}{'▱'.repeat(10-ns)}</div>
                  </div>
                  <div style={{color:'#2d7a4a',fontSize:'18px',flexShrink:0}}>›</div>
                </div>
              );
            })}
            {!locLoad&&dUpcoming.length>0&&(
              <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                <div style={{fontSize:'11px',color:'#2d7a4a',fontWeight:'700',letterSpacing:'0.05em'}}>COMING SOON</div>
                <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
                  {dUpcoming.map((s,i)=>(
                    <div key={i} style={{padding:'5px 10px',borderRadius:'8px',fontSize:'11px',background:'#1e1b4b',color:'#818cf8',border:'1px solid #312e81',display:'flex',alignItems:'center',gap:'5px'}}>
                      <div style={{width:'6px',height:'6px',borderRadius:'50%',background:'#818cf8'}}/>
                      {typeof s==='string'?s:s.name}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab==='map'&&(
          <div style={C.card}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'4px'}}>
              <div style={{fontSize:'11px',color:'#2d7a4a',fontWeight:'700'}}>BLOOM RADAR</div>
              {hive&&<div style={{fontSize:'11px',color:'#f5a623'}}>📍 {hive.name}</div>}
            </div>
            <div style={{fontSize:'11px',color:'#2d5a3d',marginBottom:'12px'}}>Active bloom signals · 3-mile foraging radius</div>
            <div style={{display:'flex',gap:'3px',flexWrap:'wrap',marginBottom:'14px'}}>
              {MO.map((m,i)=>(
                <button key={i} onClick={()=>setViewMonth(i+1)} style={{padding:'3px 7px',borderRadius:'4px',border:'none',cursor:'pointer',fontSize:'11px',
                  background:viewMonth===i+1?'#f5a623':'#0d2014',color:viewMonth===i+1?'#060f0a':'#4a7c5e',fontWeight:viewMonth===i+1?'700':'400'}}>{m}</button>
              ))}
            </div>
            <BloomRadar month={viewMonth} hiveName={hive?.name}/>
            {!hive&&(
              <div style={{textAlign:'center',marginTop:'8px'}}>
                <button onClick={()=>{setShowHiveForm(true);setTab('dashboard');}}
                  style={{background:'none',border:'1px dashed #2d7a4a',borderRadius:'8px',color:'#2d7a4a',
                    padding:'6px 14px',cursor:'pointer',fontSize:'11px'}}>
                  📍 Pin your hive location
                </button>
              </div>
            )}
            <div style={{marginTop:'14px',fontSize:'11px',color:'#2d7a4a',fontWeight:'700',marginBottom:'6px'}}>ACTIVE</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:'6px'}}>
              {SP.filter(s=>s.pm.includes(viewMonth)).map(s=>(
                <div key={s.id} style={{display:'flex',alignItems:'center',gap:'4px',fontSize:'11px'}}>
                  <div style={{width:'8px',height:'8px',borderRadius:'50%',background:s.c}}/>
                  <span style={{color:'#8ab8a0'}}>{s.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab==='calendar'&&(
          <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
            <div style={C.card}>
              <div style={{fontSize:'11px',color:'#2d7a4a',fontWeight:'700',marginBottom:'12px'}}>BLOOM SEASON CALENDAR · 2026</div>
              <div style={{overflowX:'auto'}}><div style={{minWidth:'400px'}}>
                <div style={{display:'grid',gridTemplateColumns:'100px repeat(12,1fr)',gap:'2px',marginBottom:'6px'}}>
                  <div/>{MO_S.map((m,i)=><div key={i} style={{textAlign:'center',fontSize:'9px',color:i+1===NOW_M?'#f5a623':'#2d7a4a',fontWeight:i+1===NOW_M?'700':'400'}}>{m}</div>)}
                </div>
                {SP.map(s=>(
                  <div key={s.id} style={{display:'grid',gridTemplateColumns:'100px repeat(12,1fr)',gap:'2px',marginBottom:'2px',alignItems:'center'}}>
                    <div style={{fontSize:'10px',color:'#6ab890',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',paddingRight:'4px'}}>{s.name}</div>
                    {Array.from({length:12},(_,i)=>i+1).map(m=>(
                      <div key={m} style={{height:'11px',borderRadius:'2px',background:s.pm.includes(m)?s.c:'#0d2014',
                        opacity:s.pm.includes(m)?(m===NOW_M?1:0.55):1,outline:m===NOW_M?'1px solid #f5a62350':'none'}}/>
                    ))}
                  </div>
                ))}
                <div style={{marginTop:'10px',display:'flex',alignItems:'center',gap:'6px',fontSize:'10px',color:'#f5a623'}}>
                  <div style={{width:'14px',height:'3px',background:'#f5a623',borderRadius:'1px'}}/>Current month
                </div>
              </div></div>
            </div>
            <div style={C.card}>
              <div style={{fontSize:'11px',color:'#2d7a4a',fontWeight:'700',marginBottom:'12px'}}>MONTHLY NECTAR FLOW FORECAST</div>
              <div style={{display:'flex',gap:'3px',alignItems:'flex-end',height:'80px'}}>
                {Array.from({length:12},(_,i)=>{
                  const m=i+1,bl=SP.filter(s=>s.pm.includes(m));
                  const sc=bl.length?bl.reduce((a,b)=>a+b.ns,0)/bl.length:0;
                  const[,fc]=flowInfo(sc);
                  return(<div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:'4px'}}>
                    <div style={{width:'100%',borderRadius:'3px 3px 0 0',height:`${(sc/10)*100}%`,minHeight:'2px',background:m===NOW_M?fc:'linear-gradient(180deg,#2d7a4a80,#1a4a2e)'}}/>
                    <div style={{fontSize:'9px',color:m===NOW_M?'#f5a623':'#2d7a4a',fontWeight:m===NOW_M?'700':'400'}}>{MO_S[i]}</div>
                  </div>);
                })}
              </div>
            </div>
          </div>
        )}

        {tab==='species'&&(
          <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
            <div style={{display:'flex',gap:'5px',flexWrap:'wrap'}}>
              <button onClick={()=>setTypeFilter('all')} style={{padding:'4px 10px',borderRadius:'99px',border:'none',cursor:'pointer',fontSize:'11px',background:typeFilter==='all'?'#1a4a2e':'#0d2014',color:typeFilter==='all'?'#4ade80':'#4a7c5e'}}>All</button>
              {Object.entries(TYPES).map(([k,v])=>(
                <button key={k} onClick={()=>setTypeFilter(k)} style={{padding:'4px 10px',borderRadius:'99px',border:'none',cursor:'pointer',fontSize:'11px',background:typeFilter===k?v.c+'22':'#0d2014',color:typeFilter===k?v.c:'#4a7c5e'}}>{v.label}</button>
              ))}
            </div>
            {filtered.map(s=>{
              const st=getStatus(s,NOW_M),ss=ST[st];
              return(
                <div key={s.id} className="spc" onClick={()=>setSelected(s)}
                  style={{...C.card,padding:0,overflow:'hidden',cursor:'pointer'}}>
                  <div style={{position:'relative',overflow:'hidden'}}>
                    <Banner query={s.inat} color={s.c} height={120}/>
                    <div style={{position:'absolute',inset:0,background:'linear-gradient(to bottom,transparent 25%,#0a1f14f0 100%)',pointerEvents:'none'}}/>
                    <div style={{position:'absolute',bottom:'10px',left:'12px',right:'12px',display:'flex',justifyContent:'space-between',alignItems:'flex-end'}}>
                      <div>
                        <div style={{fontSize:'15px',fontWeight:'700',color:'#e8f8f0',textShadow:'0 1px 6px #000a'}}>{s.name}</div>
                        <div style={{fontSize:'10px',color:'#94a3b8',fontStyle:'italic'}}>{s.inat}</div>
                      </div>
                      <div style={{display:'flex',gap:'6px',alignItems:'center'}}>
                        <div style={{padding:'3px 8px',borderRadius:'5px',fontSize:'10px',background:ss.bg,color:ss.tc,fontWeight:'500'}}>{ss.label}</div>
                        <div style={{color:'#4ade80',fontSize:'18px'}}>›</div>
                      </div>
                    </div>
                  </div>
                  <div style={{padding:'10px 12px'}}>
                    <div style={{display:'flex',gap:'2px',marginBottom:'8px'}}>
                      {Array.from({length:12},(_,i)=>i+1).map(m=>(
                        <div key={m} style={{flex:1,height:'5px',borderRadius:'1px',background:s.pm.includes(m)?s.c:'#0d2014',opacity:s.pm.includes(m)?(m===NOW_M?1:0.45):1}}/>
                      ))}
                    </div>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:'11px'}}>
                      <span style={{color:'#2d7a4a'}}>Peak: {s.pm.map(m=>MO[m-1]).join(', ')}</span>
                      <span style={{color:s.ns>=8?'#f5a623':s.ns>=6?'#a3e635':'#4a7c5e',fontWeight:'600'}}>Nectar {s.ns}/10</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab==='community'&&<CommunityTab/>}

      </div>

      <div style={{padding:'16px',textAlign:'center',fontSize:'10px',color:'#1a3a22',borderTop:'1px solid #0d2014',marginTop:'8px'}}>
        BloomCast Beta · Photos via iNaturalist · Phenology via USA-NPN · Satellite via Sentinel-2
      </div>
    </div>
  );
}