package com.segandina.sgi.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.segandina.sgi.dto.request.Agrupacion;
import com.segandina.sgi.dto.request.IncidenciaFiltro;
import com.segandina.sgi.dto.response.ConteoResponse;
import com.segandina.sgi.dto.response.DespliegueZonaResponse;
import com.segandina.sgi.dto.response.KpisResponse;
import com.segandina.sgi.dto.response.SerieTiempoResponse;
import com.segandina.sgi.service.DashboardService;

/**
 * Endpoints del dashboard gerencial (RF-05) y del despliegue por zona (RF-07). Roles: Administrador y
 * Supervisor.
 * <p>
 * Todos menos {@code /despliegue} aceptan los mismos query params que el historial: {@code periodo},
 * {@code desde}, {@code hasta}, {@code idZona}, {@code idNivelGravedad} e {@code idTipoEvento}; responden 400
 * si el periodo o las fechas no son válidos.
 */
@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

	private final DashboardService dashboardService;

	public DashboardController(DashboardService dashboardService) {
		this.dashboardService = dashboardService;
	}

	/**
	 * Indicadores: incidencias de hoy, del rango y por nivel de gravedad.
	 *
	 * @param filtro filtros tomados de los query params
	 * @return 200 con los indicadores
	 */
	@GetMapping("/kpis")
	public KpisResponse kpis(IncidenciaFiltro filtro) {
		return dashboardService.kpis(filtro);
	}

	/**
	 * Incidencias por zona, para el gráfico de barras.
	 *
	 * @param filtro filtros tomados de los query params
	 * @return 200 con un conteo por zona con incidencias
	 */
	@GetMapping("/incidencias-por-zona")
	public List<ConteoResponse> incidenciasPorZona(IncidenciaFiltro filtro) {
		return dashboardService.incidenciasPorZona(filtro);
	}

	/**
	 * Incidencias por tipo de evento, para el gráfico de anillo.
	 *
	 * @param filtro filtros tomados de los query params
	 * @return 200 con un conteo por tipo con incidencias
	 */
	@GetMapping("/incidencias-por-tipo")
	public List<ConteoResponse> incidenciasPorTipo(IncidenciaFiltro filtro) {
		return dashboardService.incidenciasPorTipo(filtro);
	}

	/**
	 * Serie de incidencias en el tiempo, con los tramos vacíos en 0.
	 *
	 * @param filtro     filtros tomados de los query params
	 * @param agrupacion DIA, SEMANA o MES; sin valor, según el largo del rango (≤31 días DIA, ≤180 SEMANA,
	 *                   si no MES)
	 * @return 200 con la serie; 400 si la agrupación no es válida
	 */
	@GetMapping("/incidencias-por-tiempo")
	public SerieTiempoResponse incidenciasPorTiempo(IncidenciaFiltro filtro,
			@RequestParam(required = false) Agrupacion agrupacion) {
		return dashboardService.incidenciasPorTiempo(filtro, agrupacion);
	}

	/**
	 * Vigilantes activos por zona activa. No usa filtros.
	 *
	 * @return 200 con una fila por zona
	 */
	@GetMapping("/despliegue")
	public List<DespliegueZonaResponse> despliegue() {
		return dashboardService.despliegue();
	}

}
