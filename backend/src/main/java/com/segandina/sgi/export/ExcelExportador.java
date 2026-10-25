package com.segandina.sgi.export;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;

import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.VerticalAlignment;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Component;

import com.segandina.sgi.dto.response.IncidenciaHistorialResponse;

/**
 * Exporta el reporte a Excel ({@code .xlsx}) con Apache POI: una hoja "Incidencias" con la fila de encabezados
 * en negrita, fija y con autofiltro, y una fila por incidencia.
 */
@Component
public class ExcelExportador implements ExportadorReporte {

	/** Nombre de la única hoja del libro. */
	public static final String NOMBRE_HOJA = "Incidencias";

	// Ancho de cada columna en caracteres, en el orden de ColumnasReporte.ENCABEZADOS
	private static final int[] ANCHOS = { 8, 18, 28, 22, 12, 40, 70 };

	@Override
	public FormatoReporte formato() {
		return FormatoReporte.EXCEL;
	}

	@Override
	public byte[] exportar(DatosReporte datos) {
		try (Workbook libro = new XSSFWorkbook(); ByteArrayOutputStream salida = new ByteArrayOutputStream()) {
			Sheet hoja = libro.createSheet(NOMBRE_HOJA);
			escribirEncabezados(libro, hoja);

			CellStyle estiloFecha = libro.createCellStyle();
			estiloFecha.setDataFormat(libro.getCreationHelper().createDataFormat().getFormat("dd/mm/yyyy hh:mm"));
			estiloFecha.setVerticalAlignment(VerticalAlignment.TOP);
			CellStyle estiloTexto = libro.createCellStyle();
			estiloTexto.setVerticalAlignment(VerticalAlignment.TOP);
			CellStyle estiloDescripcion = libro.createCellStyle();
			estiloDescripcion.cloneStyleFrom(estiloTexto);
			estiloDescripcion.setWrapText(true);

			List<IncidenciaHistorialResponse> filas = datos.filas();
			for (int i = 0; i < filas.size(); i++) {
				IncidenciaHistorialResponse fila = filas.get(i);
				Row row = hoja.createRow(i + 1);
				celda(row, 0, estiloTexto).setCellValue(fila.idIncidencia());
				celda(row, 1, estiloFecha).setCellValue(ColumnasReporte.enLima(fila.fechaHora()));
				celda(row, 2, estiloTexto).setCellValue(fila.zona().nombreZona());
				celda(row, 3, estiloTexto).setCellValue(fila.tipoEvento().nombreTipoEvento());
				celda(row, 4, estiloTexto).setCellValue(fila.nivelGravedad().nombreNivel());
				celda(row, 5, estiloTexto).setCellValue(ColumnasReporte.registrador(fila));
				celda(row, 6, estiloDescripcion).setCellValue(fila.descripcion());
			}

			int ultimaColumna = ColumnasReporte.ENCABEZADOS.size() - 1;
			hoja.setAutoFilter(new CellRangeAddress(0, Math.max(filas.size(), 1), 0, ultimaColumna));
			hoja.createFreezePane(0, 1);
			for (int c = 0; c <= ultimaColumna; c++) {
				hoja.setColumnWidth(c, ANCHOS[c] * 256);
			}

			libro.write(salida);
			return salida.toByteArray();
		} catch (IOException e) {
			throw new IllegalStateException("No se pudo generar el archivo Excel", e);
		}
	}

	private static void escribirEncabezados(Workbook libro, Sheet hoja) {
		Font negrita = libro.createFont();
		negrita.setBold(true);
		CellStyle estilo = libro.createCellStyle();
		estilo.setFont(negrita);
		Row encabezados = hoja.createRow(0);
		for (int c = 0; c < ColumnasReporte.ENCABEZADOS.size(); c++) {
			celda(encabezados, c, estilo).setCellValue(ColumnasReporte.ENCABEZADOS.get(c));
		}
	}

	private static Cell celda(Row row, int columna, CellStyle estilo) {
		Cell cell = row.createCell(columna);
		cell.setCellStyle(estilo);
		return cell;
	}

}
