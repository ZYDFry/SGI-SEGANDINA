package com.segandina.sgi.service.impl;

import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.segandina.sgi.dao.IncidenciaDao;
import com.segandina.sgi.dao.NivelGravedadDao;
import com.segandina.sgi.dao.TipoEventoDao;
import com.segandina.sgi.dao.UsuarioDao;
import com.segandina.sgi.dao.ZonaDao;
import com.segandina.sgi.dto.request.IncidenciaFiltro;
import com.segandina.sgi.dto.request.IncidenciaRequest;
import com.segandina.sgi.dto.request.RangoFechas;
import com.segandina.sgi.dto.response.IncidenciaHistorialResponse;
import com.segandina.sgi.dto.response.IncidenciaResponse;
import com.segandina.sgi.exception.CredencialesInvalidasException;
import com.segandina.sgi.exception.ReglaNegocioException;
import com.segandina.sgi.model.AccionAuditoria;
import com.segandina.sgi.model.Incidencia;
import com.segandina.sgi.model.NivelGravedad;
import com.segandina.sgi.model.TipoEvento;
import com.segandina.sgi.model.Usuario;
import com.segandina.sgi.model.Zona;
import com.segandina.sgi.service.AuditoriaService;
import com.segandina.sgi.service.IncidenciaService;

@Service
public class IncidenciaServiceImpl implements IncidenciaService {

	// Más reciente primero; el id desempata incidencias con la misma fecha para que la paginación sea estable
	private static final Sort ORDEN_HISTORIAL = Sort.by(Sort.Order.desc("fechaHora"), Sort.Order.desc("idIncidencia"));

	private final IncidenciaDao incidenciaDao;
	private final UsuarioDao usuarioDao;
	private final ZonaDao zonaDao;
	private final TipoEventoDao tipoEventoDao;
	private final NivelGravedadDao nivelGravedadDao;
	private final AuditoriaService auditoriaService;
	private final Clock reloj;

	public IncidenciaServiceImpl(IncidenciaDao incidenciaDao, UsuarioDao usuarioDao, ZonaDao zonaDao,
			TipoEventoDao tipoEventoDao, NivelGravedadDao nivelGravedadDao, AuditoriaService auditoriaService,
			Clock reloj) {
		this.incidenciaDao = incidenciaDao;
		this.usuarioDao = usuarioDao;
		this.zonaDao = zonaDao;
		this.tipoEventoDao = tipoEventoDao;
		this.nivelGravedadDao = nivelGravedadDao;
		this.auditoriaService = auditoriaService;
		this.reloj = reloj;
	}

	@Override
	@Transactional
	public IncidenciaResponse registrar(IncidenciaRequest request, Long idUsuario) {
		Usuario usuario = usuarioDao.findById(idUsuario)
				.filter(u -> Boolean.TRUE.equals(u.getEstadoActivo()))
				.orElseThrow(CredencialesInvalidasException::new);

		Zona zona = activo(zonaDao.findById(request.idZona()), Zona::getEstadoActivo,
				"La zona seleccionada no existe o está inactiva");
		TipoEvento tipo = activo(tipoEventoDao.findById(request.idTipoEvento()), TipoEvento::getEstadoActivo,
				"El tipo de evento seleccionado no existe o está inactivo");
		NivelGravedad nivel = activo(nivelGravedadDao.findById(request.idNivelGravedad()),
				NivelGravedad::getEstadoActivo, "El nivel de gravedad seleccionado no existe o está inactivo");

		String descripcion = request.descripcion().trim();
		if (TIPO_OTRO.equalsIgnoreCase(tipo.getNombreTipoEvento().trim())
				&& descripcion.length() < MIN_DESCRIPCION_OTRO) {
			throw new ReglaNegocioException("Para el tipo \"" + TIPO_OTRO + "\" la descripción debe tener al menos "
					+ MIN_DESCRIPCION_OTRO + " caracteres");
		}

		OffsetDateTime ahora = OffsetDateTime.now(reloj);
		OffsetDateTime fechaHora = request.fechaHora() != null ? request.fechaHora() : ahora;
		if (fechaHora.isAfter(ahora.plus(TOLERANCIA_RELOJ))) {
			throw new ReglaNegocioException("La fecha y hora de la incidencia no puede ser futura");
		}

		Incidencia incidencia = new Incidencia();
		incidencia.setZona(zona);
		incidencia.setTipoEvento(tipo);
		incidencia.setNivelGravedad(nivel);
		incidencia.setDescripcion(descripcion);
		incidencia.setFechaHora(fechaHora);
		incidencia.setUsuario(usuario);
		Incidencia guardada = incidenciaDao.save(incidencia);

		auditoriaService.registrar(AccionAuditoria.REGISTRAR_INCIDENCIA, Map.of(
				"idIncidencia", guardada.getIdIncidencia(),
				"idZona", zona.getIdZona(),
				"idTipoEvento", tipo.getIdTipoEvento(),
				"idNivelGravedad", nivel.getIdNivelGravedad()), null, usuario);

		return IncidenciaResponse.desde(guardada);
	}

	@Override
	@Transactional(readOnly = true)
	public Page<IncidenciaHistorialResponse> buscar(IncidenciaFiltro filtro, int pagina, int tamano) {
		RangoFechas rango = RangoFechas.resolver(filtro.periodo(), filtro.desde(), filtro.hasta(), reloj);
		Pageable pageable = PageRequest.of(Math.max(pagina, 0), Math.clamp(tamano, 1, TAMANO_MAXIMO),
				ORDEN_HISTORIAL);
		return incidenciaDao.findAll(IncidenciaDao.conFiltros(rango, filtro), pageable)
				.map(IncidenciaHistorialResponse::desde);
	}

	// Devuelve el registro del catálogo si existe y está activo; si no, rechaza con el mensaje indicado
	private static <T> T activo(Optional<T> registro, Function<T, Boolean> estadoActivo, String mensaje) {
		return registro.filter(r -> Boolean.TRUE.equals(estadoActivo.apply(r)))
				.orElseThrow(() -> new ReglaNegocioException(mensaje));
	}

}
