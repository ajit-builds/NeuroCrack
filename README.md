# NeuroCrack Research & Distribution Report

A premium, interactive digital research report detailing the strategic market opportunity, competitive positioning, and pedagogical model for NeuroCrack in India's postgraduate medical education landscape.

## Project Structure
```text
NeuroCrack_Report/
├── report/
│   ├── index.html          # Main interactive presentation report
│   └── assets/             # Visual styles, scripts, fonts, and images
│       ├── css/
│       ├── js/
│       └── images/
├── walkthrough.md          # Technical walkthrough of recent additions
└── README.md               # Project description and local startup instructions
```

## Technologies Used
- **Core Structure**: Semantic HTML5 (incorporating off-grid editorial layouts, collapsible navigation, and fully accessible containers).
- **Styling & Theme**: Vanilla CSS custom properties (variables) representing design tokens for typography, spacing scale, and modern HSL colors (neon highlights, slate backdrops, and dark interfaces).
- **Interactivity**: Vanilla ES6 JavaScript handling live viewport intersection observation, silent hash routing, reading progress percentage metrics, SpaceX-style static metrics grids, and keyboard accessibility.
- **Visuals & Media**: Custom SVG graphics (road forks underlaid by stethoscopes, process pipelines, layout flows) and editorial illustrations.

## Embedded Media Notes
- **Internet Connection Required**: The report incorporates high-fidelity editorial video components demonstrating the content ideas bank, clinical SO400 question breakdowns, growth roadmaps, and production standards. An active internet connection is required to fetch and stream these embedded YouTube reference videos.
- **Single-Playback Execution**: Playing any video wrapper automatically pauses and cleanses other active players, returning them to their preview thumbnail state to optimize memory footprint and network load.

## Where Design System Documentation Lives
The developer design system specifications, component lists, utility grid guidelines, font scale tokens, and empty state layouts are documented inside:
👉 **[editorial-system.html](editorial-system.html)** (located at the root level of the package).

## How to Run Locally
To run the report locally without CORS policy restrictions (specifically for local fonts and SVG patterns loading):

1. **Open Terminal** in the project's root folder.
2. **Start a Local Server** (e.g., Python HTTP module):
   * *Python 3*:
     ```bash
     python3 -m http.server 8080
     ```
   * *Node.js (npx)*:
     ```bash
     npx serve
     ```
3. **Open in Browser**:
   * To view the main report, navigate to: `http://localhost:8080/report/index.html`
   * To view the developer design reference sheet, navigate to: `http://localhost:8080/editorial-system.html`

## Browser Recommendation
For the optimal viewing experience, we recommend using a modern, standards-compliant web browser supporting hardware acceleration and advanced SVG filters (such as **Google Chrome**, **Safari**, or **Microsoft Edge**).
