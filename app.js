// Simulador de exámenes. Funciona abriendo index.html directamente (sin servidor) o en un hosting.
// Cada tema tiene su banco en data/<asignatura>_t<n>.js, que llama a BANCO.add(...).
// Formato de pregunta: [página, "enunciado", "respuesta correcta", "incorrecta 1", "incorrecta 2", "incorrecta 3"]
(function () {
  "use strict";

  var BANCO = { datos: {} };
  window.BANCO = BANCO;
  BANCO.casos = {};
  BANCO.add = function (asig, tema, preguntas) { BANCO.datos[asig + "_" + tema] = preguntas; };
  // Casos prácticos: sección aparte de cada tema. Se guardan como banco "asig_n_c" (preguntas aplanadas,
  // cada una con el índice de su caso en la posición 7) y la lista de casos en BANCO.casos.
  window.CASOS = { add: function (asig, tema, casos) {
    var k = asig + "_" + tema + "_c", plano = [];
    casos.forEach(function (c, ci) { c.preguntas.forEach(function (q) { plano.push(q.slice(0, 7).concat([ci])); }); });
    BANCO.casos[k] = casos; BANCO.datos[k] = plano;
  } };

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
  function clavesC(a) { return a.temas.map(function (_, i) { return a.id + "_" + (i + 1) + "_c"; }).filter(function (k) { return BANCO.datos[k]; }); }
  function todasClaves(a) { var r = []; claves(a).forEach(function (k) { r.push(k); if (BANCO.datos[k + "_c"]) r.push(k + "_c"); }); return r; }
  function esCaso(k) { return /_c$/.test(k); }
  function fuenteHTML(p) {
    var a = asigPorId(p.asig);
    return '<div class="fuente"><span class="f-i">📖</span><span><strong>' + esc(a.nombre) + '</strong> · Tema ' + p.tema + ': ' +
      esc(a.temas[p.tema - 1]) + (p.caso ? ' · Caso práctico «' + esc(p.caso.titulo) + '»' : "") +
      ' · <span class="pag">Página ' + p.pag + '</span></span></div>';
  }
  function idHTML(p) { return p.id ? '<button type="button" class="qid" data-id="' + esc(p.id) + '" title="Copiar el código de la pregunta">#' + esc(p.id) + '</button>' : ""; }

  // ---------- Carga de datos ----------
  function cargarDatos(cb) {
    var pend = 0;
    ASIGNATURAS.forEach(function (a) {
      a.temas.forEach(function (_, i) {
        ["", "_casos"].forEach(function (suf) {
          pend++;
          var s = document.createElement("script");
          s.src = "data/" + a.id + "_t" + (i + 1) + suf + ".js";
          s.onload = s.onerror = function () { if (--pend === 0) cb(); };
          document.head.appendChild(s);
        });
      });
    });
  }

  function vista(v) {
    ["vSeleccion", "vExamen", "vResultado", "vStats", "vAdmin"].forEach(function (id) { $(id).hidden = id !== v; });
    document.body.setAttribute("data-vista", v);
    window.scrollTo(0, 0);
  }

  // ================= SELECCIÓN =================
  function pintarAsignaturas() {
    var total = 0;
    $("asignaturas").innerHTML = ASIGNATURAS.map(function (a) {
      var ks = todasClaves(a), marcados = ks.filter(function (k) { return seleccion[k]; }).length;
      var nTemas = claves(a).length, temasMarc = claves(a).filter(function (k) { return seleccion[k] || seleccion[k + "_c"]; }).length;
      var estado = marcados === 0 ? "" : marcados === ks.length ? " full" : " partial";
      var temas = a.temas.map(function (t, i) {
        var k = a.id + "_" + (i + 1), q = BANCO.datos[k], n = q ? q.length : 0; total += n;
        var kc = k + "_c", cs = BANCO.casos[kc], nc = cs ? BANCO.datos[kc].length : 0; total += nc;
        var txt = esc(norm(a.nombre + " " + t));
        var bCaso = cs ? '<button class="caso-btn' + (seleccion[kc] ? " on" : "") + '" data-k="' + kc + '" aria-pressed="' + !!seleccion[kc] + '">' +
          '<span class="c-ico">🧩</span><span class="c-txt">Casos prácticos <small>' + cs.length + (cs.length === 1 ? " caso · " : " casos · ") + nc + ' preguntas</small></span>' +
          '<span class="t-check" aria-hidden="true"></span></button>' : "";
        return '<div class="topic-w" data-txt="' + txt + '"><button class="topic' + (seleccion[k] ? " on" : "") + '" data-k="' + k + '" aria-pressed="' + !!seleccion[k] + '"' +
          (n ? "" : " disabled") + ' data-txt="' + esc(norm(a.nombre + " " + t)) + '">' +
          '<span class="t-num">' + (i + 1) + '</span>' +
          '<span class="t-txt">' + esc(t) + '<small>' + (n ? n + " preguntas" : "Sin preguntas") + '</small></span>' +
          '<span class="t-check" aria-hidden="true"></span></button>' + bCaso + '</div>';
      }).join("");
      return '<article class="asig' + estado + '" data-a="' + a.id + '">' +
        '<header class="asig-h">' +
          '<span class="asig-ico">' + (ICONOS[a.id] || "📘") + '</span>' +
          '<div class="asig-tit"><h3>' + esc(a.nombre) + '</h3><span class="muted small">' +
            (temasMarc ? temasMarc + " de " + nTemas + " temas" : nTemas + " temas") + '</span></div>' +
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
    ASIGNATURAS.forEach(function (a) { todasClaves(a).forEach(function (k) { if (seleccion[k]) r.push(k); }); });
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
    var hayC = t.some(esCaso), pal = hayC ? [" sección", " secciones"] : [" tema", " temas"];
    $("selCount").textContent = t.length + (t.length === 1 ? pal[0] : pal[1]);
    $("panel").classList.toggle("activo", t.length > 0);
    [].forEach.call($("segN").children, function (b) { b.classList.toggle("on", +b.dataset.v === N); });
    $("swPractica").checked = !!prefs.inmediata;

    if (!t.length) {
      $("selList").innerHTML = '<div class="sel-empty"><span>☝</span>Aún no has elegido temas.<br>Tócalos en la lista para añadirlos.</div>';
      $("selReparto").textContent = "Elige al menos un tema";
      return;
    }
    var grupos = {};
    t.forEach(function (k) { var p = k.split("_"); (grupos[p[0]] = grupos[p[0]] || []).push(k); });
    $("selList").innerHTML = Object.keys(grupos).map(function (id) {
      return '<div class="sel-g"><div class="sel-g-h">' + (ICONOS[id] || "") + ' ' + esc(CORTO[id] || asigPorId(id).nombre) + '</div>' +
        '<div class="sel-chips">' + grupos[id].map(function (k) {
          return '<button class="mini-chip' + (esCaso(k) ? " chip-caso" : "") + '" data-k="' + k + '" title="Quitar">T' + k.split("_")[1] + (esCaso(k) ? " 🧩" : "") + ' <span>×</span></button>';
        }).join("") + '</div></div>';
    }).join("");
    var base = Math.floor(N / t.length), resto = N % t.length;
    $("selReparto").textContent = t.length > N
      ? N + " preguntas de " + N + " temas al azar"
      : N + " preguntas · " + (resto ? base + "–" + (base + 1) : base) + (hayC ? " por sección" : " por tema");
  }

  function aplicarFiltro() {
    var q = norm($("buscar").value.trim()), alguno = false;
    [].forEach.call(document.querySelectorAll(".asig"), function (card) {
      var vis = 0;
      [].forEach.call(card.querySelectorAll(".topic-w"), function (b) {
        var ok = !q || b.dataset.txt.indexOf(q) >= 0; b.hidden = !ok; if (ok) vis++;
      });
      card.hidden = vis === 0; if (vis) alguno = true;
    });
    $("sinResultados").hidden = alguno;
  }

  function setTema(k, on) { if (BANCO.datos[k]) { if (on) seleccion[k] = true; else delete seleccion[k]; } }
  function cambio() { guardar("sel", seleccion); pintarAsignaturas(); }

  $("asignaturas").addEventListener("click", function (e) {
    var b = e.target.closest(".topic, .caso-btn, .asig-all"); if (!b || b.disabled) return;
    if (!b.classList.contains("asig-all")) { setTema(b.dataset.k, !seleccion[b.dataset.k]); }
    else {
      var ks = todasClaves(asigPorId(b.dataset.asig)), todos = ks.every(function (k) { return seleccion[k]; });
      ks.forEach(function (k) { setTema(k, !todos); });
    }
    cambio();
  });
  $("selList").addEventListener("click", function (e) { var b = e.target.closest(".mini-chip"); if (b) { setTema(b.dataset.k, false); cambio(); } });
  $("buscar").addEventListener("input", aplicarFiltro);
  $("btnLimpiar").onclick = function () { seleccion = {}; cambio(); };
  $("btnTodo").onclick = function () { ASIGNATURAS.forEach(function (a) { todasClaves(a).forEach(function (k) { setTema(k, true); }); }); cambio(); };
  $("btnAzar").onclick = function () {
    var todas = []; ASIGNATURAS.forEach(function (a) { todas = todas.concat(claves(a)); });
    seleccion = {}; barajar(todas).slice(0, 3).forEach(function (k) { setTema(k, true); }); cambio();
  };
  $("segN").addEventListener("click", function (e) { var b = e.target.closest("button"); if (b) { prefs.n = +b.dataset.v; guardarPrefs(); } });
  $("swPractica").onchange = function () { prefs.inmediata = this.checked; guardarPrefs(); };

  // ================= EXAMEN =================
  function itemDe(k, p) {
    var partes = k.split("_"), it = { k: k, asig: partes[0], tema: +partes[1], pag: p[0], q: p[1], correcta: p[2],
      opciones: barajar(p.slice(2, 6)), id: p[6] || "", resp: null };
    if (esCaso(k)) { var c = BANCO.casos[k][p[7]]; it.caso = { id: c.id, titulo: c.titulo, contexto: c.contexto, pag: c.pag }; }
    return it;
  }
  function generar() {
    var r = reparto(temasSeleccionados()), vistas = leer("vistas", {}), unidades = [];
    Object.keys(r).forEach(function (k) {
      var banco = BANCO.datos[k], clave = function (i) { return banco[i][6] || (k + "_" + i); };
      var vis = function (i) { return vistas[clave(i)] || 0; };
      if (esCaso(k)) {
        // Casos prácticos: se eligen casos completos (primero los menos vistos) hasta cubrir el cupo.
        var idxDe = function (ci) { return banco.map(function (p, i) { return p[7] === ci ? i : -1; }).filter(function (i) { return i >= 0; }); };
        var media = function (ci) { var l = idxDe(ci); return l.reduce(function (s, i) { return s + vis(i); }, 0) / l.length; };
        var casos = barajar(BANCO.casos[k].map(function (_, ci) { return ci; })), falta = r[k];
        casos.sort(function (x, y) { return media(x) - media(y); });
        casos.forEach(function (ci) {
          if (falta <= 0) return;
          var idx = idxDe(ci).slice(0, falta); falta -= idx.length;
          unidades.push(idx.map(function (i) { vistas[clave(i)] = vis(i) + 1; return itemDe(k, banco[i]); }));
        });
      } else {
        var idx = barajar(banco.map(function (_, i) { return i; }));
        idx.sort(function (x, y) { return vis(x) - vis(y); }); // primero las no vistas
        idx.slice(0, r[k]).forEach(function (i) { vistas[clave(i)] = vis(i) + 1; unidades.push([itemDe(k, banco[i])]); });
      }
    });
    guardar("vistas", vistas);
    // Se barajan las unidades; las preguntas de un mismo caso quedan juntas tras su contexto.
    examen = [].concat.apply([], barajar(unidades));
    pintarExamen();
    vista("vExamen");
  }

  function etiqueta(p) { return '<span class="tag">' + (ICONOS[p.asig] || "") + " " + esc(CORTO[p.asig] || p.asig) + " · T" + p.tema + (p.caso ? " · 🧩 Caso" : "") + '</span>'; }
  function contextoHTML(p, i) {
    if (!p.caso || (i > 0 && examen[i - 1].caso && examen[i - 1].caso.id === p.caso.id)) return "";
    var n = examen.filter(function (x) { return x.caso && x.caso.id === p.caso.id; }).length;
    return '<li class="caso-ctx"><div class="cc-h"><span class="cc-ico">🧩</span><div class="cc-t"><span class="cc-k">Caso práctico · ' +
      esc(CORTO[p.asig] || p.asig) + " · T" + p.tema + '</span><h3>' + esc(p.caso.titulo) + '</h3></div>' +
      '<span class="qid-c">#' + esc(p.caso.id) + '</span></div><p>' + esc(p.caso.contexto) + '</p><span class="muted small">Responde ' +
      (n === 1 ? "la siguiente pregunta" : "las " + n + " preguntas siguientes") + ' a partir de este caso.</span></li>';
  }

  function pintarExamen() {
    var n = {}; examen.forEach(function (p) { n[p.asig] = 1; });
    $("examInfo").textContent = examen.length + " preguntas · " + Object.keys(n).map(function (id) { return CORTO[id]; }).join(", ") +
      (prefs.inmediata ? " · modo práctica" : "");
    $("preguntas").innerHTML = examen.map(function (p, i) {
      return contextoHTML(p, i) + '<li class="preg' + (p.caso ? " de-caso" : "") + '" id="q' + i + '"><div class="preg-h"><span class="q-n">' + (i + 1) + '</span>' + etiqueta(p) + idHTML(p) + '</div>' +
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

  function copiarId(e) {
    var b = e.target.closest(".qid"); if (!b) return;
    e.preventDefault();
    var t = b.dataset.id, ok = function () { b.classList.add("copiado"); b.textContent = "✓ copiado"; setTimeout(function () { b.classList.remove("copiado"); b.textContent = "#" + t; }, 1400); };
    try { navigator.clipboard.writeText(t).then(ok, ok); } catch (x) { ok(); }
  }
  $("preguntas").addEventListener("click", copiarId);
  $("correccion").addEventListener("click", copiarId);
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
      var k = p.k;
      var t = porTema[k] = porTema[k] || { p: p, ok: 0, total: 0, pags: {} };
      t.total++; if (p.estado === "ok") t.ok++; else t.pags[p.pag] = 1;
    });
    var nota = Math.round((ok / examen.length) * 100) / 10;
    var res = { nota: nota, n: examen.length, ok: ok, mal: mal, bl: bl, porTema: {} };
    examen.forEach(function (p) {
      var k = p.k, t = res.porTema[k] = res.porTema[k] || { ok: 0, mal: 0, bl: 0, pags: {} };
      if (p.estado === "ok") t.ok++; else { t[p.estado === "mal" ? "mal" : "bl"]++; t.pags[p.pag] = (t.pags[p.pag] || 0) + 1; }
    });
    pendiente = res; guardarResultado();
    $("nota").textContent = nota.toLocaleString("es-ES");
    var C = 2 * Math.PI * 52;
    $("ringFg").style.strokeDasharray = C; $("ringFg").style.strokeDashoffset = C * (1 - nota / 10);
    document.querySelector(".score").className = "score " + (nota >= 5 ? "aprob" : "susp");
    $("notaTxt").textContent = nota >= 9 ? "¡Sobresaliente!" : nota >= 7 ? "¡Notable!" : nota >= 5 ? "Aprobado" : "Toca repasar";
    $("stats").innerHTML = '<span class="s ok">✓ ' + ok + (ok === 1 ? ' acierto' : ' aciertos') + '</span><span class="s mal">✕ ' + mal + (mal === 1 ? ' fallo' : ' fallos') + '</span><span class="s bl">○ ' + bl + ' en blanco</span>';

    var ks = Object.keys(porTema).sort(function (a, b) { return porTema[a].ok / porTema[a].total - porTema[b].ok / porTema[b].total; });
    $("desglose").innerHTML = ks.map(function (k) {
      var t = porTema[k], a = asigPorId(t.p.asig), pc = Math.round(100 * t.ok / t.total);
      return '<div class="dg"><div class="dg-h"><span>' + (ICONOS[a.id] || "") + ' ' + esc(CORTO[a.id]) + ' · <strong>T' + t.p.tema + (esCaso(k) ? " 🧩 casos" : "") + '</strong></span>' +
        '<span class="muted">' + t.ok + '/' + t.total + '</span></div>' +
        '<div class="dg-bar ' + (pc >= 50 ? "b-ok" : "b-mal") + '"><span style="width:' + pc + '%"></span></div></div>';
    }).join("");

    var fallos = ks.filter(function (k) { return porTema[k].ok < porTema[k].total; });
    $("repaso").innerHTML = '<h3>Qué repasar</h3>' + (fallos.length ? '<ul class="rep">' + fallos.map(function (k) {
      var t = porTema[k], a = asigPorId(t.p.asig);
      var pags = Object.keys(t.pags).map(Number).sort(function (x, y) { return x - y; });
      return '<li><div><strong>' + esc(a.nombre) + '</strong></div><div class="muted small">Tema ' + t.p.tema + ': ' + esc(a.temas[t.p.tema - 1]) + (esCaso(k) ? " · Casos prácticos" : "") + '</div>' +
        '<div class="pags">' + pags.map(function (n) { return '<span class="pg">pág. ' + n + '</span>'; }).join("") + '</div></li>';
    }).join("") + '</ul>' : '<p class="muted">¡Pleno! No hay nada que repasar. 🎉</p>');

    $("correccion").innerHTML = examen.map(function (p, i) {
      return contextoHTML(p, i) + '<li class="preg ' + p.estado + (p.caso ? " de-caso" : "") + '"><div class="preg-h"><span class="q-n">' + (i + 1) + '</span>' + etiqueta(p) + idHTML(p) +
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
    // Oculta el contexto de un caso si ninguna de sus preguntas queda visible con el filtro.
    [].forEach.call($("correccion").querySelectorAll(".caso-ctx"), function (ctx) {
      var vis = false, n = ctx.nextElementSibling;
      while (n && n.classList.contains("de-caso")) {
        if (f === "todas" || f === (n.classList.contains("ok") ? "ok" : "mal")) vis = true;
        n = n.nextElementSibling;
      }
      ctx.hidden = !vis;
    });
  }
  $("filtro").addEventListener("click", function (e) { var b = e.target.closest("button"); if (b) filtrar(b.dataset.f); });
  $("btnRepetir").onclick = generar;
  $("btnVolver").onclick = function () { pintarAsignaturas(); vista("vSeleccion"); };
  $("logo").onclick = function () { if ($("vExamen").hidden || confirm("¿Salir del examen?")) irInicio(); };
  function irInicio() { pintarAsignaturas(); vista("vSeleccion"); }

  // ================= USUARIOS =================
  var pendiente = null;   // resumen del último examen aún no guardado
  var tabAcceso = "entrar";

  function fecha(ts) { return ts ? new Date(ts).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" }) : "—"; }
  function hace(ts) {
    if (!ts) return "nunca";
    var d = Math.floor((Date.now() - ts) / 86400000);
    return d <= 0 ? "hoy" : d === 1 ? "ayer" : d < 30 ? "hace " + d + " días" : fecha(ts);
  }
  function fmt(n, dec) { return (Math.round(n * Math.pow(10, dec || 0)) / Math.pow(10, dec || 0)).toLocaleString("es-ES"); }
  function inicial(n) { return esc((n || "?").trim().charAt(0).toUpperCase()); }

  function pintarUsuario() {
    var u = CUENTAS.actual();
    $("avatar").innerHTML = u ? inicial(u.nombre) : "👤";
    $("avatar").classList.toggle("on", !!u);
    $("userNombre").textContent = u ? u.nombre : "Entrar";
    $("menuNombre").innerHTML = u ? '<strong>' + esc(u.nombre) + '</strong><span class="muted small">' +
      (u.admin ? "Usuario master" : CUENTAS.modo === "nube" ? "Sincronizado en la nube" : "Guardado en este navegador") + '</span>' : "";
    $("menuAdmin").hidden = !(u && u.admin);
  }
  function cerrarMenu() { $("menuUsuario").hidden = true; $("btnUsuario").setAttribute("aria-expanded", "false"); }

  $("btnUsuario").onclick = function (e) {
    e.stopPropagation();
    if (!CUENTAS.actual()) { abrirAcceso("entrar"); return; }
    var m = $("menuUsuario"); m.hidden = !m.hidden; this.setAttribute("aria-expanded", String(!m.hidden));
  };
  document.addEventListener("click", function (e) { if (!e.target.closest(".user-w")) cerrarMenu(); });
  $("menuUsuario").addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    cerrarMenu();
    if (!$("vExamen").hidden && !confirm("¿Salir del examen?")) return;
    if (b.dataset.m === "stats") verStats();
    else if (b.dataset.m === "admin") verAdmin();
    else if (b.dataset.m === "salir") CUENTAS.salir().then(function () { pintarUsuario(); irInicio(); abrirAcceso("entrar"); });
  });

  // ---------- Acceso / registro ----------
  function abrirAcceso(tab) {
    $("accNombre").value = ""; $("accPwd").value = "";
    $("accModo").textContent = CUENTAS.modo === "nube" ? "☁ Se guarda en la nube" : "Solo en este navegador";
    tabAccesoSet(tab || "entrar");
    $("acceso").hidden = false;
    setTimeout(function () { $("accNombre").focus(); }, 30);
  }
  function tabAccesoSet(t) {
    tabAcceso = t;
    [].forEach.call($("accTabs").children, function (b) { b.classList.toggle("on", b.dataset.t === t); });
    $("accOk").textContent = t === "entrar" ? "Entrar" : "Crear usuario";
    $("accAviso").textContent = t === "crear"
      ? "Cualquiera que escriba tu nombre de usuario podrá entrar con él, así que elige uno que no sea tu nombre completo."
      : "";
    $("accErr").textContent = "";
    revisarPwd();
  }
  function revisarPwd() {
    var adm = tabAcceso === "entrar" && CUENTAS.esAdminNombre($("accNombre").value);
    $("accPwdW").hidden = !adm;
  }
  $("accTabs").addEventListener("click", function (e) { var b = e.target.closest("button"); if (b) tabAccesoSet(b.dataset.t); });
  $("accNombre").addEventListener("input", function () { $("accErr").textContent = ""; revisarPwd(); });
  $("accCerrar").onclick = function () { $("acceso").hidden = true; };
  $("acceso").addEventListener("click", function (e) { if (e.target === $("acceso")) $("acceso").hidden = true; });
  $("accInvitado").onclick = function () { guardar("invitado", true); $("acceso").hidden = true; };
  $("accForm").onsubmit = function (e) {
    e.preventDefault();
    var btn = $("accOk"), nombre = $("accNombre").value;
    btn.disabled = true; $("accErr").textContent = "";
    var p = tabAcceso === "entrar" ? CUENTAS.entrar(nombre, $("accPwd").value) : CUENTAS.crear(nombre);
    p.then(function () {
      $("acceso").hidden = true; guardar("invitado", false); pintarUsuario();
      if (pendiente && !pendiente.guardado) guardarResultado();
    }).catch(function (err) {
      $("accErr").textContent = err.message || String(err);
    }).then(function () { btn.disabled = false; });
  };

  // ---------- Guardar el resultado del examen ----------
  function guardarResultado() {
    var g = $("guardado"), u = CUENTAS.actual(), r = pendiente;
    if (!r) return;
    if (!u) {
      g.className = "guardado small";
      g.innerHTML = '<button class="lnk" id="gEntrar">Entra con tu usuario</button> para guardar este resultado en tus estadísticas.';
      $("gEntrar").onclick = function () { abrirAcceso("entrar"); };
      return;
    }
    g.className = "guardado small"; g.textContent = "Guardando…";
    CUENTAS.registrarExamen(r).then(function () {
      r.guardado = true;
      g.className = "guardado small ok";
      g.innerHTML = '✓ Guardado en las estadísticas de ' + esc(u.nombre) + ' · <button class="lnk" id="gVer">Ver estadísticas</button>';
      $("gVer").onclick = function () { verStats(); };
    }).catch(function (e) {
      console.error(e);
      g.className = "guardado small mal";
      g.textContent = "No se ha podido guardar el resultado (" + (e.code || e.message) + ").";
    });
  }

  // ---------- Estadísticas ----------
  function infoTema(k) { var p = k.split("_"), a = asigPorId(p[0]); return a && a.temas[+p[1] - 1] ? { a: a, n: +p[1], t: a.temas[+p[1] - 1] + (p[2] === "c" ? " · Casos prácticos" : "") } : null; }
  function nivel(pc) {
    return pc >= 80 ? { c: "dom", t: "Dominado", i: "★" } : pc >= 50 ? { c: "apr", t: "Aprobado", i: "✓" } : { c: "rep", t: "Repasar", i: "!" };
  }
  function badge(nv) { return '<span class="nv nv-' + nv.c + '">' + nv.i + " " + nv.t + '</span>'; }
  function totalT(d) { return d.ok + d.mal + d.bl; }
  var repasarActual = [];

  function verStats(id) {
    var ajeno = !!id && id !== (CUENTAS.actual() || {}).id;
    vista("vStats");
    $("stTitulo").textContent = "Estadísticas"; $("stSub").textContent = "";
    $("stPracticar").hidden = true;
    $("stCuerpo").innerHTML = '<p class="muted cargando">Cargando…</p>';
    $("stVolver").onclick = ajeno ? verAdmin : irInicio;
    CUENTAS.datos(id).then(function (d) { pintarStats(d, ajeno); })
      .catch(function (e) { $("stCuerpo").innerHTML = '<p class="acc-err">No se han podido cargar las estadísticas (' + esc(e.code || e.message) + ').</p>'; });
  }

  function graficoNotas(ex) {
    var W = 640, H = 190, L = 28, R = 8, T = 10, B = 22, iw = W - L - R, ih = H - T - B, n = ex.length;
    var slot = iw / Math.max(n, 1), bw = Math.max(4, Math.min(26, slot - 6));
    var y = function (v) { return T + ih - ih * v / 10; };
    var g = [0, 5, 10].map(function (v) {
      return '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(v) + '" y2="' + y(v) + '" class="' + (v === 5 ? "g5" : "g") + '"/>' +
        '<text x="' + (L - 6) + '" y="' + (y(v) + 4) + '" class="ax" text-anchor="end">' + v + '</text>';
    }).join("");
    var bars = ex.map(function (e, i) {
      var x = L + slot * i + (slot - bw) / 2, h = Math.max(2, ih * e.nota / 10), r = Math.min(4, bw / 2);
      var top = y(e.nota), base = T + ih;
      var path = "M" + x + "," + base + "V" + (top + r) + "Q" + x + "," + top + " " + (x + r) + "," + top + "H" + (x + bw - r) +
        "Q" + (x + bw) + "," + top + " " + (x + bw) + "," + (top + r) + "V" + base + "Z";
      if (h <= r) path = "M" + x + "," + base + "V" + top + "H" + (x + bw) + "V" + base + "Z";
      return '<g class="bar"><rect x="' + (L + slot * i) + '" y="' + T + '" width="' + slot + '" height="' + ih + '" class="hit"/>' +
        '<path d="' + path + '" class="' + (e.nota >= 5 ? "b-a" : "b-s") + '"/>' +
        '<title>' + fecha(e.fecha) + ": " + fmt(e.nota, 1) + " (" + e.ok + "/" + e.n + ")</title></g>";
    }).join("");
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" class="chart" role="img" aria-label="Notas de los últimos exámenes">' + g + bars +
      '<text x="' + (W - R) + '" y="' + (y(5) - 5) + '" class="ax" text-anchor="end">aprobado</text>' +
      '<text x="' + L + '" y="' + (H - 4) + '" class="ax">' + (n > 1 ? "más antiguo" : "") + '</text>' +
      '<text x="' + (W - R) + '" y="' + (H - 4) + '" class="ax" text-anchor="end">más reciente</text></svg>';
  }

  function pintarStats(d, ajeno) {
    var u = d.usuario;
    if (!u) { $("stCuerpo").innerHTML = '<p class="acc-err">Este usuario ya no existe.</p>'; return; }
    $("stTitulo").textContent = ajeno ? "Estadísticas de " + u.nombre : "Mis estadísticas";
    $("stSub").textContent = (ajeno ? "@" + d.id + " · " : "") + "Usuario desde el " + fecha(u.creado) + " · último examen " + hace(u.examenes ? u.ultimo : 0);
    if (!u.examenes) {
      $("stCuerpo").innerHTML = '<div class="card vacio-st"><div class="big-ico">📊</div><h3>' + (ajeno ? "Aún no ha hecho ningún examen" : "Aún no has hecho ningún examen") + '</h3>' +
        (ajeno ? "" : '<p class="muted">Haz un examen y aquí verás tu nota media, tu evolución y los temas que tienes que repasar.</p><button class="btn" id="stEmpezar">Elegir temas</button>') + '</div>';
      if (!ajeno) $("stEmpezar").onclick = irInicio;
      return;
    }

    var media = u.sumaNotas / u.examenes, pcAc = u.preguntas ? 100 * u.aciertos / u.preguntas : 0;
    var temas = Object.keys(u.temas || {}).filter(function (k) { return infoTema(k) && totalT(u.temas[k]) > 0; });
    var cuenta = { dom: 0, apr: 0, rep: 0 };
    temas.forEach(function (k) { var t = u.temas[k]; cuenta[nivel(100 * t.ok / totalT(t)).c]++; });
    var totalTemas = 0; ASIGNATURAS.forEach(function (a) { totalTemas += claves(a).length; });

    var kpis = '<div class="kpis">' +
      '<div class="kpi"><span class="kpi-l">Nota media</span><span class="kpi-v ' + (media >= 5 ? "t-ok" : "t-mal") + '">' + fmt(media, 1) + '</span></div>' +
      '<div class="kpi"><span class="kpi-l">Exámenes</span><span class="kpi-v">' + fmt(u.examenes) + '</span></div>' +
      '<div class="kpi"><span class="kpi-l">Aciertos</span><span class="kpi-v">' + fmt(pcAc) + ' %</span></div>' +
      '<div class="kpi"><span class="kpi-l">Preguntas</span><span class="kpi-v">' + fmt(u.preguntas) + '</span></div></div>';

    var niveles = '<div class="niveles">' +
      '<span class="nv nv-dom">★ ' + cuenta.dom + ' dominados</span><span class="nv nv-apr">✓ ' + cuenta.apr + ' aprobados</span>' +
      '<span class="nv nv-rep">! ' + cuenta.rep + ' por repasar</span><span class="nv nv-sin">○ ' + (totalTemas - temas.length) + ' sin practicar</span></div>';

    var ex = d.examenes || [];
    var evol = '<div class="card"><h3>Evolución <span class="muted small">· últimos ' + ex.length + ' exámenes</span></h3>' + graficoNotas(ex) + '</div>';

    // Qué repasar: temas por debajo del 50 %, del peor al mejor, con las páginas más falladas
    var orden = temas.slice().sort(function (a, b) { var A = u.temas[a], B = u.temas[b]; return A.ok / totalT(A) - B.ok / totalT(B); });
    var rep = orden.filter(function (k) { return 100 * u.temas[k].ok / totalT(u.temas[k]) < 50; });
    repasarActual = rep;
    var lista = rep.length ? rep : orden.filter(function (k) { return u.temas[k].ok < totalT(u.temas[k]); }).slice(0, 3);
    var repaso = '<div class="card"><h3>' + (rep.length ? "Necesita" + (ajeno ? "" : "s") + " repasar" : "Para mejorar") + '</h3>' +
      (lista.length ? '<ul class="rep">' + lista.map(function (k) {
        var t = u.temas[k], it = infoTema(k), pc = 100 * t.ok / totalT(t);
        var pags = Object.keys(t.pags || {}).sort(function (x, y) { return t.pags[y] - t.pags[x]; }).slice(0, 6);
        return '<li><div class="rep-h"><div><strong>' + esc(it.a.nombre) + '</strong><div class="muted small">Tema ' + it.n + ': ' + esc(it.t) + '</div></div>' +
          '<span class="rep-pc t-mal">' + fmt(pc) + ' %</span></div>' +
          (pags.length ? '<div class="pags">' + pags.map(function (p) {
            return '<span class="pg" title="' + t.pags[p] + ' fallo(s)">pág. ' + p.slice(1) + (t.pags[p] > 1 ? " ×" + t.pags[p] : "") + '</span>';
          }).join("") + '</div>' : "") + '</li>';
      }).join("") + '</ul>' : '<p class="muted">¡Todo perfecto! No hay fallos que repasar. 🎉</p>') + '</div>';

    // Por asignatura
    var porAsig = ASIGNATURAS.map(function (a) {
      var ks = todasClaves(a), ok = 0, tot = 0;
      var filas = ks.map(function (k) {
        var t = u.temas[k], i = +k.split("_")[1], c = esCaso(k), nom = c ? "🧩 Casos prácticos" : a.temas[i - 1], tn = c ? "" : "T" + i;
        if (!t || !totalT(t)) return '<div class="tf sin' + (c ? " tf-c" : "") + '"><span class="tf-n">' + tn + '</span><span class="tf-t">' + esc(nom) + '</span><span class="tf-bar"></span><span class="tf-v muted">—</span><span class="nv nv-sin">○ Sin practicar</span></div>';
        var pc = 100 * t.ok / totalT(t), nv = nivel(pc); ok += t.ok; tot += totalT(t);
        return '<div class="tf' + (c ? " tf-c" : "") + '"><span class="tf-n">' + tn + '</span><span class="tf-t">' + esc(nom) + '</span>' +
          '<span class="tf-bar"><span class="b-' + nv.c + '" style="width:' + pc + '%"></span></span>' +
          '<span class="tf-v">' + t.ok + '/' + totalT(t) + '</span>' + badge(nv) + '</div>';
      }).join("");
      var pcA = tot ? 100 * ok / tot : null;
      return '<details class="card asig-st"' + (tot ? " open" : "") + '><summary><span class="asig-ico">' + (ICONOS[a.id] || "📘") + '</span>' +
        '<span class="as-t"><strong>' + esc(a.nombre) + '</strong><span class="muted small">' + (tot ? fmt(pcA) + " % de aciertos · " + tot + " preguntas" : "Sin practicar") + '</span></span>' +
        (tot ? badge(nivel(pcA)) : "") + '</summary><div class="tfs">' + filas + '</div></details>';
    }).join("");

    $("stCuerpo").innerHTML = kpis + niveles + '<div class="res-grid">' + evol + repaso + '</div><h2 class="st-h2">Por asignatura y tema</h2><div class="asigs">' + porAsig + '</div>';
    $("stPracticar").hidden = ajeno || !rep.length;
  }
  $("stPracticar").onclick = function () {
    seleccion = {}; repasarActual.forEach(function (k) { setTema(k, true); }); cambio(); vista("vSeleccion");
  };

  // ---------- Panel master ----------
  var listaUsuarios = [];
  function verAdmin() {
    vista("vAdmin");
    $("adCuerpo").innerHTML = '<p class="muted cargando">Cargando usuarios…</p>';
    CUENTAS.usuarios().then(function (l) {
      listaUsuarios = l.sort(function (a, b) { return (b.ultimo || 0) - (a.ultimo || 0); });
      pintarAdmin();
    }).catch(function (e) { $("adCuerpo").innerHTML = '<p class="acc-err">No se han podido cargar los usuarios (' + esc(e.code || e.message) + ').</p>'; });
  }
  function pintarAdmin() {
    var q = norm($("adBuscar").value.trim()), l = listaUsuarios;
    var ex = 0, sn = 0, act = 0;
    l.forEach(function (u) { ex += u.examenes || 0; sn += u.sumaNotas || 0; if (u.ultimo && Date.now() - u.ultimo < 7 * 86400000) act++; });
    $("adSub").textContent = l.length + (l.length === 1 ? " usuario · " : " usuarios · ") + ex + (ex === 1 ? " examen · " : " exámenes · ") + act + (act === 1 ? " activo" : " activos") + " esta semana" + (ex ? " · nota media " + fmt(sn / ex, 1) : "");
    var vis = l.filter(function (u) { return !q || norm(u.nombre + " " + u.id).indexOf(q) >= 0; });
    $("adCuerpo").innerHTML = vis.length ? '<div class="ulist">' + vis.map(function (u) {
      var m = u.examenes ? u.sumaNotas / u.examenes : null, master = u.id === CUENTAS.ADMIN_ID;
      return '<div class="urow" data-id="' + esc(u.id) + '"><span class="avatar on">' + inicial(u.nombre) + '</span>' +
        '<div class="u-info"><strong>' + esc(u.nombre) + (master ? ' <span class="nv nv-dom">master</span>' : "") + '</strong>' +
        '<span class="muted small">' + (u.examenes || 0) + ' exámenes' + (m !== null ? ' · media <b class="' + (m >= 5 ? "t-ok" : "t-mal") + '">' + fmt(m, 1) + '</b>' : "") +
        ' · ' + (u.examenes ? "último " + hace(u.ultimo) : "alta " + fecha(u.creado)) + '</span></div>' +
        '<div class="u-acc"><button class="chip-btn" data-a="ver">📊 Ver</button>' +
        '<button class="chip-btn" data-a="reset" title="Borra sus estadísticas pero mantiene el usuario">↺ Reiniciar</button>' +
        (master ? "" : '<button class="chip-btn peligro" data-a="borrar">🗑 Eliminar</button>') + '</div></div>';
    }).join("") + '</div>' : '<p class="muted vacio">' + (l.length ? "Ningún usuario coincide con la búsqueda." : "Todavía no hay usuarios.") + '</p>';
  }
  $("adBuscar").addEventListener("input", pintarAdmin);
  $("adVolver").onclick = irInicio;
  $("stVolver").onclick = irInicio;
  $("adCuerpo").addEventListener("click", function (e) {
    var b = e.target.closest("button[data-a]"); if (!b) return;
    var id = b.closest(".urow").dataset.id, u = listaUsuarios.filter(function (x) { return x.id === id; })[0];
    if (b.dataset.a === "ver") verStats(id);
    else if (b.dataset.a === "reset") {
      if (confirm("¿Reiniciar las estadísticas de «" + u.nombre + "»? Se borrarán sus exámenes y no se puede deshacer.")) CUENTAS.reiniciar(id).then(verAdmin, alertaError);
    } else if (b.dataset.a === "borrar") {
      if (confirm("¿Eliminar el usuario «" + u.nombre + "» y todas sus estadísticas? No se puede deshacer.")) CUENTAS.borrar(id).then(verAdmin, alertaError);
    }
  });
  function alertaError(e) { alert("No se ha podido completar: " + (e.code || e.message)); }


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
  pintarUsuario();
  cargarDatos(function () {
    pintarAsignaturas();
    CUENTAS.iniciar().then(function (u) {
      pintarUsuario();
      if (!u && !leer("invitado", false)) abrirAcceso("entrar");
    }).catch(function (e) { console.error(e); pintarUsuario(); });
  });
})();
