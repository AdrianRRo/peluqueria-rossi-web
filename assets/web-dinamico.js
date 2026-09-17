/* ============================================================================
 * web-dinamico.js — capa dinámica de la web pública de Rossi Salón de Belleza
 * ============================================================================
 * Qué hace (y por qué), en orden de importancia:
 *
 *  1) NUNCA deja la web en blanco ni pierde SEO. El HTML servido ya trae los
 *     servicios y las fotos como RESPALDO ESTÁTICO; este script solo los
 *     actualiza al vuelo con lo que la dueña tiene en su panel. Si el API no
 *     responde en 3 s, se queda el respaldo tal cual.
 *
 *  2) Bug real corregido (2026-09-16): el fetch anterior NO tenía timeout, así
 *     que si el API colgaba, el `catch` no se ejecutaba nunca y la galería se
 *     quedaba VACÍA (ni fotos del API ni respaldo). Aquí TODO fetch lleva
 *     AbortController con 3 s.
 *
 *  3) Galería: el API es la única fuente (el manifest queda como red de
 *     seguridad). Mosaico que RESPETA el ratio real (las fotos de Instagram
 *     son verticales: 1,15–1,33) y lightbox para ver la foto completa.
 *     Esqueleto de carga + fundido al terminar cada foto.
 *
 *  4) Servicios: se pintan desde el API (grupos, descripciones y 1 imagen por
 *     grupo). Al editar algo en el panel, la web lo refleja al recargar, sin
 *     desplegar nada.
 *
 *  5) Analítica: un beacon de visita con sesión anónima (sessionStorage, sin
 *     cookies y sin banner legal). La IP nunca sale del servidor en claro.
 * ==========================================================================*/
