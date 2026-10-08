/* BharatGas Google Sheets bridge — production
   Google Sheet is the shared database for admin + customer viewer.
*/
(function(){
  const API_URL = "https://script.google.com/macros/s/AKfycbySlLpuOXdozPRJ6tGYXdfALJM2T05YBoP0IuHk5KMnnQgcO1nzwNecNkc0C2MGZUSl/exec";
  const KEY = "gaswallet_v10_sheets_prod";
  let remoteReady = false;
  let hydrating = false;
  let pendingState = null;

  function enabled(){
    return !!API_URL && API_URL.indexOf("/exec") !== -1;
  }

  function setState(state){
    if(!state || typeof window.__setBharatGasState !== "function") return;
    const local = typeof window.__getBharatGasState === "function"
      ? window.__getBharatGasState() : null;

    // Keep local identity; Google Sheet owns the shared business data.
    if(local && local.user) state.user = local.user;

    // Always keep the cylinder object valid so the edit controls never break.
    state.units = {
      total: Number(state.units && state.units.total) || 0,
      empty: Number(state.units && state.units.empty) || 0,
      delivered: Number(state.units && state.units.delivered) || 0
    };
    state.bookings = Array.isArray(state.bookings) ? state.bookings : [];
    state.transactions = Array.isArray(state.transactions) ? state.transactions : [];
    state.distributorPayments = Array.isArray(state.distributorPayments) ? state.distributorPayments : [];

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
        "action=get&callback=" + encodeURIComponent(cb) + "&_ts=" + Date.now();
      document.head.appendChild(script);
    });
  }

  async function loadRemote(){
    if(!enabled() || typeof window.__setBharatGasState !== "function") return false;
    try{
      const res = await jsonp(API_URL);
      if(!(res && res.ok && res.state)) throw new Error("Invalid Google Sheets response");

      setState(res.state);
      remoteReady = true;

      // If the user edited during the initial load, write the newest state now.
      if(pendingState){
        const queued = pendingState;
        pendingState = null;
        saveRemote(queued);
      }

      if(typeof window.renderAll === "function") window.renderAll();
      if(typeof window.toast === "function") window.toast("☁️ Google Sheet synced");
      return true;
    }catch(e){
      console.error("Google Sheets load failed:", e);
      remoteReady = false;
      if(typeof window.toast === "function") window.toast("⚠️ Sheet sync failed — local data kept");
      return false;
    }
  }

  function saveRemote(state){
    if(!enabled() || !state) return;
    if(hydrating) return;

    // Never drop a user edit while the first Sheet read is still in progress.
    if(!remoteReady){
      pendingState = state;
      return;
    }

    try{
      // Apps Script web apps can return a redirect/CORS response. The POST itself is
      // what matters here, so use text/plain + no-cors to ensure the write is sent.
      fetch(API_URL, {
        method:"POST",
        mode:"no-cors",
        headers:{"Content-Type":"text/plain;charset=utf-8"},
        body:JSON.stringify({action:"save",state:state}),
        keepalive:true
      }).catch(e=>console.error("Google Sheets save failed:",e));

      try { localStorage.setItem(KEY, JSON.stringify(state)); } catch(_) {}
    }catch(e){ console.error("Google Sheets save failed:",e); }
  }

  window.BharatGasSheets = {
    load: loadRemote,
    save: saveRemote,
    enabled: enabled,
    markReady: function(){ remoteReady = true; }
  };

  window.addEventListener("load", function(){
    if(!enabled()) return;
    // Direct-access version: no login form is required.
    loadRemote();
  });
})();