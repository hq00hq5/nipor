// ╔══════════════════════════════════════════════════════════╗
// ║  Nippur — Mobile-First SPA Controller                   ║
// ║  Royal Black · Antique Gold · Cuneiform Heritage        ║
// ║  Bottom Navigation · 4 Views · Zero Emoji               ║
// ╚══════════════════════════════════════════════════════════╝
import { supabase } from '../supabase.js';

// ═══ STATE ═══
const S = {
  publishers: [], books: [], categories: new Set(),
  cart: JSON.parse(localStorage.getItem('nip_cart') || '[]'),
  favs: JSON.parse(localStorage.getItem('nip_favs') || '[]'),
  filter: null, // {type,id,label}
  search: '',
  activeView: 'home',
};
const $ = id => document.getElementById(id);
function esc(s) { return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function persist(k,v) { localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); }

// ═══ TOAST ═══
function toast(msg, type='info', dur=3200) {
  if (msg !== 'عذراً، هذا الكتاب غير متوفر حالياً') return;
  const ic = {
    info:'<i class="fa-solid fa-circle-info"></i>',
    success:'<i class="fa-solid fa-circle-check"></i>',
    error:'<i class="fa-solid fa-circle-xmark"></i>',
    warn:'<i class="fa-solid fa-triangle-exclamation"></i>',
    gold:'<i class="fa-solid fa-star"></i>'
  };
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `<span>${ic[type]||ic.info}</span><span>${msg}</span>`;
  $('toastContainer').appendChild(el);
  setTimeout(() => { el.classList.add('removing'); el.addEventListener('animationend', () => el.remove()); }, dur);
}




// ══════════════════════════════════════════════════════════
//  BOTTOM NAVIGATION — SPA VIEW SWITCHING + SLIDING PILL
// ══════════════════════════════════════════════════════════
function positionPill(activeItem) {
  const pill = $('nav-pill');
  if (!pill || !activeItem) return;
  const nav = $('bottom-nav');
  const navRect = nav.getBoundingClientRect();
  const itemRect = activeItem.getBoundingClientRect();
  pill.style.width = itemRect.width + 'px';
  pill.style.left = (itemRect.left - navRect.left) + 'px';
}

function initBottomNav() {
  const navItems = document.querySelectorAll('.bottom-nav-item');

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const target = item.dataset.view;
      if (target === S.activeView) {
        const activeView = $(`view-${target}`);
        if (activeView) activeView.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      switchView(target);
    });
  });

  // Position pill on initial active tab
  requestAnimationFrame(() => {
    const active = document.querySelector('.bottom-nav-item.active');
    positionPill(active);
  });

  // Reposition pill on resize
  window.addEventListener('resize', () => {
    const active = document.querySelector('.bottom-nav-item.active');
    positionPill(active);
  });
}

function switchView(target) {
  const navItems = document.querySelectorAll('.bottom-nav-item');
  const oldView = $(`view-${S.activeView}`);
  const newView = $(`view-${target}`);

  // Update nav items + slide pill
  navItems.forEach(n => {
    const isActive = n.dataset.view === target;
    n.classList.toggle('active', isActive);
    if (isActive) positionPill(n);
  });

  // Animate out old view
  if (oldView) {
    oldView.classList.remove('view--active');
  }

  // Animate in new view
  setTimeout(() => {
    if (newView) {
      newView.classList.add('view--active');
    }
  }, 50);

  S.activeView = target;
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Refresh view-specific content
  if (target === 'orders') updateCartUI();
  if (target === 'search') $('main-search')?.focus();
}


// ══════════════════════════════════════════════════════════
//  TABS (Publishers & Categories)
// ══════════════════════════════════════════════════════════
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


// ══════════════════════════════════════════════════════════
//  PUBLISHER POSTER CARDS
// ══════════════════════════════════════════════════════════
const PUB_GRADS = [
  'linear-gradient(145deg,#1a1a2e,#16213e)','linear-gradient(145deg,#0f3460,#533483)',
  'linear-gradient(145deg,#2c3333,#395b64)','linear-gradient(145deg,#212529,#495057)',
  'linear-gradient(145deg,#1a1a2e,#e94560)','linear-gradient(145deg,#2d2d2d,#4a4a4a)',
];
function renderPubCard(pub, i) {
  const card = document.createElement('article');
  card.className = 'pub-poster';
  const grad = PUB_GRADS[i % PUB_GRADS.length];
  const av = pub.icon
    ? `<img src="${esc(pub.icon)}" alt="${esc(pub.name)}"/>`
    : `<span style="font-size:1.4rem"><i class="fa-solid fa-building-columns"></i></span>`;
  card.innerHTML = `
    <div class="pub-poster-bg" style="background:${grad}"></div>
    <div class="pub-poster-overlay">
      <div class="pub-poster-avatar">${av}</div>
      <div class="pub-poster-name">${esc(pub.name)}</div>
      <div class="pub-poster-bio">${esc(pub.bio||'')}</div>
      <span class="pub-poster-tag"><i class="fa-solid fa-star" style="font-size:0.55rem"></i> دار نشر</span>
    </div>`;
  card.addEventListener('click', () => {
    // Switch to search view for drill-down
    switchView('search');
    setTimeout(() => drillDown('publisher', pub.id, pub.name), 250);
  });
  return card;
}


