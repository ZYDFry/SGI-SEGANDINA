package com.segandina.sgi.controller;

import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.segandina.sgi.dto.request.IncidenciaFiltro;
import com.segandina.sgi.dto.response.ArchivoReporte;
import com.segandina.sgi.export.FormatoReporte;
import com.segandina.sgi.service.ReporteService;

/**
 * Descarga del historial de incidencias en Excel o PDF (RF-06). Roles: Administrador y Supervisor.
 * <p>
 * Aceptan los mismos query params que el historial: {@code periodo}, {@code desde}, {@code hasta},
 * {@code idZona}, {@code idNivelGravedad} e {@code idTipoEvento}. Responden 200 con el archivo como adjunto
 * ({@code Content-Disposition: attachment}); 400 en JSON si el periodo o las fechas no son válidos o si hay más
 * de {@link ReporteService#MAX_FILAS} incidencias.
 */
@RestController
@RequestMapping("/api/reportes")
public class ReporteController {

	private final ReporteService reporteService;

	public ReporteController(ReporteService reporteService) {
		this.reporteService = reporteService;
	}

	/**
	 * Historial filtrado en Excel ({@code incidencias_AAAA-MM-DD.xlsx}).
	 *
	 * @param filtro filtros tomados de los query params
	 * @param jwt    token ya validado; su {@code sub} es el id del usuario que exporta
	 * @return el archivo
	 */
	@GetMapping("/excel")
	public ResponseEntity<byte[]> excel(IncidenciaFiltro filtro, @AuthenticationPrincipal Jwt jwt) {
		return descarga(reporteService.exportar(FormatoReporte.EXCEL, filtro, Long.valueOf(jwt.getSubject())));
	}

	/**
	 * Historial filtrado en PDF ({@code incidencias_AAAA-MM-DD.pdf}), con título, periodo aplicado y fecha de
	 * generación.
	 *
	 * @param filtro filtros tomados de los query params
	 * @param jwt    token ya validado; su {@code sub} es el id del usuario que exporta
	 * @return el archivo
	 */
	@GetMapping("/pdf")
	public ResponseEntity<byte[]> pdf(IncidenciaFiltro filtro, @AuthenticationPrincipal Jwt jwt) {
		return descarga(reporteService.exportar(FormatoReporte.PDF, filtro, Long.valueOf(jwt.getSubject())));
	}

	private static ResponseEntity<byte[]> descarga(ArchivoReporte archivo) {
		return ResponseEntity.ok()
				.contentType(archivo.formato().tipoContenido())
				.header(HttpHeaders.CONTENT_DISPOSITION,
						ContentDisposition.attachment().filename(archivo.nombreArchivo()).build().toString())
				.body(archivo.contenido());
	}

}
