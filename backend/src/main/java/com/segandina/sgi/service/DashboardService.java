package com.segandina.sgi.service;

import java.util.List;

import com.segandina.sgi.dto.request.Agrupacion;
import com.segandina.sgi.dto.request.IncidenciaFiltro;
import com.segandina.sgi.dto.response.ConteoResponse;
import com.segandina.sgi.dto.response.DespliegueZonaResponse;
import com.segandina.sgi.dto.response.KpisResponse;
import com.segandina.sgi.dto.response.SerieTiempoResponse;

/**
 * Métricas del dashboard gerencial (RF-05) y despliegue de vigilantes por zona (RF-07). Los métodos que
 * reciben un {@link IncidenciaFiltro} lanzan {@link com.segandina.sgi.exception.ReglaNegocioException} si el
 * rango de fechas no es válido.
 */
public interface DashboardService {

	/**
	 * Indicadores principales: incidencias de hoy, del rango y por nivel de gravedad.
	 *
	 * @param filtro periodo o fechas, zona, nivel y tipo
	 * @return los indicadores
	 */
	KpisResponse kpis(IncidenciaFiltro filtro);

	/**
	 * Incidencias del rango por zona (solo zonas con incidencias, de mayor a menor).
	 *
	 * @param filtro periodo o fechas, zona, nivel y tipo
	 * @return un conteo por zona
	 */
	List<ConteoResponse> incidenciasPorZona(IncidenciaFiltro filtro);

	/**
	 * Incidencias del rango por tipo de evento (solo tipos con incidencias, de mayor a menor).
	 *
	 * @param filtro periodo o fechas, zona, nivel y tipo
	 * @return un conteo por tipo
	 */
	List<ConteoResponse> incidenciasPorTipo(IncidenciaFiltro filtro);

	/**
	 * Serie de incidencias por día, semana o mes, con todos los tramos del rango (0 si no hay datos).
	 *
	 * @param filtro     periodo o fechas, zona, nivel y tipo
	 * @param agrupacion tamaño del tramo; {@code null} usa {@link Agrupacion#porDefecto}
	 * @return la serie en orden cronológico
	 */
	SerieTiempoResponse incidenciasPorTiempo(IncidenciaFiltro filtro, Agrupacion agrupacion);

	/**
	 * Vigilantes activos por zona activa, desde {@code v_despliegue_por_zona}. No depende del rango.
	 *
	 * @return una fila por zona activa, ordenadas por nombre
	 */
	List<DespliegueZonaResponse> despliegue();

}
