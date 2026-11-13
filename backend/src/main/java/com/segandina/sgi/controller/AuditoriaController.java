package com.segandina.sgi.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.segandina.sgi.dto.request.AuditoriaFiltro;
import com.segandina.sgi.dto.response.AccionAuditoriaResponse;
import com.segandina.sgi.dto.response.AuditoriaResponse;
import com.segandina.sgi.dto.response.PaginaResponse;
import com.segandina.sgi.service.AuditoriaService;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

/**
 * Consulta de la auditoría (RF-08). Solo Administrador (regla de {@code /api/auditoria/**} en
 * {@code SecurityConfig}). Consultar no genera registros de auditoría.
 */
@RestController
@RequestMapping("/api/auditoria")
public class AuditoriaController {

	private static final String MENSAJE_TAMANO = "debe estar entre 1 y " + AuditoriaService.TAMANO_MAXIMO;

	private final AuditoriaService auditoriaService;

	public AuditoriaController(AuditoriaService auditoriaService) {
		this.auditoriaService = auditoriaService;
	}

	/**
	 * Registros de auditoría, del más reciente al más antiguo.
	 * <p>
	 * Query params: {@code periodo} (HOY, ULTIMOS_7_DIAS, ULTIMOS_30_DIAS por defecto, MES_ACTUAL, ANIO_ACTUAL,
	 * PERSONALIZADO), {@code desde} y {@code hasta} (AAAA-MM-DD, solo con PERSONALIZADO), {@code accion} (un valor
	 * de {@code GET /api/auditoria/acciones}), {@code idUsuario} y {@code q} (DNI completo o sus primeros dígitos).
	 *
	 * @param filtro filtros tomados de los query params
	 * @param page   página desde 0
	 * @param size   tamaño de página (1 a 100)
	 * @return 200 con la página; 400 con el campo en {@code detalles} si algún parámetro no es válido
	 */
	@GetMapping
	public PaginaResponse<AuditoriaResponse> buscar(@Valid AuditoriaFiltro filtro,
			@RequestParam(defaultValue = "0") @Min(value = 0, message = "debe ser mayor o igual que 0") int page,
			@RequestParam(defaultValue = "20") @Min(value = 1, message = MENSAJE_TAMANO)
			@Max(value = AuditoriaService.TAMANO_MAXIMO, message = MENSAJE_TAMANO) int size) {
		return PaginaResponse.desde(auditoriaService.buscar(filtro, page, size));
	}

	/**
	 * Acciones válidas para el filtro {@code accion}.
	 *
	 * @return 200 con el valor y la etiqueta en español de cada acción
	 */
	@GetMapping("/acciones")
	public List<AccionAuditoriaResponse> acciones() {
		return auditoriaService.acciones();
	}

}
