# Procesos de negocio (Bizagi)

## AS-IS: Gestión y análisis de seguridad (proceso actual, manual)

Carriles: Vigilante/Operador, Supervisor de Operaciones, Gerencia.

1. Inicio: detección de anomalía o recepción de alerta.
2. Vigilante: anota los detalles de la incidencia en el cuaderno físico de ocurrencias.
3. Vigilante: entrega el reporte físico al finalizar.
4. Supervisor de Operaciones: transcribe la información a formato digital en un archivo Excel aislado.
5. Decisión "¿Es fin de mes?": si no, vuelve a transcribir; si sí, continúa.
6. Supervisor de Operaciones: consolida datos y elabora el reporte estadístico mensual (PDF/impreso).
7. Gerencia: toma decisiones reactivas de reasignación. Fin.

Problemas: pérdida de datos, duplicidad, lentitud (consolidación de hasta 3 días hábiles) y decisiones reactivas, no preventivas.

## TO-BE: Gestión de incidencias (proceso con SGI-SEGANDINA)

Carriles: Vigilante/Operador, Sistema Web SGI-SEGANDINA, Supervisor/Gerencia.

1. Inicio: detección de anomalía o recepción de alerta.
2. Vigilante: ingresa al sistema y completa el formulario de incidencia (RF-01, RF-03).
3. Sistema: valida datos y registra la incidencia en la base de datos (RF-03, RF-08).
4. Sistema: actualiza las métricas del dashboard en tiempo real (RF-05, RF-07).
5. Supervisor/Gerencia: visualiza el dashboard analítico.
6. Decisión "¿Requiere asignar personal?":
   - Sí: gestiona la reasignación de personal en el sistema (RF-02) y luego pasa al paso 7.
   - No: pasa directo al paso 7.
7. Supervisor/Gerencia: aplica filtros y exporta el reporte en PDF/Excel (RF-04, RF-06). Fin.

Pendiente de definir: el paso 6 ubica la reasignación en el carril Supervisor/Gerencia, pero el CRUD de usuarios (RF-02) es del Administrador.