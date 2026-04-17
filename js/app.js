// ╔══════════════════════════════════════════════════════════╗
// ║  Nippur — Final Vision App Logic                        ║
// ║  Royal Black · Antique Gold · Cuneiform Heritage        ║
// ╚══════════════════════════════════════════════════════════╝
import { db, collection, onSnapshot, query, orderBy } from '../firebase.js';

// ═══ STATE ═══
const S = {
  publishers: [], books: [], categories: new Set(),
  cart: JSON.parse(localStorage.getItem('nip_cart') || '[]'),
  favs: JSON.parse(localStorage.getItem('nip_favs') || '[]'),
  filter: null, // {type,id,label}
  search: '',
  wallet: parseFloat(localStorage.getItem('nip_wallet') || '500'),
};
const $ = id => document.getElementById(id);
function esc(s) { return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function persist(k,v) { localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); }

// ═══ TOAST ═══
function toast(msg, type='info', dur=3200) {
  const ic = {info:'<i class="fa-solid fa-circle-info"></i>',success:'<i class="fa-solid fa-circle-check"></i>',error:'<i class="fa-solid fa-circle-xmark"></i>',warn:'<i class="fa-solid fa-triangle-exclamation"></i>',gold:'<i class="fa-solid fa-star"></i>'};
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `<span>${ic[type]||'ℹ️'}</span><span>${msg}</span>`;
  $('toastContainer').appendChild(el);
  setTimeout(() => { el.classList.add('removing'); el.addEventListener('animationend', () => el.remove()); }, dur);
}

// ═══ COUNTER ═══
function animCount(el, t) { if(!el)return; let c=0; const s=Math.max(1,Math.ceil(t/35)); const i=setInterval(()=>{c=Math.min(c+s,t);el.textContent=c;if(c>=t)clearInterval(i)},18); }

// ═══ TABS ═══
function initTabs() {
  const btns = document.querySelectorAll('.tab-btn');
  const panels = document.querySelectorAll('.tab-panel');
  const ind = $('tab-indicator');
  function set(target) {
    btns.forEach(b => {
      const a = b.dataset.panel === target;
      b.classList.toggle('active', a);
      if (a && ind) { ind.style.right = b.offsetLeft+'px'; ind.style.width = b.offsetWidth+'px'; }
    });
    panels.forEach(p => p.classList.toggle('active', p.id === `panel-${target}`));
  }
  btns.forEach(b => b.addEventListener('click', () => set(b.dataset.panel)));
  requestAnimationFrame(() => set('publishers'));
}

// ═══ PUBLISHER POSTER CARD ═══
const PUB_GRADS = [
  'linear-gradient(145deg,#1a1a2e,#16213e)','linear-gradient(145deg,#0f3460,#533483)',
  'linear-gradient(145deg,#2c3333,#395b64)','linear-gradient(145deg,#212529,#495057)',
  'linear-gradient(145deg,#1a1a2e,#e94560)','linear-gradient(145deg,#2d2d2d,#4a4a4a)',
];
function renderPubCard(pub, i) {
  const card = document.createElement('article');
  card.className = 'pub-poster';
  const grad = PUB_GRADS[i % PUB_GRADS.length];
  const av = pub.icon ? `<img src="${esc(pub.icon)}" alt="${esc(pub.name)}"/>` : `<span style="font-size:1.6rem"><i class="fa-solid fa-building-columns"></i></span>`;
  card.innerHTML = `
    <div class="pub-poster-bg" style="background:${grad}"></div>
    <div class="pub-poster-overlay">
      <div class="pub-poster-avatar">${av}</div>
      <div class="pub-poster-name">${esc(pub.name)}</div>
      <div class="pub-poster-bio">${esc(pub.bio||'')}</div>
      <span class="pub-poster-tag"><i class="fa-solid fa-star" style="font-size:0.55rem"></i> دار نشر</span>
    </div>`;
  card.addEventListener('click', () => drillDown('publisher', pub.id, pub.name));
  return card;
}

