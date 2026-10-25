package com.segandina.sgi.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Cuerpo de {@code POST /api/zonas} y {@code PUT /api/zonas/{id}} (RF-09).
 *
 * @param nombreZona   nombre único de la zona
 * @param departamento departamento
 * @param provincia    provincia
 * @param distrito     distrito
 * @param referencia   dirección o punto de referencia; opcional
 * @param descripcion  descripción libre; opcional
 */
public record ZonaRequest(
		@NotBlank(message = "es obligatorio")
		@Size(max = 80, message = "no debe superar los 80 caracteres") String nombreZona,
		@NotBlank(message = "es obligatorio")
		@Size(max = 50, message = "no debe superar los 50 caracteres") String departamento,
		@NotBlank(message = "es obligatoria")
		@Size(max = 50, message = "no debe superar los 50 caracteres") String provincia,
		@NotBlank(message = "es obligatorio")
		@Size(max = 80, message = "no debe superar los 80 caracteres") String distrito,
		@Size(max = 150, message = "no debe superar los 150 caracteres") String referencia,
		@Size(max = 2000, message = "no debe superar los 2000 caracteres") String descripcion) {
}
