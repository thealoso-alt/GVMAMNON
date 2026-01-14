
export interface StudentRecord {
  id: string;
  name: string;
  evaluations: Record<string, string>; // Key is MT code, value is '+' or '-'
}

export interface ClassMetadata {
  schoolName: string;
  className: string;
  topic: string;
  duration: string;
  dateCreated: string;
  teacherName: string;
}

export interface EvaluationCategory {
  id: string;
  name: string;
  targets: string[]; // e.g. ["MT 15", "MT 29"]
}
