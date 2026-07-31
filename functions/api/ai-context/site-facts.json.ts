const facts = {
  organization: "Mizan Digital",
  domain: "https://www.mizan.page",
  coverage: ["legal research", "university guidance", "court rulings", "official documents"],
  languages: ["ar", "fr", "en", "es"],
  cadence: "updated continuously",
};

export const onRequestGet = async () => Response.json(facts);
