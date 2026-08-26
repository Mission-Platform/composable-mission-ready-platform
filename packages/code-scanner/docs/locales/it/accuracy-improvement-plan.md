# Scanner di codici: piano di miglioramento della precisione e record di migrazione

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> packages/code-scanner/docs/accuracy-improvement-plan.md: [packages/code-scanner/docs/accuracy-improvement-plan.md](../../accuracy-improvement-plan.md)
> Lingua: Italiano (it)

Un piano per aumentare la velocità di lettura di `@mission-platform/code-scanner` sulle acquisizioni del mondo reale (caricamenti e fotocamera live
frame) e per mantenere la pipeline di scansione all'interno di un artefatto Forge Web Script/WebAssembly collegato staticamente.

> **Implementazione attuale:** Lo scanner viene fornito collegato staticamente
> Forge grafico Web Script in `src/fws`, con un profilo dinamico del modulo sorgente
> disponibile per moduli decoder memorizzabili nella cache in modo indipendente. La ruggine e la cassa
> i riferimenti riportati di seguito riguardano solo la provenienza storica della migrazione; lo sono
> non creare pacchetti di dipendenze di runtime o creare input.
>
> **Avanzamento:** Fase 0 (test dell'immagine generata ampliata), Fase 1 (spostare il file
> intera pipeline in un artefatto in-process) e **Fase 2** (binarizzazione adattiva + grey
> campionamento dei sub-pixel con cancellazioni Reed–Solomon + tentativo di localizzazione↔decodificatore
> loop) sono **fatti** — vedere §1, §2 e §4. **La Fase 3 è ora completata:** l'UPC-A /
> Disambiguazione EAN-13 (§2 punto 5), Data Matrix + tolleranza di rotazione/inclinazione 1D
> (voce 4), il localizzatore azteco (voce 6) e la scansione multi-simbolo + ROI (voce 7)
> sono atterrati tutti.

L'implementazione originale divideva la pipeline:

- **Locate + sample** è stato eseguito in una pipeline nativa/wasm legacy: `binarize` → localizzatori per simbologia. Il suo punto di ingresso `scan`
  ha restituito un **buffer contrassegnato** `[format, ...payload]` — **non** decodificato.
- **Decode** veniva eseguito in JavaScript e chiamava moduli decodificatori separati.

La Fase 1 l'ha sostituita con una singola chiamata FWS `scan_and_decode` (vedi §1); il
la motivazione storica di seguito viene mantenuta come motivazione, mentre la fonte attuale di
la verità è il grafico FWS e la sua suite di conformità Vitest.

## 1. Il problema strutturale principale: la pipeline ha attraversato il confine wasm↔JS due volte

Prima della Fase 1 una singola scansione era:

```
image (JS)
  → wasm code-scan.scan()            [Rust: binarise + locate + sample]
  → tagged module buffer (JS)        [cross back into JS]
  → decodeQr / decodeMatrix / decodeBarcode (JS façades)
  → wasm qr/matrix/barcode-decode    [cross into a *different* wasm module]
  → payload string (JS)
```

Ogni simbolo individuato viene copiato da Wasm, rimodellato in JS, quindi copiato in una seconda istanza di Wasm per essere decodificato. Questo è
il viaggio di andata e ritorno che il problema richiede. Danneggia sia le prestazioni che, cosa più importante per questo piano, la **precisione**, perché
il localizzatore e il decoder non possono cooperare:

- **Nessun feedback di decodifica al localizzatore.** Il localizzatore di Rust si impegna in un _singolo_
  binarizzazione, dimensione dei simboli e griglia dei moduli. Se la griglia campionata fallisce Reed–Solomon/checksum nel decodificatore JS, c'è
  non c'è modo di chiedere al localizzatore di ricampionare con una soglia diversa, una dimensione del modulo di ±1 o un'origine spostata. Un codice quello
  è _localizzato ma non decodificabile_ (il caso esatto in cui è target la registrazione del debug)
  è semplicemente perso.
- **Trasferimento con perdita.** Il localizzatore appiattisce lo stato intermedio ricco (livelli di grigio, centri di ricerca candidati, per modulo
  confidenza) fino ai bit `0/1` prima che il decodificatore lo veda. Il decodificatore funziona quindi solo a partire dai bit.
- **La precedenza della simbologia è uno strumento brusco.** Per i codici 1D il lato JS prova le simbologie in un ordine fisso e
  restituisce il primo che legge. Poiché UPC-A è un sottoinsieme a livello di modulo di un EAN-13 con zero iniziale, un simbolo UPC-A lo è
  riportato come EAN-13 (verificato dalla nuova suite di test). La decodifica in Rust consente al locatore di portare suggerimenti strutturali (elemento
  conteggio, modelli di guardia) per scegliere la giusta simbologia.

### Architettura di destinazione: una chiamata FWS, immagine in ingresso, payload in uscita

> **Stato: implementato.** Lo scanner esporta `scan_and_decode`, collega il
> decoder FWS grafica direttamente, e la facciata JS decodifica attraverso quel singolo
> chiamare. I dettagli seguenti registrano la logica della migrazione.

```
image (JS)
  → FWS scanner.scan_and_decode()      [binarise + locate + sample + decode]
  → ScanOutcome { format, value } (JS)
```

`scan_and_decode(width, height, luma) -> Option<ScanOutcome>` esegue l'intera pipeline all'interno di `src/fws/scanner.fws` e
restituisce direttamente il **carico utile decodificato** (`value` è vuoto quando viene individuato un simbolo ma non decodificabile). La facciata di JS
(`scanner/index.ts`) è un sottile strato di marshalling che collega le origini FWS QR, matrice e codice a barre in fase di creazione;
tali pacchetti rimangono pubblicabili in modo indipendente.

