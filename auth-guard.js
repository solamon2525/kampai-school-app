// ════════════════════════════════════════════════
//  auth-guard.js — ใช้ร่วมกันทุกหน้า
//  include หลัง Firebase SDK scripts
// ════════════════════════════════════════════════
(function(){
  const FB_CONFIG={
    apiKey:"AIzaSyBSUa3gj5l2VSYoUnVFXQwF0OX2SJe6Szc",
    authDomain:"kampai-school-app.firebaseapp.com",
    databaseURL:"https://kampai-school-app-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId:"kampai-school-app"
  };
  if(!firebase.apps.length)firebase.initializeApp(FB_CONFIG);
  window._auth=firebase.auth();
  window._db=firebase.database();
})();

// ── AUTH GUARD ──
// mode: 'read-only' | 'require-login'
// 'read-only'    = ทุกคนดูได้ แต่ปุ่มแก้ไขซ่อน/disabled จนกว่าจะ login
// 'require-login' = ต้อง login ก่อนถึงจะเข้าหน้าได้ (redirect ถ้าไม่ login)
window.AuthGuard = {
  mode: 'read-only',
  user: null,
  isLoggedIn: false,
  onLoginCallbacks: [],

  init(mode='read-only'){
    this.mode = mode;
    _auth.onAuthStateChanged(user=>{
      this.user = user;
      this.isLoggedIn = !!user;
      this._applyState();
      this.onLoginCallbacks.forEach(fn=>fn(user));
    });
  },

  // เรียกหลัง init เพื่อ react ต่อ auth change
  onChange(fn){ this.onLoginCallbacks.push(fn); },

  _applyState(){
    const user = this.user;
    const bar = document.getElementById('auth-bar');
    if(bar){
      if(user){
        bar.innerHTML = `
          <div class="auth-bar-inner auth-bar-in">
            <span class="auth-dot auth-dot-on"></span>
            <span class="auth-email">${user.email}</span>
            <span class="auth-role">ครู / เจ้าหน้าที่</span>
            <button class="auth-logout-btn" onclick="AuthGuard.logout()">ออกจากระบบ</button>
          </div>`;
      } else {
        bar.innerHTML = `
          <div class="auth-bar-inner auth-bar-out">
            <span class="auth-dot auth-dot-off"></span>
            <span class="auth-guest">ดูข้อมูลอย่างเดียว</span>
            <button class="auth-login-btn" onclick="AuthGuard.showLogin()">🔐 เข้าสู่ระบบ</button>
          </div>`;
      }
    }

    if(this.mode === 'require-login' && !user){
      this._showLoginOverlay();
      return;
    }

    // ซ่อน/แสดงปุ่มที่ต้องการ login
    document.querySelectorAll('[data-auth="write"]').forEach(el=>{
      el.style.display = user ? '' : 'none';
    });
    document.querySelectorAll('[data-auth="write-disable"]').forEach(el=>{
      el.disabled = !user;
      el.style.opacity = user ? '' : '.4';
      el.style.pointerEvents = user ? '' : 'none';
    });
    document.querySelectorAll('[data-auth="hide-guest"]').forEach(el=>{
      el.style.display = user ? '' : 'none';
    });
    document.querySelectorAll('[data-auth="show-guest"]').forEach(el=>{
      el.style.display = user ? 'none' : '';
    });

    // ลบ overlay ถ้า login แล้ว
    const ov = document.getElementById('login-overlay');
    if(ov && user) ov.remove();
  },

  _showLoginOverlay(){
    if(document.getElementById('login-overlay')) return;
    const ov = document.createElement('div');
    ov.id = 'login-overlay';
    ov.innerHTML = `
      <div class="lo-box">
        <div class="lo-icon">🔐</div>
        <div class="lo-title">กรุณาเข้าสู่ระบบ</div>
        <div class="lo-sub">หน้านี้สำหรับครู / เจ้าหน้าที่โรงเรียนเท่านั้น</div>
        <div class="lo-err" id="lo-err"></div>
        <input class="lo-input" id="lo-email" type="email" placeholder="อีเมล" autocomplete="email"/>
        <input class="lo-input" id="lo-pwd" type="password" placeholder="รหัสผ่าน" autocomplete="current-password"/>
        <button class="lo-btn" id="lo-btn" onclick="AuthGuard._doLogin()">เข้าสู่ระบบ</button>
        <a href="index.html" class="lo-back">← กลับหน้าหลัก</a>
      </div>`;
    document.body.appendChild(ov);
    document.getElementById('lo-pwd').addEventListener('keydown',e=>{if(e.key==='Enter')AuthGuard._doLogin();});
  },

  async _doLogin(){
    const email = document.getElementById('lo-email')?.value.trim();
    const pwd   = document.getElementById('lo-pwd')?.value;
    const btn   = document.getElementById('lo-btn');
    const err   = document.getElementById('lo-err');
    if(!email||!pwd){err.textContent='กรอกอีเมลและรหัสผ่าน';return;}
    btn.disabled=true;btn.textContent='กำลังเข้าสู่ระบบ...';
    try{
      await _auth.signInWithEmailAndPassword(email,pwd);
    }catch(e){
      err.textContent=e.code==='auth/wrong-password'||e.code==='auth/user-not-found'?'อีเมลหรือรหัสผ่านไม่ถูกต้อง':'เกิดข้อผิดพลาด: '+e.message;
      btn.disabled=false;btn.textContent='เข้าสู่ระบบ';
    }
  },

  showLogin(){ this._showLoginOverlay(); },

  logout(){
    if(!confirm('ออกจากระบบ?'))return;
    _auth.signOut();
  },

  // helper — เรียกก่อน save ทุกครั้ง
  requireLogin(msg='คุณต้องเข้าสู่ระบบก่อน'){
    if(!this.isLoggedIn){ alert(msg); this.showLogin(); return false; }
    return true;
  }
};

