package com.segandina.sgi.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;

import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;

import com.segandina.sgi.config.JwtProperties;
import com.segandina.sgi.config.SecurityConfig;
import com.segandina.sgi.model.Rol;
import com.segandina.sgi.model.Usuario;
import com.segandina.sgi.service.TokenService;

/**
 * Verifica que el token emitido se pueda validar con el decoder de la aplicación y lleve los claims esperados.
 */
class JwtTokenServiceImplTest {

	private static final String SECRETO = "secreto-de-pruebas-con-mas-de-32-bytes!";

	private final SecurityConfig securityConfig = new SecurityConfig();
	private final JwtProperties propiedades = new JwtProperties(SECRETO, Duration.ofHours(8));

	@Test
	void tokenEmitidoSeValidaYContieneSubRolYExpiracionDeOchoHoras() {
		// Reloj fijado en el instante actual: con una fecha antigua el decoder rechazaría el token por vencido
		Instant ahora = Instant.now().truncatedTo(ChronoUnit.SECONDS);
		Clock reloj = Clock.fixed(ahora, ZoneOffset.UTC);
		JwtTokenServiceImpl servicio = new JwtTokenServiceImpl(securityConfig.jwtEncoder(propiedades), propiedades,
				reloj);

		TokenService.TokenEmitido emitido = servicio.generarToken(administrador());
		JwtDecoder decoder = securityConfig.jwtDecoder(propiedades);
		Jwt jwt = decoder.decode(emitido.token());

		assertEquals("1", jwt.getSubject());
		assertEquals("Administrador", jwt.getClaimAsString(TokenService.CLAIM_ROL));
		assertEquals("87654321", jwt.getClaimAsString(TokenService.CLAIM_DNI));
		assertEquals(ahora.plus(Duration.ofHours(8)), jwt.getExpiresAt());
		assertEquals(jwt.getExpiresAt(), emitido.expiraEn());
	}

	@Test
	void secretoCortoSeRechazaAlConfigurar() {
		assertThrows(IllegalStateException.class, () -> new JwtProperties("corto", Duration.ofHours(8)));
		assertThrows(IllegalStateException.class, () -> new JwtProperties(null, null));
	}

	@Test
	void expiracionPorDefectoEsOchoHoras() {
		assertEquals(Duration.ofHours(8), new JwtProperties(SECRETO, null).expiracion());
	}

	private Usuario administrador() {
		Rol rol = new Rol();
		rol.setNombreRol("Administrador");
		Usuario usuario = new Usuario();
		usuario.setIdUsuario(1L);
		usuario.setDni("87654321");
		usuario.setRol(rol);
		return usuario;
	}

}