// ═══ CATEGORY TILE ═══
const CAT_MAP = {
  'رواية':{bg:'linear-gradient(145deg,#667eea,#764ba2)',icon:'<i class="fa-solid fa-book-open"></i>'},
  'تاريخ':{bg:'linear-gradient(145deg,#f093fb,#f5576c)',icon:'<i class="fa-solid fa-landmark"></i>'},
  'علوم':{bg:'linear-gradient(145deg,#4facfe,#00f2fe)',icon:'<i class="fa-solid fa-flask"></i>'},
  'فلسفة':{bg:'linear-gradient(145deg,#43e97b,#38f9d7)',icon:'<i class="fa-solid fa-brain"></i>'},
  'أعمال':{bg:'linear-gradient(145deg,#fa709a,#fee140)',icon:'<i class="fa-solid fa-briefcase"></i>'},
  'تقنية':{bg:'linear-gradient(145deg,#30cfd0,#330867)',icon:'<i class="fa-solid fa-laptop-code"></i>'},
  'أدب':{bg:'linear-gradient(145deg,#a18cd1,#fbc2eb)',icon:'<i class="fa-solid fa-feather-pointed"></i>'},
  'شعر':{bg:'linear-gradient(145deg,#e0c3fc,#8ec5fc)',icon:'<i class="fa-solid fa-leaf"></i>'},
  'طفل':{bg:'linear-gradient(145deg,#fccb90,#d57eeb)',icon:'<i class="fa-solid fa-child-reaching"></i>'},
  'سياسة':{bg:'linear-gradient(145deg,#f7797d,#FBD786)',icon:'<i class="fa-solid fa-scale-balanced"></i>'},
  'default':{bg:'linear-gradient(145deg,#252525,#4a4a4a)',icon:'<i class="fa-solid fa-book"></i>'},
};
function renderCatTile(cat, cnt) {
  const s = CAT_MAP[cat] || CAT_MAP.default;
  const tile = document.createElement('button');
  tile.className = 'cat-tile';
  tile.innerHTML = `<div class="cat-tile-bg" style="background:${s.bg}"></div>
    <div class="cat-tile-overlay"><div class="cat-tile-icon">${s.icon}</div><div class="cat-tile-name">${esc(cat)}</div><div class="cat-tile-count">${cnt} كتاب</div></div>`;
  tile.addEventListener('click', () => drillDown('category', cat, cat));
  return tile;
}

// ═══ BOOK CARD ═══
function renderBookCard(book) {
  const card = document.createElement('article');
  card.className = 'book-card';
  const isFav = S.favs.some(f=>f.id===book.id);
  const cover = book.cover ? `<img src="${esc(book.cover)}" alt="${esc(book.title)}" loading="lazy"/>` : `<div class="book-cover-ph"><i class="fa-solid fa-book"></i></div>`;
  const price = book.price ? `${Number(book.price).toLocaleString('ar-SA')} د.ع` : 'مجاني';
  const oos = book.stockQuantity === 0;
  card.innerHTML = `
    <div class="book-cover">${cover}${oos?'<span class="book-badge badge-out">نفذ</span>':'<span class="book-badge badge-new">جديد</span>'}</div>
    <div class="book-info">
      <div class="book-title">${esc(book.title)}</div>
      <div class="book-author">${esc(book.author||'')}</div>
      <div class="book-footer">
        <span class="book-price">${price}</span>
        <div class="book-actions">
          <button class="fav-btn ${isFav?'active':''}" data-fav="${book.id}"><i class="fa-${isFav?'solid':'regular'} fa-heart"></i></button>
          ${oos?'':`<button class="add-cart-btn" data-cart="${book.id}"><i class="fa-solid fa-plus"></i></button>`}
        </div>
      </div>
      ${oos?`<button class="notify-btn" data-notify="${book.id}"><i class="fa-solid fa-bell"></i> أخبرني عند التوفر</button>`:''}
    </div>`;
  card.querySelector('[data-cart]')?.addEventListener('click', e => { e.stopPropagation(); addToCart(book); haptic(card); });
  card.querySelector('[data-fav]')?.addEventListener('click', e => { e.stopPropagation(); toggleFav(book); });
  card.querySelector('[data-notify]')?.addEventListener('click', e => { e.stopPropagation(); toast('سيتم إشعارك عند التوفر','gold'); });
  card.addEventListener('click', () => openDetail(book));
  return card;
}
function emptyEl(icon,title,desc) { const el=document.createElement('div');el.className='empty-state';el.innerHTML=`<div class="empty-icon">${icon}</div><div class="empty-title">${title}</div><div class="empty-desc">${desc}</div>`;return el; }

