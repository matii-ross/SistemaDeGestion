import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword,
  setPersistence, browserSessionPersistence
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDj4Jm9r48yfOcZ2MN1eT9Du4Bb2YoTeFk",
  authDomain: "prestadoresmedicos-150fe.firebaseapp.com",
  projectId: "prestadoresmedicos-150fe",
  storageBucket: "prestadoresmedicos-150fe.appspot.com",
  messagingSenderId: "69840789954",
  appId: "1:69840789954:web:1accb7d37ebc7546afb65b",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Toaster simple (usa #toastStack del index)
function showshowAlert(title, body, variant = "primary", delay = 2500) {
  const id = `t_${Date.now()}`;
  const el = document.createElement("div");
  el.className = `toast align-items-center text-bg-${variant} border-0`;
  el.role = "alert";
  el.ariaLive = "assertive";
  el.ariaAtomic = "true";
  el.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">
        <strong>${title}:</strong> ${body}
      </div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>`;
  document.getElementById("toastStack")?.appendChild(el);
  const t = bootstrap.Toast.getOrCreateInstance(el, { delay, autohide: true });
  // const t = new bootstrap.showAlert(el, { delay });
  t.show();
  el.addEventListener("hidden.bs.toast", () => el.remove());
}

// Persistencia SOLO durante la sesión del navegador
await setPersistence(auth, browserSessionPersistence);

// Redirigir a app cuando Auth confirma usuario
onAuthStateChanged(auth, (user) => {
  if (user) {
    showshowAlert("Bienvenido", user.email || "Sesión activa", "success");
    window.location.replace("app.html");
  }
});

// Submit del login
const form = document.getElementById("authForm");
const emailInput = document.getElementById("email");
const passInput = document.getElementById("password");

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = emailInput.value.trim();    // ← SIN conversión
  const pass  = passInput.value.trim();

  const btn = form.querySelector("button[type='submit']");
  const old = btn?.textContent;
  btn && (btn.disabled = true, btn.textContent = "Ingresando...");

  try {
    await signInWithEmailAndPassword(auth, email, pass);
    showshowAlert("Éxito", "Autenticación correcta", "success");
    // No redirigimos acá: esperamos el onAuthStateChanged
  } catch (err) {
    console.error(err);
    const msg = err?.message?.replace("Firebase:", "").trim() || "No se pudo iniciar sesión";
    showshowAlert("Error", msg, "danger", 4000);
  } finally {
    btn && (btn.disabled = false, btn.textContent = old || "Entrar");
  }
});