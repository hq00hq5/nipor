// ╔══════════════════════════════════════════════════════════╗
// ║  Nippur Admin — Final Vision with Firebase Storage      ║
// ║  CRUD: publishers (icon upload), books (cover+gallery)  ║
// ║  Categories overview · Live Firestore sync              ║
// ╚══════════════════════════════════════════════════════════╝
import {
  db,
  collection, addDoc, getDocs, onSnapshot,
  doc, deleteDoc, updateDoc, query, orderBy,
  serverTimestamp
} from '../firebase.js';

// ═══ STATE ═══
const ST = { publishers:[], books:[] };
const $=id=>document.getElementById(id);
function esc(s){return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
function setLoading(btn,on){const sp=btn.querySelector('.btn-spinner'),tx=btn.querySelector('.btn-text');btn.disabled=on;sp?.classList.toggle('hidden',!on);if(tx)tx.style.opacity=on?'0.6':'1'}
function animC(id,v){const el=$(id);if(!el)return;let c=0;const t=+v;if(isNaN(t)){el.textContent=v;return}const s=Math.max(1,Math.ceil(t/30));const i=setInterval(()=>{c=Math.min(c+s,t);el.textContent=c;if(c>=t)clearInterval(i)},20)}

// ═══ TOAST ═══
function toast(msg,type='info',dur=3200){
  const ic={info:'<i class="fa-solid fa-circle-info"></i>',success:'<i class="fa-solid fa-circle-check"></i>',error:'<i class="fa-solid fa-circle-xmark"></i>',warn:'<i class="fa-solid fa-triangle-exclamation"></i>',gold:'<i class="fa-solid fa-star"></i>'};
  const el=document.createElement('div');el.className=`toast toast-${type}`;
  el.innerHTML=`<span>${ic[type]||ic.info}</span><span>${msg}</span>`;
  $('toastContainer').appendChild(el);
  setTimeout(()=>{el.classList.add('removing');el.addEventListener('animationend',()=>el.remove())},dur);
}

// ═══ CONVERT TO BASE64 ═══
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}

// Preview helper
function previewFiles(input, previewEl) {
  previewEl.innerHTML='';
  if(!input.files?.length) return;
  [...input.files].forEach(f=>{
    const url=URL.createObjectURL(f);
    const img=document.createElement('img');img.className='file-preview-thumb';img.src=url;
    previewEl.appendChild(img);
  });
}

// ═══ NAV ═══
const SECTIONS=['overview','publishers','books','categories'];
const CRUMBS={overview:'نظرة عامة',publishers:'دور النشر',books:'الكتب',categories:'التصنيفات'};
function showSection(id){SECTIONS.forEach(s=>{$(`section-${s}`)?.classList.toggle('active',s===id);$(`nav-${s}`)?.classList.toggle('active',s===id)});$('breadcrumb-text').textContent=CRUMBS[id]||id}
function initNav(){SECTIONS.forEach(id=>{const n=$(`nav-${id}`);n?.addEventListener('click',e=>{e.preventDefault();showSection(id)})});showSection('overview')}