// ═══ RENDER FUNCTIONS ═══
function renderPubs(pubs) {
  const g = $('pub-grid'); g.innerHTML = '';
  if (!pubs.length) { g.appendChild(emptyEl('<i class="fa-solid fa-building-columns"></i>','لا توجد دور نشر','أضف من لوحة الإدارة')); return; }
  pubs.forEach((p,i) => g.appendChild(renderPubCard(p,i)));
}
function renderCats(books) {
  const g = $('cat-grid'); g.innerHTML = '';
  const counts = {};
  books.forEach(b => { if(b.category) counts[b.category]=(counts[b.category]||0)+1; });
  if (!Object.keys(counts).length) { g.appendChild(emptyEl('<i class="fa-solid fa-tags"></i>','لا توجد تصنيفات','ستظهر عند إضافة كتب')); return; }
  Object.entries(counts).sort((a,b)=>b[1]-a[1]).forEach(([c,n])=>g.appendChild(renderCatTile(c,n)));
}
function renderRow(containerId, books) {
  const c = $(containerId); if(!c) return; c.innerHTML = '';
  if (!books.length) return;
  books.forEach(b => c.appendChild(renderBookCard(b)));
}
function renderSponsors(pubs) {
  const r = $('sponsored-row'); if(!r) return; r.innerHTML = '';
  pubs.slice(0,8).forEach(p => {
    const el = document.createElement('div');
    el.className = 'sponsor-logo';
    el.innerHTML = p.icon ? `<img src="${esc(p.icon)}" alt="${esc(p.name)}"/>` : `<span class="sponsor-emoji"><i class="fa-solid fa-building-columns"></i></span>`;
    el.addEventListener('click', () => drillDown('publisher', p.id, p.name));
    r.appendChild(el);
  });
}

// ═══ DRILL-DOWN ═══
function drillDown(type, id, label) {
  S.filter = {type, id, label};
  $('back-nav').classList.add('visible');
  $('back-label').textContent = label;
  $('internal-filters').classList.add('visible');
  $('row-filtered').classList.remove('hidden');
  $('row-new').classList.add('hidden');
  $('row-rec').classList.add('hidden');
  $('filtered-title').innerHTML = `<i class="fa-solid fa-filter"></i> ${esc(label)}`;
  const filtered = type==='publisher'
    ? S.books.filter(b=>b.publisherId===id)
    : S.books.filter(b=>b.category===id);
  renderRow('books-filtered', applySearch(filtered));
  $('rows-section')?.scrollIntoView({behavior:'smooth',block:'start'});
  toast(`عرض: ${label}`, 'gold');
}
function exitDrill() {
  S.filter = null;
  $('back-nav').classList.remove('visible');
  $('internal-filters').classList.remove('visible');
  $('row-filtered').classList.add('hidden');
  $('row-new').classList.remove('hidden');
  $('row-rec').classList.remove('hidden');
  renderAllRows();
}

// ═══ SEARCH ═══
function applySearch(books) {
  const q = S.search.trim().toLowerCase();
  if (!q) return books;
  return books.filter(b => (b.title||'').toLowerCase().includes(q)||(b.author||'').toLowerCase().includes(q)||(b.category||'').toLowerCase().includes(q));
}
function renderAllRows() {
  const sorted = [...S.books];
  renderRow('books-new', applySearch(sorted.slice(0, 12)));
  renderRow('books-rec', applySearch(sorted.sort(() => 0.5-Math.random()).slice(0,8)));
}

// ═══ INTERNAL FILTERS ═══
function initInternalFilters() {
  let t;
  $('internal-search')?.addEventListener('input', e => {
    clearTimeout(t);
    t = setTimeout(() => { S.search = e.target.value; if(S.filter)drillDown(S.filter.type,S.filter.id,S.filter.label);else renderAllRows(); }, 250);
  });
  $('filter-price')?.addEventListener('change', e => {
    if (!S.filter) return;
    const base = S.filter.type==='publisher'?S.books.filter(b=>b.publisherId===S.filter.id):S.books.filter(b=>b.category===S.filter.id);
    let filtered = applySearch(base);
    if (e.target.value === 'low') filtered.sort((a,b)=>(a.price||0)-(b.price||0));
    if (e.target.value === 'high') filtered.sort((a,b)=>(b.price||0)-(a.price||0));
    renderRow('books-filtered', filtered);
  });
}

// ═══ SMART FILTERS (hero) ═══
function initSmartFilters() {
  document.querySelectorAll('.filter-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      // For now just toast — real logic would need server-side tags
      toast(`فلتر: ${pill.textContent}`, 'gold');
    });
  });
}

