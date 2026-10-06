# Cómo subir la app a GitHub Pages (paso a paso)

Esta guía es para hacerlo desde tu computadora, aunque nunca hayas usado GitHub.
Al terminar tendrás la app publicada en `https://<tu-usuario>.github.io/app-mancuernas/`
y podrás instalarla en tu celular y tu tablet.

---

## Antes de empezar (solo una vez)

1. **Cuenta de GitHub:** si no tienes, créala gratis en <https://github.com/signup>.
2. **Git:** descárgalo de <https://git-scm.com/downloads> e instálalo con las opciones por defecto.
   Para comprobarlo, abre una terminal y escribe `git --version`. Debe salir un número de versión.
   - **Windows:** usa el programa **Git Bash** (se instala junto con Git).
   - **Mac:** usa la app **Terminal**.
3. **Configura tu nombre y correo en Git** (solo la primera vez):

   ```bash
   git config --global user.name "Tu Nombre"
   git config --global user.email "tu-correo@ejemplo.com"
   ```

4. **Descomprime el proyecto:** descomprime el archivo `.zip` en una carpeta fácil de encontrar, por ejemplo en `Documentos`.
   Debe quedar la carpeta `app-mancuernas` con los archivos `package.json`, `index.html`, etc.

> No necesitas instalar Node.js para publicar: GitHub compila la app por ti.
> Solo lo necesitas si quieres probarla en tu computadora (ver el final de esta guía).

---

## 1. Crear el repositorio "app-mancuernas" en github.com

1. Entra a <https://github.com> e inicia sesión.
2. Arriba a la derecha toca el botón **+** y luego **New repository**.
3. En **Repository name** escribe exactamente: `app-mancuernas`
4. Elige **Public** (GitHub Pages gratis requiere un repositorio público).
5. **No** marques "Add a README file", ni ".gitignore", ni "license". El proyecto ya los trae.
6. Toca **Create repository**.

> Si el repositorio `app-mancuernas` ya existe en tu cuenta (u organización), sáltate este paso.
> Puedes usarlo siempre que esté vacío.

---

## 2. Subir el proyecto desde tu computadora

Abre la terminal **dentro de la carpeta del proyecto**:

- **Windows:** abre la carpeta `app-mancuernas`, haz clic derecho en un espacio vacío y elige **Open Git Bash here**.
- **Mac:** abre Terminal, escribe `cd `, con un espacio al final, arrastra la carpeta `app-mancuernas` a la ventana y presiona Enter.

Copia y pega estos comandos **uno por uno**, presionando Enter después de cada uno.
Cambia `TU-USUARIO` por tu nombre de usuario de GitHub:

```bash
git init
git add .
git commit -m "Primera versión de la app de mancuernas"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/app-mancuernas.git
git push -u origin main
```

La primera vez, GitHub te pedirá iniciar sesión: se abrirá una ventana del navegador o te pedirá usuario y contraseña.
Si te pide contraseña en la terminal, **no** uses la de tu cuenta: crea un *token* en
GitHub → tu foto → **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)** → **Generate new token**, marca el permiso **repo** y pega el token como contraseña.

Al terminar, recarga la página del repositorio en GitHub: ya deben aparecer tus archivos.

---

## 3. Activar GitHub Pages

1. En la página de tu repositorio, entra a **Settings** (pestaña de arriba, con un engrane).
2. En el menú de la izquierda elige **Pages**.
3. En **Build and deployment** → **Source**, elige **GitHub Actions**.

No hay que configurar nada más. El proyecto ya trae el archivo `.github/workflows/deploy.yml`,
que compila y publica la app cada vez que subes cambios a `main`.

Si la primera publicación se hizo antes de activar Pages y falló, ve a la pestaña **Actions**,
abre **Publicar en GitHub Pages** y toca **Run workflow** (o **Re-run all jobs**).

---

## 4. Encontrar el enlace final

1. Ve a la pestaña **Actions** del repositorio. Verás una tarea llamada **Publicar en GitHub Pages**.
2. Espera a que tenga una palomita verde ✅ (tarda de 1 a 3 minutos).
3. Tu app queda en:

   **`https://TU-USUARIO.github.io/app-mancuernas/`**

   También aparece en **Settings → Pages**, arriba: "Your site is live at…".

> Si el repositorio está dentro de una organización, el enlace usa el nombre de la organización:
> `https://NOMBRE-ORGANIZACION.github.io/app-mancuernas/`.

---

## 5. Instalar la app en tus dispositivos

Abre el enlace una vez **con internet**. Después funciona sin conexión.

### iPhone y iPad (Safari)

1. Abre el enlace en **Safari** (en iPhone y iPad tiene que ser Safari).
2. Toca el botón **Compartir** (el cuadro con una flecha hacia arriba).
   - En iPhone está abajo; en iPad, arriba a la derecha.
3. Desliza y toca **Agregar a inicio**.
4. Toca **Agregar**. El ícono de la mancuerna aparecerá en tu pantalla de inicio.

### Android: celular y tablet (Chrome)

1. Abre el enlace en **Chrome**.
2. Toca el menú **⋮** (arriba a la derecha) y luego **Instalar app** o **Agregar a pantalla principal**.
   Chrome a veces muestra solo un aviso abajo que dice "Instalar".
3. Confirma con **Instalar**.

**Importante:** tus datos (perfil y rutinas) se guardan **en cada dispositivo por separado**.
Si configuras la app en el celular, en la tablet tendrás que hacerlo también.

---

## 6. Publicar cambios en el futuro

Cada vez que modifiques el proyecto (o te pase una versión nueva), abre la terminal en la carpeta y ejecuta:

```bash
git add .
git commit -m "Describe aquí el cambio"
git push
```

Listo. GitHub compila y publica la nueva versión sola en 1 a 3 minutos (revisa la pestaña **Actions**).
Las apps instaladas se actualizan solas la próxima vez que las abras con internet.
Si no ves el cambio, ciérrala por completo y vuelve a abrirla.

> **Si recibes una versión nueva en .zip:** copia sus archivos encima de tu carpeta `app-mancuernas`
> (reemplazando los existentes, **sin** borrar la carpeta oculta `.git`) y luego ejecuta los tres comandos de arriba.

---

## (Opcional) Probar la app en tu computadora

1. Instala Node.js (versión LTS) desde <https://nodejs.org>.
2. En la terminal, dentro de la carpeta del proyecto:

   ```bash
   npm install
   npm run dev
   ```

3. Abre <http://localhost:5173/app-mancuernas/> en el navegador.
   Para verla como en el celular, abre las herramientas de desarrollo (F12) y activa el modo dispositivo.