// ═══ PUBLISHER FORM ═══
function initPubForm() {
  const form=$('pub-form'),btn=$('pub-submit'),editId=$('pub-edit-id'),cancel=$('cancel-edit-pub'),title=$('pub-form-title');
  const fileInput=$('pub-icon-file'),preview=$('pub-icon-preview');
  fileInput?.addEventListener('change',()=>{$('pub-icon-label').textContent=fileInput.files[0]?.name||'اختر صورة';previewFiles(fileInput,preview)});
  cancel?.addEventListener('click',()=>{form.reset();editId.value='';title.textContent='إضافة دار نشر';cancel.classList.add('hidden');preview.innerHTML=''});
  form?.addEventListener('submit',async e=>{
    e.preventDefault();

    // ── Validate required fields ──
    const name=$('pub-name').value.trim();
    if(!name){toast('أدخل اسم الناشر','error');return}

    const weight=parseInt($('pub-weight').value)||1;
    const bio=$('pub-bio').value.trim();
    let icon=$('pub-icon-url').value.trim();

    setLoading(btn,true);
    console.log('Attempting to save...');
    try{
      // ── Convert to Base64 if provided ──
      if(fileInput.files && fileInput.files[0]){
        try {
          toast('جاري تحويل الشعار…','gold');
          icon = await fileToBase64(fileInput.files[0]);
        } catch(uploadErr) {
          console.warn("Conversion failed, proceeding with text only", uploadErr);
          toast('فشل تحويل الصورة، سيتم الحفظ بدونها','warn');
          icon = '';
        }
      }

      // ── Build document data ──
      const data = {
        name: name,
        icon: icon || '',
        weight: weight,
        bio: bio || '',
        updatedAt: serverTimestamp()
      };

      console.log('[SAVE] Publisher:', { editId: editId.value || '(new)', ...data, updatedAt: '(serverTimestamp)' });

      if(editId.value){
        await updateDoc(doc(db,'publishers',editId.value), data);
        toast(`تم تحديث "${name}"`,'success');
      } else {
        data.createdAt = serverTimestamp();
        const docRef = await addDoc(collection(db,'publishers'), data);
        console.log('[OK] Publisher saved with ID:', docRef.id);
        toast(`تمت إضافة "${name}"`,'success');
      }

      console.log('Save successful!');
      // ── Reset form ──
      form.reset();editId.value='';title.textContent='إضافة دار نشر';cancel?.classList.add('hidden');preview.innerHTML='';
    } catch(err) {
      alert(`Save Failed (Publisher)! EXACT ERROR:\n${err.message}\nCode: ${err.code}`);
      // ── Decode specific Firestore errors ──
      const code = err.code || '';
      if(code === 'permission-denied'){
        toast('صلاحيات Firestore: تأكد من فتح القواعد في Firebase Console','error',6000);
      } else if(code === 'unauthenticated') {
        toast('غير مصادق — سجل الدخول أولاً','error',5000);
      } else if(code === 'unavailable' || code === 'deadline-exceeded') {
        toast('خطأ اتصال — تحقق من الإنترنت','error',5000);
      } else {
        toast(`خطأ: ${err.message}`,'error',5000);
      }
      console.error('[ERR] Publisher save failed:', { code, message: err.message, stack: err.stack });
    }
    finally{setLoading(btn,false)}
  });
}

// ═══ PUBLISHERS TABLE ═══
function renderPubs(pubs){
  const tbody=$('pub-tbody'),empty=$('pub-empty');if(!tbody)return;
  tbody.querySelectorAll('tr[data-row]').forEach(r=>r.remove());
  if(!pubs.length){empty?.classList.remove('hidden');return}empty?.classList.add('hidden');
  pubs.forEach(p=>{
    const tr=document.createElement('tr');tr.dataset.row=p.id;
    const av=p.icon?`<img src="${esc(p.icon)}"/>`:'<i class="fa-solid fa-building-columns" style="color:var(--clr-gold)"></i>';
    tr.innerHTML=`<td><div class="row-main"><div class="row-avatar">${av}</div><div><div class="row-name">${esc(p.name)}</div><div class="row-sub">${p.bio?p.bio.slice(0,30)+'…':'—'}</div></div></div></td>
      <td>${p.weight||1}</td><td>${p.bio?esc(p.bio.slice(0,50))+'…':'—'}</td>
      <td><div style="display:flex;gap:6px"><button class="btn btn-secondary btn-sm" data-edit="${p.id}"><i class="fa-solid fa-pen"></i></button><button class="btn btn-danger btn-sm" data-del="${p.id}"><i class="fa-solid fa-trash"></i></button></div></td>`;
    tr.querySelector('[data-edit]').addEventListener('click',()=>{
      $('pub-edit-id').value=p.id;$('pub-name').value=p.name||'';$('pub-icon-url').value=p.icon||'';$('pub-weight').value=p.weight||1;$('pub-bio').value=p.bio||'';
      $('pub-form-title').textContent=`تعديل: ${p.name}`;$('cancel-edit-pub')?.classList.remove('hidden');showSection('publishers');$('pub-form')?.scrollIntoView({behavior:'smooth'});
    });
    tr.querySelector('[data-del]').addEventListener('click',async()=>{if(!confirm(`حذف "${p.name}"؟`))return;try{await deleteDoc(doc(db,'publishers',p.id));toast(`حذف "${p.name}"`,'warn')}catch(e){console.error('Delete publisher error:',e);toast(`خطأ: ${e.message}`,'error')}});
    tbody.appendChild(tr);
  });
}

