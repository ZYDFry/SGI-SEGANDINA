package com.segandina.sgi.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Catálogo de tipos de evento (Robo, Accidente, Alerta, Otro). Tabla {@code tipo_evento}.
 */
@Entity
@Table(name = "tipo_evento")
public class TipoEvento {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "id_tipo_evento")
	private Short idTipoEvento;

	@Column(name = "nombre_tipo_evento", nullable = false, unique = true, length = 30)
	private String nombreTipoEvento;

	public Short getIdTipoEvento() {
		return idTipoEvento;
	}

	public void setIdTipoEvento(Short idTipoEvento) {
		this.idTipoEvento = idTipoEvento;
	}

	public String getNombreTipoEvento() {
		return nombreTipoEvento;
	}

	public void setNombreTipoEvento(String nombreTipoEvento) {
		this.nombreTipoEvento = nombreTipoEvento;
	}

	@Override
	public boolean equals(Object o) {
		if (this == o) {
			return true;
		}
		return o instanceof TipoEvento otro && idTipoEvento != null && idTipoEvento.equals(otro.getIdTipoEvento());
	}

	@Override
	public int hashCode() {
		return TipoEvento.class.hashCode();
	}

}
