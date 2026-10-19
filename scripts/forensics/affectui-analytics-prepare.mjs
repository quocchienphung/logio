import fs from 'node:fs/promises';
import { chromium } from 'playwright';
const out='src/components/sites/affectui-analytics';
const research='docs/research/affectui-analytics';
await fs.mkdir(out,{recursive:true});
const css=await fs.readFile(`${research}/styles.css`,'utf8');
const button=await fs.readFile('docs/research/affectui-library/styles/f082d3f7954f.css','utf8');
await fs.writeFile(`${out}/analytics-reference.css`,`/* Public Analytics preview styles, 2026-10-19. Local changes belong in analytics-overrides.css. */\n${css}\n${css.includes('--ui-btn-ink')?'':button}`);
await fs.copyFile(`${research}/icons.json`,`${out}/icons.json`);
const browser=await chromium.launch({channel:'chrome'});
const page=await browser.newPage();
const periods=[];
for(const [days,name] of [[7,'desktop'],[30,'last-30-days'],[90,'last-90-days']]){
  await page.setContent(await fs.readFile(`${research}/${name}.html`,'utf8'));
  const data=await page.evaluate(days=>{
    const numeric=text=>Number(text.replace(/[−–]/g,'-').replace(/[^\d.\-]/g,''))*(/k/.test(text)?1000:1);
    const stats=[...document.querySelectorAll('.ui-as-rev__stat')].map(el=>({
      label:el.querySelector('.ui-as-rev__cap').textContent,
      value:numeric(el.querySelector('strong').childNodes[0].textContent),
      delta:el.querySelector('em').textContent,
      bars:[...el.querySelectorAll('i')].map(i=>i.style.height),
    }));
    const charts=[...document.querySelectorAll('.ui-kpi')].map(el=>{
      const labels=[...el.querySelectorAll('.ui-kpi__yaxis span')].map(s=>s.textContent);
      const max=numeric(labels[0]);
      const tips=[...el.querySelectorAll('.ui-kpi__tooltip li')].map(li=>({label:li.querySelector('.ui-kpi__label').textContent,color:li.querySelector('.ui-kpi__swatch').style.background}));
      const series=[...el.querySelectorAll('.ui-kpi__lines polyline')].map((line,index)=>({
        label:tips[index].label,
        color:line.getAttribute('stroke'),
        values:line.getAttribute('points').trim().split(/\s+/).map(point=>Math.round((1-Number(point.split(',')[1])/100)*max)),
      }));
      return {title:el.querySelector('h3').textContent,value:el.querySelector('.ui-kpi__value').childNodes[0].textContent,delta:el.querySelector('.ui-kpi__delta').textContent,labels,max,series,xLabels:[...el.querySelectorAll('.ui-kpi__xaxis span')].map(s=>s.textContent),footer:el.querySelector('.ui-kpi__footer').textContent};
    });
    const breakdown=[...document.querySelectorAll('.ui-as-rev__breakdown li')].map(li=>({label:li.querySelector('span').textContent,value:numeric(li.querySelector('b').textContent),tone:li.querySelector('svg').dataset.tone,points:li.querySelector('polyline').getAttribute('points')}));
    const products=[...document.querySelectorAll('.ui-as-rev__product')].map(el=>({name:el.querySelector('span').childNodes[0].textContent,value:numeric(el.querySelector('b').textContent),width:el.querySelector('i').style.width}));
    return {days,stats,charts,breakdown,products};
  },days);
  periods.push(data);
}
await fs.writeFile(`${out}/analytics-seed.json`,JSON.stringify(periods,null,2));
console.log(periods.map(p=>({days:p.days,stats:p.stats.map(s=>s.value),points:p.charts.map(c=>c.series[0].values.length)})));
await browser.close();
