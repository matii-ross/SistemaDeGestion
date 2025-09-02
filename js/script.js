// --- Firebase config & init ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {
  getFirestore,
  collection, addDoc, updateDoc, deleteDoc, doc,
  serverTimestamp,
  onSnapshot, query, where, getDocs
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDj4Jm9r48yfOcZ2MN1eT9Du4Bb2YoTeFk",
  authDomain: "prestadoresmedicos-150fe.firebaseapp.com",
  projectId: "prestadoresmedicos-150fe",
  storageBucket: "prestadoresmedicos-150fe.appspot.com",
  messagingSenderId: "69840789954",
  appId: "1:69840789954:web:1accb7d37ebc7546afb65b"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

const auth = getAuth(app);

// Guard: si no hay sesión, redirige al login
const sessionUser = document.getElementById("sessionUser");

onAuthStateChanged(auth, (user) => {
  if (!user) {
    // sin sesión → redirige y CORTA la ejecución del callback
    window.location.href = "index.html";
    return; // ← IMPORTANTE
  }

  // con sesión → seguimos
  localStorage.setItem(
    "actorNombre",
    user.displayName || user.email?.split("@")[0] || "Usuario"
  );

  const shown = user.email ?? user.displayName ?? "Usuario";
  if (sessionUser) {
    sessionUser.textContent = `Sesión: ${shown}`;
    sessionUser.classList.remove("d-none");
    sessionUser.title = `Último acceso: ${user.metadata?.lastSignInTime || "—"}`;
  }

  // ahora sí, activamos el listado en tiempo real
  activarListenerTiempoReal();
});


// Botón logout (si lo agregás en app.html)
document.getElementById("btnLogout")?.addEventListener("click", async () => {
  await signOut(auth);
});

// Util: TOASTS

