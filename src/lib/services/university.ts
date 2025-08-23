import { PrismaClient } from '@prisma/client';
import {
  UniversitySearchInput,
  UniversityComparisonInput,
  CreateUniversityInput,
  UpdateUniversityInput,
  buildUniversitySearchQuery,
  parseUniversityDeadlines,
  parseUniversityMajors,
} from '../validations/university';

const prisma = new PrismaClient();

export interface UniversityWithParsedData {
  id: string;
  name: string;
  country: string;
  state: string | null;
  city: string;
  usNewsRanking: number | null;
  acceptanceRate: number | null;
  applicationSystem: string;
  tuitionInState: number | null;
  tuitionOutState: number | null;
  applicationFee: number | null;
  deadlines: Record<string, string> | null;
  majorsOffered: string[];
  websiteUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UniversitySearchResult {
  universities: UniversityWithParsedData[];
  total: number;
  hasMore: boolean;
}

// Transform raw university data to include parsed JSON fields
function transformUniversityData(university: any): UniversityWithParsedData {
  return {
    ...university,
    deadlines: parseUniversityDeadlines(university.deadlines),
    majorsOffered: parseUniversityMajors(university.majorsOffered),
  };
}

// Search universities with advanced filtering
export async function searchUniversities(filters: UniversitySearchInput): Promise<UniversitySearchResult> {
  const where = buildUniversitySearchQuery(filters);
  
  // Handle major filtering separately since it requires JSON parsing
  let universities;
  let total;

  if (filters.majors && filters.majors.length > 0) {
    // For major filtering, we need to fetch all matching universities and filter in memory
    // This is a limitation of SQLite JSON handling
    const allUniversities = await prisma.university.findMany({
      where,
      orderBy: [
        { usNewsRanking: 'asc' },
        { name: 'asc' }
      ],
    });

    const filteredUniversities = allUniversities.filter(university => {
      const majors = parseUniversityMajors(university.majorsOffered);
      return filters.majors!.some(filterMajor => 
        majors.some(major => 
          major.toLowerCase().includes(filterMajor.toLowerCase())
        )
      );
    });

    total = filteredUniversities.length;
    universities = filteredUniversities
      .slice(filters.offset, filters.offset + filters.limit)
      .map(transformUniversityData);
  } else {
    // Regular search without major filtering
    const [universitiesResult, totalResult] = await Promise.all([
      prisma.university.findMany({
        where,
        orderBy: [
          { usNewsRanking: 'asc' },
          { name: 'asc' }
        ],
        take: filters.limit,
        skip: filters.offset,
      }),
      prisma.university.count({ where }),
    ]);

    universities = universitiesResult.map(transformUniversityData);
    total = totalResult;
  }

  return {
    universities,
    total,
    hasMore: filters.offset + filters.limit < total,
  };
}

// Get university by ID
export async function getUniversityById(id: string): Promise<UniversityWithParsedData | null> {
  const university = await prisma.university.findUnique({
    where: { id },
  });

  if (!university) return null;
  return transformUniversityData(university);
}

// Get multiple universities for comparison
export async function getUniversitiesForComparison(input: UniversityComparisonInput): Promise<UniversityWithParsedData[]> {
  const universities = await prisma.university.findMany({
    where: {
      id: {
        in: input.universityIds,
      },
    },
    orderBy: { name: 'asc' },
  });

  return universities.map(transformUniversityData);
}

// Create new university (admin function)
export async function createUniversity(data: CreateUniversityInput): Promise<UniversityWithParsedData> {
  const university = await prisma.university.create({
    data,
  });

  return transformUniversityData(university);
}

// Update university (admin function)
export async function updateUniversity(id: string, data: UpdateUniversityInput): Promise<UniversityWithParsedData | null> {
  try {
    const university = await prisma.university.update({
      where: { id },
      data,
    });

    return transformUniversityData(university);
  } catch (error) {
    // Handle case where university doesn't exist
    return null;
  }
}

// Delete university (admin function)
export async function deleteUniversity(id: string): Promise<boolean> {
  try {
    await prisma.university.delete({
      where: { id },
    });
    return true;
  } catch (error) {
    return false;
  }
}

// Get university statistics
export async function getUniversityStatistics() {
  const [
    total,
    byCountry,
    byApplicationSystem,
    averageAcceptanceRate,
    averageTuition,
  ] = await Promise.all([
    prisma.university.count(),
    prisma.university.groupBy({
      by: ['country'],
      _count: { country: true },
      orderBy: { _count: { country: 'desc' } },
    }),
    prisma.university.groupBy({
      by: ['applicationSystem'],
      _count: { applicationSystem: true },
    }),
    prisma.university.aggregate({
      _avg: { acceptanceRate: true },
      where: { acceptanceRate: { not: null } },
    }),
    prisma.university.aggregate({
      _avg: { 
        tuitionInState: true,
        tuitionOutState: true,
      },
      where: { 
        OR: [
          { tuitionInState: { not: null } },
          { tuitionOutState: { not: null } },
        ]
      },
    }),
  ]);

  return {
    total,
    byCountry: byCountry.map(item => ({
      country: item.country,
      count: item._count.country,
    })),
    byApplicationSystem: byApplicationSystem.map(item => ({
      system: item.applicationSystem,
      count: item._count.applicationSystem,
    })),
    averageAcceptanceRate: averageAcceptanceRate._avg.acceptanceRate,
    averageTuitionInState: averageTuition._avg.tuitionInState,
    averageTuitionOutState: averageTuition._avg.tuitionOutState,
  };
}

// Get popular majors across all universities
export async function getPopularMajors(limit: number = 20): Promise<Array<{ major: string; count: number }>> {
  const universities = await prisma.university.findMany({
    select: { majorsOffered: true },
    where: { majorsOffered: { not: null } },
  });

  const majorCounts: Record<string, number> = {};

  universities.forEach(university => {
    const majors = parseUniversityMajors(university.majorsOffered);
    majors.forEach(major => {
      majorCounts[major] = (majorCounts[major] || 0) + 1;
    });
  });

  return Object.entries(majorCounts)
    .map(([major, count]) => ({ major, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

// Get universities by location
export async function getUniversitiesByLocation(country?: string, state?: string): Promise<UniversityWithParsedData[]> {
  const where: any = {};
  
  if (country) {
    where.country = { equals: country, mode: 'insensitive' };
  }
  
  if (state) {
    where.state = { equals: state, mode: 'insensitive' };
  }

  const universities = await prisma.university.findMany({
    where,
    orderBy: [
      { usNewsRanking: 'asc' },
      { name: 'asc' }
    ],
  });

  return universities.map(transformUniversityData);
}

// Get unique countries and states for filter options
export async function getLocationOptions(): Promise<{
  countries: string[];
  states: Array<{ country: string; states: string[] }>;
}> {
  const universities = await prisma.university.findMany({
    select: { country: true, state: true },
    distinct: ['country', 'state'],
    orderBy: [
      { country: 'asc' },
      { state: 'asc' }
    ],
  });

  const countries = [...new Set(universities.map(u => u.country))];
  
  const statesByCountry: Record<string, Set<string>> = {};
  universities.forEach(u => {
    if (u.state) {
      if (!statesByCountry[u.country]) {
        statesByCountry[u.country] = new Set();
      }
      statesByCountry[u.country].add(u.state);
    }
  });

  const states = Object.entries(statesByCountry).map(([country, stateSet]) => ({
    country,
    states: Array.from(stateSet).sort(),
  }));

  return { countries, states };
}