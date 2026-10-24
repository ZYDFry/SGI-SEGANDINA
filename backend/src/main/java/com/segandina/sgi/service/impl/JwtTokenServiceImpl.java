package com.segandina.sgi.service.impl;

import java.time.Clock;
import java.time.Instant;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

import com.segandina.sgi.config.JwtProperties;
import com.segandina.sgi.model.Usuario;
import com.segandina.sgi.service.TokenService;

/**
 * Emite JWT firmados con HS256 usando el {@link JwtEncoder} configurado en {@code SecurityConfig}.
 */
@Service
public class JwtTokenServiceImpl implements TokenService {

	/** Emisor que se escribe en el claim {@code iss}. */
	static final String EMISOR = "sgi-segandina";

	private final JwtEncoder jwtEncoder;
	private final JwtProperties jwtProperties;
	private final Clock reloj;

	@Autowired
	public JwtTokenServiceImpl(JwtEncoder jwtEncoder, JwtProperties jwtProperties) {
		this(jwtEncoder, jwtProperties, Clock.systemUTC());
	}

	JwtTokenServiceImpl(JwtEncoder jwtEncoder, JwtProperties jwtProperties, Clock reloj) {
		this.jwtEncoder = jwtEncoder;
		this.jwtProperties = jwtProperties;
		this.reloj = reloj;
	}

	@Override
	public TokenEmitido generarToken(Usuario usuario) {
		Instant ahora = reloj.instant();
		Instant expiraEn = ahora.plus(jwtProperties.expiracion());
		JwtClaimsSet claims = JwtClaimsSet.builder()
				.issuer(EMISOR)
				.subject(String.valueOf(usuario.getIdUsuario()))
				.issuedAt(ahora)
				.expiresAt(expiraEn)
				.claim(CLAIM_ROL, usuario.getRol().getNombreRol())
				.claim(CLAIM_DNI, usuario.getDni())
				.build();
		JwsHeader cabecera = JwsHeader.with(MacAlgorithm.HS256).build();
		String token = jwtEncoder.encode(JwtEncoderParameters.from(cabecera, claims)).getTokenValue();
		return new TokenEmitido(token, expiraEn);
	}

}