// === Toast robusto: siempre en <body>, inmune a transform/overflow de ancestros ===
function showToast(message, variant = 'primary', delay = 3500) {
  // 1) Root SIEMPRE en body (no usa #toastStack si está dentro de layouts)
  const rootId = 'toastRootBody';
  const root = document.getElementById(rootId) || (() => {
    const r = document.createElement('div');
    r.id = rootId;
    r.className = 'toast-container p-3';
    // arriba-derecha; cambiá aquí si después querés otra posición
    Object.assign(r.style, {
      position: 'fixed',
      top: '16px',
      right: '16px',
      zIndex: '2147483647',
      pointerEvents: 'none', // permite clickear detrás; los botones internos reactivan eventos
    });
    document.body.appendChild(r);
    return r;
  })();

  // 2) Toast
  const el = document.createElement('div');
  el.className = `toast align-items-center text-bg-${variant} border-0`;
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  el.setAttribute('aria-atomic', 'true');
  el.style.pointerEvents = 'auto'; // para que el botón close sea clickeable
  el.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${String(message ?? '')}</div>
      <button type="button" class="btn-close btn-close-white ms-2 m-auto"
              data-bs-dismiss="toast" aria-label="Close"></button>
    </div>`;

  root.appendChild(el);

  // 3) Mostrar con Bootstrap si está listo; si no, fallback visible
  const canBS = typeof bootstrap !== 'undefined' && bootstrap?.Toast?.getOrCreateInstance;
  if (canBS) {
    const t = bootstrap.Toast.getOrCreateInstance(el, { delay: Number(delay) || 3500, autohide: true });
    t.show();
    el.addEventListener('hidden.bs.toast', () => el.remove());
  } else {
    el.classList.add('show');
    el.style.display = 'block';
    el.style.opacity = '1';
    setTimeout(() => { el.classList.remove('show'); el.remove(); }, Number(delay) || 3500);
  }
}

function confirmDuplicado() {
  return new Promise((resolve) => {
    const modalEl = document.getElementById("modalConfirmDuplicado");
    const btnOk = document.getElementById("btnOkDuplicado");
    const btnCancel = document.getElementById("btnCancelDuplicado");
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);

    const cleanup = () => {
      btnOk.removeEventListener("click", onOk);
      btnCancel.removeEventListener("click", onCancel);
      modalEl.removeEventListener("hidden.bs.modal", onCancel);
    };
    const onOk = () => { cleanup(); modal.hide(); resolve(true); };
    const onCancel = () => { cleanup(); resolve(false); };

    btnOk.addEventListener("click", onOk);
    btnCancel.addEventListener("click", onCancel);
    modalEl.addEventListener("hidden.bs.modal", onCancel);

    modal.show();
  });
}

function confirmEliminar(rowData) {
  return new Promise((resolve) => {
    const modalEl = document.getElementById("modalConfirmEliminar");
    const btnOk = document.getElementById("btnOkEliminar");
    const spanNombre = document.getElementById("eliminarNombre");
    const spanCuit = document.getElementById("eliminarCuit");
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);

    // Completar datos del prestador
    spanNombre.textContent = rowData?.nombre || "(sin nombre)";
    spanCuit.textContent = rowData?.cuit || "(sin CUIT)";

    const cleanup = () => {
      btnOk.removeEventListener("click", onOk);
      modalEl.removeEventListener("hidden.bs.modal", onCancel);
      // Opcional: limpiar textos
      // spanNombre.textContent = "";
      // spanCuit.textContent = "";
    };
    const onOk = () => { cleanup(); modal.hide(); resolve(true); };
    const onCancel = () => { cleanup(); resolve(false); };

    btnOk.addEventListener("click", onOk);
    modalEl.addEventListener("hidden.bs.modal", onCancel);

    modal.show();
  });
}

// Actor (hasta que implementemos Auth)
function getActor() {
  return localStorage.getItem("actorNombre") || "Usuario";
}

// Valor (formateo vivo)

const valorInput = document.getElementById("valor");
if (valorInput) {
  valorInput.addEventListener("input", (e) => {
    const raw = e.target.value.replace(/[^\d]/g, "");
    if (!raw) return (e.target.value = "", e.target.dataset.raw = "");
    const number = parseFloat(raw) / 100;
    e.target.dataset.raw = number;
    e.target.value = number.toLocaleString("es-AR", {
      style: "currency", currency: "ARS", minimumFractionDigits: 2, maximumFractionDigits: 2
    });
  });
}
const parseValor = (inputEl) => parseFloat(inputEl?.dataset.raw || 0);

// Provincias y Localidades (API AR)

const provinciaSelect = document.getElementById("provincia");
const localidadSelect = document.getElementById("localidad");

async function cargarProvinciasEn(selectEl) {
  if (!selectEl) return;
  selectEl.innerHTML = `<option selected disabled value="">Seleccioná una provincia</option>`;
  const res = await fetch("https://apis.datos.gob.ar/georef/api/provincias");
  const data = await res.json();
  (data.provincias || [])
    .sort((a, b) => a.nombre.localeCompare(b.nombre))
    .forEach(p => {
      const opt = document.createElement("option");
      opt.value = p.nombre; opt.textContent = p.nombre;
      selectEl.appendChild(opt);
    });
}
async function cargarLocalidadesEn(nombreProvincia, selectEl) {
  if (!selectEl) return;
  selectEl.innerHTML = `<option selected disabled value="">Seleccioná una localidad</option>`;
  if (!nombreProvincia) return;
  const res = await fetch(`https://apis.datos.gob.ar/georef/api/localidades?provincia=${encodeURIComponent(nombreProvincia)}&max=1000`);
  const data = await res.json();
  (data.localidades || [])
    .sort((a, b) => a.nombre.localeCompare(b.nombre))
    .forEach(l => {
      const opt = document.createElement("option");
      opt.value = l.nombre; opt.textContent = l.nombre;
      selectEl.appendChild(opt);
    });
}

// Para el formulario de alta
await cargarProvinciasEn(provinciaSelect);
if (provinciaSelect && localidadSelect) {
  provinciaSelect.addEventListener("change", () => cargarLocalidadesEn(provinciaSelect.value, localidadSelect));
}

// Guardar prestador (ALTA)