#### Perché questo è risolvibile adesso

Le casse del decodificatore espongono già nuclei Rust semplici e `crates/code-scan`
**li collega già per i test nativi** (`tests/pipeline.rs` chiama
`mission_platform_barcode_decode::decode_modules`,
`mission_platform_matrix_code_decode::decode`, ecc.). L'unico motivo per cui sono confinati
`[target.'cfg(not(target_arch = "wasm32"))'.dev-dependencies]` è che ogni cassa del decodificatore esporta a
`#[wasm_bindgen] pub fn decode` e collegarne diversi in un cdylib si scontrerebbe con `decode` esportato
simbolo.

La correzione è stata un piccolo refactoring meccanico: **tutti e quattro i passaggi sono stati completati**:

1. **Ogni decodificatore ha un punto di ingresso Rust** che _non_ `#[wasm_bindgen]`
   (`decode_modules`, `decode_matrix`, `decode_qr`) e `#[wasm_bindgen]`
   Le esportazioni `decode`/`start` sono protette da una nuova funzionalità del crate `wasm-api` (attiva per impostazione predefinita e implicita da `console`).
2. **`code-scan` dipende dalle casse del decodificatore con `default-features = false`**
   (quindi `wasm-api` è disattivato), promosso da dipendenze di sviluppo a dipendenze reali. Nessun simbolo wasm-bindgen `decode` lo è
   compilato nel cdylib dello scanner, quindi non ci sono conflitti: verificato ricostruendo lo scanner wasm.
3. **`scan_and_decode`** in `crates/code-scan/src/lib.rs` individua, quindi richiama i nuclei Rust semplici dei decodificatori durante il processo
   e restituisce un formato `ScanOutcome {,
valore }` (a `#[wasm_bindgen]` struct; `valore` is `unfine` quando non decodificabile).
4. **La facciata JS è snellita**: il routing `decodeTagged` e le importazioni dei tre pacchetti di decoder sono scomparsi,
   sostituito da una singola chiamata `scan_and_decode`.

Questo è il passaggio di abilitazione per ogni miglioramento della precisione riportato di seguito, poiché l'individuazione e la decodifica ora condividono uno spazio di indirizzi.

## 2. Miglioramenti della precisione sbloccati una volta che la decodifica è in Rust

Ordinato approssimativamente in base all'impatto previsto sulla velocità di lettura. **Gli elementi 1–3 (Fase 2) e gli elementi 4–7 (Fase 3) sono stati completati**; ciascuno lo è
annotato di seguito.

1. **Localizzatore ↔ ciclo di tentativi del decodificatore. _(fatto — Fase 2.)_** Quando il primo tentativo di decodifica fallisce, `scan_and_decode`
   ricampiona senza uscire da Rust: tenta una seconda binarizzazione (adattiva), l'origine del sottomodulo cambia
   (`SAMPLE_OFFSETS`) e sia la decodifica sensibile alla cancellazione che quella cieca, accettando il primo candidato che supera il valore del simbolo
   propria correzione degli errori. Questo attacca direttamente i guasti _localizzati ma non decodificabili_.
