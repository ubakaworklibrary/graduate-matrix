# Graduate Matrix Dashboard parity audit

Source measurement basis: final effective rules and render functions in `Reference/Graduate_Training_Matrix.html`, cross-checked against the Etch component treatments in `ventilation-tool-app/components/ventilation/VentilationApp.tsx`. Browser screenshots were not used as an implementation dependency following the user's instruction to work directly from the existing Graduate Matrix source.

## Visible element inventory

| Ref | Element type | Exact visible text | Original source | Ventilation style source | Current component | Width | Height | Font family | Size | Weight | Line height | Text | Background | Border | Radius | Padding | Margin | Alignment | Required change | Status |
|---:|---|---|---|---|---|---:|---:|---|---:|---:|---:|---|---|---|---:|---|---|---|---|---|
| 1 | Product heading | Graduate Training Matrix | `Graduate_Training_Matrix.html:14474`, final D28 header rules | `VentilationApp.tsx:662-669` | `GraduateMatrixApp` | auto | 52px shell | Nunito Sans | 20px | 700 | 24px | `#1a1a2e`; Matrix `#00A786` | `#fff` | bottom `#00A786` | 0 | 0 20px shell | 0 | left/center | Remove Ventilation logo shell; restore reference title | Done |
| 2 | Header badge | No overdue / overdue count | final header injections | compact Ventilation badges | `GraduateMatrixApp` | auto | 24px | Nunito Sans | 9.5px | 700 | normal | status-dependent | `#fff` | `#dde2ea` | 4px | 2px 7px | 0 | right | Derive from active actions | Done |
| 3 | Header badge | Review date … | final header injections | compact Ventilation badges | `GraduateMatrixApp` | auto | 24px | Nunito Sans | 9.5px | 700 | normal | `#555` | `#f8f9fc` | `#dde2ea` | 4px | 2px 7px | 0 | right | Derive latest/next review truthfully | Done |
| 4 | Role badge | Graduate / Mentor | `role-toggle`, final header | compact segmented controls | `GraduateMatrixApp` | auto | 26px | Nunito Sans | 11px | 700 | normal | `#fff` | `#1a1a2e` | `#1a1a2e` | 4px | 5px 14px | 0 | right | Display authorized role only | Done |
| 5 | User identity | Candidate name | shell identity requirement | header status text | `GraduateMatrixApp` | auto | 26px | Nunito Sans | 11px | 600 | normal | `#555` | transparent | none | 0 | 0 | 0 | right | Show selected candidate, not fake identity | Done |
| 6 | Logout button | Log out | current secure shell | secondary button | `GraduateMatrixApp` | auto | 28px | Nunito Sans | 11px | 600 | normal | `#00A786` | `#fff` | `#00A786` | 4px | 5px 9px | 0 | right | Retain server action | Done |
| 7 | Primary nav | Candidate | final D28 nav | Ventilation tabs | `GraduateMatrixApp` | auto | 42px | Nunito Sans | 12px | 800 | normal | inactive `#888`; active `#00A786` | `#fff` | active bottom 3px `#00A786` | 0 | 0 18px | 0 | left/center | Separate nav below header | Done |
| 8 | Primary nav | Dashboard | same | same | same | auto | 42px | Nunito Sans | 12px | 800 | normal | same | same | same | 0 | 0 18px | 0 | left | Exact order/wording | Done |
| 9 | Primary nav | Portfolio | same | same | same | auto | 42px | Nunito Sans | 12px | 800 | normal | same | same | same | 0 | 0 18px | 0 | left | Exact order/wording | Done |
| 10 | Primary nav | CPD Log | same | same | same | auto | 42px | Nunito Sans | 12px | 800 | normal | same | same | same | 0 | 0 18px | 0 | left | Exact order/wording | Done |
| 11 | Primary nav | Meeting Log | same | same | same | auto | 42px | Nunito Sans | 12px | 800 | normal | same | same | same | 0 | 0 18px | 0 | left | Exact order/wording | Done |
| 12 | Primary nav | Guide | same | same | same | auto | 42px | Nunito Sans | 12px | 800 | normal | same | same | same | 0 | 0 18px | 0 | left | Exact order/wording | Done |
| 13 | Context ribbon | Scheme … · View Dashboard · Pathway … | final context ribbon | project status strip | `GraduateMatrixApp` | 100% | 34px min | Nunito Sans | 10.5px | 600 | 16px | `#555` / labels `#1a1a2e` | `#f8f9fc` | bottom `#dde2ea` | 0 | 8px 20px | 0 | left/center | Add source-backed context | Done |
| 14 | Section heading | Candidate pathway summary | `renderCandidateDashboardSummary` | panel heading | `DashboardPanel` | 100% | auto | Nunito Sans | 16px | 700 | 24px | `#1a1a2e` | `#fff` | `#dde2ea` | 8px | 20px | 0 0 14px | left | Exact wording | Done |
| 15 | Summary label | Candidate | same | KPI label | `DashboardPanel` | grid 1/4 | auto | Nunito Sans | 10px | 700 | 15px | `#888` | `#f8f9fc` | `#eef0f4` | 4px | 10px 12px | 0 | left | Exact order | Done |
| 16 | Summary label | Target outcome | same | KPI label | same | grid 1/4 | auto | same | 10px | 700 | 15px | `#888` | `#f8f9fc` | `#eef0f4` | 4px | 10px 12px | 0 | left | Exact order | Done |
| 17 | Summary label | Pathway | same | KPI label | same | grid 1/4 | auto | same | 10px | 700 | 15px | `#888` | `#f8f9fc` | `#eef0f4` | 4px | 10px 12px | 0 | left | Exact order | Done |
| 18 | Summary label | Mentor | same | KPI label | same | grid 1/4 | auto | same | 10px | 700 | 15px | `#888` | `#f8f9fc` | `#eef0f4` | 4px | 10px 12px | 0 | left | Exact order | Done |
| 19 | Section heading | Portfolio control dashboard | `renderDashboardView` | panel heading | `DashboardPanel` | 100% | auto | Nunito Sans | 16px | 700 | 24px | `#1a1a2e` | `#fff` | `#dde2ea` | 8px | 24px | 0 0 14px | left | Exact wording and explanatory copy | Done |
| 20 | Button | Open Matrix | same | primary button | same | auto | 28px | Nunito Sans | 11px | 600 | normal | `#fff` | `#00A786` | `#00A786` | 4px | 5px 9px | 0 | left | Exact wording | Done |
| 21 | Button | Open Evidence Register | same | secondary button | same | auto | 28px | same | 11px | 600 | normal | `#00A786` | `#fff` | `#00A786` | 4px | 5px 9px | 0 | left | Exact wording | Done |
| 22 | Button | Open Action Tracker | same | secondary button | same | auto | 28px | same | 11px | 600 | normal | `#00A786` | `#fff` | `#00A786` | 4px | 5px 9px | 0 | left | Exact wording | Done |
| 23 | KPI | Evidence entries | same | KPI card | same | min 160px | min 70px | Nunito Sans | value 22px; label 10px | 700 | value 22px | `#1a1a2e` / `#888` | `#fff` | `#dde2ea`, left 4px `#1a1a2e` | 8px | 13px 16px | 0 | left | Restore exact caption | Done |
| 24 | KPI | Active actions | same | KPI card | same | same | same | same | same | same | same | same | same | same | same | same | 0 | left | Restore detail caption | Done |
| 25 | KPI | Overdue actions | same | warning KPI | same | same | same | same | same | same | same | `#1a1a2e` | `#fff` | left 4px `#c0392b` | 8px | same | 0 | left | Exact order | Done |
| 26 | KPI | Ready to discuss progression | same | KPI card | same | same | same | same | same | same | same | same | same | same | same | same | 0 | left | Use mentor recommendation data; controlled 0 if unavailable | Done |
| 27 | KPI | More evidence required | same | KPI card | same | same | same | same | same | same | same | same | same | same | same | same | 0 | left | Use mentor assessment data | Done |
| 28 | KPI | CPD hours this year | same | KPI card | same | same | same | same | same | same | same | same | same | same | same | same | 0 | left | Show canonical combined hours; target unsupported shown as — | Done |
| 29 | Section heading | Assessment status by competence | same | table panel heading | same | 100% | auto | Nunito Sans | 16px | 700 | 24px | `#1a1a2e` | `#fff` | `#dde2ea` | 8px | 24px | 14px 0 0 | left | Restore all seven columns | Done |
| 30 | Table headers | Competence; Current; Target; Mentor status; Evidence; Open actions; Controls | same | Etch table | same | 100% | 36px | Nunito Sans | 10px | 700 | normal | `#000` | `#00A786` | `#00A786` | 0 | 8px 11px | 0 | left | Exact headers/order | Done |
| 31 | Section heading | Action review queue | same | table panel heading | previously missing | 100% | auto | Nunito Sans | 16px | 700 | 24px | `#1a1a2e` | `#fff` | `#dde2ea` | 8px | 24px | 14px 0 0 | left | Add canonical action queue | Done |
| 32 | Empty state | No active action priorities. | same | empty table row | previously missing | 100% | auto | Nunito Sans | 12px | 400 | 18px | `#888` | `#fff` | none | 0 | 24px | 0 | center | Exact wording | Done |
| 33 | Section heading | Evidence review queue | same | table panel heading | previously missing | 100% | auto | Nunito Sans | 16px | 700 | 24px | `#1a1a2e` | `#fff` | `#dde2ea` | 8px | 24px | 14px 0 0 | left | Add canonical review queue | Done |
| 34 | Empty state | No evidence is waiting for mentor review. | same | empty table row | previously missing | 100% | auto | Nunito Sans | 12px | 400 | 18px | `#888` | `#fff` | none | 0 | 24px | 0 | center | Exact wording | Done |
| 35 | Section heading | Current assessed levels | same | panel heading | `DashboardPanel` | 100% | auto | Nunito Sans | 16px | 700 | 24px | `#1a1a2e` | `#fff` | `#dde2ea` | 8px | 24px | 14px 0 0 | left | Exact level cards and closing text | Done |