// ═══ DETAIL PANEL ═══
function openDetail(book) {
  const body = $('detail-body');
  const pub = S.publishers.find(p=>p.id===book.publisherId);
  const price = book.price?`${Number(book.price).toLocaleString('ar-SA')} د.ع`:'مجاني';
  const isFav = S.favs.some(f=>f.id===book.id);
  const oos = book.stockQuantity===0;
  // Images: cover + gallery
  const images = book.gallery && book.gallery.length ? [book.cover,...book.gallery].filter(Boolean) : book.cover ? [book.cover] : [];

  body.innerHTML = `
    <!-- GALLERY -->
    <div class="detail-gallery">
      ${images.length ? images.map((src,i)=>`<div class="gallery-slide ${i===0?'active':''}" data-slide="${i}"><img src="${esc(src)}" alt="صورة ${i+1}" data-zoom="${esc(src)}"/></div>`).join('') : '<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:4rem;color:var(--clr-gold)"><i class="fa-solid fa-book"></i></div>'}
      ${images.length>1?`<div class="gallery-nav">${images.map((_,i)=>`<div class="gallery-dot ${i===0?'active':''}" data-dot="${i}"></div>`).join('')}</div>`:''}
    </div>
    <div class="detail-info">
      <h2 class="dp-title">${esc(book.title)}</h2>
      <p class="dp-author">${esc(book.author||'')}</p>
      <table class="dp-table">
        <tr><td>السعر</td><td style="color:var(--clr-gold-dark);font-weight:800">${price}</td></tr>
        <tr><td>التصنيف</td><td>${esc(book.category||'—')}</td></tr>
        <tr><td>دار النشر</td><td>${esc(pub?.name||book.publisherName||'—')}</td></tr>
        <tr><td>سنة الإصدار</td><td>${esc(book.editionYear||'—')}</td></tr>
        <tr><td>نوع الغلاف</td><td>${esc(book.coverType||'—')}</td></tr>
        <tr><td>الحالة</td><td>${oos?'<span style="color:var(--clr-danger);font-weight:700">نفذت الكمية</span>':'<span style="color:var(--clr-success);font-weight:700">متوفر</span>'}</td></tr>
      </table>
      <div class="dp-bundle"><i class="fa-solid fa-gift dp-bundle-icon"></i><div class="dp-bundle-text"><div class="dp-bundle-title">حزمة القارئ <i class="fa-solid fa-box"></i></div><div class="dp-bundle-desc">اشترِ كتابين إضافيين من نفس الناشر واحصل على خصم 10%</div></div></div>
      <div class="dp-actions">
        ${oos
          ?`<button class="btn btn-primary btn-lg" style="flex:1" id="dp-notify"><i class="fa-solid fa-bell"></i> أخبرني عند التوفر</button>`
          :`<button class="btn btn-gold btn-lg" style="flex:1" id="dp-add-cart"><i class="fa-solid fa-cart-plus"></i> أضف للسلة</button>`
        }
        <button class="btn ${isFav?'btn-gold':'btn-ghost'} btn-lg" id="dp-fav"><i class="fa-${isFav?'solid':'regular'} fa-heart"></i></button>
      </div>
      <!-- Gifting -->
      <div class="gift-row" id="gift-row"><div class="gift-switch" id="gift-switch"></div><span><i class="fa-solid fa-gift"></i> تغليف كهدية فاخرة</span></div>
      <div class="gift-msg" id="gift-msg"><textarea class="gift-msg-input" placeholder="اكتب رسالتك الشخصية هنا…"></textarea></div>
    </div>`;

  // Gallery auto-slide
  if (images.length > 1) {
    let cur = 0;
    const slides = body.querySelectorAll('.gallery-slide');
    const dots = body.querySelectorAll('.gallery-dot');
    function goSlide(n) { slides.forEach((s,i)=>s.classList.toggle('active',i===n)); dots.forEach((d,i)=>d.classList.toggle('active',i===n)); cur=n; }
    dots.forEach(d => d.addEventListener('click', ()=> goSlide(+d.dataset.dot)));
    setInterval(() => goSlide((cur+1)%images.length), 4000);
  }
  // Zoom
  body.querySelectorAll('[data-zoom]').forEach(img => img.addEventListener('click', () => {
    $('zoom-img').src = img.dataset.zoom;
    $('zoom-overlay').classList.add('active');
  }));
  // Actions
  body.querySelector('#dp-add-cart')?.addEventListener('click', () => { addToCart(book); toast(`"${book.title}" أُضيف للسلة ✨`,'success'); });
  body.querySelector('#dp-notify')?.addEventListener('click', () => toast('سيتم إشعارك عند التوفر 🔔','gold'));
  body.querySelector('#dp-fav')?.addEventListener('click', () => { toggleFav(book); openDetail(book); });
  // Gift toggle
  const gs = body.querySelector('#gift-switch');
  gs?.addEventListener('click', () => { gs.classList.toggle('on'); body.querySelector('#gift-msg').classList.toggle('open',gs.classList.contains('on')); toast(gs.classList.contains('on')?'تغليف كهدية':'تم إلغاء الهدية','gold'); });

  $('detail-overlay').classList.add('active');
  $('detail-panel').classList.add('active');
  document.body.style.overflow='hidden';
}
function closeDetail() { $('detail-panel').classList.remove('active'); $('detail-overlay').classList.remove('active'); document.body.style.overflow=''; }