2. **Binarizzazione locale/adattativa. _(fatto — Fase 2.)_** `image::binarize` (**Otsu** globale) viene mantenuto come primo digiuno
   tentativo; `image::binarize_adaptive` aggiunge una soglia con finestra **C media locale** (tramite un'immagine integrale) in modo che l'abbagliamento,
   gradienti e illuminazione non uniforme non uniscono più i moduli scuri allo sfondo. Il ciclo di tentativi tenta entrambi.
3. **Campionamento del modulo a livello di grigio (sub-pixel). _(fatto — Fase 2.)_** `qr` e
   `datamatrix` ha ottenuto `scan_with_confidence`, che campiona i centri del modulo dall'immagine _grigia_ con bilineare
   moduli di interpolazione e flag vicino alla soglia locale come a bassa confidenza. Questi vengono passati ai decoder
   (`decode_qr_with_erasures` / `decode_matrix_with_erasures`) come Reed–Solomon **cancella**, che il
   correttore di errori e cancellazioni (`gf`, `reed_solomon`)
   riparazioni fino al doppio del tasso di errori sconosciuti.
4. **Robustezza multiscala + rotazione per 1D e Data Matrix. _(fatto — Fase 3.)_** Il localizzatore QR era già presente
   tollerante alla rotazione tramite i suoi tre centri di ricerca. Data Matrix ora legge con **qualsiasi** rotazione: un affine basato sugli angoli
   localizzatore (`scan_oriented_candidates` — quattro angoli estremi dell'inchiostro, l'angolo L rilevato dai bordi solid, il
   angolo opposto ricostruito dalla regola del parallelogramma, dimensione letta dai bordi di temporizzazione, campionati lungo indipendenti
   assi colonna/riga in modo che venga gestito anche il taglio)
   copre angoli moderati e un fallback raddrizza e riprova recupera angoli ripidi: `Bitmap::orientation` trova il
   rotazione tramite una scansione del riquadro di delimitazione dell'area minima (robusta nella famiglia dei 45°, dove gli angoli dei punti estremi degenerano),
   `image::rotate_luma` raddrizza il telaio e la pipeline verticale sintonizzata lo campiona. I codici a barre 1D vengono gestiti
   allo stesso modo: l'inclinazione viene recuperata e il telaio raddrizzato (provati tutti e quattro gli orientamenti di allineamento degli assi) in modo che
   le linee di scansione orizzontali attraversano le barre. Coperto da test della pipeline di cattura ruotata su una vasta gamma di angoli (incl.
   45°/90°/180°+) e i profili di degrado JS rinforzati.
5. **Disambiguazione della simbologia per 1D. _(fatto — Fase 3.)_** L'ambiguità tra UPC-A e zero iniziale EAN-13 è risolta da
   la **cifra del sistema numerico**:
   `decode_any_barcode` post-elabora la simbologia vincente
   `disambiguate_symbology`, che riporta un EAN-13 la cui cifra del sistema numerico è
   `0` come modulo UPC-A a 12 cifre (zero iniziale rimosso) lasciando intatto il codice EAN-13 originale. _Rimanente:_ trasporto
   struttura posizionata più ricca (posizioni delle barre di guardia, conteggio degli elementi) nella decisione ed esponendo la simbologia prevista
   in modo che i chiamanti possano limitarlo.
6. **Supporto azteco. _(fatto — Fase 3.)_** Il file `@mission-platform/matrix-code`
   il codificatore produceva già Aztec, ma lo scanner non aveva _locator_ Aztec. Aggiunto un localizzatore bullseye compatto-azteco
   (`crates/code-scan/src/aztec.rs`): trova il bullseye centrale tramite la firma del cercatore `1:1:1:1:1:1:1:1:1` a nove passaggi
   (sette corse interne sono attendibili, solo le due esterne devono essere presenti poiché toccano l'anello della modalità), lo verifica su entrambi gli assi,
   recupera la dimensione del modulo, campiona ciascuna dimensione compatta plausibile (15/19/23/27) su una copia ripulita dalle macchie e instrada ciascuna
   al percorso di decodifica azteco esistente, i cui controlli mode-message + Reed–Solomon rifiutano le dimensioni errate. `scan_and_decode`
   lo segnala come `FORMAT_AZTEC`.
7. **Scansione a simboli multipli + ROI. _(fatto — Fase 3.)_** `scan_and_decode_all`
   restituisce ogni simbolo decodificato distinto (uno spostamento da grossolano a fine dell'intero fotogramma, metà e quadranti sovrapposti,
   deduplicato da `(format, value)`) e
   `scan_and_decode_roi` ritaglia una regione fornita dal chiamante **in Rust prima**
   binarizzazione, quindi un ritaglio reticolo respinge il disordine circostante in primo piano. Entrambi sono emersi nella facciata JS
   (`scanImageDataAll`, `scanImageData(image, roi)`).

## 3. Strategia di validazione

Il lavoro di precisione deve essere misurato, non affermato a occhio.

- **Test di andata e ritorno con immagini generate.**
  `src/scanner/index.spec.ts` esegue il rendering di numerosi output dell'encoder: cinque payload QR per dimensioni/UTF-8 più tutti e quattro gli ECC
  livelli, quattro payload Data Matrix e sette simbologie 1D (`code128`, `code39`, `ean13`, `ean8`, `upca`, `itf`,
  `codabar`) - e asserisce il percorso completo `render → locate → sample → decode` (ora il percorso singolo
  `scan_and_decode` chiamata) recupera il payload. I casi 1D vengono confrontati con la precedenza della simbologia dello scanner
  (inclusa la disambiguazione UPC-A/EAN-13).
- **Tutti i tipi di codice codificano↔decodifica andata e ritorno.** `crates/code-scan/tests/generated.rs`
  codifica **ogni** simbologia che i codificatori possono produrre: QR (4 livelli ECC), tutte e quattro le simbologie di matrice (Data Matrix
  quadrato/rettangolare, GS1 Data Matrix, Aztec)
  e tutte le quindici simbologie 1D (inclusi Code 93, GS1-128, UPC-E, ITF-14, MSI, Pharmacode) - e asserisce che ciascuna decodifica
  fedelmente (ricodificare l'uguaglianza), coprendo i tipi di codice che lo scanner non è ancora in grado di _localizzare_.
- **Casi di degrado fase 2.** `image.rs` test unitari di binarizzazione adattiva su un gradiente di illuminazione; `tests/pipeline.rs`
  dimostra che un QR degradato con gradiente che il percorso globale solo Otsu non può leggere viene recuperato dall'adattamento adattivo della Fase 2 +
  pipeline di campionamento grigio; i contenitori RS testano il ripristino degli errori e delle cancellazioni oltre la capacità di errore cieco.
- **Degrado dell'acquisizione per formato seminato.** Ogni immagine generata è deformata da un **proiettivo** deterministico
  trasformazione — scala d'aspetto non uniforme, rotazione, inclinazione e un **morfologia** x/y/z indipendente per angolo (un'omografia) —
  più rumore sale e pepe, prima della scansione. Le intensità sono sintonizzate per formato, che quantifica due limiti di localizzazione
  vale la pena sistemare (vedi §2): la griglia basata sul cercatore di QR è solo affine, quindi tollera solo un lieve aspetto _anisotropico_ e
  _prospettiva_ prima che i simboli più grandi vadano alla deriva; il localizzatore Data Matrix è solo verticale, quindi tollera solo una leggera
  rotazione/inclinazione/morfosi.
- **Matrice di degradazione.** Il Rust `tests/pipeline.rs` degrada già le catture sintetiche (downscale, sale e pepe
  macchioline, disordine in una zona tranquilla, un disordine
  "cornice della fotocamera"). Estendilo in una scansione dei parametri (scala × rumore × rotazione × sfocatura) e riporta una ** velocità di lettura
  percentuale per formato**, delimitata in CI in modo che una modifica non possa regredirla silenziosamente.
- **Corpus di acquisizione reale.** Raccogli un set di foto reali (il campo riporta frame di riferimento 448×336 a bassa risoluzione
  e ~3px/codici a barre modulo) con payload noti e monitora la velocità di lettura come metrica principale tra le versioni.
- **Determinismo.** Mantieni seminate tutte le degradazioni sintetiche (il file `speckle`
  utilizza un LCG fisso) in modo che i risultati siano riproducibili.

## 4. Sequenziamento suggerito

1. **Fase 0: test (eseguiti).** Ampliata la suite di immagini generate (con aspetto/rotazione/inclinazione/morfosi/rumore
   degrado) quindi la pipeline aveva una rete di sicurezza prima del refactoring.
2. **Fase 1 — consolidare la decodifica in Rust (fatto).** Il refactoring di dipendenze/funzionalità + `scan_and_decode` + facciata JS
   dimagrire. Preservazione del comportamento; convalidato dai test di andata e ritorno, dalla pipeline e dai nuovi test `scan_and_decode` e da
   ricostruire lo scanner wasm.
3. **Fase 2 — binarizzazione + campionamento sub-pixel + ciclo di tentativi (fatto).** Binarizzazione locale adattiva, bilineare grigio
   campionamento con confidenza per modulo inviato ai decodificatori durante le cancellazioni di Reed-Solomon e il globale → adattivo ×
   ciclo di tentativi di cancellazione/cieco × offset origine in `scan_and_decode`: vince la velocità di lettura più elevata, ora che localizza e
   decodificare coopera in una chiamata Rust.
4. **Fase 3 — rotazione/inclinazione, disambiguazione della simbologia, azteco, multi-simbolo (in corso).** La simbologia 1D
   la disambiguazione (§2 punto 5) è arrivata. rimanente:
   Data Matrix/tolleranza di inclinazione della rotazione 1D (elemento 4), un localizzatore azteco (elemento 6) e scansione di simboli multipli + ROI (elemento 7): ciascuno è atterrato dietro il proprio delta della matrice di degradazione.

## 5. Follow-up della documentazione

- **Fine:** `packages/code-scanner/README.md` è stato aggiornato: il vecchio "decodificatore di codici a barre 1D è ancora un'impalcatura, quindi
  i risultati dei codici a barre riportano la nota `value: null`" viene sostituita con il comportamento di decodifica end-to-end (decodificazione dei codici a barre; UPC-A
  riporta come valore di 12 cifre, non come alias EAN-13), e la sezione architettura ora descrive il singolo
  Chiamata `scan_and_decode` anziché il trasferimento della decodifica JS.

## 6. Cablaggio del corpus black-box ZXING (velocità di lettura con acquisizione reale)

Il "corpus" `tests/real_world.rs` del §3 è stato realizzato come il corpus completo **ZXing blackbox** (1.242 PNG in 56
cartelle di simbologia, ciascuna con un `.txt`
valore atteso; Apache-2.0, venduto sotto
`crates/code-scan/tests/fixtures/zxing-blackbox/` con attribuzione). Un'imbracatura in stile ZXing
(`crates/code-scan/tests/blackbox.rs`) esegue l'intero file nativo
`scan_and_decode` pipeline su ogni immagine alle quattro rotazioni di un quarto di giro (0/90/180/270) e le confronta ciascuna
conteggio dei passaggi per cartella e per rotazione rispetto a una linea di base impegnata (`tests/blackbox_baseline.toml`), con esito negativo solo su un
_regressione_: in questo modo i valori anomali non risolvibili non bloccano mai il progresso mentre vengono misurate le vittorie autentiche. `falsepositives*` /
Le cartelle `unsupported` sono la guardia inversa: la loro linea di base è un _tetto_ di falsi positivi.

### Passaggio 1: corpo + caricatore generalizzato + cablaggio _(fatto)_

Il corpus è stato venduto, il lettore PNG è stato generalizzato (`tests/support/png.rs`:
tavolozza colore tipo 3 a profondità 1/2/4/8, scala di grigi a bassa profondità, RGB (A), grigio+alfa, più aiutanti di rotazione 90/180/270
corrispondenza della semantica ZXing) con un test unitario del caricatore (`tests/png_loader.rs`) e la linea di base viene confermata.

### Passaggio 2: aumenta la velocità di lettura sui formati supportati _(in corso)_

Triage (classificazione per cartella di ogni immagine/rotazione come decodificata/valore errato/localizzata ma non decodificata/
non-localizzato) è emerso uno schema chiaro:
la pipeline ora **localizza quasi tutto** ma **decodifica solo le acquisizioni pulite**. I restanti fallimenti lo sono
prevalentemente _localizzato-ma-non-decodificato_, non _non-localizzato_.

**Hai completato questo passaggio:**

- **Protezione ITF dai falsi positivi.** Interleaved-2-of-5 non ha una cifra di controllo e un banale avvio/arresto, quindi una linea di scansione attraversa
  un simbolo non correlato (un QR, altre barre) banalmente "decodificato" in un valore spurio di 2 o 4 cifre. `itf::decode` ora
  rifiuta i payload più brevi di **sei cifre**, corrispondenti al limite inferiore di `ITFReader::DEFAULT_ALLOWED_LENGTHS` di ZXing
  (`{6,8,10,12,14}`). Ciò ha portato i falsi positivi in `falsepositives`, `falsepositives-2` e `unsupported` a
  **zero** e, rimuovendo quelle letture brevi che cortocircuitavano l'ordine di precedenza, sono stati rilevati diversi aspetti positivi
  cartelle (ad esempio `qrcode-4`, `qrcode-5`). Coperto da un nuovo test di regressione (`barcode-decode`:
  `itf_rejects_runs_shorter_than_six_digits`) e l'aggiornamento della linea di base.

**Prossime opportunità quantificate (localizzate, non ancora decodificate):**

- **Decodifica di righe 1D per cifra (la più grande opportunità).** Le cartelle UPC/EAN individuano centinaia di righe di scansione ma ne decodificano quasi
  nessuna delle foto della fotocamera rigida (`upca-2` 206 localizzata / 0 decodificata, `upce-2` 160 / 0, `ean13-3` 204 / 6). La causa principale
  è che il localizzatore quantizza ciascuna linea di scansione in una **singola unità globale del modulo** prima di consegnare i bit del modulo al
  decodificatore; sotto lo scorcio prospettico la larghezza effettiva del modulo varia attraverso il simbolo, quindi la griglia globale si sposta
  e una griglia rigida di celle EAN/UPC lo respinge. La soluzione è un decodificatore di riga **per cifra** in stile ZXing che corrisponde a ciascuna cifra
  rapporti di lunghezza di esecuzione localmente (varianza di corrispondenza del modello) invece di una quantizzazione globale: un cambiamento più ampio nel
  interfaccia localizzatore↔decodificatore, tracciata come successiva iterazione del Passo 2.
- **Prospettiva QR/campionamento del modello di allineamento.** `qrcode-1` (77 localizzati / 0 decodificati) e `qrcode-6` (60 / 0) sono
  simboli della versione superiore: il campionatore costruisce una griglia puramente **affine** dai tre centri del cercatore, che si sposta
  un simbolo grande o deformato in prospettiva. Utilizzando lo **schema di allineamento** in basso a destra
  per una trasformazione prospettica a quattro punti (come fa `Detector` di ZXing) è la vittoria QR corrispondente.
- **Dimensionamento Data Matrix + polarità.** Il singolo Data Matrix `inverted` si trova ora dopo un'inversione di polarità ma
  dimensionato erroneamente dal localizzatore (22×22 per un simbolo numerico di 10 cifre la cui dimensione reale è ~ 12–14), quindi non viene decodificato; un
  Il tentativo a polarità invertita full-frame è stato prototipato ma invertito per questo passaggio perché ha raddoppiato il tempo di scansione del corpo
  per zero vincite net corpus (il blocco è il dimensionamento del DM, non la polarità). Il supporto invertito dovrebbe tornare una volta visualizzato il localizzatore DM
  il dimensionamento è ristretto, con ambito in modo che il passaggio aggiuntivo venga eseguito solo su frame che altrimenti fallirebbero.
- **Campionamento azteco.** `aztec-1` (68 localizzati / 0 decodificati): viene trovato il bullseye ma il campionamento della griglia allineata all'asse non viene rilevato
  non ancora recuperare queste acquisizioni.

### Passaggio 3: codifica + decodifica + localizzatore GS1 DataBar (RSS-14) _(RSS-14 completato)_

Un nuovo trio di casse rispecchia la suddivisione `*-common` / `*-encode` / `*-decode` del repository:

- **`gs1-databar-common`**: le primitive combinatorie ISO/IEC 24724 trasferite da `RSSUtils` di ZXing: `combins`,
  `get_rss_value` (larghezze → valore, decodifica) e il suo esatto inverso `get_rss_widths` (valore → larghezze, codifica), più il
  abbinamento del cercatore di varianza del rapporto di larghezza. Un test unitario afferma che la mappatura valore/larghezza è autoinversa su ogni RSS-14
  sottoinsieme.
- **`gs1-databar-decode`** — un port fedele di `RSS14Reader` di ZXing: rilevamento del cercatore, `parseFoundFinderPattern`,
  `decodeDataCharacter` (con la regolazione del conteggio pari/dispari) e il checksum mod-79, ricostruendo il GTIN di 14 cifre.
  Poiché i caratteri DataBar vengono decodificati da _rapporti_ di larghezza elemento (non da una griglia di glifi fissa), il decodificatore di riga legge run
  lunghezze direttamente da una linea di scansione, quindi tollera la larghezza variabile del modulo di un'acquisizione di scorcio che sconfigge
  il percorso 1D di quantizzazione globale (§2).
- **`gs1-databar-encode`** — il valore→bit del modulo inverso. La sua disposizione fisica (barra di guardia, elemento esterno/cercatore/interno
  ordine e la coppia invertita interno/destro) è stato individuato confrontando le larghezze degli elementi misurate del decodificatore da a
  simbolo del corpus reale rispetto ai caratteri calcolati dal codificatore, quindi confermato da un viaggio di andata e ritorno di codifica→decodifica.

Lo scanner ha acquisito `crates/code-scan/src/gs1_databar.rs`, un sottile localizzatore che fornisce linee di scansione promettenti
(righe con transizione più trafficata, quindi colonne per acquisizioni a 90°/270°) al decodificatore di riga; il potente checksum RSS-14 fa a
corrisponde ad autorevole, quindi riporta solo un valore decodificato o nulla (mantenendo pulita la guardia dei falsi positivi). È cablato
in `scan_and_decode` come nuovo
Tag `FORMAT_DATABAR` (con `FORMAT_PDF417` / `FORMAT_MAXICODE` riservato per i passaggi successivi).

**Risultato:** le cartelle del corpus `rss14-1` e `rss14-2` sono passate da **0 → 16**
decodifica corretta attraverso le quattro rotazioni (righe lette 0°/180°, colonne lette 90°/270°), senza **nessuna regressione** in alcun
l'altra cartella e le cartelle negative ancora a **zero** falsi positivi. I viaggi di andata e ritorno sono coperti da
`gs1-databar-decode/tests/roundtrip.rs` e `code-scan/tests/generated.rs`.

**Prossima iterazione di DataBar:** GS1 DataBar **Espanso** e **Espanso-impilato**
(`rssexpanded-*`, `rssexpandedstacked-*`) sono un decodificatore separato e più grande (un parser AI/campo per scopi generici più
assemblaggio di righe in pila) e rimanere alla linea di base 0, monitorata come follow-up di questo passaggio. Anche RSS-14 **Stacked** richiede
gruppo a due file nel locatore.

### Passaggio 4: codifica + decodifica PDF417 + localizzatore di righe in pila _(fatto)_

Un nuovo trio di crate rispecchia la divisione `*-common` / `*-encode` / `*-decode` del repository, effettuando il porting di `com.google.zxing.pdf417.*`
(Apache-2.0):

- **`pdf417-common`** — le tabelle condivise e i calcoli matematici di cui entrambe le parti hanno bisogno: le tabelle simboli ↔ parole codice (2.787 voci,
  generato dal riferimento ZXing), le ricerche di codeword/cluster (`get_codeword`, `bucket_from_symbol`), il
  conteggio bit del modulo → campionatore di simboli (percorso veloce esatto più un fallback con rapporto più vicino costruito pigramente) e **GF (929)
  Decodificatore di correzione errori Reed–Solomon** (`ModulusGF` / `ModulusPoly` / algoritmo euclideo). Un test unitario afferma ogni
  Il valore della parola in codice ha un simbolo in ciascuno dei tre cluster e viaggi di andata e ritorno.
- **`pdf417-decode`** — GF (929) correzione EC più un parser bit-stream di alto livello (`DecodedBitStreamParser`) che copre
  **Testo**, **Byte** e **Numerico**
  compattazione. Consuma l'array di parole in codice flat assemblato dal localizzatore e restituisce il carico utile.
- **`pdf417-encode`**: un codificatore di compattazione dei byte (qualsiasi carico utile di byte effettua esattamente il andata e ritorno), dimensionamento delle dimensioni,
  Generatore di parole in codice EC (`EC_COEFFICIENTS` per tutti i nove livelli EC, generato dal riferimento) e matrice di moduli
  layout (protezioni avvio/arresto, indicatori fila sinistra/destra). Espone sia l'array di parole di codice (per codeword-level
  andata e ritorno) e la bitmap del modulo compresso (per i test del percorso dell'immagine).

Lo scanner ha guadagnato `crates/code-scan/src/pdf417.rs`. PDF417 è un _lineare impilato_
simbologia, quindi il localizzatore lavora una riga di scansione alla volta: su ogni riga dell'immagine trova la guardia di partenza, legge 17 moduli
parole in codice (8 barre/spazi ciascuno) fino al fermo, vota i metadati di colonna/conteggio righe/livello EC dalla riga
indicatori, inserisce le parole in codice dei dati in una matrice `rows × cols` (votata a maggioranza per cella attraverso le linee di scansione che
coprire ogni riga del codice a barre) e lo consegna al decoder controllato da RS. Un secondo passaggio legge ogni riga da destra a sinistra, quindi a
Il simbolo ruotato di 180° continua a decodificare. È collegato a `scan_and_decode` come `FORMAT_PDF417`.

Due dettagli di robustezza si sono rivelati essenziali:

- **Campionamento solo esatto nel percorso attivo.** Il campionatore per corsa utilizza solo la corrispondenza esatta
  (`sample_codeword_symbol_exact`); un'esecuzione che non campiona in modo pulito diventa un _hole_ `-1` che preserva la colonna
  allineamento e viene saltato nella votazione. Ciò mantiene la scansione di ogni riga di ogni immagine a buon mercato: la O (dimensione tabella)
  Il fallback con il rapporto più vicino dominerebbe altrimenti lo spostamento del corpo.
- **Un buco di protezione contro l'eccessiva correzione dell'RS.** Con alti livelli di EC Reed–Solomon sarà felice di fabbricare un
  Parola di codice _valido-ma-sbagliato_ da un assembly per lo più vuoto (osservato come decodifica `"AAAA…"` spazzatura). Il localizzatore quindi
  rifiuta di decodificare quando il numero di buchi supera `num_ec / 2` (il budget di correzione RS), che viene rimosso **ogni**
  decodificare i rifiuti mantenendo tutti quelli corretti e mantenendo pulita la protezione dai falsi positivi della cartella dei negativi.

Un bug risolto lungo il percorso: il braccio predefinito del parser del flusso di bit poteva girare all'infinito su un flusso corrotto (riesecuzione del testo
compattazione in una parola in codice che non può consumare); ora si ritira quando non fa progressi.

