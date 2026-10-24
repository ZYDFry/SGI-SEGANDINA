package com.segandina.sgi.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Catálogo de niveles de gravedad (Baja, Media, Alta, Crítica). Tabla {@code nivel_gravedad}.
 * El campo {@code orden} permite ordenar de menos grave (1) a más grave.
 */
@Entity
@Table(name = "nivel_gravedad")
public class NivelGravedad {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "id_nivel_gravedad")
	private Short idNivelGravedad;

	@Column(name = "nombre_nivel", nullable = false, unique = true, length = 20)
	private String nombreNivel;

	@Column(name = "orden", nullable = false, unique = true)
	private Short orden;

	public Short getIdNivelGravedad() {
		return idNivelGravedad;
	}

	public void setIdNivelGravedad(Short idNivelGravedad) {
		this.idNivelGravedad = idNivelGravedad;
	}

	public String getNombreNivel() {
		return nombreNivel;
	}

	public void setNombreNivel(String nombreNivel) {
		this.nombreNivel = nombreNivel;
	}

	public Short getOrden() {
		return orden;
	}

	public void setOrden(Short orden) {
		this.orden = orden;
	}

	@Override
	public boolean equals(Object o) {
		if (this == o) {
			return true;
		}
		return o instanceof NivelGravedad otro && idNivelGravedad != null
				&& idNivelGravedad.equals(otro.getIdNivelGravedad());
	}

	@Override
	public int hashCode() {
		return NivelGravedad.class.hashCode();
	}

}
