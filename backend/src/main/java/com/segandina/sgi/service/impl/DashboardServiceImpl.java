package com.segandina.sgi.service.impl;

import java.time.Clock;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.segandina.sgi.dao.ConteoAgrupado;
import com.segandina.sgi.dao.ConteoDiario;
import com.segandina.sgi.dao.DespliegueZonaDao;
import com.segandina.sgi.dao.IncidenciaDao;
import com.segandina.sgi.dao.NivelGravedadDao;
import com.segandina.sgi.dto.request.Agrupacion;
import com.segandina.sgi.dto.request.IncidenciaFiltro;
import com.segandina.sgi.dto.request.Periodo;
import com.segandina.sgi.dto.request.RangoFechas;
import com.segandina.sgi.dto.response.ConteoResponse;
import com.segandina.sgi.dto.response.DespliegueZonaResponse;
import com.segandina.sgi.dto.response.KpisResponse;
import com.segandina.sgi.dto.response.SerieTiempoResponse;
import com.segandina.sgi.model.NivelGravedad;
import com.segandina.sgi.service.DashboardService;

@Service
public class DashboardServiceImpl implements DashboardService {

	private static final Sort ORDEN_GRAVEDAD = Sort.by("orden");
	private static final Sort ORDEN_ZONA = Sort.by(Sort.Order.asc("nombreZona").ignoreCase());

	private final IncidenciaDao incidenciaDao;
	private final NivelGravedadDao nivelGravedadDao;
	private final DespliegueZonaDao despliegueZonaDao;
	private final Clock reloj;

	public DashboardServiceImpl(IncidenciaDao incidenciaDao, NivelGravedadDao nivelGravedadDao,
			DespliegueZonaDao despliegueZonaDao, Clock reloj) {
		this.incidenciaDao = incidenciaDao;
		this.nivelGravedadDao = nivelGravedadDao;
		this.despliegueZonaDao = despliegueZonaDao;
		this.reloj = reloj;
	}

	@Override
	@Transactional(readOnly = true)
	public KpisResponse kpis(IncidenciaFiltro filtro) {
		RangoFechas rango = rango(filtro);
		RangoFechas hoy = RangoFechas.resolver(Periodo.HOY, null, null, reloj);
		long incidenciasHoy = incidenciaDao.count(IncidenciaDao.conFiltros(hoy, filtro));
		long incidenciasPeriodo = incidenciaDao.count(IncidenciaDao.conFiltros(rango, filtro));

		Map<Long, Long> porNivel = incidenciaDao.contarPorNivel(rango, filtro).stream()
				.collect(Collectors.toMap(ConteoAgrupado::id, ConteoAgrupado::total));
		List<KpisResponse.ConteoGravedad> porGravedad = new ArrayList<>();
		for (NivelGravedad nivel : nivelGravedadDao.findAll(ORDEN_GRAVEDAD)) {
			long total = porNivel.getOrDefault(nivel.getIdNivelGravedad().longValue(), 0L);
			if (Boolean.TRUE.equals(nivel.getEstadoActivo()) || total > 0) {
				porGravedad.add(new KpisResponse.ConteoGravedad(nivel.getIdNivelGravedad(), nivel.getNombreNivel(),
						nivel.getOrden(), total));
			}
		}
		return new KpisResponse(rango.desde(), rango.hasta(), incidenciasHoy, incidenciasPeriodo, porGravedad);
	}

	@Override
	@Transactional(readOnly = true)
	public List<ConteoResponse> incidenciasPorZona(IncidenciaFiltro filtro) {
		return incidenciaDao.contarPorZona(rango(filtro), filtro).stream().map(ConteoResponse::desde).toList();
	}

	@Override
	@Transactional(readOnly = true)
	public List<ConteoResponse> incidenciasPorTipo(IncidenciaFiltro filtro) {
		return incidenciaDao.contarPorTipo(rango(filtro), filtro).stream().map(ConteoResponse::desde).toList();
	}

	@Override
	@Transactional(readOnly = true)
	public SerieTiempoResponse incidenciasPorTiempo(IncidenciaFiltro filtro, Agrupacion agrupacion) {
		RangoFechas rango = rango(filtro);
		Agrupacion usada = agrupacion != null ? agrupacion : Agrupacion.porDefecto(rango);
		Map<LocalDate, Long> porDia = incidenciaDao.contarPorDia(rango, filtro).stream()
				.collect(Collectors.toMap(ConteoDiario::dia, ConteoDiario::total, Long::sum));

		List<SerieTiempoResponse.Punto> puntos = new ArrayList<>();
		LocalDate inicio = rango.desde();
		while (!inicio.isAfter(rango.hasta())) {
			LocalDate fin = finDeTramo(inicio, usada);
			if (fin.isAfter(rango.hasta())) {
				fin = rango.hasta();
			}
			long total = 0;
			for (LocalDate dia = inicio; !dia.isAfter(fin); dia = dia.plusDays(1)) {
				total += porDia.getOrDefault(dia, 0L);
			}
			puntos.add(new SerieTiempoResponse.Punto(inicio, fin, total));
			inicio = fin.plusDays(1);
		}
		return new SerieTiempoResponse(usada, rango.desde(), rango.hasta(), puntos);
	}

	@Override
	@Transactional(readOnly = true)
	public List<DespliegueZonaResponse> despliegue() {
		return despliegueZonaDao.findAll(ORDEN_ZONA).stream().map(DespliegueZonaResponse::desde).toList();
	}

	private RangoFechas rango(IncidenciaFiltro filtro) {
		return RangoFechas.resolver(filtro.periodo(), filtro.desde(), filtro.hasta(), reloj);
	}

	// Último día del tramo que empieza en "dia": el mismo día, el domingo de su semana o el último día de su mes
	private static LocalDate finDeTramo(LocalDate dia, Agrupacion agrupacion) {
		return switch (agrupacion) {
			case DIA -> dia;
			case SEMANA -> dia.with(TemporalAdjusters.nextOrSame(DayOfWeek.SUNDAY));
			case MES -> dia.with(TemporalAdjusters.lastDayOfMonth());
		};
	}

}
