/* BharatGas Firebase single-admin bridge */
(function(){
  const CFG = {
    apiKey: "AIzaSyDKpqdHSq8ghnhm19vk_wIwLN2YSmsp-jQ",
    authDomain: "bharatgas-106a1.firebaseapp.com",
    projectId: "bharatgas-106a1",
    storageBucket: "bharatgas-106a1.firebasestorage.app",
    messagingSenderId: "243432461990",
    appId: "1:243432461990:web:339ba8254b6da5fc1d8667",
    measurementId: "G-D6N7DN1H0P"
  };
  const ADMIN_EMAIL = "admin@bharatgas.app";
  const ADMIN_MOBILE = "9399968109";
  const KEY = "gaswallet_v9_clean_prod";
  let fbReady = false, db = null, auth = null, originalSave = null, hydrating = false;

  function loadScript(src){
    return new Promise((resolve,reject)=>{
      const s=document.createElement("script"); s.src=src; s.onload=resolve; s.onerror=reject;
      document.head.appendChild(s);
    });
  }
  async function init(){
    if(!window.firebase){
      await loadScript("https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js");
      await loadScript("https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js");
      await loadScript("https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore-compat.js");
    }
    if(!firebase.apps.length) firebase.initializeApp(CFG);
    auth=firebase.auth(); db=firebase.firestore(); fbReady=true;
    window.BharatGasFirebase={auth,db,config:CFG,adminEmail:ADMIN_EMAIL};
    return true;
  }
  async function hydrate(){
    if(!fbReady || !auth.currentUser || typeof window.S === "undefined") return;
    hydrating=true;
    try{
      const snap=await db.collection("app_state").doc("main").get();
      if(snap.exists){
        const remote=snap.data().state;
        if(remote){
          localStorage.setItem(KEY, JSON.stringify(remote));
          window.S=remote;
          if(typeof window.renderAll==="function") window.renderAll();
        }
      }else{
        await db.collection("app_state").doc("main").set({
          state: window.S,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedBy: auth.currentUser.uid
        });
      }
    }catch(e){ console.error("Firestore hydrate failed",e); }
    hydrating=false;
  }
  function installSaveSync(){
    if(originalSave || typeof window.save!=="function") return;
    originalSave=window.save;
    window.save=function(){
      originalSave.apply(this,arguments);
      if(hydrating || !fbReady || !auth.currentUser || !window.S) return;
      db.collection("app_state").doc("main").set({
        state: JSON.parse(JSON.stringify(window.S)),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedBy: auth.currentUser.uid
      },{merge:true}).catch(e=>console.error("Firestore save failed",e));
    };
  }
  async function gate(){
    const appEl=document.getElementById("app"), navEl=document.getElementById("nav"), loginEl=document.getElementById("loginScreen");
    if(appEl) appEl.classList.add("hidden");
    if(navEl) navEl.classList.add("hidden");
    if(loginEl) loginEl.classList.remove("hidden");
    if(window.S && window.S.user) window.S.user=null;
    await init();
    installSaveSync();
    const logout=document.getElementById("logoutBtn");
    if(logout) logout.addEventListener("click", async function(e){
      e.preventDefault(); e.stopImmediatePropagation();
      try{ await auth.signOut(); }catch(_){}
      if(window.S && window.S.user) window.S.user=null;
      location.reload();
    },true);
    const form=document.getElementById("loginForm");
    if(form){
      form.addEventListener("submit", async function(e){
        e.preventDefault(); e.stopImmediatePropagation();
        const mobile=document.getElementById("loginMobile").value.trim();
        const pass=document.getElementById("loginPass").value.trim();
        if(mobile!==ADMIN_MOBILE){ return window.toast && toast("❌ Admin account only."); }
        try{
          await auth.signInWithEmailAndPassword(ADMIN_EMAIL,pass);
          if(typeof window.S==="object" && window.S) {
            window.S.user={name:"Ajay",mobile:ADMIN_MOBILE,role:"admin",title:"Administrator"};
            await hydrate();
            if(typeof window.showApp==="function") window.showApp();
          }
          window.toast && toast("✅ Firebase admin connected");
        }catch(err){
          console.error(err);
          window.toast && toast("❌ Firebase login failed. Create the admin account first.");
        }
      },true);
    }
    auth.onAuthStateChanged(async user=>{
      if(user && user.email===ADMIN_EMAIL){
        installSaveSync();
        await hydrate();
        if(typeof window.S==="object" && window.S && !window.S.user){
          window.S.user={name:"Ajay",mobile:ADMIN_MOBILE,role:"admin",title:"Administrator"};
          originalSave && originalSave();
        }
        if(typeof window.showApp==="function") window.showApp();
      }
    });
  }
  init().then(()=>gate()).catch(e=>console.error("Firebase init failed",e));
})();