// ═══ BOOK FORM ═══
function initBookForm(){
  const form=$('book-form'),btn=$('book-submit'),editId=$('book-edit-id'),cancel=$('cancel-edit-book'),title=$('book-form-title');
  const coverFile=$('book-cover-file'),coverPreview=$('book-cover-preview');
  const galleryFile=$('book-gallery-file'),galleryPreview=$('book-gallery-preview');
  coverFile?.addEventListener('change',()=>{$('book-cover-label').textContent=coverFile.files[0]?.name||'اختر صورة';previewFiles(coverFile,coverPreview)});
  galleryFile?.addEventListener('change',()=>{$('book-gallery-label').textContent=`${galleryFile.files.length} صورة`;previewFiles(galleryFile,galleryPreview)});
  cancel?.addEventListener('click',()=>{form.reset();editId.value='';title.textContent='إضافة كتاب';cancel.classList.add('hidden');coverPreview.innerHTML='';galleryPreview.innerHTML=''});
  form?.addEventListener('submit',async e=>{
    e.preventDefault();

    // ── Validate required fields ──
    const t=$('book-title').value.trim();
    const a=$('book-author').value.trim();
    const cat=$('book-category').value;
    const pubId=$('book-publisher').value;

    if(!t){toast('أدخل عنوان الكتاب','error');return}
    if(!a){toast('أدخل اسم المؤلف','error');return}
    if(!cat){toast('اختر التصنيف','error');return}
    if(!pubId){toast('اختر دار النشر','error');return}

    const pub=ST.publishers.find(p=>p.id===pubId);

    // ── Parse numeric fields safely ──
    const priceRaw = $('book-price').value;
    const price = priceRaw !== '' ? parseFloat(priceRaw) : 0;
    if(isNaN(price) || price < 0) { toast('السعر غير صالح','error'); return; }

    const stockRaw = $('book-stock').value;
    const stock = stockRaw !== '' ? parseInt(stockRaw) : null;
    if(stockRaw !== '' && (isNaN(stock) || stock < 0)) { toast('المخزون غير صالح','error'); return; }

    const editionYear=$('book-edition').value||'';
    const coverType=$('book-cover-type').value||'';
    let cover=$('book-cover-url').value.trim();
    let gallery=[];

    setLoading(btn,true);
    console.log('Attempting to save...');
    try{
      // ── Convert cover to Base64 ──
      if(coverFile.files && coverFile.files[0]){
        try {
          toast('جاري تحويل الغلاف…','gold');
          cover = await fileToBase64(coverFile.files[0]);
        } catch(uploadErr) {
          console.warn("Cover conversion failed, proceeding with text only", uploadErr);
          toast('فشل تحويل الغلاف، سيتم الحفظ بدون صورة','warn');
          cover = '';
        }
      }

      // ── Convert gallery images sequentially to Base64 ──
      if(galleryFile.files && galleryFile.files.length > 0){
        toast(`جاري تحويل ${galleryFile.files.length} صورة…`,'gold');
        for(let i = 0; i < galleryFile.files.length; i++){
          try {
            const f = galleryFile.files[i];
            const base64Str = await fileToBase64(f);
            if(base64Str) gallery.push(base64Str);
          } catch(galErr) {
            console.warn(`Gallery conversion failed for image ${i}`, galErr);
          }
        }
      }

      // ── Build document (ensure no undefined/NaN values) ──
      const data = {
        title: t,
        author: a,
        cover: cover || '',
        gallery: gallery,
        price: price,
        category: cat,
        publisherId: pubId,
        publisherName: pub?.name || '',
        stockQuantity: stock,
        editionYear: editionYear,
        coverType: coverType,
        updatedAt: serverTimestamp()
      };

      console.log('[SAVE] Book:', { editId: editId.value || '(new)', title: t, author: a, price, stockQuantity: stock, category: cat, publisherId: pubId, coverUrl: cover ? cover.substring(0,50)+'...' : '(none)', galleryCount: gallery.length });

      if(editId.value){
        await updateDoc(doc(db,'books',editId.value), data);
        toast(`تم تحديث "${t}"`,'success');
      } else {
        data.createdAt = serverTimestamp();
        const docRef = await addDoc(collection(db,'books'), data);
        console.log('[OK] Book saved with ID:', docRef.id);
        toast(`تمت إضافة "${t}"`,'success');
      }

      console.log('Save successful!');
      // ── Reset form ──
      form.reset();editId.value='';title.textContent='إضافة كتاب';cancel?.classList.add('hidden');coverPreview.innerHTML='';galleryPreview.innerHTML='';
    } catch(e) {
      alert(`Save Failed (Book)! EXACT ERROR:\n${e.message}\nCode: ${e.code}`);
      // ── Decode specific Firestore errors ──
      const code = e.code || '';
      if(code === 'permission-denied'){
        toast('صلاحيات Firestore: تأكد من فتح القواعد في Firebase Console','error',6000);
      } else if(code === 'unauthenticated') {
        toast('غير مصادق — سجل الدخول أولاً','error',5000);
      } else if(code === 'unavailable' || code === 'deadline-exceeded') {
        toast('خطأ اتصال — تحقق من الإنترنت','error',5000);
      } else {
        toast(`خطأ: ${e.message}`,'error',5000);
      }
      console.error('[ERR] Book save failed:', { code, message: e.message, stack: e.stack });
    }
    finally{setLoading(btn,false)}
  });
}

