@echo off
rem ============================================================================================
rem  SGI-SEGANDINA - Ejecuta todas las pruebas y genera las evidencias:
rem    1. Tests del backend (JUnit) con reporte Surefire y cobertura JaCoCo
rem    2. Coleccion Postman con Newman (solo lectura; --completo agrega las escrituras)
rem    3. Pruebas de extremo a extremo con Playwright (capturas CP-xx)
rem    4. docs\evidencias\pruebas\index.html y reporte_pruebas.pdf
rem
rem  Uso:  pruebas\ejecutar-todo.cmd [--completo | --reasignacion]
rem  Variables: BASE_URL, FRONTEND_URL, E2E_ADMIN_DNI, E2E_ADMIN_PASSWORD, E2E_SUPERVISOR_DNI,
rem             E2E_SUPERVISOR_PASSWORD, E2E_VIGILANTE_DNI, E2E_VIGILANTE_PASSWORD
rem             y PRUEBAS_CONTRASENA_TEMPORAL (solo con --completo). Ver docs\evidencias\pruebas\README.md
rem ============================================================================================
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul

for %%I in ("%~dp0..") do set "RAIZ=%%~fI"
if not defined BASE_URL set "BASE_URL=http://localhost:8080"
if not defined FRONTEND_URL set "FRONTEND_URL=http://localhost:3000"
set "COMPLETO="
if /i "%~1"=="--completo" set "COMPLETO=--completo"
if /i "%~1"=="--reasignacion" set "COMPLETO=--reasignacion"
set "FALLOS=0"

echo.
echo === SGI-SEGANDINA: ejecucion de pruebas ===
echo API:      %BASE_URL%
echo Frontend: %FRONTEND_URL%
if "%COMPLETO%"=="--completo" (echo Newman:   modo completo ^(escribe datos^)) else if "%COMPLETO%"=="--reasignacion" (echo Newman:   solo lectura + reasignacion CP-121) else (echo Newman:   solo lectura)
echo.

rem ---------------------------------------------------------------- requisitos
where node >nul 2>nul || (echo [ERROR] No se encontro Node.js en el PATH. & exit /b 1)
where curl >nul 2>nul || (echo [ERROR] No se encontro curl en el PATH. & exit /b 1)
if not defined JAVA_HOME echo [AVISO] JAVA_HOME no esta definido; el backend necesita el JDK 21.

if not exist "%RAIZ%\pruebas\node_modules" (
  echo Instalando dependencias de pruebas\ ...
  pushd "%RAIZ%\pruebas" & call npm ci --no-audit --no-fund & popd
)
if not exist "%RAIZ%\frontend\node_modules\@playwright\test" (
  echo Instalando dependencias de frontend\ ...
  pushd "%RAIZ%\frontend" & call npm ci --no-audit --no-fund & popd
)
pushd "%RAIZ%\frontend" & call npx playwright install chromium >nul & popd

set "FALTAN_CRED="
for %%V in (E2E_ADMIN_DNI E2E_ADMIN_PASSWORD E2E_SUPERVISOR_DNI E2E_SUPERVISOR_PASSWORD E2E_VIGILANTE_DNI E2E_VIGILANTE_PASSWORD) do (
  if not defined %%V set "FALTAN_CRED=!FALTAN_CRED! %%V"
)
if defined FALTAN_CRED echo [AVISO] Faltan variables:%FALTAN_CRED%. Las pruebas que las necesitan se marcaran como omitidas.

rem ---------------------------------------------------------------- servidores
set "BACKEND_OK=0"
set "CODIGO="
for /f %%C in ('curl -s -o nul -w "%%{http_code}" --max-time 5 "%BASE_URL%/api/auth/yo"') do set "CODIGO=%%C"
if "%CODIGO%"=="401" set "BACKEND_OK=1"
if "%CODIGO%"=="200" set "BACKEND_OK=1"
if "%BACKEND_OK%"=="1" (
  echo [OK] Backend respondiendo en %BASE_URL%
) else (
  echo [AVISO] El backend no responde en %BASE_URL% ^(codigo "%CODIGO%"^).
  echo         Arrancalo con: cd backend ^&^& .\mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=local
  echo         Se omitiran Newman y Playwright.
)

set "FRONTEND_OK=0"
set "CODIGO="
for /f %%C in ('curl -s -o nul -w "%%{http_code}" --max-time 15 "%FRONTEND_URL%/login"') do set "CODIGO=%%C"
if "%CODIGO%"=="200" set "FRONTEND_OK=1"
if "%FRONTEND_OK%"=="1" (
  echo [OK] Frontend respondiendo en %FRONTEND_URL%
) else (
  echo [AVISO] El frontend no responde en %FRONTEND_URL% ^(codigo "%CODIGO%"^).
  echo         Arrancalo con: cd frontend ^&^& npm run dev   ^(o npm run build ^&^& npm run start^)
  echo         Se omitira Playwright.
)

rem Resultados de la corrida anterior fuera: el reporte solo debe mostrar lo de esta corrida.
if exist "%RAIZ%\pruebas\reportes" rmdir /s /q "%RAIZ%\pruebas\reportes"

rem ---------------------------------------------------------------- 1. backend
echo.
echo === 1/4 Tests del backend (Surefire + JaCoCo) ===
pushd "%RAIZ%\backend"
rem Ruta explícita (.\): con NoDefaultCurrentDirectoryInExePath definido, cmd no busca en la carpeta actual.
call .\mvnw.cmd -q verify surefire-report:report-only -Dmaven.test.failure.ignore=true
if errorlevel 1 (echo [ERROR] El build del backend fallo. & set "FALLOS=1")
popd

rem ---------------------------------------------------------------- 2. Newman
echo.
echo === 2/4 Coleccion Postman con Newman ===
if "%BACKEND_OK%"=="1" (
  pushd "%RAIZ%\pruebas"
  call node scripts\newman.mjs %COMPLETO%
  if errorlevel 1 set "FALLOS=1"
  popd
) else (
  echo Omitido: el backend no esta corriendo.
)

rem ---------------------------------------------------------------- 3. Playwright
echo.
echo === 3/4 Pruebas de extremo a extremo con Playwright ===
if "%BACKEND_OK%%FRONTEND_OK%"=="11" (
  rem Las capturas se regeneran completas para que coincidan con esta corrida.
  if exist "%RAIZ%\docs\evidencias\pruebas\capturas" del /q "%RAIZ%\docs\evidencias\pruebas\capturas\*.png" 2>nul
  pushd "%RAIZ%\frontend"
  call npx playwright test
  if errorlevel 1 set "FALLOS=1"
  popd
) else (
  echo Omitido: hace falta el backend y el frontend corriendo.
)

rem ---------------------------------------------------------------- 4. reporte
echo.
echo === 4/4 Indice HTML y PDF de evidencias ===
pushd "%RAIZ%\pruebas"
call node scripts\reporte.mjs
if errorlevel 1 set "FALLOS=1"
popd

echo.
echo Evidencias: %RAIZ%\docs\evidencias\pruebas\index.html
echo PDF:        %RAIZ%\docs\evidencias\pruebas\reporte_pruebas.pdf
if "%FALLOS%"=="1" (
  echo Resultado: HAY PRUEBAS FALLIDAS u omitidas por error. Revisa el indice.
  exit /b 1
)
echo Resultado: todas las pruebas ejecutadas pasaron.
exit /b 0
