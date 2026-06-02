/* ═══════════════ OKR PROGRESS — DATA ═══════════════
   Source: monthly OKR report (Sheet1)
   Columns: OKR, Key Result, Sub-Key Result, Period, Stakeholder,
            Project Manager, Progress, Planned Progress, Status,
            Trend, Comment, Update Date
   Progress / Planned Progress are stored as 0–1 fractions.
   ══════════════════════════════════════════════════════════ */

window.OKR_PROGRESS_ROWS = [
  { id: 1,  okr: "Clarify and refine the Student Services organization", keyResult: "Implement performance evaluation and professional development plans", subKeyResult: "Implement professional development plans for all Student Service employees to begin being utilized by each team member in Q4", period: "Annual - 2026", stakeholder: "Ben Packer", projectManager: "Jess Swinburne", progress: 0.15, plannedProgress: 1, status: "On Track", trend: null, comment: null, updateDate: null },
  { id: 2,  okr: "Clarify and refine the Student Services organization", keyResult: "Implement performance evaluation and professional development plans", subKeyResult: "Design and implement revised performance evaluation program by September 1 to be conducted with each team member in Q4", period: "Annual - 2026", stakeholder: "Ben Packer", projectManager: "Jess Swinburne", progress: 0.30, plannedProgress: 1, status: "On Track", trend: null, comment: null, updateDate: null },
  { id: 3,  okr: "Clarify and refine the Student Services organization", keyResult: "Create Student Services team member awareness & role development", subKeyResult: "Student Services Survey Results: Confusion of Student Services Roles (other departments)", period: "Annual - 2026", stakeholder: "Ben Packer", projectManager: "Jess Swinburne", progress: 0.09, plannedProgress: 0.09, status: "On Track", trend: null, comment: null, updateDate: null },
  { id: 4,  okr: "Clarify and refine the Student Services organization", keyResult: "Create Student Services team member awareness & role development", subKeyResult: "Student Services Survey Results: Access to Resources", period: "Annual - 2026", stakeholder: "Ben Packer", projectManager: "Jess Swinburne", progress: 0.84, plannedProgress: 0.90, status: "On Track", trend: null, comment: null, updateDate: null },
  { id: 5,  okr: "Clarify and refine the Student Services organization", keyResult: "Create Student Services team member awareness & role development", subKeyResult: "Student Services Survey Results: Role Clarity", period: "Annual - 2026", stakeholder: "Ben Packer", projectManager: "Jess Swinburne", progress: 0.94, plannedProgress: 0.90, status: "On Track", trend: null, comment: null, updateDate: null },
  { id: 6,  okr: "Clarify and refine the Student Services organization", keyResult: "Create Student Services team member awareness & role development", subKeyResult: "Student Services Survey Results: Workload", period: "Annual - 2026", stakeholder: "Ben Packer", projectManager: "Jess Swinburne", progress: 0.70, plannedProgress: 0.90, status: "On Track", trend: null, comment: null, updateDate: null },
  { id: 7,  okr: "Clarify and refine the Student Services organization", keyResult: "Develop plans and documentation for role and process definition, succession, and scalability", subKeyResult: "Scalability plans for each Student Services Department are created and stored in a central repository", period: "Annual - 2026", stakeholder: "Ben Packer", projectManager: "Jess Swinburne", progress: 0.60, plannedProgress: 1, status: "On Track", trend: null, comment: null, updateDate: null },
  { id: 8,  okr: "Clarify and refine the Student Services organization", keyResult: "Develop plans and documentation for role and process definition, succession, and scalability", subKeyResult: "Succession plans for each Full Time Employee are created and stored in a central repository", period: "Annual - 2026", stakeholder: "Ben Packer", projectManager: "Jess Swinburne", progress: 0.46, plannedProgress: 1, status: "On Track", trend: null, comment: null, updateDate: null },
  { id: 9,  okr: "Clarify and refine the Student Services organization", keyResult: "Develop plans and documentation for role and process definition, succession, and scalability", subKeyResult: "Process documentation is assessed, created or updated if necessary, and stored in a central repository.", period: "Annual - 2026", stakeholder: "Ben Packer", projectManager: "Jess Swinburne", progress: 0.18, plannedProgress: 1, status: "On Track", trend: null, comment: null, updateDate: null },
  { id: 10, okr: "Clarify and refine the Student Services organization", keyResult: "Develop plans and documentation for role and process definition, succession, and scalability", subKeyResult: "Team and position descriptions, and KPIs are recorded and made available.", period: "Q1 - 2026", stakeholder: "Ben Packer", projectManager: "Jess Swinburne", progress: 1, plannedProgress: 1, status: "Completed", trend: null, comment: null, updateDate: null },

  { id: 11, okr: "Enable enrollment scaling", keyResult: "Ensure students can get a transcript in a timely manner", subKeyResult: "Transcript ADOs (bugs) will be eliminated by June 1, allowing us to run clean transcripts", period: "Jan 01 - Jun 01", stakeholder: "Mark Gefrom", projectManager: "Moses Abioye", progress: 0.16, plannedProgress: 0.05, status: null, trend: null, comment: null, updateDate: null },
  { id: 12, okr: "Enable enrollment scaling", keyResult: "Ensure students can get a transcript in a timely manner", subKeyResult: "More than 90% of students can receive a transcript within 10 days starting April 6", period: "Jan 01 - Jun 30", stakeholder: "Mark Gefrom", projectManager: "Moses Abioye", progress: 0.93, plannedProgress: 0.90, status: null, trend: "Trending up", comment: null, updateDate: null },
  { id: 13, okr: "Enable enrollment scaling", keyResult: "Create student satisfaction and enrollment scalability by successfully deploying the Companion App", subKeyResult: "Companion app will serve as the primary service interface for a majority of students by Block 6, 2026", period: "Q4 - 2026", stakeholder: "Jacob Adams", projectManager: "David Koomson", progress: null, plannedProgress: null, status: "Not Started", trend: null, comment: null, updateDate: null },
  { id: 14, okr: "Enable enrollment scaling", keyResult: "Create student satisfaction and enrollment scalability by successfully deploying the Companion App", subKeyResult: "Companion app will maintain a C-Sat of 85%", period: "Annual - 2026", stakeholder: "Jacob Adams", projectManager: "David Koomson", progress: 0.87, plannedProgress: 0.85, status: null, trend: "Trending up", comment: null, updateDate: null },
  { id: 15, okr: "Enable enrollment scaling", keyResult: "Create student satisfaction and enrollment scalability by successfully deploying the Companion App", subKeyResult: "Prepare Companion app to provide end-to-end services and be made available to all students by July 1", period: "Annual - 2026", stakeholder: "Jacob Adams", projectManager: "David Koomson", progress: 0.86, plannedProgress: 1, status: "On Track", trend: null, comment: null, updateDate: null },
  { id: 16, okr: "Enable enrollment scaling", keyResult: "Create student satisfaction and enrollment scalability by successfully deploying the Companion App", subKeyResult: "With ICS, create and implement operational resilience within the Companion app by May 18", period: "Annual - 2026", stakeholder: "Jacob Adams", projectManager: "David Koomson", progress: 0.98, plannedProgress: 1, status: "On Track", trend: null, comment: null, updateDate: null },
  { id: 17, okr: "Enable enrollment scaling", keyResult: "Complete IT development roadmaps to provide effective, scalable services", subKeyResult: "Complete Admissions ITD roadmap of essential features for scale", period: "Annual - 2026", stakeholder: "Trevor Shelton", projectManager: "Moses Abioye", progress: 0.22, plannedProgress: 1, status: "On Track", trend: null, comment: null, updateDate: null },
  { id: 18, okr: "Enable enrollment scaling", keyResult: "Complete IT development roadmaps to provide effective, scalable services", subKeyResult: "Complete Planning and Registration ITD roadmap of essential features for scale", period: "Annual - 2026", stakeholder: "Mark Gefrom", projectManager: "Moses Abioye", progress: 0.38, plannedProgress: 1, status: "At Risk", trend: null, comment: null, updateDate: null },
  { id: 19, okr: "Enable enrollment scaling", keyResult: "Complete IT development roadmaps to provide effective, scalable services", subKeyResult: "Complete Student Support ITD roadmap of essential features for scale", period: "Annual - 2026", stakeholder: "Mark Gefrom", projectManager: "Moses Abioye", progress: 0.47, plannedProgress: 1, status: "At Risk", trend: null, comment: null, updateDate: null },
  { id: 20, okr: "Enable enrollment scaling", keyResult: "KPIs demonstrate high-quality, scalable performance", subKeyResult: "Achieve 75% customer satisfaction among domestic students by Term 6, 2026", period: "Annual - 2026", stakeholder: "Mark Gefrom", projectManager: "Victor Elerunndu", progress: 0.69, plannedProgress: 0.75, status: "On Track", trend: null, comment: null, updateDate: null },
  { id: 21, okr: "Enable enrollment scaling", keyResult: "KPIs demonstrate high-quality, scalable performance", subKeyResult: "Over 90% of tickets will be resolved within 5 days by Term 4, 2026", period: "Annual - 2026", stakeholder: "Mark Gefrom", projectManager: "Victor Elerunndu", progress: 0.72, plannedProgress: 0.90, status: "On Track", trend: null, comment: null, updateDate: null },
  { id: 22, okr: "Enable enrollment scaling", keyResult: "KPIs demonstrate high-quality, scalable performance", subKeyResult: "Achieve 85% student autonomy on all inbound issue tickets by Term 6, 2026", period: "Annual - 2026", stakeholder: "Mark Gefrom", projectManager: "Victor Elerunndu", progress: 0.66, plannedProgress: 0.85, status: "On Track", trend: null, comment: null, updateDate: null },
  { id: 23, okr: "Enable enrollment scaling", keyResult: "KPIs demonstrate high-quality, scalable performance", subKeyResult: "Achieve 75% PC New yield from admission to registration", period: "Annual - 2026", stakeholder: "Alison Cundiff", projectManager: "James Etukudo", progress: 0.69, plannedProgress: 0.75, status: "On Track", trend: null, comment: null, updateDate: null },

  { id: 24, okr: "Reach retention goals through targeted initiatives", keyResult: "Plan and carry out missionary domestic mentoring pilot by Block 5, 2026", subKeyResult: "Missionary domestic mentoring pilot planning", period: "Jun 1 - Dec 30", stakeholder: "Alison Cundiff", projectManager: "James Etukudo", progress: null, plannedProgress: null, status: "Not Started", trend: null, comment: null, updateDate: null },
  { id: 25, okr: "Reach retention goals through targeted initiatives", keyResult: "Optimize success network roles and strengthen the analytics engine", subKeyResult: "Mentors will be assessed for retention effectiveness by Block 5, 2026.", period: "Annual - 2026", stakeholder: "Alison Cundiff", projectManager: "James Etukudo", progress: 0.05, plannedProgress: 1, status: "On Track", trend: null, comment: null, updateDate: null },
  { id: 26, okr: "Reach retention goals through targeted initiatives", keyResult: "Optimize success network roles and strengthen the analytics engine", subKeyResult: "AI outreach will be activated and assessed for effectiveness by Block 2, 2026", period: "Annual - 2026", stakeholder: "Alison Cundiff", projectManager: "James Etukudo", progress: 0.57, plannedProgress: 1, status: "At Risk", trend: null, comment: null, updateDate: null },
  { id: 27, okr: "Reach retention goals through targeted initiatives", keyResult: "Optimize success network roles and strengthen the analytics engine", subKeyResult: "All Success Network and AI outreach will be concurrently assessed for effectiveness, refined, and revised on a continual upward cycle by Block 5, 2026", period: "Annual - 2026", stakeholder: "Jacob Adams", projectManager: "David Koomson", progress: 0.76, plannedProgress: 1, status: "On Track", trend: null, comment: null, updateDate: null },
  { id: 28, okr: "Reach retention goals through targeted initiatives", keyResult: "Launch new student orientation to increase 2nd term retention", subKeyResult: "Demonstrate a 3-point 2nd term retention increase for an orientation experimental group", period: "Annual - 2026", stakeholder: "Alison Cundiff", projectManager: "James Etukudo", progress: null, plannedProgress: null, status: "Not Started", trend: null, comment: null, updateDate: null },
  { id: 29, okr: "Reach retention goals through targeted initiatives", keyResult: "Launch new student orientation to increase 2nd term retention", subKeyResult: "Develop, pilot and scale new student orientation content", period: "Jan 01 - Jun 30", stakeholder: "Rachel Kirk", projectManager: "James Etukudo", progress: 0.97, plannedProgress: 1, status: "On Track", trend: null, comment: null, updateDate: null },
  { id: 30, okr: "Reach retention goals through targeted initiatives", keyResult: "Achieve retention & completion KPIs", subKeyResult: "Achieve 40% C1 Completion", period: "Annual - 2026", stakeholder: "Alison Cundiff", projectManager: "James Etukudo", progress: 0.33, plannedProgress: 0.40, status: "On Track", trend: null, comment: null, updateDate: null },
  { id: 31, okr: "Reach retention goals through targeted initiatives", keyResult: "Achieve retention & completion KPIs", subKeyResult: "Achieve 55% C&D 4-term Retention", period: "Annual - 2026", stakeholder: "Alison Cundiff", projectManager: "James Etukudo", progress: 0.48, plannedProgress: 0.55, status: "On Track", trend: null, comment: null, updateDate: null },
  { id: 32, okr: "Reach retention goals through targeted initiatives", keyResult: "Achieve retention & completion KPIs", subKeyResult: "Achieve 45% PC Completion", period: "Annual - 2026", stakeholder: "Alison Cundiff", projectManager: "James Etukudo", progress: 0.36, plannedProgress: 0.45, status: "On Track", trend: null, comment: null, updateDate: null }
];

