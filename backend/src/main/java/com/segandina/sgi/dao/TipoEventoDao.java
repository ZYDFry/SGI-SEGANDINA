package com.segandina.sgi.dao;

import org.springframework.data.jpa.repository.JpaRepository;

import com.segandina.sgi.model.TipoEvento;

/**
 * DAO del catálogo {@code tipo_evento}.
 */
public interface TipoEventoDao extends JpaRepository<TipoEvento, Short> {

}
