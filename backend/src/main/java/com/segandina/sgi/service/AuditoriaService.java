package com.segandina.sgi.service;

import java.util.Map;

import com.segandina.sgi.model.AccionAuditoria;
import com.segandina.sgi.model.Usuario;

/**
 * Escritura de registros en la tabla {@code auditoria} (RF-08). Solo inserta: nunca modifica ni borra.
 */
public interface AuditoriaService {

	/**
	 * Registra una acción dentro de la transacción en curso, de modo que el log y la acción se confirman
	 * o se revierten juntos.
	 *
	 * @param accion       acción realizada
	 * @param detalle      datos adicionales (se guardan como JSONB); puede ser {@code null}
	 * @param dniIntentado DNI usado en un intento de login; {@code null} si no aplica
	 * @param usuario      usuario que realizó la acción; {@code null} si no se identificó
	 */
	void registrar(AccionAuditoria accion, Map<String, Object> detalle, String dniIntentado, Usuario usuario);

	/**
	 * Registra un {@code LOGIN_FALLIDO} en una transacción propia, para que el log se guarde aunque el
	 * login termine con excepción.
	 *
	 * @param dniIntentado DNI ingresado
	 * @param usuario      usuario dueño del DNI; {@code null} si el DNI no está registrado
	 * @param motivo       causa interna del rechazo (p. ej. {@code CONTRASENA_INCORRECTA}); se guarda en el detalle
	 */
	void registrarLoginFallido(String dniIntentado, Usuario usuario, String motivo);

}
