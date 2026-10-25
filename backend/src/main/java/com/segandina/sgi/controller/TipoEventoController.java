package com.segandina.sgi.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.segandina.sgi.dto.request.CambioEstadoRequest;
import com.segandina.sgi.dto.request.TipoEventoRequest;
import com.segandina.sgi.dto.response.TipoEventoResponse;
import com.segandina.sgi.service.TipoEventoService;

import jakarta.validation.Valid;

/**
 * Administración de tipos de evento (RF-09). Solo Administrador. No hay {@code DELETE}: la baja es lógica.
 * Los formularios usan {@code GET /api/catalogos/tipos-evento}, que solo devuelve los activos.
 */
@RestController
@RequestMapping("/api/tipos-evento")
public class TipoEventoController {

	private final TipoEventoService tipoEventoService;

	public TipoEventoController(TipoEventoService tipoEventoService) {
		this.tipoEventoService = tipoEventoService;
	}

	/**
	 * Lista todos los tipos de evento, activos o no.
	 *
	 * @return 200 con los tipos ordenados por nombre
	 */
	@GetMapping
	public List<TipoEventoResponse> listar() {
		return tipoEventoService.listar();
	}

	/**
	 * Crea un tipo de evento.
	 *
	 * @param request nombre del tipo
	 * @param jwt     token del Administrador
	 * @return 201 con el tipo; 400 si el nombre es inválido; 409 si ya existe
	 */
	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public TipoEventoResponse crear(@Valid @RequestBody TipoEventoRequest request, @AuthenticationPrincipal Jwt jwt) {
		return tipoEventoService.crear(request, Long.valueOf(jwt.getSubject()));
	}

	/**
	 * Renombra un tipo de evento.
	 *
	 * @param id      id del tipo
	 * @param request nombre nuevo
	 * @param jwt     token del Administrador
	 * @return 200 con el tipo; 400 si el nombre es inválido o el tipo es "Otro"; 404 si no existe; 409 si el
	 *         nombre ya existe
	 */
	@PutMapping("/{id}")
	public TipoEventoResponse actualizar(@PathVariable Short id, @Valid @RequestBody TipoEventoRequest request,
			@AuthenticationPrincipal Jwt jwt) {
		return tipoEventoService.actualizar(id, request, Long.valueOf(jwt.getSubject()));
	}

	/**
	 * Activa o da de baja un tipo de evento.
	 *
	 * @param id      id del tipo
	 * @param request estado nuevo
	 * @param jwt     token del Administrador
	 * @return 200 con el tipo; 404 si no existe
	 */
	@PatchMapping("/{id}/estado")
	public TipoEventoResponse cambiarEstado(@PathVariable Short id, @Valid @RequestBody CambioEstadoRequest request,
			@AuthenticationPrincipal Jwt jwt) {
		return tipoEventoService.cambiarEstado(id, request.activo(), Long.valueOf(jwt.getSubject()));
	}

}
