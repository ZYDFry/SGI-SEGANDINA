package com.segandina.sgi.model;

import java.time.OffsetDateTime;
import java.util.Map;

import org.hibernate.annotations.Immutable;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/**
 * Registro de auditoría (RF-08). Tabla {@code auditoria}, solo inserción.
 * <p>
 * Es inmutable: no tiene setters y Hibernate nunca emite UPDATE sobre ella ({@link Immutable}).
 * La BD además bloquea UPDATE/DELETE/TRUNCATE con triggers y el rol {@code app_sgi} no tiene esos permisos.
 * {@code fechaHora} la asigna la BD ({@code DEFAULT now()}).
 */
@Entity
@Immutable
@Table(name = "auditoria")
public class Auditoria {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "id_auditoria")
	private Long idAuditoria;

	@Column(name = "accion_realizada", nullable = false, length = 60)
	private String accionRealizada;

	@JdbcTypeCode(SqlTypes.JSON)
	@Column(name = "detalle_cambio", columnDefinition = "jsonb")
	private Map<String, Object> detalleCambio;

	@Column(name = "fecha_hora", nullable = false, insertable = false, updatable = false)
	private OffsetDateTime fechaHora;

	@Column(name = "dni_intentado", length = 8, columnDefinition = "char(8)")
	private String dniIntentado;

	/** Usuario que realizó la acción; nulo si no existe (p. ej. login con DNI desconocido). */
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "id_usuario")
	private Usuario usuario;

	/** Constructor requerido por JPA. */
	protected Auditoria() {
	}

	/**
	 * Crea un registro de auditoría listo para insertarse.
	 *
	 * @param accionRealizada código de la acción (máx. 60 caracteres), p. ej. {@code LOGIN_EXITOSO}
	 * @param detalleCambio   datos adicionales que se guardan como JSONB; puede ser {@code null}
	 * @param dniIntentado    DNI usado en un intento de login; {@code null} si no aplica
	 * @param usuario         usuario que realizó la acción; {@code null} si no se identificó
	 */
	public Auditoria(String accionRealizada, Map<String, Object> detalleCambio, String dniIntentado,
			Usuario usuario) {
		this.accionRealizada = accionRealizada;
		this.detalleCambio = detalleCambio;
		this.dniIntentado = dniIntentado;
		this.usuario = usuario;
	}

	public Long getIdAuditoria() {
		return idAuditoria;
	}

	public String getAccionRealizada() {
		return accionRealizada;
	}

	public Map<String, Object> getDetalleCambio() {
		return detalleCambio;
	}

	public OffsetDateTime getFechaHora() {
		return fechaHora;
	}

	public String getDniIntentado() {
		return dniIntentado;
	}

	public Usuario getUsuario() {
		return usuario;
	}

	@Override
	public boolean equals(Object o) {
		if (this == o) {
			return true;
		}
		return o instanceof Auditoria otra && idAuditoria != null && idAuditoria.equals(otra.getIdAuditoria());
	}

	@Override
	public int hashCode() {
		return Auditoria.class.hashCode();
	}

}
