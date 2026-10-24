package com.segandina.sgi.controller;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.segandina.sgi.dto.request.LoginRequest;
import com.segandina.sgi.dto.response.LoginResponse;
import com.segandina.sgi.dto.response.UsuarioResumenResponse;
import com.segandina.sgi.service.AuthService;

import jakarta.validation.Valid;

/**
 * Endpoints de autenticación (RF-01).
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

	private final AuthService authService;

	public AuthController(AuthService authService) {
		this.authService = authService;
	}

	/**
	 * Inicia sesión con DNI y contraseña. Público.
	 *
	 * @param request DNI (8 dígitos) y contraseña
	 * @return 200 con el token y los datos del usuario; 400 si el formato es inválido; 401 si las
	 *         credenciales no son válidas
	 */
	@PostMapping("/login")
	public LoginResponse login(@Valid @RequestBody LoginRequest request) {
		return authService.login(request);
	}

	/**
	 * Devuelve el usuario dueño del token. Requiere {@code Authorization: Bearer <token>}.
	 *
	 * @param jwt token ya validado por Spring Security
	 * @return datos básicos del usuario autenticado
	 */
	@GetMapping("/yo")
	public UsuarioResumenResponse yo(@AuthenticationPrincipal Jwt jwt) {
		return authService.usuarioActual(Long.valueOf(jwt.getSubject()));
	}

}
