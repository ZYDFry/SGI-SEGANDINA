package com.segandina.sgi.dto.response;

import java.time.Instant;

/**
 * Respuesta de un login exitoso (RF-01).
 *
 * @param token    JWT firmado con HS256; se envía como {@code Authorization: Bearer <token>}
 * @param tipo     siempre {@code "Bearer"}
 * @param expiraEn instante en que el token deja de ser válido
 * @param usuario  datos básicos del usuario autenticado (sin contraseña)
 */
public record LoginResponse(String token, String tipo, Instant expiraEn, UsuarioResumenResponse usuario) {

	/**
	 * Crea una respuesta con tipo {@code Bearer}.
	 *
	 * @param token    JWT
	 * @param expiraEn vencimiento del token
	 * @param usuario  resumen del usuario
	 * @return la respuesta del login
	 */
	public static LoginResponse bearer(String token, Instant expiraEn, UsuarioResumenResponse usuario) {
		return new LoginResponse(token, "Bearer", expiraEn, usuario);
	}

}