// ── CSS สำหรับ auth-bar และ overlay ──
(function injectCSS(){
  const style = document.createElement('style');
  style.textContent = `
    /* AUTH BAR */
    #auth-bar{position:sticky;top:0;z-index:90;padding:8px 20px;border-bottom:1px solid rgba(255,255,255,.06);background:rgba(10,16,24,.92);backdrop-filter:blur(10px)}
    .auth-bar-inner{display:flex;align-items:center;gap:10px;max-width:1100px;margin:0 auto;font-family:Sarabun,sans-serif;font-size:13px}
    .auth-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
    .auth-dot-on{background:#22c55e;box-shadow:0 0 6px #22c55e}
    .auth-dot-off{background:#f59e0b;animation:ab-blink 1.8s infinite}
    @keyframes ab-blink{0%,100%{opacity:1}50%{opacity:.3}}
    .auth-email{font-weight:700;color:#e0f2fe}
    .auth-role{font-size:11px;color:#64748b;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:6px;padding:1px 8px}
    .auth-guest{color:#94a3b8}
    .auth-login-btn{margin-left:auto;background:rgba(14,165,233,.15);border:1px solid rgba(34,211,238,.3);color:#22d3ee;border-radius:8px;padding:5px 14px;font-size:12px;font-weight:700;cursor:pointer;font-family:Sarabun,sans-serif;transition:.2s}
    .auth-login-btn:hover{background:rgba(14,165,233,.3)}
    .auth-logout-btn{margin-left:auto;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.25);color:#fca5a5;border-radius:8px;padding:5px 14px;font-size:12px;font-weight:700;cursor:pointer;font-family:Sarabun,sans-serif;transition:.2s}
    .auth-logout-btn:hover{background:rgba(239,68,68,.2)}
    /* LOGIN OVERLAY */
    #login-overlay{position:fixed;inset:0;background:rgba(2,11,24,.92);backdrop-filter:blur(8px);z-index:500;display:flex;align-items:center;justify-content:center;padding:16px;font-family:Sarabun,sans-serif}
    .lo-box{background:#0d1825;border:1px solid rgba(14,165,233,.2);border-radius:20px;padding:32px 28px;width:100%;max-width:360px;text-align:center}
    .lo-icon{font-size:44px;margin-bottom:12px}
    .lo-title{font-size:18px;font-weight:800;color:#e0f2fe;margin-bottom:6px}
    .lo-sub{font-size:13px;color:#64748b;margin-bottom:20px;line-height:1.5}
    .lo-err{color:#f87171;font-size:12px;min-height:18px;margin-bottom:6px}
    .lo-input{width:100%;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:11px 14px;color:#e0f2fe;font-size:14px;font-family:Sarabun,sans-serif;outline:none;margin-bottom:10px;transition:border-color .2s}
    .lo-input:focus{border-color:rgba(34,211,238,.5)}
    .lo-btn{width:100%;background:linear-gradient(135deg,#0891b2,#0369a1);border:none;border-radius:12px;padding:12px;color:#fff;font-size:15px;font-weight:800;cursor:pointer;font-family:Sarabun,sans-serif;transition:all .2s;margin-bottom:12px}
    .lo-btn:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(8,145,178,.4)}
    .lo-btn:disabled{opacity:.5;cursor:default;transform:none}
    .lo-back{display:inline-block;color:#475569;font-size:12px;text-decoration:none;transition:.2s}
    .lo-back:hover{color:#94a3b8}
  `;
  document.head.appendChild(style);
})();
