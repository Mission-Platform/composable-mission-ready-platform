# Mappa di scomposizione dei componenti

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> packages/ui/components/docs/decomposition-map.md: [packages/ui/components/docs/decomposition-map.md](../../decomposition-map.md)
> Lingua: Italiano (it)

Questo documento registra l'inventario residuo dopo l'estrazione di `ForgeTag` in
`@mission-platform/select`, interfaccia utente mobile e di notifica per `@mission-platform/float`,
e UI/stato del tema su `@mission-platform/theme`. La canna neutra a
`src/components/index.ts` attualmente esporta **45** componenti; gli elenchi seguenti lo sono
i limiti di proprietà consigliati per la prossima ondata, non i pacchetti aggiuntivi creati
da questa migrazione.

## Pacchetti consigliati per la prossima ondata

### `@mission-platform/navigation`

`ForgeBreadcrumb`, `ForgeMenu`, `ForgeMenuItem`, `ForgeMenubar`, `ForgeNavbar`,
`ForgeNavbarItem`, `ForgePagination`, `ForgeTabs` e `ForgeVirtualTabs`.

Questi componenti condividono la navigazione tramite tastiera, il focus mobile, lo stato dei menu/schede e
contratti di interazione orientati alla navigazione. Le loro implementazioni neutre dipendono
su `@mission-platform/forge-jsx`; utilizzano anche menu e controlli simili a tabelle
`@mission-platform/icons`, mentre il contenuto breadcrumb/navbar costituisce il file proprietario
Pacchetto `@mission-platform/typography`. `ForgeNavbar` attualmente compone il file
`ForgeDrawer` residuo, quindi per estrarre la navigazione è necessario mantenerlo
dipendenza esplicita o decisione preliminare del confine del cassetto; non deve introdurre
una dipendenza da `@mission-platform/components` nuovamente nella navigazione.

### `@mission-platform/data-display`

`ForgeAccordion`, `ForgeList`, `ForgeTable`, `ForgeTreeView`, `ForgeVirtualList`,
`ForgeVirtualTable`, `ForgeVirtualTreeView`, `ForgeVirtualLogViewer`,
`ForgeTimeline`, `ForgeBadge`, `ForgeProgressBar` e `ForgeStatusIcon`.

La preoccupazione comune è il rendering di dati strutturati o ad alto volume, inclusi
finestre, ordinamento, espansione dell'albero e presentazione dello stato. La fonte attuale
utilizza `@mission-platform/forge-jsx` e, dove sono composti testo o glifi,
`@mission-platform/typography` e `@mission-platform/icons`; questi dovrebbero rimanere
dipendenze di livello inferiore di un pacchetto futuro. I componenti virtuali dovrebbero spostarsi con
i loro stili/specifiche/storie co-localizzati, quindi il loro comportamento di aggancio neutro e cinque
I bersagli della forgia rimangono testati insieme.

### `@mission-platform/layout`

`ForgeCard`, `ForgeGrid`, `ForgeMasonry`, `ForgeStack`, `ForgeSeparator` e
`ForgeCollapse`.

Queste sono primitive strutturali senza dipendenza dal float, dal tema,
oppure seleziona i pacchetti. `ForgeCard` e le primitive di spaziatura attualmente utilizzate
pacchetto di utilità SCSS locali, quindi uno spostamento deve portare quegli stili o promuovere
l'utilità di un pacchetto stabile di livello inferiore; non dovrebbe raggiungere un altro
albero di origine del pacchetto di dominio.

### `@mission-platform/media`

`ForgeBackgroundVideo`, `ForgeResponsiveImage`, `ForgeResponsiveVideo`,
`ForgeCarousel` e `ForgeDeviceMock`.

