package com.segandina.sgi.export;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

import com.segandina.sgi.dto.request.Periodo;
import com.segandina.sgi.dto.request.RangoFechas;
import com.segandina.sgi.dto.response.IncidenciaHistorialResponse;
import com.segandina.sgi.dto.response.NivelGravedadResponse;
import com.segandina.sgi.dto.response.TipoEventoResponse;
import com.segandina.sgi.dto.response.ZonaResponse;

/**
 * Datos de ejemplo para las pruebas de los exportadores.
 */
final class FilasPrueba {

	static final OffsetDateTime GENERADO_EN = OffsetDateTime.parse("2026-10-24T15:30:00-05:00");
	static final RangoFechas RANGO = new RangoFechas(LocalDate.of(2026, 9, 25), LocalDate.of(2026, 10, 24));

	private FilasPrueba() {
	}

	/** Incidencia guardada en UTC; en Lima es el 23/10/2026 a las 22:15. */
	static IncidenciaHistorialResponse robo() {
		return new IncidenciaHistorialResponse(15L, OffsetDateTime.parse("2026-10-24T03:15:00Z"),
				OffsetDateTime.parse("2026-10-24T03:20:00Z"), "Sustracción de celular en la recepción",
				new ZonaResponse(1, "Sede Miraflores", "Lima", "Lima", "Miraflores", null, null, true),
				new TipoEventoResponse((short) 1, "Robo", true),
				new NivelGravedadResponse((short) 3, "Alta", (short) 3, true),
				new IncidenciaHistorialResponse.Registrador(7L, "45678912", "José Núñez Ruiz"));
	}

	static DatosReporte datos(List<IncidenciaHistorialResponse> filas) {
		return new DatosReporte(Periodo.ULTIMOS_30_DIAS, RANGO, GENERADO_EN, filas);
	}

}