// ═══ FAVORITES ═══
function toggleFav(book) {
  const idx = S.favs.findIndex(f=>f.id===book.id);
  if (idx>-1) { S.favs.splice(idx,1); toast(`إزالة "${book.title}" من المفضلة`,'info'); }
  else { S.favs.push({id:book.id,title:book.title,author:book.author,cover:book.cover,price:book.price}); toast(`"${book.title}" في المفضلة ❤️`,'success'); }
  persist('nip_favs',S.favs); updateFavUI(); renderAllRows();
}
function updateFavUI() {
  const c = S.favs.length;
  $('fav-count-badge').textContent = `(${c})`;
  $('fav-nav-badge').textContent = c; $('fav-nav-badge').classList.toggle('hidden',c===0);
  const body = $('fav-body'); body.innerHTML = '';
  if (!c) { body.innerHTML = '<div class="fav-empty"><i class="fa-solid fa-heart-crack" style="font-size:3rem;opacity:.3"></i><br><span>لا توجد كتب في المفضلة</span></div>'; return; }
  S.favs.forEach(f => {
    const d = document.createElement('div'); d.className = 'fav-item';
    d.innerHTML = `<div class="fav-item-cover">${f.cover?`<img src="${esc(f.cover)}"/>`:'<div style="display:flex;align-items:center;justify-content:center;height:100%"><i class="fa-solid fa-book"></i></div>'}</div>
      <div class="fav-item-info"><div class="fav-item-title">${esc(f.title)}</div><div class="fav-item-author">${esc(f.author||'')}</div><div class="fav-item-price">${f.price?Number(f.price).toLocaleString('ar-SA')+' د.ع':'مجاني'}</div></div>
      <button class="fav-item-remove"><i class="fa-solid fa-xmark"></i></button>`;
    d.querySelector('.fav-item-remove').addEventListener('click', ()=>{const b=S.books.find(x=>x.id===f.id)||f;toggleFav(b);});
    body.appendChild(d);
  });
}
function openFav() { $('fav-panel').classList.add('open'); $('fav-overlay').classList.add('open'); document.body.style.overflow='hidden'; }
function closeFav() { $('fav-panel').classList.remove('open'); $('fav-overlay').classList.remove('open'); document.body.style.overflow=''; }

// ═══ CART ═══
function openCart() { $('cart-panel').classList.add('open'); $('cart-overlay').classList.add('open'); document.body.style.overflow='hidden'; }
function closeCart() { $('cart-panel').classList.remove('open'); $('cart-overlay').classList.remove('open'); document.body.style.overflow=''; }

