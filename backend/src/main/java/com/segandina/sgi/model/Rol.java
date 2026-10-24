package com.segandina.sgi.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Rol del sistema (Administrador, Supervisor, Vigilante). Tabla {@code rol}.
 */
@Entity
@Table(name = "rol")
public class Rol {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "id_rol")
	private Short idRol;

	@Column(name = "nombre_rol", nullable = false, unique = true, length = 30)
	private String nombreRol;

	public Short getIdRol() {
		return idRol;
	}

	public void setIdRol(Short idRol) {
		this.idRol = idRol;
	}

	public String getNombreRol() {
		return nombreRol;
	}

	public void setNombreRol(String nombreRol) {
		this.nombreRol = nombreRol;
	}

	@Override
	public boolean equals(Object o) {
		if (this == o) {
			return true;
		}
		return o instanceof Rol otro && idRol != null && idRol.equals(otro.getIdRol());
	}

	@Override
	public int hashCode() {
		return Rol.class.hashCode();
	}

}
