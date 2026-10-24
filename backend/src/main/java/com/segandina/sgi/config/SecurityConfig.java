package com.segandina.sgi.config;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.web.SecurityFilterChain;

import com.segandina.sgi.exception.ErrorRespuesta;
import com.segandina.sgi.service.TokenService;

import jakarta.servlet.http.HttpServletResponse;
import tools.jackson.databind.json.JsonMapper;

/**
 * Seguridad de la API: sin sesión, JWT HS256 validado por el resource server de Spring Security y
 * autorización por rol.
 * <p>
 * El rol viaja en el claim {@code rol} del token y se convierte en la autoridad {@code ROLE_<rol>}
 * (p. ej. {@code ROLE_Administrador}), por lo que las reglas usan {@code hasRole("Administrador")}.
 */
@Configuration
@EnableMethodSecurity
@EnableConfigurationProperties(JwtProperties.class)
public class SecurityConfig {

	static final String ADMINISTRADOR = "Administrador";
	static final String SUPERVISOR = "Supervisor";
	static final String VIGILANTE = "Vigilante";

	/**
	 * Cadena de filtros: login público, el resto de {@code /api/**} con token y reglas por rol.
	 *
	 * @param http       configurador de Spring Security
	 * @param jsonMapper serializador para las respuestas 401/403
	 * @return la cadena de filtros
	 * @throws Exception si la configuración es inválida
	 */
	@Bean
	public SecurityFilterChain securityFilterChain(HttpSecurity http, JsonMapper jsonMapper) throws Exception {
		http
				.csrf(AbstractHttpConfigurer::disable)
				.httpBasic(AbstractHttpConfigurer::disable)
				.formLogin(AbstractHttpConfigurer::disable)
				.sessionManagement(sesion -> sesion.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
				.authorizeHttpRequests(auth -> auth
						.requestMatchers(HttpMethod.POST, "/api/auth/login").permitAll()
						.requestMatchers("/api/usuarios/**", "/api/auditoria/**").hasRole(ADMINISTRADOR)
						.requestMatchers("/api/dashboard/**", "/api/reportes/**").hasAnyRole(ADMINISTRADOR, SUPERVISOR)
						.requestMatchers(HttpMethod.POST, "/api/incidencias").hasAnyRole(ADMINISTRADOR, VIGILANTE)
						.requestMatchers(HttpMethod.GET, "/api/incidencias/**").hasAnyRole(ADMINISTRADOR, SUPERVISOR)
						.requestMatchers("/error").permitAll()
						.anyRequest().authenticated())
				.oauth2ResourceServer(oauth2 -> oauth2
						.jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter()))
						.authenticationEntryPoint((request, response, ex) -> escribirError(response, jsonMapper,
								HttpStatus.UNAUTHORIZED, "Debe iniciar sesión o el token no es válido")))
				.exceptionHandling(errores -> errores
						.authenticationEntryPoint((request, response, ex) -> escribirError(response, jsonMapper,
								HttpStatus.UNAUTHORIZED, "Debe iniciar sesión o el token no es válido"))
						.accessDeniedHandler((request, response, ex) -> escribirError(response, jsonMapper,
								HttpStatus.FORBIDDEN, "No tiene permisos para esta operación")));
		return http.build();
	}

	/** Contraseñas con BCrypt (el hash se guarda en {@code usuario.contrasena}). */
	@Bean
	public PasswordEncoder passwordEncoder() {
		return new BCryptPasswordEncoder();
	}

	/** Firma de tokens con la clave de {@code JWT_SECRET}. */
	@Bean
	public JwtEncoder jwtEncoder(JwtProperties jwtProperties) {
		return NimbusJwtEncoder.withSecretKey(claveSecreta(jwtProperties)).algorithm(MacAlgorithm.HS256).build();
	}

	/** Validación de firma y expiración de los tokens recibidos. */
	@Bean
	public JwtDecoder jwtDecoder(JwtProperties jwtProperties) {
		return NimbusJwtDecoder.withSecretKey(claveSecreta(jwtProperties)).macAlgorithm(MacAlgorithm.HS256).build();
	}

	private static JwtAuthenticationConverter jwtAuthenticationConverter() {
		JwtGrantedAuthoritiesConverter roles = new JwtGrantedAuthoritiesConverter();
		roles.setAuthoritiesClaimName(TokenService.CLAIM_ROL);
		roles.setAuthorityPrefix("ROLE_");
		JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
		converter.setJwtGrantedAuthoritiesConverter(roles);
		return converter;
	}

	private static SecretKey claveSecreta(JwtProperties jwtProperties) {
		return new SecretKeySpec(jwtProperties.secreto().getBytes(StandardCharsets.UTF_8), "HmacSHA256");
	}

	private static void escribirError(HttpServletResponse response, JsonMapper jsonMapper, HttpStatus status,
			String mensaje) throws IOException {
		response.setStatus(status.value());
		response.setContentType(MediaType.APPLICATION_JSON_VALUE);
		response.setCharacterEncoding(StandardCharsets.UTF_8.name());
		jsonMapper.writeValue(response.getOutputStream(), ErrorRespuesta.de(status.value(), mensaje, List.of()));
	}

}
