package com.segandina.sgi.export;

import org.springframework.http.MediaType;

/**
 * Formatos en que se puede exportar el historial de incidencias (RF-06).
 */
public enum FormatoReporte {

	/** Libro de Excel (Apache POI). */
	EXCEL("xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),

	/** Documento PDF (OpenPDF). */
	PDF("pdf", MediaType.APPLICATION_PDF_VALUE);

	private final String extension;
	private final MediaType tipoContenido;

	FormatoReporte(String extension, String tipoContenido) {
		this.extension = extension;
		this.tipoContenido = MediaType.parseMediaType(tipoContenido);
	}

	/** Extensión del archivo, sin punto (p. ej. {@code xlsx}). */
	public String extension() {
		return extension;
	}

	/** Tipo de contenido para la cabecera {@code Content-Type} de la descarga. */
	public MediaType tipoContenido() {
		return tipoContenido;
	}

}
