# WebLua Lua 5.5.1 Compatibiliteitsmatrix

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> docs/web-lua-compatibility.md: [docs/web-lua-compatibility.md](../../web-lua-compatibility.md)
> Taal: Nederlands (nl)

Dit rapport is opzettelijk conservatief. `matched` betekent dat het gedrag wordt gedekt door een armatuur op gastniveau en een deterministisch verwacht resultaat heeft; `capability-gated` betekent dat hosteffecten een expliciet beleid vereisen; `unresolved` betekent dat het gedrag wordt bijgehouden, maar niet als passerend mag worden beschouwd.

| Gebied | Gedrag | Staat | Bewijs | Opmerkingen |
| ----------------------- | ----------------------------------------------------------------------------- | ---------------- | -------------------------------------------- | -------------------------------------------------------------------------------------- |
| lexicale syntaxis | Witruimte, opmerkingen, trefwoorden, gehele getallen en operatoren | op elkaar afgestemd | `packages/web-lua/src/differential.spec.ts` | Alleen de geïmplementeerde scalaire subset wordt geclaimd.                                         |
| scalaire expressies | Rekenen met gehele getallen, unaire min, groepering, prioriteit en vergelijkingen | op elkaar afgestemd | `packages/web-lua/src/differential.spec.ts` | Resultaten gebruiken de huidige scalaire gast-ABI.                                              |
| lokale bevolking en controlestroom | Lokale toewijzing, nieuwe toewijzing, `if`/`else`, `while` en retourneert | op elkaar afgestemd | `packages/web-lua/src/differential.spec.ts` | Lokale gast- en stapelcapaciteiten blijven expliciete limieten.                               |
| benoemde functies | Benoemde definities, parameters, aanroepen en scalaire retourneringen | op elkaar afgestemd | `packages/web-lua/src/differential.spec.ts` | Sluitingen, opwaarderingen, varargs, tail calls en meervoudige rendementen blijven buiten deze rij. |
| fouten en laden | Syntaxis, runtime, divisie en verkeerd opgemaakte statussen van binaire voorvoegsels | op elkaar afgestemd | `packages/web-lua/src/utils/web-lua.spec.ts` | Statussen worden vergeleken zonder Lua-interpretatie aan de hostzijde.                            |
| hostgerichte bibliotheken | I/O, klok, willekeur, besturingssysteem, laden van pakketten en foutopsporingseffecten | capaciteitsafhankelijk | `packages/web-lua/src/utils/web-lua.spec.ts` | Mogelijkheden zijn standaard weigeren; bibliotheekimplementaties zijn onvolledig.              |
| waarden en tabellen | Strings, floats, tabellen, gebruikersdata, identiteit, iteratie en metamethoden | onopgelost | `packages/web-lua/src/utils/web-lua.spec.ts` | De huidige grens geeft scalaire waarden en een tabelbasis met één invoer weer.           |
| sluitingen en coroutines | Opwaarderingen, `yield`/`resume`, beveiligde oproepen en geneste coroutinefouten | onopgelost | `packages/web-lua/src/utils/web-lua.spec.ts` | `resume` voert momenteel een prototype opnieuw uit en wordt niet geclaimd als coroutine-semantiek.  |
| standaardbibliotheken | Basis, coroutine, tabel, string, UTF-8, wiskunde, I/O, OS, debuggen en pakket/laden | onopgelost | Geen differentieelarmatuur uit de standaardbibliotheek | Geen enkel bibliotheekgedrag wordt stilzwijgend als voorbijgaand beschouwd.                                    |

De gegenereerde bron van dit rapport is de getypte matrix in `packages/web-lua/src/compatibility.ts`; de tests vereisen een expliciete classificatie en bewijsinvoer voor elke rij.
