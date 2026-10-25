package com.segandina.sgi.controller;

import java.util.List;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.segandina.sgi.dto.request.NivelGravedadRequest;
import com.segandina.sgi.dto.response.NivelGravedadResponse;
import com.segandina.sgi.service.NivelGravedadService;

import jakarta.validation.Valid;

/**
 * Administración de niveles de gravedad (RF-09): solo nombre y orden. Solo Administrador.
 */
@RestController
@RequestMapping("/api/niveles-gravedad")
public class NivelGravedadController {

	private final NivelGravedadService nivelGravedadService;

	public NivelGravedadController(NivelGravedadService nivelGravedadService) {
		this.nivelGravedadService = nivelGravedadService;
	}

	/**
	 * Lista todos los niveles de gravedad, activos o no.
	 *
	 * @return 200 con los niveles de menos a más grave
	 */
	@GetMapping
	public List<NivelGravedadResponse> listar() {
		return nivelGravedadService.listar();
	}

	/**
	 * Cambia el nombre y el orden de un nivel; si el orden lo tiene otro nivel, se intercambian.
	 *
	 * @param id      id del nivel
	 * @param request nombre y orden nuevos
	 * @param jwt     token del Administrador
	 * @return 200 con el nivel; 400 si los datos son inválidos; 404 si no existe; 409 si el nombre ya existe
	 */
	@PutMapping("/{id}")
	public NivelGravedadResponse actualizar(@PathVariable Short id, @Valid @RequestBody NivelGravedadRequest request,
			@AuthenticationPrincipal Jwt jwt) {
		return nivelGravedadService.actualizar(id, request, Long.valueOf(jwt.getSubject()));
	}

}
