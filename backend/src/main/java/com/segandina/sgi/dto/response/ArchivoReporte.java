package com.segandina.sgi.dto.response;

import com.segandina.sgi.export.FormatoReporte;

/**
 * Archivo de reporte generado (RF-06), listo para enviarse como descarga.
 *
 * @param nombreArchivo nombre con la fecha de generación, p. ej. {@code incidencias_2026-10-24.xlsx}
 * @param formato       formato del archivo (da el tipo de contenido)
 * @param contenido     bytes del archivo
 */
public record ArchivoReporte(String nombreArchivo, FormatoReporte formato, byte[] contenido) {
}
