const $ = id => document.getElementById(id);

import { supabase } from '../supabase.js';

// ══════════════════════════════════════
//  CUNEIFORM CANVAS BACKGROUND
// ══════════════════════════════════════
const canvas = $('cuneiform-canvas');
const ctx = canvas.getContext('2d');
const chars = ['𒀭','𒈨','𒂗','𒆤','𒆠','𒀀','𒈾','𒀭','𒆠','𒈗','ล','ฒ','ณ','ญ','ฐ','ฤ','ฦ'];

let w, h, drops = [];

function resize() {
  w = canvas.width = window.innerWidth;
  h = canvas.height = window.innerHeight;
  const columns = Math.floor(w / 20);
  drops = Array(columns).fill(0).map(() => Math.random() * -100);
}
window.addEventListener('resize', resize);
resize();

function draw() {
  ctx.fillStyle = 'rgba(6, 6, 8, 0.1)';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(212, 175, 55, 0.15)';
  ctx.font = '14px serif';
  for (let i = 0; i < drops.length; i++) {
    const text = chars[Math.floor(Math.random() * chars.length)];
    ctx.fillText(text, i * 20, drops[i] * 20);
    if (drops[i] * 20 > h && Math.random() > 0.975) drops[i] = 0;
    drops[i]++;
  }
}
setInterval(draw, 50);

// ══════════════════════════════════════
//  FLOATING GLYPHS
// ══════════════════════════════════════
function createFloatingGlyphs() {
  const container = $('floating-glyphs');
  for (let i = 0; i < 8; i++) {
    const glyph = document.createElement('div');
    glyph.className = 'floating-glyph';
    glyph.textContent = chars[Math.floor(Math.random() * chars.length)];
    glyph.style.left = `${Math.random() * 100}%`;
    glyph.style.top = `${Math.random() * 100}%`;
    glyph.style.animationDuration = `${15 + Math.random() * 20}s`;
    glyph.style.animationDelay = `${Math.random() * 5}s`;
    container.appendChild(glyph);
  }
}
createFloatingGlyphs();

// ══════════════════════════════════════
//  MODAL / SUCCESS
// ══════════════════════════════════════
function spawnParticles() {
  const container = $('modal-particles');
  container.innerHTML = '';
  for(let i=0; i<20; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const angle = Math.random() * Math.PI * 2;
    const dist = 50 + Math.random() * 100;
    p.style.setProperty('--tx', `${Math.cos(angle)*dist}px`);
    p.style.setProperty('--ty', `${Math.sin(angle)*dist}px`);
    p.style.left = '50%'; p.style.top = '50%';
    container.appendChild(p);
  }
}

function showSuccess(title, desc, redirectTo = 'library.html') {
  const overlay = $('modal-overlay');
  $('modal-title').textContent = title || 'مرحبا بك في نيپور';
  $('modal-desc').textContent = desc || 'جاري تحميل مكتبتك...';
  spawnParticles();
  overlay.classList.add('active');
  setTimeout(function() {
    window.location.href = redirectTo;
  }, redirectTo === 'index.html' ? 2500 : 1200);
}

// ══════════════════════════════════════
//  FORM LOGIC
// ══════════════════════════════════════

function setBtnLoading(isLoading) {
  const btn = $('btn-register-submit');
  const text = btn.querySelector('.btn-gold-text');
  const icon = $('btn-register-icon');
  const spinner = $('btn-register-spinner');
  if (isLoading) {
    text.textContent = 'جاري الإنشاء...';
    icon.style.display = 'none';
    spinner.style.display = 'inline-block';
    btn.disabled = true;
  } else {
    text.textContent = 'إنشاء الحساب';
    icon.style.display = 'inline-block';
    spinner.style.display = 'none';
    btn.disabled = false;
  }
}

function showError(msg) {
  const errDiv = $('register-error');
  errDiv.textContent = msg;
  errDiv.classList.add('visible');
}

function hideError() {
  $('register-error').classList.remove('visible');
}

// Toggle password visibility
$('pass-toggle').addEventListener('click', function() {
  const input = $('input-pass');
  const icon = this.querySelector('i');
  if (input.type === 'password') {
    input.type = 'text';
    icon.className = 'fa-solid fa-eye-slash';
  } else {
    input.type = 'password';
    icon.className = 'fa-solid fa-eye';
  }
});
$('pass-conf-toggle').addEventListener('click', function() {
  const input = $('input-pass-conf');
  const icon = this.querySelector('i');
  if (input.type === 'password') {
    input.type = 'text';
    icon.className = 'fa-solid fa-eye-slash';
  } else {
    input.type = 'password';
    icon.className = 'fa-solid fa-eye';
  }
});

// Real-time password validation hint
const passInput = $('input-pass');
const passHint = $('password-hint');

passInput.addEventListener('input', function() {
  const val = this.value;
  if (!val) {
    passHint.style.display = 'none';
    return;
  }

  const hasMinLength = val.length >= 8;
  const hasUpper = /[A-Z]/.test(val);
  const hasNumber = /[0-9]/.test(val);
  const hasSpecial = /[@#$!%*?&]/.test(val);

  if (hasMinLength && hasUpper && hasNumber && hasSpecial) {
    passHint.style.color = '#10B981';
    passHint.textContent = 'كلمة المرور قوية ومطابقة للشروط.';
  } else {
    passHint.style.color = 'var(--txt3)';
    passHint.textContent = 'يجب أن تحتوي كلمة المرور على 8 أحرف، حرف كبير، رقم، ورمز خاص (@#$!%*?&).';
    passHint.style.display = 'block';
  }
});

$('form-register').addEventListener('submit', async function(e) {
  e.preventDefault();
  hideError();

  const name = $('input-name').value.trim();
  const email = $('input-email').value.trim();
  const password = passInput.value;
  const passConf = $('input-pass-conf').value;

  if (!name || !email || !password || !passConf) {
    showError('يرجى تعبئة كافة الحقول');
    return;
  }

  if (password !== passConf) {
    showError('كلمتا المرور غير متطابقتين');
    return;
  }

  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[@#$!%*?&]/.test(password);

  if (!hasMinLength || !hasUpper || !hasNumber || !hasSpecial) {
    showError('كلمة المرور ضعيفة، يرجى مراجعة الشروط المطلوبة.');
    passHint.style.display = 'block';
    passHint.style.color = 'var(--clr-danger)';
    return;
  }

  setBtnLoading(true);

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } }
    });

    if (error) throw error;

    // Insert profile record
    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        name,
        email
      });
    }

    showSuccess('تم إنشاء الحساب بنجاح', 'مرحبا بك في عائلة نيپور', 'library.html');
  } catch (error) {
    setBtnLoading(false);
    console.error('Register error:', error);
    let errorMsg = 'حدث خطأ أثناء إنشاء الحساب';
    if (error.message?.includes('already registered') || error.message?.includes('already been registered')) {
      errorMsg = 'البريد الإلكتروني مسجل مسبقاً، قم بتسجيل الدخول.';
    } else if (error.message?.includes('invalid')) {
      errorMsg = 'صيغة البريد الإلكتروني غير صحيحة.';
    } else if (error.message?.includes('weak')) {
      errorMsg = 'كلمة المرور ضعيفة جداً.';
    }
    showError(errorMsg);
  }
});
