import { Election } from "@/models/Election";
import { Party } from "@/models/Party";

/**
 * Seed definition for the 26th Knesset election (27 October 2026).
 *
 * Everything here is DATA. A group admin can correct any of it from the admin
 * "מפלגות" tab, and a future election is just another entry — nothing downstream
 * hard-codes a party name.
 *
 * ⚠️  The list below is a best-effort snapshot from around the list-submission
 * deadline (8 Sep 2026). Ballot letters and final rosters were still being
 * confirmed; admins should verify against the Central Elections Committee and
 * fix names / letters / status in the admin screen.
 */

export const DEFAULT_ELECTION_SLUG =
  process.env.DEFAULT_ELECTION_SLUG?.trim() || "knesset-26";

const BLOCS = [
  { key: "right", label: "Right / religious bloc", labelHe: "הגוש הימני-חרדי" },
  { key: "center_left", label: "Center-left bloc", labelHe: "גוש המרכז-שמאל" },
  { key: "arab", label: "Arab parties", labelHe: "המפלגות הערביות" },
];

interface SeedParty {
  key: string;
  name: string;
  nameHe: string;
  commonNameHe?: string;
  ballotLetters?: string;
  leaderHe?: string;
  color: string;
  bloc: string;
}

// 26th Knesset submitted lists (best-effort, verify in admin).
const PARTIES: SeedParty[] = [
  // --- right / religious ---
  { key: "likud", name: "Likud", nameHe: "הליכוד", ballotLetters: "מחל", leaderHe: "בנימין נתניהו", color: "#1d4e89", bloc: "right" },
  { key: "shas", name: "Shas", nameHe: 'ש"ס', ballotLetters: "שס", leaderHe: "אריה דרעי", color: "#111111", bloc: "right" },
  { key: "utj", name: "United Torah Judaism", nameHe: "יהדות התורה", ballotLetters: "ג", leaderHe: "", color: "#20315c", bloc: "right" },
  { key: "religious_zionism", name: "Religious Zionism", nameHe: "הציונות הדתית", ballotLetters: "ט", leaderHe: "בצלאל סמוטריץ'", color: "#4b2e83", bloc: "right" },
  { key: "otzma_yehudit", name: "Otzma Yehudit", nameHe: "עוצמה יהודית", ballotLetters: "נץ", leaderHe: "איתמר בן גביר", color: "#2b2b2b", bloc: "right" },
  { key: "new_hope", name: "New Hope", nameHe: "תקווה חדשה", leaderHe: "גדעון סער", color: "#2f6fed", bloc: "right" },

  // --- center-left ---
  { key: "yashar", name: "Yashar", nameHe: "ישר", ballotLetters: "דרך", leaderHe: "", color: "#e07a2c", bloc: "center_left" },
  { key: "beyachad", name: "Beyachad (Together)", nameHe: "ביחד", leaderHe: "נפתלי בנט", color: "#16a3b3", bloc: "center_left" },
  { key: "democrats", name: "The Democrats", nameHe: "הדמוקרטים", ballotLetters: "אמת", leaderHe: "יאיר גולן", color: "#0aa060", bloc: "center_left" },
  { key: "yisrael_beiteinu", name: "Yisrael Beiteinu", nameHe: "ישראל ביתנו", ballotLetters: "ל", leaderHe: "אביגדור ליברמן", color: "#d61f26", bloc: "center_left" },
  { key: "blue_white", name: "Blue and White", nameHe: "כחול לבן", leaderHe: "בני גנץ", color: "#0b4ea2", bloc: "center_left" },

  // --- Arab parties ---
  { key: "hadash_taal", name: "Hadash-Ta'al", nameHe: 'חד"ש-תע"ל', ballotLetters: "ום", leaderHe: "", color: "#d4001a", bloc: "arab" },
  { key: "raam", name: "Ra'am", nameHe: 'רע"ם', ballotLetters: "עם", leaderHe: "מנסור עבאס", color: "#0b7a3b", bloc: "arab" },
  { key: "balad", name: "Balad", nameHe: 'בל"ד', leaderHe: "סאמי אבו שחאדה", color: "#00694a", bloc: "arab" },

  // --- smaller lists (unlikely to cross the threshold) ---
  { key: "amcha_yisrael", name: "Amcha Yisrael", nameHe: "עמך ישראל", color: "#7c3aed", bloc: "" },
  { key: "reservists", name: "The Reservists", nameHe: "המילואימניקים", color: "#556b2f", bloc: "" },
  { key: "pirates", name: "Pirates", nameHe: "הפיראטים", color: "#3a3a3a", bloc: "" },
  { key: "economic_party", name: "Economic Party", nameHe: "המפלגה הכלכלית", color: "#b8860b", bloc: "" },
];

export interface SeedResult {
  created: boolean;
  electionSlug: string;
  parties: number;
}

/**
 * Idempotent. Called lazily on first DB use so the app works out of the box.
 */
export async function ensureSeeded(): Promise<SeedResult> {
  let election = await Election.findOne({ slug: DEFAULT_ELECTION_SLUG });
  let created = false;

  if (!election) {
    election = await Election.create({
      slug: DEFAULT_ELECTION_SLUG,
      name: "26th Knesset Election",
      nameHe: "הבחירות לכנסת ה-26",
      electionDay: new Date("2026-10-27T00:00:00+03:00"),
      listSubmissionDate: new Date("2026-09-08T22:00:00+03:00"),
      totalSeats: 120,
      thresholdPercent: 3.25,
      thresholdSeats: 4,
      coalitionWindowDays: 45,
      blocs: BLOCS,
    });
    created = true;
  } else if (!election.listSubmissionDate) {
    election.listSubmissionDate = new Date("2026-09-08T22:00:00+03:00");
    election.set("blocs", BLOCS);
    await election.save();
  }

  const existing = await Party.countDocuments({ electionId: election._id });
  if (existing === 0) {
    await Party.insertMany(
      PARTIES.map((p, i) => ({
        ...p,
        commonNameHe: p.commonNameHe ?? "",
        electionId: election!._id,
        status: "active",
        order: i + 1,
      })),
    );
  }

  return {
    created,
    electionSlug: election.slug,
    parties: await Party.countDocuments({ electionId: election._id }),
  };
}
