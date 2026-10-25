package com.segandina.sgi.export;

/**
 * Convierte un reporte de incidencias en un archivo de un formato concreto (RF-06). Cada implementación es un
 * bean de Spring; para agregar un formato basta con crear otra implementación.
 */
public interface ExportadorReporte {

	/** Formato que genera esta implementación. */
	FormatoReporte formato();

	/**
	 * Genera el archivo en memoria. Con cero filas, el archivo trae solo los encabezados.
	 *
	 * @param datos periodo, rango, fecha de generación e incidencias
	 * @return el contenido del archivo
	 * @throws IllegalStateException si la librería falla al escribir el archivo
	 */
	byte[] exportar(DatosReporte datos);

}
