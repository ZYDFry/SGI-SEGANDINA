package com.segandina.sgi.service;

import com.segandina.sgi.dto.request.LoginRequest;
import com.segandina.sgi.dto.response.LoginResponse;
import com.segandina.sgi.dto.response.UsuarioResumenResponse;

/**
 * Autenticación de usuarios (RF-01).
 */
public interface AuthService {

	/**
	 * Valida DNI y contraseña. Registra {@code LOGIN_OK} o {@code LOGIN_FALLIDO} en auditoría.
	 *
	 * @param request DNI y contraseña
	 * @return token JWT y datos básicos del usuario
	 * @throws com.segandina.sgi.exception.CredencialesInvalidasException si el DNI no existe, la contraseña
	 *         no coincide o el usuario está inactivo (siempre con el mismo mensaje)
	 */
	LoginResponse login(LoginRequest request);

	/**
	 * Devuelve los datos del usuario dueño del token.
	 *
	 * @param idUsuario id tomado del claim {@code sub} del JWT
	 * @return resumen del usuario
	 * @throws com.segandina.sgi.exception.CredencialesInvalidasException si el usuario ya no existe o fue
	 *         desactivado después de emitir el token
	 */
	UsuarioResumenResponse usuarioActual(Long idUsuario);

}
