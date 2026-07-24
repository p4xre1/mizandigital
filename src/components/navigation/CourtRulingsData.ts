export interface SubCategory {
  id: string;
  title: string;
  href: string;
  description?: string;
}

export interface SectionCategory {
  id: string;
  title: string;
  subcategories: SubCategory[];
}

export const COURT_RULINGS_AND_DOCTRINE: SectionCategory[] = [
  {
    id: "court-rulings",
    title: "COURT RULINGS",
    subcategories: [
      {
        id: "court-of-cassation",
        title: "Court of Cassation",
        href: "/rulings/court-of-cassation",
        description: "Precedents and decisions from the highest judicial authority."
      },
      {
        id: "courts-of-appeal",
        title: "Courts of Appeal",
        href: "/rulings/courts-of-appeal",
        description: "Appellate judgments across regional jurisdictions."
      },
      {
        id: "administrative-courts",
        title: "Administrative Courts",
        href: "/rulings/administrative-courts",
        description: "Rulings regarding public administration and regulatory disputes."
      }
    ]
  },
  {
    id: "doctrine",
    title: "DOCTRINE",
    subcategories: [
      {
        id: "academic-articles",
        title: "Academic Articles",
        href: "/doctrine/academic-articles",
        description: "In-depth legal scholarship and peer-reviewed studies."
      },
      {
        id: "case-commentaries",
        title: "Case Commentaries",
        href: "/doctrine/case-commentaries",
        description: "Expert analysis and breakdowns of landmark rulings."
      },
      {
        id: "comparative-studies",
        title: "Comparative Studies",
        href: "/doctrine/comparative-studies",
        description: "Cross-jurisdictional research and comparative legal analysis."
      }
    ]
  }
];