**Risultato:** `pdf417-1` / `pdf417-2` / `pdf417-3` è passato da **0 → 8 / 13 / 8**
decodifica corretta alla rotazione 0 e di nuovo a 180° (**58** corretta attraverso le rotazioni), con **nessuna regressione** in nessun altro
e le cartelle dei negativi sono ancora a **zero** falsi positivi. I viaggi di andata e ritorno sono coperti da
`pdf417-decode/tests/roundtrip.rs` e `code-scan/tests/generated.rs` e il percorso completo dell'immagine (codifica → rendering →
`scan_and_decode`, incl. 180°) di
`code-scan/tests/pipeline.rs`.

**Prossima iterazione PDF417:** le rotazioni **90°/270°** rimangono alla linea di base 0: un simbolo ruotato di un quarto si presenta come barre verticali
che il localizzatore di scansione delle righe non legge. Lo è un passaggio di scansione di colonna (trasposizione) o il cablaggio che alimenta il fotogramma trasposto
il seguito corrispondente. Un'inclinazione più accentuata richiederebbe il modello prospettico `Detector` completo a quattro angoli ZXing.

### Passaggio 5: codifica + decodifica MaxiCode + localizzatore esagonale _(fatto)_

Un nuovo trio di crate rispecchia la divisione `*-common` / `*-encode` / `*-decode` del repository, effettuando il porting di `com.google.zxing.maxicode.*`
(Apache-2.0):

