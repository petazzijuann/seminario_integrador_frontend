# Chatbot

Botón flotante abajo a la derecha que abre un panel de chat con el asistente "Agrobot". Se monta una sola vez en `AppLayout` (App.jsx), así aparece en todas las pantallas logueadas y no en el login.

- **Estructura:** escenario con el robot 3D (`RobotAgro`), historial con scroll y autoscroll, y un textarea con botón de enviar. Enter envía, Shift+Enter hace salto de línea, los mensajes vacíos no se mandan.
- **Estado:** vive en el componente (`useState`). Se pierde al recargar la página.
- **Red:** el componente no hace requests; todo pasa por `chatService.sendMessage` (`services/chat.js`), que llama a `POST /api/chat` con los últimos 6 mensajes como contexto. Mientras espera muestra los puntos y bloquea el envío; si falla, muestra el mensaje de `ApiError` como aviso. Lo pueden usar todos los roles.
- **Robot 3D:** `RobotAgro.jsx` usa `three` + `@react-three/fiber` y se importa con `React.lazy` la primera vez que se abre el chat (chunk aparte, no suma al bundle inicial). Con el chat cerrado el render loop queda en pausa (`frameloop="never"`). Al desmontar, fiber libera geometrías y renderer, y el componente libera los materiales. Los colores se leen de los tokens (`--surface-cream`, `--ink`, `--lime`, `--lime-strong`, `--forest`, `--steel-soft`).
- **Reacción:** cada mensaje enviado hace que el robot salte, salude con el brazo y se le iluminen los ojos.
- **Accesibilidad:** `aria-label` y `aria-expanded` en el botón, foco en el input al abrir, Escape cierra (salvo que haya un Dialog abierto) y devuelve el foco al botón. El panel cerrado queda `inert`.
- **Movimiento reducido:** con `prefers-reduced-motion` el robot queda quieto (solo parpadea e ilumina los ojos) y las animaciones de UI pasan a fundidos.
- **Capas:** `z-index: 45`, arriba de menús y tooltips (20–40) y abajo del overlay de diálogos (50).
- **Mobile (≤ 640px):** el panel ocupa casi todo el ancho, sube con el teclado (mide `visualViewport`) y el botón flotante se esconde mientras está abierto; se cierra con la X.
- Estilos en `styles/chatbot.css`.
