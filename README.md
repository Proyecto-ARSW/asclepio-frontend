# Asclepio Frontend

Frontend oficial de Asclepio, la plataforma digital de salud orientada a flujo clinico real.

Este sistema web transforma procesos hospitalarios complejos en una experiencia moderna, clara y accionable para pacientes, medicos, enfermeria, recepcion y administracion.

No es solo una interfaz bonita: es el centro de operacion del ecosistema Asclepio.

## Vision del producto

Asclepio Frontend conecta personas, datos clinicos y decisiones operativas en tiempo real.

Su valor principal:

- Reduce friccion en admision, citas, cola y seguimiento clinico.
- Unifica experiencias por rol en una sola aplicacion.
- Mejora accesibilidad e inclusion con herramientas de UI avanzadas.
- Integra IA y flujos asistidos sin romper la usabilidad.

## Que hace el sistema

El frontend cubre de extremo a extremo los procesos mas importantes de operacion clinica:

- Autenticacion con flujo por hospital (login, preToken, seleccion de sede, sesion final).
- Dashboard por rol con navegacion contextual.
- Gestion de citas, turnos y cola hospitalaria.
- Triage asistido con entrada por texto y voz.
- Modulo de analisis IA para apoyo al paciente con imagenes radiograficas.
- Configuracion de preferencias de experiencia y accesibilidad.
- Internacionalizacion real en multiples idiomas.

## Todo lo posible en el sistema

### Paciente

- Registro y acceso a su perfil clinico.
- Seleccion de hospital y sesion personalizada.
- Agendamiento de citas con seleccion de medico, fecha y slot disponible.
- Cancelacion de citas activas.
- Solicitud y seguimiento de turnos en cola.
- Historial medico y estado de atencion.
- Triage digital (texto/voz) con descarga de PDF del procedimiento.
- Modulo de IA para carga de imagenes y visualizacion de resultado + Grad-CAM.
- Juego de sala de espera conectado por WebSocket.

### Medico

- Vista de agenda y estado de citas.
- Confirmar o cancelar citas.
- Gestionar disponibilidad por franjas horarias.
- Atender turnos en cola.
- Registrar historial y observaciones clinicas.

### Enfermero

- Gestion de disponibilidad operativa.
- Administracion de cola de turnos por hospital.
- Llamar siguiente turno, atender o cancelar.

### Recepcionista

- Crear turnos para pacientes segun prioridad (normal, prioritario, urgente).
- Monitorear cola en espera y en consulta.
- Gestion de turnos y apoyo al flujo de citas.

### Administrador

- Vista global del sistema con KPIs operativos.
- Gestion de hospitales y usuarios.
- Asignacion y cambio de roles.
- Gestion de perfiles clinicos (medicos/enfermeros).
- Gestion de medicamentos y acciones operativas clave.

## Flujos clave end-to-end

### 1) Acceso seguro por hospital

1. El usuario hace login con credenciales.
2. El sistema recibe preToken y lista de hospitales asociados.
3. El usuario selecciona la sede activa.
4. El frontend obtiene accessToken final y habilita dashboard por rol.

Beneficio: aislamiento por hospital y contexto clinico correcto desde el primer segundo.

### 2) Flujo de atencion y cola

1. Recepcion crea turnos por tipo de prioridad.
2. Enfermeria o recepcion llama siguiente turno.
3. Medico atiende y actualiza estado clinico.
4. El paciente ve en tiempo real su avance en cola.

Beneficio: menos friccion operativa, mejor coordinacion y tiempos mas cortos de espera.

### 3) Flujo de triage asistido

1. Paciente inicia triage por texto o voz.
2. Enfermeria completa signos vitales.
3. Medico agrega comentarios clinicos y cierra procedimiento.
4. Se puede descargar evidencia en PDF del procedimiento.

Beneficio: proceso trazable y colaborativo entre roles clinicos.

### 4) Flujo de apoyo IA para paciente

1. Paciente carga imagen diagnostica.
2. El frontend consulta el servicio IA.
3. Se muestra clase predicha, probabilidades y mapa Grad-CAM.

Beneficio: experiencia de apoyo diagnostico clara, educativa y guiada.

## Puntos fuertes

- Arquitectura por dominios y por rol: cada usuario ve solo lo que necesita.
- Experiencia robusta: SSR, rutas localizadas, estado persistente y manejo de errores.
- Integracion hibrida: REST + GraphQL + WebSocket + servicios externos.
- Compatibilidad evolutiva: fallback de queries GraphQL para cambios de schema.
- Enfoque real en inclusion: modos de color accesibles, fuente dislexia y guia de voz.
- Escalable para producto enterprise: separacion clara entre UI, estado y APIs.

## Integracion con el ecosistema Asclepio

| Componente | Rol en la plataforma | Integracion desde frontend |
|------------|----------------------|----------------------------|
| ASCLEPIO-NestJS-M1 | Backend core hospitalario (REST + GraphQL) | Auth, dashboard, turnos, citas, perfiles, inventario |
| IA-Asclepio | Servicio de inferencia medica | Prediccion de imagen y heatmap Grad-CAM |
| Asclepio-game-server | Servidor de juego de sala de espera | WebSocket para juego multiusuario en tiempo real |
| asclepio-notification | Mensajeria transaccional | Integracion indirecta via backend (eventos) |

Este acoplamiento controlado permite evolucionar servicios backend sin romper UX en frontend.

## Arquitectura tecnica

Stack principal:

