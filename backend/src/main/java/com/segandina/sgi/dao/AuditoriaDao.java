package com.segandina.sgi.dao;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.repository.Repository;

import com.segandina.sgi.model.Auditoria;

/**
 * DAO de la tabla {@code auditoria}, que es solo inserción.
 * <p>
 * Extiende {@link Repository} (no {@code JpaRepository}) para exponer únicamente inserción y consultas:
 * no existen métodos de borrado ni de actualización.
 */
public interface AuditoriaDao extends Repository<Auditoria, Long> {

	/**
	 * Inserta un nuevo registro de auditoría.
	 *
	 * @param auditoria registro nuevo (sin id)
	 * @return el registro guardado, con su id generado
	 */
	Auditoria save(Auditoria auditoria);

	/**
	 * Busca un registro por id.
	 *
	 * @param idAuditoria id del registro
	 * @return el registro, o vacío si no existe
	 */
	Optional<Auditoria> findById(Long idAuditoria);

	/**
	 * Lista registros de auditoría paginados.
	 *
	 * @param pageable página, tamaño y orden
	 * @return página de registros
	 */
	Page<Auditoria> findAll(Pageable pageable);

}
