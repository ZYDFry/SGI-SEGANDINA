package com.segandina.sgi.service.impl;

import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.segandina.sgi.dao.AuditoriaDao;
import com.segandina.sgi.model.AccionAuditoria;
import com.segandina.sgi.model.Auditoria;
import com.segandina.sgi.model.Usuario;
import com.segandina.sgi.service.AuditoriaService;

@Service
public class AuditoriaServiceImpl implements AuditoriaService {

	private final AuditoriaDao auditoriaDao;

	public AuditoriaServiceImpl(AuditoriaDao auditoriaDao) {
		this.auditoriaDao = auditoriaDao;
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

}
