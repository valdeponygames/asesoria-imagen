# Activar usuarios en la nube (Firebase)

Sin configurar Firebase, los usuarios y estadísticas se guardan **solo en el navegador** de cada persona.
Para que se vean desde cualquier dispositivo y funcione el usuario master **Valdepony**, haz esto una vez (gratis, plan Spark):

## 1. Crear el proyecto
1. Entra en <https://console.firebase.google.com> con tu cuenta de Google.
2. **Crear un proyecto** → nombre `asesoria-imagen` → puedes desactivar Google Analytics → Crear.

## 2. Base de datos (Firestore)
1. Menú **Compilación → Firestore Database → Crear base de datos**.
2. Ubicación: `eur3 (europe-west)` → **modo de producción** → Crear.
3. Pestaña **Reglas**: borra lo que hay, pega el contenido de `firestore.rules` y pulsa **Publicar**.

## 3. Usuario master (Valdepony)
1. Menú **Compilación → Authentication → Comenzar**.
2. Pestaña **Método de acceso** → **Correo electrónico/contraseña** → Habilitar → Guardar.
3. Pestaña **Usuarios → Agregar usuario**:
   - Correo: `valdepony@asesoria-imagen.app` (no hace falta que exista; es solo el identificador)
   - Contraseña: la del usuario master (escríbela tú; no se guarda en el código).
4. **Configuración → Dominios autorizados**: añade `valdepony.github.io`.

## 4. Conectar la web
1. ⚙ **Configuración del proyecto → General → Tus apps → icono web `</>`** → apodo `web` → Registrar app.
2. Copia el objeto `firebaseConfig` que aparece (apiKey, authDomain, projectId…) y pégalo en `config.js`:

```js
var CONFIG = {
  PREGUNTAS_POR_EXAMEN: 20,
  FIREBASE: {
    apiKey: "…",
    authDomain: "….firebaseapp.com",
    projectId: "…",
    storageBucket: "…",
    messagingSenderId: "…",
    appId: "…"
  },
  ADMIN_EMAIL: "valdepony@asesoria-imagen.app"
};
```

Estos datos **no son secretos** (Firebase está pensado para que vayan en la web); la seguridad la ponen las reglas de `firestore.rules`.

## Cómo funciona
- Los usuarios entran solo con su nombre (sin contraseña). Cualquiera que sepa un nombre puede entrar con él.
- Nadie puede ver la lista de usuarios ni borrar nada salvo **Valdepony**, que además puede ver las estadísticas de cada usuario, reiniciarlas o eliminar usuarios.
- Si cambias el correo del master, cámbialo también en `config.js` (`ADMIN_EMAIL`) y en `firestore.rules`.
