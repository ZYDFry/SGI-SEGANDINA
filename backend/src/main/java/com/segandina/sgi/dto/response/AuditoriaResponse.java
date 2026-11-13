package com.segandina.sgi.dto.response;

import java.time.OffsetDateTime;
import java.util.Map;

import com.segandina.sgi.config.RelojConfig;
import com.segandina.sgi.dto.response.IncidenciaHistorialResponse.Registrador;
import com.segandina.sgi.model.AccionAuditoria;
import com.segandina.sgi.model.Auditoria;

/**
 * Fila de la consulta de auditoría (RF-08). Del usuario solo expone id, DNI y nombre completo.
 *
 * @param idAuditoria    id del registro
 * @param fechaHora      cuándo ocurrió la acción, en hora de Lima (con su desfase)
 * @param accion         valor guardado en {@code accion_realizada}
 * @param accionEtiqueta texto en español de la acción
 * @param usuario        usuario que realizó la acción; {@code null} si no se identificó (p. ej. DNI inexistente)
 * @param dniIntentado   DNI usado en un intento de login; {@code null} si no aplica
 * @param detalle        contenido de {@code detalle_cambio} como objeto JSON; puede ser {@code null}
 */
public record AuditoriaResponse(Long idAuditoria, OffsetDateTime fechaHora, String accion, String accionEtiqueta,
		Registrador usuario, String dniIntentado, Map<String, Object> detalle) {

	/**
	 * Construye la fila a partir de la entidad, con su usuario ya cargado.
	 *
	 * @param auditoria entidad origen
	 * @return la fila de la consulta
	 */
	public static AuditoriaResponse desde(Auditoria auditoria) {
		OffsetDateTime fecha = auditoria.getFechaHora() == null ? null
				: auditoria.getFechaHora().atZoneSameInstant(RelojConfig.ZONA_LIMA).toOffsetDateTime();
		return new AuditoriaResponse(
				auditoria.getIdAuditoria(),
				fecha,
				auditoria.getAccionRealizada(),
				AccionAuditoria.etiquetaDe(auditoria.getAccionRealizada()),
				auditoria.getUsuario() == null ? null : Registrador.desde(auditoria.getUsuario()),
				auditoria.getDniIntentado(),
				auditoria.getDetalleCambio());
	}

}
