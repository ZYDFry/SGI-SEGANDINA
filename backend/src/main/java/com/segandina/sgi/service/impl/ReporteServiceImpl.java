package com.segandina.sgi.service.impl;

import java.time.Clock;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.segandina.sgi.config.RelojConfig;
import com.segandina.sgi.dao.IncidenciaDao;
import com.segandina.sgi.dao.UsuarioDao;
import com.segandina.sgi.dto.request.IncidenciaFiltro;
import com.segandina.sgi.dto.request.Periodo;
import com.segandina.sgi.dto.request.RangoFechas;
import com.segandina.sgi.dto.response.ArchivoReporte;
import com.segandina.sgi.dto.response.IncidenciaHistorialResponse;
import com.segandina.sgi.exception.ReglaNegocioException;
import com.segandina.sgi.export.DatosReporte;
import com.segandina.sgi.export.ExportadorReporte;
import com.segandina.sgi.export.FormatoReporte;
import com.segandina.sgi.model.AccionAuditoria;
import com.segandina.sgi.model.Incidencia;
import com.segandina.sgi.model.Usuario;
import com.segandina.sgi.service.AuditoriaService;
import com.segandina.sgi.service.ReporteService;

@Service
public class ReporteServiceImpl implements ReporteService {

	private final IncidenciaDao incidenciaDao;
	private final UsuarioDao usuarioDao;
	private final AuditoriaService auditoriaService;
	private final Clock reloj;
	private final Map<FormatoReporte, ExportadorReporte> exportadores = new EnumMap<>(FormatoReporte.class);

	public ReporteServiceImpl(IncidenciaDao incidenciaDao, UsuarioDao usuarioDao, AuditoriaService auditoriaService,
			Clock reloj, List<ExportadorReporte> exportadores) {
		this.incidenciaDao = incidenciaDao;
		this.usuarioDao = usuarioDao;
		this.auditoriaService = auditoriaService;
		this.reloj = reloj;
		for (ExportadorReporte exportador : exportadores) {
			if (this.exportadores.put(exportador.formato(), exportador) != null) {
				throw new IllegalStateException("Hay más de un exportador para " + exportador.formato());
			}
		}
	}

	@Override
	@Transactional
	public ArchivoReporte exportar(FormatoReporte formato, IncidenciaFiltro filtro, Long idUsuario) {
		ExportadorReporte exportador = exportadores.get(formato);
		if (exportador == null) {
			throw new IllegalStateException("No hay exportador para " + formato);
		}
		Usuario actor = SoporteServicio.actor(usuarioDao, idUsuario);
		RangoFechas rango = RangoFechas.resolver(filtro.periodo(), filtro.desde(), filtro.hasta(), reloj);

		Specification<Incidencia> spec = IncidenciaDao.conFiltros(rango, filtro);
		long total = incidenciaDao.count(spec);
		if (total > MAX_FILAS) {
			throw new ReglaNegocioException("El reporte tendría " + total + " incidencias y el máximo es " + MAX_FILAS
					+ "; acote el periodo o los filtros");
		}
		List<IncidenciaHistorialResponse> filas = incidenciaDao.findAll(spec, IncidenciaDao.ORDEN_HISTORIAL).stream()
				.map(IncidenciaHistorialResponse::desde)
				.toList();

		OffsetDateTime ahora = OffsetDateTime.now(reloj);
		Periodo periodo = filtro.periodo() != null ? filtro.periodo() : RangoFechas.PERIODO_POR_DEFECTO;
		byte[] contenido = exportador.exportar(new DatosReporte(periodo, rango, ahora, filas));

		auditoriaService.registrar(AccionAuditoria.EXPORTAR_REPORTE, detalle(formato, periodo, rango, filtro,
				filas.size()), null, actor);

		LocalDate hoy = ahora.atZoneSameInstant(RelojConfig.ZONA_LIMA).toLocalDate();
		return new ArchivoReporte(PREFIJO_ARCHIVO + hoy + "." + formato.extension(), formato, contenido);
	}

	// LinkedHashMap porque los filtros no enviados se guardan como null y así el JSON conserva el orden
	private static Map<String, Object> detalle(FormatoReporte formato, Periodo periodo, RangoFechas rango,
			IncidenciaFiltro filtro, int totalRegistros) {
		Map<String, Object> detalle = new LinkedHashMap<>();
		detalle.put("formato", formato.name());
		detalle.put("periodo", periodo.name());
		detalle.put("desde", rango.desde().toString());
		detalle.put("hasta", rango.hasta().toString());
		detalle.put("idZona", filtro.idZona());
		detalle.put("idNivelGravedad", filtro.idNivelGravedad());
		detalle.put("idTipoEvento", filtro.idTipoEvento());
		detalle.put("totalRegistros", totalRegistros);
		return detalle;
	}

}
