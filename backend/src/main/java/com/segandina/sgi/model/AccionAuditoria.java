package com.segandina.sgi.model;

/**
 * Acciones críticas que se registran en la tabla {@code auditoria} (RF-08).
 * <p>
 * El nombre de cada constante es el valor que se guarda en {@code accion_realizada}.
 */
public enum AccionAuditoria {

	LOGIN_OK,
	LOGIN_FALLIDO,
	CREAR_USUARIO,
	MODIFICAR_USUARIO,
	CAMBIAR_ESTADO_USUARIO,
	CAMBIAR_CONTRASENA,
	REGISTRAR_INCIDENCIA,
	EXPORTAR_REPORTE,
	CREAR_ZONA,
	MODIFICAR_ZONA,
	CAMBIAR_ESTADO_ZONA,
	CREAR_TIPO_EVENTO,
	MODIFICAR_TIPO_EVENTO,
	CAMBIAR_ESTADO_TIPO_EVENTO,
	MODIFICAR_NIVEL_GRAVEDAD

}
