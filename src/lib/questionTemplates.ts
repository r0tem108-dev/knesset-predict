/**
 * Default bonus questions seeded into every new group. The group admin can then
 * add / remove / edit / re-point them. `party`-type questions take their options
 * from the ballot parties at render time.
 */

export interface QuestionTemplate {
  qid: string;
  type: "party" | "choice" | "boolean" | "number";
  text: string;
  textHe: string;
  points: number;
  autoResolve: "" | "largestParty" | "blocWinner" | "partyCount" | "anyPartyBelowThreshold";
  kind?: "" | "turnout";
  options?: { value: string; label: string }[];
  order: number;
}

export function defaultQuestions(blocs: { key: string; labelHe: string }[]): QuestionTemplate[] {
  return [
    {
      qid: "largest_party",
      type: "party",
      text: "Which party will be the largest?",
      textHe: "מי תהיה המפלגה הגדולה ביותר?",
      points: 10,
      autoResolve: "largestParty",
      order: 1,
    },
    {
      qid: "prime_minister",
      type: "choice",
      text: "Who will be Prime Minister after the election?",
      textHe: "מי יהיה ראש הממשלה אחרי הבחירות?",
      points: 15,
      autoResolve: "",
      options: [
        { value: "netanyahu", label: "בנימין נתניהו" },
        { value: "bennett", label: "נפתלי בנט" },
        { value: "lapid", label: "יאיר לפיד" },
        { value: "gantz", label: "בני גנץ" },
        { value: "other", label: "אחר" },
      ],
      order: 2,
    },
    {
      qid: "bloc_winner",
      type: "choice",
      text: "Which bloc will receive more seats?",
      textHe: "איזה גוש יקבל יותר מנדטים?",
      points: 10,
      autoResolve: "blocWinner",
      options: blocs.map((b) => ({ value: b.key, label: b.labelHe })),
      order: 3,
    },
    {
      qid: "any_below_threshold",
      type: "boolean",
      text: "Will at least one party that runs fail to cross the electoral threshold?",
      textHe: "האם לפחות מפלגה אחת שרצה לא תעבור את אחוז החסימה?",
      points: 5,
      autoResolve: "anyPartyBelowThreshold",
      order: 4,
    },
    {
      qid: "party_count",
      type: "number",
      text: "How many parties will enter the Knesset?",
      textHe: "כמה מפלגות ייכנסו לכנסת?",
      points: 8,
      autoResolve: "partyCount",
      order: 5,
    },
    {
      qid: "government_45_days",
      type: "boolean",
      text: "Will a government be formed within 45 days of the results?",
      textHe: "האם תוקם ממשלה תוך 45 יום מפרסום התוצאות?",
      points: 10,
      autoResolve: "",
      order: 6,
    },
    {
      qid: "turnout",
      type: "number",
      text: "National voter turnout (%) — tie-breaker",
      textHe: "אחוז ההצבעה הארצי (%) — שובר שוויון",
      points: 5,
      autoResolve: "",
      kind: "turnout",
      order: 7,
    },
  ];
}
