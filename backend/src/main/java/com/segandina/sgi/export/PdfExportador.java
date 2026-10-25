package com.segandina.sgi.export;

import java.awt.Color;
import java.io.ByteArrayOutputStream;

import org.springframework.stereotype.Component;

import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.segandina.sgi.dto.response.IncidenciaHistorialResponse;

/**
 * Exporta el reporte a PDF con OpenPDF: A4 horizontal con título, periodo aplicado, fecha de generación, total
 * de incidencias y una tabla cuyos encabezados se repiten en cada página.
 */
@Component
public class PdfExportador implements ExportadorReporte {

	// Ancho relativo de cada columna, en el orden de ColumnasReporte.ENCABEZADOS
	private static final float[] ANCHOS = { 5, 11, 15, 13, 8, 18, 30 };
	private static final Color FONDO_ENCABEZADO = new Color(220, 226, 235);

	private static final Font TITULO = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16);
	private static final Font NORMAL = FontFactory.getFont(FontFactory.HELVETICA, 10);
	private static final Font ENCABEZADO = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9);
	private static final Font CELDA = FontFactory.getFont(FontFactory.HELVETICA, 8);

	@Override
	public FormatoReporte formato() {
		return FormatoReporte.PDF;
	}

	@Override
	public byte[] exportar(DatosReporte datos) {
		ByteArrayOutputStream salida = new ByteArrayOutputStream();
		Document documento = new Document(PageSize.A4.rotate(), 30, 30, 30, 30);
		try {
			PdfWriter.getInstance(documento, salida);
			documento.open();

			Paragraph titulo = new Paragraph(ColumnasReporte.TITULO, TITULO);
			titulo.setAlignment(Element.ALIGN_CENTER);
			titulo.setSpacingAfter(10);
			documento.add(titulo);
			documento.add(new Paragraph("Periodo: " + ColumnasReporte.periodoAplicado(datos), NORMAL));
			documento.add(new Paragraph("Generado el: " + ColumnasReporte.fechaHora(datos.generadoEn()), NORMAL));
			Paragraph total = new Paragraph("Total de incidencias: " + datos.filas().size(), NORMAL);
			total.setSpacingAfter(10);
			documento.add(total);

			documento.add(tabla(datos));
			documento.close();
		} catch (DocumentException e) {
			throw new IllegalStateException("No se pudo generar el archivo PDF", e);
		}
		return salida.toByteArray();
	}

	private static PdfPTable tabla(DatosReporte datos) {
		PdfPTable tabla = new PdfPTable(ANCHOS);
		tabla.setWidthPercentage(100);
		// OpenPDF no dibuja una tabla que solo tiene filas de encabezado: sin incidencias, el encabezado va como
		// fila normal (no hace falta repetirlo porque cabe en una página)
		tabla.setHeaderRows(datos.filas().isEmpty() ? 0 : 1);
		for (String encabezado : ColumnasReporte.ENCABEZADOS) {
			PdfPCell celda = new PdfPCell(new Phrase(encabezado, ENCABEZADO));
			celda.setBackgroundColor(FONDO_ENCABEZADO);
			celda.setPadding(4);
			tabla.addCell(celda);
		}
		for (IncidenciaHistorialResponse fila : datos.filas()) {
			tabla.addCell(celda(String.valueOf(fila.idIncidencia())));
			tabla.addCell(celda(ColumnasReporte.fechaHora(fila.fechaHora())));
			tabla.addCell(celda(fila.zona().nombreZona()));
			tabla.addCell(celda(fila.tipoEvento().nombreTipoEvento()));
			tabla.addCell(celda(fila.nivelGravedad().nombreNivel()));
			tabla.addCell(celda(ColumnasReporte.registrador(fila)));
			tabla.addCell(celda(fila.descripcion()));
		}
		return tabla;
	}

	private static PdfPCell celda(String texto) {
		PdfPCell celda = new PdfPCell(new Phrase(texto, CELDA));
		celda.setPadding(3);
		return celda;
	}

}
