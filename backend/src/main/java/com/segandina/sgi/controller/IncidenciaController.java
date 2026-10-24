package com.segandina.sgi.controller;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.segandina.sgi.dto.request.IncidenciaRequest;
import com.segandina.sgi.dto.response.IncidenciaResponse;
import com.segandina.sgi.service.IncidenciaService;

import jakarta.validation.Valid;

/**
 * Endpoints de incidencias (RF-03).
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

}
