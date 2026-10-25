/* ═══════════════════════════════════════════════════════════════════════════
   CAP SELF-ASSESSMENT FORMS — the wording, as data

   The one place the two self-assessment PDFs are written. Remove a question,
   reword a rating or add a bullet here, and both the download cards on the
   page and the generated PDF follow; cap-forms-builder.js only lays out what
   it finds below and holds no wording of its own.

   Source: the "Professional Conduct Self-Assessment" and "Professional
   Development Self-Assessment" sections of the CAP Guide draft, as already
   laid out in the two reference PDFs. One deliberate change from the draft:
   the Development plan said "professional conduct goals" where it means
   "professional development goals".

   Field names are the reference PDFs' own (conduct_rating_engagement,
   development_plan_actions, ...). Keep them stable: a filled-in copy is read
   by field name, so renaming one orphans that answer in every saved copy.

   Static text only, deliberately. Nothing about the reader goes into a form —
   no name, no email, no date — and nothing a reader types ever comes back to
   the Bridge; the PDF is built in the browser and saved straight to disk.

   Text must stay within the Windows-1252 character set (straight or curly
   quotes and dashes are fine; symbols such as arrows or checkmarks are not),
   because the PDF uses the standard Helvetica font. The builder refuses a
   character it cannot draw rather than dropping it silently.

   `goalType` is the heading of the matching goal type in the guide text
   (cap_guide_items, both the Team Member and Leader versions). The guide
   puts a download link under the list item that starts with it; spacing,
   hyphens and case are ignored when matching.

   Block types, in the order the builder draws them:
     { type: "text",   text }                      a paragraph
     { type: "list",   label?, items }             a bullet list
     { type: "rating", field, number, title, description }
                                                   one area, three radio buttons
     { type: "answer", field, number?, title?, prompts?, examples?, height? }
                                                   a question and its text box;
                                                   examples is { label, items },
                                                   a list drawn between the two
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  /* The three ratings, shared by every rating area. `value` is the radio
     option's export value in the PDF (match the reference: Exceeds / Meets /
     Needs) and should not change; `label` and `detail` are wording. */
  var RATING_LEVELS = [
    { value: "Exceeds", label: "Exceeds expectations", detail: "top 10% performance, unusually effective" },
    { value: "Meets", label: "Meets expectations", detail: "middle 60% performance, good, no need for adjustment" },
    { value: "Needs", label: "Needs improvement", detail: "bottom 30% performance, requires adjustment or development" },
  ];

  var FEEDBACK_INTRO_2 = "This feedback will be critical in setting your goals in the next step. Discuss " +
    "potential goals and collect your supervisor's insight. Ask them for directions to guide your focus.";
  var PLAN_INTRO = "Use your self-assessment, reflection, and the feedback you've received to answer the " +
    "following questions:";
  var INSIGHTS = "What were your overall insights and impressions from completing this exercise?";
  var GOAL_RULES = [
    "Focus on a specific capability, skill, or area of growth",
    "Include clear actions or development activities",
    "Be measurable whenever possible",
  ];
  var CLOSING = "Share your goals with your supervisor and request approval or further feedback so you can " +
    "revise. Once they have reviewed and approved your goals, they are ready to be added to @work.";

  function howTo(hasRatings) {
    return [
      "Open this file on a computer in Adobe Acrobat Reader, Chrome, Edge or Mac Preview. You do not need " +
        "Acrobat Pro.",
      "Click a box and type. Boxes scroll if your answer is long." +
        (hasRatings ? " Pick one circle for each rating." : ""),
      "Save often. When you finish, save a copy to your device (if asked, choose to save with your " +
        "changes). Print it or send it to your supervisor if you like.",
      "Nothing you type is sent anywhere. The Bridge does not store your answers, so keep your own copy.",
    ];
  }

  function goals(prefix) {
    return [
      { type: "answer", field: prefix + "_goal_1", title: "Goal 1", height: 70 },
      { type: "answer", field: prefix + "_goal_2", title: "Goal 2", height: 70 },
      { type: "answer", field: prefix + "_goal_3", title: "Goal 3 (Optional)", height: 70 },
    ];
  }

  var conduct = {
    id: "conduct",
    fileName: "Professional-Conduct-Self-Assessment.pdf",
    title: "Professional Conduct Self-Assessment",
    subtitle: "Behavior Assessment - 1 of 2",
    goalType: "Behavior based goals",
    summary: "Rate yourself in five areas of professional conduct, reflect on the results, gather your " +
      "supervisor's feedback, and draft 2 to 3 conduct goals.",
    purpose: "Purpose: Assess your professional conduct from the past year and identify your strengths and " +
      "areas of improvement, to set goals for the coming year, under the guidance of your supervisor.",
    identity: { name: "conduct_name", supervisor: "conduct_supervisor", date: "conduct_date" },
    howTo: howTo(true),
    ratingScale: { intro: "Rating scale: use the following scale to rate your conduct", levels: RATING_LEVELS },
    steps: [
      {
        title: "Step 1: Assess",
        blocks: [
          { type: "rating", field: "conduct_rating_engagement", number: 1, title: "Engagement",
            description: "Demonstrates consistent engagement through timely responses, reliable calendar " +
              "management, and clear availability. Stays attentive to requests, follows through promptly, and " +
              "uses agreed upon channels to remain informed and accessible." },
          { type: "rating", field: "conduct_rating_ownership", number: 2, title: "Ownership",
            description: "Takes responsibility for outcomes by showing initiative, anticipating needs, and " +
              "driving work forward without requiring constant direction. Identifies problems early and brings " +
              "forward thoughtful, viable solutions rather than merely escalating issues." },
          { type: "rating", field: "conduct_rating_proficiency", number: 3, title: "Proficiency",
            description: "Maintains and effectively applies the knowledge, skills, tools, and systems required " +
              "for the role. Demonstrates competence within their area of responsibility and pursues continual " +
              "improvement as expectations evolve." },
          { type: "rating", field: "conduct_rating_adaptability", number: 4, title: "Adaptability",
            description: "Responds constructively to change by adjusting priorities, processes, or approaches " +
              "as needed. Manages transitions effectively, remains flexible in the face of uncertainty, and " +
              "supports others through change." },
          { type: "rating", field: "conduct_rating_collaboration", number: 5, title: "Collaboration",
            description: "Communicates clearly and appropriately, keeps relevant stakeholders informed, and " +
              "works productively with others to achieve shared outcomes. Contributes positively to team " +
              "dynamics and cross functional efforts." },
        ],
      },
      {
        title: "Step 2: Reflect",
        blocks: [
          { type: "answer", field: "conduct_reflect_strengths", number: 1, title: "Strengths",
            prompts: ["Based on your assessment above, which areas are you doing well in?",
              "Where are your areas of strength?"] },
          { type: "answer", field: "conduct_reflect_opportunities", number: 2, title: "Opportunities for improvement",
            prompts: ["Based on your assessment above, in which areas do you need to develop further?",
              "Where do you need the most improvement?"] },
          { type: "answer", field: "conduct_reflect_insights", number: 3, title: "Insights & impressions",
            prompts: [INSIGHTS] },
        ],
      },
      {
        title: "Step 3: Feedback",
        blocks: [
          { type: "text", text: "Meet your supervisor and review your assessment and reflections. Ask them for " +
            "honest and productive feedback on your professional behavior." },
          { type: "text", text: FEEDBACK_INTRO_2 },
          { type: "list", label: "Discuss:", items: [
            "Examples and accomplishments that demonstrate strong engagement",
            "How consistently you take ownership and follow through on outcomes",
            "Your proficiency in the knowledge, skills, tools, and systems required for your role",
            "How effectively you adapt to changing priorities, processes, and expectations",
            "How well you collaborate, communicate, and keep stakeholders informed",
            "Specific professional conduct goals and actions to focus on in the coming year",
          ] },
          { type: "answer", field: "conduct_feedback_general", title: "General feedback for this area" },
          { type: "answer", field: "conduct_feedback_directives", title: "Directives for goal planning" },
        ],
      },
      {
        title: "Step 4: Plan",
        blocks: [
          { type: "text", text: PLAN_INTRO },
          { type: "answer", field: "conduct_plan_growth_areas", number: 1,
            prompts: ["Looking at your opportunities for improvement, identify one or two specific areas where " +
              "you want to grow your capacities."] },
          { type: "answer", field: "conduct_plan_use_strengths", number: 2,
            prompts: ["List some specific ways you can use your identified strengths to help improve the areas " +
              "you identified in question 1."] },
          { type: "answer", field: "conduct_plan_actions", number: 3,
            prompts: ["What other specific actions could help you develop in your identified areas?"] },
          { type: "text", text: "Use your answers to these questions to develop 2 to 3 professional conduct " +
            "goals to focus on for next year." },
          { type: "list", label: "Each goal should:", items: GOAL_RULES },
        ].concat(goals("conduct")),
      },
    ],
    closing: CLOSING,
  };

  var development = {
    id: "development",
    fileName: "Professional-Development-Self-Assessment.pdf",
    title: "Professional Development Self-Assessment",
    subtitle: null,
    goalType: "Development based goals",
    summary: "Reflect on where your goals focus, gather your supervisor's feedback on your growth, and draft " +
      "2 to 3 development goals for the coming year.",
    purpose: "Purpose: Reflect on your development, gather meaningful feedback, and create intentional goals " +
      "that support both your current effectiveness and future growth, under the guidance of your supervisor.",
    identity: { name: "development_name", supervisor: "development_supervisor", date: "development_date" },
    howTo: howTo(false),
    ratingScale: null,
    steps: [
      {
        title: "Step 1: Reflect",
        blocks: [
          { type: "text", text: "Reflect on your Results assessment, Behavior assessments, and the goals you have " +
            "set in those areas. Review your job description, or your role inventory if your job description " +
            "is not available." },
          { type: "text", text: "Consider how fully your goals reflect the stewardships and expectations of your role." },
          { type: "answer", field: "development_reflect_focus", number: 1, title: "Focus areas",
            prompts: ["Based on your Results and Behavior goals, which areas of your role are you most focused on?"] },
          { type: "answer", field: "development_reflect_opportunities", number: 2,
            title: "Opportunities for improvement",
            prompts: ["Based on your Results and Behavior goals, which areas of your role have not received " +
              "enough or any focus in your goals?", "What areas would benefit from more consideration?"] },
          { type: "answer", field: "development_reflect_insights", number: 3, title: "Insights & impressions",
            prompts: [INSIGHTS] },
        ],
      },
      {
        title: "Step 2: Feedback",
        blocks: [
          { type: "text", text: "Meet your supervisor and review your reflections. Ask them for honest and " +
            "productive feedback on your professional development." },
          { type: "text", text: FEEDBACK_INTRO_2 },
          { type: "list", label: "Discuss:", items: [
            "Your key development accomplishments",
            "Areas where additional growth would be beneficial",
            "Future opportunities, assignments, projects, or experiences that could accelerate your development",
            "Skills and capabilities that will be most valuable in the coming year",
            "Ideas for behavior goals",
            "Specific goals you should focus on",
          ] },
          { type: "answer", field: "development_feedback_general", title: "General feedback for this area" },
          { type: "answer", field: "development_feedback_directives", title: "Directives for goal planning" },
        ],
      },
      {
        title: "Step 3: Plan",
        blocks: [
          { type: "text", text: PLAN_INTRO },
          { type: "answer", field: "development_plan_capabilities", number: 1,
            prompts: ["What one or two specific capabilities, skills, or areas of expertise do you most want to " +
              "develop during the coming year?"] },
          { type: "answer", field: "development_plan_use_strengths", number: 2,
            prompts: ["How can you use your existing strengths to accelerate growth in these areas?"] },
          { type: "answer", field: "development_plan_actions", number: 3,
            prompts: ["What specific actions will help you develop?"],
            examples: { label: "Examples:", items: [
              "Stretch assignments",
              "New responsibilities",
              "Training or coursework",
              "Certifications",
              "Reading and research",
              "Mentoring or coaching",
              "Conferences or professional communities",
              "Cross-functional projects",
            ] } },
          // The draft read "professional conduct goals" here, copied from the
          // Conduct form; this form's goals are development goals.
          { type: "text", text: "Use your answers to these questions to develop 2 to 3 professional development " +
            "goals to focus on for next year." },
          { type: "list", label: "Each goal should:", items: GOAL_RULES.concat([
            "Support both current role effectiveness and future contribution",
          ]) },
        ].concat(goals("development")),
      },
    ],
    closing: CLOSING,
  };

  window.CAP_FORMS = { conduct: conduct, development: development };
  window.CAP_FORMS_ORDER = ["conduct", "development"];
})();