/* OKR brand colors — keyed off the OKR theme, drawn from BYU-Pathway palette. */
window.OKR_COLORS = {
  "Clarify and refine the Student Services organization": { bg: "#3A929D", light: "#5BAEB8", pale: "rgba(58,146,157,0.12)" },
  "Enable enrollment scaling":                              { bg: "#065577", light: "#28738A", pale: "rgba(6,85,119,0.12)" },
  "Reach retention goals through targeted initiatives":     { bg: "#B687AC", light: "#CFA4C5", pale: "rgba(182,135,172,0.12)" }
};

/* Status colors — neutral semantic palette tuned for light + dark themes. */
window.STATUS_COLORS = {
  "On Track":    { bg: "#2E9E5C", pale: "rgba(46,158,92,0.14)" },
  "At Risk":     { bg: "#E08A1E", pale: "rgba(224,138,30,0.14)" },
  "In Trouble":  { bg: "#D14545", pale: "rgba(209,69,69,0.14)" },
  "Completed":   { bg: "#065577", pale: "rgba(6,85,119,0.14)" },
  "Not Started": { bg: "#7F898A", pale: "rgba(127,137,138,0.14)" },
  "Archived":    { bg: "#58595B", pale: "rgba(88,89,91,0.14)" }
};

/* ─────────────────────────────────────────────────────────────────────────
   SKR_COLORS — one distinct, brand-derived color per Sub-Key Result.

   Generated from 8 BYU-Pathway HSL anchors (deep teal, teal, green-teal,
   mauve, gold, green, red-orange, purple) × 4 lightness/hue variants. The
   8 anchors cycle on the inner loop so consecutive SKR ids land on
   maximally-different hues, then the 4 variants nudge lightness/hue to
   keep each of the 32 results visually distinct while staying inside the
   brand palette.

   Keyed by `id` so each SKR keeps the same color across the monthly data
   refresh. Same hex in light + dark mode (matches OKR_COLORS behavior).
   ───────────────────────────────────────────────────────────────────── */
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
  var lightnessDeltas = [-12, -3, 6, 14];
  var hueShifts        = [ -6,  0, 4, -2];

  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
  function hsl(h, s, l) { return "hsl(" + h + ", " + s + "%, " + l + "%)"; }
  function hsla(h, s, l, a) { return "hsla(" + h + ", " + s + "%, " + l + "%, " + a + ")"; }

  var out = {};
  for (var id = 1; id <= 32; id++) {
    var ai = (id - 1) % anchors.length;
    var vi = Math.floor((id - 1) / anchors.length) % lightnessDeltas.length;
    var a  = anchors[ai];
    var L  = clamp(a.l + lightnessDeltas[vi], 18, 70);
    var H  = ((a.h + hueShifts[vi]) % 360 + 360) % 360;
    out[id] = {
      bg:    hsl(H, a.s, L),
      light: hsl(H, a.s, clamp(L + 12, 0, 82)),
      pale:  hsla(H, a.s, L, 0.14)
    };
  }
  return out;
})();
