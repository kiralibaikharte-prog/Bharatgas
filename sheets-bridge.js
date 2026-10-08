/* BharatGas Google Sheets bridge — production
   Google Sheet is the shared database for admin + customer viewer.
*/
(function(){
  const API_URL = "https://script.google.com/macros/s/AKfycbySlLpuOXdozPRJ6tGYXdfALJM2T05YBoP0IuHk5KMnnQgcO1nzwNecNkc0C2MGZUSl/exec";
  const KEY = "gaswallet_v9_clean_prod";
  let remoteReady = false;
  let hydrating = false;

  function enabled(){
    return !!API_URL && API_URL.indexOf("/exec") !== -1;
  }

  function setState(state){
    if(!state || typeof window.__setBharatGasState !== "function") return;
    hydrating = true;
    window.__setBharatGasState(state);
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch(_) {}
    hydrating = false;
  }

  function jsonp(url){
    return new Promise((resolve,reject)=>{
      const cb = "__bgSheetsCb_" + Date.now() + "_" + Math.random().toString(36).slice(2);
      const script = document.createElement("script");
      const timer = setTimeout(()=>{ cleanup(); reject(new Error("Google Sheet timeout")); },15000);
      function cleanup(){
        clearTimeout(timer);
        try{ delete window[cb]; }catch(_){ window[cb]=undefined; }
        script.remove();
      }
      window[cb] = data => { cleanup(); resolve(data); };
      script.onerror = () => { cleanup(); reject(new Error("Google Sheet request failed")); };
      script.src = url + (url.includes("?") ? "&" : "?") +
        "action=get&callback=" + encodeURIComponent(cb);
      document.head.appendChild(script);
    });
  }

  async function loadRemote(){
    if(!enabled() || typeof window.__getBharatGasState !== "function") return false;
    try{
      const res = await jsonp(API_URL);
      if(res && res.ok && res.state){
        const local = window.__getBharatGasState();
        // Keep the currently authenticated browser user local; the Sheet stores shared business data.
        if(local && local.user) res.state.user = local.user;
        setState(res.state);
        remoteReady = true;
        if(typeof window.renderAll === "function") window.renderAll();
        return true;
      }
      throw new Error("Invalid Google Sheets response");
    }catch(e){
      console.error("Google Sheets load failed:", e);
      if(typeof window.toast === "function") window.toast("⚠️ Sheet sync failed — local data kept");
      return false;
    }
  }

  function saveRemote(state){
    if(!enabled() || hydrating || !remoteReady) return;
    try{
      fetch(API_URL, {
        method:"POST",
        headers:{"Content-Type":"text/plain;charset=utf-8"},
        body:JSON.stringify({action:"save",state:state})
      }).then(r=>r.json()).then(res=>{
        if(!res || !res.ok) console.error("Google Sheets save rejected:",res);
      }).catch(e=>console.error("Google Sheets save failed:",e));
    }catch(e){ console.error(e); }
  }

  window.BharatGasSheets = {
    load: loadRemote,
    save: saveRemote,
    enabled: enabled,
    markReady: function(){ remoteReady = true; }
  };

  window.addEventListener("load", async ()=>{
    if(!enabled()) return;
    if(window.S && window.S.user){
      await loadRemote();
    } else {
      const form = document.getElementById("loginForm");
      if(form){
        form.addEventListener("submit", async ()=>{
          setTimeout(async ()=>{
            await loadRemote();
            remoteReady = true;
          },150);
        }, true);
      }
    }
  });
})();