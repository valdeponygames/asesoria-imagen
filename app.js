// Simulador de exámenes. Funciona abriendo index.html directamente (sin servidor) o en un hosting.
// Cada tema tiene su banco en data/<asignatura>_t<n>.js, que llama a BANCO.add(...).
// Formato de pregunta: [página, "enunciado", "respuesta correcta", "incorrecta 1", "incorrecta 2", "incorrecta 3"]
(function () {
  "use strict";

  var BANCO = { datos: {} };
  window.BANCO = BANCO;
  BANCO.add = function (asig, tema, preguntas) { BANCO.datos[asig + "_" + tema] = preguntas; };

  var ICONOS = { protocolo: "🎩", comunicacion: "💬", estilismo: "👗", estetica: "💄", peluqueria: "✂️", empleabilidad: "🦺", ampliacion: "📈" };
  var CORTO = { protocolo: "Protocolo", comunicacion: "Hab. comunicativas", estilismo: "Estilismo", estetica: "Asesoría estética",
    peluqueria: "Asesoría peluquería", empleabilidad: "Itinerario", ampliacion: "Ampliación itinerario" };

  var $ = function (id) { return document.getElementById(id); };
  var N = CONFIG.PREGUNTAS_POR_EXAMEN;
  var seleccion = {};       // "asig_tema" -> true
  var examen = [];

  function guardar(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function leer(k, def) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch (e) { return def; } }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function barajar(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function asigPorId(id) { for (var i = 0; i < ASIGNATURAS.length; i++) if (ASIGNATURAS[i].id === id) return ASIGNATURAS[i]; }
  function norm(s) { return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }
  function claves(a) { return a.temas.map(function (_, i) { return a.id + "_" + (i + 1); }).filter(function (k) { return BANCO.datos[k]; }); }
  function fuenteHTML(p) {
    var a = asigPorId(p.asig);
    return '<div class="fuente"><span class="f-i">📖</span><span><strong>' + esc(a.nombre) + '</strong> · Tema ' + p.tema + ': ' +
      esc(a.temas[p.tema - 1]) + ' · <span class="pag">Página ' + p.pag + '</span></span></div>';
  }

  // ---------- Carga de datos ----------
  function cargarDatos(cb) {
    var pend = 0;
    ASIGNATURAS.forEach(function (a) {
      a.temas.forEach(function (_, i) {
        pend++;
        var s = document.createElement("script");
        s.src = "data/" + a.id + "_t" + (i + 1) + ".js";
        s.onload = s.onerror = function () { if (--pend === 0) cb(); };
        document.head.appendChild(s);
      });
    });
  }

  function vista(v) {
    ["vSeleccion", "vExamen", "vResultado"].forEach(function (id) { $(id).hidden = id !== v; });
    document.body.setAttribute("data-vista", v);
    window.scrollTo(0, 0);
  }

  // ================= SELECCIÓN =================
  function pintarAsignaturas() {
    var total = 0;
    $("asignaturas").innerHTML = ASIGNATURAS.map(function (a) {
      var ks = claves(a), marcados = ks.filter(function (k) { return seleccion[k]; }).length;
      var estado = marcados === 0 ? "" : marcados === ks.length ? " full" : " partial";
      var temas = a.temas.map(function (t, i) {
        var k = a.id + "_" + (i + 1), q = BANCO.datos[k], n = q ? q.length : 0; total += n;
        return '<button class="topic' + (seleccion[k] ? " on" : "") + '" data-k="' + k + '" aria-pressed="' + !!seleccion[k] + '"' +
          (n ? "" : " disabled") + ' data-txt="' + esc(norm(a.nombre + " " + t)) + '">' +
          '<span class="t-num">' + (i + 1) + '</span>' +
          '<span class="t-txt">' + esc(t) + '<small>' + (n ? n + " preguntas" : "Sin preguntas") + '</small></span>' +
          '<span class="t-check" aria-hidden="true"></span></button>';
      }).join("");
      return '<article class="asig' + estado + '" data-a="' + a.id + '">' +
        '<header class="asig-h">' +
          '<span class="asig-ico">' + (ICONOS[a.id] || "📘") + '</span>' +
          '<div class="asig-tit"><h3>' + esc(a.nombre) + '</h3><span class="muted small">' +
            (marcados ? marcados + " de " + ks.length + " temas" : ks.length + " temas") + '</span></div>' +
          '<button class="asig-all" data-asig="' + a.id + '" aria-pressed="' + (marcados === ks.length) + '">' +
            (marcados === ks.length ? "✓ Completa" : "Seleccionar todo") + '</button>' +
        '</header>' +
        '<div class="asig-meter"><span style="width:' + (ks.length ? 100 * marcados / ks.length : 0) + '%"></span></div>' +
        '<div class="topics">' + temas + '</div></article>';
    }).join("");
    $("totalBanco").textContent = total.toLocaleString("es-ES") + " preguntas";
    aplicarFiltro();
    pintarPanel();
  }

  function temasSeleccionados() {
    var r = [];
    ASIGNATURAS.forEach(function (a) { claves(a).forEach(function (k) { if (seleccion[k]) r.push(k); }); });
    return r;
  }

  function reparto(temas) {
    var r = {}, t = barajar(temas);
    if (t.length > N) t = t.slice(0, N);
    var base = Math.floor(N / t.length), resto = N % t.length;
    t.forEach(function (k, i) { r[k] = Math.min(base + (i < resto ? 1 : 0), BANCO.datos[k].length); });
    return r;
  }

  function pintarPanel() {
    var t = temasSeleccionados();
    $("btnGenerar").disabled = t.length === 0;
    $("selCount").textContent = t.length + (t.length === 1 ? " tema" : " temas");
    $("panel").classList.toggle("activo", t.length > 0);
    [].forEach.call($("segN").children, function (b) { b.classList.toggle("on", +b.dataset.v === N); });
    $("swPractica").checked = !!prefs.inmediata;

    if (!t.length) {
      $("selList").innerHTML = '<div class="sel-empty"><span>☝</span>Aún no has elegido temas.<br>Tócalos en la lista para añadirlos.</div>';
      $("selReparto").textContent = "Elige al menos un tema";
      return;
    }
    var grupos = {};
    t.forEach(function (k) { var p = k.split("_"); (grupos[p[0]] = grupos[p[0]] || []).push(+p[1]); });
    $("selList").innerHTML = Object.keys(grupos).map(function (id) {
      return '<div class="sel-g"><div class="sel-g-h">' + (ICONOS[id] || "") + ' ' + esc(CORTO[id] || asigPorId(id).nombre) + '</div>' +
        '<div class="sel-chips">' + grupos[id].map(function (n) {
          return '<button class="mini-chip" data-k="' + id + "_" + n + '" title="Quitar">T' + n + ' <span>×</span></button>';
        }).join("") + '</div></div>';
    }).join("");
    var base = Math.floor(N / t.length), resto = N % t.length;
    $("selReparto").textContent = t.length > N
      ? N + " preguntas de " + N + " temas al azar"
      : N + " preguntas · " + (resto ? base + "–" + (base + 1) : base) + " por tema";
  }

  function aplicarFiltro() {
    var q = norm($("buscar").value.trim()), alguno = false;
    [].forEach.call(document.querySelectorAll(".asig"), function (card) {
      var vis = 0;
      [].forEach.call(card.querySelectorAll(".topic"), function (b) {
        var ok = !q || b.dataset.txt.indexOf(q) >= 0; b.hidden = !ok; if (ok) vis++;
      });
      card.hidden = vis === 0; if (vis) alguno = true;
    });
    $("sinResultados").hidden = alguno;
  }

  function setTema(k, on) { if (BANCO.datos[k]) { if (on) seleccion[k] = true; else delete seleccion[k]; } }
  function cambio() { guardar("sel", seleccion); pintarAsignaturas(); }

  $("asignaturas").addEventListener("click", function (e) {
    var b = e.target.closest(".topic, .asig-all"); if (!b || b.disabled) return;
    if (b.classList.contains("topic")) { setTema(b.dataset.k, !seleccion[b.dataset.k]); }
    else {
      var ks = claves(asigPorId(b.dataset.asig)), todos = ks.every(function (k) { return seleccion[k]; });
      ks.forEach(function (k) { setTema(k, !todos); });
    }
    cambio();
  });
  $("selList").addEventListener("click", function (e) { var b = e.target.closest(".mini-chip"); if (b) { setTema(b.dataset.k, false); cambio(); } });
  $("buscar").addEventListener("input", aplicarFiltro);
  $("btnLimpiar").onclick = function () { seleccion = {}; cambio(); };
  $("btnTodo").onclick = function () { ASIGNATURAS.forEach(function (a) { claves(a).forEach(function (k) { setTema(k, true); }); }); cambio(); };
  $("btnAzar").onclick = function () {
    var todas = []; ASIGNATURAS.forEach(function (a) { todas = todas.concat(claves(a)); });
    seleccion = {}; barajar(todas).slice(0, 3).forEach(function (k) { setTema(k, true); }); cambio();
  };
  $("segN").addEventListener("click", function (e) { var b = e.target.closest("button"); if (b) { prefs.n = +b.dataset.v; guardarPrefs(); } });
  $("swPractica").onchange = function () { prefs.inmediata = this.checked; guardarPrefs(); };

  // ================= EXAMEN =================
  function generar() {
    var r = reparto(temasSeleccionados()), vistas = leer("vistas", {});
    examen = [];
    Object.keys(r).forEach(function (k) {
      var banco = BANCO.datos[k], partes = k.split("_");
      var idx = barajar(banco.map(function (_, i) { return i; }));
      idx.sort(function (x, y) { return (vistas[k + "_" + x] || 0) - (vistas[k + "_" + y] || 0); }); // primero las no vistas
      idx.slice(0, r[k]).forEach(function (i) {
        var p = banco[i];
        vistas[k + "_" + i] = (vistas[k + "_" + i] || 0) + 1;
        examen.push({ asig: partes[0], tema: +partes[1], pag: p[0], q: p[1], correcta: p[2], opciones: barajar(p.slice(2, 6)), resp: null });
      });
    });
    guardar("vistas", vistas);
    examen = barajar(examen);
    pintarExamen();
    vista("vExamen");
  }

  function etiqueta(p) { return '<span class="tag">' + (ICONOS[p.asig] || "") + " " + esc(CORTO[p.asig] || p.asig) + " · T" + p.tema + '</span>'; }

  function pintarExamen() {
    var n = {}; examen.forEach(function (p) { n[p.asig] = 1; });
    $("examInfo").textContent = examen.length + " preguntas · " + Object.keys(n).map(function (id) { return CORTO[id]; }).join(", ") +
      (prefs.inmediata ? " · modo práctica" : "");
    $("preguntas").innerHTML = examen.map(function (p, i) {
      return '<li class="preg" id="q' + i + '"><div class="preg-h"><span class="q-n">' + (i + 1) + '</span>' + etiqueta(p) + '</div>' +
        '<p class="enun">' + esc(p.q) + '</p><div class="opts">' +
        p.opciones.map(function (o, j) {
          return '<label class="opt"><input type="radio" name="p' + i + '" data-i="' + i + '" data-j="' + j + '">' +
            '<span class="letra">' + "ABCD"[j] + '</span><span class="o-txt">' + esc(o) + '</span><span class="ico"></span></label>';
        }).join("") + '</div></li>';
    }).join("");
    progreso();
  }

  function progreso() {
    var n = examen.filter(function (p) { return p.resp !== null; }).length;
    $("progTxt").textContent = n + " / " + examen.length + " respondidas";
    $("progBar").style.width = (examen.length ? 100 * n / examen.length : 0) + "%";
  }

  $("preguntas").addEventListener("change", function (e) {
    var d = e.target.dataset; if (d.i === undefined) return;
    var p = examen[+d.i]; p.resp = +d.j; progreso();
    var li = e.target.closest(".preg"); li.classList.add("resp");
    if (prefs.inmediata) {
      var ok = p.opciones[p.resp] === p.correcta;
      li.classList.add(ok ? "ok" : "mal");
      [].forEach.call(li.querySelectorAll("label.opt"), function (l, j) {
        l.querySelector("input").disabled = true;
        if (p.opciones[j] === p.correcta) { l.classList.add("correcta"); l.querySelector(".ico").textContent = "✓"; }
        else if (j === p.resp) { l.classList.add("elegida"); l.querySelector(".ico").textContent = "✕"; }
      });
      li.insertAdjacentHTML("beforeend", fuenteHTML(p));
    }
  });

  $("btnGenerar").onclick = generar;
  $("btnCancelar").onclick = function () { if (confirm("¿Salir del examen? Se perderán las respuestas.")) { pintarAsignaturas(); vista("vSeleccion"); } };
  $("btnCorregir").onclick = function () {
    var blanco = examen.filter(function (p) { return p.resp === null; }).length;
    if (blanco && !confirm("Tienes " + blanco + " pregunta(s) sin responder. ¿Corregir igualmente?")) return;
    corregir();
  };

  // ================= CORRECCIÓN =================
  function corregir() {
    var ok = 0, mal = 0, bl = 0, porTema = {};
    examen.forEach(function (p) {
      p.estado = p.resp === null ? "blanco" : (p.opciones[p.resp] === p.correcta ? "ok" : "mal");
      if (p.estado === "ok") ok++; else if (p.estado === "mal") mal++; else bl++;
      var k = p.asig + "_" + p.tema;
      var t = porTema[k] = porTema[k] || { p: p, ok: 0, total: 0, pags: {} };
      t.total++; if (p.estado === "ok") t.ok++; else t.pags[p.pag] = 1;
    });
    var nota = Math.round((ok / examen.length) * 100) / 10;
    $("nota").textContent = nota.toLocaleString("es-ES");
    var C = 2 * Math.PI * 52;
    $("ringFg").style.strokeDasharray = C; $("ringFg").style.strokeDashoffset = C * (1 - nota / 10);
    document.querySelector(".score").className = "score " + (nota >= 5 ? "aprob" : "susp");
    $("notaTxt").textContent = nota >= 9 ? "¡Sobresaliente!" : nota >= 7 ? "¡Notable!" : nota >= 5 ? "Aprobado" : "Toca repasar";
    $("stats").innerHTML = '<span class="s ok">✓ ' + ok + ' aciertos</span><span class="s mal">✕ ' + mal + ' fallos</span><span class="s bl">○ ' + bl + ' en blanco</span>';

    var ks = Object.keys(porTema).sort(function (a, b) { return porTema[a].ok / porTema[a].total - porTema[b].ok / porTema[b].total; });
    $("desglose").innerHTML = ks.map(function (k) {
      var t = porTema[k], a = asigPorId(t.p.asig), pc = Math.round(100 * t.ok / t.total);
      return '<div class="dg"><div class="dg-h"><span>' + (ICONOS[a.id] || "") + ' ' + esc(CORTO[a.id]) + ' · <strong>T' + t.p.tema + '</strong></span>' +
        '<span class="muted">' + t.ok + '/' + t.total + '</span></div>' +
        '<div class="dg-bar ' + (pc >= 50 ? "b-ok" : "b-mal") + '"><span style="width:' + pc + '%"></span></div></div>';
    }).join("");

    var fallos = ks.filter(function (k) { return porTema[k].ok < porTema[k].total; });
    $("repaso").innerHTML = '<h3>Qué repasar</h3>' + (fallos.length ? '<ul class="rep">' + fallos.map(function (k) {
      var t = porTema[k], a = asigPorId(t.p.asig);
      var pags = Object.keys(t.pags).map(Number).sort(function (x, y) { return x - y; });
      return '<li><div><strong>' + esc(a.nombre) + '</strong></div><div class="muted small">Tema ' + t.p.tema + ': ' + esc(a.temas[t.p.tema - 1]) + '</div>' +
        '<div class="pags">' + pags.map(function (n) { return '<span class="pg">pág. ' + n + '</span>'; }).join("") + '</div></li>';
    }).join("") + '</ul>' : '<p class="muted">¡Pleno! No hay nada que repasar. 🎉</p>');

    $("correccion").innerHTML = examen.map(function (p, i) {
      return '<li class="preg ' + p.estado + '"><div class="preg-h"><span class="q-n">' + (i + 1) + '</span>' + etiqueta(p) +
        '<span class="est est-' + p.estado + '">' + { ok: "Correcta", mal: "Fallada", blanco: "En blanco" }[p.estado] + '</span></div>' +
        '<p class="enun">' + esc(p.q) + '</p><div class="opts">' +
        p.opciones.map(function (o, j) {
          var c = o === p.correcta ? " correcta" : (j === p.resp ? " elegida" : "");
          return '<div class="opt' + c + '"><span class="letra">' + "ABCD"[j] + '</span><span class="o-txt">' + esc(o) + '</span><span class="ico">' +
            (o === p.correcta ? "✓" : (j === p.resp ? "✕" : "")) + '</span></div>';
        }).join("") + '</div>' + fuenteHTML(p) + '</li>';
    }).join("");
    filtrar("todas");
    vista("vResultado");
  }

  function filtrar(f) {
    [].forEach.call($("filtro").children, function (b) { b.classList.toggle("on", b.dataset.f === f); });
    $("correccion").setAttribute("data-f", f);
  }
  $("filtro").addEventListener("click", function (e) { var b = e.target.closest("button"); if (b) filtrar(b.dataset.f); });
  $("btnRepetir").onclick = generar;
  $("btnVolver").onclick = function () { pintarAsignaturas(); vista("vSeleccion"); };
  $("logo").onclick = function () { if ($("vExamen").hidden || confirm("¿Salir del examen?")) { pintarAsignaturas(); vista("vSeleccion"); } };

  // ================= PERSONALIZACIÓN =================
  var COLORES = [
    { id: "lila", nombre: "Lila", c: "#7a3e9d" }, { id: "oceano", nombre: "Océano", c: "#1f6fb2" },
    { id: "bosque", nombre: "Bosque", c: "#2e7d4f" }, { id: "coral", nombre: "Coral", c: "#d2553f" },
    { id: "oro", nombre: "Oro", c: "#b07d12" }, { id: "rosa", nombre: "Rosa", c: "#c2387a" },
    { id: "turquesa", nombre: "Turquesa", c: "#13878f" }, { id: "grafito", nombre: "Grafito", c: "#4a5260" }
  ];
  var PREF_DEF = { color: "lila", modo: "auto", letra: "normal", n: CONFIG.PREGUNTAS_POR_EXAMEN, inmediata: false };
  var prefs = Object.assign({}, PREF_DEF, leer("prefs", {}));

  function aplicarPrefs() {
    var h = document.documentElement;
    h.setAttribute("data-color", prefs.color);
    if (prefs.modo === "auto") h.removeAttribute("data-theme"); else h.setAttribute("data-theme", prefs.modo);
    h.setAttribute("data-letra", prefs.letra);
    N = +prefs.n || 20;
  }
  function pintarAjustes() {
    $("optColor").innerHTML = COLORES.map(function (c) {
      return '<button class="sw' + (prefs.color === c.id ? " on" : "") + '" data-color="' + c.id + '" style="--sw:' + c.c + '"><span></span>' + c.nombre + '</button>';
    }).join("");
    [["optModo", "modo"], ["optLetra", "letra"]].forEach(function (g) {
      [].forEach.call($(g[0]).children, function (b) { b.classList.toggle("on", String(prefs[g[1]]) === b.dataset.v); });
    });
  }
  function guardarPrefs() { guardar("prefs", prefs); aplicarPrefs(); pintarAjustes(); if (!$("vSeleccion").hidden) pintarPanel(); }

  $("btnAjustes").onclick = function () { pintarAjustes(); $("ajustes").hidden = false; };
  $("ajustesCerrar").onclick = function () { $("ajustes").hidden = true; };
  $("ajustes").addEventListener("click", function (e) {
    if (e.target === $("ajustes")) { $("ajustes").hidden = true; return; }
    var b = e.target.closest("button"); if (!b) return;
    if (b.dataset.color) { prefs.color = b.dataset.color; guardarPrefs(); }
    else if (b.parentNode.dataset.pref) { prefs[b.parentNode.dataset.pref] = b.dataset.v; guardarPrefs(); }
    else if (b.id === "ajustesReset") { prefs = Object.assign({}, PREF_DEF); guardarPrefs(); }
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") $("ajustes").hidden = true; });

  // ================= INICIO =================
  aplicarPrefs();
  seleccion = leer("sel", {});
  document.body.setAttribute("data-vista", "vSeleccion");
  cargarDatos(pintarAsignaturas);
})();