// ══════════════════════════════════════════════════════════
//  CATEGORY TILES
// ══════════════════════════════════════════════════════════
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
  tile.addEventListener('click', () => {
    switchView('search');
    setTimeout(() => drillDown('category', cat, cat), 250);
  });
  return tile;
}


// ══════════════════════════════════════════════════════════
//  BOOK CARD
// ══════════════════════════════════════════════════════════
function renderBookCard(book) {
  const card = document.createElement('article');
  card.className = 'book-card';
  const isFav = S.favs.some(f=>f.id===book.id);
  const cover = book.cover
    ? `<img src="${esc(book.cover)}" alt="${esc(book.title)}" loading="lazy"/>`
    : `<div class="book-cover-ph"><i class="fa-solid fa-book"></i></div>`;
  const price = book.price ? `${Number(book.price).toLocaleString('ar-SA')} د.ع` : 'مجاني';
  const oos = book.stockQuantity === 0;
  card.innerHTML = `
    <div class="book-cover">${cover}${oos?'<span class="book-badge badge-out">غير متوفر</span>':'<span class="book-badge badge-new">جديد</span>'}</div>
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


// ══════════════════════════════════════════════════════════
//  RENDER FUNCTIONS
// ══════════════════════════════════════════════════════════
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

  // Populate search filter categories
  const catSelect = $('filter-category');
  if (catSelect) {
    catSelect.innerHTML = '<option value="">التصنيف</option>';
    Object.keys(counts).sort().forEach(c => {
      catSelect.innerHTML += `<option value="${esc(c)}">${esc(c)} (${counts[c]})</option>`;
    });
  }
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
    el.addEventListener('click', () => {
      switchView('search');
      setTimeout(() => drillDown('publisher', p.id, p.name), 250);
    });
    r.appendChild(el);
  });

  // Populate search filter publishers
  const pubSelect = $('filter-publisher');
  if (pubSelect) {
    pubSelect.innerHTML = '<option value="">الناشر</option>';
    pubs.forEach(p => {
      pubSelect.innerHTML += `<option value="${esc(p.id)}">${esc(p.name)}</option>`;
    });
  }
}


// ══════════════════════════════════════════════════════════
//  DRILL-DOWN (Search View)
// ══════════════════════════════════════════════════════════
function drillDown(type, id, label) {
  S.filter = {type, id, label};
  $('back-nav').classList.add('visible');
  $('back-label').textContent = label;
  $('row-filtered').classList.remove('hidden');
  $('search-results').classList.add('hidden');
  $('filtered-title').innerHTML = `<i class="fa-solid fa-filter"></i> ${esc(label)}`;
  const filtered = type==='publisher'
    ? S.books.filter(b=>b.publisherId===id)
    : S.books.filter(b=>b.category===id);
  renderRow('books-filtered', applySearch(filtered));
  toast(`عرض: ${label}`, 'gold');
}
function exitDrill() {
  S.filter = null;
  $('back-nav').classList.remove('visible');
  $('row-filtered').classList.add('hidden');
  $('search-results').classList.remove('hidden');
  renderSearchResults();
}


// ══════════════════════════════════════════════════════════
//  SEARCH LOGIC
// ══════════════════════════════════════════════════════════
function applySearch(books) {
  const q = S.search.trim().toLowerCase();
  if (!q) return books;
  return books.filter(b =>
    (b.title||'').toLowerCase().includes(q)||
    (b.author||'').toLowerCase().includes(q)||
    (b.category||'').toLowerCase().includes(q)
  );
}

function renderAllRows() {
  const sorted = [...S.books];
  renderRow('books-new', sorted.slice(0, 12));
  renderRow('books-rec', sorted.sort(() => 0.5-Math.random()).slice(0,8));
}

function renderSearchResults() {
  const container = $('search-results');
  if (!container) return;

  const q = S.search.trim();
  const emptyState = $('search-empty');

  if (!q) {
    container.innerHTML = '';
    if (emptyState) container.appendChild(emptyState);
    emptyState?.classList.remove('hidden');
    return;
  }

  emptyState?.classList.add('hidden');

  let results = applySearch(S.books);

  // Apply category filter
  const catVal = $('filter-category')?.value;
  if (catVal) results = results.filter(b => b.category === catVal);

  // Apply publisher filter
  const pubVal = $('filter-publisher')?.value;
  if (pubVal) results = results.filter(b => b.publisherId === pubVal);

  // Apply price sort
  const priceVal = $('filter-price')?.value;
  if (priceVal === 'low') results.sort((a,b)=>(a.price||0)-(b.price||0));
  if (priceVal === 'high') results.sort((a,b)=>(b.price||0)-(a.price||0));

  container.innerHTML = '';
  if (!results.length) {
    container.appendChild(emptyEl('<i class="fa-solid fa-magnifying-glass"></i>',`لا توجد نتائج لـ "${esc(q)}"`, 'جرب كلمات بحث مختلفة'));
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'books-grid';
  results.forEach(b => grid.appendChild(renderBookCard(b)));
  container.appendChild(grid);
}

function initSearch() {
  let t;
  $('main-search')?.addEventListener('input', e => {
    clearTimeout(t);
    t = setTimeout(() => {
      S.search = e.target.value;
      if(S.filter) drillDown(S.filter.type, S.filter.id, S.filter.label);
      else renderSearchResults();
    }, 250);
  });

  // Filter toggle
  const filterBtn = $('search-filter-toggle');
  const filterPanel = $('filter-panel');
  filterBtn?.addEventListener('click', () => {
    filterBtn.classList.toggle('active');
    filterPanel?.classList.toggle('open');
  });

  // Filter changes trigger re-render
  $('filter-price')?.addEventListener('change', () => {
    if(S.filter) drillDown(S.filter.type, S.filter.id, S.filter.label);
    else renderSearchResults();
  });
  $('filter-category')?.addEventListener('change', (e) => {
    if (e.target.value && !S.filter) {
      drillDown('category', e.target.value, e.target.value);
    } else if (!e.target.value) {
      exitDrill();
    }
  });
  $('filter-publisher')?.addEventListener('change', (e) => {
    if (e.target.value && !S.filter) {
      const pub = S.publishers.find(p => p.id === e.target.value);
      drillDown('publisher', e.target.value, pub?.name || e.target.value);
    } else if (!e.target.value) {
      exitDrill();
    }
  });

  // Smart filter pills
  document.querySelectorAll('.filter-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      toast(`فلتر: ${pill.textContent}`, 'gold');
    });
  });
}


// ══════════════════════════════════════════════════════════
//  BOOK DETAIL PANEL
// ══════════════════════════════════════════════════════════
function openDetail(book) {
  const body = $('detail-body');
  const pub = S.publishers.find(p=>p.id===book.publisherId);
  const price = book.price?`${Number(book.price).toLocaleString('ar-SA')} د.ع`:'مجاني';
  const isFav = S.favs.some(f=>f.id===book.id);
  const oos = book.stockQuantity===0;
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
        <tr><td>السعر</td><td style="color:var(--clr-gold);font-weight:800">${price}</td></tr>
        <tr><td>التصنيف</td><td>${esc(book.category||'—')}</td></tr>
        <tr><td>دار النشر</td><td>${esc(pub?.name||book.publisherName||'—')}</td></tr>
        <tr><td>سنة الإصدار</td><td>${esc(book.editionYear||'—')}</td></tr>
        <tr><td>نوع الغلاف</td><td>${esc(book.coverType||'—')}</td></tr>
        <tr><td>الحالة</td><td>${oos?'<span style="color:var(--clr-danger);font-weight:700">غير متوفر</span>':'<span style="color:var(--clr-success);font-weight:700">متوفر</span>'}</td></tr>
      </table>
      <div class="dp-bundle"><i class="fa-solid fa-gift dp-bundle-icon"></i><div class="dp-bundle-text"><div class="dp-bundle-title">حزمة القارئ <i class="fa-solid fa-box"></i></div><div class="dp-bundle-desc">اشتر كتابين إضافيين من نفس الناشر واحصل على خصم 10%</div></div></div>
      <div class="dp-actions">
        ${oos
          ?`<button class="btn btn-primary btn-lg" style="flex:1" id="dp-notify"><i class="fa-solid fa-bell"></i> أخبرني عند التوفر</button>`
          :`<button class="btn btn-gold btn-lg" style="flex:1" id="dp-add-cart"><i class="fa-solid fa-cart-plus"></i> أضف للسلة</button>`
        }
        <button class="btn ${isFav?'btn-gold':'btn-ghost'} btn-lg" id="dp-fav"><i class="fa-${isFav?'solid':'regular'} fa-heart"></i></button>
      </div>
      <!-- Gifting -->
      <div class="gift-row" id="gift-row"><div class="gift-switch" id="gift-switch"></div><span><i class="fa-solid fa-gift"></i> تغليف كهدية فاخرة</span></div>
      <div class="gift-msg" id="gift-msg"><textarea class="gift-msg-input" placeholder="اكتب رسالتك الشخصية هنا..."></textarea></div>
    </div>`;

  // Gallery auto-slide
  if (images.length > 1) {
    let cur = 0;
    const slides = body.querySelectorAll('.gallery-slide');
    const dots = body.querySelectorAll('.gallery-dot');
    function goSlide(n) { slides.forEach((s,i)=>s.classList.toggle('active',i===n)); dots.forEach((d,i)=>d.classList.toggle('active',i===n)); cur=n; }
    dots.forEach(d => d.addEventListener('click', ()=>goSlide(+d.dataset.dot)));
    setInterval(() => goSlide((cur+1)%images.length), 4000);
  }
  // Zoom
  body.querySelectorAll('[data-zoom]').forEach(img => img.addEventListener('click', () => {
    $('zoom-img').src = img.dataset.zoom;
    $('zoom-overlay').classList.add('active');
  }));
  // Actions
  body.querySelector('#dp-add-cart')?.addEventListener('click', () => { addToCart(book); toast(`"${book.title}" أُضيف للسلة`,'success'); });
  body.querySelector('#dp-notify')?.addEventListener('click', () => toast('سيتم إشعارك عند التوفر','gold'));
  body.querySelector('#dp-fav')?.addEventListener('click', () => { toggleFav(book); openDetail(book); });
  // Gift toggle
  const gs = body.querySelector('#gift-switch');
  gs?.addEventListener('click', () => { gs.classList.toggle('on'); body.querySelector('#gift-msg').classList.toggle('open',gs.classList.contains('on')); toast(gs.classList.contains('on')?'تغليف كهدية':'تم إلغاء الهدية','gold'); });

  $('detail-overlay').classList.add('active');
  $('detail-panel').classList.add('active');
  document.body.style.overflow='hidden';
}
function closeDetail() { $('detail-panel').classList.remove('active'); $('detail-overlay').classList.remove('active'); document.body.style.overflow=''; }


