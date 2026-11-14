# Diseño de interfaces

Nota: este archivo se basa en el "Prompt Maestro para Generación de UI" y el documento del proyecto. Si cambias algo en Figma, actualiza este archivo.

## Estilo

- Corporativo, que inspire confianza y evite fatiga visual.
- Azul marino `bg-blue-900` para componentes principales (sidebar, encabezados, botones primarios).
- Gris pizarra `bg-slate-100` para fondos.
- Rojo `text-red-600` para alertas de seguridad y botones críticos.
- Colores de gravedad (propuesto): Baja verde, Media amarillo, Alta naranja, Crítica rojo.
- Tailwind CSS; componentes reutilizables (botón, tarjeta KPI, tabla, selector rápido).

## Rutas y acceso por rol

| Ruta | Pantalla | Roles | RF |
|---|---|---|---|
| `/login` | Login | público | RF-01 |
| `/incidencias/nueva` | Formulario de registro (Mobile-First) | Vigilante, Administrador | RF-03 |
| `/dashboard` | Dashboard gerencial (Desktop) | Administrador, Supervisor | RF-05, RF-07 |
| `/historial` | Historial de incidencias con filtros y exportación | Administrador, Supervisor | RF-04, RF-06 |
| `/historial/auditoria` | Pestaña de auditoría del historial | Administrador | RF-08 |
| `/personal` | Gestión de personal | Administrador | RF-02 |
| `/catalogos` | Catálogos: pestaña Zonas | Administrador | RF-09 |
| `/catalogos/tipos-evento` | Catálogos: pestaña Tipos de evento | Administrador | RF-09 |
| `/catalogos/niveles-gravedad` | Catálogos: pestaña Niveles de gravedad | Administrador | RF-09 |
| `/mi-contrasena` | Cambiar mi contraseña (voluntario) | Administrador, Supervisor, Vigilante | RF-02 |
| `/cambiar-contrasena` | Cambio obligatorio de la contraseña temporal (sin menú) | Cualquier rol con contraseña temporal | RF-01 |

Tras el login: Vigilante a `/incidencias/nueva`; Administrador y Supervisor a `/dashboard`. El menú lateral muestra solo las opciones permitidas para el rol (Administrador: dashboard, historial, auditoría, registro, personal y catálogos; Supervisor: dashboard e historial; Vigilante: registro) y, al pie, bajo "Mi cuenta", "Cambiar mi contraseña" para todos. En escritorio es una barra fija; en tablet y celular se abre con "☰ Menú" (también el Vigilante). Las rutas verifican el rol también al escribirlas en la barra: con otro rol se redirige a la pantalla de inicio.

## Pantallas

### 1. Login
- Formulario centrado con DNI y contraseña.
- DNI numérico de 8 dígitos; mensaje de error genérico.
- "Validación visual de roles": el menú y la redirección dependen del rol devuelto por el backend.

### 2. Registro de incidencias (estricto Mobile-First)
- Pensado para el vigilante en campo, una mano, pantalla pequeña.
- Zona según el rol (al abrir, el formulario vuelve a leer el usuario con `GET /api/auth/yo`):
  - Vigilante: título "Zona asignada" y una tarjeta de solo lectura con el nombre de la zona y, debajo, el distrito, sin selector; se registra en esa zona. Sin
    zona asignada o con la zona inactiva, la tarjeta muestra el aviso ("No tienes una zona asignada; avisa al
    Administrador." / "Tu zona asignada está inactiva; avisa al Administrador.") y el botón de registro queda
    desactivado con el motivo debajo.
  - Administrador: desplegable con búsqueda de las zonas activas (su propia zona, si tiene, primero con "Tu zona").
- Selectores rápidos como botones para Tipo de evento y Nivel de gravedad (los de gravedad con color).
- Campo de descripción y botón de registro grande y destacado.
- Confirmación visible al guardar y formulario listo para otro registro.

### 3. Dashboard gerencial (Desktop)
- Sidebar de navegación (en tablet y móvil se abre con el botón "☰ Menú").
- Selector de periodo común: Hoy, 7 días, 30 días, Mes actual, Año actual y Personalizado (dos calendarios).
- Tarjetas KPI arriba: incidencias de hoy, del periodo, vigilantes desplegados y una por nivel de gravedad con su color.
- Gráfico de barras (incidencias por zona), anillo (por tipo de evento) y serie por tiempo (línea o barras, por día,
  semana o mes); tabla de despliegue por zona con las zonas sin vigilantes en rojo.
- Estados de carga y error en cada gráfico; refresco automático cada 60 s.

### 4. Historial de incidencias y auditoría
- Tabla con columnas: Fecha, Zona, Tipo, Gravedad, Usuario.
- Filtros arriba: periodo, zona, gravedad y tipo de evento; descripción en el detalle de cada fila; paginación.
- Botones "Exportar Excel" y "Exportar PDF" que usan los filtros vigentes.
- Pestaña "Auditoría" (`/historial/auditoria`, solo Administrador) con filtros por periodo, acción y DNI y el detalle
  de cada registro en texto legible.

### 5. Gestión de personal (panel Administrador)
- Tabla: nombre, DNI, Rol, Zona asignada, Estado, con búsqueda por DNI o nombre, filtros de rol, zona y estado y paginación.
- Botón "+ Agregar personal" (modal): DNI, nombres, apellidos, rol, zona (obligatoria para el Vigilante) y una contraseña
  temporal con confirmación; el formulario aclara que el usuario deberá cambiarla en su primer ingreso.
- Acciones por fila: Editar, Reasignar zona, Restablecer contraseña (nueva temporal con confirmación) y
  Activar/Desactivar con confirmación. En la propia fila no se puede desactivar, restablecer la contraseña ni cambiar el rol.

### 6. Catálogos (panel Administrador)
- Pestañas: Zonas, Tipos de evento y Niveles de gravedad.
- Zonas: filtros por nombre, departamento → provincia → distrito (en cascada), estado y texto libre; crear y editar
  (departamento, provincia, distrito, referencia y descripción) y activar/desactivar. Al desactivar avisa cuántos
  vigilantes activos siguen asignados y que dejan de contarse en el despliegue hasta cambiarles la zona.
- Tipos de evento: crear, renombrar y activar/desactivar; "Otro" no se puede renombrar.
- Niveles de gravedad: editar nombre y orden; si el orden lo tiene otro nivel, se intercambian.

### 7. Cambiar mi contraseña
- Contraseña actual, nueva (8 a 72, distinta de la actual) y confirmación. Al guardar, la sesión sigue abierta y se
  muestra la confirmación. Es el mismo formulario del cambio obligatorio de la contraseña temporal.

## Responsive

El documento del proyecto incluye una ilustración de "Diseño Responsive". Reglas: formulario del vigilante pensado desde móvil hacia arriba; dashboard, historial, personal y catálogos pensados para escritorio, utilizables en tablet; los formularios de
personal y catálogos se abren en un modal que en el celular ocupa toda la pantalla.
