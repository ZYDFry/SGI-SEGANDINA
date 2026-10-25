package com.segandina.sgi.service;

import java.time.Duration;

import org.springframework.data.domain.Page;

import com.segandina.sgi.dto.request.IncidenciaFiltro;
import com.segandina.sgi.dto.request.IncidenciaRequest;
import com.segandina.sgi.dto.response.IncidenciaHistorialResponse;
import com.segandina.sgi.dto.response.IncidenciaResponse;

/**
 * Lógica de negocio de incidencias: registro (RF-03) e historial (RF-04).
 */
public interface IncidenciaService {

	/** Nombre del tipo de evento que exige una descripción más detallada. */
	String TIPO_OTRO = "Otro";

	/** Largo mínimo de la descripción (sin espacios en los extremos) cuando el tipo es {@link #TIPO_OTRO}. */
	int MIN_DESCRIPCION_OTRO = 20;

	/** Margen aceptado para una {@code fechaHora} adelantada, por desfase del reloj del celular. */
	Duration TOLERANCIA_RELOJ = Duration.ofMinutes(2);

	/** Tamaño máximo de página del historial. */
	int TAMANO_MAXIMO = 100;

	/**
	 * Registra una incidencia a nombre del usuario autenticado y audita {@code REGISTRAR_INCIDENCIA} en la
	 * misma transacción.
	 *
	 * @param request   datos del formulario
	 * @param idUsuario id del usuario, tomado del token (nunca del body)
	 * @return la incidencia guardada
	 * @throws com.segandina.sgi.exception.CredencialesInvalidasException si el usuario no existe o está inactivo
	 * @throws com.segandina.sgi.exception.ReglaNegocioException si la zona, el tipo o el nivel no existe o está
	 *         inactivo, si la fecha es futura o si la descripción de un tipo "Otro" es demasiado corta
	 */
	IncidenciaResponse registrar(IncidenciaRequest request, Long idUsuario);

	/**
	 * Historial de incidencias (RF-04): las del rango y filtros indicados, de la más reciente a la más antigua
	 * por {@code fecha_hora}.
	 *
	 * @param filtro periodo o fechas, zona, nivel y tipo (todos opcionales)
	 * @param pagina número de página desde 0 (un valor negativo se toma como 0)
	 * @param tamano elementos por página; se acota entre 1 y {@link #TAMANO_MAXIMO}
	 * @return la página de incidencias
	 * @throws com.segandina.sgi.exception.ReglaNegocioException si el rango de fechas no es válido
	 */
	Page<IncidenciaHistorialResponse> buscar(IncidenciaFiltro filtro, int pagina, int tamano);

}