I primi tre possiedono la semantica di caricamento/rendering dei media, mentre carosello e dispositivo
simula l'aggiunta di presentazioni sui media. La loro fonte neutra dipende attualmente da
`@mission-platform/forge-jsx` e, per i controlli del carosello, `@mission-platform/icons`;
non esiste alcuna dipendenza dai pacchetti estratti. Conservare il movimento ridotto e
CSS per componente come parte di una mossa futura piuttosto che dividere il comportamento dei media
dai suoi stili.

### `@mission-platform/communication`

`ForgeChatBubble` e `ForgeChatArea`.

Questi componenti condividono la semantica della conversazione, il comportamento della regione live e il messaggio
disposizione. `ForgeChatBubble` compone `ForgeAvatar` e `@mission-platform/typography`
oggi, quindi il pacchetto futuro dovrebbe dipendere da contratti pubblici stabili per questi paesi
primitive (o tenerli nel pacchetto Foundation) invece di importare residui
file di origine del componente tramite un alias.

## Componenti che per ora rimangono insieme

Conserva questa piccola base/contenuto/modello impostato in `@mission-platform/components`
finché non avrà abbastanza superficie API per giustificare un altro confine:

`ForgeAvatar`, `ForgeButton`, `ForgeButtonGroup`, `ForgeIconButton`, `ForgeQuote`,
`ForgeSkeleton`, `ForgeSpinner` e `ForgeHero`.

`ForgeInView` viene mantenuto anche come piccola utilità di interazione. `ForgeTypography`
è di proprietà di `@mission-platform/typography` e non fa intenzionalmente parte di
canna residua.

## Candidati overlay/finestra differiti

`ForgeDrawer` e `ForgeWindowPopout` non vengono spostati deliberatamente in questa modifica.
`ForgeDrawer` è sovrapposto/adiacente alla finestra ed è attualmente composto da
`ForgeNavbar`; `ForgeWindowPopout` possiede il ciclo di vita della finestra del browser e pertanto
necessita di una decisione separata sul contratto SSR, focalizzazione e su più finestre. Valutali entrambi
con i proprietari di navigazione e float prima di creare un pacchetto e non conservarli
implementazioni duplicate come scorciatoia per la compatibilità.

## Controllo dei confini

L'origine dei componenti residui è stata controllata per le importazioni dei pacchetti estratti:
non ci sono importazioni di `@mission-platform/theme`, `@mission-platform/float` o
`@mission-platform/select` sotto `packages/ui/components/src`. Componenti neutri
utilizzare `@mission-platform/forge-jsx`, icone selezionate da `@mission-platform/icons`,
tipografia da `@mission-platform/typography` e stili/utilità locali del pacchetto.
Le storie possono importare il pacchetto barile per esercitare la superficie pubblica; non lo è
una dipendenza di implementazione o un ciclo del pacchetto.

Ogni componente residuo mantiene il suo `index.ts` co-locato, sorgente neutra, SCSS,
specifiche e la storia del libro di fiabe. Il manifesto del pacchetto pubblica `dist`, componenti,
solo stili e utilità; l'albero del negozio estratto non è più incluso.

## Contratto di utilità di dimensione condivisa

Le classi da `.forge-size--2xs` a `.forge-size--2xl` sono intenzionali
emesso da `@mission-platform/tokens/scss/tokens`, anziché dal residuo
pacchetto componenti. Componenti residui e `float` e `theme` estratti
tutti i pacchetti utilizzano queste classi, mentre l'output del pacchetto Forge autonomo non può
includere in modo affidabile un modulo CSS di proprietà di `@mission-platform/components`.

Il barile di token include `scss/_size.scss` una volta nella cascata `mp.tokens`
livello, insieme alle proprietà personalizzate del token e alle reimpostazioni di base. Questo preserva
il contratto di precedenza esistente: gli stili di applicazione senza livelli sovrascrivono il contratto di precedenza esistente
regole di utilità e ogni voce dell'app/del libro di fiabe interessata importa già il file
botte di gettoni. I componenti continuano quindi ad emettere la classe globale stabile
nomi senza duplicare la scala delle dimensioni in ogni confezione.
