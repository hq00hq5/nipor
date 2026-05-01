// ╔══════════════════════════════════════════════════════════════╗
// ║  Nippur — Premium Login Controller (Supabase Auth)          ║
// ║  Email/Phone Auth · Gold Micro-Interactions · Canvas BG     ║
// ╚══════════════════════════════════════════════════════════════╝

const $ = id => document.getElementById(id);

import { supabase } from '../supabase.js';

// ══════════════════════════════════════
//  CUNEIFORM CANVAS BACKGROUND
// ══════════════════════════════════════
(function initCanvas() {
  const canvas = $('cuneiform-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const GLYPHS = '𒀭𒁹𒂗𒃻𒄿𒅀𒆠𒇷𒈗𒉌𒊑𒋗𒌋𒍣𒀸𒁀𒂊𒃼𒄀𒅆𒆳𒇻𒈠𒉡𒊕𒋛𒌌𒍪'.split('');
  let W, H, cols, drops;

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
    const sz = 28;
    cols = Math.floor(W / sz);
    drops = Array.from({ length: cols }, () => Math.random() * H / sz);
  }
  resize();
  window.addEventListener('resize', resize);

  function draw() {
    ctx.fillStyle = 'rgba(6,6,8,0.06)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(212,175,55,0.12)';
    ctx.font = '20px serif';
    for (let i = 0; i < cols; i++) {
      const g = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      ctx.fillText(g, i * 28, drops[i] * 28);
      if (drops[i] * 28 > H && Math.random() > 0.985) drops[i] = 0;
      drops[i] += 0.25;
    }
    requestAnimationFrame(draw);
  }
  draw();
})();

// ══════════════════════════════════════
//  FLOATING GLYPHS
// ══════════════════════════════════════
(function initFloatingGlyphs() {
  const container = $('floating-glyphs');
  if (!container) return;
  const GLYPHS = ['𒀭','𒁹','𒂗','𒃻','𒄿','𒆠','𒇷','𒈗','𒊑','𒋗','𒌋','𒍣'];
  for (let i = 0; i < 15; i++) {
    const el = document.createElement('span');
    el.className = 'floating-glyph';
    el.textContent = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
    el.style.left = Math.random() * 100 + '%';
    el.style.animationDuration = (18 + Math.random() * 30) + 's';
    el.style.animationDelay = (Math.random() * 20) + 's';
    el.style.fontSize = (0.8 + Math.random() * 1.4) + 'rem';
    container.appendChild(el);
  }
})();

// ══════════════════════════════════════
//  TAB SWITCHER (Email / Phone)
// ══════════════════════════════════════
(function initTabs() {
  const tabs = document.querySelectorAll('.auth-tab');
  const indicator = $('tab-indicator');
  const formEmail = $('form-email');
  const formPhone = $('form-phone');

  function setTab(tab) {
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    indicator.style.left = tab.offsetLeft + 'px';
    indicator.style.width = tab.offsetWidth + 'px';
    const target = tab.dataset.tab;
    formEmail.classList.toggle('auth-form--hidden', target !== 'email');
    formPhone.classList.toggle('auth-form--hidden', target !== 'phone');
  }

  tabs.forEach(t => t.addEventListener('click', () => setTab(t)));
  requestAnimationFrame(() => setTab($('tab-email')));
  window.addEventListener('resize', () => {
    const active = document.querySelector('.auth-tab.active');
    if (active && indicator) {
      indicator.style.left = active.offsetLeft + 'px';
      indicator.style.width = active.offsetWidth + 'px';
    }
  });
})();

// ══════════════════════════════════════
//  PASSWORD TOGGLE
// ══════════════════════════════════════
(function initPassToggle() {
  const btn = $('pass-toggle');
  const input = $('input-pass');
  if (!btn || !input) return;
  btn.addEventListener('click', () => {
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    btn.innerHTML = show
      ? '<i class="fa-solid fa-eye-slash"></i>'
      : '<i class="fa-solid fa-eye"></i>';
  });
})();

// ══════════════════════════════════════
//  GOLD SUCCESS MODAL
// ══════════════════════════════════════
function spawnParticles() {
  const c = $('modal-particles');
  c.innerHTML = '';
  for (let i = 0; i < 24; i++) {
    const p = document.createElement('div');
    p.className = 'm-particle';
    const angle = (Math.PI * 2 * i) / 24;
    const dist = 50 + Math.random() * 90;
    const size = 3 + Math.random() * 5;
    p.style.width = size + 'px';
    p.style.height = size + 'px';
    p.style.left = '50%';
    p.style.top = '45%';
    p.style.setProperty('--tx', Math.cos(angle) * dist + 'px');
    p.style.setProperty('--ty', Math.sin(angle) * dist + 'px');
    p.style.setProperty('--dur', (0.5 + Math.random() * 0.5) + 's');
    p.style.setProperty('--del', (Math.random() * 0.25) + 's');
    c.appendChild(p);
  }
}

function showSuccess(title, desc) {
  const overlay = $('modal-overlay');
  $('modal-title').textContent = title || 'مرحبا بك في نيپور';
  $('modal-desc').textContent = desc || 'جاري تحميل مكتبتك...';
  spawnParticles();
  overlay.classList.add('active');
  setTimeout(function() {
    window.location.href = 'library.html';
  }, 1200);
}

// ══════════════════════════════════════
//  FORM HANDLERS (Supabase Auth)
// ══════════════════════════════════════