const form = document.getElementById("formPrestador");
if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nombre = document.getElementById("nombre").value.trim();
    const servicio = document.getElementById("servicio").value;
    const cuit = document.getElementById("cuit").value.trim();
    const telefono = document.getElementById("telefono").value.trim();
    const email = document.getElementById("email").value.trim();
    const cbu = document.getElementById("cbu").value.trim();
    const estado = document.getElementById("estado").value;
    const provincia = provinciaSelect?.value || "";
    const localidad = localidadSelect?.value || "";
    const valor = parseValor(valorInput);
    const fechaActualizacion = new Date().toISOString().split("T")[0];
    const haceFactura = document.getElementById("facturaSi")?.checked ?? false;
    const facturaNombre = haceFactura ? (document.getElementById("facturaNombre")?.value.trim() || "") : "";
    if (haceFactura && !facturaNombre) {
      showToast("Completá “A nombre de” al marcar “Hace factura”.", "warning", 1500);
      return;
    }

    try {
      const q = query(collection(db, "prestadores"), where("cuit", "==", cuit));
      const dup = await getDocs(q);
      if (!dup.empty) {
        const confirmar = await confirmDuplicado();
        if (!confirmar) {
          showToast("Guardado cancelado por el usuario.", "info", 1500);
          return; // aborta el guardado
        }
      }

      const ref = await addDoc(collection(db, "prestadores"), {
        nombre, servicio, cuit, telefono, email, cbu, estado,
        provincia, localidad, valor, fechaActualizacion, creado: serverTimestamp(),
        haceFactura,
        facturaNombre
      });

      // Log de creación
      await addDoc(collection(db, `prestadores/${ref.id}/logs`), {
        action: "create",
        actor: getActor(),
        at: serverTimestamp(),
        payload: { nombre, servicio, cuit, telefono, email, cbu, estado, provincia, localidad, valor }
      });

      showToast('Prestador guardado correctamente ✅', 'success', 1500);

      form.reset();

      // APLICAR LA LÓGICA DE FACTURACIÓN DESPUÉS DE RESETEAR EL FORMULARIO
      // if (applyAltaFacturaFn) { 
      //   applyAltaFacturaFn();
      // }

      if (document.getElementById("facturaNo")) {
          document.getElementById("facturaNo").checked = true;
          document.getElementById("facturaNombre").value = '';
          document.getElementById("facturaNombre").disabled = true;
      }

      if (localidadSelect) localidadSelect.innerHTML = "<option selected disabled value=''>Seleccioná una localidad</option>";
      if (valorInput) valorInput.dataset.raw = "";
    } catch (err) {
      console.error("Error al guardar prestador:", err);
      showToast('Error al guardar prestador ❌', 'danger', 1500);
    }
  });
}


// Listado con DataTables + Responsive

let dt = null;
const listadoTab = document.getElementById("listado-tab");
const btnRefrescar = document.getElementById("btnRefrescar");
const filtroEstado = document.getElementById("filtroEstado");

function docToRow(id, p) {
  return {
    id,
    nombre: p.nombre || "",
    servicio: p.servicio || "",
    cuit: p.cuit || "",
    telefono: p.telefono || "-",
    email: p.email || "-",
    cbu: p.cbu || "",
    provincia: p.provincia || "",
    localidad: p.localidad || "",
    valor: Number(p.valor ?? 0),
    estado: p.estado || "",
    fechaActualizacion: p.fechaActualizacion || "-",
    haceFactura: !!p.haceFactura,
    facturaNombre: p.facturaNombre || "",

  };
}

let unsubscribe = null;

