export type University = readonly [
  name: string,
  city: string,
  state: string,
  institutionId?: string,
];

// A compact on-device directory of major NCAA and pilot-partner institutions.
// The field remains free-form so an athlete is never blocked by this cache.
export const UNIVERSITIES: readonly University[] = [
  ["Bowling Green State University", "Bowling Green", "OH", "tm:bowling-green-state"],
  ["Case Western Reserve University", "Cleveland", "OH", "tm:case-western-reserve"],
  ["Cleveland State University", "Cleveland", "OH", "tm:cleveland-state"],
  ["Ohio State University", "Columbus", "OH"],
  ["University of Cincinnati", "Cincinnati", "OH"],
  ["University of Toledo", "Toledo", "OH"],
  ["Kent State University", "Kent", "OH"],
  ["Miami University", "Oxford", "OH"],
  ["Ohio University", "Athens", "OH"],
  ["University of Akron", "Akron", "OH"],
  ["University of Alabama", "Tuscaloosa", "AL"],
  ["Auburn University", "Auburn", "AL"],
  ["Arizona State University", "Tempe", "AZ"],
  ["University of Arizona", "Tucson", "AZ"],
  ["University of Arkansas", "Fayetteville", "AR"],
  ["University of California, Berkeley", "Berkeley", "CA"],
  ["University of California, Davis", "Davis", "CA"],
  ["University of California, Los Angeles", "Los Angeles", "CA"],
  ["University of Southern California", "Los Angeles", "CA"],
  ["Stanford University", "Stanford", "CA"],
  ["San Diego State University", "San Diego", "CA"],
  ["University of Colorado Boulder", "Boulder", "CO"],
  ["Colorado State University", "Fort Collins", "CO"],
  ["University of Connecticut", "Storrs", "CT"],
  ["Yale University", "New Haven", "CT"],
  ["University of Delaware", "Newark", "DE"],
  ["University of Florida", "Gainesville", "FL"],
  ["Florida State University", "Tallahassee", "FL"],
  ["University of Miami", "Coral Gables", "FL"],
  ["University of Central Florida", "Orlando", "FL"],
  ["University of Georgia", "Athens", "GA"],
  ["Georgia Institute of Technology", "Atlanta", "GA"],
  ["University of Hawaii at Manoa", "Honolulu", "HI"],
  ["Boise State University", "Boise", "ID"],
  ["University of Illinois Urbana-Champaign", "Champaign", "IL"],
  ["Northwestern University", "Evanston", "IL"],
  ["University of Notre Dame", "Notre Dame", "IN"],
  ["Indiana University Bloomington", "Bloomington", "IN"],
  ["Purdue University", "West Lafayette", "IN"],
  ["University of Iowa", "Iowa City", "IA"],
  ["Iowa State University", "Ames", "IA"],
  ["University of Kansas", "Lawrence", "KS"],
  ["Kansas State University", "Manhattan", "KS"],
  ["University of Kentucky", "Lexington", "KY"],
  ["University of Louisville", "Louisville", "KY"],
  ["Louisiana State University", "Baton Rouge", "LA"],
  ["Tulane University", "New Orleans", "LA"],
  ["University of Maine", "Orono", "ME"],
  ["University of Maryland", "College Park", "MD"],
  ["Johns Hopkins University", "Baltimore", "MD"],
  ["Boston College", "Chestnut Hill", "MA"],
  ["Boston University", "Boston", "MA"],
  ["Harvard University", "Cambridge", "MA"],
  ["University of Massachusetts Amherst", "Amherst", "MA"],
  ["University of Michigan", "Ann Arbor", "MI"],
  ["Michigan State University", "East Lansing", "MI"],
  ["University of Minnesota Twin Cities", "Minneapolis", "MN"],
  ["University of Mississippi", "Oxford", "MS"],
  ["Mississippi State University", "Starkville", "MS"],
  ["University of Missouri", "Columbia", "MO"],
  ["University of Nebraska-Lincoln", "Lincoln", "NE"],
  ["University of Nevada, Las Vegas", "Las Vegas", "NV"],
  ["University of New Hampshire", "Durham", "NH"],
  ["Rutgers University", "New Brunswick", "NJ"],
  ["University of New Mexico", "Albuquerque", "NM"],
  ["Syracuse University", "Syracuse", "NY"],
  ["Columbia University", "New York", "NY"],
  ["Cornell University", "Ithaca", "NY"],
  ["New York University", "New York", "NY"],
  ["University of North Carolina at Chapel Hill", "Chapel Hill", "NC"],
  ["Duke University", "Durham", "NC"],
  ["North Carolina State University", "Raleigh", "NC"],
  ["North Dakota State University", "Fargo", "ND"],
  ["University of Oklahoma", "Norman", "OK"],
  ["Oklahoma State University", "Stillwater", "OK"],
  ["University of Oregon", "Eugene", "OR"],
  ["Oregon State University", "Corvallis", "OR"],
  ["Pennsylvania State University", "University Park", "PA"],
  ["University of Pennsylvania", "Philadelphia", "PA"],
  ["University of Pittsburgh", "Pittsburgh", "PA"],
  ["Brown University", "Providence", "RI"],
  ["University of South Carolina", "Columbia", "SC"],
  ["Clemson University", "Clemson", "SC"],
  ["University of Tennessee", "Knoxville", "TN"],
  ["Vanderbilt University", "Nashville", "TN"],
  ["University of Texas at Austin", "Austin", "TX"],
  ["Texas A&M University", "College Station", "TX"],
  ["Baylor University", "Waco", "TX"],
  ["Texas Christian University", "Fort Worth", "TX"],
  ["University of Utah", "Salt Lake City", "UT"],
  ["Brigham Young University", "Provo", "UT"],
  ["University of Vermont", "Burlington", "VT"],
  ["University of Virginia", "Charlottesville", "VA"],
  ["Virginia Tech", "Blacksburg", "VA"],
  ["University of Washington", "Seattle", "WA"],
  ["Washington State University", "Pullman", "WA"],
  ["West Virginia University", "Morgantown", "WV"],
  ["University of Wisconsin-Madison", "Madison", "WI"],
  ["University of Wyoming", "Laramie", "WY"],
];

const normalize = (value: string) =>
  value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

export function findUniversities(query: string, limit = 7): University[] {
  const normalized = normalize(query);
  if (!normalized) return [];
  const words = normalized.split(" ");
  return UNIVERSITIES.map((university) => {
    const haystack = normalize(university.join(" "));
    const name = normalize(university[0]);
    const score = name === normalized ? 0 : name.startsWith(normalized) ? 1 : words.every((word) => haystack.includes(word)) ? 2 : haystack.includes(normalized) ? 3 : 99;
    return { university, score };
  })
    .filter(({ score }) => score < 99)
    .sort((left, right) => left.score - right.score || left.university[0].localeCompare(right.university[0]))
    .slice(0, limit)
    .map(({ university }) => university);
}