function setBtnLoading(isLoading) {
  const text = $('btn-login').querySelector('.btn-gold-text');
  const icon = $('btn-login-icon');
  const spinner = $('btn-login-spinner');
  if (isLoading) {
    text.textContent = 'جاري التحقق...';
    icon.style.display = 'none';
    spinner.style.display = 'inline-block';
    $('btn-login').disabled = true;
  } else {
    text.textContent = 'تسجيل بالبريد';
    icon.style.display = 'inline-block';
    spinner.style.display = 'none';
    $('btn-login').disabled = false;
  }
}

function showError(msg) {
  const errDiv = $('email-error');
  errDiv.textContent = msg;
  errDiv.classList.add('visible');
}

function hideError() {
  $('email-error').classList.remove('visible');
}

// Email login
$('form-email').addEventListener('submit', async function(e) {
  e.preventDefault();
  hideError();

  const email = $('input-email').value.trim();
  const password = $('input-pass').value;

  if (!email || !password) {
    showError('يرجى إدخال البريد الإلكتروني وكلمة المرور');
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    showError('صيغة البريد الإلكتروني غير صحيحة');
    return;
  }

  setBtnLoading(true);

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    showSuccess('تم تسجيل الدخول', 'جاري تحميل مكتبتك...');
  } catch (error) {
    setBtnLoading(false);
    console.error('Login error:', error);
    let errorMsg = 'حدث خطأ أثناء تسجيل الدخول';
    if (error.message?.includes('Invalid login credentials')) {
      errorMsg = 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
    } else if (error.message?.includes('Email not confirmed')) {
      errorMsg = 'يرجى تأكيد بريدك الإلكتروني أو تفعيله من لوحة التحكم';
    } else if (error.message?.includes('too many requests')) {
      errorMsg = 'محاولات كثيرة جداً. حاول مرة أخرى لاحقاً.';
    }
    showError(errorMsg);
  }
});

// ══════════════════════════════════════
//  PHONE — placeholder (Supabase phone auth requires Twilio setup)
// ══════════════════════════════════════
function setPhoneLoading(isLoading, btnId) {
  const btn = $(btnId);
  if (!btn) return;
  const text = btn.querySelector('.btn-gold-text');
  const icon = $(btnId + '-icon');
  const spinner = $(btnId + '-spinner');
  if (isLoading) {
    if (btnId === 'btn-otp-send') text.textContent = 'جاري الإرسال...';
    else text.textContent = 'جاري التحقق...';
    icon.style.display = 'none';
    spinner.style.display = 'inline-block';
    btn.disabled = true;
  } else {
    if (btnId === 'btn-otp-send') text.textContent = 'إرسال رمز التحقق';
    else text.textContent = 'تأكيد الدخول';
    icon.style.display = 'inline-block';
    spinner.style.display = 'none';
    btn.disabled = false;
  }
}

function showPhoneError(msg) {
  const errDiv = $('phone-error');
  errDiv.textContent = msg;
  errDiv.classList.add('visible');
}

function hidePhoneError() {
  $('phone-error').classList.remove('visible');
}

$('form-phone').addEventListener('submit', async function(e) {
  e.preventDefault();
  hidePhoneError();

  if ($('phone-step-1').style.display !== 'none') {
    const phone = $('input-phone').value.trim();
    if (!phone) { showPhoneError('يرجى إدخال رقم الهاتف'); return; }
    setPhoneLoading(true, 'btn-otp-send');
    try {
      const { error } = await supabase.auth.signInWithOtp({ phone });
      if (error) throw error;
      $('phone-step-1').style.display = 'none';
      $('phone-step-2').style.display = 'block';
      setPhoneLoading(false, 'btn-otp-send');
    } catch (error) {
      setPhoneLoading(false, 'btn-otp-send');
      console.error('OTP send error:', error);
      showPhoneError('تعذر إرسال الرمز. تأكد من صحة الرقم أو تواصل مع الدعم.');
    }
  } else {
    const code = $('input-otp').value.trim();
    if (!code) { showPhoneError('يرجى إدخال رمز التحقق'); return; }
    const phone = $('input-phone').value.trim();
    setPhoneLoading(true, 'btn-otp-verify');
    try {
      const { error } = await supabase.auth.verifyOtp({ phone, token: code, type: 'sms' });
      if (error) throw error;
      showSuccess('تم تسجيل الدخول بنجاح', 'جاري تحميل مكتبتك...');
    } catch (error) {
      setPhoneLoading(false, 'btn-otp-verify');
      console.error('OTP verify error:', error);
      showPhoneError('الرمز غير صحيح، يرجى التأكد والمحاولة مجدداً');
    }
  }
});

$('btn-phone-back').addEventListener('click', function() {
  hidePhoneError();
  $('phone-step-2').style.display = 'none';
  $('phone-step-1').style.display = 'block';
  $('input-otp').value = '';
});

$('btn-register').addEventListener('click', function() {
  window.location.href = 'register.html';
});

$('btn-guest').addEventListener('click', function() {
  showSuccess('وضع الزائر', 'استمتع بتصفح المكتبة...');
});

$('forgot-link').addEventListener('click', async function(e) {
  e.preventDefault();
  const email = $('input-email').value.trim();
  if (!email) { showError('أدخل بريدك الإلكتروني أولاً لاستعادة كلمة المرور'); return; }
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
    showSuccess('تم إرسال رابط الاستعادة', 'تحقق من بريدك الإلكتروني');
  } catch (err) {
    showError('خطأ أثناء إرسال رابط الاستعادة');
  }
});

$('input-email').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') { e.preventDefault(); $('input-pass').focus(); }
});

console.log('%c Nippur Login — Supabase Auth', 'color:#D4AF37;font-weight:900;font-size:14px;background:#0A0A0A;padding:4px 12px;border-radius:4px');