- **`maxicode-common`** — le primitive condivise necessarie ad entrambe le parti: la geometria fissa del simbolo (30 colonne × 33 righe), il
  **`BITNR`** per cella → mappa bit di codice (porta di `BitMatrixParser.BITNR` di ZXing, trascritto e testato unitariamente in modo che ciascuno
  degli 864 bit di dati appare esattamente una volta), `read_codewords` / `place_codewords`
  coppia inversa e il correttore **GF (64) Reed–Solomon** (primitivo `x⁶+x+1`, base del generatore 1) con soli errori
  Berlekamp–Massey/Chien/Forney. I test unitari coprono una parola in codice pulita, una correzione fino alla metà del budget CE e un
  blocco non correggibile.
- **`maxicode-decode`** — un port fedele di `Decoder` di ZXing +
  `DecodedBitStreamParser`: corregge il blocco primario (10 dati + 10 EC complessivi) e il blocco secondario (pari/dispari
  interfogli corretti indipendentemente), legge la modalità nibble, assembla i dataword ed esegue il set di cinque
  (`SETS[0..5]`) flusso di latch/shift/compattazione dei numeri, incluso il vettore strutturato in modalità 2/3
  assemblaggio codice postale/paese/classe di servizio. Poiché tutti e tre i blocchi RS devono essere convalidati, il valore restituito è autorevole.
