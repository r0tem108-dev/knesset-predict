import { Election } from "@/models/Election";
import { Party } from "@/models/Party";

/**
 * Seed definition for the first supported election. Everything here is data —
 * a future multi-election version would add more of these and drop the
 * "default election" assumption.
 */

export const DEFAULT_ELECTION_SLUG =
  process.env.DEFAULT_ELECTION_SLUG?.trim() || "knesset-26";

const BLOCS = [
  { key: "right", label: "Right / religious bloc", labelHe: "גוש הימין והחרדים" },
  {
    key: "center_left_arab",
    label: "Center-left & Arab bloc",
    labelHe: "גוש המרכז-שמאל והערבים",
  },
];

interface SeedParty {
  key: string;
  name: string;
  nameHe: string;
  abbr: string;
  color: string;
  bloc: string;
}

// Based on the parties active around the 25th Knesset, projected forward. This is
// sample data for the game — group admins can adjust it later per election.
const PARTIES: SeedParty[] = [
  { key: "likud", name: "Likud", nameHe: "הליכוד", abbr: "מחל", color: "#1d4e89", bloc: "right" },
  { key: "yesh_atid", name: "Yesh Atid", nameHe: "יש עתיד", abbr: "פה", color: "#00a3e0", bloc: "center_left_arab" },
  { key: "national_unity", name: "National Unity", nameHe: "המחנה הממלכתי", abbr: "כן", color: "#164e78", bloc: "center_left_arab" },
  { key: "shas", name: "Shas", nameHe: 'ש"ס', abbr: "שס", color: "#1b1b1b", bloc: "right" },
  { key: "utj", name: "United Torah Judaism", nameHe: "יהדות התורה", abbr: "ג", color: "#20315c", bloc: "right" },
  { key: "yisrael_beiteinu", name: "Yisrael Beiteinu", nameHe: "ישראל ביתנו", abbr: "ל", color: "#d81f26", bloc: "center_left_arab" },
  { key: "religious_zionism", name: "Religious Zionism", nameHe: "הציונות הדתית", abbr: "ט", color: "#4b2e83", bloc: "right" },
  { key: "otzma_yehudit", name: "Otzma Yehudit", nameHe: "עוצמה יהודית", abbr: "טב", color: "#3a3a3a", bloc: "right" },
  { key: "democrats", name: "The Democrats", nameHe: "הדמוקרטים", abbr: "אמת", color: "#009639", bloc: "center_left_arab" },
  { key: "hadash_taal", name: "Hadash-Ta'al", nameHe: 'חד"ש-תע"ל', abbr: "ום", color: "#e4002b", bloc: "center_left_arab" },
  { key: "raam", name: "Ra'am", nameHe: 'רע"ם', abbr: "עם", color: "#007a33", bloc: "center_left_arab" },
  { key: "balad", name: "Balad", nameHe: 'בל"ד', abbr: "ד", color: "#00693c", bloc: "center_left_arab" },
  { key: "bennett", name: "Bennett 2026", nameHe: "בנט 2026", abbr: "—", color: "#59c1bd", bloc: "center_left_arab" },
];

export interface SeedResult {
  created: boolean;
  electionSlug: string;
  parties: number;
}

/**
 * Idempotent. Called lazily on first DB use so the app works out of the box,
 * and also by `npm run seed`.
 */
export async function ensureSeeded(): Promise<SeedResult> {
  let election = await Election.findOne({ slug: DEFAULT_ELECTION_SLUG });
  let created = false;

  if (!election) {
    election = await Election.create({
      slug: DEFAULT_ELECTION_SLUG,
      name: "26th Knesset Election",
      nameHe: "הבחירות לכנסת ה-26",
      // Latest legal date for the next election; adjust when a date is set.
      electionDay: new Date("2026-10-27T00:00:00+03:00"),
      totalSeats: 120,
      thresholdPercent: 3.25,
      thresholdSeats: 4,
      coalitionWindowDays: 45,
      blocs: BLOCS,
    });
    created = true;
  }

  const existing = await Party.countDocuments({ electionId: election._id });
  if (existing === 0) {
    await Party.insertMany(
      PARTIES.map((p, i) => ({ ...p, electionId: election!._id, order: i + 1 })),
    );
  }

  return {
    created,
    electionSlug: election.slug,
    parties: await Party.countDocuments({ electionId: election._id }),
  };
}
