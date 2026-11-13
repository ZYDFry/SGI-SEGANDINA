package com.segandina.sgi.dto.request;

import java.time.LocalDate;

import org.springframework.format.annotation.DateTimeFormat;

import com.segandina.sgi.model.AccionAuditoria;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;

/**
 * Filtros de la consulta de auditoría (RF-08), tomados de los query params. Todos son opcionales y se combinan
 * con AND. El rango de fechas se resuelve con {@link RangoFechas#resolver}, igual que en el historial.
 *
 * @param periodo   periodo predefinido; sin valor, últimos 30 días
 * @param desde     primer día (AAAA-MM-DD), solo con {@link Periodo#PERSONALIZADO}
 * @param hasta     último día (AAAA-MM-DD), solo con {@link Periodo#PERSONALIZADO}
 * @param accion    solo registros de esa acción
 * @param idUsuario solo registros de ese usuario
 * @param q         DNI completo o sus primeros dígitos (vacío = sin filtro); busca en el DNI del usuario y en el
 *                  DNI intentado
 */
public record AuditoriaFiltro(
		Periodo periodo,
		@DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
		@DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
		AccionAuditoria accion,
		@Positive(message = "debe ser un número positivo") Long idUsuario,
		@Pattern(regexp = "[0-9]{0,8}", message = "debe tener solo dígitos, hasta 8") String q) {
}
