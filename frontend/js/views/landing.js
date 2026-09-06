import { el } from "../ui.js";

// Subtle contour-line watermark behind the hero — echoes the report's own
// mountain-silhouette cover art without pulling in an image asset.
const CONTOUR_SVG = `data:image/svg+xml,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 400">
    <path d="M0,320 Q150,220 300,300 T600,260 T900,310 T1200,250" fill="none" stroke="#13284a" stroke-width="1.5"/>
    <path d="M0,350 Q150,260 300,330 T600,300 T900,340 T1200,290" fill="none" stroke="#13284a" stroke-width="1.5"/>
    <path d="M0,380 Q150,300 300,360 T600,340 T900,370 T1200,330" fill="none" stroke="#13284a" stroke-width="1.5"/>
  </svg>`)}`;

export function LandingView(root, { onEnter }) {
  root.innerHTML = "";

  const hero = el("section", { class: "hero", style: `--contour-svg:url('${CONTOUR_SVG}')` }, [
    el("div", { class: "hero-inner" }, [
      el("span", { class: "landing-badge" }, "Smart India Hackathon 2026 · PS 26001 · MDoNER"),
      el("h1", {}, "BhuSetu — NER Landslide Risk Intelligence & Decision Support Platform"),
      el(
        "p",
        { class: "landing-sub" },
        "From fragmented hazard data to prioritised action. Fusing rainfall, terrain, soil moisture, " +
          "satellite signals and citizen reports into confidence-scored risk, road/village exposure, and " +
          "recommended emergency response for the North Eastern Region."
      ),
      el("div", { class: "landing-features" }, [
        featureCard(
          "Multi-source evidence",
          "Rainfall, soil moisture, terrain, SAR deformation and citizen field reports, fused with visible confidence."
        ),
        featureCard(
          "Two-stage risk engine",
          "Static susceptibility (\u201cwhere\u201d) \u00d7 dynamic trigger (\u201cwhen\u201d) \u2014 separated because they change at different speeds."
        ),
        featureCard(
          "Consequence-aware",
          "Not just a hazard map \u2014 ranks affected roads, isolated villages and emergency priorities."
        ),
        featureCard(
          "Degrades honestly",
          "When a sensor goes offline, confidence visibly drops instead of silently pretending data is complete."
        ),
      ]),
      el("button", { class: "btn btn-primary btn-large", onclick: onEnter }, "Open Command Dashboard \u2192"),
      el(
        "p",
        { class: "muted tiny landing-note" },
        "Running in SIMULATION MODE \u2014 synthetic-but-plausible demo data. No live IMD/Sentinel keys are required to try it."
      ),
    ]),
  ]);

  root.appendChild(hero);
}

function featureCard(title, desc) {
  return el("div", { class: "feature-card" }, [el("h3", {}, title), el("p", {}, desc)]);
}
