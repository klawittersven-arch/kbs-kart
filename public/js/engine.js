(()=>{
'use strict';
// ====================================================================
// Grundwerte
// ====================================================================
const W=240,H=160,HOR=48,F=120,CX=120,CAMH=17,CAMD=28,MAP=1024;
const RH=23,CURB=4,WALL=49,BAR=7,STEP=4,TAU=Math.PI*2;
const VOX=0.65,SPR=80,SPR_OY=64,SPR_PX=3,ANG=16,KR=4.2,LAPS=3,PW=960;
const SPR_WORLD=SPR*VOX/SPR_PX;
const GS=2,TS=2,TMAP=MAP*TS,W2=W*GS,GH=(H-HOR)*GS; // Boden: doppelte Bildschirm- und Texturauflösung
const CC={50:{mul:.80,ai:.93,items:.35,label:'50 ccm'},100:{mul:.90,ai:.965,items:.65,label:'100 ccm'},150:{mul:1,ai:1,items:1,label:'150 ccm'}};
const POINTS=[9,6,3,1,0,0,0,0];
const $=s=>document.querySelector(s);
const clamp=(v,a,b)=>v<a?a:v>b?b:v, lerp=(a,b,t)=>a+(b-a)*t;
const wrapA=a=>{a=(a+Math.PI)%TAU;if(a<0)a+=TAU;return a-Math.PI;};
function mulberry(s){return function(){s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const HEXC=new Map();
function hex(c){let v=HEXC.get(c);if(!v){let h=c.slice(1,7);if(h.length===3)h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2];const n=parseInt(h,16);v=[n>>16&255,n>>8&255,n&255];HEXC.set(c,v);}return v;}
const toHex=(r,g,b)=>'#'+[r,g,b].map(v=>clamp(Math.round(v),0,255).toString(16).padStart(2,'0')).join('');
const SHC=new Map();
function shade(c,f){const key=c+f;let v=SHC.get(key);if(!v){const[r,g,b]=hex(c);v=f>=0?toHex(r+(255-r)*f,g+(255-g)*f,b+(255-b)*f):toHex(r*(1+f),g*(1+f),b*(1+f));SHC.set(key,v);}return v;}
const mix=(a,b,t)=>{const A=hex(a),B=hex(b);return toHex(lerp(A[0],B[0],t),lerp(A[1],B[1],t),lerp(A[2],B[2],t));};
function hsl(h,s,l){s/=100;l/=100;const k=n=>(n+h/30)%12,a=s*Math.min(l,1-l),f=n=>l-a*Math.max(-1,Math.min(k(n)-3,Math.min(9-k(n),1)));return toHex(f(0)*255,f(8)*255,f(4)*255);}
function mk(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
function pix(w,h,fn){const c=mk(w,h),g=c.getContext('2d'),im=g.createImageData(w,h),d=im.data;for(let y=0;y<h;y++)for(let x=0;x<w;x++){const col=fn(x,y);if(col){const q=hex(col),i=(y*w+x)*4;d[i]=q[0];d[i+1]=q[1];d[i+2]=q[2];d[i+3]=255;}}g.putImageData(im,0,0);return c;}
function outline(cv,col){const g=cv.getContext('2d'),w=cv.width,h=cv.height,im=g.getImageData(0,0,w,h),d=im.data,o=new Uint8Array(w*h);for(let i=0;i<w*h;i++)o[i]=d[i*4+3]>0?1:0;const q=hex(col);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x;if(o[i])continue;if((x>0&&o[i-1])||(x<w-1&&o[i+1])||(y>0&&o[i-w])||(y<h-1&&o[i+w])){d[i*4]=q[0];d[i*4+1]=q[1];d[i*4+2]=q[2];d[i*4+3]=255;}}g.putImageData(im,0,0);return cv;}
const fmt=f=>{const cs=Math.floor(f/60*100),m=Math.floor(cs/6000),s=Math.floor(cs/100)%60,c=cs%100;return `${m}'${String(s).padStart(2,'0')}"${String(c).padStart(2,'0')}`;};

// ====================================================================
// Speicher
// ====================================================================
const STORE_KEY='pixelpiste.v1';
const SCHOOL_LOGO='img/logo.png';
let store={records:{},settings:{}};
try{const raw=localStorage.getItem(STORE_KEY);if(raw)store=Object.assign(store,JSON.parse(raw));}catch(e){}
function save(){try{localStorage.setItem(STORE_KEY,JSON.stringify(store));}catch(e){}}

// ====================================================================
// Fahrer: drei Gewichtsklassen, sieben Werte (1–5)
// ====================================================================
const CHARS=[
 {name:'Fenna',kind:'Füchsin',cls:'Mittel',st:{acc:3,wt:3,top:3,brk:3,hdl:3,drf:3,off:3},fur:'#f08a24',fur2:'#fff1dc',body:'#f08a24',kart:'#e5383b',kart2:'#ffd23f',head:'fox'},
 {name:'Otto',kind:'Otter',cls:'Mittel',st:{acc:3,wt:3,top:3,brk:4,hdl:5,drf:5,off:3},fur:'#8b5a36',fur2:'#e2bf94',body:'#8b5a36',kart:'#14a39a',kart2:'#e9fbf6',head:'otter'},
 {name:'Pip',kind:'Pinguin',cls:'Leicht',st:{acc:5,wt:1,top:2,brk:4,hdl:3,drf:3,off:4},fur:'#2a2f45',fur2:'#ffffff',body:'#2a2f45',beak:'#ff9a1f',kart:'#ffc61a',kart2:'#2a62d8',head:'penguin'},
 {name:'Lotta',kind:'Häsin',cls:'Leicht',st:{acc:5,wt:1,top:2,brk:3,hdl:4,drf:2,off:4},fur:'#f4f1ff',fur2:'#ffb3c8',body:'#f4f1ff',kart:'#ff5fa8',kart2:'#ffffff',head:'bunny'},
 {name:'Kiko',kind:'Frosch',cls:'Leicht',st:{acc:4,wt:2,top:1,brk:5,hdl:5,drf:3,off:5},fur:'#5cc23c',fur2:'#e9f8b0',body:'#5cc23c',kart:'#8a4fd8',kart2:'#f0d8ff',head:'frog'},
 {name:'Bruno',kind:'Bär',cls:'Schwer',st:{acc:2,wt:4,top:4,brk:2,hdl:2,drf:4,off:2},fur:'#b8762e',fur2:'#efcc96',body:'#b8762e',kart:'#2f6fe0',kart2:'#f2f2f2',head:'bear'},
 {name:'Volt',kind:'Roboter',cls:'Schwer',st:{acc:2,wt:4,top:4,brk:2,hdl:1,drf:1,off:2},fur:'#b9c3d4',fur2:'#5ef0ff',body:'#6c7588',kart:'#ff7a1a',kart2:'#30343f',head:'robot'},
 {name:'Rumo',kind:'Nashorn',cls:'Schwer',st:{acc:1,wt:5,top:5,brk:1,hdl:1,drf:2,off:1},fur:'#8d93a3',fur2:'#c9ced9',body:'#8d93a3',kart:'#2f9e44',kart2:'#ffe08a',head:'rhino'},
];
const STAT_LABELS=[['acc','Beschleunigung'],['wt','Gewicht'],['top','Höchsttempo'],['brk','Bremsen'],['hdl','Handling'],['drf','Drift'],['off','Gelände']];
function physStats(st){return{
  top:2.16+st.top*.065, acc:.019+st.acc*.0055, brk:.035+st.brk*.012,
  turn:.031+st.hdl*.0034, drift:1+st.drf*.08, slip:.26-st.wt*.03,
  off:.36+st.off*.055, mass:.6+st.wt*.35, grip:.28+st.wt*.035};}

// ---------- Voxel-Modelle → 16 vorgerenderte Blickwinkel je Fahrer
function kartVoxels(c){
  const V=new Map(),K=(x,y,z)=>x+','+y+','+z;
  const put=(x,y,z,col)=>V.set(K(x,y,z),{x,y,z,col});
  const has=(x,y,z)=>V.has(K(x,y,z));
  const box=(x0,x1,y0,y1,z0,z1,col)=>{for(let x=Math.min(x0,x1);x<=Math.max(x0,x1);x++)for(let y=y0;y<=y1;y++)for(let z=z0;z<=z1;z++)put(x,y,z,col);};
  const front=(x,y)=>{for(let z=6;z>=-10;z--)if(has(x,y,z))return z;return null;};
  const paint=(x,y,col)=>{const z=front(x,y);if(z!==null)put(x,y,z,col);};
  const tire='#1d1d26',hub='#c7ccd6',dark='#16151f',metal='#5b6274';
  for(const s of[-1,1]){box(s*5,s*7,0,2,-7,-5,tire);put(s*7,1,-6,hub);box(s*5,s*6,0,1,4,6,tire);put(s*6,1,5,hub);}
  box(-4,4,1,1,-7,7,shade(c.kart,-.38));
  box(-4,4,2,2,-6,4,c.kart);
  box(-3,3,2,2,5,7,c.kart);box(-2,2,3,3,4,6,c.kart);box(-1,1,3,3,4,6,c.kart2);
  box(-4,4,1,2,8,8,c.kart2);
  for(const s of[-1,1])box(s*5,s*5,1,2,-3,2,c.kart2);
  box(-3,3,2,4,-8,-7,metal);put(-2,3,-9,dark);put(2,3,-9,dark);
  box(-3,3,3,6,-6,-6,c.kart2);
  box(0,0,3,4,2,2,dark);box(-1,1,5,5,2,2,dark);
  box(-2,2,3,6,-5,-2,c.body);
  for(const s of[-1,1])box(s*3,s*3,4,5,-3,1,c.body);
  const hy=10,hz=-3,r=3.7,Hd=c.head;
  if(Hd==='robot'){
    box(-3,3,7,12,-6,0,c.fur);box(-3,3,10,11,0,0,c.fur2);
    for(let x=-2;x<=2;x+=2)put(x,8,0,'#4b5262');
    put(0,13,-3,'#4b5262');put(0,14,-3,'#4b5262');put(0,15,-3,'#ff4d6a');put(-4,10,-3,'#4b5262');put(4,10,-3,'#4b5262');
  }else{
    for(let x=-4;x<=4;x++)for(let y=6;y<=14;y++)for(let z=-7;z<=1;z++)if(x*x+(y-hy)**2+(z-hz)**2<=r*r)put(x,y,z,c.fur);
    if(Hd==='penguin'){
      for(let x=-2;x<=2;x++)for(let y=7;y<=12;y++)paint(x,y,c.fur2);
      put(0,9,1,c.beak);put(0,9,2,c.beak);put(-1,9,1,c.beak);put(1,9,1,c.beak);
    }else if(Hd==='frog'){
      for(let x=-3;x<=3;x++)for(let y=7;y<=9;y++)paint(x,y,c.fur2);
      for(let x=-2;x<=2;x++)paint(x,8,'#d0566b');
      for(const s of[-1,1]){box(s,s*3,12,14,-4,-1,c.fur);put(s*2,13,0,'#ffffff');put(s*2,12,0,dark);}
    }else{
      for(let x=-2;x<=2;x++)for(let y=7;y<=9;y++)paint(x,y,c.fur2);
      if(Hd==='fox'){box(-1,1,8,9,1,1,c.fur2);put(0,9,2,dark);for(const s of[-1,1]){box(s*2,s*3,13,14,-4,-3,c.fur);put(s*3,15,-4,c.fur);put(s*2,13,-2,c.fur2);}}
      if(Hd==='otter'){put(0,9,1,dark);for(const s of[-1,1]){put(s*3,13,-4,c.fur);put(s*3,12,-5,c.fur);put(s,8,1,'#f4f4f4');}}
      if(Hd==='bunny'){put(0,9,1,'#ff6f9a');for(const s of[-1,1]){box(s,s*2,13,18,-4,-3,c.fur);box(s,s*2,14,17,-2,-2,c.fur2);}}
      if(Hd==='bear'){put(0,9,1,dark);for(const s of[-1,1]){box(s*3,s*4,12,13,-4,-3,c.fur);put(s*3,12,-2,c.fur2);}}
      if(Hd==='rhino'){box(-1,1,7,9,1,2,c.fur2);put(0,10,2,'#f1e7cc');put(0,11,2,'#f1e7cc');put(0,12,1,'#f1e7cc');for(const s of[-1,1]){put(s*3,13,-4,c.fur);put(s*3,14,-4,c.fur);}}
    }
    if(Hd!=='frog'){const ex=Hd==='rhino'?3:2;for(const s of[-1,1]){paint(s*ex,11,dark);paint(s*ex,10,dark);}}
  }
  return [...V.values()];
}
function renderVox(vox,d,tilt){
  const cv=mk(SPR,SPR),g=cv.getContext('2d');
  const cd=Math.cos(d),sd=Math.sin(d),ct=Math.cos(tilt),st=Math.sin(tilt);
  const set=new Set(vox.map(v=>v.x+','+v.y+','+v.z));
  let rx=0,rz=0;if(Math.abs(cd)>=Math.abs(sd))rx=Math.sign(cd);else rz=Math.sign(sd);
  const L=[];
  for(const v of vox){
    const sx=v.x*cd+v.z*sd,dep=-v.x*sd+v.z*cd;let col=v.col;
    if(!set.has(v.x+','+(v.y+1)+','+v.z))col=shade(col,.2);
    else if(!set.has((v.x-rx)+','+v.y+','+(v.z-rz)))col=shade(col,.07);
    else if(!set.has((v.x+rx)+','+v.y+','+(v.z+rz)))col=shade(col,-.22);
    L.push([sx,-v.y*ct-dep*st,dep*ct-v.y*st,col]);
  }
  L.sort((a,b)=>b[2]-a[2]);
  for(const[sx,sy,,col]of L){g.fillStyle=col;g.fillRect(Math.round(SPR/2+sx*SPR_PX-SPR_PX/2),Math.round(SPR_OY+sy*SPR_PX-SPR_PX/2),SPR_PX+1,SPR_PX+1);}
  return outline(cv,'#141022');
}
const KSPR=CHARS.map(c=>{const v=kartVoxels(c);const a=[];for(let i=0;i<ANG;i++)a.push(renderVox(v,i/ANG*TAU,.5));return a;});

// ====================================================================
// Kleine Pixel-Sprites
// ====================================================================
const IC={}; // Item-Symbole 16×16
const circ=(x,y,cx,cy,r)=>(x-cx)**2+(y-cy)**2<=r*r;
IC.oil=outline(pix(16,16,(x,y)=>{if(circ(x,y,8,10,5.6)||circ(x,y,5,7,3.2)||circ(x,y,11,6,2.4)){if((x===6&&y===9)||(x===7&&y===9)||(x===10&&y===11))return '#8b7cff';if(x===5&&y===6)return '#4fe0d0';return '#211d2e';}return null;}),'#0b0912');
const orb=(c1,c2,c3)=>outline(pix(16,16,(x,y)=>{if(circ(x,y,8,8,5.5)){const l=(x-8)+(y-8);if(circ(x,y,6,6,1.5))return '#ffffff';return l<-3?c1:l>3?c3:c2;}if((x===8&&(y===1||y===15))||(y===8&&(x===1||x===15)))return c2;return null;}),'#120c24');
IC.spark=orb('#9cfff0','#2fd0c0','#13897f');
IC.homing=orb('#ffb3a6','#ff4d4d','#a3202c');
IC.comet=outline(pix(16,16,(x,y)=>{const sp=[[8,1],[8,15],[1,8],[15,8],[3,3],[13,13],[13,3],[3,13]];if(sp.some(([a,b])=>Math.abs(x-a)+Math.abs(y-b)<=1))return '#cfe3ff';if(circ(x,y,8,8,5)){if(circ(x,y,6,6,1.4))return '#fff';return (x+y)<16?'#7fb2ff':'#3d6fe0';}return null;}),'#0e1640');
const can=(ox,oy,w,h)=>(x,y)=>{if(x<ox||x>=ox+w||y<oy||y>=oy+h)return null;if(y<oy+2)return x===ox||x===ox+w-1?null:'#c7ccd6';if(y===oy+2)return '#596070';if(y>=oy+h-2&&(x===ox||x===ox+w-1))return null;if(y===oy+5||y===oy+6)return '#ffffff';return x===ox?'#ffb06a':x===ox+w-1?'#c9561c':'#ff7a1a';};
IC.turbo=outline(pix(16,16,(x,y)=>can(5,1,6,14)(x,y)),'#2a0f05');
IC.turbo3=outline(pix(16,16,(x,y)=>can(1,5,4,10)(x,y)||can(6,2,4,12)(x,y)||can(11,5,4,10)(x,y)),'#2a0f05');
const tri=(a)=>outline(pix(16,16,(x,y)=>{for(const[cx,cy]of[[4,4],[11.5,4.5],[7.5,11.5]])if(circ(x,y,cx,cy,3))return circ(x,y,cx-1,cy-1,.9)?'#fff':a;return null;}),'#120c24');
IC.spark3=tri('#2fd0c0');IC.homing3=tri('#ff4d4d');
IC.star=outline(pix(16,16,(x,y)=>{const top=y>=1&&y<=8&&x>=2&&x<=13;const bot=y>8&&y<=14&&Math.abs(x-7.5)<=6.5-(y-8)*1.05;if(!(top||bot))return null;if(x===4&&y>=3&&y<=9)return '#ffffff';if((x+y)%7===0)return '#ffef9a';return x<8?'#ffd23f':'#f2a81a';}),'#3a2200');
IC.bolt=outline(pix(16,16,(x,y)=>{const pts=[[9,1],[4,8],[8,8],[6,15],[12,6],[8,6],[10,1]];let inside=false;for(let i=0,j=pts.length-1;i<pts.length;j=i++){const[xi,yi]=pts[i],[xj,yj]=pts[j];if(((yi>y+.5)!==(yj>y+.5))&&(x+.5<(xj-xi)*(y+.5-yi)/(yj-yi)+xi))inside=!inside;}return inside?(x<8?'#fff3a0':'#ffd23f'):null;}),'#3a2200');
IC.ghost=outline(pix(16,16,(x,y)=>{const body=(circ(x,y,8,7,5.5)||(y>=7&&y<=13&&x>=3&&x<=13))&&!(y===13&&(x%3===0));if(!body)return null;if((x===6||x===10)&&(y===6||y===7))return '#2a2550';return x<6?'#ffffff':'#d9d3ff';}),'#2a2550');
const ITEM_NAMES={oil:'Ölfleck',spark:'Prallfunke',spark3:'3× Prallfunke',homing:'Jagdfunke',homing3:'3× Jagdfunke',comet:'Komet',turbo:'Turbo',turbo3:'3× Turbo',star:'Glanzschild',bolt:'Schrumpfblitz',ghost:'Phantom'};
const ROLL_LIST=Object.keys(ITEM_NAMES);

// Kristall-Itemboxen (8 Phasen, Farbe wandert)
const CRYS=[];for(let f=0;f<8;f++){const w=3+Math.abs(Math.cos(f/8*Math.PI))*4,hue=f*45;CRYS.push(outline(pix(16,18,(x,y)=>{const dx=Math.abs(x-7.5)/w,dy=Math.abs(y-8.5)/8;if(dx+dy>1)return null;const left=x<7.5;if(dx+dy>.78)return hsl(hue,90,78);return y<8.5?(left?hsl(hue,85,72):hsl(hue+30,80,58)):(left?hsl(hue+60,75,55):hsl(hue+90,70,42));}),'#1a1030'));}
const COIN=[];for(let f=0;f<8;f++){const w=Math.max(1,Math.abs(Math.cos(f/8*Math.PI))*4);COIN.push(outline(pix(10,10,(x,y)=>{if(((x-4.5)/w)**2+((y-4.5)/4.2)**2>1)return null;if(w>2&&Math.abs(x-4.5)<1&&Math.abs(y-4.5)<2.2)return '#fff3a0';return x<4.5?'#ffe066':'#e5a514';}),'#5a3a00'));}
const SPR_OIL=pix(18,7,(x,y)=>(((x-8.5)/8.5)**2+((y-3)/3)**2<=1)?((x===6&&y===2)||(x===11&&y===3)?'#8b7cff':'#16131f'):null);
const orbSpr=(c1,c2)=>[0,1].map(f=>outline(pix(10,10,(x,y)=>{if(!circ(x,y,4.5,4.5,3.9))return null;if(circ(x,y,3.4,3.4,1.1))return '#fff';return (x+y+f*3)%5===0?c1:c2;}),'#120c24'));
const SPR_SPARK=orbSpr('#9cfff0','#2fd0c0'),SPR_HOMING=orbSpr('#ffd0c8','#ff4d4d'),SPR_COMET=orbSpr('#ffffff','#5d8dff');
const SPR_DRONE=outline(pix(22,9,(x,y)=>{if(y===1&&(x<7||x>14))return '#d0d6e2';if(y===2&&(x===3||x===18))return '#596070';if(y>=3&&y<=6&&x>=6&&x<=15)return y===3?'#c7ccd6':(x===10||x===11)&&y===5?'#ff4d6a':'#7c8496';if(y>=7&&(x===8||x===13))return '#3b3f52';return null;}),'#141022');
const FLAME=[['#ffffff','#ffe066','#ff8a1f'],['#ffffff','#9fe6ff','#3d7fff']].map(c=>[0,1].map(f=>pix(8,8,(x,y)=>{const r=Math.abs(x-3.5)+(y*.6)-(f?.4:0);if(y<1||r>3.6)return null;return r<1.4?c[0]:r<2.6?c[1]:c[2];})));

// Kulissen (Pixel-Art, Höhe in Welteinheiten)
const SC={};
{
  const R0=mulberry(99);
  SC.tree={h:30,cv:outline(pix(22,30,(x,y)=>{const dx=x-11,dy=y-11;if(dx*dx+dy*dy<=100){const l=dx+dy;if(R0()<.08)return '#79c95c';return l<-7?'#6cc04f':l>7?'#2f6d2c':((x+y)&3)===0?'#4e9a3e':'#428c37';}if(y>=18&&x>=9&&x<=12)return x===9?'#58371f':'#70482a';return null;}),'#14301a')};
  SC.cypress={h:36,cv:outline(pix(12,36,(x,y)=>{if(((x-5.5)/5)**2+((y-15)/15)**2<=1)return x<5?'#3f8a45':(y%4===0?'#245a2c':'#2f6b35');if(y>=29&&x>=5&&x<=6)return '#5a3a22';return null;}),'#10261a')};
  SC.bush={h:9,cv:outline(pix(16,9,(x,y)=>(((x-7.5)/7.5)**2+((y-5)/4.5)**2<=1)?(x+y<9?'#6cc04f':(x*y)%5===0?'#2f6d2c':'#4a9a3c'):null),'#14301a')};
  SC.cactus={h:28,cv:outline(pix(16,30,(x,y)=>{const main=x>=6&&x<=9&&y>=3,lA=(x>=2&&x<=4&&y>=8&&y<=15)||(x>=2&&x<=6&&y>=13&&y<=15),rA=(x>=11&&x<=13&&y>=6&&y<=18)||(x>=9&&x<=13&&y>=16&&y<=18);if(!(main||lA||rA))return null;if(y===3&&(x===6||x===9))return null;if(x===7||x===3||x===12)return '#6dd36e';return x===9||x===4||x===13?'#2f7a3a':'#3f9b4a';}),'#123018')};
  SC.rock={h:10,cv:outline(pix(18,10,(x,y)=>(((x-8.5)/8.5)**2+((y-6)/5.5)**2<=1)?(x+y<10?'#c79a6a':x>11?'#7a5a3e':'#a07850'):null),'#2e1e12')};
  SC.shrub={h:7,cv:outline(pix(14,8,(x,y)=>(((x-6.5)/6.5)**2+((y-5)/4)**2<=1&&((x+y)%2===0||y>4))?'#9a8f45':null),'#3a3014')};
  SC.pine={h:38,cv:outline(pix(20,38,(x,y)=>{if(y>=32&&x>=9&&x<=10)return '#5a3a22';for(const[t,b,wd]of[[2,14,6],[9,23,8],[16,32,10]]){if(y>=t&&y<=b){const hw=(y-t)/(b-t)*wd;if(Math.abs(x-9.5)<=hw){if(y-t<2||(y===b&&x%3===0))return '#ffffff';if(Math.abs(x-9.5)>hw-1.5&&y%2===0)return '#e8f0ff';return x<9.5?'#2f7a55':'#1f5a40';}}}return null;}),'#0f2a22')};
  SC.snowman={h:16,cv:outline(pix(14,22,(x,y)=>{if(y<=3&&x>=4&&x<=9)return y===3?'#e5383b':'#26262f';if(circ(x,y,6.5,7,3.5)){if((x===5||x===8)&&y===6)return '#16151f';if(x>=7&&x<=9&&y===8)return '#ff8a1f';return x<6?'#ffffff':'#dbe6f6';}if(circ(x,y,6.5,15.5,5.5))return x<6?'#ffffff':'#dbe6f6';return null;}),'#2a3c66')};
  SC.snowrock={h:9,cv:outline(pix(18,10,(x,y)=>(((x-8.5)/8.5)**2+((y-6)/5.5)**2<=1)?(y<4?'#ffffff':x>11?'#6b7d99':'#8fa2c0'):null),'#1e2a44')};
  SC.buoy={h:10,cv:outline(pix(10,14,(x,y)=>{if(y<=2&&x>=4&&x<=5)return '#ffe066';if(y>=3&&y<=11&&Math.abs(x-4.5)<=3.5-(y<5?5-y:0)*.6)return ((y>>1)&1)?'#ffffff':'#e5383b';if(y>=12&&Math.abs(x-4.5)<=4.5)return '#2c64ad';return null;}),'#0b1830')};
  SC.crate={h:10,cv:outline(pix(14,14,(x,y)=>{if(x===0||y===0||x===13||y===13||x===y||x===13-y)return '#6b4426';return y%4===0?'#8b5e3a':'#a8743f';}),'#2a1508')};
  SC.basalt={h:24,cv:outline(pix(12,26,(x,y)=>{if(x<1||x>10)return null;if(y<2&&(x<3||x>8))return null;if(y<2)return '#6b5f66';if(x===3||x===7)return '#2b2428';return x<3?'#5a4e55':x<7?'#433a40':'#352d33';}),'#0e0a0c')};
  SC.ember={h:9,glow:true,cv:outline(pix(18,10,(x,y)=>{if(((x-8.5)/8.5)**2+((y-6)/5.5)**2>1)return null;if((x+y*2)%7===0||(x*3+y)%11===0)return y>5?'#ff7a1a':'#ffb03a';return x+y<10?'#4a3c40':'#2e2428';}),'#0e0a0c')};
  SC.lamp={h:34,glow:true,cv:outline(pix(8,40,(x,y)=>{if(y<=4&&x>=1&&x<=6)return y<=1?'#3b3f52':'#ffe9a8';if(y>4&&x>=3&&x<=4)return x===3?'#5b6274':'#3b3f52';if(y>=37&&x>=1&&x<=6)return '#3b3f52';return null;}),'#0b0d1c')};
}

// ====================================================================
// Strecken & Themen
// ====================================================================
const SN=(k,x,ph)=>Math.sin(TAU*k*x/PW+ph);
function bands(g,cols){const n=cols.length,bh=HOR/n;cols.forEach((c,i)=>{g.fillStyle=c;g.fillRect(0,Math.floor(i*bh),PW,Math.ceil(bh)+1);});cols.forEach((c,i)=>{if(i===n-1)return;g.fillStyle=cols[i+1];const y=Math.floor((i+1)*bh)-1;for(let x=i&1;x<PW;x+=2)g.fillRect(x,y,1,1);});}
function ridge(g,hf,col,hi,lo){for(let x=0;x<PW;x++){const h=Math.max(0,Math.round(hf(x)));g.fillStyle=col;g.fillRect(x,HOR-h,1,h);if(hi){g.fillStyle=hi;g.fillRect(x,HOR-h,1,1);}if(lo){g.fillStyle=lo;for(let y=HOR-h+3;y<HOR;y+=3)g.fillRect(x,y,1,1);}}}
function disc(g,cx,cy,r,col,gaps,gapCol){g.fillStyle=col;for(let y=-r;y<=r;y++){const w=Math.round(Math.sqrt(r*r-y*y));g.fillRect(cx-w,cy+y,w*2,1);}if(gaps){g.fillStyle=gapCol;for(const y of gaps){const dy=y-cy,w=Math.round(Math.sqrt(Math.max(0,r*r-dy*dy)));g.fillRect(cx-w,y,w*2,1);}}}
function panoVine(g,rnd){
  const sky=['#26357f','#3d3f96','#634aa0','#9a5596','#d0688a','#ef8a72','#f9ae79','#ffc98a'];bands(g,sky);
  disc(g,300,33,13,'#ffe6a6',[36,39,42],'#f9ae79');
  ridge(g,x=>15+6*SN(2,x,0)+4*SN(5,x,1)+2*SN(11,x,2),'#7d5a9a','#9a76b5');
  ridge(g,x=>8+3*SN(3,x,.5)+2*SN(8,x,1.3),'#4f7f3d','#6aa04f','#3f6b30');
  for(let i=0;i<70;i++){const x=Math.floor(rnd()*PW),h=Math.round(8+3*SN(3,x,.5)+2*SN(8,x,1.3));g.fillStyle='#2f5a2a';g.fillRect(x-1,HOR-h-3,3,3);g.fillRect(x,HOR-h-4,1,1);}
  g.fillStyle='#5b3f66';g.fillRect(620,HOR-26,5,12);g.fillRect(621,HOR-30,3,4);g.fillRect(622,HOR-32,1,2);
}
function panoDesert(g,rnd){
  bands(g,['#3aa6ef','#56b6f2','#78c6f3','#9ad3f0','#bfe0e6','#e6e6c8','#fde1b0']);
  disc(g,700,14,6,'#fff9e0');
  const mesas=[];for(let i=0;i<11;i++)mesas.push([Math.floor(rnd()*PW),30+Math.floor(rnd()*70),9+Math.floor(rnd()*16)]);
  for(const far of[true,false])for(const[x0,w,h0]of mesas){const h=far?h0+4:h0;const xs=far?x0+120:x0;for(let i=0;i<w;i++){const x=(xs+i)%PW;const edge=Math.min(i,w-1-i);const hh=edge<3?h-(3-edge)*3:h;g.fillStyle=far?'#d99a7a':(i<2?'#e0864f':i>w*.72?'#9e4a2a':'#c8643a');g.fillRect(x,HOR-hh,1,hh);if(!far){g.fillStyle='#d8794a';g.fillRect(x,HOR-hh,1,1);if(i%5===0){g.fillStyle='#a8522f';g.fillRect(x,HOR-hh+3,1,hh-3);}}}}
  ridge(g,x=>3+2*SN(4,x,.2)+1.5*SN(9,x,1),'#e6b56c','#f3cf8e');
}
function panoIce(g,rnd){
  const sky=['#050b2a','#08113a','#0c1a4a','#13275c','#1d3670','#2a4785','#3a5a98','#4f6fae'];bands(g,sky);
  for(let i=0;i<220;i++){g.fillStyle=rnd()<.2?'#ffffff':'#9fb4ea';g.fillRect(Math.floor(rnd()*PW),Math.floor(rnd()*30),1,1);}
  for(let x=0;x<PW;x++){const yc=10+5*SN(3,x,.4)+3*SN(7,x,2);for(let t=0;t<9;t++){const y=Math.round(yc+t);const a=(1-t/9)*(.55+.45*SN(11,x,1));if(a<=.05)continue;g.fillStyle=mix(sky[Math.min(7,y>>3)],t<3?'#7dffcf':'#3dd6a8',clamp(a,0,1));g.fillRect(x,y,1,1);}}
  ridge(g,x=>{let m=0;for(let k=0;k<9;k++){const px=k*PW/9+40*Math.sin(k*2.3),d=Math.min(Math.abs(x-px),PW-Math.abs(x-px));m=Math.max(m,24-d*.45);}return m;},'#5a6fa8','#8fa2d6');
  for(let x=0;x<PW;x++){let m=0,sl=0;for(let k=0;k<7;k++){const px=k*PW/7+70+30*Math.cos(k*1.7),dd=x-px,d=Math.min(Math.abs(dd),PW-Math.abs(dd));const v=17-d*.6;if(v>m){m=v;sl=dd;}}const h=Math.round(m);if(h<=0)continue;g.fillStyle=sl>0?'#a8bde3':'#e9f0ff';g.fillRect(x,HOR-h,1,h);g.fillStyle='#7d93c7';if(h>8)g.fillRect(x,HOR-Math.floor(h*.4),1,Math.floor(h*.4));}
}
function panoHarbor(g,rnd){
  const sky=['#0d0624','#140a30','#1e0f3e','#2a144c','#38195a','#491f66','#5a2770','#3c2560'];bands(g,sky);
  for(let i=0;i<120;i++){g.fillStyle='#c9b8ff';g.fillRect(Math.floor(rnd()*PW),Math.floor(rnd()*24),1,1);}
  disc(g,160,11,6,'#fff4c8');g.fillStyle=sky[1];g.fillRect(162,5,5,8);
  let x=0;while(x<PW){const w=8+Math.floor(rnd()*16),h=8+Math.floor(rnd()*24),c=rnd()<.5?'#1d1538':'#241a45';g.fillStyle=c;g.fillRect(x,HOR-3-h,w,h);for(let yy=HOR-h;yy<HOR-5;yy+=3)for(let xx=x+2;xx<x+w-1;xx+=3)if(rnd()<.35){g.fillStyle=rnd()<.8?'#ffd36b':'#7fe7ff';g.fillRect(xx,yy,1,1);}x+=w+Math.floor(rnd()*4);}
  for(const cx of[260,520,810]){g.fillStyle='#e5383b';g.fillRect(cx,HOR-34,2,31);g.fillRect(cx-14,HOR-34,34,2);g.fillRect(cx-14,HOR-32,1,10);g.fillStyle='#ffd23f';g.fillRect(cx+1,HOR-36,1,1);}
  g.fillStyle='#0f2c5c';g.fillRect(0,HOR-3,PW,3);for(let i=0;i<160;i++){g.fillStyle='#3a76c2';g.fillRect(Math.floor(rnd()*PW),HOR-1-Math.floor(rnd()*3),2,1);}
}
function panoLava(g,rnd){
  bands(g,['#12060c','#1d0910','#2b0d14','#3e1118','#56161b','#72201c','#93301b','#b5471c']);
  for(let i=0;i<90;i++){g.fillStyle=rnd()<.5?'#ff9a1f':'#ffd23f';g.fillRect(Math.floor(rnd()*PW),Math.floor(rnd()*36),1,1);}
  for(const[cx,h,w]of[[150,30,70],[480,38,90],[790,26,60]]){
    for(let i=-w;i<=w;i++){const x=((cx+i)%PW+PW)%PW,hh=Math.round(Math.max(0,h-Math.max(0,Math.abs(i)-8)*h/w*1.1));if(hh<=0)continue;g.fillStyle=i>0?'#1f1215':'#2c1a1e';g.fillRect(x,HOR-hh,1,hh);}
    g.fillStyle='#ff7a1a';g.fillRect(cx-7,HOR-h,15,1);g.fillStyle='#ffd23f';g.fillRect(cx-4,HOR-h,9,1);
    for(const sx of[-5,0,4]){let x=cx+sx;for(let y=HOR-h+1;y<HOR-2;y++){if(rnd()<.35)x+=rnd()<.5?-1:1;g.fillStyle=rnd()<.3?'#ffd23f':'#ff6a1f';g.fillRect(((x%PW)+PW)%PW,y,1,1);}}
    for(let j=0;j<26;j++){const y=HOR-h-2-j,xs=cx+Math.round(Math.sin(j*.35)*3+j*.4),ww=2+Math.floor(j/5);g.fillStyle=j%3?'#3b2a2e':'#4a3a3e';g.fillRect(xs-ww,y,ww*2,1);}
  }
  ridge(g,x=>6+3*SN(5,x,.3)+2*SN(13,x,1.1),'#1a1013','#3a2226');
}
const TH={
  vine:{grip:1,haze:'#ffc78a',curbA:'#e5383b',curbB:'#f6f1e7',barA:'#f3ecd8',barB:'#3d6fd0',line:null,dust:'#7a5636',
    road:(x,y,r)=>r<.1?'#7c8090':r>.93?'#5c606f':'#6b6f7e',
    off:(x,y,r)=>r<.07?'#6dbd50':(((x>>3)+(y>>3))&1)?'#5aa53f':'#539a39',
    out:(x,y,r)=>{const ry=y&15;if(ry<5){if((x&15)===0)return '#5a3f28';return r<.28?'#4f9440':r>.9?'#2f6127':'#3f7d34';}return r<.1?'#86603e':(((x>>3)+(y>>3))&1)?'#7a5636':'#735033';},
    pano:panoVine,scen:[['tree',5],['cypress',3],['bush',2]],dens:.55,song:0},
  desert:{grip:1,haze:'#fde1b0',curbA:'#ffffff',curbB:'#e04a3a',barA:'#b0603a',barB:'#86452a',line:null,dust:'#d6a35c',
    road:(x,y,r)=>r<.1?'#d68b5c':r>.92?'#b46a42':'#c77a4c',
    off:(x,y,r)=>r<.12?'#c48d50':(((x>>3)+(y>>3))&1)?'#dba660':'#d39d58',
    out:(x,y,r)=>{const w=(x*2+y+((y>>4)&1)*8)&31;if(w<3)return '#d6a35c';return r<.06?'#f2cd8a':r>.95?'#cf9a55':'#e8bb73';},
    pano:panoDesert,scen:[['cactus',5],['rock',3],['shrub',2]],dens:.45,song:1},
  ice:{grip:.5,haze:'#6b82b8',curbA:'#2f7bd6',curbB:'#ffffff',barA:'#ffffff',barB:'#a9c8ee',line:null,dust:'#ffffff',
    road:(x,y,r)=>r<.12?'#bdd3ea':r>.92?'#94adc8':'#a7c0da',
    off:(x,y,r)=>r<.06?'#ffffff':(((x>>3)+(y>>3))&1)?'#e8f0fb':'#dde7f5',
    out:(x,y,r)=>r<.04?'#ffffff':r<.14?'#e2eaf6':'#f2f6fd',
    pit:(x,y,r)=>{const w=(x+((y>>2)&3)*7)&31;return (w<4&&(y&7)<1)?'#5b9be0':r<.05?'#3d7fc4':'#2a69ad';},
    pano:panoIce,scen:[['pine',6],['snowman',1],['snowrock',3]],dens:.55,song:2},
  harbor:{grip:1,haze:'#3c2560',curbA:'#ffd23f',curbB:'#26262f',barA:'#d9dde6',barB:'#e5383b',line:'#ffd23f',dust:'#a06e44',water:true,
    road:(x,y,r)=>r<.1?'#474b60':r>.93?'#303344':'#3b3f52',
    off:(x,y,r)=>{if((y&3)===0)return '#4a3121';const plank=((y>>2)+((x>>4)&1))&1;return r<.05?'#a06e44':plank?'#8b5e3a':'#7d5434';},
    out:(x,y,r)=>{const w=(x+((y>>3)&7)*9)&63;if(w<5&&(y&7)===0)return '#3a76c2';return r<.04?'#1f4f91':'#153f7c';},
    pano:panoHarbor,scen:[['buoy',1]],dens:.12,song:3,lamps:true},
  lava:{grip:1,haze:'#6a1f18',curbA:'#ff5a1f',curbB:'#241c20',barA:'#6b5a5e',barB:'#4a3c40',line:null,dust:'#4a3c40',lava:true,fallTime:190,
    road:(x,y,r)=>r<.1?'#6e6469':r>.93?'#4d4449':'#5e5459',
    off:(x,y,r)=>r<.07?'#6b585c':(((x>>3)+(y>>3))&1)?'#463a3e':'#40353a',
    out:(x,y,r)=>{if((((x*3+y*5)|0)&63)<2||(((x*7-y*3)|0)&63)<2)return r<.5?'#ff6a1f':'#ffb03a';return r<.06?'#3a2e32':(((x>>4)+(y>>4))&1)?'#2a2024':'#251c20';},
    pit:(x,y,r)=>{const w=((x|0)+((y|0)>>3)*5+(((x|0)>>4)&1)*7)&31;if(w<2)return '#ffe066';if(w<6)return '#ffa31f';return r<.06?'#ffc04a':r>.93?'#c2410c':'#f2661a';},
    pano:panoLava,scen:[['basalt',4],['ember',3]],dens:.5,song:5},
};
const TRACKS=[
  {id:'rebhang',name:'Rebhang-Ring',sub:'Weite Kurven zwischen Weinbergen',theme:'vine',seed:11,
   pts:[[170,640],[170,420],[200,250],[320,150],[500,140],[640,190],[700,300],[660,420],[700,520],[820,560],[880,680],[840,820],[700,880],[520,860],[400,780],[300,820],[200,800]],
   open:[],pads:[{f:.21,lat:-9,type:'boost'},{f:.58,lat:9,type:'boost'},{f:.83,lat:0,type:'boost'}],items:[.13,.47,.74]},
  {id:'kaktus',name:'Kaktus-Canyon',sub:'Haarnadeln und Sprungschanzen',theme:'desert',seed:23,
   pts:[[140,560],[150,320],[250,170],[420,150],[500,260],[430,380],[480,500],[620,520],[700,400],[650,260],[740,140],[880,170],[910,360],[840,520],[880,700],[800,870],[600,900],[450,820],[300,880],[170,780]],
   open:[],pads:[{f:.31,type:'ramp'},{f:.655,type:'ramp'},{f:.9,lat:-8,type:'boost'},{f:.07,lat:8,type:'boost'}],items:[.11,.42,.77]},
  {id:'polar',name:'Polarlicht-Pass',sub:'Glatteis am offenen Wasser',theme:'ice',seed:37,
   pts:[[160,700],[150,450],[220,260],[380,170],[560,190],[650,310],[600,450],[680,560],[830,520],[900,640],[860,820],[700,900],[520,860],[440,730],[330,770],[210,800]],
   open:[[.27,.37],[.63,.73]],pads:[{f:.5,lat:0,type:'boost'},{f:.9,lat:-8,type:'boost'}],items:[.12,.45,.8]},
  {id:'hafen',name:'Hafenmeile',sub:'Nachtrennen über offene Stege',theme:'harbor',seed:41,
   pts:[[200,760],[200,480],[220,260],[340,160],[540,160],[600,280],[560,420],[680,480],[840,420],[900,560],[860,760],[720,880],[560,860],[450,770],[330,820]],
   open:[[.15,.26],[.53,.62],[.85,.93]],pads:[{f:.08,lat:8,type:'boost'},{f:.4,lat:-8,type:'boost'},{f:.71,lat:0,type:'boost'}],items:[.2,.46,.78]},
  {id:'lava',name:'Lavaland',sub:'Lavagruben, feste Ölflecken und viele Turboplatten',theme:'lava',seed:53,bonus:true,
   pts:[[170,760],[160,520],[220,320],[360,200],[540,210],[600,340],[520,460],[580,590],[720,610],[770,480],[740,340],[800,200],[900,260],[920,520],[860,700],[880,860],[700,910],[540,830],[400,880],[260,860]],
   open:[[.1,.18],[.27,.36],[.45,.53],[.63,.72],[.81,.9]],
   pads:[[.04,-8],[.08,8],[.13,0],[.2,-9],[.23,9],[.3,0],[.39,-8],[.42,8],[.49,0],[.57,-9],[.6,9],[.67,0],[.75,-8],[.78,8],[.85,0],[.94,0]].map(([f,lat])=>({f,lat,type:'boost'})),
   items:[.16,.55,.8],
   oils:[[.06,0],[.115,-12],[.17,12],[.25,-5],[.33,11],[.37,-11],[.47,0],[.52,12],[.62,-12],[.7,6],[.76,0],[.88,-8],[.92,10]]},
];
function crPt(p0,p1,p2,p3,t){const t2=t*t,t3=t2*t;return[0,1].map(k=>.5*((2*p1[k])+(-p0[k]+p2[k])*t+(2*p0[k]-5*p1[k]+4*p2[k]-p3[k])*t2+(-p0[k]+3*p1[k]-3*p2[k]+p3[k])*t3));}
function buildGeom(def){
  const P=def.pts,n=P.length,raw=[];
  for(let i=0;i<n;i++){const p0=P[(i-1+n)%n],p1=P[i],p2=P[(i+1)%n],p3=P[(i+2)%n];for(let k=0;k<24;k++)raw.push(crPt(p0,p1,p2,p3,k/24));}
  const cum=[0];for(let i=1;i<raw.length;i++)cum.push(cum[i-1]+Math.hypot(raw[i][0]-raw[i-1][0],raw[i][1]-raw[i-1][1]));
  const total=cum[cum.length-1]+Math.hypot(raw[0][0]-raw[raw.length-1][0],raw[0][1]-raw[raw.length-1][1]);
  const N=Math.round(total/STEP),pts=[];let j=0;
  for(let i=0;i<N;i++){const s=i*total/N;while(j<raw.length-1&&cum[j+1]<s)j++;const a=raw[j],b=raw[(j+1)%raw.length],e=(j+1<raw.length?cum[j+1]:total),t=(s-cum[j])/(e-cum[j]);pts.push({x:lerp(a[0],b[0],t),y:lerp(a[1],b[1],t)});}
  for(let i=0;i<N;i++){const a=pts[(i-1+N)%N],b=pts[(i+1)%N];let dx=b.x-a.x,dy=b.y-a.y;const l=Math.hypot(dx,dy);dx/=l;dy/=l;Object.assign(pts[i],{dx,dy,nx:-dy,ny:dx,a:Math.atan2(dy,dx)});}
  const turn=new Float32Array(N);for(let i=0;i<N;i++)turn[i]=wrapA(pts[(i+16)%N].a-pts[i].a);
  const open=new Uint8Array(N);for(const[f0,f1]of def.open)for(let i=Math.floor(f0*N);i<=Math.floor(f1*N);i++)open[i%N]=1;
  const pads=def.pads.map(p=>({i:Math.floor(p.f*N)%N,lat:p.type==='ramp'?0:p.lat,half:p.type==='ramp'?RH+CURB:7,len:p.type==='ramp'?2:3,type:p.type}));
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(const p of pts){x0=Math.min(x0,p.x);y0=Math.min(y0,p.y);x1=Math.max(x1,p.x);y1=Math.max(y1,p.y);}
  const T={def,th:TH[def.theme],N,pts,len:total,turn,open,pads,bbox:[x0,y0,x1,y1]};
  T.mini=drawMiniMap(T,44,3.4);
  return T;
}
function mapXY(T,size,x,y){const[x0,y0,x1,y1]=T.bbox,m=WALL*.6,sc=(size-6)/Math.max(x1-x0+2*m,y1-y0+2*m),ox=(size-(x1-x0)*sc)/2,oy=(size-(y1-y0)*sc)/2;return[ox+(x-x0)*sc,oy+(y-y0)*sc];}
function drawMiniMap(T,size,lw,col){const cv=mk(size,size),g=cv.getContext('2d');g.lineJoin='round';const path=()=>{g.beginPath();T.pts.forEach((p,i)=>{const[x,y]=mapXY(T,size,p.x,p.y);i?g.lineTo(x,y):g.moveTo(x,y);});g.closePath();};path();g.strokeStyle='#141022';g.lineWidth=lw+2.5;g.stroke();path();g.strokeStyle=col||'#eef0ff';g.lineWidth=lw;g.stroke();const p=T.pts[0],[sx,sy]=mapXY(T,size,p.x,p.y);g.fillStyle='#ff4d6a';g.fillRect(Math.round(sx)-1,Math.round(sy)-1,3,3);return cv;}
const GEOM=TRACKS.map(buildGeom);
function trackFull(i){
  const T=GEOM[i];if(T.tex)return T;
  for(const o of GEOM)if(o!==T&&o.tex&&!(R&&R.T===o)&&GEOM.filter(q=>q.tex).length>=2){o.tex=null;o.outTile=null;}
  const th=T.th,cv=mk(TMAP,TMAP),g=cv.getContext('2d',{willReadFrequently:true}),rnd=mulberry(T.def.seed),P=T.pts,N=T.N;
  const tile=(w,h,fn)=>pix(w*TS,h*TS,(x,y)=>fn(x/TS,y/TS,rnd()));
  const pat=c=>{const q=g.createPattern(c,'repeat');q.setTransform(new DOMMatrix().scale(1/TS));return q;};
  g.scale(TS,TS);
  const outT=tile(64,64,th.out);
  T.outTile=new Uint32Array(outT.getContext('2d').getImageData(0,0,64*TS,64*TS).data.buffer.slice(0));
  g.fillStyle=pat(outT);g.fillRect(0,0,MAP,MAP);
  const loop=()=>{g.beginPath();g.moveTo(P[0].x,P[0].y);for(let i=1;i<N;i++)g.lineTo(P[i].x,P[i].y);g.closePath();};
  const run=(a,b)=>{g.beginPath();for(let k=0,i=a;k<=N;k++,i=(i+1)%N){k?g.lineTo(P[i].x,P[i].y):g.moveTo(P[i].x,P[i].y);if(i===b)break;}};
  const stroke=(w,st,dash)=>{g.lineWidth=w;g.strokeStyle=st;g.setLineDash(dash||[]);g.stroke();};
  const runsOf=v=>{const r=[];for(let i=0;i<N;i++){if(T.open[i]===v&&T.open[(i-1+N)%N]!==v){let j=i;while(T.open[(j+1)%N]===v&&(j+1)%N!==i)j=(j+1)%N;r.push([i,j]);}}return r;};
  g.lineJoin='round';
  const anyOpen=T.open.some(v=>v);
  if(th.pit&&anyOpen){g.lineCap='round';const pt=pat(tile(32,32,th.pit));for(const[a,b]of runsOf(1)){run(a,b);stroke(2*(WALL+58),pt);}}
  g.lineCap='butt';
  const walled=anyOpen?runsOf(0):[null];
  for(const r of walled){r?run(r[0],r[1]):loop();stroke(2*(WALL+BAR),th.barA);stroke(2*(WALL+BAR),th.barB,[8,8]);}
  loop();
  stroke(2*WALL+3,'rgba(0,0,0,0.3)');
  stroke(2*WALL,pat(tile(16,16,th.off)));
  stroke(2*(RH+CURB),th.curbA);stroke(2*(RH+CURB),th.curbB,[6,6]);
  stroke(2*RH,pat(tile(32,32,th.road)));
  if(th.line)stroke(1.5,th.line,[10,12]);
  g.setLineDash([]);
  const local=(i,fn)=>{const p=P[i];g.save();g.translate(p.x,p.y);g.rotate(p.a);fn();g.restore();};
  local(0,()=>{const cw=RH*2/12;for(let row=0;row<2;row++)for(let c=0;c<12;c++){g.fillStyle=((row+c)&1)?'#f4f4f4':'#1a1a22';g.fillRect(-4+row*4,-RH+c*cw,4,cw+.5);}});
  for(let j=0;j<8;j++){const i=(N-3-j*4+N)%N,lat=j%2?10:-10;local(i,()=>{g.fillStyle='#f4f4f4';g.fillRect(3,lat-5,1.5,10);});}
  for(const pd of T.pads){local(pd.i,()=>{if(pd.type==='boost'){g.fillStyle='#16245e';g.fillRect(0,pd.lat-7,13,14);for(let c=0;c<3;c++){g.fillStyle=c%2?'#ff8a1f':'#ffd23f';const o=1+c*4;g.beginPath();g.moveTo(o,pd.lat-5);g.lineTo(o+3,pd.lat);g.lineTo(o,pd.lat+5);g.lineTo(o-1.6,pd.lat+5);g.lineTo(o+1.4,pd.lat);g.lineTo(o-1.6,pd.lat-5);g.closePath();g.fill();}}else{g.fillStyle='#ffd23f';g.fillRect(0,-RH-CURB,9,2*(RH+CURB));g.fillStyle='#26262f';for(let y=-RH-CURB;y<RH+CURB;y+=6){g.beginPath();g.moveTo(0,y);g.lineTo(3,y);g.lineTo(9,y+4);g.lineTo(6,y+4);g.closePath();g.fill();}g.fillStyle='#b8471f';g.fillRect(8,-RH-CURB,1.5,2*(RH+CURB));}});}
  T.tex=new Uint32Array(g.getImageData(0,0,TMAP,TMAP).data.buffer);
  if(T.pano&&T.scen)return T;
  const pano=mk(PW,HOR),pg=pano.getContext('2d');th.pano(pg,mulberry(T.def.seed+3));T.pano=pano;
  // Kulissen platzieren
  const rs=mulberry(T.def.seed*7+1),list=[];
  const near=(x,y)=>{let m=1e18,bi=0;for(let i=0;i<N;i+=2){const d=(P[i].x-x)**2+(P[i].y-y)**2;if(d<m){m=d;bi=i;}}return[Math.sqrt(m),bi];};
  const tot=th.scen.reduce((s,e)=>s+e[1],0);
  const kind=()=>{let r=rs()*tot;for(const[k,w]of th.scen){if((r-=w)<0)return k;}return th.scen[0][0];};
  const ok=(x,y,min)=>{if(x<8||y<8||x>MAP-8||y>MAP-8)return false;const[d,bi]=near(x,y);if(d<min)return false;if(th.pit&&T.open[bi]&&d<WALL+64)return false;return true;};
  for(let i=0;i<N;i+=4)for(const s of[-1,1]){if(rs()>th.dens)continue;if(T.open[i]&&!th.water)continue;const off=WALL+BAR+6+rs()*rs()*90,x=P[i].x+P[i].nx*s*off,y=P[i].y+P[i].ny*s*off;if(ok(x,y,WALL+BAR+4))list.push({x,y,k:kind()});}
  if(th.lamps)for(let i=0;i<N;i+=13)if(!T.open[i])for(const s of[-1,1])list.push({x:P[i].x+P[i].nx*s*(WALL+BAR/2),y:P[i].y+P[i].ny*s*(WALL+BAR/2),k:'lamp'});
  if(th.water)for(let i=0;i<N;i+=40){const x=P[i].x+P[i].nx*(WALL+30)*(i%80?1:-1),y=P[i].y+P[i].ny*(WALL+30)*(i%80?1:-1);if(ok(x,y,WALL+20))list.push({x,y,k:'crate'});}
  for(let n=0;n<170;n++){const x=rs()*MAP,y=rs()*MAP;if(ok(x,y,WALL+BAR+22))list.push({x,y,k:kind()});}
  T.scen=list;
  return T;
}

// ====================================================================
// Audio: Motor, Effekte, eigene Chiptune-Musik
// ====================================================================
const AU={ctx:null,on:true,music:true,
  init(){if(this.ctx){if(this.ctx.state==='suspended')this.ctx.resume();return;}
    try{const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;this.ctx=new AC();}catch(e){return;}
    const c=this.ctx;this.master=c.createGain();this.master.gain.value=this.on?.55:0;this.master.connect(c.destination);
    this.sfx=c.createGain();this.sfx.gain.value=1.7;this.sfx.connect(this.master);
    this.mus=c.createGain();this.mus.gain.value=this.music?.4:0;this.mus.connect(this.master);
    const b=c.createBuffer(1,c.sampleRate,c.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;this.nb=b;
    const o1=c.createOscillator(),o2=c.createOscillator(),f=c.createBiquadFilter(),g=c.createGain();o1.type='sawtooth';o2.type='square';f.type='lowpass';f.frequency.value=600;g.gain.value=0;o1.connect(f);o2.connect(f);f.connect(g);g.connect(this.sfx);o1.start();o2.start();this.eng={o1,o2,f,g};
    MUS.next=c.currentTime+.1;},
  setOn(v){this.on=v;if(this.master)this.master.gain.setTargetAtTime(v?.55:0,this.ctx.currentTime,.02);},
  setMusic(v){this.music=v;if(this.mus)this.mus.gain.setTargetAtTime(v?.4:0,this.ctx.currentTime,.02);},
  engine(speed,boost,on){if(!this.eng)return;const t=this.ctx.currentTime,f=46+Math.abs(speed)*50+(boost?28:0);this.eng.o1.frequency.setTargetAtTime(f,t,.05);this.eng.o2.frequency.setTargetAtTime(f*.502,t,.05);this.eng.f.frequency.setTargetAtTime(280+f*5,t,.08);this.eng.g.gain.setTargetAtTime(on?.045:0,t,.08);},
  tone(type,f0,f1,dur,vol,delay=0,bus){if(!this.ctx)return;const c=this.ctx,t=c.currentTime+delay,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(f0,t);if(f1!==f0)o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+dur);g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g);g.connect(bus||this.sfx);o.start(t);o.stop(t+dur+.02);},
  noise(dur,vol,ft,fq,delay=0,bus){if(!this.ctx)return;const c=this.ctx,t=c.currentTime+delay,s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();s.buffer=this.nb;f.type=ft;f.frequency.value=fq;g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);s.connect(f);f.connect(g);g.connect(bus||this.sfx);s.start(t,Math.random()*.5);s.stop(t+dur+.02);}
};
const SFX={
  move:()=>AU.tone('square',880,880,.035,.04),
  ok:()=>{AU.tone('square',660,660,.06,.05);AU.tone('square',990,990,.09,.05,.06);},
  back:()=>{AU.tone('square',520,520,.05,.04);AU.tone('square',390,390,.08,.04,.05);},
  beep:()=>AU.tone('square',440,440,.2,.07),
  go:()=>AU.tone('square',880,880,.5,.08),
  coin:()=>{AU.tone('square',1318,1318,.05,.04);AU.tone('square',1760,1760,.13,.04,.05);},
  box:()=>AU.noise(.12,.08,'highpass',3000),
  tick:()=>AU.tone('square',1500,1500,.015,.018),
  get:()=>{AU.tone('square',784,784,.06,.05);AU.tone('square',1046,1046,.06,.05,.06);AU.tone('square',1318,1318,.12,.05,.12);},
  boost:()=>{AU.noise(.4,.12,'bandpass',1400);AU.tone('sawtooth',180,620,.35,.05);},
  mt:()=>{AU.noise(.25,.1,'bandpass',2200);AU.tone('square',400,900,.18,.04);},
  ready:()=>AU.tone('triangle',1600,1600,.05,.05),
  hop:()=>AU.tone('square',260,420,.07,.03),
  hit:()=>{AU.noise(.45,.15,'lowpass',900);AU.tone('square',620,90,.45,.06);},
  hit2:()=>AU.tone('square',500,160,.2,.035),
  bump:()=>AU.tone('triangle',170,60,.12,.12),
  wall:()=>AU.noise(.1,.08,'lowpass',500),
  fire:()=>AU.tone('square',260,1000,.14,.045),
  drop:()=>AU.tone('triangle',300,140,.12,.07),
  lap:()=>{[784,988,1175].forEach((f,i)=>AU.tone('square',f,f,.1,.05,i*.09));},
  final:()=>{[659,784,988,1319].forEach((f,i)=>AU.tone('square',f,f,.12,.05,i*.1));},
  finish:()=>{[523,659,784,1046,784,1046].forEach((f,i)=>AU.tone('square',f,f,i===5?.5:.13,.06,i*.13));},
  fall:()=>AU.tone('sine',900,110,.8,.08),
  splash:()=>AU.noise(.5,.12,'lowpass',1600),
  bolt:()=>{AU.noise(.7,.2,'highpass',1500);AU.tone('sawtooth',1200,80,.6,.06);},
  ghost:()=>AU.tone('sine',300,900,.6,.05),
  star:()=>{[523,659,784,1046].forEach((f,i)=>AU.tone('square',f,f,.08,.04,i*.06));},
  shrink:()=>AU.tone('square',900,200,.4,.05),
  comet:()=>AU.tone('sawtooth',200,1400,.5,.05),
  sizzle:()=>{AU.noise(.9,.13,'highpass',2600);AU.tone('sine',90,40,.7,.1);},
  boom:()=>{AU.noise(.8,.22,'lowpass',600);AU.tone('sine',120,40,.6,.15);},
};
// Eigene Melodien (MIDI-Noten, 16tel-Schritte)
const SONGS=[
 {bpm:150,drum:'k.h.s.h.k.h.s.hh',bass:[36,0,48,0,36,0,48,0,43,0,55,0,43,0,55,0,45,0,57,0,45,0,57,0,41,0,53,0,43,0,55,0],
  lead:[72,0,76,0,79,0,76,0,74,0,79,0,83,0,81,79,81,0,0,76,0,0,72,0,77,0,76,0,74,0,72,0,72,0,76,0,79,0,84,0,83,0,81,0,79,0,74,0,76,0,0,81,0,79,76,0,74,0,0,0,72,0,0,0]},
 {bpm:140,drum:'k..hs.h.k.khs.h.',bass:[45,0,45,57,0,45,0,46,45,0,45,57,0,48,0,46,45,0,45,57,0,45,0,46,45,0,45,57,0,52,0,50],
  lead:[69,0,70,0,73,0,74,0,76,0,74,73,70,0,69,0,69,0,0,73,0,74,76,77,76,0,74,0,73,0,0,0,81,0,0,77,0,76,0,74,76,0,73,0,70,0,69,0,70,0,73,0,74,0,73,70,69,0,0,0,0,0,0,0]},
 {bpm:128,drum:'k...h.s.k.h.s..h',bass:[38,0,50,0,0,50,38,0,34,0,46,0,0,46,34,0,41,0,53,0,0,53,41,0,36,0,48,0,0,48,36,0],
  lead:[74,0,0,77,0,81,0,0,82,0,81,0,77,0,0,0,77,0,0,81,0,84,0,0,79,0,0,0,76,0,0,0,74,0,77,0,81,0,86,0,84,0,82,0,81,0,77,0,79,0,81,0,77,0,76,0,74,0,0,0,0,0,0,0]},
 {bpm:156,drum:'k.hsk.hsk.hsk.hs',bass:[40,0,40,52,0,40,50,0,40,0,40,52,0,43,45,0,36,0,36,48,0,36,47,0,38,0,38,50,0,42,43,0],
  lead:[76,0,79,0,81,0,79,76,0,74,0,76,0,0,0,0,76,0,79,0,83,0,81,79,0,81,0,79,0,0,0,0,72,0,76,0,79,0,76,72,0,71,0,72,0,0,0,0,74,0,78,0,81,0,79,78,0,76,0,0,0,0,0,0]},
 {bpm:118,drum:'k.......s.....h.',bass:[36,0,0,43,0,0,48,0,41,0,0,48,0,0,53,0,45,0,0,52,0,0,57,0,43,0,0,50,0,0,55,0],
  lead:[79,0,0,0,76,0,0,0,77,0,0,0,72,0,0,0,76,0,0,0,72,0,0,0,74,0,0,0,0,0,0,0,79,0,0,0,81,0,0,0,77,0,0,0,76,0,74,0,72,0,0,0,76,0,0,0,72,0,0,0,0,0,0,0]},
 {bpm:162,drum:'k.hsk.hsk.hskkhs',bass:[40,0,40,40,0,41,0,40,40,0,40,40,0,43,0,41,38,0,38,38,0,40,0,38,36,0,36,36,0,38,0,39],
  lead:[76,0,77,0,76,0,74,0,72,0,71,0,72,0,0,0,76,0,77,0,79,0,77,76,74,0,0,0,0,0,0,0,79,0,80,0,79,0,77,0,76,0,74,0,76,0,0,0,74,0,76,0,77,0,76,74,72,0,71,0,0,0,0,0]},
];
const mf=m=>440*Math.pow(2,(m-69)/12);
const MUS={song:-1,step:0,next:0,rate:1,
  play(i){if(this.song===i)return;this.song=i;this.step=0;this.rate=1;if(AU.ctx)this.next=AU.ctx.currentTime+.08;},
  stop(){this.song=-1;},
  update(){const c=AU.ctx;if(!c||this.song<0||!AU.music)return;if(this.next<c.currentTime)this.next=c.currentTime+.03;const s=SONGS[this.song],dt=60/(s.bpm*this.rate)/4;
    while(this.next<c.currentTime+.25){const st=this.step,t=this.next-c.currentTime,b=s.bass[st%s.bass.length],l=s.lead[st%s.lead.length],d=s.drum[st%s.drum.length];
      if(b)AU.tone('triangle',mf(b),mf(b),dt*1.8,.16,t,AU.mus);
      if(l)AU.tone('square',mf(l),mf(l),dt*1.6,.045,t,AU.mus);
      if(d==='k')AU.tone('sine',150,40,.12,.3,t,AU.mus);else if(d==='s')AU.noise(.12,.1,'bandpass',1800,t,AU.mus);else if(d==='h')AU.noise(.03,.05,'highpass',7000,t,AU.mus);
      this.next+=dt;this.step++;}}
};

// ====================================================================
// Eingabe: Tastatur, Gamepad, Touch
// ====================================================================
const keys=new Set();
const KM={gas:['ArrowUp','KeyX','KeyW'],brake:['ArrowDown','KeyZ','KeyS'],left:['ArrowLeft','KeyA'],right:['ArrowRight','KeyD'],hop:['Space','ShiftRight','KeyC'],item:['KeyE','ShiftLeft','KeyQ']};
const GAME_KEYS=new Set([].concat(...Object.values(KM)));
const down=a=>KM[a].some(k=>keys.has(k));
const touch={left:false,right:false,gas:false,brake:false,hop:false,item:false};
let upFresh=0,gp={gas:false,brake:false,hop:false,item:false,steer:0,up:false,down:false},gpPrev={};
let usingTouch=false;
function playerInput(){
  let steer=(down('right')||touch.right?1:0)-(down('left')||touch.left?1:0);
  if(gp.steer)steer=gp.steer;
  const upKey=keys.has('ArrowUp')||keys.has('KeyW');
  if(upKey)upFresh++;else upFresh=0;
  const autoGas=(R&&R.cfg.autoGas)||S.autoGas===true||(S.autoGas===null&&usingTouch);
  const manualGas=down('gas')||touch.gas||gp.gas;
  const gas=manualGas||(autoGas&&!(touch.brake||down('brake')||gp.brake));
  const brake=down('brake')||touch.brake||gp.brake;
  return{gas,manualGas,autoGas,brake,steer,hop:down('hop')||touch.hop||gp.hop,item:down('item')||touch.item||gp.item,
    aimF:(upKey&&(upFresh<14||keys.has('KeyX')))||gp.up,aimB:brake||gp.down};
}
function pollPad(){
  let pads=[];try{pads=navigator.getGamepads?[...navigator.getGamepads()]:[];}catch(e){}
  const p=pads.find(x=>x&&x.connected);
  if(!p){gp={gas:false,brake:false,hop:false,item:false,steer:0,up:false,down:false};return;}
  const b=i=>!!(p.buttons[i]&&p.buttons[i].pressed);
  let ax=p.axes[0]||0;if(Math.abs(ax)<.2)ax=0;
  let steer=b(14)?-1:b(15)?1:ax;
  const ay=p.axes[1]||0;
  const cur={a:b(0),b:b(1),x:b(2),start:b(9),up:b(12)||ay<-.6,down:b(13)||ay>.6,left:b(14)||ax<-.6,right:b(15)||ax>.6,hop:b(5)||b(7),item:b(4)||b(6)};
  gp={gas:cur.a,brake:cur.x,hop:cur.hop,item:cur.item,steer,up:cur.up,down:cur.down};
  const edge=k=>cur[k]&&!gpPrev[k];
  if(menuOpen()){if(edge('up'))menuMove(0,-1);if(edge('down'))menuMove(0,1);if(edge('left'))menuMove(-1,0);if(edge('right'))menuMove(1,0);if(edge('a'))menuConfirm();if(edge('b'))menuBack();}
  else if(edge('start'))togglePause();
  gpPrev=cur;
}

// ====================================================================
// Rennen
// ====================================================================
const MODE=window.KK_MODE||'single';
const S=Object.assign({cc:100,char:0,autoGas:null,music:true,sound:true,mode:'gp'},store.settings||{}); // Einstellungen
let R=null,paused=false,screenName='title';
const DBG={auto:false};
const HK={render:null,tick:null,onFinish:null,onPost:null}; // Seiten-Hooks (Klassenmodus)
const GP={active:false,race:0,flags:3,pts:[0,0,0,0,0,0,0,0],order:null,results:[]};
let cam={x:0,y:0,a:0,tgt:null};

function newKart(ci,human,slot){
  const c=CHARS[ci];
  return{ci,c,ph:physStats(c.st),human,slot,x:0,y:0,a:0,vx:0,vy:0,speed:0,z:0,vz:0,drift:0,mt:0,mtF:0,mtFull:false,boost:0,bMul:1,bKind:1,
    spin:0,spinA:0,squish:0,small:0,ghost:0,star:0,fall:0,stall:0,inv:0,item:null,itemN:0,roul:0,next:null,trail:null,orbit:null,coins:0,
    lap:0,half:true,idx:0,prevIdx:0,lat:0,finished:false,ftime:0,lapStart:0,lapTimes:[],place:slot+1,visYaw:0,wrongT:0,gasAt:-1,prevHop:false,prevItem:false,prevGas:false,
    ai:{lane:(Math.random()*2-1)*10,laneT:0,itemT:120,pers:.985+Math.random()*.03},aiTop:1};
}
function newRace(cfg){
  const T=trackFull(cfg.track),N=T.N,P=T.pts;
  const ttLike=cfg.mode==='tt'||cfg.mode==='quali';
  const r={cfg,T,N,laps:cfg.laps||LAPS,ttLike,net:null,karts:[],objs:[],parts:[],crys:[],coins:[],t:0,cd:cfg.mode==='attract'?160:240,state:'intro',postT:0,flash:0,ccm:CC[cfg.cc],player:null,camSwitch:0};
  if(!ttLike)for(const f of T.def.items){const i=Math.floor(f*N)%N;for(const lat of[-15,-5,5,15])r.crys.push({x:P[i].x+P[i].nx*lat,y:P[i].y+P[i].ny*lat,t:0,ph:(Math.random()*8)|0});}
  const avoid=T.def.items.map(f=>Math.floor(f*N));
  for(let gi=0;gi<10;gi++){let base=Math.floor((gi+.5)/10*N);for(const a of avoid)if(Math.abs(base-a)<14)base+=18;const lat=[-9,0,9,6,-6][gi%5];for(let c=0;c<5;c++){const i=(base+c*2)%N;r.coins.push({x:P[i].x+P[i].nx*lat,y:P[i].y+P[i].ny*lat,on:true});}}
  for(const[f,lat]of T.def.oils||[]){const i=Math.floor(f*N)%N;r.objs.push({type:'oil',perm:true,x:P[i].x+P[i].nx*lat,y:P[i].y+P[i].ny*lat,a:P[i].a,v:0,z:0,vz:0,fly:false,idx:i,lat,life:Infinity,owner:null,grace:0});}
  cfg.grid.forEach((ci,j)=>{const duel=cfg.mode==='duel';const i=(N-3-(duel?Math.floor(j/2)*4:j*4)+N)%N,lat=cfg.grid.length>1?(j%2?10:-10):0;
    const human=cfg.localSlot!=null?j===cfg.localSlot:(ci===cfg.player&&cfg.mode!=='attract');const k=newKart(ci,human,j);k.remote=duel&&!human;k.name=cfg.names?String(cfg.names[j]||''):'';
    k.x=P[i].x+P[i].nx*lat;k.y=P[i].y+P[i].ny*lat;k.a=P[i].a;k.idx=i;k.prevIdx=i;k.coins=ttLike?0:2+Math.round(j*3/7);k.ai.lane=lat;r.karts.push(k);});
  r.player=r.karts.find(k=>k.human)||null;
  if(ttLike&&r.player){r.player.item='turbo3';r.player.itemN=3;}
  return r;
}
const prog=k=>{if(k.remote&&k.netIdx!=null)return k.lap*R.N+k.netIdx;return k.lap*R.N+k.idx+clamp(((k.x-R.T.pts[k.idx].x)*R.T.pts[k.idx].dx+(k.y-R.T.pts[k.idx].y)*R.T.pts[k.idx].dy)/STEP,-.5,.5);};
function locate(o,T){const N=T.N,P=T.pts;let best=o.idx,bd=1e18;for(let d=-10;d<=26;d++){const i=(o.idx+d+N)%N,p=P[i],dx=o.x-p.x,dy=o.y-p.y,q=dx*dx+dy*dy;if(q<bd){bd=q;best=i;}}o.idx=best;const p=P[best];o.lat=(o.x-p.x)*p.nx+(o.y-p.y)*p.ny;}
function padAt(k,T){for(const p of T.pads){const di=(k.idx-p.i+T.N)%T.N;if(di<=p.len&&Math.abs(k.lat-p.lat)<=p.half)return p.type;}return null;}
function startBoost(k,f,mul,kind){if(k.boost<=0||mul>=k.bMul){k.bMul=mul;k.bKind=kind;}k.boost=Math.max(k.boost,f);}
function endDrift(k,allow=true){if(allow&&k.mt>=128){startBoost(k,34,1.22,2);if(k.human)SFX.mt();}k.drift=0;k.mt=0;k.mtF=0;k.mtFull=false;}
function releaseMT(k){if(k.mt>=128){startBoost(k,34,1.22,2);if(k.human)SFX.mt();}k.mt=0;k.mtF=0;k.mtFull=false;}
function part(x,y,z,vx,vy,vz,life,col,sz=.8){if(R.parts.length<420)R.parts.push({x,y,z,vx,vy,vz,life,max:life,col,sz});}
function coinBurst(k,n){for(let i=0;i<n;i++){const a=Math.random()*TAU;R.parts.push({x:k.x,y:k.y,z:3,vx:Math.cos(a)*.8,vy:Math.sin(a)*.8,vz:1.4,life:40,max:40,col:'#ffd23f',sz:1.6,coin:true});}}

function kartUpdate(k,inp){
  const T=R.T,ph=k.ph,th=T.th;
  const hopP=inp.hop&&!k.prevHop,itemP=inp.item&&!k.prevItem;
  k.prevHop=inp.hop;k.prevItem=inp.item;
  if(k.boost>0)k.boost--;if(k.star>0)k.star--;if(k.small>0)k.small--;if(k.ghost>0)k.ghost--;if(k.squish>0)k.squish--;if(k.inv>0)k.inv--;
  if(k.fall>0){fallUpdate(k);return;}
  if(k.roul>0){k.roul--;if(itemP&&k.roul>14)k.roul=14;if(k.human&&k.roul%4===0)SFX.tick();if(k.roul===0){k.item=k.next;k.itemN=k.item==='turbo3'?3:0;k.ai.itemT=(40+Math.random()*160)/R.ccm.items;if(k.human)SFX.get();}}
  else handleItem(k,inp,itemP);
  locate(k,T);
  const surf=Math.abs(k.lat)<=RH+CURB?0:Math.abs(k.lat)<=WALL?1:2;
  const pad=k.z<1?padAt(k,T):null;
  if(pad==='boost'&&k.boost<30){startBoost(k,48,1.32,1);if(k.human)SFX.boost();}
  if(pad==='ramp'&&k.speed>.8&&k.vz<=0){k.vz=1.5+k.speed*.38;k.z=.1;if(k.drift)endDrift(k,false);if(k.human)SFX.hop();}
  let top=ph.top*R.ccm.mul*k.aiTop*(1+Math.min(k.coins,50)*.0012);
  if(k.small>0)top*=.7;if(k.squish>0)top*=.4;
  const grounded=k.z<.5,off=surf===1&&grounded;
  if(off&&k.boost<=0&&k.star<=0)top*=ph.off;
  if(k.star>0)top*=1.12;
  if(k.boost>0)top*=k.bMul;
  if(k.spin>0){k.spin--;k.spinA+=.42;k.speed*=.94;if(k.drift)endDrift(k,false);if(!k.spin)k.spinA=0;}
  else if(k.stall>0){k.stall--;k.speed=0;if(R.t%5===0)part(k.x-Math.cos(k.a)*6,k.y-Math.sin(k.a)*6,2,0,0,.4,24,'#9aa0ae',1.4);}
  else{
    const gas=inp.gas||k.boost>0;
    if(grounded){
      if(k.boost>0)k.speed=lerp(k.speed,top,.12);
      else if(gas&&!inp.brake){if(k.speed<top)k.speed+=ph.acc*Math.max(.12,1-k.speed/top);}
      else if(inp.brake){k.speed-=k.speed>0?ph.brk:.025;if(k.speed<-.75)k.speed=-.75;}
      else{k.speed*=.986;if(Math.abs(k.speed)<.02)k.speed=0;}
      if(k.speed>top)k.speed=lerp(k.speed,top,off?.09:.025);
    }
    if(hopP&&grounded&&k.speed>.3){k.vz=1.02;k.z=.05;if(k.human)SFX.hop();}
    const sp=Math.abs(k.speed),sF=clamp(sp/.9,0,1)*(k.speed<0?-1:1);
    let turn;
    if(k.drift&&(!inp.hop||k.speed<.8))endDrift(k);
    if(k.drift){
      const into=inp.steer*k.drift;
      turn=k.drift*ph.turn*ph.drift*(.6+.55*into);
      if(inp.hop&&inp.gas&&inp.steer!==0){k.mtF++;k.mt+=k.mtF<=20?1:2;if(k.mt>=128&&!k.mtFull){k.mtFull=true;if(k.human)SFX.ready();}}
      else if(k.mt>0)releaseMT(k);
      k.speed*=.9992;
    }else{
      turn=inp.steer*ph.turn*sF;
      if(sp>top*.9&&inp.steer)k.speed*=.9994;
    }
    if(!grounded)turn*=.55;
    k.a+=turn*(th.grip<1?.88:1);
  }
  if(k.z>0||k.vz>0){k.z+=k.vz;k.vz-=.13;if(k.z<=0){const lv=k.vz;k.z=0;k.vz=0;
    if(inp.hop&&inp.steer!==0&&k.speed>1&&!k.drift&&k.spin<=0&&k.stall<=0){k.drift=Math.sign(inp.steer);k.mt=0;k.mtF=0;k.mtFull=false;}
    if(lv<-1.4)for(let i=0;i<6;i++)part(k.x,k.y,.5,(Math.random()-.5)*.8,(Math.random()-.5)*.8,.5,20,th.dust,1.2);}}
  const ca=Math.cos(k.a),sa=Math.sin(k.a);
  let tx=ca*k.speed,ty=sa*k.speed;
  if(k.drift){const sl=ph.slip*k.speed*.32;tx+=sa*k.drift*sl;ty+=-ca*k.drift*sl;}
  const gr=ph.grip*th.grip*(grounded?1:.25);
  k.vx=lerp(k.vx,tx,gr);k.vy=lerp(k.vy,ty,gr);
  k.x+=k.vx;k.y+=k.vy;
  k.visYaw=lerp(k.visYaw,k.drift*.45+(k.drift?0:inp.steer*.14*(k.speed>0?1:0)),.2);
  locate(k,T);
  const lim=WALL-KR;
  if(Math.abs(k.lat)>lim){
    if(T.open[k.idx]){if(Math.abs(k.lat)>WALL+2&&k.z<1){startFall(k);return;}}
    else{const p=T.pts[k.idx],sg=Math.sign(k.lat),ov=Math.abs(k.lat)-lim;k.x-=p.nx*sg*ov;k.y-=p.ny*sg*ov;k.lat=sg*lim;
      const vn=(k.vx*p.nx+k.vy*p.ny)*sg;
      if(vn>0){k.vx-=p.nx*sg*vn*1.6;k.vy-=p.ny*sg*vn*1.6;const hard=vn>.45;k.speed*=hard?.55:.92;
        if(k.speed>0){const ta=Math.atan2(k.vy,k.vx);k.a+=wrapA(ta-k.a)*.45;}
        if(hard){if(k.drift)endDrift(k,false);if(k.human)SFX.wall();for(let i=0;i<4;i++)part(k.x+p.nx*sg*4,k.y+p.ny*sg*4,2,(Math.random()-.5),(Math.random()-.5),.8,14,'#ffd23f',.6);}}}
  }
  // Partikel
  if(k.drift&&grounded&&R.t%3===0){for(const s of[-1,1])part(k.x-ca*5+(-sa)*s*4,k.y-sa*5+ca*s*4,.6,-ca*.2,-sa*.2,.25,16,k.mtFull?(R.t%6?'#7fd0ff':'#ffffff'):'#e8e8f0',k.mtFull?.8:1.2);}
  if(off&&k.speed>.8&&R.t%4===0)part(k.x-ca*5,k.y-sa*5,.6,(Math.random()-.5)*.4,(Math.random()-.5)*.4,.45,18,th.dust,1.1);
  const p=T.pts[k.idx],fw=k.vx*p.dx+k.vy*p.dy;
  if(fw<-.4)k.wrongT++;else k.wrongT=Math.max(0,k.wrongT-3);
}
function startFall(k){const th=R.T.th;k.fall=k.fallMax=th.fallTime||100;k.drift=0;k.mt=0;k.mtF=0;k.mtFull=false;k.boost=0;k.trail=null;k.orbit=null;k.spin=0;k.spinA=0;const lose=Math.min(th.lava?3:2,k.coins);k.coins-=lose;k.fallIdx=k.idx;
  const fx=th.lava?['#ffd23f','#ff7a1a','#5a4a4e']:['#ffffff','#7fb2ff'];
  for(let i=0;i<12;i++)part(k.x,k.y,.5,(Math.random()-.5)*1.2,(Math.random()-.5)*1.2,1.2+Math.random(),26,fx[i%fx.length],1.2);
  if(k.human){SFX.fall();setTimeout(()=>th.lava?SFX.sizzle():SFX.splash(),350);if(th.lava)say('Zu heiß!',70,'warn');}}
function fallUpdate(k){
  k.fall--;
  if(R.T.th.lava&&k.fall>70&&R.t%5===0)part(k.x+(Math.random()-.5)*6,k.y+(Math.random()-.5)*6,.5,0,0,.35,30,Math.random()<.4?'#ff9a1f':'#4a3a3e',1.4);
  if(k.fall===70){const T=R.T,i=(k.fallIdx-3+T.N)%T.N,p=T.pts[i];k.idx=i;k.x=p.x;k.y=p.y;k.a=p.a;k.speed=0;k.vx=k.vy=0;k.z=24;k.vz=0;k.lat=0;}
  if(k.fall<70){k.z=Math.max(0,k.fall/70*24);}
  if(k.fall===0){k.z=0;k.inv=60;}
}
function hit(k,kind,src){
  if(k.remote)return false;
  if(k.fall>0||k.inv>0||k.ghost>0)return false;
  if(k.star>0)return false;
  if(DBG.count)DBG.count[kind]=(DBG.count[kind]||0)+1;
  const dur={shell:56,oil:46,bump:40,star:56,squish:70,comet:90,bolt:36}[kind]||50;
  if(kind==='squish'){k.squish=dur;k.speed*=.2;}else{k.spin=dur;k.speed*=kind==='bump'?.6:.35;}
  if(kind==='comet'){k.vz=2.4;k.z=.1;}
  if(k.drift)endDrift(k,false);k.boost=0;
  if(kind!=='bump'&&kind!=='squish'){const lose=Math.min(k.coins,3);if(lose){k.coins-=lose;coinBurst(k,lose);}}
  k.trail=null;k.orbit=null;k.inv=dur+18;
  if(k.human)SFX.hit();else if(src&&src.human)SFX.hit2();
  for(let i=0;i<6;i++)part(k.x,k.y,4,(Math.random()-.5)*1.4,(Math.random()-.5)*1.4,1,22,i%2?'#ffd23f':'#ffffff',.8);
  return true;
}
// ---------- Items
const ITEM_W=[
  {oil:34,spark:30,homing:12,spark3:8,turbo:10,ghost:6},
  {oil:14,spark:18,homing:24,spark3:12,turbo:16,ghost:10,turbo3:6},
  {homing:20,homing3:12,turbo:14,turbo3:16,spark3:10,ghost:10,comet:4,star:6,oil:8},
  {homing:16,homing3:16,turbo3:20,star:12,comet:8,ghost:10,turbo:10,bolt:4,spark3:4},
  {homing3:20,turbo3:22,star:18,comet:12,bolt:10,ghost:8,homing:10},
  {star:24,turbo3:22,homing3:18,bolt:16,comet:14,ghost:6},
];
function rollItem(k){
  const n=R.karts.length,tier=n<=1?2:n===2?(k.place===1?1:3):Math.round((k.place-1)/(n-1)*5);
  const w=Object.assign({},ITEM_W[tier]);
  if(R.objs.some(o=>o.type==='comet'))delete w.comet;
  if(!k.human&&R.cfg.cc===50){delete w.comet;delete w.bolt;}
  const tot=Object.values(w).reduce((a,b)=>a+b,0);let r=Math.random()*tot;
  for(const[it,v]of Object.entries(w)){if((r-=v)<0)return it;}return 'turbo';
}
function handleItem(k,inp,itemP){
  if(k.orbit){if(itemP){fireProj(k,k.orbit.type,inp.aimB?-1:1);if(--k.orbit.n<=0)k.orbit=null;}return;}
  if(k.trail){if(!inp.item)releaseTrail(k,inp);return;}
  if(!itemP||!k.item)return;
  const it=k.item;
  if(it==='oil'||it==='spark'||it==='homing'){k.trail=it;k.item=null;return;}
  if(it==='spark3'||it==='homing3'){k.orbit={type:it==='spark3'?'spark':'homing',n:3};k.item=null;if(k.human)SFX.drop();return;}
  if(it==='turbo'||it==='turbo3'){startBoost(k,70,1.34,1);if(k.human)SFX.boost();if(it==='turbo3'&&--k.itemN>0)return;k.item=null;return;}
  k.item=null;
  if(it==='star'){k.star=480;if(k.human)SFX.star();}
  else if(it==='bolt')useBolt(k);
  else if(it==='ghost')useGhost(k);
  else if(it==='comet')fireComet(k);
}
function releaseTrail(k,inp){
  const type=k.trail;k.trail=null;const ca=Math.cos(k.a),sa=Math.sin(k.a);
  if(type==='oil'){
    if(inp.aimF){R.objs.push(netObj({type:'oil',x:k.x+ca*8,y:k.y+sa*8,a:k.a,v:Math.max(k.speed,0)+2.2,z:3,vz:1.6,fly:true,idx:k.idx,lat:k.lat,life:3600,owner:k,grace:0}));if(k.human)SFX.fire();}
    else{R.objs.push(netObj({type:'oil',x:k.x-ca*9,y:k.y-sa*9,a:k.a,v:0,z:0,vz:0,fly:false,idx:k.idx,lat:k.lat,life:3600,owner:k,grace:20}));if(k.human)SFX.drop();}
  }else fireProj(k,type,inp.aimB?-1:1);
}
function targetAhead(k){if(k.place<=1)return null;return R.karts.find(o=>o.place===k.place-1&&!o.finished)||null;}
function fireProj(k,type,dir){
  const off=dir>0?9:-9,ca=Math.cos(k.a),sa=Math.sin(k.a);
  const o={type,x:k.x+ca*off,y:k.y+sa*off,a:dir>0?k.a:k.a+Math.PI,v:type==='homing'?3.7:4,z:0,idx:k.idx,lat:k.lat,life:type==='homing'?660:540,owner:k,grace:14,bounce:0,target:null,straight:dir<0};
  if(type==='homing'&&dir>0)o.target=targetAhead(k);
  R.objs.push(netObj(o));if(k.human)SFX.fire();
}
function fireComet(k){const lead=R.karts.find(o=>o.place===1);R.objs.push(netObj({type:'comet',x:k.x,y:k.y,a:k.a,v:4.6,z:6,idx:k.idx,lat:k.lat,life:1800,owner:k,grace:lead===k?Math.floor(R.N*.8/1.15):30,target:lead,hits:new Set([k])}));if(k.human)SFX.comet();}
function boltHit(o){if(o.ghost>0||o.star>0||o.fall>0||o.remote)return;o.small=180+(R.karts.length-o.place)*22;o.item=null;o.itemN=0;o.roul=0;o.trail=null;o.orbit=null;o.spin=Math.max(o.spin,30);if(o.drift)endDrift(o,false);o.boost=0;}
function useBolt(k){R.flash=14;SFX.bolt();for(const o of R.karts)if(o!==k)boltHit(o);if(R.player&&R.player!==k&&R.player.small>0)SFX.shrink();if(k.human)netEv({k:'bolt'});}
function useGhost(k){k.ghost=360;if(k.human)SFX.ghost();const c=R.karts.filter(o=>o!==k&&o.item&&!o.roul);if(c.length&&!k.item){const v=c[(Math.random()*c.length)|0];if(v.remote){if(k.human)netEv({k:'steal',to:R.karts.indexOf(v)});}else{k.item=v.item;k.itemN=v.itemN;v.item=null;v.itemN=0;}}}
function orbitPos(k,i){const a=R.t*.16+i*TAU/3;return[k.x+Math.cos(a)*8,k.y+Math.sin(a)*8];}
function trailPos(k){return[k.x-Math.cos(k.a)*8,k.y-Math.sin(k.a)*8];}
function updateObjs(){
  const T=R.T,N=T.N,P=T.pts;
  for(const o of R.objs){
    if(o.dead)continue;o.life--;if(o.grace>0)o.grace--;if(o.life<=0){o.dead=true;continue;}
    if(o.type==='oil'){if(o.fly){o.x+=Math.cos(o.a)*o.v;o.y+=Math.sin(o.a)*o.v;o.z+=o.vz;o.vz-=.12;if(o.z<=0){o.z=0;o.fly=false;locate(o,T);if(Math.abs(o.lat)>WALL&&T.open[o.idx])o.dead=true;if(Math.abs(o.lat)>WALL-3&&!T.open[o.idx]){const p=P[o.idx],sg=Math.sign(o.lat);o.x-=p.nx*sg*(Math.abs(o.lat)-WALL+4);o.y-=p.ny*sg*(Math.abs(o.lat)-WALL+4);}}}continue;}
    if(o.type==='spark'||(o.type==='homing'&&o.straight)){
      o.x+=Math.cos(o.a)*o.v;o.y+=Math.sin(o.a)*o.v;locate(o,T);
      if(Math.abs(o.lat)>WALL-2){if(T.open[o.idx]){o.dead=true;continue;}const p=P[o.idx],sg=Math.sign(o.lat);let dx=Math.cos(o.a),dy=Math.sin(o.a);const dn=dx*p.nx+dy*p.ny;if(dn*sg>0){dx-=2*dn*p.nx;dy-=2*dn*p.ny;o.a=Math.atan2(dy,dx);o.bounce++;if(o.bounce>8)o.dead=true;}const ov=Math.abs(o.lat)-(WALL-2);o.x-=p.nx*sg*ov;o.y-=p.ny*sg*ov;}
    }else if(o.type==='homing'){
      let t=o.target;if(t&&(t.ghost>0||t.fall>0||t.finished))t=o.target=null;
      if(!t){for(const k of R.karts){if(k===o.owner||k.ghost>0||k.fall>0)continue;const dx=k.x-o.x,dy=k.y-o.y;if(dx*dx+dy*dy<70*70&&dx*Math.cos(o.a)+dy*Math.sin(o.a)>0){t=o.target=k;break;}}}
      locate(o,T);
      let des;
      if(t&&(t.x-o.x)**2+(t.y-o.y)**2<85*85)des=Math.atan2(t.y-o.y,t.x-o.x);
      else{const p=P[(o.idx+7)%N],lat=t?clamp(t.lat,-RH,RH)*.5:o.lat*.85;des=Math.atan2(p.y+p.ny*lat-o.y,p.x+p.nx*lat-o.x);}
      o.a+=clamp(wrapA(des-o.a),-.14,.14);
      o.x+=Math.cos(o.a)*o.v;o.y+=Math.sin(o.a)*o.v;locate(o,T);
      if(Math.abs(o.lat)>WALL-2){if(T.open[o.idx]){o.dead=true;continue;}const p=P[o.idx],sg=Math.sign(o.lat),ov=Math.abs(o.lat)-(WALL-2);o.x-=p.nx*sg*ov;o.y-=p.ny*sg*ov;}
    }else if(o.type==='comet'){
      let t=R.karts.find(k=>k.place===1&&!k.finished)||o.target;o.target=t;
      locate(o,T);
      let des;const dd=t?(t.x-o.x)**2+(t.y-o.y)**2:1e9;
      if(t&&dd<45*45&&!(t===o.owner&&o.grace>0))des=Math.atan2(t.y-o.y,t.x-o.x);
      else{const p=P[(o.idx+6)%N];des=Math.atan2(p.y-o.y,p.x-o.x);}
      o.a+=clamp(wrapA(des-o.a),-.2,.2);o.x+=Math.cos(o.a)*o.v;o.y+=Math.sin(o.a)*o.v;
      if(R.t%2===0)part(o.x,o.y,6,0,0,.1,18,R.t%4?'#9fc3ff':'#ffffff',1);
      for(const k of R.karts){if(o.hits.has(k)||(k===o.owner&&o.grace>0))continue;const d2=(k.x-o.x)**2+(k.y-o.y)**2;if(d2<7*7&&k!==t){hit(k,'shell',o.owner);o.hits.add(k);}}
      if(t&&dd<6*6&&!(t===o.owner&&o.grace>0)){o.dead=true;SFX.boom();R.flash=Math.max(R.flash,5);for(const k of R.karts){if((k.x-o.x)**2+(k.y-o.y)**2<20*20)hit(k,'comet',o.owner);}for(let i=0;i<20;i++)part(o.x,o.y,4,(Math.random()-.5)*2.4,(Math.random()-.5)*2.4,1.5*Math.random(),30,i%3?'#7fb2ff':'#ffffff',1.4);}
      continue;
    }
    if(o.x<-50||o.y<-50||o.x>MAP+50||o.y>MAP+50)o.dead=true;
  }
  // Treffer: Geschosse/Öl gegen Karts, Schleppitems, Orbits, einander
  for(const o of R.objs){
    if(o.dead||o.type==='comet')continue;
    for(const k of R.karts){
      if(k.fall>0||k.ghost>0)continue;if(k===o.owner&&o.grace>0)continue;
      const d2=(k.x-o.x)**2+(k.y-o.y)**2;
      if(o.type==='oil'){if(!o.fly&&d2<(KR+3)**2&&k.z<1.5){if(o.perm){if(k.star<=0&&hit(k,'oil',null))k.inv=Math.max(k.inv,95);continue;}if(k.star<=0)hit(k,'oil',o.owner);o.dead=true;netKill(o,k);break;}if(o.perm)continue;}
      else if(d2<(KR+3.5)**2&&k.z<5){if(k.star<=0)hit(k,'shell',o.owner);o.dead=true;netKill(o,k);break;}
      if(k.trail){const[tx,ty]=trailPos(k);if((tx-o.x)**2+(ty-o.y)**2<36&&!(k===o.owner)){k.trail=null;o.dead=true;netKill(o,k);break;}}
      if(k.orbit){for(let i=0;i<k.orbit.n;i++){const[ox,oy]=orbitPos(k,i);if((ox-o.x)**2+(oy-o.y)**2<36&&o.owner!==k){k.orbit.n--;if(k.orbit.n<=0)k.orbit=null;o.dead=true;netKill(o,k);break;}}if(o.dead)break;}
    }
  }
  const live=R.objs.filter(o=>!o.dead&&o.type!=='comet'&&!o.fly);
  for(let i=0;i<live.length;i++)for(let j=i+1;j<live.length;j++){const a=live[i],b=live[j];if(a.dead||b.dead)continue;if(a.type==='oil'&&b.type==='oil')continue;if((a.x-b.x)**2+(a.y-b.y)**2<36){if(!a.perm)a.dead=true;if(!b.perm)b.dead=true;part(a.x,a.y,2,0,0,1,16,'#ffffff',1.2);}}
  // Orbits & Schleppitems gegen andere Karts
  for(const k of R.karts){
    if(k.orbit){for(const o of R.karts){if(o===k||o.fall>0||o.ghost>0)continue;for(let i=0;i<(k.orbit?k.orbit.n:0);i++){const[ox,oy]=orbitPos(k,i);if((ox-o.x)**2+(oy-o.y)**2<(KR+2.5)**2){if(o.star<=0)hit(o,'shell',k);k.orbit.n--;if(k.orbit.n<=0)k.orbit=null;break;}}}}
    if(k.trail){const[tx,ty]=trailPos(k);for(const o of R.karts){if(o===k||o.fall>0||o.ghost>0)continue;if((tx-o.x)**2+(ty-o.y)**2<(KR+2.5)**2){if(o.star<=0)hit(o,k.trail==='oil'?'oil':'shell',k);k.trail=null;break;}}}
  }
  R.objs=R.objs.filter(o=>!o.dead);
}
function collideKarts(){
  const K=R.karts;
  for(let i=0;i<K.length;i++){const a=K[i];if(a.fall>0||a.ghost>0)continue;
    for(let j=i+1;j<K.length;j++){const b=K[j];if(b.fall>0||b.ghost>0)continue;
      if(a.remote&&b.remote)continue;
      const ra=a.small>0?KR*.6:KR,rb=b.small>0?KR*.6:KR,rr=ra+rb,dx=b.x-a.x,dy=b.y-a.y,d2=dx*dx+dy*dy;
      if(d2>=rr*rr||Math.abs(a.z-b.z)>5)continue;
      if(a.star>0&&b.star<=0){hit(b,'star',a);continue;}if(b.star>0&&a.star<=0){hit(a,'star',b);continue;}
      if(a.small>0&&b.small<=0){hit(a,'squish',b);continue;}if(b.small>0&&a.small<=0){hit(b,'squish',a);continue;}
      const d=Math.sqrt(d2)||.01,nx=dx/d,ny=dy/d,ov=rr-d,ma=a.ph.mass,mb=b.ph.mass,tot=ma+mb;
      const wa=b.remote?1:a.remote?0:mb/tot,wb=a.remote?1:b.remote?0:ma/tot;
      a.x-=nx*ov*wa;a.y-=ny*ov*wa;b.x+=nx*ov*wb;b.y+=ny*ov*wb;
      const rv=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;
      if(rv<0){const J=-1.5*rv/(1/ma+1/mb);if(!a.remote){a.vx-=J/ma*nx;a.vy-=J/ma*ny;}if(!b.remote){b.vx+=J/mb*nx;b.vy+=J/mb*ny;}
        const light=ma<mb?a:mb<ma?b:(a.remote?b:b.remote?a:(Math.random()<.5?a:b));
        if(!light.remote){light.speed*=.88;
          if(-rv>.45&&light.inv<=0&&light.spin<=0){if(light.coins>0){if(-rv>.6){light.coins--;coinBurst(light,1);light.inv=20;}}else hit(light,'bump',light===a?b:a);}}
        if((a.human||b.human)&&-rv>.2)SFX.bump();}
    }}
}
function pickups(){
  for(const c of R.crys)if(c.t>0)c.t--;
  for(const k of R.karts){
    if(k.fall>0)continue;
    for(const c of R.crys){if(c.t>0)continue;if((k.x-c.x)**2+(k.y-c.y)**2<64&&k.z<5){c.t=210;for(let i=0;i<8;i++)part(c.x,c.y,4,(Math.random()-.5)*1.2,(Math.random()-.5)*1.2,.8,20,hsl(i*45,90,65),1);
      if(!k.remote&&!k.item&&!k.roul&&!k.orbit&&!k.trail&&!R.ttLike){k.roul=72;k.next=rollItem(k);if(k.human)SFX.box();}}}
    for(const c of R.coins){if(!c.on)continue;if((k.x-c.x)**2+(k.y-c.y)**2<36&&k.z<5){c.on=false;if(!k.remote){k.coins=Math.min(99,k.coins+1);if(k.human)SFX.coin();}}}
  }
}
function updateParts(){for(const p of R.parts){p.x+=p.vx;p.y+=p.vy;p.z+=p.vz;p.vz-=p.coin?.09:.03;if(p.z<0){p.z=0;p.vz=0;p.vx*=.6;p.vy*=.6;}p.life--;}R.parts=R.parts.filter(p=>p.life>0);}
function lapCheck(k){
  const N=R.N,pi=k.prevIdx,i=k.idx;
  if(i>N*.4&&i<N*.6)k.half=true;
  if(pi>N*.75&&i<N*.25){if(k.half){k.half=false;k.lap++;onLap(k);}}
  else if(pi<N*.25&&i>N*.75){k.lap--;k.half=true;}
  k.prevIdx=i;
}
function onLap(k){
  if(k.lap>=2){k.lapTimes.push(R.t-k.lapStart);k.lapStart=R.t;}
  if(k.lap>R.laps){k.finished=true;k.ftime=R.t;if(k.human)playerFinished(k);return;}
  if(k.human&&R.cfg.mode!=='attract'){if(k.lap===R.laps){say('Letzte Runde!',90,'gold');SFX.final();MUS.rate=1.12;}else if(k.lap>=2){say('Runde '+k.lap,70);SFX.lap();}}
}
function updatePlaces(){const K=[...R.karts].sort((a,b)=>{if(a.finished&&b.finished)return a.ftime-b.ftime;if(a.finished)return-1;if(b.finished)return 1;return prog(b)-prog(a);});K.forEach((k,i)=>k.place=i+1);}

// ---------- Netz (Live-Duell im Klassenmodus)
const ITEM_CODES=['oil','spark','spark3','homing','homing3','comet','turbo','turbo3','star','bolt','ghost'];
const r2=v=>Math.round(v*100)/100,r3=v=>Math.round(v*1000)/1000;
function netEv(e){if(R&&R.net)R.net.send({t:'ev',e});}
function netObj(o){
  if(R&&R.net&&o.owner&&o.owner.human&&!o.nid){
    o.nid=R.net.slot+'.'+(++R.net.seq);
    netEv({k:'obj',nid:o.nid,type:o.type,x:r2(o.x),y:r2(o.y),a:r3(o.a),v:r2(o.v),z:r2(o.z||0),vz:r2(o.vz||0),fly:!!o.fly,life:o.life,grace:o.grace,straight:!!o.straight,tgt:o.target?R.karts.indexOf(o.target):-1,idx:o.idx});
  }
  return o;
}
function netKill(o,k){if(R.net&&o.nid&&!k.remote)netEv({k:'kill',nid:o.nid});}
function packState(k){
  const it=k.roul>0?-2:(k.item?ITEM_CODES.indexOf(k.item):-1);
  return[r2(k.x),r2(k.y),r3(k.a),r2(k.z),r2(k.speed),r2(k.vx),r2(k.vy),k.drift,k.boost,k.bKind,k.star,k.ghost,k.small,k.squish,k.spin,k.fall,k.fallMax||0,k.inv,k.lap,k.coins,
    k.trail?['oil','spark','homing'].indexOf(k.trail)+1:0,k.orbit?k.orbit.n:0,k.orbit?(k.orbit.type==='spark'?1:2):0,r2(k.visYaw),k.finished?1:0,k.ftime,it,k.mtFull?1:0,k.idx];
}
function netTick(){const k=R.player;if(!k||!R.net||R.state==='intro')return;if(R.t%3===0)R.net.send({t:'st',s:packState(k)});}
function applyState(k,s){
  if(!Array.isArray(s)||s.length<29)return;
  const n=k.net||(k.net={});
  if(!R.player&&n.init){
    if((s[14]|0)>0&&k.spin<=0)SFX.hit();
    if((s[15]|0)>0&&k.fall<=0)SFX.fall();
    if((s[8]|0)>k.boost+10)SFX.boost();
    if((s[19]|0)>k.coins)SFX.coin();
  }
  n.x=+s[0]||0;n.y=+s[1]||0;n.a=+s[2]||0;n.vx=+s[5]||0;n.vy=+s[6]||0;n.at=performance.now();
  k.z=+s[3]||0;k.speed=+s[4]||0;k.vx=n.vx;k.vy=n.vy;k.drift=s[7]|0;k.boost=s[8]|0;k.bKind=s[9]|0||1;k.star=s[10]|0;k.ghost=s[11]|0;k.small=s[12]|0;k.squish=s[13]|0;
  k.spin=s[14]|0;k.fall=s[15]|0;k.fallMax=(s[16]|0)||100;k.inv=s[17]|0;k.lap=s[18]|0;k.coins=s[19]|0;
  const tr=s[20]|0;k.trail=tr?['oil','spark','homing'][tr-1]||null:null;
  const on=s[21]|0;k.orbit=on>0?{n:Math.min(3,on),type:(s[22]|0)===1?'spark':'homing'}:null;
  k.visYaw=+s[23]||0;k.finished=!!s[24];k.ftime=s[25]|0;
  const it=s[26]|0;k.item=it>=0?(ITEM_CODES[it]||null):null;k.roul=it===-2?1:0;
  k.mtFull=!!s[27];k.netIdx=clamp(s[28]|0,0,R.N-1);
  if(!n.init){n.init=true;k.x=n.x;k.y=n.y;k.a=n.a;k.idx=k.netIdx;}
}
function remoteUpdate(k){
  if(k.boost>0)k.boost--;if(k.star>0)k.star--;if(k.small>0)k.small--;if(k.ghost>0)k.ghost--;if(k.squish>0)k.squish--;if(k.inv>0)k.inv--;
  if(k.spin>0){k.spin--;k.spinA+=.42;}else k.spinA=0;
  if(k.fall>0)k.fall--;
  const n=k.net;
  k.stale=R.state==='run'&&R.t>150&&(!n||!n.init||performance.now()-n.at>2500);
  if(!n||!n.init)return;
  const age=Math.min(10,(performance.now()-n.at)/(1000/60));
  const tx=n.x+n.vx*age,ty=n.y+n.vy*age,dx=tx-k.x,dy=ty-k.y;
  if(dx*dx+dy*dy>35*35){k.x=tx;k.y=ty;}else{k.x+=dx*.35;k.y+=dy*.35;}
  k.a+=wrapA(n.a-k.a)*.4;
  locate(k,R.T);
  if(k.drift&&k.z<.5&&R.t%3===0){const ca=Math.cos(k.a),sa=Math.sin(k.a);for(const sg of[-1,1])part(k.x-ca*5+(-sa)*sg*4,k.y-sa*5+ca*sg*4,.6,-ca*.2,-sa*.2,.25,16,k.mtFull?'#7fd0ff':'#e8e8f0',k.mtFull?.8:1.2);}
}
function spawnRemoteObj(k,e){
  if(R.objs.some(o=>o.nid===e.nid))return;
  if(!['oil','spark','homing','comet'].includes(e.type))return;
  const o={type:e.type,x:+e.x||0,y:+e.y||0,a:+e.a||0,v:+e.v||0,z:+e.z||0,vz:+e.vz||0,fly:!!e.fly,idx:clamp(e.idx|0,0,R.N-1),lat:0,life:clamp(e.life|0,1,4000),owner:k,grace:clamp(e.grace|0,0,4000),bounce:0,
    target:e.tgt>=0?(R.karts[e.tgt]||null):null,straight:!!e.straight,nid:String(e.nid)};
  if(o.type==='comet')o.hits=new Set([k]);
  locate(o,R.T);R.objs.push(o);
  if(o.type==='comet')SFX.comet();
}
function netIn(m){
  if(!R||R.cfg.mode!=='duel'||!m)return;
  const k=R.karts[m.slot];if(!k||!k.remote)return;
  if(m.t==='st'){applyState(k,m.s);return;}
  const e=m.e;if(m.t!=='ev'||!e)return;
  switch(e.k){
    case 'obj':spawnRemoteObj(k,e);break;
    case 'kill':for(const o of R.objs)if(o.nid===e.nid)o.dead=true;break;
    case 'bolt':R.flash=14;SFX.bolt();for(const o of R.karts)if(o!==k)boltHit(o);if(R.player&&R.player.small>0)SFX.shrink();break;
    case 'steal':{const me=R.player;if(me&&R.net&&e.to===R.net.slot&&me.item&&!me.roul){netEv({k:'give',to:m.slot,item:me.item,n:me.itemN});me.item=null;me.itemN=0;}break;}
    case 'give':{const me=R.player;if(me&&R.net&&e.to===R.net.slot&&!me.item&&ITEM_CODES.includes(e.item)){me.item=e.item;me.itemN=e.item==='turbo3'?clamp(e.n|0,1,3):0;SFX.get();}break;}
  }
}

// ---------- KI
function aiInput(k){
  const T=R.T,N=T.N,P=T.pts,ai=k.ai;
  const pl=R.player;
  k.aiTop=R.ccm.ai*ai.pers*(pl&&!pl.finished&&!k.finished?1+clamp((prog(pl)-prog(k))/N*.2,-.06,.07):1);
  if(--ai.laneT<=0){ai.lane=(Math.random()*2-1)*RH*.5;ai.laneT=80+Math.random()*180;}
  const look=5+Math.floor(Math.max(0,k.speed)*4);
  const ahead=T.turn[(k.idx+Math.floor(look*.6))%N];
  let lane=ai.lane*.7+Math.sign(ahead)*RH*.32*clamp(Math.abs(ahead),0,1);
  {const ca=Math.cos(k.a),sa=Math.sin(k.a);for(const o of R.karts){if(o===k||o.fall>0)continue;const dx=o.x-k.x,dy=o.y-k.y,fwd=dx*ca+dy*sa;if(fwd>0&&fwd<18){const side=-dx*sa+dy*ca;if(Math.abs(side)<7.5)lane+=side>0?-10:10;}}}
  for(const o of R.objs){if(o.type!=='oil'||o.owner===k&&o.grace>0)continue;const di=(o.idx-k.idx+N)%N;if(di>0&&di<18&&Math.abs(o.lat-lane)<9)lane=o.lat>0?o.lat-13:o.lat+13;}
  lane=clamp(lane,-RH+3,RH-3);
  const p=P[(k.idx+look)%N],tx=p.x+p.nx*lane,ty=p.y+p.ny*lane;
  const diff=wrapA(Math.atan2(ty-k.y,tx-k.x)-k.a);
  const steer=clamp(diff*2.4,-1,1);
  const cv=Math.abs(T.turn[(k.idx+6)%N]);
  const cornerTop=Math.min(k.ph.top*R.ccm.mul*k.aiTop*(k.boost>0?k.bMul:1),k.ph.turn*64*(T.th.grip<1?.85:1)/Math.max(.1,cv));
  const gas=k.speed<cornerTop+.05,brake=k.speed>cornerTop+.4;
  if(cv>.9&&k.z===0&&k.spin<=0&&Math.random()<.004*R.ccm.items+.002)startBoost(k,24,1.15,2);
  let item=false;
  if(k.orbit){if(--ai.itemT<=0){ai.itemT=(70+Math.random()*120)/R.ccm.items;item=true;}}
  else if(k.item&&!k.roul){
    if(ai.itemT>0)ai.itemT--;
    else{const it=k.item,me=prog(k);
      if(it==='oil')item=R.karts.some(o=>o!==k&&me-prog(o)>0&&me-prog(o)<14)||Math.random()<.004;
      else if(it==='spark')item=R.karts.some(o=>{if(o===k)return false;const dx=o.x-k.x,dy=o.y-k.y,d=Math.hypot(dx,dy);return d<110&&Math.abs(wrapA(Math.atan2(dy,dx)-k.a))<.16;})||Math.random()<.003;
      else if(it==='turbo'||it==='turbo3'||it==='star')item=Math.abs(T.turn[(k.idx+8)%N])<.5;
      else item=true;
      if(item&&(it==='turbo3')&&k.itemN>1)ai.itemT=40;}
  }
  return{gas,brake,steer,hop:false,item,aimF:false,aimB:false};
}

// ---------- Ablauf
function tickRace(){
  if(!R)return;
  const pin=R.player&&!R.player.finished?playerInput():null;
  if(R.state==='intro'){
    R.cd--;
    if(R.cfg.mode!=='attract'){
      if(R.cd===150||R.cd===100||R.cd===50)SFX.beep();
      if(R.player){const g=pin&&(pin.manualGas||(pin.autoGas&&pin.hop));if(g&&!R.player.prevGas)R.player.gasAt=R.cd;if(!g)R.player.gasAt=-1;R.player.prevGas=g;}
    }
    if(R.cd<=0){R.state='run';R.t=0;
      if(R.cfg.mode!=='attract')SFX.go();
      for(const k of R.karts){
        if(k.human){if(k.gasAt>=12&&k.gasAt<=42){startBoost(k,60,1.3,1);say('Raketenstart!',60,'gold');}else if(k.gasAt>60){k.stall=50;say('Abgewürgt',50,'warn');}}
        else if(!k.remote&&Math.random()<{50:.15,100:.3,150:.5}[R.cfg.cc])startBoost(k,50,1.25,1);
      }}
    return;
  }
  R.t++;
  for(const k of R.karts){
    if(k.remote){remoteUpdate(k);continue;}
    const inp=(k.human&&!k.finished&&!DBG.auto)?pin:aiInput(k);
    kartUpdate(k,inp);
    if(k.fall<=0)lapCheck(k);
  }
  collideKarts();updateObjs();pickups();updateParts();updatePlaces();
  if(R.flash>0)R.flash--;
  if(R.net)netTick();
  if(R.state==='post'){R.postT++;if(R.postT===200){if(HK.onPost)HK.onPost();else showResults();if(!R)return;}}
  if(R.cfg.mode==='attract'){
    if(--R.camSwitch<=0){R.camSwitch=540;const opts=R.karts.filter(k=>!k.finished);cam.tgt=opts[(Math.random()*opts.length)|0]||R.karts[0];}
    if(R.karts.every(k=>k.finished)||R.t>60*170)startAttract();
  }
  const pl=R.player;
  if(pl&&!pl.finished&&R.state==='run'){if(pl.wrongT===90)say('Falsche Richtung!',80,'warn');}
}
function playerFinished(k){
  R.state='post';R.postT=0;
  if(HK.onFinish){say(R.cfg.mode==='duel'?k.place+'. Platz!':'Ziel!',150,'gold');SFX.finish();MUS.stop();HK.onFinish(k);return;}
  say(R.cfg.mode==='tt'?'Ziel!':k.place+'. Platz!',150,'gold');SFX.finish();MUS.stop();
  if(R.cfg.mode==='tt'){const id=R.T.def.id,rec=store.records[id]||{};const best=Math.min(...k.lapTimes);R.newRec={total:!rec.total||k.ftime<rec.total,lap:!rec.lap||best<rec.lap};if(R.newRec.total)rec.total=k.ftime;if(R.newRec.lap)rec.lap=best;store.records[id]=rec;save();}
}

// ====================================================================
// Darstellung: Mode 7, Panorama, Sprites
// ====================================================================
const ROWS={};
function rowsFor(gs){let r=ROWS[gs];if(!r){const n=(H-HOR)*gs,d=new Float32Array(n),f=new Float32Array(n);for(let y=0;y<n;y++){const dd=CAMH*F/((y+.5)/gs);d[y]=dd;f[y]=clamp((dd-170)/650,0,.85);}r=ROWS[gs]={d,f};}return r;}
function makeView(canvas,gs){gs=gs||GS;if(canvas.width!==W*gs){canvas.width=W*gs;canvas.height=H*gs;}const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;const im=c.createImageData(W*gs,(H-HOR)*gs);return{gs,canvas,ctx:c,gimg:im,gbuf:new Uint32Array(im.data.buffer),V:{x:0,y:0,a:0,fx:1,fy:0,rx:0,ry:1,dist:CAMD},cam:{x:0,y:0,a:0,tgt:null}};}
const mainCanvas=$('#game'),mainView=mainCanvas?makeView(mainCanvas):null;
if(mainView)cam=mainView.cam;
let ctx=mainView?mainView.ctx:null,gimg=mainView?mainView.gimg:null,gbuf=mainView?mainView.gbuf:null;
let vgs=GS,rowD=rowsFor(GS).d,rowFog=rowsFor(GS).f;
let V=mainView?mainView.V:{x:0,y:0,a:0,fx:1,fy:0,rx:0,ry:1,dist:CAMD};
const tintCv=mk(SPR,SPR),tintG=tintCv.getContext('2d');
function setView(){
  const k=cam.tgt;if(!k)return;
  let target=k.a+(k.drift?k.drift*.1:0);
  if(k.fall>70)target=cam.a;
  cam.a+=wrapA(target-cam.a)*(k.spin>0?.04:.22);
  let a=cam.a,dist=CAMD;
  if(R.state==='intro'&&R.cfg.mode!=='attract'&&R.cd>150){const t=Math.min(1,(R.cd-150)/90),e=t*t*(3-2*t);a=cam.a+Math.PI*e;dist=CAMD+26*e;}
  V.a=a;V.fx=Math.cos(a);V.fy=Math.sin(a);V.rx=-V.fy;V.ry=V.fx;V.x=k.x-V.fx*dist;V.y=k.y-V.fy*dist;
}
function drawGround(T){
  const tex=T.tex,ot=T.outTile,{fx,fy,rx,ry}=V,hz=hex(T.th.haze),hr=hz[0],hg=hz[1],hb=hz[2];let o=0;
  const x0=.5/vgs-CX,GHv=(H-HOR)*vgs,W2v=W*vgs;
  for(let y=0;y<GHv;y++){
    const d=rowD[y],st=d/F,f=rowFog[y];let wx=(V.x+fx*d+rx*st*x0)*TS,wy=(V.y+fy*d+ry*st*x0)*TS;const sx=rx*st/vgs*TS,sy=ry*st/vgs*TS;
    for(let x=0;x<W2v;x++){
      const ix=wx|0,iy=wy|0;
      let c=(wx>=0&&wy>=0&&ix<TMAP&&iy<TMAP)?tex[(iy<<11)|ix]:ot[((iy&127)<<7)|(ix&127)];
      if(f>0){const r=c&255,g=(c>>8)&255,b=(c>>16)&255;c=(0xff000000|((b+(hb-b)*f)<<16)|((g+(hg-g)*f)<<8)|(r+(hr-r)*f))>>>0;}
      gbuf[o++]=c;wx+=sx;wy+=sy;
    }
  }
  ctx.putImageData(gimg,0,HOR*vgs);
}
function drawSky(T){const off=Math.floor((((V.a/TAU*PW)%PW)+PW)%PW),w1=Math.min(W,PW-off);ctx.drawImage(T.pano,off,0,w1,HOR,0,0,w1,HOR);if(w1<W)ctx.drawImage(T.pano,0,0,W-w1,HOR,w1,0,W-w1,HOR);}
const DL=[];
function addS(x,y,type,o,extra){const dx=x-V.x,dy=y-V.y,z=dx*V.fx+dy*V.fy;if(z<(type===0?4:type===7?6:13)||z>820)return;const xr=dx*V.rx+dy*V.ry,s=F/z,sx=CX+xr*s;if(sx<-90||sx>W+90)return;DL.push({z,sx,gy:HOR+CAMH*s,s,type,o,extra});}
function drawSprites(T){
  DL.length=0;
  for(const sc of T.scen)addS(sc.x,sc.y,0,sc);
  for(const c of R.crys)if(c.t<=0)addS(c.x,c.y,1,c);
  for(const c of R.coins)if(c.on)addS(c.x,c.y,2,c);
  for(const o of R.objs)addS(o.x,o.y,3,o);
  for(const k of R.karts){if(k.fall>0&&k.fall<=70&&k.z>20)continue;addS(k.x,k.y,4,k);
    if(k.trail){const[tx,ty]=trailPos(k);addS(tx,ty,5,k,k.trail);}
    if(k.orbit)for(let i=0;i<k.orbit.n;i++){const[ox,oy]=orbitPos(k,i);addS(ox,oy,6,k,k.orbit.type);}}
  for(const p of R.parts)addS(p.x,p.y,7,p);
  DL.sort((a,b)=>b.z-a.z);
  for(const e of DL){
    const s=e.s;
    switch(e.type){
      case 0:{const sp=SC[e.o.k],h=sp.h*s,w=h*sp.cv.width/sp.cv.height;ctx.drawImage(sp.cv,Math.round(e.sx-w/2),Math.round(e.gy-h),Math.max(1,Math.round(w)),Math.max(1,Math.round(h)));if(sp.glow&&s>.6){ctx.fillStyle='rgba(255,226,140,.18)';ctx.beginPath();ctx.ellipse(e.sx,e.gy,7*s,2.4*s,0,0,TAU);ctx.fill();}break;}
      case 1:{const fr=CRYS[((R.t>>2)+e.o.ph)&7],h=8*s,w=h*16/18,lift=(3+Math.sin(R.t*.08+e.o.ph))*s;shadow(e,2.6);ctx.drawImage(fr,Math.round(e.sx-w/2),Math.round(e.gy-h-lift),Math.max(1,Math.round(w)),Math.max(1,Math.round(h)));break;}
      case 2:{const fr=COIN[(R.t>>2)&7],h=4*s;ctx.drawImage(fr,Math.round(e.sx-h/2),Math.round(e.gy-h-1.5*s),Math.max(1,Math.round(h)),Math.max(1,Math.round(h)));break;}
      case 3:drawObj(e);break;
      case 4:drawKart(e);break;
      case 5:{const h=3.8*s;if(e.extra==='oil'){ctx.drawImage(SPR_OIL,Math.round(e.sx-h),Math.round(e.gy-h*.5),Math.round(h*2),Math.max(1,Math.round(h*.8)));}else{const sp=(e.extra==='homing'?SPR_HOMING:SPR_SPARK)[(R.t>>3)&1];ctx.drawImage(sp,Math.round(e.sx-h/2),Math.round(e.gy-h-s),Math.round(h),Math.round(h));}break;}
      case 6:{const h=3.4*s,sp=(e.extra==='homing'?SPR_HOMING:SPR_SPARK)[(R.t>>3)&1];ctx.drawImage(sp,Math.round(e.sx-h/2),Math.round(e.gy-h-2.5*s),Math.max(1,Math.round(h)),Math.max(1,Math.round(h)));break;}
      case 7:{const p=e.o,sz=Math.max(1,Math.round(p.sz*s));ctx.globalAlpha=p.coin?1:clamp(p.life/p.max*1.4,0,1);ctx.fillStyle=p.col;ctx.fillRect(Math.round(e.sx-sz/2),Math.round(e.gy-p.z*s-sz),sz,sz);ctx.globalAlpha=1;break;}
    }
  }
}
function shadow(e,r){ctx.fillStyle='rgba(10,8,20,.32)';ctx.beginPath();ctx.ellipse(e.sx,e.gy,r*e.s,r*.36*e.s,0,0,TAU);ctx.fill();}
function drawObj(e){
  const o=e.o,s=e.s;
  if(o.type==='oil'){const w=10*s,h=Math.max(1,w*.38);ctx.drawImage(SPR_OIL,Math.round(e.sx-w/2),Math.round(e.gy-h/2-o.z*s),Math.round(w),Math.round(h));return;}
  shadow(e,2.2);
  const sp=o.type==='spark'?SPR_SPARK:o.type==='homing'?SPR_HOMING:SPR_COMET,h=(o.type==='comet'?7:5)*s;
  ctx.drawImage(sp[(R.t>>2)&1],Math.round(e.sx-h/2),Math.round(e.gy-h-(o.z+1.5)*s),Math.max(1,Math.round(h)),Math.max(1,Math.round(h)));
}
function drawKart(e){
  const k=e.o,s=e.s;let sc=k.small>0?.55:1;
  if(k.small>0&&k.small<40&&(k.small>>2)&1)sc=.8;
  let alpha=1;
  if(k.ghost>0)alpha=k===cam.tgt?.45:(R.t&4?.18:.08);
  if(k.inv>0&&k.spin<=0&&k.squish<=0&&(R.t&2))alpha*=.5;
  if(k.stale)alpha*=.45;
  if(k.fall>70){sc*=Math.max(0,1-(k.fallMax-k.fall)/30);if(sc<=.02)return;}
  ctx.globalAlpha=alpha;
  if(k.fall<=0||k.fall>70){ctx.fillStyle='rgba(10,8,20,.35)';ctx.beginPath();ctx.ellipse(e.sx,e.gy,4.8*s*sc,1.7*s*sc,0,0,TAU);ctx.fill();}
  const rel=k.a+k.visYaw+k.spinA-Math.atan2(k.y-V.y,k.x-V.x);
  const idx=((Math.round(rel/TAU*ANG)%ANG)+ANG)%ANG;
  let spr=KSPR[k.ci][idx];
  const size=SPR_WORLD*s*sc,hs=size*(k.squish>0?.45:1);
  const dx=Math.round(e.sx-size/2),dy=Math.round(e.gy-SPR_OY/SPR*hs-k.z*s+(k.fall>70?(k.fallMax-k.fall)*.1*s:0));
  // Boost-Flamme hinter dem Kart
  const dlt=k.a-Math.atan2(k.y-V.y,k.x-V.x);
  if(k.boost>0&&Math.cos(dlt)>-.2){const fl=FLAME[k.bKind===2?1:0][(R.t>>1)&1],fs=5*s*sc,fx=e.sx-Math.sin(dlt)*4.6*s*sc,fy=e.gy-2.8*s*sc-k.z*s+Math.cos(dlt)*1.2*s;ctx.drawImage(fl,Math.round(fx-fs/2),Math.round(fy),Math.round(fs),Math.round(fs));}
  if(k.star>0){tintG.globalCompositeOperation='source-over';tintG.clearRect(0,0,SPR,SPR);tintG.drawImage(spr,0,0);tintG.globalCompositeOperation='source-atop';tintG.globalAlpha=.5;tintG.fillStyle=hsl((R.t*24)%360,100,60);tintG.fillRect(0,0,SPR,SPR);tintG.globalAlpha=1;spr=tintCv;}
  ctx.drawImage(spr,dx,dy,Math.max(1,Math.round(size)),Math.max(1,Math.round(hs)));
  ctx.globalAlpha=1;
  if(k.name&&R.cfg.tags&&k!==cam.tgt&&s>.3&&k.ghost<=0&&!(k.fall>0)){ctx.font='700 7px Silkscreen,monospace';ctx.textAlign='center';ctx.textBaseline='alphabetic';const tw=Math.ceil(ctx.measureText(k.name).width)+6,ty=Math.round(dy+hs*.12);ctx.fillStyle='rgba(20,16,34,.82)';ctx.fillRect(Math.round(e.sx-tw/2),ty-9,tw,10);ctx.fillStyle='#ffd23f';ctx.fillText(k.name,Math.round(e.sx),ty-1);}
  if(k.fall>0&&k.fall<=70){const ds=8*s,dyy=dy-ds*1.1;ctx.drawImage(SPR_DRONE,Math.round(e.sx-ds),Math.round(dyy),Math.round(ds*2),Math.round(ds*.8));ctx.fillStyle='#3b3f52';ctx.fillRect(Math.round(e.sx),Math.round(dyy+ds*.7),1,Math.max(1,Math.round(dy-dyy)));}
}
function drawLights(){
  if(R.cfg.mode==='attract')return;
  if(R.state!=='intro')return;const cd=R.cd;if(cd>175)return;
  const x=W/2-21,y=6;ctx.fillStyle='#141022';ctx.fillRect(x-2,y-2,46,18);ctx.fillStyle='#2a2f45';ctx.fillRect(x,y,42,14);
  const lit=cd<=150?(cd<=100?(cd<=50?3:2):1):0;
  for(let i=0;i<3;i++){const cx=x+7+i*14,cy=y+7;ctx.fillStyle=i<lit?'#ff3b4e':'#4a1520';for(let dy=-5;dy<=5;dy++){const w=Math.round(Math.sqrt(25-dy*dy));ctx.fillRect(cx-w,cy+dy,w*2,1);}if(i<lit){ctx.fillStyle='#ffd0d6';ctx.fillRect(cx-2,cy-3,2,2);}}
}
function drawGo(){if(R.state!=='run'||R.t>50||R.cfg.mode==='attract')return;const x=W/2-21,y=6;ctx.fillStyle='#141022';ctx.fillRect(x-2,y-2,46,18);ctx.fillStyle='#2a2f45';ctx.fillRect(x,y,42,14);for(let i=0;i<3;i++){const cx=x+7+i*14,cy=y+7;ctx.fillStyle='#3dff8a';for(let dy=-5;dy<=5;dy++){const w=Math.round(Math.sqrt(25-dy*dy));ctx.fillRect(cx-w,cy+dy,w*2,1);}}}
function drawMini(T){
  if(R.cfg.mode==='attract')return;
  const ox=W-48,oy=H-48;ctx.globalAlpha=.9;ctx.drawImage(T.mini,ox,oy);ctx.globalAlpha=1;
  for(const k of [...R.karts].sort((a,b)=>(a===cam.tgt?1:0)-(b===cam.tgt?1:0))){const[mx,my]=mapXY(T,44,k.x,k.y);if(k===cam.tgt){ctx.fillStyle='#141022';ctx.fillRect(Math.round(ox+mx)-2,Math.round(oy+my)-2,5,5);ctx.fillStyle=(R.t>>3)&1?'#ffffff':'#ffd23f';ctx.fillRect(Math.round(ox+mx)-1,Math.round(oy+my)-1,3,3);}else{ctx.fillStyle=k.c.kart;ctx.fillRect(Math.round(ox+mx)-1,Math.round(oy+my)-1,2,2);}}
  for(const o of R.objs)if(o.type==='comet'){const[mx,my]=mapXY(T,44,o.x,o.y);ctx.fillStyle='#9fc3ff';ctx.fillRect(Math.round(ox+mx)-1,Math.round(oy+my)-1,3,3);}
}
function renderView(view){
  if(!R||!view)return;ctx=view.ctx;gimg=view.gimg;gbuf=view.gbuf;V=view.V;cam=view.cam;if(!cam.tgt)return;
  vgs=view.gs||GS;{const r=rowsFor(vgs);rowD=r.d;rowFog=r.f;}
  const T=R.T;setView();ctx.setTransform(1,0,0,1,0,0);drawGround(T);ctx.setTransform(vgs,0,0,vgs,0,0);ctx.imageSmoothingEnabled=false;drawSky(T);drawSprites(T);drawLights();drawGo();drawMini(T);
  if(R.flash>0){ctx.fillStyle=`rgba(255,255,255,${R.flash/16})`;ctx.fillRect(0,0,W,H);}
}
function render(){renderView(mainView);if(mainView)cam=mainView.cam;}

// ====================================================================
// HUD
// ====================================================================
const hud=$('#hud'),hLap=$('#hLap'),hTime=$('#hTime'),hPos=$('#hPos'),hPosOf=$('#hPosOf'),hCoins=$('#hCoins'),hItemN=$('#hItemN'),hItem=$('#hItem'),hig=hItem?hItem.getContext('2d'):null;
if(hig)hig.imageSmoothingEnabled=false;
const last={};
function setTxt(el,key,v){if(last[key]!==v){last[key]=v;el.textContent=v;}}
function updateHud(){
  if(!hud)return;
  const k=R&&R.player;if(!k||R.cfg.mode==='attract'||screenName!=='race'){hud.hidden=true;return;}
  hud.hidden=false;
  setTxt(hLap,'lap',`${clamp(k.lap,1,R.laps)}/${R.laps}`);
  setTxt(hTime,'time',fmt(k.finished?k.ftime:(R.state==='run'||R.state==='post'?R.t:0)));
  setTxt(hPos,'pos',String(k.place));setTxt(hPosOf,'posof','/'+R.karts.length);
  setTxt(hCoins,'coins','×'+String(k.coins).padStart(2,'0'));
  let icon=null,n='';
  if(k.roul>0)icon=ROLL_LIST[((k.roul>>2)+k.slot)%ROLL_LIST.length];
  else if(k.orbit){icon=k.orbit.type==='spark'?'spark3':'homing3';n='×'+k.orbit.n;}
  else if(k.item){icon=k.item;if(k.item==='turbo3')n='×'+k.itemN;}
  setTxt(hItemN,'itemn',n);
  if(last.icon!==icon){last.icon=icon;hig.clearRect(0,0,16,16);if(icon)hig.drawImage(IC[icon],0,0);}
}
const msgEl=$('#msg');let msgT=0;
function say(t,frames,cls){if(!msgEl)return;msgEl.textContent=t;msgEl.className='msg';void msgEl.offsetWidth;msgEl.className='msg show'+(cls?' '+cls:'');msgT=frames;}
function msgTick(){if(msgEl&&msgT>0&&--msgT===0)msgEl.className='msg fade';}

// ====================================================================
// Menüs
// ====================================================================
const menuEl=$('#menu');
let backAct=null;
const menuOpen=()=>!!menuEl&&!menuEl.hidden;
function setMenu(html,opts={}){
  menuEl.innerHTML=html;menuEl.hidden=false;menuEl.className='menu'+(opts.clear?' clear':'')+(opts.solid?' solid':'');backAct=opts.back||null;
  menuEl.querySelectorAll('[data-act]').forEach(b=>b.addEventListener('click',()=>{AU.init();act(b.dataset.act,b);}));
  const f=menuEl.querySelector(opts.focus||'button');if(f)f.focus({preventScroll:true});
}
function hideMenu(){menuEl.hidden=true;menuEl.innerHTML='';}
function menuMove(dx,dy){
  const bs=[...menuEl.querySelectorAll('button:not([disabled])')];if(!bs.length)return;
  const cur=document.activeElement&&menuEl.contains(document.activeElement)?document.activeElement:null;
  if(!cur){bs[0].focus();return;}
  const r=cur.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;let best=null,bd=1e9;
  for(const b of bs){if(b===cur)continue;const q=b.getBoundingClientRect(),x=q.left+q.width/2-cx,y=q.top+q.height/2-cy;const along=dx?x*dx:y*dy,across=dx?Math.abs(y):Math.abs(x);if(along<=4)continue;const sc=along+across*2.2;if(sc<bd){bd=sc;best=b;}}
  if(best){best.focus();SFX.move();}
}
function menuConfirm(){const a=document.activeElement;if(a&&menuEl.contains(a)&&a.tagName==='BUTTON'){a.click();}}
function menuBack(){if(backAct){SFX.back();backAct();}}
function act(a,b){
  SFX.ok();
  switch(a){
    case 'gp':S.mode='gp';showCC();break;
    case 'single':S.mode='single';showCC();break;
    case 'tt':S.mode='tt';S.cc=150;showChars();break;
    case 'autogas':S.autoGas=!(S.autoGas===true||(S.autoGas===null&&usingTouch));persist();showTitle(true);break;
    case 'music':S.music=!S.music;AU.setMusic(S.music);persist();showTitle(true);break;
    case 'cc':S.cc=+b.dataset.v;persist();showChars();break;
    case 'char':S.char=+b.dataset.v;persist();if(S.mode==='gp')startGP();else showTracks();break;
    case 'track':startSingle(+b.dataset.v);break;
    case 'resume':togglePause();break;
    case 'restart':paused=false;hideMenu();if(R.cfg.mode==='gp')beginGPRace();else beginRace(R.cfg.track);break;
    case 'quit':paused=false;showTitle();break;
    case 'next':gpNext();break;
    case 'retry':GP.flags--;beginGPRace();break;
    case 'cuprestart':startGP();break;
    case 'again':beginRace(R.cfg.track);break;
    case 'tracks':showTracks();break;
    case 'title':showTitle();break;
  }
}
function persist(){store.settings={cc:S.cc,char:S.char,autoGas:S.autoGas,music:S.music,sound:S.sound};save();}
function showTitle(keep){
  screenName='title';GP.active=false;paused=false;$('#btnPause').hidden=true;
  if(!keep||!R||R.cfg.mode!=='attract')startAttract();
  MUS.play(4);
  const ag=S.autoGas===true||(S.autoGas===null&&usingTouch);
  setMenu(`<div class="m-title">
    <div class="logo"><img class="school" src="${SCHOOL_LOGO}" alt="Logo der Karoline-Breitinger-Schule"><span class="l1">KBS-Kart!</span><span class="l2">Super Circuit</span></div>
    <div class="m-list">
      <button class="btn" data-act="gp">Grand Prix<small>4 Rennen · Punkte 9-6-3-1</small></button>
      <button class="btn" data-act="single">Einzelrennen<small>Eine Strecke gegen 7 Gegner</small></button>
      <button class="btn" data-act="tt">Zeitfahren<small>Allein gegen die Uhr · 3× Turbo</small></button>
      <div class="m-row"><button class="btn sm" data-act="autogas">Auto-Gas: ${ag?'an':'aus'}</button><button class="btn sm" data-act="music">Musik: ${S.music?'an':'aus'}</button></div>
    </div></div>`,{clear:true,focus:keep?'[data-act="'+(keep===true?'gp':keep)+'"]':'button'});
}
function showCC(){
  screenName='cc';
  setMenu(`<div class="m-head"><h2>Hubraum</h2><span class="m-sub">${S.mode==='gp'?'Grand Prix':'Einzelrennen'}</span></div>
   <div class="cc-list">
    <button class="btn" data-act="cc" data-v="50"><span class="big">50</span>ccm<small>Gemütliches Tempo. Die Gegner setzen kaum Items ein.</small></button>
    <button class="btn" data-act="cc" data-v="100"><span class="big">100</span>ccm<small>Schneller, und die Gegner werfen öfter.</small></button>
    <button class="btn" data-act="cc" data-v="150"><span class="big">150</span>ccm<small>Volles Tempo. Kometen und Blitze fliegen.</small></button>
   </div><div class="m-foot">Esc: zurück</div>`,{back:showTitle,focus:`[data-v="${S.cc}"]`});
}
function portrait(ci,size){const c=mk(size,size),g=c.getContext('2d');g.imageSmoothingEnabled=false;g.drawImage(KSPR[ci][6],0,0,SPR,SPR,0,0,size,size);return c;}
function showChars(){
  screenName='chars';
  const sub=S.mode==='tt'?'Zeitfahren · 150 ccm':`${CC[S.cc].label} · ${S.mode==='gp'?'Grand Prix':'Einzelrennen'}`;
  setMenu(`<div class="m-head"><h2>Fahrer</h2><span class="m-sub">${sub}</span></div>
   <div class="charwrap"><div class="chargrid">${CHARS.map((c,i)=>`<button class="cbtn" data-act="char" data-v="${i}"><canvas width="80" height="80"></canvas><span>${c.name}</span></button>`).join('')}</div>
   <div class="charinfo" id="cinfo"></div></div>`,{back:()=>S.mode==='tt'?showTitle('tt'):showCC(),focus:`[data-v="${S.char}"]`});
  menuEl.querySelectorAll('.cbtn').forEach(b=>{const i=+b.dataset.v;b.querySelector('canvas').getContext('2d').drawImage(KSPR[i][6],0,0);const show=()=>charInfo(i);b.addEventListener('focus',show);b.addEventListener('mouseenter',show);});
  charInfo(S.char);
}
function charInfo(i){const c=CHARS[i],el=$('#cinfo');if(!el)return;el.innerHTML=`<div class="nm">${c.name}</div><div class="kd">${c.kind} · ${c.cls}gewicht</div>${STAT_LABELS.map(([k,l])=>`<div class="stat"><span>${l}</span><span class="bar">${[1,2,3,4,5].map(n=>`<i class="${n<=c.st[k]?'f':''}"></i>`).join('')}</span></div>`).join('')}`;}
function showTracks(){
  screenName='tracks';
  setMenu(`<div class="m-head"><h2>Strecke</h2><span class="m-sub">${S.mode==='tt'?'Zeitfahren':CC[S.cc].label}</span></div>
   <div class="trackgrid">${TRACKS.map((t,i)=>{const rec=store.records[t.id];return `<button class="tbtn${t.bonus?' bonus':''}" data-act="track" data-v="${i}"><canvas width="64" height="64"></canvas><span><b>${t.name}</b>${t.bonus?'<em>Bonusstrecke · sehr schwer</em>':''}<small>${t.sub}${S.mode==='tt'?`<br>Rekord ${rec&&rec.total?fmt(rec.total):'–'} · Runde ${rec&&rec.lap?fmt(rec.lap):'–'}`:''}</small></span></button>`;}).join('')}</div>`,{back:showChars});
  menuEl.querySelectorAll('.tbtn').forEach(b=>{const i=+b.dataset.v,g=b.querySelector('canvas').getContext('2d');g.drawImage(drawMiniMap(GEOM[i],64,4,TH[TRACKS[i].theme].curbA),0,0);});
}
function showPause(){
  setMenu(`<div class="m-head"><h2>Pause</h2><span class="m-sub">${TRACKS[R.cfg.track].name}</span></div>
   <div class="m-list" style="max-width:50cqw">
   <button class="btn" data-act="resume">Weiterfahren</button>
   <button class="btn" data-act="restart">Neu starten${R.cfg.mode==='gp'?'<small>Kostet keinen Versuch</small>':''}</button>
   <button class="btn" data-act="quit">Zum Hauptmenü</button></div>`,{back:togglePause,solid:true});
}
function togglePause(){
  if(R&&R.cfg.noPause)return;
  if(!R||R.cfg.mode==='attract'||screenName!=='race')return;
  if(menuOpen()&&!paused)return;
  paused=!paused;if(paused){showPause();AU.engine(0,false,false);}else hideMenu();
}
function standings(){const idx=[0,1,2,3,4,5,6,7];return idx.sort((a,b)=>GP.pts[b]-GP.pts[a]||(GP.order?GP.order.indexOf(a)-GP.order.indexOf(b):0));}
function raceRows(){
  const est=k=>k.finished?k.ftime:R.t+((R.laps+1)*R.N-prog(k))*STEP/(k.ph.top*R.ccm.mul*.88);
  return R.karts.map(k=>({k,time:est(k),fin:k.finished})).sort((a,b)=>a.time-b.time);
}
function showResults(){
  screenName='result';$('#btnPause').hidden=true;msgEl.className='msg';msgT=0;
  const k=R.player;
  if(R.cfg.mode==='tt'){
    const best=Math.min(...k.lapTimes),rec=store.records[R.T.def.id]||{};
    setMenu(`<div class="m-head"><h2>Zeitfahren</h2><span class="m-sub">${R.T.def.name}</span></div>
      <div class="res-wrap"><table class="res"><tr><th>Runde</th><th class="n">Zeit</th></tr>
      ${k.lapTimes.map((t,i)=>`<tr${t===best?' class="me"':''}><td>Runde ${i+1}</td><td class="n">${fmt(t)}</td></tr>`).join('')}
      <tr><td><b>Gesamt</b></td><td class="n"><b>${fmt(k.ftime)}</b></td></tr></table>
      <p>${R.newRec.total?'Neuer Streckenrekord! ':''}${R.newRec.lap?'Neue Bestrunde! ':''}Rekord ${fmt(rec.total)} · Bestrunde ${fmt(rec.lap)}</p></div>
      <div class="btnrow"><button class="btn go" data-act="again">Nochmal</button><button class="btn" data-act="tracks">Andere Strecke</button><button class="btn" data-act="title">Hauptmenü</button></div>`,{back:showTitle,solid:true});
    return;
  }
  const rows=raceRows();
  if(R.cfg.mode==='gp'){
    GP.last=rows.map(r=>r.k.ci);
    const place=rows.findIndex(r=>r.k===k)+1,ok=place<=4,last=GP.race===3;
    let btns;
    if(ok)btns=`<button class="btn go" data-act="next">${last?'Endwertung':'Nächstes Rennen'}</button>`;
    else if(GP.flags>0)btns=`<button class="btn go" data-act="retry">Neu versuchen<small>Noch ${GP.flags} ${GP.flags===1?'Versuch':'Versuche'}</small></button><button class="btn" data-act="title">Aufgeben</button>`;
    else btns=`<button class="btn go" data-act="cuprestart">Cup neu starten</button><button class="btn" data-act="title">Hauptmenü</button>`;
    setMenu(`<div class="m-head"><h2>Rennen ${GP.race+1}/4</h2><span class="m-sub">${R.T.def.name} · ${CC[R.cfg.cc].label}</span></div>
      <div class="res-wrap"><table class="res"><tr><th>Platz</th><th>Fahrer</th><th class="n">Zeit</th><th class="n">+Pkt</th><th class="n">Gesamt</th></tr>
      ${rows.map((r,i)=>`<tr${r.k.human?' class="me"':''}><td class="pl">${i+1}.</td><td>${r.k.c.name}</td><td class="n">${r.fin?fmt(r.time):'–'}</td><td class="n">${POINTS[i]?'+'+POINTS[i]:''}</td><td class="n">${GP.pts[r.k.ci]+POINTS[i]}</td></tr>`).join('')}</table></div>
      <div class="btnrow">${btns}</div>${ok?'':'<div class="m-foot">Ab Platz 5 gibt es keine Punkte. Das Rennen muss wiederholt werden.</div>'}`,{solid:true});
    return;
  }
  setMenu(`<div class="m-head"><h2>Ergebnis</h2><span class="m-sub">${R.T.def.name} · ${CC[R.cfg.cc].label}</span></div>
    <div class="res-wrap"><table class="res"><tr><th>Platz</th><th>Fahrer</th><th class="n">Zeit</th><th class="n">Bestrunde</th></tr>
    ${rows.map((r,i)=>`<tr${r.k.human?' class="me"':''}><td class="pl">${i+1}.</td><td>${r.k.c.name}</td><td class="n">${r.fin?fmt(r.time):'–'}</td><td class="n">${r.k.lapTimes.length?fmt(Math.min(...r.k.lapTimes)):'–'}</td></tr>`).join('')}</table></div>
    <div class="btnrow"><button class="btn go" data-act="again">Nochmal</button><button class="btn" data-act="tracks">Andere Strecke</button><button class="btn" data-act="title">Hauptmenü</button></div>`,{back:showTitle,solid:true});
}
function gpNext(){
  GP.last.forEach((ci,i)=>GP.pts[ci]+=POINTS[i]);GP.order=GP.last.slice();
  if(GP.race>=3){showGPEnd();return;}
  GP.race++;beginGPRace();
}
// ---------- Siegertreppchen mit Pokal (nur bei Gesamtsieg)
const TROPHY=(()=>{
  const gold=r=>r<-.62?'#ffe680':r<-.3?'#fff6c2':r>.5?'#c98a10':r>.18?'#f2b01e':'#ffcc33';
  const one=['.#.','##.','.#.','.#.','###'];
  return outline(pix(40,46,(x,y)=>{
    const dx=x+.5-20;
    if(y>=1&&y<=2)return Math.abs(dx)<=12.5?(y===1?'#fff6c2':'#ffcc33'):null;
    if(y>=3&&y<=21){const hw=12.5*Math.sqrt(Math.max(0,1-((y-2)/20)**2));
      if(Math.abs(dx)<=hw){const ex=Math.floor(dx+1.5),ey=y-7;if(ey>=0&&ey<5&&ex>=0&&ex<3&&one[ey][ex]==='#')return '#b8740c';return gold(dx/hw);}
      for(const sg of[-1,1]){const d=Math.hypot(dx-sg*13,y-9);if(d<=4.6&&d>=2.4)return sg<0?'#ffe680':'#c98a10';}
      return null;}
    if(y>=22&&y<=29){const hw=(y===25||y===26)?3.6:2.2;return Math.abs(dx)<=hw?gold(dx/hw):null;}
    if(y>=30&&y<=32)return Math.abs(dx)<=7.5?(y===30?'#fff6c2':gold(dx/7.5)):null;
    if(y>=33&&y<=44){if(Math.abs(dx)>10.5)return null;if(y>=36&&y<=40&&Math.abs(dx)<=6)return y===36?'#fff3a0':'#e5a514';return dx<-8?'#8b5e3a':dx>8?'#4a2e18':'#6b4426';}
    return null;}),'#3a2200');
})();
const SPR_BOUNDS=new WeakMap();
function sprBounds(c){let b=SPR_BOUNDS.get(c);if(b)return b;const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let x0=1e9,x1=-1,y0=1e9,y1=-1;
  for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(d[(y*c.width+x)*4+3]>0){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}
  b={x0,x1,y0,y1};SPR_BOUNDS.set(c,b);return b;}
const DIG={1:['.#.','##.','.#.','.#.','###'],2:['###','..#','###','#..','###'],3:['###','..#','.##','..#','###']};
function podiumScene(cv,top3){
  const g=cv.getContext('2d'),Wd=cv.width,Hd=cv.height,GR=128;g.imageSmoothingEnabled=false;
  const steps=[{p:2,x:6,w:58,top:96,c:['#eef1f7','#c7ccd6','#9aa1b2','#5b6274']},{p:1,x:64,w:104,top:82,c:['#ffe58a','#ffc233','#d99a1a','#7a4a10']},{p:3,x:168,w:58,top:106,c:['#f0b27a','#cf7f45','#a35a2a','#6b3418']}];
  const drv=[{ci:top3[1],st:steps[0],cx:35,ang:7},{ci:top3[0],st:steps[1],cx:92,ang:8,hop:true},{ci:top3[2],st:steps[2],cx:197,ang:9}];
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches,rnd=mulberry(7);
  const conf=Array.from({length:46},()=>({x:rnd()*Wd,y:rnd()*(Hd+10),v:14+rnd()*20,ph:rnd()*TAU,c:['#ffb238','#ff4d6a','#4fe0b5','#5ec8ff','#ffffff','#ffd23f'][(rnd()*6)|0]}));
  const tx=122,ty=steps[1].top+3-45;
  function draw(t){
    g.clearRect(0,0,Wd,Hd);
    const gr=g.createRadialGradient(110,34,4,110,60,125);gr.addColorStop(0,'rgba(255,214,130,.32)');gr.addColorStop(1,'rgba(255,214,130,0)');g.fillStyle=gr;g.fillRect(0,0,Wd,Hd);
    g.fillStyle='rgba(10,8,24,.55)';g.fillRect(0,GR,Wd,Hd-GR);
    for(const s of steps){const[tc,fc,sh,ink]=s.c,fh=GR-s.top-5;
      g.fillStyle='#141022';g.fillRect(s.x-1,s.top-1,s.w+2,GR-s.top+1);
      g.fillStyle=fc;g.fillRect(s.x,s.top+5,s.w,fh);g.fillStyle=tc;g.fillRect(s.x,s.top,s.w,5);
      g.fillStyle=sh;g.fillRect(s.x+s.w-3,s.top+5,3,fh);g.fillStyle='rgba(255,255,255,.4)';g.fillRect(s.x,s.top+5,1,fh);g.fillStyle='rgba(0,0,0,.2)';g.fillRect(s.x,s.top+5,s.w,1);
      const dg=DIG[s.p],sc=3,ox=Math.round(s.x+s.w/2-4.5),oy=Math.round(s.top+5+(fh-15)/2);g.fillStyle=ink;
      dg.forEach((row,ry)=>[...row].forEach((ch,rx)=>{if(ch==='#')g.fillRect(ox+rx*sc,oy+ry*sc,sc,sc);}));}
    g.fillStyle='rgba(20,16,34,.35)';g.fillRect(tx+9,steps[1].top+2,22,2);
    g.drawImage(TROPHY,tx,ty);
    [[tx+11,ty+6,0],[tx+28,ty+15,2.1],[tx+21,ty+2,4.2],[tx+16,ty+30,1.3]].forEach(([x,y,ph])=>{const a=reduce?.8:Math.sin(t*4+ph);if(a<.25)return;g.fillStyle='#ffffff';g.fillRect(x,y,1,1);const L=a>.75?2:1;g.fillStyle='#fff6c2';g.fillRect(x-L,y,L,1);g.fillRect(x+1,y,L,1);g.fillRect(x,y-L,1,L);g.fillRect(x,y+1,1,L);});
    for(const d of drv){if(d.ci==null)continue;const spr=KSPR[d.ci][d.ang],b=sprBounds(spr),base=d.st.top+3;
      let hop=0;if(d.hop&&!reduce){const ph=t%1.6;if(ph<.36)hop=-Math.round(Math.sin(Math.PI*ph/.36)*6);}
      g.fillStyle='rgba(20,16,34,.35)';g.beginPath();g.ellipse(d.cx,base,18+hop*.5,2.5,0,0,TAU);g.fill();
      g.drawImage(spr,Math.round(d.cx-(b.x0+b.x1)/2),base-b.y1+hop);}
    for(const c of conf){const y=((c.y+c.v*t)%(Hd+10))-10,x=Math.round(c.x+Math.sin(t*2+c.ph)*3);g.fillStyle=c.c;if(Math.sin(t*6+c.ph)>0)g.fillRect(x,Math.round(y),2,1);else g.fillRect(x,Math.round(y),1,2);}
  }
  const t0=performance.now();
  function loop(now){if(!cv.isConnected)return;draw((now-t0)/1000);requestAnimationFrame(loop);}
  if(reduce)draw(0);else requestAnimationFrame(loop);
}
function showGPEnd(){
  screenName='gpend';MUS.play(4);msgEl.className='msg';msgT=0;
  const st=standings(),me=st.indexOf(S.char)+1,p=GP.pts[S.char];
  const letter=p>=36?'A':p>=30?'B':p>=25?'C':p>=20?'D':'E';
  const cup=me===1?'Gold-Pokal':me===2?'Silber-Pokal':me===3?'Bronze-Pokal':'Kein Pokal';
  setMenu(`<div class="m-head"><h2>Endwertung</h2><span class="m-sub">${CC[S.cc].label}</span></div>
    <div class="endgrid">${me===1?`<div class="podcol"><canvas class="podium" id="podium" width="232" height="132" role="img" aria-label="${CHARS[S.char].name} auf dem Siegertreppchen neben dem Gold-Pokal"></canvas><div class="rankrow"><span class="rank">${letter}</span><span>Rang ${letter} · ${cup}<br>${p} von 36 Punkten</span></div></div>`:`<div><div class="rank">${letter}</div><p>Rang ${letter}<br>${cup}<br>${p} von 36 Punkten</p></div>`}
    <div class="res-wrap"><table class="res"><tr><th>Platz</th><th>Fahrer</th><th class="n">Punkte</th></tr>
    ${st.map((ci,i)=>`<tr${ci===S.char?' class="me"':''}><td class="pl">${i+1}.</td><td>${CHARS[ci].name}</td><td class="n">${GP.pts[ci]}</td></tr>`).join('')}</table></div></div>
    <div class="btnrow"><button class="btn go" data-act="cuprestart">Nochmal fahren</button><button class="btn" data-act="title">Hauptmenü</button></div>`,{back:showTitle,solid:true});
  if(me===1){const c=$('#podium');if(c)podiumScene(c,st.slice(0,3));SFX.finish();}
}
function others(){return [0,1,2,3,4,5,6,7].filter(i=>i!==S.char).sort(()=>Math.random()-.5);}
function startGP(){GP.active=true;GP.race=0;GP.flags=3;GP.pts=[0,0,0,0,0,0,0,0];GP.order=null;GP.grid=others().concat([S.char]);beginGPRace();}
function beginGPRace(){const grid=GP.order?GP.order.slice():GP.grid;startRaceCfg({mode:'gp',track:GP.race,cc:S.cc,grid,player:S.char});}
function startSingle(t){beginRace(t);}
function beginRace(t){
  if(S.mode==='tt')startRaceCfg({mode:'tt',track:t,cc:150,grid:[S.char],player:S.char});
  else startRaceCfg({mode:'single',track:t,cc:S.cc,grid:others().concat([S.char]),player:S.char});
}
function startRaceCfg(cfg){
  R=newRace(cfg);cam.tgt=R.player;cam.a=R.player.a;screenName='race';paused=false;hideMenu();
  {const bp=$('#btnPause');if(bp)bp.hidden=false;}MUS.play(R.T.th.song);MUS.rate=1;
  say(cfg.mode==='gp'?`Rennen ${GP.race+1} · ${R.T.def.name}`:R.T.def.name,110);
}
function startAttract(){
  const t=(Math.random()*TRACKS.length)|0;
  R=newRace({mode:'attract',track:t,cc:150,grid:[0,1,2,3,4,5,6,7].sort(()=>Math.random()-.5),player:-1});
  cam.tgt=R.karts[(Math.random()*8)|0];cam.a=cam.tgt.a;R.camSwitch=540;
}

// ====================================================================
// Hauptschleife
// ====================================================================
let acc=0,lastT=performance.now();
function tick(){
  pollPad();
  if(R&&!paused){
    if(screenName==='race'||screenName==='result'||R.cfg.mode==='attract'||screenName==='gpend'||R.cfg.alwaysTick)tickRace();
  }
  MUS.update();
  const k=R&&(R.player||(R.cfg.mode==='duel'&&!R.player?R.karts.reduce((a,b)=>b.speed>a.speed?b:a):null));
  AU.engine(k?k.speed:0,k&&k.boost>0,!!(k&&!paused&&screenName==='race'&&AU.on));
  updateHud();msgTick();
  if(HK.tick)HK.tick();
}
function frame(now){
  requestAnimationFrame(frame);
  let dt=now-lastT;lastT=now;if(dt>250)dt=250;acc+=dt;let n=0;
  while(acc>=1000/60&&n<6){tick();acc-=1000/60;n++;}
  if(HK.render)HK.render();else render();
}

// ---------- Ereignisse
function onEl(sel,ev,fn){const el=$(sel);if(el)el.addEventListener(ev,fn);}
addEventListener('keydown',e=>{
  const tg=e.target;if(tg&&(tg.tagName==='INPUT'||tg.tagName==='TEXTAREA'||tg.tagName==='SELECT'||tg.isContentEditable))return;
  AU.init();
  if(menuOpen()){
    const map={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]};
    if(map[e.code]){e.preventDefault();menuMove(...map[e.code]);return;}
    if(e.code==='Enter'||e.code==='Space'||e.code==='KeyX'){e.preventDefault();menuConfirm();return;}
    if(e.code==='Escape'||e.code==='Backspace'||e.code==='KeyZ'){e.preventDefault();if(paused&&screenName==='race')togglePause();else menuBack();return;}
  }
  if(GAME_KEYS.has(e.code)){e.preventDefault();keys.add(e.code);}
  if(e.code==='Escape'||e.code==='KeyP'||e.code==='Enter'){e.preventDefault();togglePause();}
});
addEventListener('keyup',e=>{keys.delete(e.code);});
addEventListener('blur',()=>{keys.clear();if(screenName==='race'&&!paused)togglePause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&screenName==='race'&&!paused)togglePause();});
onEl('#btnPause','click',()=>{AU.init();togglePause();});
onEl('#btnSound','click',e=>{AU.init();S.sound=!S.sound;AU.setOn(S.sound);e.currentTarget.textContent='Ton: '+(S.sound?'an':'aus');e.currentTarget.setAttribute('aria-pressed',String(S.sound));persist();});
onEl('#btnFull','click',()=>{const el=$('#console');try{if(document.fullscreenElement)document.exitFullscreen();else{const p=el.requestFullscreen&&el.requestFullscreen();if(p&&p.catch)p.catch(()=>{});}}catch(e){}});
function enableTouch(){if(usingTouch)return;usingTouch=true;const c=$('#console');if(c)c.classList.add('touch');for(const id of['#padL','#padR']){const p=$(id);if(p)p.hidden=false;}if(screenName==='title'&&MODE==='single')showTitle('gp');}
addEventListener('touchstart',()=>enableTouch(),{passive:true,once:true});
if(matchMedia('(pointer:coarse)').matches&&!matchMedia('(pointer:fine)').matches)enableTouch();
document.querySelectorAll('.pbtn').forEach(b=>{
  const k=b.dataset.k;
  const on=e=>{e.preventDefault();AU.init();touch[k]=true;b.classList.add('active');try{b.setPointerCapture(e.pointerId);}catch(_){}};
  const off=e=>{touch[k]=false;b.classList.remove('active');};
  b.addEventListener('pointerdown',on);b.addEventListener('pointerup',off);b.addEventListener('pointercancel',off);b.addEventListener('lostpointercapture',off);
  b.addEventListener('contextmenu',e=>e.preventDefault());
});
onEl('#stage','pointerdown',()=>AU.init());
{const b=$('#btnSound');if(b)b.textContent='Ton: '+(S.sound?'an':'aus');}AU.on=S.sound;AU.music=S.music;