function addToCart(book) {
  const maxStock = book.stockQuantity ?? Infinity;
  const ex = S.cart.find(i=>i.id===book.id);
  const currentQty = ex ? ex.qty : 0;
  if(currentQty >= maxStock) { toast(`نفذ المخزون: متاح ${maxStock} فقط`,'warn'); return; }
  
  if (ex) ex.qty+=1; else S.cart.push({id:book.id,title:book.title,price:book.price,cover:book.cover,stockQuantity:book.stockQuantity,qty:1});
  persist('nip_cart',S.cart); updateCartUI();
}
function updateCartUI() {
  const count = S.cart.reduce((s,i)=>s+i.qty,0);
  const total = S.cart.reduce((s,i)=>s+(Number(i.price)||0)*i.qty,0);
  const fc = $('floating-cart');
  if (count>0) { fc.classList.add('visible'); fc.style.display=''; } else fc.classList.remove('visible');
  $('cart-badge').textContent=count; $('cart-badge').classList.toggle('hidden',count===0);
  $('cart-total').textContent = total>0?`${total.toLocaleString('ar-SA')} د.ع`:'0 د.ع';
  $('cart-nav-badge').textContent=count; $('cart-nav-badge').classList.toggle('hidden',count===0);
  if(count===0) $('cart-restore').classList.remove('visible');

  const cb = $('cart-body');
  if(cb) {
    if(!S.cart.length) {
      cb.innerHTML = '<div class="empty-state"><div class="empty-icon" style="font-size:3rem;opacity:.3"><i class="fa-solid fa-cart-shopping"></i></div><div class="empty-title">السلة فارغة</div></div>';
    } else {
      cb.innerHTML = '';
      S.cart.forEach((item) => {
        const coverSrc = item.cover ? `<img src="${esc(item.cover)}" class="cart-item-img"/>` : `<div class="cart-item-img" style="display:flex;align-items:center;justify-content:center;font-size:1.5rem"><i class="fa-solid fa-book"></i></div>`;
        const itemPrice = item.price ? `${Number(item.price).toLocaleString('ar-SA')} د.ع` : 'مجاني';
        const itemTotal = item.price ? `${(Number(item.price)*item.qty).toLocaleString('ar-SA')} د.ع` : 'مجاني';
        const el = document.createElement('div');
        el.className = 'cart-item';
        el.innerHTML = `
          ${coverSrc}
          <div class="cart-item-info">
            <div class="cart-item-title">${esc(item.title)}</div>
            <div class="cart-item-price">${itemTotal} <span style="font-size:0.75rem;color:var(--txt-muted);font-weight:400">(${itemPrice} للقطعة)</span></div>
            <div class="cart-item-controls">
              <button class="qty-btn dec" data-id="${item.id}"><i class="fa-solid fa-minus"></i></button>
              <div class="cart-item-qty">${item.qty}</div>
              <button class="qty-btn inc" data-id="${item.id}"><i class="fa-solid fa-plus"></i></button>
            </div>
          </div>
          <button class="cart-item-remove" data-id="${item.id}"><i class="fa-solid fa-trash-can"></i></button>
        `;
        cb.appendChild(el);
      });
      cb.querySelectorAll('.dec').forEach(btn => btn.addEventListener('click', (e) => {
        const it = S.cart.find(i=>i.id===e.currentTarget.dataset.id);
        if(it) { it.qty--; if(it.qty<=0) S.cart = S.cart.filter(i=>i.id!==it.id); persist('nip_cart',S.cart); updateCartUI(); }
      }));
      cb.querySelectorAll('.inc').forEach(btn => btn.addEventListener('click', (e) => {
        const it = S.cart.find(i=>i.id===e.currentTarget.dataset.id);
        if(it) {
           const max = it.stockQuantity ?? Infinity;
           if(it.qty >= max) toast(`الكمية المطلوبة غير متوفرة`,'warn');
           else { it.qty++; persist('nip_cart',S.cart); updateCartUI(); }
        }
      }));
      cb.querySelectorAll('.cart-item-remove').forEach(btn => btn.addEventListener('click', (e) => {
        S.cart = S.cart.filter(i=>i.id!==e.currentTarget.dataset.id); persist('nip_cart',S.cart); updateCartUI();
      }));
    }
  }
  const dTot = $('drawer-cart-total');
  if(dTot) dTot.textContent = total>0?`${total.toLocaleString('ar-SA')} د.ع`:'0 د.ع';
}

// ═══ HAPTIC ═══
function haptic(el) { el.classList.remove('haptic'); void el.offsetWidth; el.classList.add('haptic'); el.addEventListener('animationend',()=>el.classList.remove('haptic'),{once:true}); if(navigator.vibrate)navigator.vibrate([10,20,10]); }

