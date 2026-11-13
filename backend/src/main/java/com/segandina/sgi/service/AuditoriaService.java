package com.segandina.sgi.service;

import java.util.List;
import java.util.Map;

import org.springframework.data.domain.Page;

import com.segandina.sgi.dto.request.AuditoriaFiltro;
import com.segandina.sgi.dto.response.AccionAuditoriaResponse;
import com.segandina.sgi.dto.response.AuditoriaResponse;
import com.segandina.sgi.model.AccionAuditoria;
import com.segandina.sgi.model.Usuario;

/**
 * Registro y consulta de la tabla {@code auditoria} (RF-08). Solo inserta y lee: nunca modifica ni borra.
 */
public interface AuditoriaService {

	/** Tamaño máximo de página de la consulta. */
	int TAMANO_MAXIMO = 100;

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

	/**
	 * Consulta la auditoría del registro más reciente al más antiguo. No genera registros de auditoría.
	 *
	 * @param filtro filtros opcionales; sin periodo, últimos 30 días
	 * @param pagina página desde 0
	 * @param tamano tamaño de página (1 a {@link #TAMANO_MAXIMO})
	 * @return la página de registros, con el usuario resumido (id, DNI, nombre completo)
	 * @throws com.segandina.sgi.exception.ParametroInvalidoException si el rango de fechas, la página o el
	 *         tamaño no son válidos
	 */
	Page<AuditoriaResponse> buscar(AuditoriaFiltro filtro, int pagina, int tamano);

	/**
	 * Acciones válidas para el filtro de la consulta, en el orden en que se declaran.
	 *
	 * @return valor y etiqueta en español de cada acción
	 */
	List<AccionAuditoriaResponse> acciones();

}
