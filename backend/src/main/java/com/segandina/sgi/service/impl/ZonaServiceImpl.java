package com.segandina.sgi.service.impl;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.segandina.sgi.dao.ZonaDao;
import com.segandina.sgi.dto.request.ZonaFiltro;
import com.segandina.sgi.dto.response.ZonaResponse;
import com.segandina.sgi.service.ZonaService;

@Service
public class ZonaServiceImpl implements ZonaService {

	private static final Sort ORDEN_POR_NOMBRE = Sort.by(Sort.Order.asc("nombreZona").ignoreCase());

	private final ZonaDao zonaDao;

	public ZonaServiceImpl(ZonaDao zonaDao) {
		this.zonaDao = zonaDao;
	}

	@Override
	@Transactional(readOnly = true)
	public Page<ZonaResponse> buscar(ZonaFiltro filtro, int pagina, int tamano) {
		Pageable pageable = PageRequest.of(Math.max(pagina, 0), Math.clamp(tamano, 1, TAMANO_MAXIMO),
				ORDEN_POR_NOMBRE);
		return zonaDao.findAll(ZonaDao.conFiltros(filtro), pageable).map(ZonaResponse::desde);
	}

}
