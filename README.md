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
  festivales-mundo.json   253 fichas de festivales del mundo (122 países y territorios; 11 de Colombia también están en colombia.json)
  colombia.json           144 festivales de Colombia (investigación Fredy Ayala, 2026)
  narradores.json         168 narradores de la RIC (Costa Rica 24, Argentina 141 + 3 en memoria)
  libros.json             96 libros verificados de 9 autores narradores (con enlace para buscar cada título)
  libros-parciales.json   24 títulos con año o editorial sin verificar (incluidos 8 de Liliana Cinetto sin año)
  prensa.json             11 artículos de prensa verificados (P10, Agencia Andina, retirada 24-nov-2026: URL canónica sin verificar)
  fuentes.json            103 referencias APA 7.ª ed. (Ayala, RIC, prensa, La U, nuevos festivales, complementos, premios, manuscritos)
  premios.json            20 premios de narración oral verificados (10 países/ámbitos)
  menciones.json          163 menciones (tradición oral fuerte sin festival verificable)
  destacados.json         Festival Puro Cuento (CR), Red Internacional de Cuentacuentos, Marcela Sabio
  miticos.json            23 lugares míticos (capa aparte, apagada por defecto)
```

Secciones: mapa con filtros, directorio mundial único con buscador (las 144
fichas de Colombia van en el mismo listado, sin sección propia), ranking
«Dónde hay más narración oral», narradores, sección «Historia de la NOE»
(Francisco Garzón Céspedes y el fenómeno de la narración oral en América
Latina, con cronología de festivales y cursos y formación académica),
«Biblioteca NOE» (catálogo público completo de 120 libros), prensa, premios,
fuentes (lista APA 7.ª ed.) y créditos, y un pie de página «Nosotros» con la
información de la Fundación como administradora. Cada ficha de festival lleva
una cita APA que la sustenta (campo `cita`, con enlace a la referencia
completa en fuentes.html) y un relato tradicional corto de su zona, marcado
como tal — salvo las 15 fichas nuevas de noviembre de 2026 (mundo-239–253),
que no traen relato en el paquete de fuentes. La capa de lugares míticos (Tartaria,
Lemuria, los 9 reinos nórdicos, Macondo, El Dorado, Shangri-La, Atlántida y
otros) es independiente de los festivales reales: tiene su propio interruptor,
está apagada por defecto y nunca entra en los conteos.

## Datos

Solo datos verificados de la investigación (noviembre de 2026). Todo campo no
verificado se muestra como «sin verificar» o se omite; nunca se inventa.

- Total mundial deduplicado: **386 festivales únicos** (253 del mundo + 144 de
  Colombia, menos 11 que aparecen en ambas listas; las fichas duplicadas llevan
  `en_colombia: true` en festivales-mundo.json). En el directorio y en el mapa
  cada festival se muestra una sola vez.
- Ranking «Dónde hay más narración oral» (contado 24-nov-2026 desde el
  dataset): por país, Colombia 144, España 20, Argentina 10, México 9 y
  Brasil 8; por ciudad, Bogotá 36, Medellín 12, Cali 9, Lomé (Togo) 4 y
  Pasto 4.
- Relatos: las 382 fichas originales (238 mundo + 144 Colombia) llevan un relato
  tradicional corto de su zona (campo `relato`: título, texto y zona),
  mostrado en la tarjeta y en el popup del festival. Es un cuento o leyenda
  tradicional del territorio, no un dato del festival.
- Logo de la Fundación: PNG transparente del sitio oficial
  (festivalpurocuento.com), con la versión de Drive (lh3) como respaldo si
  falla la carga.

- Red Internacional de Cuentacuentos: https://www.cuentacuentos.eu/
  (fundada en el verano de 2009 por Beatriz Montero y Enrique Páez).
- Colombia: investigación «Festivales de cuentería en Colombia» de Fredy Ayala
  (2026), beca de investigación en artes, Ministerio de las Culturas de Colombia.
  La vigencia individual de cada festival colombiano NO está disponible en la
  fuente (solo los conteos: 52 vigentes / 67 no vigentes / 25 por confirmar).
  Cada una de las 144 fichas de Colombia lleva su cita visible en el popup del
  mapa y en su fila del directorio (campo `fuentes` en colombia.json, con el
  enlace a la investigación). Las fichas del mundo muestran sus fuentes en la
  tarjeta del directorio y en el popup del mapa; las listas de narradores
  citan a la RIC bajo cada sublista (Costa Rica y Argentina).
- Narradores: listados de la RIC (Red Internacional de Cuentacuentos,
  cuentacuentos.eu). Las fichas individuales de la RIC no tienen URL propia en
  los datos (solo la ficha destacada de Marcela Sabio la trae enlazada); la
  cita es por lista, no por narrador.
- Coordenadas a nivel de ciudad. Cuando solo se conoce la capital del
  departamento, el marcador se marca como aproximado; los festivales
  itinerantes no tienen marcador, solo aparecen en el listado.
- Barrido global (24-nov-2026): cobertura mundial, incluidos estados no
  reconocidos por la ONU (Taiwán, Palestina, Kosovo, Sahara Occidental,
  Somalilandia, Transnistria, Abjasia, Osetia del Sur, Chipre del Norte) y
  territorios (Groenlandia, Islas Feroe, Puerto Rico). Donde no hay festival
  verificable, el lugar va como mención, no se inventa.
- La vigencia de cada ficha usa solo tres valores («activo», «inactivo»,
  «sin verificar»); el detalle («por confirmar», etc.) queda en
  `vigencia_texto`.

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