- **`maxicode-encode`** — uno scrittore senza dipendenze che punta alla modalità 4/5 con i set di caratteri primari A e B (sufficienti per
  codificare i payload ASCII e seminare i viaggi di andata e ritorno), generando l'EC primario + interleaved-secondario e ponendo il 144
  parole in codice nella griglia del modulo tramite la mappa condivisa `BITNR`.

Lo scanner ha guadagnato `crates/code-scan/src/maxicode.rs`. MaxiCode viene letto come un simbolo _puro_, esattamente come quello di ZXing
`MaxiCodeReader` fa: il localizzatore prende il rettangolo che racchiude i pixel scuri e campiona la griglia fissa 30×33
sopra di esso, spostando la posizione x del campione di mezzo modulo sulle righe dispari per seguire l'offset esagonale. Un aspetto quadrato economico
la guardia salta ovviamente le regioni non MaxiCode (codici a barre 1D, etichette alte) prima del campionamento e i tre blocchi RS rifiutano
qualsiasi immagine non MaxiCode campionata in questo modo. È collegato a `scan_and_decode` come
`FORMAT_MAXICODE`.

**Risultato:** la cartella `maxicode-1` è passata da **0 → 9** decodifiche corrette alla rotazione 0 (tutte e nove le immagini - modalità 2–5 e
il campione inserito con errore), senza **nessuna regressione** in qualsiasi altra cartella e le cartelle negative ancora a **zero**
falsi positivi. I viaggi di andata e ritorno sono coperti da `maxicode-decode/tests/roundtrip.rs`
(codifica → griglia del modulo → decodifica, incluso ripristino errore RS) e
`code-scan/tests/generated.rs`.

