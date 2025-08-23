import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Sample university data with comprehensive information
const universities = [
  {
    name: "Harvard University",
    country: "United States",
    state: "Massachusetts",
    city: "Cambridge",
    usNewsRanking: 2,
    acceptanceRate: 0.032,
    applicationSystem: "Common App",
    tuitionInState: 59076,
    tuitionOutState: 59076,
    applicationFee: 85,
    deadlines: JSON.stringify({
      early_action: "2024-11-01",
      regular: "2025-01-01"
    }),
    majorsOffered: JSON.stringify([
      "Computer Science",
      "Economics",
      "Biology",
      "Psychology",
      "Political Science",
      "English",
      "Mathematics",
      "History",
      "Chemistry",
      "Physics"
    ]),
    websiteUrl: "https://www.harvard.edu"
  },
  {
    name: "Stanford University",
    country: "United States",
    state: "California",
    city: "Stanford",
    usNewsRanking: 3,
    acceptanceRate: 0.036,
    applicationSystem: "Common App",
    tuitionInState: 61731,
    tuitionOutState: 61731,
    applicationFee: 90,
    deadlines: JSON.stringify({
      early_action: "2024-11-01",
      regular: "2025-01-02"
    }),
    majorsOffered: JSON.stringify([
      "Computer Science",
      "Engineering",
      "Business",
      "Medicine",
      "Law",
      "Education",
      "Psychology",
      "Biology",
      "Economics",
      "Political Science"
    ]),
    websiteUrl: "https://www.stanford.edu"
  },
  {
    name: "Massachusetts Institute of Technology",
    country: "United States",
    state: "Massachusetts",
    city: "Cambridge",
    usNewsRanking: 2,
    acceptanceRate: 0.066,
    applicationSystem: "Direct",
    tuitionInState: 59750,
    tuitionOutState: 59750,
    applicationFee: 85,
    deadlines: JSON.stringify({
      early_action: "2024-11-01",
      regular: "2025-01-01"
    }),
    majorsOffered: JSON.stringify([
      "Computer Science",
      "Electrical Engineering",
      "Mechanical Engineering",
      "Physics",
      "Mathematics",
      "Chemistry",
      "Biology",
      "Economics",
      "Aerospace Engineering",
      "Chemical Engineering"
    ]),
    websiteUrl: "https://www.mit.edu"
  },
  {
    name: "University of California, Berkeley",
    country: "United States",
    state: "California",
    city: "Berkeley",
    usNewsRanking: 20,
    acceptanceRate: 0.143,
    applicationSystem: "Direct",
    tuitionInState: 14226,
    tuitionOutState: 46326,
    applicationFee: 80,
    deadlines: JSON.stringify({
      regular: "2024-11-30"
    }),
    majorsOffered: JSON.stringify([
      "Computer Science",
      "Engineering",
      "Business",
      "Economics",
      "Psychology",
      "Biology",
      "Chemistry",
      "Physics",
      "Political Science",
      "English"
    ]),
    websiteUrl: "https://www.berkeley.edu"
  },
  {
    name: "Yale University",
    country: "United States",
    state: "Connecticut",
    city: "New Haven",
    usNewsRanking: 4,
    acceptanceRate: 0.046,
    applicationSystem: "Common App",
    tuitionInState: 64700,
    tuitionOutState: 64700,
    applicationFee: 80,
    deadlines: JSON.stringify({
      early_action: "2024-11-01",
      regular: "2025-01-02"
    }),
    majorsOffered: JSON.stringify([
      "Economics",
      "Political Science",
      "Psychology",
      "History",
      "English",
      "Biology",
      "Computer Science",
      "Mathematics",
      "Art History",
      "Philosophy"
    ]),
    websiteUrl: "https://www.yale.edu"
  },
  {
    name: "Princeton University",
    country: "United States",
    state: "New Jersey",
    city: "Princeton",
    usNewsRanking: 1,
    acceptanceRate: 0.039,
    applicationSystem: "Common App",
    tuitionInState: 59710,
    tuitionOutState: 59710,
    applicationFee: 75,
    deadlines: JSON.stringify({
      early_action: "2024-11-01",
      regular: "2025-01-01"
    }),
    majorsOffered: JSON.stringify([
      "Economics",
      "Computer Science",
      "Political Science",
      "Psychology",
      "History",
      "English",
      "Mathematics",
      "Physics",
      "Biology",
      "Chemistry"
    ]),
    websiteUrl: "https://www.princeton.edu"
  },
  {
    name: "University of Pennsylvania",
    country: "United States",
    state: "Pennsylvania",
    city: "Philadelphia",
    usNewsRanking: 6,
    acceptanceRate: 0.056,
    applicationSystem: "Common App",
    tuitionInState: 63452,
    tuitionOutState: 63452,
    applicationFee: 80,
    deadlines: JSON.stringify({
      early_decision: "2024-11-01",
      regular: "2025-01-05"
    }),
    majorsOffered: JSON.stringify([
      "Business",
      "Economics",
      "Computer Science",
      "Biology",
      "Psychology",
      "Political Science",
      "Engineering",
      "Nursing",
      "Finance",
      "Marketing"
    ]),
    websiteUrl: "https://www.upenn.edu"
  },
  {
    name: "Columbia University",
    country: "United States",
    state: "New York",
    city: "New York",
    usNewsRanking: 12,
    acceptanceRate: 0.038,
    applicationSystem: "Common App",
    tuitionInState: 65524,
    tuitionOutState: 65524,
    applicationFee: 85,
    deadlines: JSON.stringify({
      early_decision: "2024-11-01",
      regular: "2025-01-01"
    }),
    majorsOffered: JSON.stringify([
      "Economics",
      "Political Science",
      "Psychology",
      "Computer Science",
      "English",
      "History",
      "Biology",
      "Engineering",
      "Journalism",
      "International Relations"
    ]),
    websiteUrl: "https://www.columbia.edu"
  },
  {
    name: "University of Chicago",
    country: "United States",
    state: "Illinois",
    city: "Chicago",
    usNewsRanking: 6,
    acceptanceRate: 0.062,
    applicationSystem: "Common App",
    tuitionInState: 64965,
    tuitionOutState: 64965,
    applicationFee: 75,
    deadlines: JSON.stringify({
      early_decision: "2024-11-01",
      early_action: "2024-11-01",
      regular: "2025-01-02"
    }),
    majorsOffered: JSON.stringify([
      "Economics",
      "Mathematics",
      "Political Science",
      "Psychology",
      "Biology",
      "Computer Science",
      "Physics",
      "Chemistry",
      "English",
      "History"
    ]),
    websiteUrl: "https://www.uchicago.edu"
  },
  {
    name: "Duke University",
    country: "United States",
    state: "North Carolina",
    city: "Durham",
    usNewsRanking: 9,
    acceptanceRate: 0.063,
    applicationSystem: "Common App",
    tuitionInState: 63450,
    tuitionOutState: 63450,
    applicationFee: 85,
    deadlines: JSON.stringify({
      early_decision: "2024-11-01",
      regular: "2025-01-02"
    }),
    majorsOffered: JSON.stringify([
      "Economics",
      "Computer Science",
      "Biology",
      "Psychology",
      "Political Science",
      "Engineering",
      "Public Policy",
      "English",
      "History",
      "Mathematics"
    ]),
    websiteUrl: "https://www.duke.edu"
  },
  {
    name: "University of Toronto",
    country: "Canada",
    state: "Ontario",
    city: "Toronto",
    usNewsRanking: null,
    acceptanceRate: 0.43,
    applicationSystem: "Direct",
    tuitionInState: 6100,
    tuitionOutState: 58160,
    applicationFee: 156,
    deadlines: JSON.stringify({
      regular: "2025-01-13"
    }),
    majorsOffered: JSON.stringify([
      "Computer Science",
      "Engineering",
      "Business",
      "Medicine",
      "Law",
      "Arts and Science",
      "Psychology",
      "Biology",
      "Economics",
      "Political Science"
    ]),
    websiteUrl: "https://www.utoronto.ca"
  },
  {
    name: "University of Oxford",
    country: "United Kingdom",
    state: null,
    city: "Oxford",
    usNewsRanking: null,
    acceptanceRate: 0.175,
    applicationSystem: "Direct",
    tuitionInState: 11220,
    tuitionOutState: 39010,
    applicationFee: 75,
    deadlines: JSON.stringify({
      regular: "2024-10-15"
    }),
    majorsOffered: JSON.stringify([
      "Philosophy, Politics and Economics",
      "Computer Science",
      "Mathematics",
      "Physics",
      "Chemistry",
      "Biology",
      "History",
      "English Literature",
      "Law",
      "Medicine"
    ]),
    websiteUrl: "https://www.ox.ac.uk"
  },
  {
    name: "University of Cambridge",
    country: "United Kingdom",
    state: null,
    city: "Cambridge",
    usNewsRanking: null,
    acceptanceRate: 0.21,
    applicationSystem: "Direct",
    tuitionInState: 11220,
    tuitionOutState: 37293,
    applicationFee: 75,
    deadlines: JSON.stringify({
      regular: "2024-10-15"
    }),
    majorsOffered: JSON.stringify([
      "Natural Sciences",
      "Mathematics",
      "Computer Science",
      "Engineering",
      "Economics",
      "History",
      "English",
      "Law",
      "Medicine",
      "Physics"
    ]),
    websiteUrl: "https://www.cam.ac.uk"
  },
  {
    name: "University of California, Los Angeles",
    country: "United States",
    state: "California",
    city: "Los Angeles",
    usNewsRanking: 15,
    acceptanceRate: 0.109,
    applicationSystem: "Direct",
    tuitionInState: 13804,
    tuitionOutState: 46326,
    applicationFee: 80,
    deadlines: JSON.stringify({
      regular: "2024-11-30"
    }),
    majorsOffered: JSON.stringify([
      "Psychology",
      "Economics",
      "Political Science",
      "Biology",
      "Computer Science",
      "Business Economics",
      "Engineering",
      "English",
      "History",
      "Mathematics"
    ]),
    websiteUrl: "https://www.ucla.edu"
  },
  {
    name: "New York University",
    country: "United States",
    state: "New York",
    city: "New York",
    usNewsRanking: 25,
    acceptanceRate: 0.128,
    applicationSystem: "Common App",
    tuitionInState: 58168,
    tuitionOutState: 58168,
    applicationFee: 80,
    deadlines: JSON.stringify({
      early_decision: "2024-11-01",
      regular: "2025-01-05"
    }),
    majorsOffered: JSON.stringify([
      "Business",
      "Liberal Arts",
      "Film and Television",
      "Computer Science",
      "Psychology",
      "Economics",
      "Political Science",
      "Art",
      "Music",
      "Theater"
    ]),
    websiteUrl: "https://www.nyu.edu"
  }
];

async function main() {
  console.log('🌱 Starting university database seeding...');

  try {
    // Clear existing universities (optional - remove if you want to keep existing data)
    console.log('🗑️  Clearing existing university data...');
    await prisma.university.deleteMany({});

    // Insert universities
    console.log('🏫 Inserting university data...');
    for (const university of universities) {
      await prisma.university.create({
        data: university,
      });
      console.log(`✅ Added ${university.name}`);
    }

    console.log(`🎉 Successfully seeded ${universities.length} universities!`);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });