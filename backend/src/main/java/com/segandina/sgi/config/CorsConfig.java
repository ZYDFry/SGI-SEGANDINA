package com.segandina.sgi.config;

import java.util.Arrays;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

/**
 * CORS de la API: solo los orígenes del frontend pueden llamarla desde el navegador.
 * <p>
 * El frontend envía el JWT en el header {@code Authorization}, no en cookies, por lo que no se permiten
 * credenciales. Spring Security toma este bean a través de {@code http.cors(...)} en {@link SecurityConfig}.
 */
@Configuration
public class CorsConfig {

	/**
	 * Reglas CORS para {@code /api/**}.
	 *
	 * @param origenes orígenes permitidos separados por coma (propiedad {@code cors.origenes-permitidos}, variable
	 *                 de entorno {@code CORS_ORIGENES}); p. ej. {@code http://localhost:3000,https://sgi.vercel.app}
	 * @return la fuente de configuración CORS
	 */
	@Bean
	public CorsConfigurationSource corsConfigurationSource(
			@Value("${cors.origenes-permitidos:http://localhost:3000}") String origenes) {
		CorsConfiguration config = new CorsConfiguration();
		config.setAllowedOrigins(Arrays.stream(origenes.split(","))
				.map(String::trim)
				.filter(origen -> !origen.isEmpty())
				.toList());
		config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
		config.setAllowedHeaders(List.of("Authorization", "Content-Type"));
		// Permite al frontend leer el nombre del archivo en las descargas de reportes
		config.setExposedHeaders(List.of("Content-Disposition"));
		config.setAllowCredentials(false);
		config.setMaxAge(3600L);

		UrlBasedCorsConfigurationSource fuente = new UrlBasedCorsConfigurationSource();
		fuente.registerCorsConfiguration("/api/**", config);
		return fuente;
	}

}