- React 19 + React Router 7 (SSR habilitado).
- TypeScript.
- Tailwind CSS v4.
- TanStack Query y TanStack Form.
- Zustand para estado de autenticacion.
- Motion para transiciones y microinteracciones.
- Paraglide (inlang) para internacionalizacion.

Integraciones de plataforma:

- API REST (autenticacion, hospitales, triage y flujos HTTP).
- API GraphQL (dashboard, citas, turnos, perfiles, inventario).
- Servicio IA (predicciones y heatmaps para imagenes).
- Game Server en WebSocket (sala de espera).

## Seguridad, sesion y confiabilidad

- Validacion de expiracion de JWT en cliente (evita sesion invalida silenciosa).
- Redireccion automatica a login ante errores de autorizacion.
- Manejo de errores de red y backend con mensajes de usuario localizados.
- Persistencia de auth desacoplada por store (estado hidratable).
- Fallback de consultas GraphQL para compatibilidad entre versiones de schema.

## Modelo de estado en cliente

- Auth state (Zustand): usuario, token, hospital seleccionado, estado pre-auth.
- Ui preferences (localStorage): tema, modos de color, fuente dislexia, guia de voz.
- Server state (TanStack Query): datos remotos cacheados y sincronizados por modulo.
- Formularios (TanStack Form): validaciones por paso para flujos sensibles como registro.

Este modelo permite una app rapida, predecible y mantenible aun con alta complejidad funcional.

## Rutas principales

- / login de usuario.
- /register registro de paciente.
- /select-hospital seleccion de sede despues del login.
- /dashboard panel principal por rol.
- /triage flujo de triage digital.
- /triage/:procedureId detalle de procedimiento de triage.

Las rutas soportan prefijo opcional de idioma:

- /en/dashboard
- /pt/dashboard
- /fr/dashboard
- /de/dashboard

## Idiomas soportados

- es (default)
- en
- pt
- fr
- de

## Accesibilidad y personalizacion

El sistema incluye capacidades avanzadas de UX accesible:

- Tema claro, oscuro y modo sistema.
- Modos de color: high-contrast, sepia, grayscale y colorblind-rg.
- Fuente para dislexia.
- Guia de voz con SpeechSynthesis.
- Atajo de teclado para guia de voz: Alt + Shift + V.
- Persistencia de preferencias de UI en navegador.

## Inicio rapido

### Prerrequisitos

- Node.js 20+
- pnpm

### Instalacion

```bash
pnpm install
```

### Desarrollo

```bash
pnpm run dev
```

Aplicacion disponible en:

- http://localhost:5173

### Build de produccion

```bash
pnpm run build
```

### Ejecutar build

```bash
pnpm run start
```

## Variables de entorno

Crear archivo .env en la raiz del proyecto.

Variables recomendadas:

```env
VITE_APP_API_URL=http://localhost:3000
VITE_API_REST_URL=http://localhost:3000
VITE_API_GRAPHQL_URL=http://localhost:3000/graphql
VITE_API_AUTH_URL=http://localhost:3000
VITE_GAME_SERVER_URL=ws://localhost:3002
VITE_AI_API_URL=http://localhost:8000
```

Notas:

- Si VITE_API_GRAPHQL_URL se define sin path, el sistema agrega /graphql automaticamente.
- Si no se definen variables especificas, se usan fallbacks seguros para entorno local.

## Scripts disponibles

- pnpm run dev: servidor de desarrollo.
- pnpm run build: build SSR cliente + servidor.
- pnpm run start: levanta build generado.
- pnpm run lint: validacion con Biome.
- pnpm run format: formateo con Biome.
- pnpm run type-check: typegen de rutas + TypeScript check.

Nota: actualmente el repositorio no expone suite de tests de UI dedicada; la base esta lista para incorporar Vitest/Playwright en la siguiente fase.

## Estructura del proyecto

```text
app/
	components/
		game/
		medical/
		ui/
	features/
		auth/
		dashboard/
			roles/
		triage/
		i18n/
		preferences/
	hooks/
	lib/
	providers/
	store/
	root.tsx
	routes.ts
```

## Calidad y madurez del frontend

Este frontend esta orientado a operacion real y crecimiento:

- Manejo de errores para red, backend y expiracion de sesion.
- Persistencia segura de sesion y preferencias.
- Navegacion protegida por rol y por autenticacion.
- Integracion desacoplada con multiples servicios.
- Base lista para escalar a observabilidad, CI y testing expandido.

## Checklist de salida a produccion

- Definir variables VITE_* por ambiente (dev/staging/prod).
- Verificar dominios CORS y URLs de API reales.
- Ejecutar lint y type-check en pipeline CI.
- Validar flujos por rol con cuentas reales de prueba.
- Confirmar accesibilidad minima (navegacion teclado, contraste, lectura de voz).
- Monitorear errores de cliente y tiempos de respuesta de APIs.

## Roadmap recomendado

- Integrar testing E2E (Playwright) para flujos criticos de salud.
- Anadir observabilidad frontend (errores, performance web vitals, funnels).
- Habilitar feature flags para despliegues graduales por modulo.
- Expandir modulo IA con historial de inferencias por paciente.
- Incorporar modo offline parcial para escenarios de conectividad intermitente.

## Por que Asclepio Frontend es un gran producto

Porque convierte complejidad clinica en una experiencia usable, confiable y escalable.

Asclepio Frontend no solo muestra datos: coordina decisiones, acelera atencion y eleva la calidad percibida por pacientes y equipos de salud.

Si el backend es el motor de Asclepio, este frontend es el cockpit donde todo ocurre.