async function initDataTableIfNeeded() {
  if (dt) return;

  dt = $("#tablaPrestadores").DataTable({
    pageLength: 10,
    lengthChange: false,
    order: [[0, "asc"]],
    dom: '<"d-flex justify-content-between align-items-center mb-2"fB>rtip',
    buttons: [
      { extend: 'excelHtml5', title: 'Prestadores', text: '📊 Excel' },
      { extend: 'csvHtml5', title: 'Prestadores', text: '📄 CSV' }
    ],
    language: {
      url: "https://cdn.datatables.net/plug-ins/1.13.4/i18n/es-ES.json"
    },
    columns: [
      { data: "nombre" },
      { data: "servicio" },
      { data: "cuit" },
      { data: "telefono" },
      { data: "email" },
      { data: "cbu" },
      { data: "provincia" },
      { data: "localidad" },
      {
        data: "valor",
        render: (v) => Number(v).toLocaleString("es-AR", { style: "currency", currency: "ARS" })
      },
      { data: "estado" },
      { data: "fechaActualizacion" },
      { data: "haceFactura", render: v => v ? "Sí" : "No" },
      { data: "facturaNombre", render: v => (v?.trim() || "—") },
      {
        data: "id",
        orderable: false, searchable: false,
        render: () => `
          <div class="dropdown">
            <button class="btn-action" type="button" data-bs-toggle="dropdown" aria-expanded="false">⋮</button>
              <ul class="dropdown-menu dropdown-menu-end">
                <li><a class="dropdown-item action-editar" href="#">Editar</a></li>
                <li><a class="dropdown-item text-danger action-eliminar" href="#">Eliminar</a></li>
              </ul>
          </div>
        `
      }
    ],
    data: []
  });

  // Delegación de eventos (Editar/Eliminar)
  $("#tablaPrestadores tbody").on("click", ".action-eliminar", async function () {
    const rowData = dt.row($(this).closest("tr")).data();
    if (!rowData) return;

    const confirmar = await confirmEliminar(rowData);
    if (!confirmar) return;

    try {
      await deleteDoc(doc(db, "prestadores", rowData.id));
      await addDoc(collection(db, `prestadores/${rowData.id}/logs`), {
        action: "delete",
        actor: getActor(),
        at: serverTimestamp()
      });
      showToast('Prestador eliminado correctamente 🗑️', 'danger', 1500);
    } catch (err) {
      console.error(err);
    }
  });


  $("#tablaPrestadores tbody").on("click", ".action-editar", async function () {
    const rowData = dt.row($(this).closest("tr")).data();
    if (!rowData) return;
    await abrirModalEdicion(rowData);
  });

  // Filtro Activo/Inactivo (columna 9)
  if (filtroEstado) {
    filtroEstado.addEventListener("change", () => {
      const val = filtroEstado.value;
      if (!val) {
        // “Todos”
        dt.column(9).search("").draw();
        return;
      }
      // Escapar por si acaso (aunque "Activo/Inactivo" no lo necesita)
      const pattern = `^${val.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`;
      dt.column(9).search(pattern, true, false).draw(); // regex=true, smart=false
    });
  }

}

async function activarListenerTiempoReal() {
  await initDataTableIfNeeded();
  if (unsubscribe) unsubscribe();
  unsubscribe = onSnapshot(collection(db, "prestadores"), (snap) => {
    const rows = [];
    snap.forEach(d => rows.push(docToRow(d.id, d.data())));
    dt.clear();
    dt.rows.add(rows);
    dt.draw(false);
  }, (err) => console.error("onSnapshot error:", err));
}

if (listadoTab) {
  listadoTab.addEventListener("shown.bs.tab", activarListenerTiempoReal);
}
if (btnRefrescar) btnRefrescar.addEventListener("click", activarListenerTiempoReal);


// Edición en Modal + Logs

const modalEditar = document.getElementById("modalEditar");
const formEditar = document.getElementById("formEditar");

const editId = document.getElementById("editId");
const editNombre = document.getElementById("editNombre");
const editServicio = document.getElementById("editServicio");
const editCuit = document.getElementById("editCuit");
const editTelefono = document.getElementById("editTelefono");
const editEmail = document.getElementById("editEmail");
const editCbu = document.getElementById("editCbu");
const editEstado = document.getElementById("editEstado");
const editValor = document.getElementById("editValor");
const editProvincia = document.getElementById("editProvincia");
const editLocalidad = document.getElementById("editLocalidad");

if (editProvincia && editLocalidad) {
  editProvincia.addEventListener("change", async () => {
    const prov = editProvincia.value;
    // limpiamos y mostramos placeholder
    editLocalidad.innerHTML = `<option selected disabled value="">Seleccioná una localidad</option>`;
    if (prov) {
      await cargarLocalidadesEn(prov, editLocalidad);
      // (opcional) no seleccionar nada automáticamente
      // editLocalidad.value = "";
    }
  });
}

// formateo vivo en modal
if (editValor) {
  editValor.addEventListener("input", (e) => {
    const raw = e.target.value.replace(/[^\d]/g, "");
    if (!raw) return (e.target.value = "", e.target.dataset.raw = "");
    const number = parseFloat(raw) / 100;
    e.target.dataset.raw = number;
    e.target.value = number.toLocaleString("es-AR", {
      style: "currency", currency: "ARS", minimumFractionDigits: 2, maximumFractionDigits: 2
    });
  });
}
const parseValorEdit = () => parseFloat(editValor?.dataset.raw || 0);

