# Remix of Best senza look

Ecco il Master Prompt Definitivo (v10) aggiornato con entrambe le nuove

funzionalità richieste:

1.  Nuovo Report "Top Garderobes da Pezzi Ordinati": inserito il pulsante "Top

    Garderobes by Quantity" che classifica i Garderobe esclusivamente in base al

    totale dei pezzi ordinati (pcs / quantità) in ordine decrescente.

2.  Regola Uniforme Export PDF su TUTTI i Report: stabilito espressamente che

    ogni singola vista, scheda e report di analisi (Dashboard globale, Dettaglio

    singolo Garderobe, Pop-up Accessori, Pop-up Top Looks, Pop-up Top

    Garderobes) deve contenere il proprio tasto dedicato per l'esportazione del

    report in PDF.

💬 Prompt per Lovable / Base44 / Vibe-Coding

Copia e incolla il blocco sottostante nello strumento di AI Coding:

BUILD THE "GARDEROBE" APPLICATION - DEFINITIVE MASTER PROMPT (V10 WITH ALL PDF EXPORTS & TOP QUANTITY REPORTS)

1. SYSTEM THEME, COLOR PALETTE & TYPOGRAPHY:

Apply a dark luxury theme throughout the application:

- Color Tokens: Primary: #D4AF37 (Champagne Gold), Background: #1A1A1A (Deep Dark Gray), Card/Surface: #262626, Accent/Sand: #F5E6CC, Foreground/Text: #E5E5E5.

- Fonts: Heading Font: 'Bodoni Moda' (Serif for titles, Garderobe headers, Look numbers), Body Font: 'Montserrat' (Sans-serif for body text, descriptions, tags, tables).

- Set CSS design tokens in 'src/index.css', map them in 'tailwind.config.js', and consistently use Tailwind token classes (bg-primary, text-foreground, bg-background, bg-card, text-primary, etc.).

2. REFERENCE DATABASE SETUP, 'fotolook', & PERSISTENCE:

- Initial Screen: Add "Upload Reference Database (.csv)" button (remove "Try with sample data").

- DATABASE FORMAT: Semicolon-separated CSV (headers: GR;nr_modello;nome_modello;conc.;collezione;specifica;nome_modello;colore;ordinamento;ID Joor;Foto;fotolook;abbinamenti).

- 'fotolook' COLUMN: Parse the 'fotolook' column containing full-body Look photograph URLs.

- 'Abbinamenti' COLUMN: Parse matching models separated by semicolons (e.g. "Brise 1406; Adalina 1407").

- FILL-DOWN LOGIC: If a row's 'GR' cell is empty, automatically inherit the 'GR' value from the preceding row above it.

- PERSISTENCE: Save parsed database into browser persistent storage (LocalStorage / IndexedDB). Keep active across sessions until overwritten.

- BUTTON GATING: Disable/grey-out "Upload Order (.xlsx)" if no reference database exists in storage. Enable it immediately once a database is loaded.

3. USER .XLSX IMPORT & IN-MEMORY TEMP CSV PREPROCESSING:

Upon file upload, parse .xlsx and build an internal temporary CSV structure with 5 columns:

- "Modello" <- Column B ("Style Name")

- "colore" <- Column E ("Color Code"). REGEX RULE: Extract ONLY digits inside parentheses (e.g. "Avio(1407)" -> "1407").

- "quantità" <- Column "Units"

- "Category" <- Column "Category"

- "Retailer" <- Column "Retailer"

4. COLOR NORMALIZATION & MATCHING:

- Pad numeric color codes with leading zeros up to 4 digits (e.g., "201" -> "0201").

- Match Key: UPPER(TRIM(Modello)) + "_" + UPPER(TRIM(NormalizedColor)).

5. RETAILER BANNER (PLACED BEFORE "OVERALL COMPLETION"):

Display a BOLD banner before "Overall completion":

- 1 to 10 unique Retailers: Display all names separated by " / " (e.g., **Store Alpha / Store Beta**).

- > 10 unique Retailers: Display count only (e.g., **14 Retailers**).

6. APPAREL-ONLY COMPLETENESS & LOOK CALCULATION:

- Look completeness percentage (%) and "Complete Looks" count MUST BE CALCULATED EXCLUSIVELY ON Category == "Apparel".

- Ignore "Accessories" or non-Apparel categories when determining % completion and complete looks count.

- Formula: Completeness % = (Matched Apparel Items) / (Total Required Apparel Items in Look/GR) * 100.

7. LOOK SECTION UI LAYOUT (SIDE-BY-SIDE WITH LOOK PHOTO):

For each Look ('nr_modello') in Garderobe Details, implement a 2-column layout on desktop/tablet:

- LEFT COLUMN:

  * Look Header ("Look #[nr_modello]") and Apparel completion badge (e.g., "1/2").

  * Dynamic recommendation banner: "Since you ordered the [Category] [Model] we suggest to add the [Category] [Model] to complete the look [nr_modello]" (highlighting recommended missing item in #D4AF37 background).

  * Matching Abbinamenti text line (if ordered items have matching abbinamenti present in order).

  * 2-column grid of item cards (Photo 'Foto', Model, English Category, Color, Qty ordered, GREEN badge if Qty > 0, RED badge if Qty == 0).

- RIGHT COLUMN:

  * Display the Look Model Photograph loaded directly from 'fotolook' URL.

  * Styling: Vertical portrait aspect ratio (3:4 or full height matching left grid), rounded corners, subtle shadow, responsive stack on mobile.

8. GARDEROBE RANKING / SORTING (MAIN DASHBOARD):

Sort Garderobe cards on main dashboard in DESCENDING order:

- Primary Sort: Highest Completeness Rate (%)

- Secondary Sort: Highest Total Pieces Ordered (pcs)

9. UNORDERED ACCESSORIES ANALYSIS BUTTON & POP-UP:

- Add "Analyze Unordered Accessories" button on dashboard.

- LOGIC: Find active Looks where at least 1 Apparel item has Qty > 0, and find missing accessories (Category == "Accessories", Qty == 0) in those Looks.

- POP-UP MODAL CONTENT: Show missing accessory Photo, Model, Color, and text: "Proposable for: Garderobe [GR] - Look #[nr_modello]".

- Include "Export Accessories PDF Report" button inside the modal.

10. "MOST PURCHASED LOOKS REPORT" (RANKED BY QUANTITY):

- Add an action button on the dashboard named "Top Purchased Looks Report" (or "Most Ordered Looks").

- AGGREGATION & RANKING LOGIC: Group matched items by Look ID ('nr_modello'), sum 'quantità' (Units) per Look, and rank Looks in DESCENDING ORDER strictly by Total Ordered Quantity (Pcs).

- MODAL DISPLAY: Display ranked Looks (Rank #1, Rank #2...) with Look ID, Garderobe ID ('GR'), Total Pcs Ordered, Look Photo ('fotolook'), and matched items breakdown.

- Include an "Export Top Looks PDF Report" button inside the modal.

11. NEW FEATURE: "TOP GARDEROBES BY QUANTITY REPORT":

- Add an action button on the dashboard named "Top Garderobes by Quantity" (or "Most Ordered Garderobes").

- AGGREGATION & RANKING LOGIC:

  1. Group all matched ordered items by Garderobe ID ('GR').

  2. Calculate total ordered pieces ('pcs') per Garderobe by summing 'quantità' (Units) from the uploaded order file.

  3. Rank and sort Garderobes in DESCENDING ORDER strictly by Total Ordered Quantity (Pcs).

- POP-UP MODAL / VIEW DISPLAY:

  * Render a dedicated Pop-up Modal or View displaying the ranked Garderobes by quantity.

  * Each card shows: Rank Number, Garderobe ID ("Garderobe #[GR]"), Total Quantity Ordered ("Total Pcs Ordered: X pcs"), Apparel Completeness %, and Looks count.

  * Include an "Export Top Garderobes PDF Report" button inside the modal.

12. UNIFIED MANDATORY RULE: PDF EXPORT BUTTON ON EVERY REPORT:

- EVERY single report, view, and analysis modal in the entire application MUST include its own dedicated "Export PDF" button.

- List of Mandatory PDF Export Buttons required:

  1. Main Dashboard Overview -> "Export Main PDF Report"

  2. Single Garderobe Detail View -> "Export This Garderobe PDF"

  3. Unordered Accessories Modal -> "Export Accessories PDF Report"

  4. Top Purchased Looks Modal -> "Export Top Looks PDF Report"

  5. Top Garderobes by Quantity Modal -> "Export Top Garderobes PDF Report"

- PDF STYLING RULE: All PDF reports must use a MUCH LARGER BOLD FONT SIZE for Garderobe/Report titles (e.g. 22pt+ "GARDEROBE 14"), maintain dark theme styling elements, and asynchronously embed all 'Foto' and 'fotolook' images.

13. AUTOMATED VALIDATION LOOP (SELF-CHECK):

Before rendering UI, PDFs, or Modals, run an automated validation loop:

- VERIFY: 'garderobe_id' strictly uses 'GR' column with fill-down.

- VERIFY: 'look_id' strictly uses 'nr_modello' column.

- VERIFY: Top Purchased Looks ranking accurately sums 'quantità' per 'nr_modello' in descending order.

- VERIFY: Top Garderobes by Quantity ranking accurately sums 'quantità' per 'GR' in descending order.

- VERIFY: All 5 PDF Export buttons trigger valid, uncorrupted PDF downloads containing all required data and embedded images without CORS crashes.

Allego anche un file di database.csv e un file ordine xls test per assicurarti che tutti i collegamenti siano rintracciabili . per la app usa un tema con colori neutri bianco beige marrone nero e oro aromnico e di class

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/aab0f304-0ca3-44aa-a769-e451c75a5bef).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
