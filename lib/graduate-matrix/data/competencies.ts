import type { CompetencyDefinition } from "../../../types/graduate-matrix";

export const COMPETENCY_DEFINITIONS = [
  {
    id: "mcibse-a1",
    reference: "A1",
    area: "Engineering knowledge & technical understanding",
    objective:
      "Maintain and extend a sound theoretical approach to building services engineering, keeping pace with current and emerging technologies relevant to the graduate's developing role.",
    behaviours:
      "Demonstrates current understanding of HVAC, electrical, public health, lighting, controls, and building physics principles applicable to assigned work. Actively expands knowledge through structured learning, technical reading, and workplace application.",
    levelExpectation: "IEng: L4 · CEng: L4–L5",
    evidenceExamples:
      "CPD records; technical reading log; in-house training; CIBSE Guides referenced in design notes; reflective accounts on emerging tech.",
    assessmentMethods:
      "Mentor review; quarterly portfolio review; technical interview at annual panel.",
    frequency: "Quarterly",
    relevance:
      "CEng candidates must show breadth and depth; IEng candidates show applied knowledge within established techniques.",
    notes:
      "Confirmed against CIBSE MCIBSE/FCIBSE Competence Criteria Framework, Aug 24 v2.",
  },
  {
    id: "mcibse-a2",
    reference: "A2",
    area: "Design, analysis & problem solving",
    objective:
      "Develop engineering solutions to unusual, complex, or higher-risk problems by applying knowledge, research, analysis, and integration of multiple technologies.",
    behaviours:
      "Identifies non-standard design challenges; applies appropriate analytical techniques (dynamic simulation, CFD, load analysis); integrates multidisciplinary inputs; evaluates risk; proposes justified solutions.",
    levelExpectation: "IEng: L3–L4 · CEng: L4–L5",
    evidenceExamples:
      "Design calculations; IES/TAS/Hevacomp/Revit MEP outputs; technical research notes; design option appraisals; risk-weighted recommendations.",
    assessmentMethods:
      "Mentor sign-off on calcs; senior engineer technical review; portfolio review; presentation at annual panel.",
    frequency: "Project milestones + Quarterly",
    relevance:
      "Primary differentiator between IEng and CEng. CEng requires innovation and complex/unfamiliar problem handling.",
    notes: "Confirmed against Aug 24 v2 source.",
  },
  {
    id: "mcibse-b1",
    reference: "B1",
    area: "Design, analysis & problem solving",
    objective:
      "Take an active role in identifying and defining project requirements, technical problems, and improvement opportunities.",
    behaviours:
      "Reviews briefs and specifications; questions assumptions; identifies user requirements; flags technical risks; proposes alternative approaches; considers new/emerging technologies.",
    levelExpectation: "IEng: L3–L4 · CEng: L4–L5",
    evidenceExamples:
      "Brief review notes; client requirement summaries; tender review comments; risk register entries; specification drafts.",
    assessmentMethods:
      "Mentor review; line manager sign-off; project manager feedback; portfolio review.",
    frequency: "Project milestones",
    relevance:
      "CEng candidates expected to lead problem identification; IEng candidates to contribute actively.",
    notes: "Confirmed against Aug 24 v2 source.",
  },
  {
    id: "mcibse-b2",
    reference: "B2",
    area: "Design, analysis & problem solving",
    objective:
      "Identify and conduct appropriate investigations, research, design, and analysis to complete engineering tasks, balancing cost, quality, safety, sustainability, security (incl. cyber), accessibility, and environmental impact.",
    behaviours:
      "Selects appropriate analytical methods; carries out simulations, calculations, or physical tests; documents results; prepares justified design recommendations accounting for the full set of constraints listed.",
    levelExpectation: "IEng: L3–L4 · CEng: L4–L5",
    evidenceExamples:
      "Design reports; calculation packages; simulation outputs; comparative option studies; specifications; drawings/models; cyber-security considerations.",
    assessmentMethods:
      "Senior engineer technical review; mentor sign-off; portfolio review; technical interview.",
    frequency: "Project milestones + Quarterly",
    relevance:
      "Evidence should show breadth of factors considered, not just technical correctness.",
    notes: "Confirmed against Aug 24 v2 source.",
  },
  {
    id: "mcibse-b3",
    reference: "B3",
    area: "Design, analysis & problem solving",
    objective:
      "Implement engineering tasks and evaluate the effectiveness of engineering solutions, including lessons learned and lifecycle considerations.",
    behaviours:
      "Sees designs through to installation and commissioning; conducts site inspections; reviews installed performance against intent; captures lessons learned.",
    levelExpectation: "IEng: L3–L4 · CEng: L4–L5",
    evidenceExamples:
      "Site inspection records; commissioning witness records; snagging reports; POE data; lessons-learned register entries; Soft Landings reports.",
    assessmentMethods:
      "Site supervisor observation; mentor review; portfolio review.",
    frequency: "Project milestones",
    relevance:
      "Frequently weakest area in graduate portfolios — engineer deliberate site/commissioning exposure.",
    notes: "Confirmed against Aug 24 v2 source.",
  },
  {
    id: "mcibse-c1",
    reference: "C1",
    area: "Project delivery & commercial awareness",
    objective:
      "Plan the work and resources needed to enable effective implementation of a significant engineering task or project, including budgets, programmes, risk, and stakeholder arrangements.",
    behaviours:
      "Prepares fee/resource estimates for own work packages; contributes to project programmes; identifies risks and mitigations; participates in stakeholder negotiations.",
    levelExpectation: "IEng: L3–L4 · CEng: L4–L5",
    evidenceExamples:
      "Resource plans; fee build-ups; programme inputs; risk registers; method statements; meeting minutes; stakeholder correspondence.",
    assessmentMethods:
      "Project manager feedback; line manager sign-off; mentor review.",
    frequency: "Project milestones",
    relevance:
      "Commercial awareness often under-evidenced. Encourage graduates to attend fee meetings from Year 2.",
    notes: "Confirmed against Aug 24 v2 source.",
  },
  {
    id: "mcibse-c2",
    reference: "C2",
    area: "Project delivery & commercial awareness",
    objective:
      "Manage (organise, direct, control), programme, budget, and resource elements of a significant engineering task or project, balancing quality, cost, and time.",
    behaviours:
      "Manages own workload against budget and programme; monitors hours against fee; raises early warnings; maintains quality standards; interfaces with stakeholders.",
    levelExpectation: "IEng: L3–L4 · CEng: L4–L5",
    evidenceExamples:
      "Project tracking sheets; fee/spend reports; QA records; client correspondence; contractor RFI responses; change-control documentation.",
    assessmentMethods:
      "Project manager 360 feedback; line manager review; portfolio review.",
    frequency: "Quarterly + Project milestones",
    relevance:
      "CEng candidates manage significant elements independently; IEng manage defined packages.",
    notes: "Confirmed against Aug 24 v2 source.",
  },
  {
    id: "mcibse-c3",
    reference: "C3",
    area: "Leadership, teamwork & management",
    objective:
      "Lead teams or technical specialisms and assist others to meet changing technical and managerial needs.",
    behaviours:
      "Sets and agrees objectives with juniors/interns; reinforces professional standards; supports others' development; provides feedback; shares specialist knowledge.",
    levelExpectation: "IEng: L3–L4 · CEng: L4–L5",
    evidenceExamples:
      "Mentoring records for placement/intern students; technical CPD presentations delivered; team meeting minutes; STEM ambassador activity.",
    assessmentMethods:
      "Mentor review; line manager sign-off; mentee feedback; presentation observation.",
    frequency: "Annually + Project milestones",
    relevance:
      "Leadership is not dependent on formal line management. Provide deliberate opportunities to lead workstreams.",
    notes: "Confirmed against Aug 24 v2 source.",
  },
  {
    id: "mcibse-c4",
    reference: "C4",
    area: "Digital engineering, innovation & continuous improvement",
    objective:
      "Bring about continuous quality improvement and promote best practice within the team and wider organisation (including digital engineering and BIM workflows).",
    behaviours:
      "Identifies process improvements; contributes to QA system development; participates in lessons-learned; promotes use of digital tools (BIM, parametric design, automation); shares knowledge.",
    levelExpectation: "IEng: L3–L4 · CEng: L4–L5",
    evidenceExamples:
      "QMS improvement suggestions; lessons-learned contributions; Dynamo/Grasshopper scripts; BIM workflow improvements; ISO 9001 audit participation.",
    assessmentMethods:
      "Mentor review; QA manager sign-off; portfolio review.",
    frequency: "Annually",
    relevance:
      "Digital framing is a modern company addition; quality/best-practice is CIBSE-aligned.",
    notes: "Confirm acceptable digital evidence with CIBSE assessor.",
  },
  {
    id: "mcibse-d1",
    reference: "D1",
    area: "Communication & professional collaboration",
    objective:
      "Communicate effectively with others, at all levels, in English — including technical and non-technical audiences.",
    behaviours:
      "Prepares clear reports, drawings, specifications, and emails; participates in meetings; chairs internal meetings; explains technical content to non-technical clients.",
    levelExpectation: "IEng: L4 · CEng: L4–L5",
    evidenceExamples:
      "Technical reports authored; specifications drafted; meeting minutes chaired; client-facing presentations; CIBSE YEN participation.",
    assessmentMethods:
      "Direct observation; mentor review; client feedback; portfolio review.",
    frequency: "Quarterly",
    relevance:
      "Continuous competence — evidence should be cumulative throughout the scheme.",
    notes: "Confirmed against Aug 24 v2 source.",
  },
  {
    id: "mcibse-d2",
    reference: "D2",
    area: "Communication & professional collaboration",
    objective:
      "Clearly present and discuss proposals, justifications, and conclusions to varied audiences.",
    behaviours:
      "Delivers internal CPD presentations; presents design proposals to clients/contractors; contributes to bids; writes articles or technical notes.",
    levelExpectation: "IEng: L3–L4 · CEng: L4–L5",
    evidenceExamples:
      "Presentation slides + recordings; bid contribution evidence; published articles or internal whitepapers; conference attendance.",
    assessmentMethods:
      "Presentation observation; portfolio review; annual panel presentation.",
    frequency: "Annually + Project milestones",
    relevance:
      "Annual panel presentation is a strong vehicle for D2 evidence.",
    notes: "Confirmed against Aug 24 v2 source.",
  },
  {
    id: "mcibse-d3",
    reference: "D3",
    area: "Communication & professional collaboration",
    objective:
      "Demonstrate personal and social skills, emotional intelligence, and awareness of diversity and inclusion issues.",
    behaviours:
      "Manages own emotions and workload pressures; adapts to new interpersonal situations; builds productive working relationships; resolves minor conflicts; demonstrates active inclusion.",
    levelExpectation: "IEng: L3–L4 · CEng: L4–L5",
    evidenceExamples:
      "Reflective accounts; 360 feedback summaries; EDI training; conflict resolution case studies; team retrospective contributions.",
    assessmentMethods:
      "Mentor review; line manager observation; 360 feedback; reflective portfolio entries.",
    frequency: "Quarterly",
    relevance:
      "Reflective writing is critical — coach graduates in structured reflection.",
    notes: "Confirmed against Aug 24 v2 source.",
  },
  {
    id: "mcibse-e1",
    reference: "E1",
    area: "Health, safety, risk & regulatory compliance",
    objective:
      "Understand and comply with relevant codes of conduct, legislation, and regulatory frameworks, including CIBSE's Code of Professional Conduct.",
    behaviours:
      "Articulates the CIBSE Code; identifies aspects relevant to current role; demonstrates awareness of Building Regulations, CDM 2015, Building Safety Act 2022, fire safety regulations.",
    levelExpectation: "IEng: L4 · CEng: L4–L5",
    evidenceExamples:
      "Signed acknowledgement of CIBSE Code; CPD on regulatory updates; project notes referencing relevant regulations; BSA gateway documentation.",
    assessmentMethods:
      "Mentor review; line manager sign-off; portfolio review.",
    frequency: "Annually + on regulatory change",
    relevance:
      "Building Safety Act 2022 has materially changed competence expectations.",
    notes:
      "BSA 2022 is a modern best-practice addition. Verify gateway/duty-holder evidence with CIBSE assessor.",
  },
  {
    id: "mcibse-e2",
    reference: "E2",
    area: "Health, safety, risk & regulatory compliance",
    objective:
      "Understand the safety implications of the role; manage, apply, and improve safe systems of work.",
    behaviours:
      "Completes site safety inductions; produces and reviews RAMS; identifies hazards in design (CDM Designer duties); applies HASAWA 1974, CDM 2015, ISO 45001.",
    levelExpectation: "IEng: L3–L4 · CEng: L4–L5",
    evidenceExamples:
      "Site inspection records; RAMS authored or reviewed; CDM designer risk register entries; near-miss reports; IOSH/SMSTS certificates.",
    assessmentMethods:
      "Mentor review; HSE officer sign-off; site supervisor observation.",
    frequency: "Quarterly + Project milestones",
    relevance:
      "CDM 2015 Designer duty is non-negotiable for building services designers.",
    notes: "Confirmed against Aug 24 v2 source.",
  },
  {
    id: "mcibse-e3",
    reference: "E3",
    area: "Sustainability, net zero, ethics & social value",
    objective:
      "Understand the principles of sustainable development and apply them in day-to-day work, including net-zero carbon design, circular economy, and social value.",
    behaviours:
      "Applies Engineering Council Guidance on Sustainability; produces or contributes to energy/carbon assessments; considers embodied, operational, and whole-life carbon; recognises social value.",
    levelExpectation: "IEng: L3–L4 · CEng: L4–L5",
    evidenceExamples:
      "Energy/carbon assessment outputs; embodied carbon calculations (TM65, RICS WLCA); sustainability strategies; passive design studies; POE data analysis.",
    assessmentMethods:
      "Mentor review; sustainability lead sign-off; portfolio review; technical interview.",
    frequency: "Quarterly + Project milestones",
    relevance:
      "Primary dual-purpose competence with CIBSE LCC.",
    notes:
      "TM65/LETI/RIBA 2030 are current best-practice references; confirm CIBSE assessor preferences.",
  },
  {
    id: "mcibse-e4",
    reference: "E4",
    area: "CPD & reflective practice",
    objective:
      "Carry out and record the CPD necessary to maintain and enhance competence in own area of practice.",
    behaviours:
      "Maintains active CPD log; identifies development needs through reflective review; plans CPD against personal and organisational objectives; records planned and unplanned learning.",
    levelExpectation: "IEng: L4 · CEng: L4–L5 (own + assisting others)",
    evidenceExamples:
      "CPD log (~35 hrs/yr typical); reflective accounts; development plans; learning evaluations; mentee CPD support records.",
    assessmentMethods:
      "Mentor review of CPD log; quarterly review; annual progression panel.",
    frequency: "Monthly logging + Quarterly review",
    relevance: "Ongoing for life of registration.",
    notes: "Confirm current CIBSE CPD hours requirement.",
  },
  {
    id: "mcibse-e5",
    reference: "E5",
    area: "Sustainability, net zero, ethics & social value",
    objective:
      "Understand the ethical issues that may arise in the role and carry out responsibilities in an ethical manner.",
    behaviours:
      "Recognises ethical dilemmas in engineering practice; applies Engineering Council Statement of Ethical Principles; references company ethics policies.",
    levelExpectation: "IEng: L3–L4 · CEng: L4–L5",
    evidenceExamples:
      "Reflective accounts of ethical dilemmas faced; ethics CPD; case study discussions; Code of Ethics acknowledgement; whistleblowing/safeguarding training.",
    assessmentMethods:
      "Mentor review; reflective interview; portfolio review.",
    frequency: "Annually",
    relevance:
      "NEW vs legacy form — schemes must now evidence ethics explicitly.",
    notes:
      "Confirmed against Aug 24 v2 source. Material gap vs legacy form.",
  },
] as const satisfies readonly CompetencyDefinition[];