// ---------- Start
if(MODE==='single'){
  const start=data=>{if(data&&data.settings)Object.assign(S,data.settings);showTitle();requestAnimationFrame(frame);};
  start({});
}else requestAnimationFrame(frame);
function startNet(cfg){
  R=newRace(cfg);paused=false;screenName='race';
  if(mainView&&R.player){mainView.cam.tgt=R.player;mainView.cam.a=R.player.a;cam=mainView.cam;}
  MUS.play(R.T.th.song);MUS.rate=1;return R;
}
window.__pixelpiste={get R(){return R;},keys,act,startRaceCfg,GEOM,trackFull,DBG,tickRace,GP,showGPEnd,prog:k=>prog(k),setScreen:v=>screenName=v};
window.KK={H:HK,CHARS,TRACKS,TH,GEOM,KSPR,SPR,ANG,IC,CC,STAT_LABELS,TROPHY,sprBounds,podiumScene,drawMiniMap,mapXY,fmt,makeView,renderView,newRace,trackFull,startNet,netIn,
  get R(){return R;},set R(v){R=v;},get screen(){return screenName;},setScreen(v){screenName=v;},
  AU,SFX,MUS,S,DBG,keys,touch,playerInput,enableTouch,say,tickRace,prog:k=>prog(k),hsl,mk,pix,outline,get usingTouch(){return usingTouch;}};
})();
