const navButtons=[...document.querySelectorAll('[data-view]')];const panels=[...document.querySelectorAll('[data-view-panel]')];
function setView(name){navButtons.forEach(b=>b.classList.toggle('is-active',b.dataset.view===name));panels.forEach(p=>{const active=p.dataset.viewPanel===name;p.classList.toggle('is-active',active);p.setAttribute('aria-hidden',active?'false':'true')});history.replaceState(null,'',name==='index'?'#index':'#flow');window.scrollTo({top:0,behavior:'instant'})}
navButtons.forEach(b=>{if(b.tagName==='BUTTON')b.addEventListener('click',()=>setView(b.dataset.view))});
if(location.hash==='#index')setView('index');

const lightbox=document.getElementById('lightbox');const stageImg=lightbox.querySelector('.lightbox-stage img');const count=lightbox.querySelector('.lightbox-count');const title=lightbox.querySelector('.lightbox-title');
const items=[
 {src:'/x/venus-4k.jpg',title:'After Hours'},
 {src:'/lily.jpg',title:'Study in White'},
 {src:'/x/venus-2k.jpg',title:'Archive Detail'},
 {src:'/x/venus-4k.jpg',title:'Archive Study'}
];
let current=0;let touchX=0;
function renderLightbox(){const it=items[current];stageImg.src=it.src;stageImg.alt=it.title;count.textContent=String(current+1).padStart(2,'0')+' / '+String(items.length).padStart(2,'0');title.textContent=it.title}
function openLightbox(i){current=(Number(i)+items.length)%items.length;renderLightbox();if(!lightbox.open)lightbox.showModal();document.body.style.overflow='hidden'}
function closeLightbox(){lightbox.close();document.body.style.overflow=''}
function step(delta){current=(current+delta+items.length)%items.length;renderLightbox()}
[...document.querySelectorAll('[data-lightbox]')].forEach(el=>el.addEventListener('click',()=>openLightbox(el.dataset.lightbox)));
lightbox.querySelector('.lightbox-close').addEventListener('click',closeLightbox);lightbox.querySelector('.lightbox-prev').addEventListener('click',()=>step(-1));lightbox.querySelector('.lightbox-next').addEventListener('click',()=>step(1));
lightbox.addEventListener('click',e=>{if(e.target===lightbox)closeLightbox()});
lightbox.addEventListener('touchstart',e=>{touchX=e.changedTouches[0].clientX},{passive:true});lightbox.addEventListener('touchend',e=>{const dx=e.changedTouches[0].clientX-touchX;if(Math.abs(dx)>50)step(dx>0?-1:1)},{passive:true});
window.addEventListener('keydown',e=>{if(!lightbox.open)return;if(e.key==='Escape')closeLightbox();if(e.key==='ArrowLeft')step(-1);if(e.key==='ArrowRight')step(1)});

const revealTargets=[...document.querySelectorAll('.intro-strip,.story-grid>* ,.interlude>* ,.panorama,.closing-grid>* ,.collection-card')];
if(!matchMedia('(prefers-reduced-motion: reduce)').matches){revealTargets.forEach(el=>{el.style.opacity='0';el.style.transform='translateY(22px)'});const io=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(!entry.isIntersecting)return;entry.target.animate([{opacity:0,transform:'translateY(22px)'},{opacity:1,transform:'translateY(0)'}],{duration:700,easing:'cubic-bezier(.16,1,.3,1)',fill:'forwards'});io.unobserve(entry.target)})},{threshold:.12});revealTargets.forEach(el=>io.observe(el))}
