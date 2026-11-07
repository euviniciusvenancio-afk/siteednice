(() => {
  'use strict';
  let config = GLModel.read();
  GLModel.applyTheme(config);
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const slug = s => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  const size = b => b > 1048576 ? (b/1048576).toFixed(1).replace('.',',')+' MB' : Math.max(1,Math.round(b/1024))+' KB';
  const icon = t => ({pdf:'📐',mp4:'🎬',mov:'🎬',webm:'🎬',png:'🖼️',jpg:'🖼️',jpeg:'🖼️',webp:'🖼️',svg:'🖼️',xlsx:'📊',xls:'📊',docx:'📄',zip:'🗂️',mp3:'🎧',wav:'🎧'}[t] || '📄');
  const isImage = t => ['png','jpg','jpeg','webp','gif','svg'].includes(t);
  const isVideo = t => ['mp4','mov','webm'].includes(t);
  const profile = {name:'Visitante',phone:'',access:'amostra'};
  const paid = false;
  const canOpen = cat => cat?.level==='amostra';
  const watermark = () => config.brand.name+' • Amostra pública';
  let toastTimer, current = null, observer = null, wmTimer, generation = 0, lastFocus = null;
  const opened = new Set();
  const first = config.categories.find(c=>c.level==='amostra');
  if(first) opened.add(first.id);
  function toast(message, ms=3000) {$('#toast').textContent=message;$('#toast').classList.add('on');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('on'),ms);}
  function syncBody(){const active=$('#viewer').classList.contains('on');$('#waBar').hidden=active;document.body.style.overflow=active?'hidden':'';$('.wrap').inert=active;}
  function dialogOpen(el){lastFocus=document.activeElement;el.hidden=false;el.classList.add('on');syncBody();el.querySelector('button')?.focus();}
  function dialogClose(el){el.classList.remove('on');el.hidden=true;syncBody();if(lastFocus?.isConnected)lastFocus.focus();}
  function waLink(){
    const digits=String(config.whatsapp.number||'').replace(/\D/g,'');
    const number=[10,11].includes(digits.length)?'55'+digits:digits;
    return number?'https://wa.me/'+number:'#';
  }
  function previewHtml(){
    const pv=config.preview; if(!pv?.url) return '';
    return `<div class="previa"><video src="${esc(pv.url)}" poster="${esc(pv.poster||'')}" autoplay muted loop playsinline preload="auto" controlslist="nodownload" disablepictureinpicture aria-label="Prévia da aula"></video><span class="previa-cap">${esc(pv.caption||'')}</span></div><button class="btn rosa" id="verAula">${esc(pv.fullButton||'Assistir a aula completa')}</button>`;
  }
  function render(){
    document.title=config.brand.name+' — '+config.brand.subtitle;
    $('#brandName').textContent=config.brand.name;$('#brandSubtitle').textContent=config.brand.subtitle;$('#brandLogo').textContent=config.brand.logo;
    const firstName=String(profile.name||'').trim().split(/\s+/)[0];
    $('#app').innerHTML=`<div class="hero"><span class="chip ${paid?'green':'gold'}">${paid?'✅ ACESSO LIBERADO':'🎁 AMOSTRA'}</span><h2>Olá${firstName?', '+esc(firstName):''} 👋</h2><p>${esc(paid?config.texts.paidIntro:config.texts.sampleIntro)}</p>${previewHtml()}</div><div class="aviso">${esc(config.texts.accessNotice).replace('pessoal','<b>pessoal</b>')}</div><input class="busca" id="busca" type="search" aria-label="Buscar projeto" placeholder="${esc(config.texts.searchPlaceholder)}"><div id="catalog"></div>`;
    $('#verAula')?.addEventListener('click',()=>{const cat=config.categories.find(c=>c.level==='amostra');const v=cat?.files.find(f=>isVideo(f.type));if(v)openFile(v);});
    $('#waBar').href=waLink();$('#waBar span').textContent=config.whatsapp.backLabel||'Voltar para o WhatsApp';
    let searchTimer;
    $('#busca').addEventListener('input',e=>{clearTimeout(searchTimer);const value=e.target.value;searchTimer=setTimeout(()=>renderCatalog(value),180);});
    renderCatalog('');
  }
  function renderCatalog(filter){
    const f=slug(filter), levels=['amostra','pago','vip'];
    let html='', found=false;
    for(const level of levels){
      const cats=config.categories.filter(c=>c.level===level).map(c=>({cat:c,files:c.files.filter(file=>!f||slug(file.name+' '+c.name).includes(f))})).filter(x=>x.files.length || (!f && x.cat.count));
      if(!cats.length)continue;
      found=true;
      const info=config.levels[level]||{titulo:level,icone:'📁'}, unlocked=canOpen(cats[0].cat);
      const title=(!unlocked&&info.tituloTravado)||(paid&&info.tituloPago)||info.titulo;
      const subtitle=(!unlocked&&info.subTravado)||info.sub||'';
      html+=`<div class="nivel"><span style="font-size:22px">${esc((!unlocked&&info.iconeTravado)||info.icone)}</span><h3>${esc(title)}</h3><span class="tag ${unlocked?'ok':''}">${unlocked?(level==='amostra'&&!paid?'grátis pra ver':'liberado'):'🔒 após o Pix'}</span></div>${subtitle?`<p class="nivsub">${esc(subtitle)}</p>`:''}`;
      for(const {cat,files} of cats){
        const count=f?files.length:cat.count;
        html+=`<details class="cat ${unlocked?'':'travada'}" id="${esc(cat.id)}" ${f||opened.has(cat.id)?'open':''}><summary><span class="ic">${unlocked?icon(files[0]?.type):'🔒'}</span><span class="nm">${esc(cat.name)}<small>${count} ${count===1?'arquivo':'arquivos'}</small></span><span class="seta">›</span></summary><div class="itens">`;
        const shown=unlocked?files:files.slice(0,6);
        for(const file of shown)html+=`<div class="item"><span>${icon(file.type)}</span><div class="t"><b title="${esc(file.name)}">${esc(file.name)}</b><small>${isVideo(file.type)?'Videoaula':(file.type==='pdf'?'Apostila em PDF':'Arquivo')}</small></div>${unlocked?`<button data-category="${esc(cat.id)}" data-file="${esc(file.id)}" aria-label="Abrir ${esc(file.name)}">Abrir</button>`:'<span class="cad">🔒</span>'}</div>`;
        if(!unlocked&&count>shown.length)html+=`<div class="mais">+ ${count-shown.length} arquivos liberados após o Pix</div>`;
        html+='</div></details>';
      }
    }
    if(!found)html='<div class="estado" style="padding:30px 10px"><p>Nada encontrado com esse nome.</p></div>';
    $('#catalog').innerHTML=html;
    $('#catalog').querySelectorAll('details').forEach(d=>d.addEventListener('toggle',()=>{if(!f){if(d.open)opened.add(d.id);else opened.delete(d.id);}}));
    $('#catalog').querySelectorAll('[data-file]').forEach(button=>button.addEventListener('click',()=>{const cat=config.categories.find(c=>c.id===button.dataset.category);if(canOpen(cat))openFile(cat.files.find(file=>file.id===button.dataset.file));}));
  }
  const libraries=new Map();
  function loadLib(src){if(!libraries.has(src))libraries.set(src,new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=()=>{libraries.delete(src);s.remove();reject(new Error('Biblioteca indisponível.'));};document.head.appendChild(s);}));return libraries.get(src);}
  function stamp(ctx,w,h){
    const text=watermark();ctx.save();ctx.globalAlpha=.12;ctx.fillStyle='#2A0E3D';const fs=Math.max(14,Math.round(w/26));ctx.font=`700 ${fs}px Inter,Arial,sans-serif`;ctx.translate(w/2,h/2);ctx.rotate(-Math.PI/6);const step=ctx.measureText(text).width+fs*3;
    for(let y=-h;y<h;y+=fs*5)for(let x=-w*1.2;x<w*1.2;x+=step)ctx.fillText(text,x,y);ctx.restore();
    const footer=Math.max(11,Math.round(w/60));ctx.save();ctx.fillStyle='rgba(42,14,61,.85)';ctx.fillRect(0,h-footer*2.1,w,footer*2.1);ctx.fillStyle='#fff';ctx.font=`600 ${footer}px Arial,sans-serif`;ctx.textBaseline='middle';ctx.fillText('Amostra pública — '+config.brand.name+'.',footer,h-footer*1.05,w-footer*2);ctx.restore();
  }
  function closeViewer(fromHistory=false){
    generation++;clearInterval(wmTimer);observer?.disconnect();observer=null;
    if(current?.pdf)current.pdf.destroy();current=null;
    $('#vbody').innerHTML='';dialogClose($('#viewer'));
    const pv=document.querySelector('.previa video');if(pv&&!pv.getAttribute('src')&&config.preview?.url){pv.src=config.preview.url;pv.play().catch(()=>{});}
    if(!fromHistory&&history.state?.glViewer)history.back();
  }
  async function openFile(file,retry=false){
    if(!file)return;
    const pv=document.querySelector('.previa video');if(pv){pv.pause();pv.removeAttribute('src');pv.load();}
    const ticket=++generation;observer?.disconnect();clearInterval(wmTimer);if(current?.pdf)current.pdf.destroy();current={file};
    $('#vTitulo').textContent=file.name;$('#vBaixar').style.display=paid&&file.url?'':'none';$('#vBaixar').onclick=()=>download(file);
    $('#vbody').innerHTML='<div class="estado" style="padding:40px 0"><div class="load"></div></div>';
    if(!retry){dialogOpen($('#viewer'));history.pushState({glViewer:true},'');}
    const note='<div class="vnota">👀 Amostra pública para visualização. O restante do material é liberado depois do Pix.</div>';
    if(!file.url){$('#vbody').innerHTML='<div class="estado"><h2>Material liberado após o Pix</h2><p>Volte para o WhatsApp para saber como liberar.</p></div>';return;}
    try{
      if(file.type==='pdf')await openPdf(file,note,ticket);
      else if(isVideo(file.type)){
        $('#vbody').innerHTML=note+`<div class="vid"><video controls playsinline preload="metadata" controlsList="nodownload" disablePictureInPicture poster="${file.demo?'assets/thumb.svg':''}" src="${esc(file.url)}"></video><div class="wm" id="wm">${esc(watermark())}</div></div>`;
        $('#vbody video').oncontextmenu=e=>e.preventDefault();$('#vbody video').addEventListener('error',()=>{if(ticket===generation)showError(file,'O vídeo não pôde ser carregado. Confira a URL e o formato do arquivo.');});
        const move=()=>{const wm=$('#wm');if(wm){wm.style.left=(5+Math.random()*45)+'%';wm.style.top=(5+Math.random()*70)+'%';}};move();wmTimer=setInterval(move,5000);
      } else if(isImage(file.type)){
        const img=new Image();img.crossOrigin='anonymous';await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=file.url;});if(ticket!==generation)return;
        const canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);stamp(ctx,canvas.width,canvas.height);canvas.oncontextmenu=e=>e.preventDefault();const box=document.createElement('div');box.className='pg';box.append(canvas);$('#vbody').innerHTML=note;$('#vbody').append(box);
      }else if(['mp3','wav','ogg','m4a'].includes(file.type))$('#vbody').innerHTML=note+`<audio class="media-audio" controls src="${esc(file.url)}"></audio>`;
      else{$('#vbody').innerHTML=note+`<div class="estado"><div class="grande">${icon(file.type)}</div><h2>${esc(file.name)}</h2><p>${paid?'Este arquivo é para baixar e usar no seu celular ou computador.':'Este arquivo é liberado para download depois do Pix.'}</p>${paid?'<button class="btn green" id="downloadGeneric" style="max-width:320px;margin:20px auto 0">⬇ Baixar arquivo</button>':''}</div>`;$('#downloadGeneric')?.addEventListener('click',()=>download(file));}
    }catch(error){if(ticket===generation)showError(file,'Confira sua internet e o endereço do arquivo e tente de novo.');}
  }
  function showError(file,message){$('#vbody').innerHTML=`<div class="estado"><div class="grande">⚠️</div><h2>Não consegui abrir</h2><p>${esc(message)}</p><button class="btn gold" id="retry" style="max-width:320px;margin:20px auto 0">Tentar de novo</button></div>`;$('#retry').onclick=()=>openFile(file,true);}
  async function openPdf(file,note,ticket){
    await loadLib('lib/pdf.min.js');if(ticket!==generation)return;
    pdfjsLib.GlobalWorkerOptions.workerSrc='lib/pdf.worker.min.js';
    const pdf=await pdfjsLib.getDocument({url:file.url,rangeChunkSize:262144,disableAutoFetch:true,disableStream:true}).promise;
    if(ticket!==generation){pdf.destroy();return;}current.pdf=pdf;
    const body=$('#vbody');body.innerHTML=note+Array.from({length:pdf.numPages},(_,i)=>`<div class="pg" data-page="${i+1}" aria-label="Página ${i+1}"><div class="ph">Página ${i+1}</div></div>`).join('');
    const width=Math.min(900,body.clientWidth-24),dpr=Math.min(2,devicePixelRatio||1);
    async function draw(el){if(el.dataset.done)return;el.dataset.done='1';try{const page=await pdf.getPage(+el.dataset.page);if(ticket!==generation)return;const viewport=page.getViewport({scale:width/page.getViewport({scale:1}).width*dpr});const canvas=document.createElement('canvas');canvas.width=viewport.width;canvas.height=viewport.height;canvas.setAttribute('aria-label',file.name+' — página '+el.dataset.page);canvas.oncontextmenu=e=>e.preventDefault();const ctx=canvas.getContext('2d');await page.render({canvasContext:ctx,viewport}).promise;if(ticket!==generation)return;stamp(ctx,canvas.width,canvas.height);el.innerHTML='';el.style.minHeight='';el.append(canvas);}catch(error){if(ticket===generation){el.textContent='Não foi possível renderizar esta página.';}}}
    observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting)draw(e.target);}),{root:body,rootMargin:'800px 0px'});
    body.querySelectorAll('.pg').forEach(el=>{el.style.minHeight=Math.round(width*1.3)+'px';observer.observe(el);});
  }
  function download(){toast('Esta amostra está disponível para visualização.');}
  $('#vFechar').onclick=()=>closeViewer();
  addEventListener('popstate',()=>{if($('#viewer').classList.contains('on'))closeViewer(true);});
  addEventListener('keydown',e=>{
    const modal=$('#viewer').classList.contains('on')?$('#viewer'):null;if(!modal)return;
    if(e.key==='Escape'){e.preventDefault();closeViewer();}
    if(e.key==='Tab'){const items=Array.from(modal.querySelectorAll('button,a[href],input,video,audio')).filter(el=>!el.disabled&&el.offsetParent!==null);if(items.length){const first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}}
  });
  render();
})();
