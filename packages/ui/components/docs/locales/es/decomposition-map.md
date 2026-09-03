# Mapa de descomposición de componentes.

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> packages/ui/components/docs/decomposition-map.md: [packages/ui/components/docs/decomposition-map.md](../../decomposition-map.md)
> Idioma: Español (es)

Este documento registra el inventario residual después de extraer `ForgeTag` a
`@mission-platform/select`, UI flotante y de notificación a `@mission-platform/float`,
y tema UI/estado a `@mission-platform/theme`. El barril neutral en
`src/components/index.ts` exporta actualmente **45** componentes; las listas a continuación son
los límites de propiedad recomendados para la próxima ola, no se crean paquetes adicionales
por esta migración.

## Paquetes recomendados de próxima ola

### `@mission-platform/navigation`

`ForgeBreadcrumb`, `ForgeMenu`, `ForgeMenuItem`, `ForgeMenubar`, `ForgeNavbar`,
`ForgeNavbarItem`, `ForgePagination`, `ForgeTabs` y `ForgeVirtualTabs`.

Estos componentes comparten navegación por teclado, enfoque móvil, estado de menú/pestaña y
Contratos de interacción orientados a la navegación. Sus implementaciones neutrales dependen
en `@mission-platform/forge`; Los controles de menú y tipo tabla también utilizan
`@mission-platform/icons`, mientras que el contenido de ruta de navegación/barra de navegación compone la propiedad
Paquete `@mission-platform/typography`. `ForgeNavbar` actualmente compone el
`ForgeDrawer` residual, por lo que extraer la navegación requiere mantener esa
dependencia explícita o decidiendo primero el límite del cajón; no debe introducir
una dependencia de `@mission-platform/components` nuevamente en la navegación.

### `@mission-platform/data-display`

`ForgeAccordion`, `ForgeList`, `ForgeTable`, `ForgeTreeView`, `ForgeVirtualList`,
`ForgeVirtualTable`, `ForgeVirtualTreeView`, `ForgeVirtualLogViewer`,
`ForgeTimeline`, `ForgeBadge`, `ForgeProgressBar` y `ForgeStatusIcon`.

La preocupación común es generar datos estructurados o de gran volumen, incluidos
ventanas, clasificación, expansión de árboles y presentación de estado. La fuente actual
utiliza `@mission-platform/forge` y, cuando se componen texto o glifos,
`@mission-platform/typography` y `@mission-platform/icons`; estos deberían permanecer
dependencias de nivel inferior de un paquete futuro. Los componentes virtuales deben moverse con
sus estilos/especificaciones/historias coubicados, por lo que su comportamiento de gancho neutral y cinco
Los objetivos de Forge se siguen probando juntos.

### `@mission-platform/layout`

`ForgeCard`, `ForgeGrid`, `ForgeMasonry`, `ForgeStack`, `ForgeSeparator` y
`ForgeCollapse`.

Estas son primitivas estructurales que no dependen del flotante, tema,
o seleccionar paquetes. `ForgeCard` y las primitivas de espaciado-rodamiento utilizan actualmente
paquete de utilidades SCSS locales, por lo que un movimiento debe llevar esos estilos o promover
la utilidad a un paquete estable de nivel inferior; no debe llegar a otro
árbol fuente del paquete de dominio.

### `@mission-platform/media`

`ForgeBackgroundVideo`, `ForgeResponsiveImage`, `ForgeResponsiveVideo`,
`ForgeCarousel` y `ForgeDeviceMock`.

Los primeros tres poseen semántica de carga/renderización de medios, mientras que carrusel y dispositivo
presentación simulada de adición en torno a los medios. Su fuente neutral depende actualmente de
`@mission-platform/forge` y, para controles de carrusel, `@mission-platform/icons`;
no hay dependencia de los paquetes extraídos. Preservar el movimiento reducido y
CSS por componente como parte de un movimiento futuro en lugar de dividir el comportamiento de los medios
desde sus estilos.

### `@mission-platform/communication`

`ForgeChatBubble` y `ForgeChatArea`.

Estos componentes comparten la semántica de la conversación, el comportamiento de la región en vivo y el mensaje.
diseño. `ForgeChatBubble` compone `ForgeAvatar` y `@mission-platform/typography`
hoy, por lo que el paquete futuro debería depender de contratos públicos estables para aquellos
primitivas (o mantenerlas en el paquete básico) en lugar de importar residuos
archivos fuente del componente a través de un alias.

## Componentes que permanecen juntos por ahora

Mantenga esta pequeña base/contenido/plantilla configurada en `@mission-platform/components`
hasta que tenga suficiente superficie API para justificar otro límite:

`ForgeAvatar`, `ForgeButton`, `ForgeButtonGroup`, `ForgeIconButton`, `ForgeQuote`,
`ForgeSkeleton`, `ForgeSpinner` y `ForgeHero`.

`ForgeInView` también se conserva como una pequeña utilidad de interacción. `ForgeTypography`
es propiedad de `@mission-platform/typography` e intencionalmente no forma parte del
barril residual.

## Candidatos de ventana/superposición diferida

`ForgeDrawer` y `ForgeWindowPopout` no se mueven deliberadamente en este cambio.
`ForgeDrawer` está superpuesto/adyacente a la ventana y actualmente está compuesto por
`ForgeNavbar`; `ForgeWindowPopout` posee el ciclo de vida de la ventana del navegador y por lo tanto
necesita una decisión separada de SSR, enfoque y contrato entre ventanas. evaluar ambos
con los propietarios de navegación y flotación antes de crear un paquete, y no guarde
implementaciones duplicadas como atajo de compatibilidad.

## Auditoría de límites

Se verificó la fuente del componente residual para las importaciones de los paquetes extraídos:
no hay importaciones de `@mission-platform/theme`, `@mission-platform/float` o
`@mission-platform/select` bajo `packages/ui/components/src`. Componentes neutros
use `@mission-platform/forge`, íconos seleccionados de `@mission-platform/icons`,
tipografía de `@mission-platform/typography` y estilos/utilidades locales del paquete.
Las historias pueden importar el paquete para ejercitar la superficie pública; eso no es
una dependencia de implementación o un ciclo de paquete.

Cada componente residual mantiene su `index.ts`, fuente neutral, SCSS, coubicado.
especificaciones e historia de libro de cuentos. El manifiesto del paquete publica `dist`, componentes,
estilos y utilidades únicamente; el árbol de tiendas extraído ya no está incluido.

## Contrato de servicios públicos de tamaño compartido

Las clases `.forge-size--2xs` a `.forge-size--2xl` están intencionalmente
emitido por `@mission-platform/tokens/scss/tokens`, en lugar de por el residuo
paquete de componentes. Componentes residuales y `float` y `theme` extraídos
Todos los paquetes usan estas clases, mientras que la salida del paquete Forge independiente no puede
incluye de manera confiable un módulo CSS propiedad de `@mission-platform/components`.

El barril de tokens incluye `scss/_size.scss` una vez en la cascada `mp.tokens`
capa, junto con las propiedades personalizadas del token y los restablecimientos de base. Esto preserva
el contrato de precedencia existente: los estilos de aplicación sin capas anulan el
reglas de utilidad, y cada entrada de aplicación/libro de cuentos afectada ya importa el
barril de fichas. Por lo tanto, los componentes siguen emitiendo la clase global estable.
nombres sin duplicar la escala de tamaño en cada paquete.