// ══════════════════════════════════════════════════════════
//  FAVORITES
// ══════════════════════════════════════════════════════════
function toggleFav(book) {
  if (!currentUser) {
    toast('يرجى تسجيل الدخول أولاً لإضافة كتب للمفضلة', 'warn');
    setTimeout(() => { window.location.href = 'index.html'; }, 1500);
    return;
  }
  const idx = S.favs.findIndex(f=>f.id===book.id);
  if (idx>-1) { S.favs.splice(idx,1); toast(`إزالة "${book.title}" من المفضلة`,'info'); }
  else { S.favs.push({id:book.id,title:book.title,author:book.author,cover:book.cover,price:book.price}); toast(`"${book.title}" في المفضلة`,'success'); }
  persist('nip_favs',S.favs); updateFavUI(); renderAllRows();
}
function updateFavUI() {
  const c = S.favs.length;
  const badge = $('fav-count-badge');
  if (badge) badge.textContent = `(${c})`;
  const navBadge = $('fav-nav-badge');
  if (navBadge) { navBadge.textContent = c; navBadge.classList.toggle('hidden',c===0); }
  const body = $('fav-body');
  if (!body) return;
  body.innerHTML = '';
  if (!c) { body.innerHTML = '<div class="fav-empty" style="text-align:center;padding:2rem;"><i class="fa-regular fa-heart" style="font-size:3rem;opacity:.3;color:var(--gold)"></i><br><span style="color:var(--txt3);display:block;margin-top:8px;">لا توجد كتب في المفضلة</span></div>'; return; }
  S.favs.forEach(f => {
    const d = document.createElement('div'); d.className = 'fav-item';
    d.style = "display:flex;align-items:center;background:rgba(255,255,255,0.03);padding:12px;border-radius:12px;border:1px solid rgba(255,255,255,0.05);gap:12px;";
    d.innerHTML = `<div class="fav-item-cover" style="width:48px;height:72px;border-radius:6px;overflow:hidden;flex-shrink:0;">${f.cover?`<img src="${esc(f.cover)}" style="width:100%;height:100%;object-fit:cover;"/>`:'<div style="display:flex;align-items:center;justify-content:center;height:100%;background:rgba(255,255,255,0.05);color:var(--txt-muted)"><i class="fa-solid fa-book"></i></div>'}</div>
      <div class="fav-item-info" style="flex:1;min-width:0;"><div class="fav-item-title" style="font-weight:600;font-size:.95rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(f.title)}</div><div class="fav-item-author" style="font-size:.8rem;color:var(--txt2);margin-bottom:4px;">${esc(f.author||'')}</div><div class="fav-item-price" style="color:var(--gold);font-weight:700;font-size:.9rem;">${f.price?Number(f.price).toLocaleString('ar-SA')+' د.ع':'مجاني'}</div></div>
      <button class="fav-item-remove" style="background:none;border:none;color:var(--txt-muted);padding:8px;border-radius:8px;cursor:pointer;transition:all 0.3s;"><i class="fa-solid fa-xmark"></i></button>`;
    d.querySelector('.fav-item-remove').addEventListener('click', ()=>{const b=S.books.find(x=>x.id===f.id)||f;toggleFav(b);});
    body.appendChild(d);
  });
}