**Prossima iterazione MaxiCode:** come ZXing, il campionatore pure-bits è solo verticale, quindi le rotazioni **90°/180°/270°** rimangono a
linea di base 0 (un simbolo ruotato campiona la griglia esagonale in modo errato e RS la rifiuta - nessun falso positivo). Un bersaglio
finder che recupera la rotazione del simbolo prima che il campionamento solleverebbe le altre tre rotazioni.

### Passaggio 6: collega i nuovi formati alla facciata JS + crea l'artefatto FWS _(fatto)_

I passaggi 3–5 hanno inserito PDF417, GS1 DataBar (RSS-14) e MaxiCode nello scanner
pipeline dietro i tag `FORMAT_PDF417` / `FORMAT_DATABAR` / `FORMAT_MAXICODE`, mentre la facciata JS conosceva solo i tag
quattro formati originali. Questo passaggio fa emergere le nuove simbologie in fase di esecuzione:

- **`FORMAT_NAMES`** in `src/scanner/index.ts` ora mappa `4 → 'pdf417'`,
  `5 → 'databar'`, `6 → 'maxicode'` e l'unione `ScanFormat` in `src/types.ts`
  ottiene gli stessi tre nomi, quindi `scanImageData` / `scanImageDataAsync` (e il
  `*All` / varianti ROI) li restituiscono come qualsiasi altro formato.
- **L'artefatto FWS dello scanner è creato** da `src/fws/scanner.fws` dal plugin Forge Web Script Vite. Il profilo statico
  collega i grafici del decodificatore in un artefatto autonomo, abilita WebAssembly SIMD e applica un tempo di collegamento aggressivo
  ottimizzazione; il profilo dinamico mantiene i limiti espliciti del modulo decodificatore e memorizza nella cache l'invio dell'esportazione.
- **Le suite di grafici e facciate FWS** (`src/fws/scanner-graph.spec.ts` e
  `src/scanner/index.spec.ts`) esercita i grafici del decoder collegato tramite il
  scanner ABI ed entrambi i punti di accesso pubblici, inclusi PDF417, GS1 DataBar,
  MaxiCode, ROI, percorsi multi-risultato, sincroni e asincroni. Il
  Il dispositivo di testo PDF417 package-local mantiene il caso di conformità indipendente da
  lo spazio di lavoro del corpus nativo in pensione.

**Risultato:** `vitest` è verde rispetto all'artefatto FWS e alla build `tsc`
il controllo è pulito. Le famiglie sostenute restano coperte tassativamente dall'art
suite di grafici e facciate pubbliche e la suddivisione del modello per fase che ha guidato il
lo sforzo è documentato in `docs/model-cost-strategy.md`.

