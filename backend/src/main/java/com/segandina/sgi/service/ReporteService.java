package com.segandina.sgi.service;

import com.segandina.sgi.dto.request.IncidenciaFiltro;
import com.segandina.sgi.dto.response.ArchivoReporte;
import com.segandina.sgi.export.FormatoReporte;

/**
 * Exportación del historial de incidencias a archivo (RF-06).
 */
public interface ReporteService {

	/** Máximo de incidencias por reporte; con más hay que acotar los filtros. */
	int MAX_FILAS = 10_000;

	/** Prefijo del nombre de archivo; le siguen la fecha de hoy en Lima y la extensión. */
	String PREFIJO_ARCHIVO = "incidencias_";

	/**
	 * Genera el reporte con las incidencias que cumplen los filtros (los mismos del historial y en el mismo
	 * orden) y audita {@code EXPORTAR_REPORTE} con los filtros usados en la misma transacción.
	 *
	 * @param formato   formato del archivo
	 * @param filtro    periodo o fechas, zona, nivel y tipo (todos opcionales)
	 * @param idUsuario id del usuario, tomado del token
	 * @return el archivo, con nombre {@code incidencias_AAAA-MM-DD.<ext>}
	 * @throws com.segandina.sgi.exception.CredencialesInvalidasException si el usuario no existe o está inactivo
	 * @throws com.segandina.sgi.exception.ReglaNegocioException si el rango de fechas no es válido o hay más de
	 *         {@link #MAX_FILAS} incidencias
	 */
	ArchivoReporte exportar(FormatoReporte formato, IncidenciaFiltro filtro, Long idUsuario);

}
