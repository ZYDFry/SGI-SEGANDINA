package com.segandina.sgi.config;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Configuración de incidencias (prefijo {@code incidencias} en {@code application.properties}).
 *
 * @param plazoEdicion tiempo, contado desde {@code fecha_registro}, durante el cual el autor puede corregir su
 *                     incidencia; por defecto 15 minutos
 */
@ConfigurationProperties("incidencias")
public record IncidenciaProperties(Duration plazoEdicion) {

	/** Plazo usado cuando la propiedad no está definida. */
	public static final Duration PLAZO_POR_DEFECTO = Duration.ofMinutes(15);

	public IncidenciaProperties {
		if (plazoEdicion == null) {
			plazoEdicion = PLAZO_POR_DEFECTO;
		}
		if (plazoEdicion.isNegative() || plazoEdicion.isZero()) {
			throw new IllegalStateException("incidencias.plazo-edicion debe ser mayor que cero");
		}
	}

}