// ═══ BOOKS TABLE ═══
function renderBooks(books){
  const tbody=$('book-tbody'),empty=$('book-empty');if(!tbody)return;
  tbody.querySelectorAll('tr[data-row]').forEach(r=>r.remove());
  if(!books.length){empty?.classList.remove('hidden');return}empty?.classList.add('hidden');
  books.forEach(b=>{
    const tr=document.createElement('tr');tr.dataset.row=b.id;
    const price=b.price?`${Number(b.price).toLocaleString('ar-SA')} د.ع`:'مجاني';
    const stockS=b.stockQuantity===0?'<span class="status-pill status-oos">نفذ</span>':(b.stockQuantity!=null?`<span class="status-pill status-active">${b.stockQuantity}</span>`:'<span class="status-pill status-active">∞</span>');
    tr.innerHTML=`<td><div class="row-main"><div class="row-avatar">${b.cover?`<img src="${esc(b.cover)}"/>`:'<i class="fa-solid fa-book" style="color:var(--clr-gold)"></i>'}</div><div class="row-name">${esc(b.title)}</div></div></td>
      <td>${esc(b.author||'—')}</td><td><span class="status-pill status-active">${esc(b.category||'—')}</span></td>
      <td>${price}</td><td>${stockS}</td>
      <td><div style="display:flex;gap:6px"><button class="btn btn-secondary btn-sm" data-edit="${b.id}"><i class="fa-solid fa-pen"></i></button><button class="btn btn-danger btn-sm" data-del="${b.id}"><i class="fa-solid fa-trash"></i></button></div></td>`;
    tr.querySelector('[data-edit]').addEventListener('click',()=>{
      $('book-edit-id').value=b.id;$('book-title').value=b.title||'';$('book-author').value=b.author||'';
      $('book-cover-url').value=b.cover||'';$('book-price').value=b.price||0;$('book-category').value=b.category||'';
      $('book-publisher').value=b.publisherId||'';$('book-stock').value=b.stockQuantity??'';
      $('book-edition').value=b.editionYear||'';$('book-cover-type').value=b.coverType||'';
      $('book-form-title').textContent=`تعديل: ${b.title}`;$('cancel-edit-book')?.classList.remove('hidden');
      showSection('books');$('book-form')?.scrollIntoView({behavior:'smooth'});
    });
    tr.querySelector('[data-del]').addEventListener('click',async()=>{if(!confirm(`حذف "${b.title}"؟`))return;try{await deleteDoc(doc(db,'books',b.id));toast(`حذف "${b.title}"`,'warn')}catch(e){console.error('Delete book error:',e);toast(`خطأ: ${e.message}`,'error')}});
    tbody.appendChild(tr);
  });
}