async function prepararSelectsEdicion(provincia, localidad) {
  await cargarProvinciasEn(editProvincia);
  if (provincia) {
    editProvincia.value = provincia;
    await cargarLocalidadesEn(provincia, editLocalidad);
    if (localidad) editLocalidad.value = localidad;
  }
}

async function abrirModalEdicion(rowData) {
  editId.value = rowData.id;
  editNombre.value = rowData.nombre;
  editServicio.value = rowData.servicio;
  editCuit.value = rowData.cuit;
  editTelefono.value = rowData.telefono === "-" ? "" : rowData.telefono;
  editEmail.value = rowData.email === "-" ? "" : rowData.email;
  editCbu.value = rowData.cbu;
  editEstado.value = rowData.estado;

  editValor.dataset.raw = String(rowData.valor ?? 0);
  editValor.value = Number(rowData.valor ?? 0).toLocaleString("es-AR", {
    style: "currency", currency: "ARS", minimumFractionDigits: 2, maximumFractionDigits: 2
  });

  await prepararSelectsEdicion(rowData.provincia, rowData.localidad);

  // Toggle factura (preload)
  const rSi = document.getElementById("editFacturaSi");
  const rNo = document.getElementById("editFacturaNo");
  const iNom = document.getElementById("editFacturaNombre");

  const hace = !!rowData.haceFactura;
  if (rSi && rNo) {
    rSi.checked = hace;
    rNo.checked = !hace;
  }

  bindFacturaToggle({
    siId: 'editFacturaSi',
    noId: 'editFacturaNo',
    nombreId: 'editFacturaNombre'
  });

  if (iNom) {
    iNom.value = hace ? (rowData.facturaNombre || "") : ""; // ← pisa SIEMPRE
  }

  const modal = bootstrap.Modal.getOrCreateInstance(modalEditar);
  modal.show();
}

if (formEditar) {
  formEditar.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = editId.value;

    const _haceFactura = document.getElementById("editFacturaSi")?.checked ?? false;
    const _facturaNombre = _haceFactura ? (document.getElementById("editFacturaNombre")?.value.trim() || "") : "";
    if (_haceFactura && !_facturaNombre) {
      showToast("Completá “A nombre de” al marcar “Hace factura”.", "warning", 1500);
      return;
    }

    const payload = {
      nombre: editNombre.value.trim(),
      servicio: editServicio.value,
      cuit: editCuit.value.trim(),
      telefono: editTelefono.value.trim(),
      email: editEmail.value.trim(),
      cbu: editCbu.value.trim(),
      estado: editEstado.value,
      valor: parseValorEdit(),
      provincia: editProvincia.value,
      localidad: editLocalidad.value,
      fechaActualizacion: new Date().toISOString().split("T")[0],
      haceFactura: _haceFactura,
      facturaNombre: _facturaNombre
    };

    try {
      await updateDoc(doc(db, "prestadores", id), payload);
      await addDoc(collection(db, `prestadores/${id}/logs`), {
        action: "update",
        actor: getActor(),
        at: serverTimestamp(),
        payload
      });

      bootstrap.Modal.getInstance(modalEditar)?.hide();
      showToast("Cambios guardados correctamente ✅", "success", 1500);
      // onSnapshot refresca la tabla solo
    } catch (err) {
      console.error("Error al actualizar:", err);
    }
  });
}

// ---- Toggle Hace Factura (reutilizable para alta y modal)
function bindFacturaToggle({ siId, noId, nombreId }) {
  const rSi = document.getElementById(siId);
  const rNo = document.getElementById(noId);
  const iNom = document.getElementById(nombreId);
  if (!rSi || !rNo || !iNom) return;

  // labels asociados
  const lSi = document.querySelector(`label[for="${siId}"]`);
  const lNo = document.querySelector(`label[for="${noId}"]`);

  const enable = () => {
    iNom.required = true;
    iNom.disabled = false;
    iNom.removeAttribute('disabled'); // por si algún CSS lo deja “pegado”
  };
  const disable = () => {
    iNom.required = false;
    iNom.value = '';
    iNom.disabled = true;
    iNom.setAttribute('disabled', 'disabled');
  };
  const apply = () => (rSi.checked ? enable() : disable());

  // Eventos nativos de los radios
  rSi.addEventListener('change', apply);
  rNo.addEventListener('change', apply);

  // Fuerza checked al click en los labels (por si el “for” no activa el input)
  if (lSi) lSi.addEventListener('click', (e) => {
    rSi.checked = true;
    rNo.checked = false;
    apply();
  });
  if (lNo) lNo.addEventListener('click', (e) => {
    rNo.checked = true;
    rSi.checked = false;
    apply();
  });

  // Estado inicial
  apply();
}