### Passaggio 7: decodificatore di riga 1D per cifra in stile ZXing per foto UPC/EAN della fotocamera _(fatto)_

La modalità di errore dominante del corpus rimanente erano i codici a barre 1D **localizzati ma non decodificati**. Il percorso 1D originale
(`barcode.rs` → `barcode-decode`) campiona ciascuna linea di scansione candidata in una sequenza piatta di bit del modulo quantizzando ogni
eseguito contro una **singola unità di modulo globale**. Questo è esatto in caso di caricamento pulito, ma in una foto scattata con la fotocamera la larghezza del modulo lo è
non è costante nel simbolo (la prospettiva, la sfocatura e la stampa irregolare lo allungano), quindi un'unità globale ne arrotonda molte
elementi contro la griglia sbagliata e il decodificatore di cella EAN/UPC rigido rifiuta il risultato. Il simbolo è _localizzato_ (`scan`
restituisce le linee di scansione candidate) ma mai _decodificato_.

La soluzione è un nuovo `crates/code-scan/src/barcode_row.rs`, un fedele port della famiglia `UPCEANReader` di ZXing. Non lo è mai
quantizza su una griglia globale: percorre la linea di scansione modello per modello e, per **ogni cifra indipendentemente**, normalizza
le quattro larghezze di quella cifra nella cella a sette moduli prima di confrontarla con le tabelle di larghezza L/G/R
(`patternMatchVariance` con `MAX_AVG_VARIANCE` /
`MAX_INDIVIDUAL_VARIANCE`). Poiché ogni cifra porta la propria unità locale, la deriva graduale attraverso il simbolo non è più
sconfigge la lettura. Copre **EAN-13 / UPC-A** (tramite EAN-13, con la cifra iniziale recuperata dalle sei metà di sinistra
bit di parità), **EAN-8** e **UPC-E** (che prima non aveva _nessun_ percorso di decodifica — è assente nel file `barcode-decode`
elenco simbologia), riutilizzando il rilevatore di bande di codici a barre condiviso per selezionare le righe di scansione. Funziona in `decode_barcode_frame` come a
fallback **dopo** che il decodificatore della griglia fallisce, quindi i caricamenti puliti mantengono il percorso veloce.

Due guardie mantengono le cartelle dei negativi a **zero** falsi positivi: il lettore è molto più permissivo della griglia
quantizzatore, quindi entrambi erano essenziali:

- **Zone silenziose su entrambi i lati.** ZXing richiede una zona silenziosa posteriore larga almeno quanto la protezione finale (rispecchiando la
  zona tranquilla di protezione partenza esistente). Senza di esso, un'esecuzione `1:1:1` _all'interno_ di un simbolo non correlato incornicia un "codice a barre" spurio
  che, combinato con un checksum casualmente valido, decodifica: la fonte dei 9 + 12 falsi positivi iniziali su
  `falsepositives*`.
- **Consenso su più righe per le simbologie brevi.** I codici EAN-8/UPC-E a 8 cifre sono soggetti a checksum fortuito valido
  inquadratura in disordine, quindi vengono accettati solo quando **≥ 2 righe di scansione** decodificano in modo indipendente lo stesso valore (un autentico
  il codice a barre viene decodificato su molte righe dell'altezza della barra; su uno appare un colpo di fortuna). Il codice EAN-13/UPC-A a 13 cifre (12 cifre di dati
  più la cifra iniziale derivata dalla parità)
  sono molto meno inclini e sono accettati da una singola fila. Ogni valore restituito viene inoltre convalidato dai simboli
  proprio checksum mod-10.

**Risultato:** nelle cartelle UPC/EAN, la rotazione 0 è aumentata notevolmente, ad es.
`ean13-3` **3 → 54**, `upca-2` **0 → 31**, `upce-2` **0 → 37**, `upca-5`
**13 → 26**, più `ean13-1`, `ean8-1`, `upca-1`, `upce-1/3` e, poiché il fallback viene eseguito anche sul
fotogrammi raddrizza e riprova, guadagni comparabili a 90°/180°/270° (ad esempio `upce-2` rot90 **0 → 35**). **Nessuna** altra cartella
regredito e le cartelle negative (`falsepositives`, `falsepositives-2`, `unsupported`) rimangono su **zero** false
positivi. Due test di regressione basati su corpus in
`code-scan/tests/pipeline.rs` blocca le letture fotografiche UPC-E/EAN-13/EAN-8 reali e la protezione pulita dai falsi positivi e il JS
smoke suite ottiene foto della fotocamera UPC-E + EAN-13 attraverso sia il percorso di caricamento che quello di streaming.

**Nota: `img.png`.** L'acquisizione del mondo reale della root dell'area di lavoro (`real_world.rs`) ora è _localizzata_ in modo pulito, ma codifica
il classico generatore di esempio `01234567`
la cui cifra finale **non** è un controllo mod-10 valido (`0123456` → `01234565`). Un lettore conforme alle specifiche: questo, e
ZXing stesso: rifiuta un codice a barre che non supera il proprio checksum, quindi la pipeline non restituisce alcun valore lì _in base alla progettazione_; quello
test rimane `#[ignore]` come documentazione del rifiuto intenzionale (abbassare la guardia del checksum per leggerlo sarebbe
riaprire i falsi positivi che la guardia rimuove).

**Prossima iterazione 1D:** UPC/EAN **estensioni aggiuntive** (`upcean-extension-*`, i supplementi a 2/5 cifre) e le estensioni più difficili
le cartelle (`upca-6`, `ean13-5`) rimangono al livello di base 0: il lettore aggiuntivo e un localizzatore più potente per tali acquisizioni sono i
follow-up corrispondenti.
