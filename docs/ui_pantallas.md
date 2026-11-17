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

Tras el login: Vigilante a `/incidencias/nueva`; Administrador y Supervisor a `/dashboard`. Las rutas verifican el rol también al escribirlas en la barra: con otro rol se redirige a la pantalla de inicio.

### Menú de navegación por rol

- El menú muestra solo las opciones permitidas para el rol, cada una con su ícono (SVG en línea) y agrupadas bajo
  títulos: **Gestión** (Dashboard, Historial, Registrar incidencia), **Administración** (Auditoría, Personal,
  Catálogos; solo el Administrador) y **Mi cuenta** (Cambiar mi contraseña). Supervisor: Dashboard e Historial;
  Vigilante: Registrar incidencia. "Mis incidencias" del Vigilante está preparada y se mostrará cuando exista su pantalla.
- El encabezado muestra el título de la pantalla actual (el nombre de la opción activa) y debajo el usuario y su rol.
- Escritorio (`lg`, desde 1024 px): barra lateral fija con la marca, los íconos y los grupos; la opción de la
  pantalla actual va resaltada y con `aria-current="page"` (en `/historial/auditoria` se marca "Auditoría", no
  "Historial"). "Cerrar sesión" está en el encabezado.
- Tablet y celular (`< lg`), Administrador y Supervisor (y el Vigilante desde 640 px): botón "Menú" (ícono y texto,
  `aria-expanded`, `aria-controls`) que abre un panel deslizable con los mismos grupos; en "Mi cuenta" incluye
  "Cerrar sesión". Al abrir, el foco va al primer enlace y Tab no sale del panel; se cierra al elegir una opción,
  con Escape, con ✕ o tocando fuera, y el foco vuelve al botón "Menú".
- Vigilante en el celular (`< sm`, menos de 640 px): barra inferior fija con ícono y texto: "Registrar" y
  "Mi cuenta" (y "Mis incidencias" cuando exista). La opción actual va marcada (`aria-current="page"`). "Mi cuenta"
  abre una hoja con "Cambiar mi contraseña" y "Cerrar sesión" (Escape o tocar fuera la cierran). El botón fijo
  "Registrar incidencia" queda por encima de la barra.
- En el celular, "Cerrar sesión" no está en el encabezado: está dentro de "Mi cuenta" (panel o barra inferior).

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
- Barra lateral de navegación con íconos y grupos (en tablet y móvil se abre con el botón "Menú").
- Barra de filtros global: selector de periodo común (Hoy, 7 días, 30 días, Mes actual, Año actual y Personalizado
  con dos calendarios) y listas de zona, gravedad y tipo de evento. Afecta a los KPI, las barras, el anillo y la
  serie; el despliegue por zona no usa filtros.
- Chips de los filtros activos debajo de la barra (periodo solo si no es "30 días"), cada uno con "×", y "Quitar
  todo" para volver a los últimos 30 días sin filtros.
- Botón "Ver en historial": abre `/historial` con los mismos filtros.
- Tarjetas KPI arriba: incidencias de hoy, del periodo, vigilantes desplegados y una por nivel de gravedad con su color.
- Gráfico de barras (incidencias por zona), anillo (por tipo de evento) y serie por tiempo (línea o barras, por día,
  semana o mes); tabla de despliegue por zona con las zonas sin vigilantes en rojo.
- Filtrado cruzado: clic en una barra de zona, un sector del anillo (o su leyenda) o una tarjeta de gravedad aplica
  ese filtro a todo el panel; otro clic lo quita. Cada gráfico sigue mostrando todas sus opciones (no se filtra a sí
  mismo) con la elegida resaltada y las demás atenuadas; la tarjeta elegida queda con borde. Con el teclado, cada
  gráfico tiene debajo una tabla con un botón "Filtrar por …" por fila que se hace visible al recibir el foco.
- Los filtros viven en la URL (`?periodo=&desde=&hasta=&idZona=&idTipoEvento=&idNivelGravedad=`): un enlace copiado
  abre el panel con los mismos filtros y "Atrás" deshace el último cambio. Un valor no válido se ignora.
- Estados de carga y error en cada gráfico; refresco automático cada 60 s.

### 4. Historial de incidencias y auditoría
- Tabla con columnas: Fecha, Zona, Tipo, Gravedad, Usuario.
- Filtros arriba: periodo, zona, gravedad y tipo de evento; descripción en el detalle de cada fila; paginación.
  Los filtros se leen y se escriben en la URL con los mismos parámetros que el dashboard, así "Ver en historial" y
  los enlaces compartidos abren el historial ya filtrado; al cambiar un filtro se vuelve a la primera página.
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
personal y catálogos se abren en un modal que en el celular ocupa toda la pantalla. Navegación: barra lateral desde
`lg`, panel deslizable con "Menú" por debajo de `lg` y, para el Vigilante en el celular (`< sm`), barra inferior fija.
