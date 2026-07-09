export const bachelorSteps = {
  termApplied: [
    "August 2026 | First Term",
    "December 2026 | Second Term",
    "April 2027 | Third Term",
  ],
  programFocus: [
    "BS Information Technology",
    "BS Business Administration",
  ],
  specialization: [
    { parent: "BS Information Technology", children: ["BS IT Data Analytics Specialization", "BS IT Software Development Specialization", "BS IT Network & Cybersecurity Specialization", "BS IT AI-Powered Product Development"] },
    { parent: "BS Business Administration", children: ["BS BA HR Management Specialization", "BS BA Operations Management Specialization", "BS BA Marketing Management Specialization", "BS BA AI for Business Strategy and Operations"] },
  ],
  suffix: ["Jr", "Sr", "I", "II", "III", "IV", "V", "VI", "VII", "VIII"],
  gender: ["Female", "Male"],
  civilStatus: ["Single", "Married", "Divorced", "Legally Separated", "Widowed", "Religious/Clergy", "Marriage Annulled", "Separated Unofficial"],
  monthlyIncome: ["Less than 10,000", "10,000 - 24,999", "25,000 - 49,999", "50,000 - 79,999", "80,000 - 134,999", "More than 135,000"],
  learningHub: ["Mapua University Makati", "Ayala Malls Capitol Central Bacolod", "No Preference At This Time"],
  studentType: ["Freshman", "Transferee"],
  subStudentType: ["Recent Grade 12 graduate", "Returning student or Returning from Leave of Absence (LOA)"],
  studentStatus: ["Full-Time Student", "Working Student"],
  strand: ["Accountancy, Business and Management (ABM)", "Humanities and Social Sciences (HUMSS)", "General Academic (GA)", "Science, Technology, Engineering and Mathematics (STEM)", "Others"],
  yesNo: ["Yes", "No"],
  scholarship: ["MMDC Asenso Scholarship", "Continuing Education Scholarship", "MMDC YGC-Ayala Employees Promotional Discount", "Abanse Negrense Scholarship", "Victorias City Scholarship", "NextGen-Working Youth", "NextGen-Solo Parent", "MMDC Early Enrollment Discount Program"],
  livingStatus: ["Living", "Deceased", "Unknown"],
  guardianAssignment: ["Father", "Mother", "Others"],
  guardianRelationship: ["Grandparent", "Sibling", "Aunt", "Uncle", "Cousin", "Neighbor", "Others"],
} as const;
