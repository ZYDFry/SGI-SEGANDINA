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
	REGISTRAR_INCIDENCIA,
	EXPORTAR_REPORTE

}
