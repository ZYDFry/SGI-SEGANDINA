package com.segandina.sgi.config;

import java.nio.charset.StandardCharsets;
import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Configuración del JWT (prefijo {@code jwt} en {@code application.properties}).
 *
 * @param secreto    clave HS256; viene de la variable de entorno {@code JWT_SECRET} y debe tener al menos 32 bytes
 * @param expiracion vigencia del token; por defecto 8 horas (un turno)
 */
@ConfigurationProperties("jwt")
public record JwtProperties(String secreto, Duration expiracion) {

	/** Longitud mínima de la clave para HMAC-SHA256 (256 bits). */
	public static final int LONGITUD_MINIMA_SECRETO = 32;

	public JwtProperties {
		if (secreto == null || secreto.getBytes(StandardCharsets.UTF_8).length < LONGITUD_MINIMA_SECRETO) {
			throw new IllegalStateException(
					"JWT_SECRET no está definido o tiene menos de " + LONGITUD_MINIMA_SECRETO + " bytes");
		}
		if (expiracion == null) {
			expiracion = Duration.ofHours(8);
		}
	}

}
