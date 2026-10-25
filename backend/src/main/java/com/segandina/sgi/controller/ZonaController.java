package com.segandina.sgi.controller;

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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.segandina.sgi.dto.request.CambioEstadoRequest;
import com.segandina.sgi.dto.request.ZonaFiltro;
import com.segandina.sgi.dto.request.ZonaRequest;
import com.segandina.sgi.dto.response.PaginaResponse;
import com.segandina.sgi.dto.response.ZonaResponse;
import com.segandina.sgi.service.ZonaService;

import jakarta.validation.Valid;

/**
 * Gestión de zonas (RF-09). Solo Administrador. No hay {@code DELETE}: la baja es lógica.
 */
@RestController
@RequestMapping("/api/zonas")
public class ZonaController {

	private final ZonaService zonaService;

	public ZonaController(ZonaService zonaService) {
		this.zonaService = zonaService;
	}

	/**
	 * Busca zonas con filtros opcionales y combinables (contrato de RF-09).
	 *
	 * @param nombre       el nombre contiene el texto
	 * @param departamento departamento exacto
	 * @param provincia    provincia exacta
	 * @param distrito     distrito exacto
	 * @param activo       {@code true} activas, {@code false} inactivas; sin valor, todas
	 * @param q            texto libre en referencia o descripción
	 * @param page         página desde 0
	 * @param size         tamaño de página (1 a 100)
	 * @return 200 con la página de zonas
	 */
	@GetMapping
	public PaginaResponse<ZonaResponse> buscar(
			@RequestParam(required = false) String nombre,
			@RequestParam(required = false) String departamento,
			@RequestParam(required = false) String provincia,
			@RequestParam(required = false) String distrito,
			@RequestParam(required = false) Boolean activo,
			@RequestParam(required = false) String q,
			@RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "20") int size) {
		ZonaFiltro filtro = new ZonaFiltro(nombre, departamento, provincia, distrito, activo, q);
		return PaginaResponse.desde(zonaService.buscar(filtro, page, size));
	}

	/**
	 * Obtiene una zona, activa o no.
	 *
	 * @param id id de la zona
	 * @return 200 con la zona; 404 si no existe
	 */
	@GetMapping("/{id}")
	public ZonaResponse obtener(@PathVariable Integer id) {
		return zonaService.obtener(id);
	}

	/**
	 * Crea una zona.
	 *
	 * @param request datos de la zona
	 * @param jwt     token del Administrador
	 * @return 201 con la zona; 400 si los datos son inválidos; 409 si el nombre ya existe
	 */
	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public ZonaResponse crear(@Valid @RequestBody ZonaRequest request, @AuthenticationPrincipal Jwt jwt) {
		return zonaService.crear(request, Long.valueOf(jwt.getSubject()));
	}

	/**
	 * Edita una zona.
	 *
	 * @param id      id de la zona
	 * @param request datos nuevos
	 * @param jwt     token del Administrador
	 * @return 200 con la zona; 400 si los datos son inválidos; 404 si no existe; 409 si el nombre ya existe
	 */
	@PutMapping("/{id}")
	public ZonaResponse actualizar(@PathVariable Integer id, @Valid @RequestBody ZonaRequest request,
			@AuthenticationPrincipal Jwt jwt) {
		return zonaService.actualizar(id, request, Long.valueOf(jwt.getSubject()));
	}

	/**
	 * Activa o da de baja una zona.
	 *
	 * @param id      id de la zona
	 * @param request estado nuevo
	 * @param jwt     token del Administrador
	 * @return 200 con la zona; 404 si no existe
	 */
	@PatchMapping("/{id}/estado")
	public ZonaResponse cambiarEstado(@PathVariable Integer id, @Valid @RequestBody CambioEstadoRequest request,
			@AuthenticationPrincipal Jwt jwt) {
		return zonaService.cambiarEstado(id, request.activo(), Long.valueOf(jwt.getSubject()));
	}

}