// --- Fix específico ALTA: aseguramos que el label cambie el radio y apliquemos el estado
function wireAltaFacturaLabels() {
  const rSi = document.getElementById('facturaSi');
  const rNo = document.getElementById('facturaNo');
  const iNom = document.getElementById('facturaNombre');
  const lSi = document.querySelector('label[for="facturaSi"]');
  const lNo = document.querySelector('label[for="facturaNo"]');
  if (!rSi || !rNo || !iNom) return;

  const apply = () => {
    const on = rSi.checked;
    // habilitar/deshabilitar de forma robusta
    iNom.required = on;
    if (on) {
      iNom.disabled = false;
      iNom.removeAttribute('disabled');
    } else {
      iNom.value = '';
      iNom.disabled = true;
      iNom.setAttribute('disabled', 'disabled');
    }
    // debug opcional:
    // console.log('[ALTA] SI:', rSi.checked, 'NO:', rNo.checked, 'disabled:', iNom.disabled);
  };

  // forzamos checked al click en labels (además del change nativo)
  lSi?.addEventListener('click', () => { rSi.checked = true; rNo.checked = false; apply(); });
  lNo?.addEventListener('click', () => { rNo.checked = true; rSi.checked = false; apply(); });

  // y por si acaso, escuchamos el change también
  rSi.addEventListener('change', apply);
  rNo.addEventListener('change', apply);

  // estado inicial
  apply();
}

// // Llamala junto con tus otros binds:
// document.addEventListener('DOMContentLoaded', () => {
//   wireAltaFacturaLabels();
// });


document.addEventListener('DOMContentLoaded', () => {
  // Modal (ya te funciona)
  bindFacturaToggle({
    siId: 'editFacturaSi',
    noId: 'editFacturaNo',
    nombreId: 'editFacturaNombre'
  });

  // Alta (el que no te estaba habilitando)
  bindFacturaToggle({
    siId: 'facturaSi',
    noId: 'facturaNo',
    nombreId: 'facturaNombre'
  });

  // Refuerzo para el alta
  wireAltaFacturaLabels();
});

// === FIX DEFINITIVO: Toggle "Hace factura" en el formulario de ALTA ===
(function wireAltaFactura() {
  const form = document.getElementById('formPrestador');
  const rSi = document.getElementById('facturaSi');
  const rNo = document.getElementById('facturaNo');
  const iNom = document.getElementById('facturaNombre');

  if (!form || !rSi || !rNo || !iNom) {
    console.warn('[ALTA] Faltan elementos para el toggle de factura:', { form: !!form, rSi: !!rSi, rNo: !!rNo, iNom: !!iNom });
    return;
  }

  const apply = () => {
    const on = rSi.checked === true;
    if (on) {
      iNom.required = true;
      iNom.disabled = false;
      iNom.removeAttribute('disabled');
    } else {
      iNom.required = false;
      iNom.value = '';
      iNom.disabled = true;
      iNom.setAttribute('disabled', 'disabled');
    }
    // Debug útil: mirá esto en consola al clickear SI/NO
    console.log('[ALTA] SI:', rSi.checked, 'NO:', rNo.checked, 'disabled:', iNom.disabled, 'hasAttr:', iNom.hasAttribute('disabled'));
  };

  // 1) Delegación: cualquier click dentro del form que provenga de los labels/inputs de factura
  form.addEventListener('click', (e) => {
    const t = e.target;
    // Si fue click en los labels, forzamos el checked
    if (t.matches('label[for="facturaSi"]')) {
      rSi.checked = true; rNo.checked = false; apply();
    }
    if (t.matches('label[for="facturaNo"]')) {
      rNo.checked = true; rSi.checked = false; apply();
    }
  }, true);

  // 2) También escuchamos el change real de los radios (por si el navegador lo dispara)
  rSi.addEventListener('change', apply);
  rNo.addEventListener('change', apply);

  // 3) Estado inicial coherente
  apply();
})();

window.showToast = window.showToast || showToast;
