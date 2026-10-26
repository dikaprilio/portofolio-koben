// Everything the page says about Amin, in one place.
// PLACEHOLDER: only the name is real so far. Replace the rest with Amin's
// own details; keep it factual.

export const PERSON = {
  name: "Amin Arsyad",
  first: "Amin",
  last: "Arsyad",
  role: "Your role here",
  place: "Your city",
  email: "hello@example.com",
  linkedin: "https://linkedin.com/",
  github: "https://github.com/",
};

/** The two roles the hero's camera passes on its way to the reveal. */
export const HERO_ROLES = [
  { word: "Role", accent: "one", tags: "Skill · Skill · Skill" },
  { word: "Role", accent: "two", tags: "Skill · Skill · Skill" },
] as const;

/** What the hero says in the reveal. */
export const HERO_LINE = "One line about what you do goes here. Make it fly!";

export const ORIGIN =
  "Your origin story goes here: where you study or work, what you love to build, and the one thing people should remember about you. Two or three sentences light up word by word as they scroll past.";
/** Words the origin story shouts. */
export const ORIGIN_LOUD = new Set(["story", "build", "remember"]);
export const ORIGIN_FACTS = ["School · years", "Award or scholarship", "Somewhere you've been", "Where you work now"];

export const POWERS = [
  { name: "Code", sfx: "ZAP!", items: ["Skill", "Skill", "Skill"] },
  { name: "Web", sfx: "WHAM!", items: ["Skill", "Skill", "Skill"] },
  { name: "Data", sfx: "BLIP!", items: ["Skill", "Skill"] },
  { name: "Design", sfx: "POW!", items: ["Skill", "Skill", "Skill"] },
  { name: "Gear", sfx: "CLANK!", items: ["Tool", "Tool", "Tool"] },
  { name: "Team-up", sfx: "BOOM!", items: ["Strength", "Strength"] },
] as const;

export type Mission = {
  id: string;
  name: string;
  kicker: string;
  badge?: string;
  summary: string;
  details: string[];
  stack: string[];
  url?: string;
  colour: "green" | "sun" | "pink" | "sky" | "paper";
};

const mission = (n: number, colour: Mission["colour"], badge?: string): Mission => ({
  id: `project-${n}`,
  name: `Project ${["one", "two", "three", "four", "five"][n - 1]}`,
  kicker: "What it is, in one line",
  badge,
  summary: "A sentence on what it does and why it mattered: the result, the users, the win.",
  details: ["What you built.", "How you built it.", "What came of it."],
  stack: ["Tech", "Tech", "Tech"],
  colour,
});

export const MISSIONS: Mission[] = [
  mission(1, "green", "Award"),
  mission(2, "sun", "Award"),
  mission(3, "pink"),
  mission(4, "sky"),
  mission(5, "paper"),
];

export const TROPHIES = [
  { place: "1st", title: "Competition name", when: "Year", note: "Project" },
  { place: "2nd", title: "Competition name", when: "Year", note: "Organiser" },
  { place: "Top 10", title: "Competition name", when: "Year", note: "Organiser" },
  { place: "3rd", title: "Competition name", when: "Year", note: "" },
];

export const TIMELINE = [
  { when: "Year – now", what: "Role", where: "Company or organisation" },
  { when: "Year – year", what: "Role", where: "Company or organisation" },
  { when: "Year", what: "Role", where: "Company or organisation" },
];

export const SIGNAL_LINE = "Open to projects and collaborations.";

export const TAPE = [PERSON.name, "Your role", "Skill", "Skill", "Award", PERSON.place];
