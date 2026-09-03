# Strategia di modello e costi: sforzo di copertura completa del corpus ZXING

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> packages/integrations/code-scanner/docs/model-cost-strategy.md: [packages/integrations/code-scanner/docs/model-cost-strategy.md](../../model-cost-strategy.md)
> Lingua: Italiano (it)

Questo documento cattura la **matrice di suddivisione dei modelli** richiesta per il lavoro del corpus black-box ZXING ("usa agenti di
vari modelli per determinare il modo migliore per raggiungere questo obiettivo al costo più efficace"). Registra quale livello di modello è il migliore
adattato a ciascuna fase di consegna, in modo che laddove esiste un meccanismo di delega il lavoro può essere indirizzato al più economico
livello capace – e laddove un singolo agente svolge il lavoro, guida dove è necessario lo sforzo maggiore (e il modello più capace)
dovrebbe essere speso.

## Definizioni di livello

- **Livello A (il migliore/più capace)**: nuovo ragionamento basato sulla visione artificiale e decodifica ricca di specifiche: i nuovi localizzatori (MaxiCode
  griglia esagonale + bullseye, clustering di righe PDF417, assemblaggio di righe impilate GS1 DataBar) e Reed–Solomon /
  matematica di correzione degli errori (GF (929) per PDF417, GF (64) per MaxiCode, calcolo combinatorio RSS). Queste sono le parti più
  è probabile che si sbagli in modo subdolo e sia più difficile riprendersi da una brutta prima bozza.
- **Livello B (medio)**: porting ben specificato dal riferimento ZXING: tabelle di simbologia, codificatori, andata e ritorno generati
  test, logica di cablaggio e generalizzazione del caricatore PNG. La forma della risposta è nota; il lavoro è accurato
  trascrizione e cablaggio.
- **Livello C (economico/meccanico)**: copia in blocco, file di attribuzione, impalcature di base, documenti e cablaggio standard
  (tag di formato, `FORMAT_NAMES`, l'unione `ScanFormat`).

## Fase → mappatura dei livelli

| Palcoscenico                                            | Lavoro                                                                        | Livello |
| ------------------------------------------------------- | ----------------------------------------------------------------------------- | ------- |
| 1 Corpo del venditore + caricatore + imbracatura        | copia/attribuzione (C), caricatore + logica di cablaggio (B)                  | DO → SI |
| 2 Aumenta la velocità di lettura dei formati supportati | ottimizzazione del localizzatore + percorsi di tentativi                      | A→B     |
| 3 Famiglia GS1 DataBar                                  | tabelle/codificatori (B), localizzatore RSS-14 + RS (A)                       | A/B     |
| 4PDF417                                                 | tabelle/codificatore (B), localizzatore di scansione di riga + GF(929) EC (A) | A/B     |
| 5 MaxiCodice                                            | localizzatore di griglia esadecimale + GF(64) RS (A), tabelle (B)             | A/B     |
| 6 Cablaggio + JS + documenti                            | boilerplate/docs + cablaggio (C), ricostruzione wasm + fumo (B)               | DO → SI |

## Principio dei costi

Massimizzare la quota Tier-C/Tier-B: il porting meccanico (tabelle, codificatori, test di andata e ritorno, cablaggio) costituisce la maggior parte
il lavoro nel nuovo formato e riservare il budget di livello A ai tre localizzatori veramente nuovi e alla loro correzione degli errori
matematica, dove gli errori di un modello più debole sono costosi da rilevare e correggere. Un breve picco può essere utilizzato come punto di riferimento per un modello più economico
una porta del decodificatore prima di impegnare il livello per il resto.

## Come è andata a finire

- La **Fase 6** (questa fase) è il caso Tier-C→B più chiaro: estensione
  `FORMAT_NAMES` e l'unione `ScanFormat` è meccanica (C); ricostruendo il wasm e scrivendo il file upload/stream smoke
  suite con un piccolo lettore PNG è un lavoro di livello intermedio ben specificato (B). Non era necessario alcun ragionamento di livello A una volta diventato nativo
  erano presenti decodificatori (fasi 3–5).
- **Fasi 3–5** ciascuna suddivisa in modo netto: le tabelle/codificatori ZXING e i test di andata e ritorno erano trascrizione di livello B, mentre
  locatori e Reed-Solomon (GF (929), GF (64), la combinatoria RSS) erano il nucleo di livello A, coerente con la matrice
  sopra.

> Durante l'implementazione non era disponibile alcuno strumento di delega dell'agente personalizzato, quindi a
> il singolo agente ha eseguito il lavoro spendendo sforzi secondo questa matrice. Il
> la matrice rimane la guida per eventuali future rieseguizioni in cui la delega è multipla
> i livelli di modello sono possibili.
