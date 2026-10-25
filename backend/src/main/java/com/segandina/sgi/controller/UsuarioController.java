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

import com.segandina.sgi.dto.request.CambioContrasenaRequest;
import com.segandina.sgi.dto.request.CambioEstadoRequest;
import com.segandina.sgi.dto.request.UsuarioActualizarRequest;
import com.segandina.sgi.dto.request.UsuarioCrearRequest;
import com.segandina.sgi.dto.request.UsuarioFiltro;
import com.segandina.sgi.dto.response.PaginaResponse;
import com.segandina.sgi.dto.response.UsuarioResponse;
import com.segandina.sgi.service.UsuarioService;

import jakarta.validation.Valid;

/**
 * Gestión de usuarios (RF-02), solo Administrador, y cambio de la contraseña propia (cualquier usuario con
 * token). No hay {@code DELETE}: la baja es lógica con {@code PATCH /{id}/estado}.
 */
@RestController
@RequestMapping("/api/usuarios")
public class UsuarioController {

	private final UsuarioService usuarioService;

	public UsuarioController(UsuarioService usuarioService) {
		this.usuarioService = usuarioService;
	}

	/**
	 * Lista usuarios con filtros opcionales y combinables.
	 *
	 * @param idRol  solo ese rol
	 * @param idZona solo esa zona
	 * @param activo {@code true} activos, {@code false} dados de baja; sin valor, todos
	 * @param q      texto libre en DNI, nombres y apellidos
	 * @param page   página desde 0
	 * @param size   tamaño de página (1 a 100)
	 * @return 200 con la página de usuarios
	 */
	@GetMapping
	public PaginaResponse<UsuarioResponse> buscar(
			@RequestParam(required = false) Short idRol,
			@RequestParam(required = false) Integer idZona,
			@RequestParam(required = false) Boolean activo,
			@RequestParam(required = false) String q,
			@RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "20") int size) {
		return PaginaResponse.desde(usuarioService.buscar(new UsuarioFiltro(idRol, idZona, activo, q), page, size));
	}

	/**
	 * Obtiene un usuario.
	 *
	 * @param id id del usuario
	 * @return 200 con el usuario; 404 si no existe
	 */
	@GetMapping("/{id}")
	public UsuarioResponse obtener(@PathVariable Long id) {
		return usuarioService.obtener(id);
	}

	/**
	 * Crea un usuario.
	 *
	 * @param request datos del usuario, con su contraseña inicial
	 * @param jwt     token del Administrador
	 * @return 201 con el usuario; 400 si los datos son inválidos; 409 si el DNI ya existe
	 */
	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public UsuarioResponse crear(@Valid @RequestBody UsuarioCrearRequest request, @AuthenticationPrincipal Jwt jwt) {
		return usuarioService.crear(request, Long.valueOf(jwt.getSubject()));
	}

	/**
	 * Edita los datos, el rol, la zona y opcionalmente la contraseña de un usuario.
	 *
	 * @param id      id del usuario
	 * @param request datos nuevos
	 * @param jwt     token del Administrador
	 * @return 200 con el usuario; 400 si los datos son inválidos; 404 si no existe; 409 si el DNI ya existe
	 */
	@PutMapping("/{id}")
	public UsuarioResponse actualizar(@PathVariable Long id, @Valid @RequestBody UsuarioActualizarRequest request,
			@AuthenticationPrincipal Jwt jwt) {
		return usuarioService.actualizar(id, request, Long.valueOf(jwt.getSubject()));
	}

	/**
	 * Activa o da de baja a un usuario.
	 *
	 * @param id      id del usuario
	 * @param request estado nuevo
	 * @param jwt     token del Administrador
	 * @return 200 con el usuario; 400 si el Administrador intenta desactivarse; 404 si no existe
	 */
	@PatchMapping("/{id}/estado")
	public UsuarioResponse cambiarEstado(@PathVariable Long id, @Valid @RequestBody CambioEstadoRequest request,
			@AuthenticationPrincipal Jwt jwt) {
		return usuarioService.cambiarEstado(id, request.activo(), Long.valueOf(jwt.getSubject()));
	}

	/**
	 * El dueño del token cambia su propia contraseña. Disponible para cualquier rol.
	 *
	 * @param request contraseña actual y nueva
	 * @param jwt     token del usuario
	 * @return 204 si se cambió; 400 si la actual no coincide o la nueva no es válida
	 */
	@PatchMapping("/me/contrasena")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void cambiarContrasenaPropia(@Valid @RequestBody CambioContrasenaRequest request,
			@AuthenticationPrincipal Jwt jwt) {
		usuarioService.cambiarContrasenaPropia(Long.valueOf(jwt.getSubject()), request);
	}

}
