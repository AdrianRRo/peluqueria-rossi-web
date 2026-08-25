# Peluquería Rossi — Web de marketing (estática)

Landing de **captación** del salón. Sitio 100% estático (HTML + CSS + JS mínimo).
Sin build step, sin dependencias, sin `node_modules`.

> IMPORTANTE (para jose-peluqueria): **esto NO es la app de gestión.** La app que
> usa Rosali vive en otro repo (`AdrianRRo/peluqueria-rossi`) y su base de datos de
> producción (`rossi`) **no se toca nunca** desde aquí. Este directorio es solo la
> web de marketing.

## Archivos
- `index.html` — landing completa (hero, servicios sin precio, galería, nosotras, contacto).
- `styles.css` — estilos (motion site, responsive, `prefers-reduced-motion`).
- `assets/` — imágenes de marca (hero, galería, `og-image.jpg`).
- `robots.txt`, `sitemap.xml` — SEO.

## Datos reales del salón (ya cargados)
- Nombre: **Peluquería y Salón de Belleza Rossi** · dueña **Rosali Cruz Núñez**.
- Dirección: **Calle San Juan, 2, 29130 Alhaurín de la Torre (Málaga)**.
- Teléfono / WhatsApp: **613 15 33 80** (`wa.me/34613153380`).
- Instagram: **@rossisalondebelleza**.
- Horario: martes a sábado desde las 10:00 (lunes y domingo cerrado).
- **Sin precios en la web** (solo lista de servicios), por decisión de Adrián.

## Deploy (Static Site en Render — YA CONFIGURADO)
- Servicio Render: **peluqueria-rossi-web** (`srv-da6fbt67bikc738ddb4g`).
- URL: **https://peluqueria-rossi-web.onrender.com** · rewrite `/*` → `/index.html`.
- Repo: **`AdrianRRo/peluqueria-rossi-web`**, rama `main`, **autodeploy** activado.
- Publicar cambios:
  ```bash
  # (jose trabaja en plan; el push lo aprueba peluqueria-super / Adrián)
  git -C /tmp/pelu-web-repo add -A && git -C /tmp/pelu-web-repo commit -m "..." && git -C /tmp/pelu-web-repo push
  ```

## Flujo de calidad (obligatorio)
1. Probar en local (`python3 -m http.server`) y revisar responsive + enlaces.
2. Pedir veredicto a **peluqueria-qa** (`ask-peluqueria-qa "..."`).
3. Solo con **OK** → push → Render deploya → QA verifica que la URL sigue viva.

## Pendiente de Adrián (opcional)
- Dominio propio (para quitar `onrender.com` del canonical/OG/sitemap).
- Fotos reales del trabajo del salón (sustituir imágenes generadas por fotos de Instagram).
