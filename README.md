# KBS-Kart! Super Circuit

Das Kart-Rennspiel der Karoline-Breitinger-Schule. Es läuft im Browser, auf dem Laptop wie auf dem Handy, ohne Installation und ohne Konten.

| Seite | Adresse | Für wen |
|---|---|---|
| Einzelspiel | `/` | alle |
| Klassenmodus | `/lehrer` | Lehrkraft am Laptop mit Beamer |
| Mitspielen | `/mitspielen` | SuS, wird über den QR-Code geöffnet |

Figuren, Strecken, Grafik und Musik sind eigene Werke. Das Spiel enthält keine Inhalte aus Nintendo-Spielen.

---

## Einmalige Einrichtung bei Cloudflare (etwa 10 Minuten)

Voraussetzung: ein kostenloses Cloudflare-Konto und dieses Repository bei GitHub.

1. Bei Cloudflare anmelden: <https://dash.cloudflare.com>
2. Links im Menü **Workers & Pages** öffnen. Je nach Ansicht steht der Punkt unter **Compute (Workers)**.
3. **Create application** (Anwendung erstellen) wählen, dann **GitHub** bzw. **Import a repository**.
4. Wenn Cloudflare nach GitHub fragt: verbinden und der Cloudflare-App den Zugriff auf das Repository `kbs-kart` erlauben.
5. Das Repository **kbs-kart** auswählen.
6. Einstellungen prüfen:
   - **Project name / Worker name:** `kbs-kart` (muss genau so heißen, sonst schlägt der Build fehl)
   - **Build command:** leer lassen
   - **Deploy command:** `npx wrangler deploy` (ist voreingestellt)
   - **Root directory:** leer lassen
7. **Save and Deploy** (bzw. **Deploy**) klicken. Nach ein bis zwei Minuten ist das Spiel online.
   Falls Cloudflare nach einer **workers.dev-Subdomain** fragt: einen kurzen Namen wählen, zum Beispiel `kbs`.
8. Die Adresse steht danach in der Übersicht des Workers, etwa `https://kbs-kart.kbs.workers.dev`.
   Den Klassenmodus erreichst du unter **`https://kbs-kart.<deine-subdomain>.workers.dev/lehrer`**. Speichere ihn als Lesezeichen und gib ihn an Kolleginnen und Kollegen weiter.

**Updates:** Jede Änderung, die in diesem GitHub-Repository landet, veröffentlicht Cloudflare automatisch. Du musst dafür nichts tun.

---

## Ablauf im Unterricht

1. **Lehrer-Link am Laptop öffnen**, Beamer und Lautsprecher an. Oben rechts steht der Code der Sitzung.
2. **Qualifying einrichten:** Strecke, Rundenzahl (1–5) und Spielfigur wählen. Bei „Freie Wahl“ suchen sich die SuS ihre Figur selbst aus. Dann **Qualifying starten und QR-Code zeigen**.
3. **Die SuS scannen den QR-Code**, geben Vornamen und den ersten Buchstaben des Nachnamens ein (z. B. „Lena K.“), wählen ihre Figur und tippen auf **Los geht's!**. Das Rennen startet sofort auf dem Handy.
   - Gefahren wird im Zeitfahren mit 3× Turbo, wie im Einzelspiel.
   - Während des Rennens ist das Handy **nicht** mit dem Server verbunden. Erst im Ziel wird die Gesamtzeit einmal gesendet. Das schont das Schul-WLAN.
4. **Die Zeiten erscheinen live am Beamer**, sortiert nach Gesamtzeit. Unpassende Namen entfernst du mit dem **×** neben dem Eintrag. Mit **Qualifying neu starten** beginnt eine neue Runde mit denselben Einstellungen und demselben QR-Code; die bisherigen Zeiten werden dabei gelöscht.
5. **Finale einrichten:** Die zwei Schnellsten sind vorausgewählt, alle anderen Handys werden getrennt. Fahrer, Figuren, Strecke und Rundenzahl lassen sich noch ändern. Sobald beide Handys als „verbunden“ angezeigt werden: **Rennen starten**.
6. **Live-Duell:** Beide fahren gleichzeitig auf ihrem Handy. Der Beamer zeigt beide Sichten nebeneinander mit Namen. Rempeln, Items, Blitz und Phantom wirken zwischen den beiden.
   - Wer zuerst im Ziel ist, gewinnt. Zwei Sekunden später erscheint automatisch die Siegerehrung.
   - Mit **Rennen beenden** brichst du jederzeit ab. Dann gewinnt, wer gerade vorne liegt.
7. **Siegerehrung** am Beamer: großes Spielerbild mit Pokal und Namen. Danach **Revanche**, **Anderes Finale** oder **Zurück zum Qualifying**.

