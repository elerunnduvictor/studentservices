/* ═══════════════════════════════════════════════════════════════════════════
   SHARED PALETTE AND CONSTANTS

   The colour maps the directory, OKR and department renderers draw with.

   These were defined inside the three snapshot files — employees.js,
   okr-progress-data.js, scorecard-data.js — which every page used to load as
   script tags. Those files also carry the roster and the KPI detail, so they
   are no longer sent to everyone; a partner is refused that data by the
   database and should not be handed it in the page payload instead.

   Removing them took the colours out with the data, and each renderer died on
   its first lookup: the directory drew none of its 193 employees, the OKR page
   threw on STATUS_COLORS. They are presentation constants — small, and safe for
   anyone to receive — so they belong here, loaded everywhere the renderers are.

   `SCORECARD_META` is deliberately not here: it is a genuine property of the
   data (when it was generated, how many KPIs were excluded) and comes from the
   database with the rest.
   ═══════════════════════════════════════════════════════════════════════════ */

window.DEPT_COLORS = {
  "Dean of Students":                 { bg: "#A2C23D", light: "#8aaa2e", pale: "#f2f7e6", r: "162,194,61" },
  "Digital Operations":               { bg: "#CB4A27", light: "#a83d20", pale: "#fbeee9", r: "203,74,39" },
  "Enrollment & Retention":           { bg: "#B687AC", light: "#9a6f90", pale: "#f5edf3", r: "182,135,172" },
  "Student Records, Registration, and Support":  { bg: "#3A929D", light: "#2a7a84", pale: "#e8f4f5", r: "58,146,157" },
  "VP - Student Services":            { bg: "#FFC328", light: "#d4a020", pale: "#fff6d6", r: "255,195,40" },
};

window.TYPE_COLORS = {
  "Full-Time Employee":      "#065577",
  "Full-Time Temporary":     "#28738A",
  "Part-Time Temporary":     "#FFC328",
  "Professional Contractor": "#7F898A",
  "Student Contractor":      "#B687AC",
  "Student Employee":        "#5E60CE",
};

window.OKR_COLORS = {
  "Clarify and refine the Student Services organization": { bg: "#3A929D", light: "#5BAEB8", pale: "rgba(58,146,157,0.12)" },
  "Enable enrollment scaling":                              { bg: "#065577", light: "#28738A", pale: "rgba(6,85,119,0.12)" },
  "Reach retention goals through targeted initiatives":     { bg: "#B687AC", light: "#CFA4C5", pale: "rgba(182,135,172,0.12)" }
};

window.STATUS_COLORS = {
  "On Track":             { bg: "#2E9E5C", pale: "rgba(46,158,92,0.14)" },
  "At Risk":              { bg: "#E08A1E", pale: "rgba(224,138,30,0.14)" },
  "Delayed":              { bg: "#C9682B", pale: "rgba(201,104,43,0.14)" },
  "In Trouble":           { bg: "#D14545", pale: "rgba(209,69,69,0.14)" },
  "Completed - On time":  { bg: "#065577", pale: "rgba(6,85,119,0.14)" },
  "Completed - Late":     { bg: "#7E80CE", pale: "rgba(126,128,206,0.14)" },
  "Not Started":          { bg: "#7F898A", pale: "rgba(127,137,138,0.14)" },
  "Canceled":             { bg: "#5C5C5C", pale: "rgba(92,92,92,0.14)" },
  "Archived":             { bg: "#58595B", pale: "rgba(88,89,91,0.14)" }
};

window.SKR_COLORS = (function () {
  var anchors = [
    { h: 198, s: 90, l: 23 },  // Deep teal       ~#065577
    { h: 188, s: 45, l: 42 },  // Teal            ~#3A929D
    { h: 175, s: 75, l: 30 },  // Green-teal      ~#138980
    { h: 318, s: 25, l: 62 },  // Mauve           ~#B687AC
    { h:  40, s: 75, l: 47 },  // Brand gold      ~#D4A020
    { h:  71, s: 53, l: 50 },  // Green           ~#A2C23D
    { h:  13, s: 67, l: 47 },  // Red / orange    ~#CB4A27
    { h: 239, s: 50, l: 56 }   // Purple          ~#5E60CE
  ];
  var lightnessDeltas = [-14, -6,  2,  8, 14, 20];
  var hueShifts        = [ -8, -4,  0,  4,  8, -2];

  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
  function hsl(h, s, l) { return "hsl(" + h + ", " + s + "%, " + l + "%)"; }
  function hsla(h, s, l, a) { return "hsla(" + h + ", " + s + "%, " + l + "%, " + a + ")"; }

  var out = {};
  for (var id = 1; id <= 48; id++) {
    var ai = (id - 1) % anchors.length;
    var vi = Math.floor((id - 1) / anchors.length) % lightnessDeltas.length;
    var a  = anchors[ai];
    var L  = clamp(a.l + lightnessDeltas[vi], 18, 72);
    var H  = ((a.h + hueShifts[vi]) % 360 + 360) % 360;
    out[id] = {
      bg:    hsl(H, a.s, L),
      light: hsl(H, a.s, clamp(L + 12, 0, 82)),
      pale:  hsla(H, a.s, L, 0.14)
    };
  }
  return out;
})();
