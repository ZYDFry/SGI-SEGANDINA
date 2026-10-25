package com.segandina.sgi.service.impl;

import static com.segandina.sgi.service.impl.SoporteServicio.actor;
import static com.segandina.sgi.service.impl.SoporteServicio.cambio;

import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.segandina.sgi.dao.TipoEventoDao;
import com.segandina.sgi.dao.UsuarioDao;
import com.segandina.sgi.dto.request.TipoEventoRequest;
import com.segandina.sgi.dto.response.TipoEventoResponse;
import com.segandina.sgi.exception.DatoDuplicadoException;
import com.segandina.sgi.exception.RecursoNoEncontradoException;
import com.segandina.sgi.exception.ReglaNegocioException;
import com.segandina.sgi.model.AccionAuditoria;
import com.segandina.sgi.model.TipoEvento;
import com.segandina.sgi.model.Usuario;
import com.segandina.sgi.service.AuditoriaService;
import com.segandina.sgi.service.IncidenciaService;
import com.segandina.sgi.service.TipoEventoService;

@Service
public class TipoEventoServiceImpl implements TipoEventoService {

	private final TipoEventoDao tipoEventoDao;
	private final UsuarioDao usuarioDao;
	private final AuditoriaService auditoriaService;

	public TipoEventoServiceImpl(TipoEventoDao tipoEventoDao, UsuarioDao usuarioDao,
			AuditoriaService auditoriaService) {
		this.tipoEventoDao = tipoEventoDao;
		this.usuarioDao = usuarioDao;
		this.auditoriaService = auditoriaService;
	}

	@Override
	@Transactional(readOnly = true)
	public List<TipoEventoResponse> listar() {
		return tipoEventoDao.findAllByOrderByNombreTipoEventoAsc().stream().map(TipoEventoResponse::desde).toList();
	}

	@Override
	@Transactional
	public TipoEventoResponse crear(TipoEventoRequest request, Long idActor) {
		Usuario admin = actor(usuarioDao, idActor);
		String nombre = request.nombreTipoEvento().trim();
		if (tipoEventoDao.existsByNombreTipoEventoIgnoreCase(nombre)) {
			throw duplicado(nombre);
		}
		TipoEvento tipo = new TipoEvento();
		tipo.setNombreTipoEvento(nombre);
		tipo.setEstadoActivo(Boolean.TRUE);
		TipoEvento guardado = tipoEventoDao.save(tipo);

		auditoriaService.registrar(AccionAuditoria.CREAR_TIPO_EVENTO, cambio("idTipoEvento",
				guardado.getIdTipoEvento(), null, Map.of("nombreTipoEvento", nombre, "estadoActivo", true)), null,
				admin);
		return TipoEventoResponse.desde(guardado);
	}

	@Override
	@Transactional
	public TipoEventoResponse actualizar(Short idTipoEvento, TipoEventoRequest request, Long idActor) {
		Usuario admin = actor(usuarioDao, idActor);
		TipoEvento tipo = buscarExistente(idTipoEvento);
		String nombre = request.nombreTipoEvento().trim();
		String anterior = tipo.getNombreTipoEvento();
		if (nombre.equals(anterior)) {
			return TipoEventoResponse.desde(tipo);
		}
		if (IncidenciaService.TIPO_OTRO.equalsIgnoreCase(anterior.trim())) {
			throw new ReglaNegocioException("El tipo \"" + IncidenciaService.TIPO_OTRO
					+ "\" no se puede renombrar: la regla de descripción mínima depende de su nombre");
		}
		if (tipoEventoDao.existsByNombreTipoEventoIgnoreCaseAndIdTipoEventoNot(nombre, idTipoEvento)) {
			throw duplicado(nombre);
		}
		tipo.setNombreTipoEvento(nombre);
		auditoriaService.registrar(AccionAuditoria.MODIFICAR_TIPO_EVENTO, cambio("idTipoEvento", idTipoEvento,
				Map.of("nombreTipoEvento", anterior), Map.of("nombreTipoEvento", nombre)), null, admin);
		return TipoEventoResponse.desde(tipo);
	}

	@Override
	@Transactional
	public TipoEventoResponse cambiarEstado(Short idTipoEvento, boolean activo, Long idActor) {
		Usuario admin = actor(usuarioDao, idActor);
		TipoEvento tipo = buscarExistente(idTipoEvento);
		if (tipo.getEstadoActivo() != activo) {
			tipo.setEstadoActivo(activo);
			auditoriaService.registrar(AccionAuditoria.CAMBIAR_ESTADO_TIPO_EVENTO, cambio("idTipoEvento",
					idTipoEvento, Map.of("estadoActivo", !activo), Map.of("estadoActivo", activo)), null, admin);
		}
		return TipoEventoResponse.desde(tipo);
	}

	private TipoEvento buscarExistente(Short idTipoEvento) {
		return tipoEventoDao.findById(idTipoEvento)
				.orElseThrow(() -> new RecursoNoEncontradoException("El tipo de evento no existe"));
	}

	private static DatoDuplicadoException duplicado(String nombre) {
		return new DatoDuplicadoException("Ya existe un tipo de evento con el nombre \"" + nombre + "\"");
	}

}