**Tipps**
- Im Finale die Handys **quer** halten, dann liegen die Tasten links und rechts vom Bild.
- Im Klassenmodus gibt das Spiel **immer automatisch Gas**. Raketenstart: beim dritten roten Licht **R** tippen (am Laptop: Leertaste).
- Auf den Handys läuft keine Musik, nur Soundeffekte. Musik und Geräusche des Finales kommen vom Beamer-Laptop.
- SuS können auch am Laptop mitfahren. Steuerung: Pfeiltasten ← → lenken, ↓ bremsen, Leertaste hüpfen und driften, E für Items.
- **Mehrere Klassen gleichzeitig:** Jede Lehrkraft öffnet einfach `/lehrer` und bekommt einen eigenen Code und QR-Code. Die Räume sind voneinander getrennt.
- Wer die Seite versehentlich schließt, scannt den QR-Code noch einmal. Das Handy wird wiedererkannt, solange derselbe Browser benutzt wird.
- **Sitzung → Neue Sitzung** erzeugt einen neuen Code, zum Beispiel für die nächste Klasse.

---

## Datenschutz

- **Gespeichert wird nur:** Vorname mit Anfangsbuchstabe des Nachnamens, gewählte Spielfigur und Rennzeiten. Keine Konten, keine E-Mail-Adressen, keine Cookies, keine Werbung, kein Tracking.
- Die Daten liegen im Klassenraum-Speicher bei Cloudflare und werden **6 Stunden nach der letzten Änderung automatisch gelöscht**. Sofort löschen: **Sitzung → Sitzung beenden und Daten jetzt löschen**.
- Im Browser der Handys speichert die Seite eine zufällige Geräte-Kennung und die eigene Zeit, bis sie angekommen ist. Im Browser der Lehrkraft liegen Code und Einstellungen der Sitzung.
- Schriften und Programmbibliotheken liegen im Projekt selbst. Die Seiten laden nichts von Google oder anderen Drittanbietern nach.
- Cloudflare ist ein US-Anbieter. Stimme den Einsatz am besten kurz mit der Schulleitung oder dem Datenschutzbeauftragten ab.

---

## Kosten

Der kostenlose Cloudflare-Tarif reicht aus. Er erlaubt 100.000 Anfragen pro Tag. Eine Unterrichtsstunde mit Qualifying für 30 SuS und einigen Duellen braucht grob 2.000. Das Laden der Spieldateien zählt nicht mit. Sollte das Spiel einmal schulweit täglich intensiv laufen, gibt es den Tarif **Workers Paid** für 5 US-Dollar im Monat.

---

## Notlösung ohne Cloudflare: Laptop als Server

Falls Cloudflare einmal nicht erreichbar ist, kann der Laptop selbst den Server spielen:

1. [Node.js](https://nodejs.org) installieren (Version 18 oder neuer).
2. Das Repository herunterladen (bei GitHub: **Code → Download ZIP**) und entpacken.
3. Im Projektordner ein Terminal öffnen und `node server/local.mjs` eingeben.
4. Im Terminal erscheint eine Zeile „Im Netz: http://192.168.…:8787/lehrer“. Genau diese Adresse am Laptop öffnen (nicht `localhost`), damit der QR-Code die Netzwerkadresse des Laptops enthält.

Voraussetzung: Handys und Laptop sind im selben WLAN, und das WLAN erlaubt Verbindungen zwischen den Geräten. Viele Schul-WLANs blockieren das, deshalb ist Cloudflare der Normalfall.

---

## Technik

| Ordner/Datei | Inhalt |
|---|---|
| `public/js/engine.js` | Spiel-Engine: Mode-7-Grafik, Fahrphysik, Items, Computergegner, Musik |
| `public/js/lehrer.js` | Beamer-Seite: Einrichtung, QR-Code, Zeitenliste, Splitscreen, Siegerehrung |
| `public/js/mitspielen.js` | Handy-Seite: Anmeldung, Qualifying, Finale |
| `public/js/net.js` | WebSocket-Verbindung mit automatischem Wiederverbinden und Uhrabgleich |
| `src/room.js` | Raum-Logik einer Klasse (unabhängig vom Server) |
| `src/worker.js` | Cloudflare Worker und Durable Object (ein Raum je Code) |
| `server/local.mjs` | Lokaler Server ohne Zusatzpakete |
| `wrangler.jsonc` | Cloudflare-Konfiguration |

**Datenverkehr:** Im Qualifying sendet jedes Handy zwei kurze Nachrichten (Anmeldung und Endzeit). Im Duell schicken die beiden Handys etwa 20 kleine Positions-Pakete pro Sekunde. Jedes Handy berechnet seinen eigenen Wagen. Treffer entscheidet das Handy des getroffenen Fahrers, damit sich niemand ungerecht getroffen fühlt.

**Lizenzen:** Schriften Bungee, Rubik und Silkscreen unter SIL Open Font License (siehe `public/fonts/`). QR-Code-Generator von Kazuhiko Arase unter MIT-Lizenz (`public/js/qrcode.js`). Das Schullogo gehört der Karoline-Breitinger-Schule.
