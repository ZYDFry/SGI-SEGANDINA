package com.segandina.sgi.dto.response;

/**
 * Carga de trabajo de una zona en un rango (RF-07): incidencias del rango frente a los vigilantes activos que tiene
 * asignados hoy. Sirve para decidir a qué zona conviene mover personal.
 *
 * @param idZona                  id de la zona
 * @param nombreZona              nombre de la zona
 * @param incidencias             incidencias de la zona en el rango, con los filtros de nivel y tipo
 * @param vigilantesActivos       vigilantes activos asignados a la zona hoy (no depende del rango)
 * @param incidenciasPorVigilante incidencias / vigilantes, redondeado a 2 decimales; {@code null} si la zona no tiene
 *                                vigilantes
 */
public record CargaZonaResponse(Integer idZona, String nombreZona, long incidencias, long vigilantesActivos,
		Double incidenciasPorVigilante) {

	/**
	 * Arma la fila calculando la relación incidencias por vigilante.
	 *
	 * @param idZona            id de la zona
	 * @param nombreZona        nombre de la zona
	 * @param incidencias       incidencias del rango
	 * @param vigilantesActivos vigilantes activos asignados
	 * @return la carga de la zona
	 */
	public static CargaZonaResponse de(Integer idZona, String nombreZona, long incidencias, long vigilantesActivos) {
		Double porVigilante = vigilantesActivos > 0
				? Math.round(incidencias * 100.0 / vigilantesActivos) / 100.0
				: null;
		return new CargaZonaResponse(idZona, nombreZona, incidencias, vigilantesActivos, porVigilante);
	}

}
