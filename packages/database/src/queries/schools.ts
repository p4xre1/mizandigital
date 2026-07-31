import type { SchoolRecord } from "../types";

export function groupSchoolsByCity(schools: SchoolRecord[]) {
  return schools.reduce<Record<string, SchoolRecord[]>>((groups, school) => {
    (groups[school.city] ||= []).push(school);
    return groups;
  }, {});
}
