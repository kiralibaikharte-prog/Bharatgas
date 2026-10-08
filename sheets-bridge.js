/* BharatGas Google Sheets bridge
   Paste your deployed Apps Script /exec URL below.
*/
(function(){
  const API_URL = "PASTE_YOUR_GOOGLE_APPS_SCRIPT_EXEC_URL_HERE";
  const KEY = "gaswallet_v9_clean_prod";
  let remoteReady = false;
  let hydrating = false;

  function enabled(){
    return API_URL && API_URL.indexOf("PASTE_YOUR_") !== 0;
  }

  function setState(state){
    if(!state || typeof window.__setBharatGasState !== "function") return;
    hydrating = true;
    window.__setBharatGasState(state);
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch(_){}
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
        setState(res.state);
        remoteReady = true;
        if(typeof window.renderAll === "function") window.renderAll();
        return true;
      }
    }catch(e){
      console.error("Google Sheets load failed:",e);
      window.toast && window.toast("⚠️ Sheet sync failed — local data kept");
    }
    return false;
  }

  function saveRemote(state){
    if(!enabled() || hydrating || !remoteReady) return;
    try{
      fetch(API_URL, {
        method:"POST",
        headers:{"Content-Type":"text/plain;charset=utf-8"},
        body:JSON.stringify({action:"save",state:state})
      }).catch(e=>console.error("Google Sheets save failed:",e));
    }catch(e){ console.error(e); }
  }

  window.BharatGasSheets = {
    load: loadRemote,
    save: saveRemote,
    enabled: enabled
  };

  // The existing app calls its own save() function. admin.html now forwards
  // that save to this bridge after updating localStorage.
  window.addEventListener("load", async ()=>{
    if(!enabled()) return;
    if(window.S && window.S.user){
      await loadRemote();
    } else {
      // Wait for the normal admin login. Once logged in, the first save() marks
      // the bridge ready and uploads only after the remote state is loaded.
      const form = document.getElementById("loginForm");
      if(form){
        form.addEventListener("submit", async ()=>{
          setTimeout(async ()=>{
            await loadRemote();
            remoteReady = true;
          }, 150);
        }, true);
      }
    }
  });
})();
