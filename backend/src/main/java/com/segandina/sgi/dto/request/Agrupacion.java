package com.segandina.sgi.dto.request;

/**
 * Tamaño de cada tramo de la serie de incidencias por tiempo (RF-05). Las semanas empiezan el lunes.
 */
public enum Agrupacion {

	DIA,
	SEMANA,
	MES;

	/** Rango máximo, en días, que se agrupa por día cuando no se pide agrupación. */
	public static final int MAX_DIAS_POR_DIA = 31;

	/** Rango máximo, en días, que se agrupa por semana cuando no se pide agrupación. */
	public static final int MAX_DIAS_POR_SEMANA = 180;

	/**
	 * Agrupación por defecto según el largo del rango: por día hasta 31 días, por semana hasta 180 y por
	 * mes si es mayor.
	 *
	 * @param rango rango consultado
	 * @return la agrupación sugerida
	 */
	public static Agrupacion porDefecto(RangoFechas rango) {
		long dias = rango.dias();
		if (dias <= MAX_DIAS_POR_DIA) {
			return DIA;
		}
		return dias <= MAX_DIAS_POR_SEMANA ? SEMANA : MES;
	}

}
