package com.segandina.sgi.export;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;

import com.segandina.sgi.dto.response.IncidenciaHistorialResponse;

/**
 * Pruebas del exportador a Excel: se genera el archivo y se vuelve a abrir con POI para revisar su contenido.
 */
class ExcelExportadorTest {

	private final ExcelExportador exportador = new ExcelExportador();

	@Test
	void generaEncabezadosYUnaFilaPorIncidencia() throws IOException {
		byte[] archivo = exportador.exportar(FilasPrueba.datos(List.of(FilasPrueba.robo())));

		try (Workbook libro = new XSSFWorkbook(new ByteArrayInputStream(archivo))) {
			Sheet hoja = libro.getSheet(ExcelExportador.NOMBRE_HOJA);
			assertNotNull(hoja);
			assertEquals(ColumnasReporte.ENCABEZADOS, textos(hoja.getRow(0)));
			assertEquals(1, hoja.getLastRowNum());

			Row fila = hoja.getRow(1);
			assertEquals(15, fila.getCell(0).getNumericCellValue());
			// La fecha se guarda como fecha de Excel en hora de Lima
			assertEquals(LocalDateTime.of(2026, 10, 23, 22, 15), fila.getCell(1).getLocalDateTimeCellValue());
			assertEquals("Sede Miraflores", fila.getCell(2).getStringCellValue());
			assertEquals("Robo", fila.getCell(3).getStringCellValue());
			assertEquals("Alta", fila.getCell(4).getStringCellValue());
			assertEquals("45678912 - José Núñez Ruiz", fila.getCell(5).getStringCellValue());
			assertEquals("Sustracción de celular en la recepción", fila.getCell(6).getStringCellValue());
		}
	}

	@Test
	void sinResultadosGeneraSoloEncabezados() throws IOException {
		byte[] archivo = exportador.exportar(FilasPrueba.datos(List.of()));

		try (Workbook libro = new XSSFWorkbook(new ByteArrayInputStream(archivo))) {
			Sheet hoja = libro.getSheet(ExcelExportador.NOMBRE_HOJA);
			assertEquals(0, hoja.getLastRowNum());
			assertEquals(ColumnasReporte.ENCABEZADOS, textos(hoja.getRow(0)));
		}
	}

	@Test
	void respetaElOrdenDeLasFilas() throws IOException {
		IncidenciaHistorialResponse segunda = FilasPrueba.robo();
		IncidenciaHistorialResponse primera = new IncidenciaHistorialResponse(20L, segunda.fechaHora(),
				segunda.fechaRegistro(), "Otra", segunda.zona(), segunda.tipoEvento(), segunda.nivelGravedad(),
				segunda.usuario());

		byte[] archivo = exportador.exportar(FilasPrueba.datos(List.of(primera, segunda)));

		try (Workbook libro = new XSSFWorkbook(new ByteArrayInputStream(archivo))) {
			Sheet hoja = libro.getSheet(ExcelExportador.NOMBRE_HOJA);
			assertEquals(20, hoja.getRow(1).getCell(0).getNumericCellValue());
			assertEquals(15, hoja.getRow(2).getCell(0).getNumericCellValue());
		}
	}

	private static List<String> textos(Row fila) {
		List<String> textos = new ArrayList<>();
		fila.forEach(celda -> textos.add(celda.getStringCellValue()));
		return textos;
	}

}
