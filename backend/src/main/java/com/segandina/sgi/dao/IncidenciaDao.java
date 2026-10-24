package com.segandina.sgi.dao;

import org.springframework.data.jpa.repository.JpaRepository;

import com.segandina.sgi.model.Incidencia;

/**
 * DAO de la tabla {@code incidencia}.
 */
public interface IncidenciaDao extends JpaRepository<Incidencia, Long> {

}