// ══════════════════════════════════════════════════════════
//  CART / ORDERS
// ══════════════════════════════════════════════════════════
function addToCart(book) {
  if (!currentUser) {
    toast('يرجى تسجيل الدخول أولاً لإضافة كتب للسلة', 'warn');
    setTimeout(() => { window.location.href = 'index.html'; }, 1500);
    return;
  }
  const maxStock = book.stockQuantity ?? Infinity;
  const ex = S.cart.find(i=>i.id===book.id);
  const currentQty = ex ? ex.qty : 0;
  if(currentQty >= maxStock) {
    if (maxStock === 0) toast('عذراً، هذا الكتاب غير متوفر حالياً', 'error');
    return;
  }
  if (ex) ex.qty+=1; else S.cart.push({id:book.id,title:book.title,price:book.price,cover:book.cover,stockQuantity:book.stockQuantity,qty:1});
  persist('nip_cart',S.cart); updateCartUI();
}

function updateCartUI() {
  const count = S.cart.reduce((s,i)=>s+i.qty,0);
  const total = S.cart.reduce((s,i)=>s+(Number(i.price)||0)*i.qty,0);

  // Update bottom nav badge
  const navBadge = $('cart-nav-badge');
  if (navBadge) { navBadge.textContent = count; navBadge.classList.toggle('hidden', count===0); }

  // Update orders count
  const ordersCount = $('orders-count');
  if (ordersCount) ordersCount.textContent = `${count} عنصر`;

  // Update order total
  const subtotal = $('order-subtotal');
  if (subtotal) subtotal.textContent = total>0?`${total.toLocaleString('ar-SA')} د.ع`:'0 د.ع';
  const orderTotal = $('order-total');
  if (orderTotal) orderTotal.textContent = total>0?`${total.toLocaleString('ar-SA')} د.ع`:'0 د.ع';

  // Toggle empty state vs cart content
  const emptyState = $('orders-empty');
  const ordersList = $('orders-list');
  const orderSummary = $('order-summary');
  const trackingSection = $('tracking-section');

  if (!S.cart.length) {
    if (emptyState) emptyState.style.display = '';
    if (ordersList) ordersList.style.display = 'none';
    if (orderSummary) orderSummary.style.display = 'none';
    if (trackingSection) trackingSection.style.display = 'none';
  } else {
    if (emptyState) emptyState.style.display = 'none';
    if (ordersList) ordersList.style.display = '';
    if (orderSummary) orderSummary.style.display = '';
    if (trackingSection) trackingSection.style.display = '';

    // Render cart items
    if (ordersList) {
      ordersList.innerHTML = '';
      S.cart.forEach((item) => {
        const coverSrc = item.cover
          ? `<img src="${esc(item.cover)}" class="cart-item-img"/>`
          : `<div class="cart-item-img" style="display:flex;align-items:center;justify-content:center;font-size:1.3rem;color:var(--txt-muted)"><i class="fa-solid fa-book"></i></div>`;
        const itemPrice = item.price ? `${Number(item.price).toLocaleString('ar-SA')} د.ع` : 'مجاني';
        const itemTotal = item.price ? `${(Number(item.price)*item.qty).toLocaleString('ar-SA')} د.ع` : 'مجاني';
        const el = document.createElement('div');
        el.className = 'cart-item';
        el.innerHTML = `
          ${coverSrc}
          <div class="cart-item-info">
            <div class="cart-item-title">${esc(item.title)}</div>
            <div class="cart-item-price">${itemTotal} <span style="font-size:0.7rem;color:var(--txt-muted);font-weight:400">(${itemPrice} للقطعة)</span></div>
            <div class="cart-item-controls">
              <button class="qty-btn dec" data-id="${item.id}"><i class="fa-solid fa-minus"></i></button>
              <div class="cart-item-qty">${item.qty}</div>
              <button class="qty-btn inc" data-id="${item.id}"><i class="fa-solid fa-plus"></i></button>
            </div>
          </div>
          <button class="cart-item-remove" data-id="${item.id}"><i class="fa-solid fa-trash-can"></i></button>
        `;
        ordersList.appendChild(el);
      });

      // Event listeners for quantity controls
      ordersList.querySelectorAll('.dec').forEach(btn => btn.addEventListener('click', (e) => {
        const it = S.cart.find(i=>i.id===e.currentTarget.dataset.id);
        if(it) { it.qty--; if(it.qty<=0) S.cart = S.cart.filter(i=>i.id!==it.id); persist('nip_cart',S.cart); updateCartUI(); }
      }));
      ordersList.querySelectorAll('.inc').forEach(btn => btn.addEventListener('click', (e) => {
        const it = S.cart.find(i=>i.id===e.currentTarget.dataset.id);
        if(it) {
          const max = it.stockQuantity ?? Infinity;
          if(it.qty >= max) toast('الكمية المطلوبة غير متوفرة','warn');
          else { it.qty++; persist('nip_cart',S.cart); updateCartUI(); }
        }
      }));
      ordersList.querySelectorAll('.cart-item-remove').forEach(btn => btn.addEventListener('click', (e) => {
        S.cart = S.cart.filter(i=>i.id!==e.currentTarget.dataset.id); persist('nip_cart',S.cart); updateCartUI();
      }));
    }
  }
}

