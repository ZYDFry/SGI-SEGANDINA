package com.segandina.sgi.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Cuerpo de {@code PUT /api/niveles-gravedad/{id}} (RF-09).
 *
 * @param nombreNivel nombre único del nivel
 * @param orden       posición en la escala (1 = menos grave); si la tiene otro nivel, se intercambian
 */
public record NivelGravedadRequest(
		@NotBlank(message = "es obligatorio")
		@Size(max = 20, message = "no debe superar los 20 caracteres") String nombreNivel,
		@NotNull(message = "es obligatorio")
		@Min(value = 1, message = "debe ser mayor o igual a 1")
		@Max(value = Short.MAX_VALUE, message = "es demasiado grande") Short orden) {
}