// ═══ DRAGGABLE CART ═══
function initCart() {
  const fc=$('floating-cart'), rs=$('cart-restore');
  if(!fc||!rs)return;
  let drag=false,sx,sy,ox,ob,swx,swt;
  const SNAP=16,STH=80,SVEL=0.5;
  fc.addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;drag=true;sx=e.clientX;sy=e.clientY;swx=e.clientX;swt=Date.now();const r=fc.getBoundingClientRect();ox=r.left;ob=innerHeight-r.bottom;fc.style.left=ox+'px';fc.style.bottom=ob+'px';fc.style.right='auto';fc.style.top='auto';fc.setPointerCapture(e.pointerId);fc.style.transition='none';fc.style.cursor='grabbing'});
  fc.addEventListener('pointermove',e=>{if(!drag)return;let l=ox+(e.clientX-sx),b=ob-(e.clientY-sy);l=Math.max(SNAP,Math.min(l,innerWidth-fc.offsetWidth-SNAP));b=Math.max(SNAP,Math.min(b,innerHeight-fc.offsetHeight-SNAP));fc.style.left=l+'px';fc.style.bottom=b+'px'});
  fc.addEventListener('pointerup',e=>{if(!drag)return;drag=false;fc.style.transition='';fc.style.cursor='grab';const dx=e.clientX-swx,vel=Math.abs(dx)/(Date.now()-swt);
    if(Math.abs(dx)>STH&&vel>SVEL){fc.classList.add('swipe-out');fc.addEventListener('animationend',()=>{fc.classList.remove('swipe-out','visible');fc.style.display='none';rs.classList.add('visible');toast('السلة مخفية — انقر الزر الذهبي لإعادتها','gold',3500)},{once:true});return}
    const r=fc.getBoundingClientRect(),cx=r.left+r.width/2;
    if(cx<innerWidth/2){fc.style.left=SNAP+'px';fc.style.right='auto'}else{fc.style.right=SNAP+'px';fc.style.left='auto'}
    fc.style.top=Math.max(SNAP,Math.min(r.top,innerHeight-r.height-SNAP))+'px';fc.style.bottom='auto';
  });
  fc.addEventListener('click', openCart);
  rs.addEventListener('click', ()=>{rs.classList.remove('visible');fc.style.display='';fc.style.left=SNAP+'px';fc.style.bottom='28px';fc.style.top='auto';fc.style.right='auto';fc.classList.add('visible');toast('تم استعادة السلة','success')});
  $('cart-nav')?.addEventListener('click', openCart);
}

// ═══ AUTH MODAL ═══
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js';
import { auth, doc, updateDoc, increment } from '../firebase.js';

let currentUser = null;
function initAuth() {
  onAuthStateChanged(auth, user => { currentUser = user; });
  // user-btn handles settings modal
  $('auth-close')?.addEventListener('click', ()=>$('auth-overlay').classList.remove('active'));
  $('auth-email-btn')?.addEventListener('click', ()=>{
    const e=$('auth-email').value.trim();
    if(!e){toast('أدخل البريد الإلكتروني','error');return}
    toast('تم المحاكاة — مسجل الدخول الان','success');$('auth-overlay').classList.remove('active'); currentUser = {uid:'dummy'};
  });
  $('auth-phone-btn')?.addEventListener('click', ()=>{
    const p=$('auth-phone').value.trim();
    if(!p){toast('أدخل رقم الهاتف','error');return}
    toast('تمت المحاكاة — مسجل الدخول الان','success');$('auth-overlay').classList.remove('active'); currentUser = {uid:'dummy'};
  });
  
  // Checkout Gatekeeper
  $('cart-checkout')?.addEventListener('click', () => {
    if (!S.cart.length) { toast('السلة فارغة','info'); return; }
    if (!currentUser) {
      closeCart();
      $('auth-overlay').classList.add('active');
      toast('الرجاء تسجيل الدخول لإتمام الطلب','warn');
    } else {
      placeOrder();
    }
  });
}

async function placeOrder() {
  toast('جاري إرسال الطلب...', 'gold');
  try {
    const promises = S.cart.map(item => {
      if (item.stockQuantity !== undefined && item.stockQuantity !== null && item.stockQuantity !== '') {
        const d = doc(db, 'books', item.id);
        return updateDoc(d, {
          stockQuantity: increment(-item.qty)
        });
      }
    });
    await Promise.all(promises);
    S.cart = [];
    persist('nip_cart', S.cart);
    updateCartUI();
    closeCart();
    toast('تم تأكيد الطلب بنجاح', 'success');
  } catch (err) {
    console.error(err);
    toast('حدث خطأ أثناء تأكيد الطلب', 'error');
  }
}

// ═══ PROFILE / E-WALLET ═══
function initProfile() {
  $('user-btn')?.addEventListener('click', openProfile);
  $('profile-close')?.addEventListener('click', closeProfile);
  $('profile-overlay')?.addEventListener('click', closeProfile);
  $('wallet-balance').textContent = S.wallet.toFixed(2);
  $('wallet-topup')?.addEventListener('click', ()=>{S.wallet+=100;persist('nip_wallet',S.wallet.toString());$('wallet-balance').textContent=S.wallet.toFixed(2);toast('تم شحن 100 د.ع','gold')});
}

