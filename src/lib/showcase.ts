/**
 * The showcase content on the learner's side: the alumni wall, the university
 * and destination rails on their dashboard.
 *
 * It lives here rather than in a page because two pages read it — the
 * dashboard shows the first few successful learners and links to the full
 * wall — and two copies of the same list is how they drift apart.
 *
 * Demo records. Nobody here is real, the ranks are illustrative, and no
 * university logos ship with this prototype: the rails draw initials tiles
 * and the destinations are colour, not photography.
 */

export type Alum = {
  name: string;
  programme: string;
  university: string;
  country: string;
  degree: string;
};

export const ALUMNI: Alum[] = [
  { name: "Swapnil Mule", programme: "Master Degree in Data Science", university: "IU Germany", country: "Germany", degree: "Masters" },
  { name: "Vinay Baja", programme: "MS in Information Technology", university: "Clark University", country: "USA", degree: "Masters" },
  { name: "Vimal Kaur", programme: "Master Degree in Data Science", university: "IU Germany", country: "Germany", degree: "Masters" },
  { name: "Vikas Yadav", programme: "Master of Business Administration (90 ECTS)", university: "IU Germany", country: "Germany", degree: "Masters" },
  { name: "Varsha Soni", programme: "Master of Business Administration (90 ECTS)", university: "IU Germany", country: "Germany", degree: "Masters" },
  { name: "Triveni Nikam", programme: "Master of Business Administration (90 ECTS)", university: "IU Germany", country: "Germany", degree: "Masters" },
  { name: "Thimmayya Pudiyokkada", programme: "Master Degree in Data Science", university: "IU Germany", country: "Germany", degree: "Masters" },
  { name: "Thejas M N", programme: "Master in Computer Science (120 ECTS)", university: "IU Germany", country: "Germany", degree: "Masters" },
  { name: "Sneha Rajagopal", programme: "MSc in Business Analytics", university: "Deakin University", country: "Australia", degree: "Masters" },
  { name: "Rahul Bhatt", programme: "MS in Computer Science", university: "Clark University", country: "USA", degree: "Masters" },
  { name: "Priya Menon", programme: "MSc in International Management", university: "IU Germany", country: "Germany", degree: "Masters" },
  { name: "Karan Oberoi", programme: "Bachelor of Business Administration", university: "Deakin University", country: "Australia", degree: "Bachelors" },
];

export type University = {
  name: string;
  rank: string;
  country: string;
};

export const UNIVERSITIES: University[] = [
  { name: "Johnson & Wales University", rank: "Ranks 91 by US News", country: "USA" },
  { name: "Macquarie University", rank: "Ranks 138 by QS", country: "Australia" },
  { name: "Northeastern University", rank: "Ranks 388 by QS", country: "USA" },
  { name: "Yeshiva University", rank: "Ranks 356 by QS", country: "USA" },
  { name: "IU International University", rank: "Ranks 501 by QS", country: "Germany" },
  { name: "Clark University", rank: "Ranks 601 by QS", country: "USA" },
  { name: "Deakin University", rank: "Ranks 197 by QS", country: "Australia" },
  { name: "TU Munich", rank: "Ranks 28 by QS", country: "Germany" },
];

export type Destination = {
  country: string;
  /** No photography ships with the prototype, so each one gets a sky. */
  sky: string;
};

export const DESTINATIONS: Destination[] = [
  { country: "USA", sky: "linear-gradient(160deg,#2b4a7d,#7aa3c4 55%,#d9c3a0)" },
  { country: "Germany", sky: "linear-gradient(160deg,#1f5f5b,#6aa39a 55%,#e4d2ac)" },
  { country: "Canada", sky: "linear-gradient(160deg,#8a3b2f,#d1795a 55%,#f0c9a3)" },
  { country: "UK", sky: "linear-gradient(160deg,#3b3f6b,#7d7fb0 55%,#cfd3e8)" },
  { country: "Australia", sky: "linear-gradient(160deg,#1c5f7a,#57a7bd 55%,#ecd9b0)" },
  { country: "Ireland", sky: "linear-gradient(160deg,#2f5d3a,#79a86a 55%,#dfe6bd)" },
];
