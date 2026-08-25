# Peluquería Rossi — Web estática

Sitio 100% estático (HTML + CSS + JS mínimo). No hay build step, no hay dependencias, no hay `node_modules`.

## Archivos

- `index.html` — página única con toda la web (hero, servicios, sobre nosotras, horario, contacto, footer).
- `styles.css` — todos los estilos.
- `robots.txt` — indicaciones para buscadores.
- `sitemap.xml` — mapa del sitio para SEO.

## Desplegar en Render (Static Site)

1. Sube este directorio (`services/peluqueria-web`) a un repositorio Git (o usa el repo actual si Render apunta a un subdirectorio).
2. En Render: **New + → Static Site**.
3. Conecta el repositorio y configura:
   - **Root Directory**: `services/peluqueria-web`
   - **Build Command**: (déjalo vacío, no hace falta build)
   - **Publish Directory**: `.` (la raíz de este directorio)
4. Deploy. Render servirá `index.html` directamente.

No requiere variables de entorno ni backend.

## Placeholders pendientes de rellenar

Antes de publicar, edita `index.html` y sustituye:

- **`NUMERO_WHATSAPP`** (dentro del `<script>` al final del `<body>`): número en formato internacional sin espacios, ej. `34612345678`.
- **`[CIUDAD]`**: aparece en el `<title>`, meta description, hero, contacto y JSON-LD.
- **`[DIRECCIÓN A COMPLETAR]`**: dirección del salón (contacto y JSON-LD).
- **`[TELÉFONO]`**: teléfono de contacto (contacto, `tel:` y JSON-LD).
- **`[PROVINCIA]`** y **`[CÓDIGO POSTAL]`**: dentro del JSON-LD (`address`).
- **Google Maps**: en la sección de contacto hay un bloque `<!-- ... -->` comentado con el `<iframe>` de Google Maps. Descomenta y pega la URL real (Google Maps → Compartir → Insertar un mapa).
- **Instagram**: revisa que `https://www.instagram.com/peluqueriarossi/` sea la cuenta real (aparece en contacto, footer y JSON-LD `sameAs`).
- **Dominio**: `https://www.peluqueriarossi.com/` se usa como `canonical`, Open Graph, JSON-LD y en `robots.txt`/`sitemap.xml`. Sustitúyelo por el dominio real una vez esté decidido.
- **Horario**: los horarios de mañana/tarde están marcados con comentarios `<!-- EDITABLE -->` en la sección de horario; ajústalos si difieren.
- **`assets/og-image.jpg`**: las metaetiquetas Open Graph/Twitter apuntan a esta imagen; añade una imagen real en `assets/` (ideal 1200x630px) o cambia la ruta.
