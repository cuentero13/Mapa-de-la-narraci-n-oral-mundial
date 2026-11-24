# Mapa Mundial de la Narración Oral

Sitio web estático (sin paso de build) que mapea los festivales de narración oral
escénica y cuentería del mundo: historia, fundadores, directores, ediciones,
vigencia, narradores, libros y prensa.

Administra: **Fundación Festival Puro Cuento** (Costa Rica) —
info@festivalpurocuento.com · https://festivalpurocuento.com

## Despliegue

No hay build. Para publicar en Vercel: importar este repositorio tal cual
(framework: *Other*, sin comando de build, directorio raíz). También funciona
sirviendo la carpeta con cualquier servidor estático.

## Estructura

```
index.html          Página única (español + selector ES/EN para la interfaz)
css/style.css       Línea gráfica de festivalpurocuento.com
js/i18n.js          Traducciones ES/EN de la interfaz (los datos quedan en español)
js/app.js           Mapa (Leaflet), filtros, buscador y render de secciones
data/
  festivales-mundo.json   91 fichas de festivales del mundo (22 países)
  colombia.json           144 festivales de Colombia (investigación Fredy Ayala, 2026)
  narradores.json         168 narradores de la RIC (Costa Rica 24, Argentina 141 + 3 en memoria)
  libros.json             96 libros verificados de 9 autores narradores
  libros-parciales.json   16 títulos con año o editorial sin verificar
  prensa.json             12 artículos de prensa verificados
  menciones.json          11 festivales mencionados sin datos suficientes para ficha
  destacados.json         Festival Puro Cuento (CR), Red Internacional de Cuentacuentos, Marcela Sabio
```

## Datos

Solo datos verificados de la investigación (noviembre de 2026). Todo campo no
verificado se muestra como «sin verificar» o se omite; nunca se inventa.

- Red Internacional de Cuentacuentos: https://www.cuentacuentos.eu/
  (fundada en el verano de 2009 por Beatriz Montero y Enrique Páez).
- Colombia: investigación «Festivales de cuentería en Colombia» de Fredy Ayala
  (2026), beca de investigación en artes, Ministerio de las Culturas de Colombia.
  La vigencia individual de cada festival colombiano NO está disponible en la
  fuente (solo los conteos: 52 vigentes / 67 no vigentes / 25 por confirmar).
- Coordenadas a nivel de ciudad. Cuando solo se conoce la capital del
  departamento, el marcador se marca como aproximado; los festivales
  itinerantes no tienen marcador, solo aparecen en el listado.

## Homónimos

El Festival Internacional Puro Cuento de Costa Rica (fundado 2002) NO es el
«PURO CUENTO» de Marcela Sabio (Universidad Nacional del Litoral, Santa Fe,
Argentina, desde 1998) ni el «Puro Cuento» de Perú (Asociación Cultural
Tiempo de Cuentos, Lima). El sitio los distingue en cada ficha.

## Regenerar los datos

Los JSON de `data/` se generaron desde los archivos de investigación con
`../parse.py` (no incluido en el repo). Para actualizar: editar la
investigación, correr el parser y volver a subir los JSON.

## Licencia de los datos

Registro en construcción: los datos no verificados se marcan como tales.
Correcciones: info@festivalpurocuento.com.