function initTheme() {
  const btns = document.querySelectorAll('#theme-switch .btn');
  btns.forEach(b => b.addEventListener('click', () => {
    btns.forEach(bb => bb.classList.remove('active'));
    b.classList.add('active');
    const t = b.dataset.theme;
    if (t === 'light') document.documentElement.setAttribute('data-theme', 'light');
    else document.documentElement.removeAttribute('data-theme');
    persist('nip_theme', t);
  }));
  const stored = localStorage.getItem('nip_theme');
  if (stored === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
    btns.forEach(b => b.classList.toggle('active', b.dataset.theme==='light'));
  }
}
function openProfile(){$('profile-panel').classList.add('open');$('profile-overlay').classList.add('open');document.body.style.overflow='hidden'}
function closeProfile(){$('profile-panel').classList.remove('open');$('profile-overlay').classList.remove('open');document.body.style.overflow=''}

// ═══ GPS ═══
function initGPS() {
  $('gps-btn')?.addEventListener('click', ()=>{
    const st=$('gps-status');
    st.textContent='جاري تحديد الموقع…';
    if(!navigator.geolocation){st.textContent='المتصفح لا يدعم GPS';toast('GPS غير مدعوم','error');return}
    navigator.geolocation.getCurrentPosition(
      pos=>{st.textContent=`<i class="fa-solid fa-location-dot"></i> ${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)} — دقة: ${pos.coords.accuracy.toFixed(0)}م`;toast('تم تحديد الموقع بنجاح','success')},
      err=>{st.textContent='فشل تحديد الموقع: '+err.message;toast('فشل GPS','error')},
      {enableHighAccuracy:true,timeout:10000}
    );
  });
}

// ═══ SEARCH ═══
function initSearch() {
  let t;
  $('main-search')?.addEventListener('input', e=>{clearTimeout(t);t=setTimeout(()=>{S.search=e.target.value;if(S.filter)drillDown(S.filter.type,S.filter.id,S.filter.label);else renderAllRows()},250)});
}

// ═══ ZOOM ═══
function initZoom() { $('zoom-overlay')?.addEventListener('click',()=>$('zoom-overlay').classList.remove('active')); }

// ═══ FIRESTORE ═══
function initFirestore() {
  const pubQ = query(collection(db,'publishers'),orderBy('weight','asc'));
  onSnapshot(pubQ, snap=>{
    S.publishers=snap.docs.map(d=>({id:d.id,...d.data()}));
    renderPubs(S.publishers);renderSponsors(S.publishers);
    animCount($('stat-pubs'),S.publishers.length);
  }, err=>{ console.warn('Firestore publishers:',err.message); $('pub-grid').innerHTML=''; $('pub-grid').appendChild(emptyEl('<i class="fa-solid fa-plug"></i>','اتصال Firestore','تأكد من تفعيل Firestore')); });

  const booksQ = query(collection(db,'books'),orderBy('createdAt','desc'));
  onSnapshot(booksQ, snap=>{
    S.books=snap.docs.map(d=>({id:d.id,...d.data()}));
    S.categories.clear(); S.books.forEach(b=>b.category&&S.categories.add(b.category));
    renderCats(S.books); renderAllRows();
    animCount($('stat-books'),S.books.length);
    animCount($('stat-cats'),S.categories.size);
  }, err=>console.warn('Firestore books:',err.message));
}

// ═══ BOOT ═══
document.addEventListener('DOMContentLoaded', ()=>{
  initTabs();initCart();initSearch();initInternalFilters();initSmartFilters();
  initAuth();initProfile();initGPS();initZoom();initFirestore();initTheme();
  updateCartUI();updateFavUI();
  $('back-nav')?.addEventListener('click',exitDrill);
  $('fav-toggle')?.addEventListener('click',openFav);
  $('fav-close')?.addEventListener('click',closeFav);
  $('fav-overlay')?.addEventListener('click',closeFav);
  $('detail-close')?.addEventListener('click',closeDetail);
  $('detail-overlay')?.addEventListener('click',closeDetail);
  $('cart-close')?.addEventListener('click',closeCart);
  $('cart-overlay')?.addEventListener('click',closeCart);
  console.log('%c📚 Nippur Final Vision','color:#D4AF37;font-weight:900;font-size:14px');
});
