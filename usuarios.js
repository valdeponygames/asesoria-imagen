// Usuarios y estadísticas.
// - Con CONFIG.FIREBASE configurado: se guardan en Firestore (se ven desde cualquier dispositivo).
// - Sin configurar: se guardan solo en este navegador (modo local).
// Los usuarios normales entran solo con su nombre. El usuario master "Valdepony" entra con contraseña,
// que se comprueba en Firebase Authentication (la contraseña NO está en este código).
(function () {
  "use strict";

  var ADMIN_ID = "valdepony";
  var FB = (window.CONFIG && CONFIG.FIREBASE) || null;
  var ADMIN_EMAIL = (window.CONFIG && CONFIG.ADMIN_EMAIL) || "";
  var SDK = "https://www.gstatic.com/firebasejs/10.14.1/";

  function idDe(nombre) {
    return String(nombre || "").trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/\s+/g, "_").replace(/[^a-z0-9_.-]/g, "");
  }
  function usuarioNuevo(nombre) {
    return { nombre: nombre, creado: Date.now(), ultimo: Date.now(), examenes: 0, preguntas: 0, aciertos: 0, sumaNotas: 0, temas: {} };
  }
  function leerLS(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function guardarLS(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function borrarLS(k) { try { localStorage.removeItem(k); } catch (e) {} }
  function cargarScript(src) {
    return new Promise(function (ok, ko) {
      var s = document.createElement("script"); s.src = src; s.onload = ok;
      s.onerror = function () { ko(new Error("No se pudo cargar " + src)); };
      document.head.appendChild(s);
    });
  }
  // resumen = { nota, n, ok, mal, bl, porTema: { "asig_n": { ok, mal, bl, pags: { pag: veces } } } }
  function aplicarResumen(u, r) {
    u.ultimo = Date.now(); u.examenes++; u.preguntas += r.n; u.aciertos += r.ok; u.sumaNotas += r.nota;
    Object.keys(r.porTema).forEach(function (k) {
      var t = r.porTema[k], d = u.temas[k] = u.temas[k] || { ok: 0, mal: 0, bl: 0, pags: {} };
      d.ok += t.ok; d.mal += t.mal; d.bl += t.bl;
      Object.keys(t.pags).forEach(function (p) { d.pags["p" + p] = (d.pags["p" + p] || 0) + t.pags[p]; });
    });
  }
  function examenDoc(r) {
    var temas = {};
    Object.keys(r.porTema).forEach(function (k) { var t = r.porTema[k]; temas[k] = { ok: t.ok, total: t.ok + t.mal + t.bl }; });
    return { fecha: Date.now(), nota: r.nota, n: r.n, ok: r.ok, mal: r.mal, bl: r.bl, temas: temas };
  }

  // ---------------- Backend local (este navegador) ----------------
  function backendLocal() {
    var KEY = "cuentas_local";
    function db() { return leerLS(KEY, { usuarios: {}, examenes: {} }); }
    function save(d) { guardarLS(KEY, d); }
    var esLocalhost = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) || location.protocol === "file:";
    var admin = false;
    return {
      modo: "local",
      iniciar: function () { admin = esLocalhost && leerLS("admin_local", false); return Promise.resolve(); },
      get: function (id) { return Promise.resolve(db().usuarios[id] || null); },
      crear: function (id, nombre) { var d = db(); d.usuarios[id] = usuarioNuevo(nombre); save(d); return Promise.resolve(d.usuarios[id]); },
      registrar: function (id, r) {
        var d = db(), u = d.usuarios[id]; if (!u) return Promise.reject(new Error("no-existe"));
        aplicarResumen(u, r); (d.examenes[id] = d.examenes[id] || []).push(examenDoc(r)); save(d); return Promise.resolve();
      },
      examenes: function (id, lim) { return Promise.resolve((db().examenes[id] || []).slice(-lim)); },
      lista: function () { var u = db().usuarios; return Promise.resolve(Object.keys(u).map(function (id) { return Object.assign({ id: id }, u[id]); })); },
      borrar: function (id) { var d = db(); delete d.usuarios[id]; delete d.examenes[id]; save(d); return Promise.resolve(); },
      reiniciar: function (id) { var d = db(), u = d.usuarios[id]; if (u) { d.usuarios[id] = Object.assign(usuarioNuevo(u.nombre), { creado: u.creado }); delete d.examenes[id]; save(d); } return Promise.resolve(); },
      // En modo local no hay forma segura de comprobar la contraseña: solo se permite para pruebas en el ordenador propio.
      entrarAdmin: function () {
        if (!esLocalhost) return Promise.reject(new Error("El usuario master necesita Firebase configurado."));
        admin = true; guardarLS("admin_local", true); return Promise.resolve();
      },
      salirAdmin: function () { admin = false; borrarLS("admin_local"); return Promise.resolve(); },
      esAdmin: function () { return admin; }
    };
  }

  // ---------------- Backend Firebase (nube) ----------------
  function backendFirebase() {
    var db, auth;
    function ref(id) { return db.collection("usuarios").doc(id); }
    function borrarExamenes(id) {
      return ref(id).collection("examenes").get().then(function (s) {
        var b = db.batch(); s.forEach(function (d) { b.delete(d.ref); }); return b.commit();
      });
    }
    return {
      modo: "nube",
      iniciar: function () {
        return cargarScript(SDK + "firebase-app-compat.js")
          .then(function () { return Promise.all([cargarScript(SDK + "firebase-firestore-compat.js"), cargarScript(SDK + "firebase-auth-compat.js")]); })
          .then(function () {
            firebase.initializeApp(FB); db = firebase.firestore(); auth = firebase.auth();
            return new Promise(function (ok) { var off = auth.onAuthStateChanged(function () { off(); ok(); }); });
          });
      },
      get: function (id) { return ref(id).get().then(function (d) { return d.exists ? d.data() : null; }); },
      crear: function (id, nombre) { var u = usuarioNuevo(nombre); return ref(id).set(u).then(function () { return u; }); },
      registrar: function (id, r) {
        var F = firebase.firestore.FieldValue, up = {
          ultimo: Date.now(), examenes: F.increment(1), preguntas: F.increment(r.n), aciertos: F.increment(r.ok), sumaNotas: F.increment(r.nota)
        };
        Object.keys(r.porTema).forEach(function (k) {
          var t = r.porTema[k], b = "temas." + k + ".";
          up[b + "ok"] = F.increment(t.ok); up[b + "mal"] = F.increment(t.mal); up[b + "bl"] = F.increment(t.bl);
          Object.keys(t.pags).forEach(function (p) { up[b + "pags.p" + p] = F.increment(t.pags[p]); });
        });
        var batch = db.batch();
        batch.update(ref(id), up);
        batch.set(ref(id).collection("examenes").doc(), examenDoc(r));
        return batch.commit();
      },
      examenes: function (id, lim) {
        return ref(id).collection("examenes").orderBy("fecha", "desc").limit(lim).get().then(function (s) {
          var r = []; s.forEach(function (d) { r.push(d.data()); }); return r.reverse();
        });
      },
      lista: function () {
        return db.collection("usuarios").get().then(function (s) { var r = []; s.forEach(function (d) { r.push(Object.assign({ id: d.id }, d.data())); }); return r; });
      },
      borrar: function (id) { return borrarExamenes(id).then(function () { return ref(id).delete(); }); },
      reiniciar: function (id) {
        return ref(id).get().then(function (d) {
          if (!d.exists) return;
          var u = d.data();
          return borrarExamenes(id).then(function () { return ref(id).set(Object.assign(usuarioNuevo(u.nombre), { creado: u.creado })); });
        });
      },
      entrarAdmin: function (pwd) { return auth.signInWithEmailAndPassword(ADMIN_EMAIL, pwd); },
      salirAdmin: function () { return auth.signOut(); },
      esAdmin: function () { return !!(auth && auth.currentUser && auth.currentUser.email === ADMIN_EMAIL); }
    };
  }

  // ---------------- API pública ----------------
  var B = FB ? backendFirebase() : backendLocal();
  var actual = null; // { id, nombre, admin }

  function error(msg) { return Promise.reject(new Error(msg)); }
  function validar(nombre) {
    var id = idDe(nombre);
    if (String(nombre).trim().length > 24) return "El nombre puede tener como máximo 24 caracteres.";
    if (id.length < 3) return "El nombre debe tener al menos 3 letras o números.";
    return null;
  }
  function fijar(id, nombre) {
    actual = { id: id, nombre: nombre, admin: id === ADMIN_ID && B.esAdmin() };
    guardarLS("usuario", { id: id, nombre: nombre });
    return actual;
  }

  window.CUENTAS = {
    ADMIN_ID: ADMIN_ID,
    modo: B.modo,
    idDe: idDe,
    esAdminNombre: function (n) { return idDe(n) === ADMIN_ID; },
    actual: function () { return actual; },

    iniciar: function () {
      return B.iniciar().then(function () {
        var s = leerLS("usuario", null);
        if (!s) return null;
        if (s.id === ADMIN_ID && !B.esAdmin()) { borrarLS("usuario"); return null; }
        return B.get(s.id).then(function (u) {
          if (!u) { borrarLS("usuario"); return null; }   // lo han eliminado
          return fijar(s.id, u.nombre);
        });
      });
    },

    entrar: function (nombre, pwd) {
      var err = validar(nombre); if (err) return error(err);
      var id = idDe(nombre);
      if (id === ADMIN_ID) {
        if (!pwd) return error("Este usuario necesita contraseña.");
        return B.entrarAdmin(pwd).catch(function (e) {
          throw new Error(/password|credential|user-not-found|invalid/i.test(e.code || e.message) ? "Contraseña incorrecta." : e.message);
        }).then(function () { return B.get(id); })
          .then(function (u) { return u || B.crear(id, "Valdepony"); })
          .then(function (u) { return fijar(id, u.nombre); });
      }
      return B.get(id).then(function (u) {
        if (!u) throw new Error("No existe el usuario «" + String(nombre).trim() + "». ¿Quieres crearlo?");
        return fijar(id, u.nombre);
      });
    },

    crear: function (nombre) {
      var err = validar(nombre); if (err) return error(err);
      var id = idDe(nombre);
      if (id === ADMIN_ID) return error("Ese nombre está reservado.");
      return B.get(id).then(function (u) {
        if (u) throw new Error("Ya existe un usuario con ese nombre. Elige otro o pulsa «Entrar».");
        return B.crear(id, String(nombre).trim());
      }).then(function () { return fijar(id, String(nombre).trim()); });
    },

    salir: function () {
      var adm = actual && actual.admin; actual = null; borrarLS("usuario");
      return adm ? B.salirAdmin() : Promise.resolve();
    },

    registrarExamen: function (resumen) {
      if (!actual) return Promise.resolve(false);
      return B.registrar(actual.id, resumen).then(function () { return true; });
    },

    datos: function (id) {
      id = id || (actual && actual.id);
      return Promise.all([B.get(id), B.examenes(id, 30)]).then(function (r) { return { id: id, usuario: r[0], examenes: r[1] }; });
    },

    // Solo master
    usuarios: function () { return actual && actual.admin ? B.lista() : error("Solo el usuario master."); },
    borrar: function (id) { return actual && actual.admin && id !== ADMIN_ID ? B.borrar(id) : error("No permitido."); },
    reiniciar: function (id) { return actual && actual.admin ? B.reiniciar(id) : error("No permitido."); }
  };
})();
