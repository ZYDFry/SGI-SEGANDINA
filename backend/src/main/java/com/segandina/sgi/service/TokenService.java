package com.segandina.sgi.service;

import java.time.Instant;

import com.segandina.sgi.model.Usuario;

/**
 * Emisión de tokens de acceso para usuarios autenticados.
 */
public interface TokenService {

	/** Nombre del claim que lleva el rol del usuario. */
	String CLAIM_ROL = "rol";

	/** Nombre del claim que lleva el DNI del usuario. */
	String CLAIM_DNI = "dni";

	/**
	 * Claim presente (con valor {@code true}) solo cuando el usuario tiene una contraseña temporal. Un token con
	 * este claim solo sirve para cambiar la contraseña propia y consultar {@code /api/auth/yo}.
	 */
	String CLAIM_CAMBIO_PENDIENTE = "cambioPendiente";

	/**
	 * Token emitido y su vencimiento.
	 *
	 * @param token    JWT codificado
	 * @param expiraEn instante de expiración
	 */
	record TokenEmitido(String token, Instant expiraEn) {
	}

	/**
	 * Genera un JWT con {@code sub} = id del usuario y los claims {@code rol} y {@code dni}, más
	 * {@link #CLAIM_CAMBIO_PENDIENTE} si el usuario debe cambiar su contraseña.
	 * Debe llamarse dentro de una transacción (lee el rol, que es LAZY).
	 *
	 * @param usuario usuario autenticado
	 * @return el token y su fecha de expiración
	 */
	TokenEmitido generarToken(Usuario usuario);

}
