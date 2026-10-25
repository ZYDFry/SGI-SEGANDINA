package com.segandina.sgi.export;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import org.junit.jupiter.api.Test;

import com.lowagie.text.pdf.PdfReader;
import com.lowagie.text.pdf.parser.PdfTextExtractor;

/**
 * Pruebas del exportador a PDF: se genera el archivo y se extrae su texto con OpenPDF.
 */
class PdfExportadorTest {

	private final PdfExportador exportador = new PdfExportador();

	@Test
	void incluyeTituloPeriodoFechaDeGeneracionYFilas() throws IOException {
		byte[] archivo = exportador.exportar(FilasPrueba.datos(List.of(FilasPrueba.robo())));

		assertEquals("%PDF", new String(Arrays.copyOf(archivo, 4), StandardCharsets.US_ASCII));
		String texto = texto(archivo);
		assertTrue(texto.contains("Reporte de incidencias"), texto);
		assertTrue(texto.contains("Periodo: Últimos 30 días (25/09/2026 al 24/10/2026)"), texto);
		assertTrue(texto.contains("Generado el: 24/10/2026 15:30"), texto);
		assertTrue(texto.contains("Total de incidencias: 1"), texto);
		assertTrue(texto.contains("23/10/2026 22:15"), texto);
		assertTrue(texto.contains("Sede Miraflores"), texto);
		assertTrue(texto.contains("José Núñez Ruiz"), texto);
	}

	@Test
	void sinResultadosGeneraLaTablaSoloConEncabezados() throws IOException {
		byte[] archivo = exportador.exportar(FilasPrueba.datos(List.of()));

		String texto = texto(archivo);
		assertTrue(texto.contains("Total de incidencias: 0"), texto);
		for (String encabezado : ColumnasReporte.ENCABEZADOS) {
			assertTrue(texto.contains(encabezado), "Falta el encabezado " + encabezado + " en: " + texto);
		}
	}

	@Test
	void repiteLosEncabezadosEnCadaPagina() throws IOException {
		byte[] archivo = exportador.exportar(FilasPrueba.datos(Collections.nCopies(80, FilasPrueba.robo())));

		PdfReader lector = new PdfReader(archivo);
		try {
			assertTrue(lector.getNumberOfPages() > 1);
			String segundaPagina = new PdfTextExtractor(lector).getTextFromPage(2);
			assertTrue(segundaPagina.contains("Registrado por"), segundaPagina);
		} finally {
			lector.close();
		}
	}

	private static String texto(byte[] archivo) throws IOException {
		PdfReader lector = new PdfReader(archivo);
		try {
			StringBuilder texto = new StringBuilder();
			PdfTextExtractor extractor = new PdfTextExtractor(lector);
			for (int pagina = 1; pagina <= lector.getNumberOfPages(); pagina++) {
				texto.append(extractor.getTextFromPage(pagina)).append('\n');
			}
			return texto.toString();
		} finally {
			lector.close();
		}
	}

}