// ═══ HAPTIC ═══
function haptic(el) { el.classList.remove('haptic'); void el.offsetWidth; el.classList.add('haptic'); el.addEventListener('animationend',()=>el.classList.remove('haptic'),{once:true}); if(navigator.vibrate)navigator.vibrate([10,20,10]); }


// ══════════════════════════════════════════════════════════
//  AUTH — SUPABASE INTEGRATION
// ══════════════════════════════════════════════════════════

let currentUser = null;

function initAuth() {
  // Check initial session
  supabase.auth.getSession().then(({ data: { session } }) => {
    currentUser = session?.user || null;
    applyAuthUI(currentUser);
  });

  // Listen for auth changes
  supabase.auth.onAuthStateChange((event, session) => {
    currentUser = session?.user || null;
    applyAuthUI(currentUser);
  });

  function applyAuthUI(user) {
    if (user) {
      console.log('User logged in:', user.email || user.phone);
      const openBtn = $('btn-auth-open');
      if (openBtn) openBtn.style.display = 'none';

      const profileInfo = $('account-profile-info');
      if (profileInfo) {
        profileInfo.classList.remove('hidden');
        const meta = user.user_metadata || {};
        $('profile-name').textContent = meta.full_name || 'مستخدم نيپور';
        $('profile-email').textContent = user.email || user.phone || '';

        const photoUrl = meta.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(meta.full_name || 'Nippur')}&background=D4AF37&color=0A0A0A`;
        $('profile-pic').src = photoUrl;

        const dPic = $('drawer-user-pic'); if (dPic) dPic.src = photoUrl;
        const dName = $('drawer-user-name'); if (dName) dName.textContent = meta.full_name || 'مستخدم نيپور';
        const dEmail = $('drawer-user-email'); if (dEmail) dEmail.textContent = user.email || user.phone || '';
        const dLogout = $('drawer-footer-logout'); if (dLogout) dLogout.classList.remove('hidden');
      }

      const favsCard = $('account-favorites');
      if (favsCard) favsCard.classList.remove('hidden');
      const logoutCard = $('logout-card');
      if (logoutCard) logoutCard.classList.remove('hidden');

    } else {
      console.log('User logged out (Guest Mode)');
      const openBtn = $('btn-auth-open');
      if (openBtn) openBtn.style.display = 'block';
      const profileInfo = $('account-profile-info');
      if (profileInfo) profileInfo.classList.add('hidden');

      const dPic = $('drawer-user-pic'); if (dPic) dPic.src = 'https://ui-avatars.com/api/?name=Guest&background=D4AF37&color=0A0A0A';
      const dName = $('drawer-user-name'); if (dName) dName.textContent = 'زائر';
      const dEmail = $('drawer-user-email'); if (dEmail) dEmail.textContent = 'يرجى تسجيل الدخول';
      const dLogout = $('drawer-footer-logout'); if (dLogout) dLogout.classList.add('hidden');
      const favsCard = $('account-favorites');
      if (favsCard) favsCard.classList.add('hidden');
      const logoutCard = $('logout-card');
      if (logoutCard) logoutCard.classList.add('hidden');
    }
  }

  // Profile picture upload
  $('profile-pic-upload')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file || !currentUser) return;
    toast('جاري تحديث الصورة...', 'gold');
    try {
      const filePath = `${currentUser.id}`;
      const { error: upErr } = await supabase.storage.from('profiles').upload(filePath, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from('profiles').getPublicUrl(filePath);
      const url = urlData.publicUrl + '?t=' + Date.now();
      await supabase.auth.updateUser({ data: { avatar_url: url } });
      $('profile-pic').src = url;
      toast('تم تحديث الصورة بنجاح', 'success');
    } catch (err) {
      console.error(err);
      toast('حدث خطأ أثناء تحديث الصورة', 'error');
    }
  });

  // Checkout
  $('cart-checkout')?.addEventListener('click', () => {
    if (!S.cart.length) { toast('السلة فارغة','info'); return; }
    if (!currentUser) {
      toast('يرجى تسجيل الدخول لإتمام الطلب', 'warn');
      setTimeout(() => { window.location.href = 'index.html'; }, 1500);
      return;
    }
    placeOrder();
  });

  // Logout
  $('btn-logout')?.addEventListener('click', async (e) => {
    e.preventDefault();
    await supabase.auth.signOut();
    window.location.href = 'index.html';
  });

  $('btn-logout-account')?.addEventListener('click', async (e) => {
    e.preventDefault();
    await supabase.auth.signOut();
    window.location.href = 'index.html';
  });
}

async function placeOrder() {
  toast('جاري إرسال الطلب...', 'gold');
  try {
    for (const item of S.cart) {
      if (item.stockQuantity !== undefined && item.stockQuantity !== null && item.stockQuantity !== '') {
        const newQty = Math.max(0, (item.stockQuantity || 0) - item.qty);
        await supabase.from('books').update({ "stockQuantity": newQty }).eq('id', item.id);
      }
    }
  } catch (e) { console.warn('Stock update error:', e); }
  S.cart = [];
  persist('nip_cart', S.cart);
  updateCartUI();
  toast('تم تأكيد الطلب بنجاح', 'success');
}


// ══════════════════════════════════════════════════════════
//  ACCOUNT — WALLET, THEME, GPS
// ══════════════════════════════════════════════════════════
function initAccount() {
  // Go browse button (from empty orders)
  $('go-browse')?.addEventListener('click', () => switchView('home'));
}

// ══════════════════════════════════════════════════════════
//  RIGHT-SIDE DRAWER
// ══════════════════════════════════════════════════════════
function initDrawer() {
  const toggleBtn = $('drawer-toggle');
  const panel = $('drawer-panel');
  const overlay = $('drawer-overlay');
  const closeBtn = $('drawer-close');

  function openDrawer() {
    if(panel) panel.classList.add('active');
    if(overlay) overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
  function closeDrawer() {
    if(panel) panel.classList.remove('active');
    if(overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  toggleBtn?.addEventListener('click', openDrawer);
  closeBtn?.addEventListener('click', closeDrawer);
  overlay?.addEventListener('click', closeDrawer);

  // Drawer Nav Items
  $('drawer-nav-account')?.addEventListener('click', (e) => {
    e.preventDefault();
    closeDrawer();
    if (currentUser) switchView('account');
    else window.location.href = 'index.html';
  });

  $('drawer-nav-orders')?.addEventListener('click', (e) => {
    e.preventDefault();
    closeDrawer();
    switchView('purchases');
  });

  $('drawer-nav-favs')?.addEventListener('click', (e) => {
    e.preventDefault();
    closeDrawer();
    if (currentUser) {
      $('fav-overlay')?.classList.add('open');
      $('fav-panel')?.classList.add('open');
      document.body.style.overflow = 'hidden';
    } else {
      toast('يرجى تسجيل الدخول أولاً', 'warn');
    }
  });

  $('drawer-nav-assistant')?.addEventListener('click', (e) => {
    e.preventDefault();
    closeDrawer();
    toast('المساعد الشخصي قريباً...', 'gold');
  });

  $('drawer-nav-settings')?.addEventListener('click', (e) => {
    e.preventDefault();
    closeDrawer();
    switchView('settings');
  });

  $('drawer-btn-logout')?.addEventListener('click', async (e) => {
    e.preventDefault();
    await supabase.auth.signOut();
    window.location.href = 'index.html';
  });
}

// Theme
function initTheme() {
  const btns = document.querySelectorAll('.theme-btn');
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

// ═══ ZOOM ═══
function initZoom() { $('zoom-overlay')?.addEventListener('click',()=>$('zoom-overlay').classList.remove('active')); }


// ══════════════════════════════════════════════════════════
//  "SEE ALL" — Jump to Search
// ══════════════════════════════════════════════════════════
function initSeeAll() {
  $('see-all-new')?.addEventListener('click', () => {
    switchView('search');
    setTimeout(() => {
      S.search = '';
      if($('main-search')) $('main-search').value = '';
      renderSearchResults();
      // Show all books in grid
      const container = $('search-results');
      if (container) {
        container.innerHTML = '';
        const grid = document.createElement('div');
        grid.className = 'books-grid';
        [...S.books].slice(0,24).forEach(b => grid.appendChild(renderBookCard(b)));
        container.appendChild(grid);
      }
    }, 300);
  });

  $('see-all-rec')?.addEventListener('click', () => {
    switchView('search');
  });
}


// ══════════════════════════════════════════════════════════
//  SUPABASE LIVE DATA
// ══════════════════════════════════════════════════════════
async function initFirestore() {
  try {
    const { data: pubs, error: pubErr } = await supabase.from('publishers').select('*').order('weight', { ascending: true });
    if (pubErr) throw pubErr;
    S.publishers = pubs || [];
    renderPubs(S.publishers); renderSponsors(S.publishers);
  } catch (err) {
    console.warn('Supabase publishers:', err.message);
    $('pub-grid').innerHTML = '';
    $('pub-grid').appendChild(emptyEl('<i class="fa-solid fa-plug"></i>','اتصال Supabase','تأكد من تفعيل Supabase'));
  }

  try {
    const { data: books, error: bookErr } = await supabase.from('books').select('*').order('createdAt', { ascending: false });
    if (bookErr) throw bookErr;
    S.books = books || [];
    S.categories.clear(); S.books.forEach(b => b.category && S.categories.add(b.category));
    renderCats(S.books); renderAllRows();
  } catch (err) {
    console.warn('Supabase books:', err.message);
  }
}

// ══════════════════════════════════════════════════════════
//  AUTO SLIDER
// ══════════════════════════════════════════════════════════
function initSlider() {
  const container = $('auto-slider-container');
  const track = $('auto-slider-track');
  if (!container || !track) return;

  supabase.from('homepage_slides').select('*').then(({ data: slidesData, error }) => {
    if (error) { console.warn('Supabase slides:', error.message); return; }

    container.style.display = 'block';
    track.innerHTML = '';

    if (!slidesData || slidesData.length === 0) {
      for (let i = 0; i < 3; i++) {
        const div = document.createElement('div');
        div.className = 'swiper-slide placeholder-slide';
        div.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:var(--clr-gold);opacity:0.4;"><i class="fa-solid fa-image" style="font-size:3rem;margin-bottom:8px;"></i><span style="font-family:'Cairo';font-weight:700;font-size:1.1rem;">\u0645\u0633\u0627\u062d\u0629 \u0625\u0639\u0644\u0627\u0646\u064a\u0629 ${i + 1}</span></div>`;
        track.appendChild(div);
      }
    } else {
      slidesData.forEach((s, i) => {
        const img = document.createElement('img');
        img.src = s.image_url;
        img.className = 'swiper-slide slide-img';
        img.alt = 'Banner ' + (i + 1);
        track.appendChild(img);
      });
    }

    if (window.mySwiperInstance) {
      window.mySwiperInstance.destroy(true, true);
    }

    window.mySwiperInstance = new Swiper('.mySwiper', {
      dir: 'rtl',
      loop: true,
      grabCursor: true,
      spaceBetween: 16,
      autoplay: {
        delay: 5000,
        disableOnInteraction: false,
      },
    });
  });
}

// ══════════════════════════════════════════════════════════
//  BOOT
// ══════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  initBottomNav();
  initTabs();
  initSearch();
  initAuth();
  initAccount();
  initTheme();
  initZoom();
  initSeeAll();
  initFirestore();
  initSlider();
  initDrawer();
  updateCartUI();
  updateFavUI();



  // Detail panel
  $('detail-close')?.addEventListener('click', closeDetail);
  $('detail-overlay')?.addEventListener('click', closeDetail);

  // Fav panel close bugfix
  $('fav-close')?.addEventListener('click', () => {
    $('fav-overlay')?.classList.remove('open');
    $('fav-panel')?.classList.remove('open');
    document.body.style.overflow = '';
  });
  $('fav-overlay')?.addEventListener('click', () => {
    $('fav-overlay')?.classList.remove('open');
    $('fav-panel')?.classList.remove('open');
    document.body.style.overflow = '';
  });

  // Back nav (drill-down)
  $('back-nav')?.addEventListener('click', exitDrill);

  console.log('%c Nippur SPA — Mobile First','color:#D4AF37;font-weight:900;font-size:14px');
});
