package com.segandina.sgi.config;

import java.time.Clock;
import java.time.ZoneId;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Reloj de la aplicación. Se inyecta en los servicios en lugar de llamar a {@code now()} directamente, para
 * que los tests puedan fijar la hora. También habilita los plazos de incidencias ({@link IncidenciaProperties}).
 */
@Configuration
@EnableConfigurationProperties(IncidenciaProperties.class)
public class RelojConfig {

	/** Zona horaria de operación de la empresa. */
	public static final ZoneId ZONA_LIMA = ZoneId.of("America/Lima");

	/** Reloj del sistema en hora de Lima. */
	@Bean
	public Clock reloj() {
		return Clock.system(ZONA_LIMA);
	}

}
