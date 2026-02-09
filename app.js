/* ======================
   ART Prompt Studio - app.js
   Semua logika: API session, offline generator, online call, history
   ====================== */

/* ========== Helpers DOM ========== */
const apiInput = document.getElementById("apiInput");
const apiStatus = document.getElementById("apiStatus");
const ideaInput = document.getElementById("idea");
const resultBox = document.getElementById("result");
const historyBox = document.getElementById("history");

/* ========== Sidebar toggle ========== */
function toggleSidebar(){
  document.getElementById("sidebar").classList.toggle("open");
}

/* fokus cepat ke input idea */
function focusIdea(){
  toggleSidebar();
  ideaInput.focus();
}

/* simple info placeholders */
function showInfo(){ alert("Dokumentasi API: masukkan API key OpenAI milikmu, key disimpan hanya sementara di tab."); }
function showAbout(){ alert("ART Prompt Studio — versi demo. BY : ART"); }

/* ========== API KEY session (sessionStorage) ========== */
/* simpan API key di sessionStorage (hilang saat tab ditutup) */
function saveApiKey(){
  const k = apiInput.value.trim();
  if(!k){
    alert("Masukkan API key terlebih dahulu.");
    return;
  }
  if(!k.startsWith("sk-")){
    alert("Tampaknya bukan key OpenAI (harus dimulai sk-)");
    return;
  }
  sessionStorage.setItem("OPENAI_KEY", k);
  apiStatus.textContent = "API: tersimpan (sesi)";
  apiInput.value = "";
  alert("API tersimpan untuk sesi ini (akan hilang saat tab ditutup).");
}

/* hapus API dari sessionStorage */
function clearApiKey(){
  sessionStorage.removeItem("OPENAI_KEY");
  apiStatus.textContent = "API: —";
  alert("API sudah dihapus dari sesi ini.");
}

/* cek apakah key sudah ada (dipanggil saat load) */
function checkApiStatus(){
  const k = sessionStorage.getItem("OPENAI_KEY");
  apiStatus.textContent = k ? "API: tersimpan (sesi)" : "API: —";
}
checkApiStatus();

/* ========== OFFLINE PROMPT GENERATOR ========== */
function generateOffline(){
  const idea = ideaInput.value.trim();
  if(!idea){ alert("Tulis ide prompt dulu."); ideaInput.focus(); return; }

  const aiType = document.getElementById("aiType").value;
  const detail = document.getElementById("detail").value;

  // template sederhana tapi jelas
  let prompt = "";
  if(aiType === "coding"){
    prompt = `You are a senior programmer.\nCreate code for:\n${idea}\nRequirements: clean code, comments, and example usage.\nDetail level: ${detail}.`;
  } else if(aiType === "story"){
    prompt = `You are a professional storyteller.\nWrite a story based on:\n${idea}\nDetail level: ${detail}.`;
  } else if(aiType === "image"){
    prompt = `Create a detailed image prompt for:\n${idea}\nStyle: cinematic, ultra-detailed, 8k.\nDetail level: ${detail}.`;
  } else {
    prompt = `You are an AI assistant.\nAnswer the request:\n${idea}\nDetail level: ${detail}.`;
  }

  resultBox.value = prompt;
  // jangan selalu simpan otomatis; beri tombol simpan riwayat
}

/* ========== ONLINE: panggil OpenAI dari browser (pakai session key milik user) ========== */
async function generateOnline(){
  const idea = ideaInput.value.trim();
  if(!idea){ alert("Tulis ide prompt dulu."); ideaInput.focus(); return; }

  const key = sessionStorage.getItem("OPENAI_KEY");
  if(!key){ alert("Masukkan API key OpenAI-mu terlebih dahulu (Simpan API)."); return; }

  // sesuaikan pesan / system chat berdasarkan pilihan
  const aiType = document.getElementById("aiType").value;
  let system = "You are a helpful assistant.";
  let userMessage = idea;
  if(aiType === "coding") system = "You are a senior programmer. Provide code and explanations.";
  if(aiType === "story")  system = "You are a creative storyteller.";
  if(aiType === "image")  system = "You are an expert prompt engineer for image generation.";

  resultBox.value = "Sedang menghubungi OpenAI... (tunggu)";
  try{
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type":"application/json",
        "Authorization":"Bearer " + key
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages: [
          {role: "system", content: system},
          {role: "user", content: userMessage}
        ],
        max_tokens: 1200
      })
    });

    if(!resp.ok){
      const t = await resp.text();
      resultBox.value = `Error ${resp.status}: ${t}`;
      return;
    }

    const data = await resp.json();
    const output = data?.choices?.[0]?.message?.content || "[Tidak ada jawaban]";
    resultBox.value = output;

  } catch(err){
    resultBox.value = "Gagal terhubung: " + err.message;
  }
}

/* ========== COPY RESULT ========== */
function copyResult(){
  const text = resultBox.value;
  if(!text){ alert("Belum ada hasil untuk disalin."); return; }
  navigator.clipboard.writeText(text).then(()=> alert("Hasil disalin ke clipboard!"), ()=> alert("Gagal menyalin."));
}

/* ========== HISTORY (localStorage) ========== */
/* simpan hasil/ prompt ke riwayat lokal */
function saveResultToHistory(){
  const text = resultBox.value.trim();
  if(!text){ alert("Tidak ada hasil untuk disimpan."); return; }
  const arr = JSON.parse(localStorage.getItem("art_history") || "[]");
  arr.unshift({text: text, ts: Date.now()});
  // batasi history maksimal 100 item supaya tidak besar
  if(arr.length > 100) arr.splice(100);
  localStorage.setItem("art_history", JSON.stringify(arr));
  renderHistory();
  alert("Tersimpan ke riwayat.");
}

/* tampilkan riwayat */
function renderHistory(){
  historyBox.innerHTML = "";
  const arr = JSON.parse(localStorage.getItem("art_history") || "[]");
  if(arr.length === 0){ historyBox.innerHTML = "<div class='muted'>Belum ada riwayat</div>"; return; }
  arr.forEach((item, idx)=>{
    const d = document.createElement("div");
    d.className = "item";
    // tampilkan preview 100 karakter
    d.textContent = item.text.length > 100 ? item.text.substring(0,100) + "..." : item.text;
    d.title = "Klik untuk memasukkan kembali ke kotak hasil";
    d.onclick = ()=> { resultBox.value = item.text; window.scrollTo(0,0); };
    // right-click hapus item
    d.oncontextmenu = (e)=>{
      e.preventDefault();
      if(confirm("Hapus item ini dari riwayat?")){
        const a = JSON.parse(localStorage.getItem("art_history")||"[]");
        a.splice(idx,1);
        localStorage.setItem("art_history", JSON.stringify(a));
        renderHistory();
      }
    };
    historyBox.appendChild(d);
  });
}

/* hapus seluruh riwayat */
function clearHistory(){
  if(confirm("Yakin hapus semua riwayat?")){
    localStorage.removeItem("art_history");
    renderHistory();
  }
}

/* render history saat load */
renderHistory();