(function () {
  "use strict";

  // El API va por el túnel de Cloudflare; el respaldo está servido en el HTML.
  var API = "https://api.rossisalondebelleza.com";
  var TIMEOUT_MS = 3000;

  // --- fetch con timeout: la pieza que faltaba (un colgado no puede vaciar la web) ---
  function fetchJson(url, ms, opts) {
    var ac = new AbortController();
    var t = setTimeout(function () { ac.abort(); }, ms || TIMEOUT_MS);
    var o = opts || {};
    o.cache = "no-store";
    o.signal = ac.signal;
    return fetch(url, o).then(function (r) {
      clearTimeout(t);
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.status === 204 ? null : r.json();
    }).catch(function (e) { clearTimeout(t); throw e; });
  }

  // --- sesión anónima: sin cookies, sin banner legal (sessionStorage) ---
  function sid() {
    try {
      var s = sessionStorage.getItem("rossi_sid");
      if (!s) {
        s = Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
        sessionStorage.setItem("rossi_sid", s);
      }
      return s;
    } catch (e) { return null; }
  }

  function beacon(kind, extra) {
    try {
      var body = { kind: kind, path: location.pathname, sid: sid() };
      if (extra) for (var k in extra) body[k] = extra[k];
      fetchJson(API + "/api/track", 2500, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      }).catch(function () {});
    } catch (e) { /* la analítica jamás debe romper la web */ }
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function slug(t) {
    return String(t || "").toLowerCase().trim()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  // ---------------------------------------------------------------- LIGHTBOX
  function lightbox() {
    var lb = document.getElementById("rossiLightbox");
    if (lb) return lb;
    lb = document.createElement("div");
    lb.id = "rossiLightbox";
    lb.className = "lightbox";
    lb.setAttribute("role", "dialog");
    lb.setAttribute("aria-modal", "true");
    lb.setAttribute("aria-hidden", "true");
    lb.innerHTML =
      '<button class="lightbox__cerrar" type="button" aria-label="Cerrar la foto">&times;</button>' +
      '<figure class="lightbox__figura">' +
        '<img class="lightbox__img" alt="" />' +
        '<figcaption class="lightbox__pie"></figcaption>' +
      "</figure>";
    document.body.appendChild(lb);

    var img = lb.querySelector(".lightbox__img");
    var pie = lb.querySelector(".lightbox__pie");

    function cerrar() {
      lb.classList.remove("lightbox--abierto");
      lb.setAttribute("aria-hidden", "true");
      document.body.classList.remove("sin-scroll");
    }
    lb.querySelector(".lightbox__cerrar").addEventListener("click", cerrar);
    lb.addEventListener("click", function (e) { if (e.target === lb) cerrar(); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && lb.classList.contains("lightbox--abierto")) cerrar();
    });

    lb.abrir = function (src, alt) {
      img.src = src;
      img.alt = alt || "";
      pie.textContent = alt || "";
      lb.classList.add("lightbox--abierto");
      lb.setAttribute("aria-hidden", "false");
      document.body.classList.add("sin-scroll");
    };
    return lb;
  }

  // ---------------------------------------------------------------- GALERÍA
  // ------------------------------------------------------- animaciones de entrada
  // `observar()` se define AQUÍ, en el ámbito del módulo: la necesitan initGaleria
  // (fotos) Y arranca (los `.animar` que ya vienen en el HTML). Antes vivía dentro de
  // initGaleria, así que llamarla desde arranca daba ReferenceError silencioso y el
  // botón "Ver todos los servicios" + 33 textos de sección quedaban con opacidad 0.
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var io = (!reduce && "IntersectionObserver" in window)
    ? new IntersectionObserver(function (ents) {
        ents.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add("visible"); io.unobserve(e.target); }
        });
      }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" })
    : null;
  function observar(el) { if (io) io.observe(el); else el.classList.add("visible"); }

  function initGaleria() {
    var grid = document.getElementById("galeriaGrid");
    if (!grid) return;

    // `reduce`, `io` y `observar` viven en el ámbito del módulo (arriba): los comparte
    // con arranca(). Aquí NO se redefinen.

    function esqueleto(n) {
      grid.innerHTML = "";
      for (var i = 0; i < (n || 6); i++) {
        var d = document.createElement("div");
        d.className = "galeria__esqueleto";
        d.setAttribute("aria-hidden", "true");
        grid.appendChild(d);
      }
    }

    function pinta(src, alt, w, h, grande) {
      var fig = document.createElement("figure");
      fig.className = "galeria__item animar";
      fig.setAttribute("data-animar", "zoom");
      var img = document.createElement("img");
      img.alt = alt || "Trabajo de Rossi Salón de Belleza";
      if (w && h) { img.width = w; img.height = h; }   // reserva el hueco: sin saltos
      img.loading = "lazy";
      img.decoding = "async";

      // El fundido solo se dispara cuando la foto está lista. Se cubren los tres
      // caminos para que NINGUNA foto pueda quedarse invisible (sería el peor
      // fallo posible: la web del salón en blanco):
      //   1) load normal, 2) ya estaba en caché al enganchar el listener
      //   (img.complete), 3) red que nunca responde -> se muestra igualmente.
      function revelar() { fig.classList.add("galeria__item--cargada"); }
      img.addEventListener("load", revelar);
      img.addEventListener("error", function () { fig.classList.add("galeria__item--error"); });
      fig.appendChild(img);
      img.src = src;
      if (img.complete && img.naturalWidth) revelar();
      setTimeout(revelar, 4000);

      fig.tabIndex = 0;
      fig.setAttribute("role", "button");
      fig.setAttribute("aria-label", "Ampliar foto: " + (alt || "trabajo del salón"));
      function abrir() { lightbox().abrir(grande || img.src, img.alt); }
      fig.addEventListener("click", abrir);
      fig.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); abrir(); }
      });
      grid.appendChild(fig);
      observar(fig);
    }

    function desdeManifest() {
      return fetchJson("assets/gallery/manifest.json").then(function (data) {
        var imgs = (data && data.images) || [];
        if (!imgs.length) throw new Error("manifest vacío");
        grid.innerHTML = "";
        imgs.forEach(function (it) {
          pinta("assets/gallery/" + it.file, it.alt, it.width, it.height,
                "assets/gallery/" + it.file);
        });
      });
    }
    function desdeMarca() {
      grid.innerHTML = "";
      ["salon.jpg", "color.jpg", "care.jpg", "roses.jpg", "bridal.jpg"].forEach(function (f) {
        pinta("assets/" + f, "Rossi Salón de Belleza");
      });
    }

    esqueleto(6);
    fetchJson(API + "/api/gallery")
      .then(function (imgs) {
        if (!imgs || !imgs.length) throw new Error("galería vacía");
        grid.innerHTML = "";
        imgs.forEach(function (it) {
          pinta(API + (it.thumb_url || ("/api/gallery/" + it.id)), it.alt,
                it.width, it.height, API + (it.url || ("/api/gallery/" + it.id)));
        });
      })
      .catch(function () { return desdeManifest().catch(desdeMarca); });
  }

  // --------------------------------------------------------------- SERVICIOS
  function initServicios() {
    var pild = document.getElementById("serviciosPildoras");   // portada
    var cont = document.getElementById("listadoServicios");    // servicios.html
    if (!pild && !cont) return;

    fetchJson(API + "/api/web/services" + (pild && !cont ? "?landing=1" : ""))
      .then(function (grupos) {
        if (!grupos || !grupos.length) throw new Error("sin grupos");

        if (pild) {
          pild.innerHTML = "";
          grupos.forEach(function (g) {
            var a = document.createElement("a");
            a.className = "servicio-pildora animar visible";
            a.href = "servicios.html#" + slug(g.title);
            a.innerHTML =
              (g.image_url ? '<img class="servicio-pildora__foto" src="' + API + esc(g.image_thumb || g.image_url) +
                             '" alt="" loading="lazy" />' : "") +
              '<svg class="servicio-pildora__icono" width="26" height="26" aria-hidden="true">' +
              '<use href="#icono-rosa"/></svg>' +
              "<h3>" + esc(g.title) + "</h3>" +
              "<p>" + esc(g.description) + "</p>" +
              '<span class="servicio-pildora__enlace">Ver más →</span>';
            pild.appendChild(a);
          });
        }

        if (cont) {
          cont.innerHTML = "";
          grupos.forEach(function (g) {
            var art = document.createElement("article");
            art.className = "servicio-categoria servicio-categoria--detalle animar visible";
            if (slug(g.title) === "productos") art.classList.add("servicio-categoria--productos");
            art.id = slug(g.title);
            var lista = (g.services || []).map(function (sv) {
              return "<li>" + esc(sv.name) + "</li>";
            }).join("");
            art.innerHTML =
              (g.image_url ? '<img class="servicio-categoria__foto" src="' + API + esc(g.image_thumb || g.image_url) +
                             '" alt="" loading="lazy" />' : "") +
              '<h2><svg width="20" height="20" aria-hidden="true"><use href="#icono-rosa"/></svg> ' +
              esc(g.title) + "</h2>" +
              (g.description ? "<p>" + esc(g.description) + "</p>" : "") +
              (lista ? '<ul class="lista-servicios">' + lista + "</ul>" : "");
            cont.appendChild(art);
          });
          // El índice de arriba también sale del panel (si existe).
          var indice = document.getElementById("serviciosIndice");
          if (indice) {
            indice.innerHTML = grupos.map(function (g) {
              return '<li><a href="#' + slug(g.title) + '">' + esc(g.title) + "</a></li>";
            }).join("");
          }
        }
      })
      .catch(function () { /* respaldo: se queda el HTML estático ya servido */ });
  }

  // ------------------------------------------------------------------ WHATSAPP
  function initWhatsApp() {
    var n = (typeof window.NUMERO_WHATSAPP === "string" && window.NUMERO_WHATSAPP)
      ? window.NUMERO_WHATSAPP : "34613153380";
    var msg = (typeof window.MENSAJE_WHATSAPP === "string" && window.MENSAJE_WHATSAPP)
      ? window.MENSAJE_WHATSAPP : "Hola, me gustaría pedir cita en Peluquería Rossi";
    var url = "https://wa.me/" + n + "?text=" + encodeURIComponent(msg);
    document.querySelectorAll(".js-whatsapp-link").forEach(function (a) {
      a.setAttribute("href", url);
      if (a.dataset.beacon === "1") return;
      a.dataset.beacon = "1";
      a.addEventListener("click", function () { beacon("click_wa"); });
    });
  }

  function arranca() {
    try { initWhatsApp(); } catch (e) {}
    try { initServicios(); } catch (e) {}
    try { initGaleria(); } catch (e) {}
    // Los `.animar` QUE YA VIENEN EN EL HTML (el botón "Ver todos los servicios",
    // las cabeceras de sección...) nacen con `opacity: 0` y se revelan al entrar en
    // pantalla. Esa observación la hacía el JS viejo de la galería, que se ELIMINÓ al
    // conectar la capa dinámica: sin esto el botón existía, era clicable y medía
    // 234x58, pero quedaba INVISIBLE (opacidad 0). Medido en producción 2026-09-17.
    try {
      document.querySelectorAll(".animar:not(.visible)").forEach(function (el) {
        if (el.closest("#galeriaGrid") || el.closest("#listadoServicios")) return;
        observar(el);
      });
      // Red de seguridad: si el observador no dispara (ventana rara, navegador sin
      // soporte, elemento que nunca llega al 12% visible), a los 2,5 s se revelan
      // TODOS. Es preferible una animación de más que un texto invisible.
      setTimeout(function () {
        document.querySelectorAll(".animar:not(.visible)").forEach(function (el) {
          el.classList.add("visible");
        });
      }, 2500);
    } catch (e) {}
    // Visita: una por carga de página, agrupada por sesión anónima.
    beacon("visit", { referer: document.referrer || null });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", arranca);
  } else {
    arranca();
  }
})();