// ═══ CATEGORIES ═══
const CAT_ICONS=['<i class="fa-solid fa-book-open"></i>','<i class="fa-solid fa-landmark"></i>','<i class="fa-solid fa-flask"></i>','<i class="fa-solid fa-brain"></i>','<i class="fa-solid fa-briefcase"></i>','<i class="fa-solid fa-laptop-code"></i>','<i class="fa-solid fa-feather-pointed"></i>','<i class="fa-solid fa-leaf"></i>','<i class="fa-solid fa-child-reaching"></i>','<i class="fa-solid fa-scale-balanced"></i>'];
const CAT_COLORS=['#D4AF37','#f5576c','#4facfe','#43e97b','#fa709a','#30cfd0','#a18cd1','#e0c3fc','#fccb90','#f7797d'];
function renderCats(books){
  const grid=$('cats-grid'),empty=$('cats-empty');if(!grid)return;grid.innerHTML='';
  const counts={};books.forEach(b=>{if(b.category)counts[b.category]=(counts[b.category]||0)+1});
  if(!Object.keys(counts).length){empty?.classList.remove('hidden');return}empty?.classList.add('hidden');
  const cats=['رواية','تاريخ','علوم','فلسفة','أعمال','تقنية','أدب','شعر','طفل','سياسة'];
  Object.entries(counts).sort((a,b)=>b[1]-a[1]).forEach(([cat,cnt])=>{
    const ci=cats.indexOf(cat),clr=ci>-1?CAT_COLORS[ci]:'#D4AF37',ic=ci>-1?CAT_ICONS[ci]:'<i class="fa-solid fa-book"></i>';
    const card=document.createElement('div');
    card.style.cssText='background:white;border:1px solid var(--clr-border);border-radius:var(--r-xl);padding:var(--sp-lg);display:flex;align-items:center;gap:var(--sp-md);transition:all .3s ease;cursor:default';
    card.innerHTML=`<div style="width:44px;height:44px;border-radius:var(--r-lg);background:${clr}1a;display:flex;align-items:center;justify-content:center;font-size:1.4rem;flex-shrink:0">${ic}</div><div><div style="font-weight:700;font-size:0.95rem">${esc(cat)}</div><div style="font-size:0.78rem;color:var(--txt-muted)">${cnt} كتاب</div></div>`;
    card.addEventListener('mouseenter',()=>{card.style.transform='translateY(-3px)';card.style.boxShadow='var(--shadow-md)'});
    card.addEventListener('mouseleave',()=>{card.style.transform='';card.style.boxShadow=''});
    grid.appendChild(card);
  });
}

// ═══ PUBLISHER SELECT ═══
function populateSelect(pubs){
  const sel=$('book-publisher');if(!sel)return;const prev=sel.value;
  sel.innerHTML='<option value="">— اختر —</option>';
  pubs.forEach(p=>{const o=document.createElement('option');o.value=p.id;o.textContent=p.name;sel.appendChild(o)});
  if(prev)sel.value=prev;
}

// ═══ FIRESTORE LIVE SYNC ═══
function initFirestore(){
  console.log('[INIT] Connecting to Firestore...');

  // ── Publishers listener ──
  const pubQ=query(collection(db,'publishers'),orderBy('weight','asc'));
  onSnapshot(pubQ,snap=>{
    console.log(`[SYNC] Publishers snapshot: ${snap.size} docs`);
    $('firebase-status-text').textContent='Firebase متصل';
    ST.publishers=snap.docs.map(d=>({id:d.id,...d.data()}));
    renderPubs(ST.publishers);populateSelect(ST.publishers);animC('admin-stat-pubs',ST.publishers.length);
  },err=>{
    const code = err.code || '';
    console.error('[ERR] Firestore publishers error:', { code, message: err.message });
    $('firebase-status-text').textContent='غير متصل';
    if(code === 'permission-denied') {
      toast('قواعد Firestore تمنع القراءة — افتح القواعد في Firebase Console','error',8000);
    } else if(code === 'failed-precondition') {
      toast('Firestore يحتاج فهرس — تحقق من Console','error',6000);
    } else {
      toast('Firestore: '+err.message,'error',6000);
    }
  });

  // ── Books listener ──
  const booksQ=query(collection(db,'books'),orderBy('createdAt','desc'));
  onSnapshot(booksQ,snap=>{
    console.log(`[SYNC] Books snapshot: ${snap.size} docs`);
    ST.books=snap.docs.map(d=>({id:d.id,...d.data()}));
    renderBooks(ST.books);renderCats(ST.books);
    animC('admin-stat-books',ST.books.length);
    animC('admin-stat-cats',new Set(ST.books.map(b=>b.category).filter(Boolean)).size);
  },err=>{
    const code = err.code || '';
    console.error('[ERR] Firestore books error:', { code, message: err.message });
    if(code === 'permission-denied') {
      toast('قواعد Firestore تمنع قراءة الكتب','error',6000);
    } else if(code === 'failed-precondition') {
      toast('الكتب تحتاج فهرس createdAt — تحقق من Console','error',6000);
    } else {
      toast('خطأ الكتب: '+err.message,'error',5000);
    }
  });
}

// ═══ BOOT ═══
document.addEventListener('DOMContentLoaded',()=>{
  initNav();initPubForm();initBookForm();initFirestore();
  console.log('%c Nippur Admin — Royal Black Edition','color:#D4AF37;font-weight:900;font-size:14px');
});
