package com.segandina.sgi.service.impl;

import java.time.Clock;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.segandina.sgi.dao.AuditoriaDao;
import com.segandina.sgi.dto.request.AuditoriaFiltro;
import com.segandina.sgi.dto.request.RangoFechas;
import com.segandina.sgi.dto.response.AccionAuditoriaResponse;
import com.segandina.sgi.dto.response.AuditoriaResponse;
import com.segandina.sgi.exception.ParametroInvalidoException;
import com.segandina.sgi.model.AccionAuditoria;
import com.segandina.sgi.model.Auditoria;
import com.segandina.sgi.model.Usuario;
import com.segandina.sgi.service.AuditoriaService;

@Service
public class AuditoriaServiceImpl implements AuditoriaService {

	private final AuditoriaDao auditoriaDao;
	private final Clock reloj;

	public AuditoriaServiceImpl(AuditoriaDao auditoriaDao, Clock reloj) {
		this.auditoriaDao = auditoriaDao;
		this.reloj = reloj;
	}

	@Override
	@Transactional
	public void registrar(AccionAuditoria accion, Map<String, Object> detalle, String dniIntentado,
			Usuario usuario) {
		auditoriaDao.save(new Auditoria(accion.name(), detalle, dniIntentado, usuario));
	}

	@Override
	@Transactional(propagation = Propagation.REQUIRES_NEW)
	public void registrarLoginFallido(String dniIntentado, Usuario usuario, String motivo) {
		auditoriaDao.save(new Auditoria(AccionAuditoria.LOGIN_FALLIDO.name(), Map.of("motivo", motivo),
				dniIntentado, usuario));
	}

	@Override
	@Transactional(readOnly = true)
	public Page<AuditoriaResponse> buscar(AuditoriaFiltro filtro, int pagina, int tamano) {
		// El controller ya valida page y size; se repite aquí para que el servicio no dependa de él
		if (pagina < 0) {
			throw new ParametroInvalidoException("page", "debe ser mayor o igual que 0");
		}
		if (tamano < 1 || tamano > TAMANO_MAXIMO) {
			throw new ParametroInvalidoException("size", "debe estar entre 1 y " + TAMANO_MAXIMO);
		}
		RangoFechas rango = RangoFechas.resolver(filtro.periodo(), filtro.desde(), filtro.hasta(), reloj);
		return auditoriaDao.findAll(AuditoriaDao.conFiltros(rango, filtro),
				PageRequest.of(pagina, tamano, AuditoriaDao.ORDEN_AUDITORIA))
				.map(AuditoriaResponse::desde);
	}

	@Override
	public List<AccionAuditoriaResponse> acciones() {
		return Arrays.stream(AccionAuditoria.values()).map(AccionAuditoriaResponse::desde).toList();
	}

}
