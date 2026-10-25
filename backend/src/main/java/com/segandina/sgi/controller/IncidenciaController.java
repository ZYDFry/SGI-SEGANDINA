package com.segandina.sgi.controller;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.segandina.sgi.dto.request.IncidenciaFiltro;
import com.segandina.sgi.dto.request.IncidenciaRequest;
import com.segandina.sgi.dto.response.IncidenciaHistorialResponse;
import com.segandina.sgi.dto.response.IncidenciaResponse;
import com.segandina.sgi.dto.response.PaginaResponse;
import com.segandina.sgi.service.IncidenciaService;

import jakarta.validation.Valid;

/**
 * Endpoints de incidencias: registro (RF-03) e historial (RF-04).
 */
@RestController
@RequestMapping("/api/incidencias")
public class IncidenciaController {

	private final IncidenciaService incidenciaService;

	public IncidenciaController(IncidenciaService incidenciaService) {
		this.incidenciaService = incidenciaService;
	}

	/**
	 * Registra una incidencia a nombre del dueño del token. Roles: Vigilante y Administrador.
	 *
	 * @param request datos del formulario
	 * @param jwt     token ya validado por Spring Security; su {@code sub} es el id del usuario
	 * @return 201 con la incidencia guardada; 400 si los datos son inválidos o incumplen una regla; 401 sin
	 *         token válido o si el usuario está inactivo; 403 con otro rol
	 */
	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public IncidenciaResponse registrar(@Valid @RequestBody IncidenciaRequest request,
			@AuthenticationPrincipal Jwt jwt) {
		return incidenciaService.registrar(request, Long.valueOf(jwt.getSubject()));
	}

	/**
	 * Historial de incidencias, de la más reciente a la más antigua. Roles: Administrador y Supervisor.
	 * <p>
	 * Query params: {@code periodo} (HOY, ULTIMOS_7_DIAS, ULTIMOS_30_DIAS por defecto, MES_ACTUAL, ANIO_ACTUAL,
	 * PERSONALIZADO), {@code desde} y {@code hasta} (AAAA-MM-DD, solo con PERSONALIZADO), {@code idZona},
	 * {@code idNivelGravedad} e {@code idTipoEvento}.
	 *
	 * @param filtro filtros tomados de los query params
	 * @param page   página desde 0
	 * @param size   tamaño de página (1 a 100)
	 * @return 200 con la página; 400 si el periodo o las fechas no son válidos
	 */
	@GetMapping
	public PaginaResponse<IncidenciaHistorialResponse> buscar(IncidenciaFiltro filtro,
			@RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "20") int size) {
		return PaginaResponse.desde(incidenciaService.buscar(filtro, page, size));
	}

}
