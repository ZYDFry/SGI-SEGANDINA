package com.segandina.sgi.dao;

import java.util.List;

import com.segandina.sgi.dto.request.IncidenciaFiltro;
import com.segandina.sgi.dto.request.RangoFechas;

/**
 * Consultas agregadas de incidencias para el dashboard (RF-05). Todas cuentan las incidencias con
 * {@code fecha_hora} en {@code [rango.inicio(), rango.fin())} y aplican solo los filtros de zona, nivel y tipo
 * que tengan valor. Implementación: {@link IncidenciaEstadisticasDaoImpl}.
 */
public interface IncidenciaEstadisticasDao {

	/**
	 * Cuenta incidencias por zona.
	 *
	 * @param rango  rango de días
	 * @param filtro filtros opcionales
	 * @return un conteo por zona con incidencias, de mayor a menor total
	 */
	List<ConteoAgrupado> contarPorZona(RangoFechas rango, IncidenciaFiltro filtro);

	/**
	 * Cuenta incidencias por tipo de evento.
	 *
	 * @param rango  rango de días
	 * @param filtro filtros opcionales
	 * @return un conteo por tipo con incidencias, de mayor a menor total
	 */
	List<ConteoAgrupado> contarPorTipo(RangoFechas rango, IncidenciaFiltro filtro);

	/**
	 * Cuenta incidencias por nivel de gravedad.
	 *
	 * @param rango  rango de días
	 * @param filtro filtros opcionales
	 * @return un conteo por nivel con incidencias
	 */
	List<ConteoAgrupado> contarPorNivel(RangoFechas rango, IncidenciaFiltro filtro);

	/**
	 * Cuenta incidencias por día calendario de Lima ({@code fecha_hora AT TIME ZONE 'America/Lima'}).
	 *
	 * @param rango  rango de días
	 * @param filtro filtros opcionales
	 * @return un conteo por día con incidencias, ordenado por día; los días sin datos no aparecen
	 */
	List<ConteoDiario> contarPorDia(RangoFechas rango, IncidenciaFiltro filtro);

}
