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
| `/historial` | Historial de incidencias y auditoría | Administrador, Supervisor (auditoría solo Administrador) | RF-04, RF-06, RF-08 |
| `/personal` | Gestión de personal | Administrador | RF-02 |

Tras el login: Vigilante a `/incidencias/nueva`; Administrador y Supervisor a `/dashboard`. El menú muestra solo las opciones permitidas para el rol, y las rutas verifican el rol también.

## Pantallas

### 1. Login
- Formulario centrado con DNI y contraseña.
- DNI numérico de 8 dígitos; mensaje de error genérico.
- "Validación visual de roles": el menú y la redirección dependen del rol devuelto por el backend.

### 2. Registro de incidencias (estricto Mobile-First)
- Pensado para el vigilante en campo, una mano, pantalla pequeña.
- Selectores rápidos como botones para Zona, Tipo de evento y Nivel de gravedad (los de gravedad con color).
- Campo de descripción y botón de registro grande y destacado.
- Confirmación visible al guardar y formulario listo para otro registro.

### 3. Dashboard gerencial (Desktop)
- Sidebar de navegación.
- Tarjetas KPI arriba: incidencias de hoy y vigilantes desplegados por zona.
- Gráfico de barras (incidencias por zona) y gráfico de anillo/pastel (por tipo de evento).
- Estados de carga y error en cada gráfico.

### 4. Historial de incidencias y auditoría
- Tabla con columnas: Fecha, Zona, Tipo, Gravedad, Usuario.
- Filtros arriba: rango de fechas, zona, gravedad.
- Botones "Exportar Excel" y "Exportar PDF" que usan los filtros vigentes.
- Pestaña o sección de auditoría (solo Administrador).

### 5. Gestión de personal (panel Administrador)
- Tabla: nombre, DNI, Rol, Zona asignada, Estado.
- Botón "+ Agregar Personal" (formulario/modal), editar y activar/desactivar.

## Responsive

El documento del proyecto incluye una ilustración de "Diseño Responsive". Reglas: formulario del vigilante pensado desde móvil hacia arriba; dashboard, historial y personal pensados para escritorio, utilizables en tablet.
