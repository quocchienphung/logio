import fs from 'node:fs/promises';
const dir='docs/research/command-palette/source';
function response(t,k,c){
  if(t<=0)return 0; const h=c/2,d=h*h-k;
  if(Math.abs(d)<.00001)return 1-Math.exp(-h*t)*(1+h*t);
  if(d>0){const a=-h+Math.sqrt(d),b=-h-Math.sqrt(d);return 1-(b*Math.exp(a*t)-a*Math.exp(b*t))/(b-a);}
  const w=Math.sqrt(-d);return 1-Math.exp(-h*t)*(Math.cos(w*t)+h/w*Math.sin(w*t));
}
const result={note:'Least-squares fits of public rendered motion, unit mass. Estimates, not recovered internal constants.'};
for(const name of ['entry','highlight']){
  const frames=JSON.parse(await fs.readFile(`${dir}/${name}-frames.json`));
  const samples=frames.flatMap(f=>{const node=f.nodes.find(n=>n.cls.includes(name==='entry'?'_palette':'_highlight'));const y=node?.style?.match(/translateY\(([-\d.]+)px\)/);if(!y)return [];const value=+y[1];return [{t:f.t,p:name==='entry'?1-value/6:(value-35)/38}];}).filter(p=>p.p>.005&&p.p<.995);
  let best={error:Infinity};
  const start=frames.find(f=>f.nodes.length)?.t||0;
  for(let k=100;k<=600;k+=5)for(let damping=20;damping<=55;damping+=.5)for(let offset=(name==='entry'?start-20:-15);offset<=(name==='entry'?start+20:20);offset+=2){
    const error=samples.reduce((sum,s)=>sum+(response((s.t-offset)/1000,k,damping)-s.p)**2,0)/samples.length;
    if(error<best.error)best={stiffness:k,damping,offset,error};
  }
  result[name]={...best,normalizedRMSE:Math.sqrt(best.error),samples:samples.length};
}
await fs.writeFile(`${dir}/spring-fit.json`,JSON.stringify(result,null,2));console.log(result);