## Heading audit

| Exact text / category | Semantic level | Family | Size | Weight | Line height | Letter spacing | Transform | Colour | Top | Bottom | Container |
|---|---|---|---:|---:|---:|---:|---|---|---:|---:|---|
| Graduate Training Matrix | h1 | Nunito Sans | 20px | 700 | 24px | 0 | none | `#1a1a2e`; “Matrix” `#00A786` | 0 | 0 | `#fff` |
| Primary navigation labels | button | Nunito Sans | 12px | 800 | normal | `0.06em` | uppercase | inactive `#888`; active `#00A786` | 0 | 0 | `#fff` |
| Candidate pathway summary | h3 | Nunito Sans | 16px | 700 | 24px | 0 | none | `#1a1a2e` | 0 | 12px | `#fff` |
| Portfolio control dashboard | h3 | Nunito Sans | 16px | 700 | 24px | 0 | none | `#1a1a2e` | 0 | 0 | `#fff` |
| Assessment status by competence | h3 | Nunito Sans | 16px | 700 | 24px | 0 | none | `#1a1a2e` | 0 | 12px | `#fff` |
| Action review queue | h3 | Nunito Sans | 16px | 700 | 24px | 0 | none | `#1a1a2e` | 0 | 12px | `#fff` |
| Evidence review queue | h3 | Nunito Sans | 16px | 700 | 24px | 0 | none | `#1a1a2e` | 0 | 12px | `#fff` |
| Current assessed levels | h3 | Nunito Sans | 16px | 700 | 24px | 0 | none | `#1a1a2e` | 0 | 12px | `#fff` |
| KPI/card labels | div | Nunito Sans | 10px | 700 | 15px | `0.08em` | uppercase | `#888` | 0 | 0 | `#fff` |
| Table headings | th | Nunito Sans | 10px | 700 | normal | `0.06em` | uppercase | `#000` | 0 | 0 | `#00A786` |

## Controlled differences

- The legacy client-side role switch is not reproduced. The role badge reflects server-authorized data only.
- Import, export, reset, browser storage, dark-mode and legacy Tools controls are not reproduced because they conflict with the current secure architecture or have no authorized server-backed equivalent.
- The legacy annual CPD target is not present in the canonical Dashboard read model. The target position is retained and displays `—`.
- Evidence edit/verify and action mutation controls are not invented on the Dashboard. Available controls navigate to the existing authorized workspace.
