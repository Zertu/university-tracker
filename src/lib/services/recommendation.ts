import { prisma } from '@/lib/prisma';
import { ProfileService } from './profile';
import { Prisma } from '@prisma/client';

// Types for recommendations
export interface UniversityRecommendation {
  university: UniversityWithDetails;
  matchScore: number;
  matchLikelihood: 'high' | 'medium' | 'low';
  reasons: string[];
  category: 'reach' | 'target' | 'safety';
}

export interface RecommendationFilters {
  countries?: string[];
  majors?: string[];
  minAcceptanceRate?: number;
  maxAcceptanceRate?: number;
  maxTuition?: number;
  applicationSystem?: string;
  limit?: number;
}

export interface RecommendationStats {
  totalRecommendations: number;
  reachSchools: number;
  targetSchools: number;
  safetySchools: number;
  averageMatchScore: number;
}

// University type with all details
type UniversityWithDetails = Prisma.UniversityGetPayload<{
  select: {
    id: true;
    name: true;
    country: true;
    state: true;
    city: true;
    usNewsRanking: true;
    acceptanceRate: true;
    applicationSystem: true;
    tuitionInState: true;
    tuitionOutState: true;
    applicationFee: true;
    deadlines: true;
    majorsOffered: true;
    websiteUrl: true;
  };
}>;

export class RecommendationService {
  // Get personalized university recommendations
  static async getRecommendations(
    userId: string,
    filters: RecommendationFilters = {}
  ): Promise<{
    recommendations: UniversityRecommendation[];
    stats: RecommendationStats;
    profileStats: any;
  }> {
    // Get user's profile stats
    const profileStats = await ProfileService.getProfileStats(userId);
    
    if (!profileStats) {
      throw new Error('User profile not found. Please complete your academic profile first.');
    }

    // Build university query based on profile and filters
    const whereClause = this.buildUniversityQuery(profileStats, filters);
    
    // Fetch universities
    const universities = await prisma.university.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        country: true,
        state: true,
        city: true,
        usNewsRanking: true,
        acceptanceRate: true,
        applicationSystem: true,
        tuitionInState: true,
        tuitionOutState: true,
        applicationFee: true,
        deadlines: true,
        majorsOffered: true,
        websiteUrl: true,
      },
      take: filters.limit || 50,
    });

    // Calculate recommendations with match scores
    const recommendations = universities
      .map(university => this.calculateRecommendation(university, profileStats))
      .sort((a, b) => b.matchScore - a.matchScore);

    // Calculate stats
    const stats = this.calculateRecommendationStats(recommendations);

    return {
      recommendations,
      stats,
      profileStats,
    };
  }

  // Refresh recommendations (recalculate based on updated profile)
  static async refreshRecommendations(userId: string): Promise<void> {
    // This could be used to trigger background recalculation
    // For now, recommendations are calculated on-demand
  }

  // Get recommendation by university ID
  static async getUniversityRecommendation(
    userId: string,
    universityId: string
  ): Promise<UniversityRecommendation | null> {
    const profileStats = await ProfileService.getProfileStats(userId);
    
    if (!profileStats) {
      return null;
    }

    const university = await prisma.university.findUnique({
      where: { id: universityId },
      select: {
        id: true,
        name: true,
        country: true,
        state: true,
        city: true,
        usNewsRanking: true,
        acceptanceRate: true,
        applicationSystem: true,
        tuitionInState: true,
        tuitionOutState: true,
        applicationFee: true,
        deadlines: true,
        majorsOffered: true,
        websiteUrl: true,
      },
    });

    if (!university) {
      return null;
    }

    return this.calculateRecommendation(university, profileStats);
  }

  // Build university query based on profile and filters
  private static buildUniversityQuery(
    profileStats: any,
    filters: RecommendationFilters
  ): Prisma.UniversityWhereInput {
    const andConditions: Prisma.UniversityWhereInput[] = [];
    const whereClause: Prisma.UniversityWhereInput = {
      AND: andConditions,
    };

    // Filter by target countries from profile
    if (profileStats.preferences.countries.length > 0) {
      andConditions.push({
        country: {
          in: filters.countries || profileStats.preferences.countries,
        },
      });
    }

    // Filter by majors offered (if user has intended majors)
    if (profileStats.preferences.majors.length > 0) {
      const majorFilters = (filters.majors || profileStats.preferences.majors).map((major: string) => ({
        majorsOffered: {
          contains: major,
        },
      }));

      andConditions.push({
        OR: majorFilters,
      });
    }

    // Filter by acceptance rate range
    if (filters.minAcceptanceRate !== undefined || filters.maxAcceptanceRate !== undefined) {
      const acceptanceRateFilter: any = {};
      
      if (filters.minAcceptanceRate !== undefined) {
        acceptanceRateFilter.gte = filters.minAcceptanceRate;
      }
      
      if (filters.maxAcceptanceRate !== undefined) {
        acceptanceRateFilter.lte = filters.maxAcceptanceRate;
      }

      andConditions.push({
        acceptanceRate: acceptanceRateFilter,
      });
    }

    // Filter by tuition (use out-of-state tuition as default)
    if (filters.maxTuition !== undefined) {
      andConditions.push({
        OR: [
          { tuitionOutState: { lte: filters.maxTuition } },
          { tuitionInState: { lte: filters.maxTuition } },
        ],
      });
    }

    // Filter by application system
    if (filters.applicationSystem) {
      andConditions.push({
        applicationSystem: filters.applicationSystem,
      });
    }

    // Ensure we have basic required data
    andConditions.push({
      acceptanceRate: { not: null },
      name: { not: '' },
    });

    return whereClause;
  }

  // Calculate recommendation for a single university
  private static calculateRecommendation(
    university: UniversityWithDetails,
    profileStats: any
  ): UniversityRecommendation {
    let matchScore = 0;
    const reasons: string[] = [];
    const maxScore = 100;

    // Academic fit scoring (40% of total score)
    const academicScore = this.calculateAcademicFit(university, profileStats);
    matchScore += academicScore * 0.4;
    
    if (academicScore > 70) {
      reasons.push('Strong academic match based on your test scores and GPA');
    } else if (academicScore > 40) {
      reasons.push('Good academic fit for your profile');
    }

    // Major alignment scoring (25% of total score)
    const majorScore = this.calculateMajorAlignment(university, profileStats);
    matchScore += majorScore * 0.25;
    
    if (majorScore > 80) {
      reasons.push('Excellent programs in your intended majors');
    } else if (majorScore > 50) {
      reasons.push('Offers programs in your areas of interest');
    }

    // Location preference scoring (20% of total score)
    const locationScore = this.calculateLocationFit(university, profileStats);
    matchScore += locationScore * 0.2;
    
    if (locationScore > 80) {
      reasons.push('Located in your preferred country/region');
    }

    // Ranking and reputation scoring (15% of total score)
    const rankingScore = this.calculateRankingScore(university);
    matchScore += rankingScore * 0.15;
    
    if (university.usNewsRanking && university.usNewsRanking <= 50) {
      reasons.push('Highly ranked institution');
    } else if (university.usNewsRanking && university.usNewsRanking <= 100) {
      reasons.push('Well-regarded university');
    }

    // Determine match likelihood and category
    const matchLikelihood = this.determineMatchLikelihood(university, profileStats);
    const category = this.determineSchoolCategory(university, profileStats);

    // Add category-specific reasons
    if (category === 'reach') {
      reasons.push('Reach school - competitive but worth applying');
    } else if (category === 'safety') {
      reasons.push('Safety school - high likelihood of acceptance');
    } else {
      reasons.push('Target school - good match for your profile');
    }

    return {
      university,
      matchScore: Math.min(Math.round(matchScore), maxScore),
      matchLikelihood,
      reasons,
      category,
    };
  }

  // Calculate academic fit based on GPA and test scores
  private static calculateAcademicFit(university: UniversityWithDetails, profileStats: any): number {
    let score = 50; // Base score

    if (!university.acceptanceRate) return score;

    const userCompetitiveness = profileStats.competitiveness; // 0-1 scale
    const schoolSelectivity = 1 - (university.acceptanceRate / 100); // Convert to 0-1 scale

    // Compare user competitiveness to school selectivity
    const competitivenessRatio = userCompetitiveness / Math.max(schoolSelectivity, 0.1);

    if (competitivenessRatio >= 1.2) {
      score = 90; // User is overqualified
    } else if (competitivenessRatio >= 1.0) {
      score = 80; // User meets/exceeds requirements
    } else if (competitivenessRatio >= 0.8) {
      score = 70; // User is competitive
    } else if (competitivenessRatio >= 0.6) {
      score = 50; // User has a chance
    } else {
      score = 30; // User is below typical admits
    }

    return score;
  }

  // Calculate major alignment score
  private static calculateMajorAlignment(university: UniversityWithDetails, profileStats: any): number {
    if (!university.majorsOffered || profileStats.preferences.majors.length === 0) {
      return 50; // Neutral score if no major data
    }

    const majorsOffered = JSON.parse(university.majorsOffered) as string[];
    const intendedMajors = profileStats.preferences.majors;

    let matchCount = 0;
    for (const intendedMajor of intendedMajors) {
      const hasMatch = majorsOffered.some(offered => 
        offered.toLowerCase().includes(intendedMajor.toLowerCase()) ||
        intendedMajor.toLowerCase().includes(offered.toLowerCase())
      );
      if (hasMatch) matchCount++;
    }

    const alignmentRatio = matchCount / intendedMajors.length;
    return Math.round(alignmentRatio * 100);
  }

  // Calculate location fit score
  private static calculateLocationFit(university: UniversityWithDetails, profileStats: any): number {
    if (profileStats.preferences.countries.length === 0) {
      return 50; // Neutral if no preference
    }

    const isPreferredCountry = profileStats.preferences.countries.includes(university.country);
    return isPreferredCountry ? 100 : 30;
  }

  // Calculate ranking score
  private static calculateRankingScore(university: UniversityWithDetails): number {
    if (!university.usNewsRanking) {
      return 50; // Neutral for unranked schools
    }

    // Convert ranking to score (lower ranking = higher score)
    if (university.usNewsRanking <= 10) return 100;
    if (university.usNewsRanking <= 25) return 90;
    if (university.usNewsRanking <= 50) return 80;
    if (university.usNewsRanking <= 100) return 70;
    if (university.usNewsRanking <= 200) return 60;
    return 50;
  }

  // Determine match likelihood
  private static determineMatchLikelihood(
    university: UniversityWithDetails,
    profileStats: any
  ): 'high' | 'medium' | 'low' {
    if (!university.acceptanceRate) return 'medium';

    const userCompetitiveness = profileStats.competitiveness;
    const acceptanceRate = university.acceptanceRate / 100;

    // High likelihood: user is competitive and school has reasonable acceptance rate
    if (userCompetitiveness >= 0.7 && acceptanceRate >= 0.3) return 'high';
    if (userCompetitiveness >= 0.8 && acceptanceRate >= 0.15) return 'high';

    // Low likelihood: very selective school or user below typical admits
    if (acceptanceRate <= 0.1 && userCompetitiveness < 0.8) return 'low';
    if (userCompetitiveness < 0.4) return 'low';

    return 'medium';
  }

  // Determine school category (reach/target/safety)
  private static determineSchoolCategory(
    university: UniversityWithDetails,
    profileStats: any
  ): 'reach' | 'target' | 'safety' {
    if (!university.acceptanceRate) return 'target';

    const userCompetitiveness = profileStats.competitiveness;
    const acceptanceRate = university.acceptanceRate / 100;

    // Safety schools: high acceptance rate and user is competitive
    if (acceptanceRate >= 0.5 && userCompetitiveness >= 0.6) return 'safety';
    if (acceptanceRate >= 0.7) return 'safety';

    // Reach schools: very selective or user below typical admits
    if (acceptanceRate <= 0.15) return 'reach';
    if (acceptanceRate <= 0.3 && userCompetitiveness < 0.7) return 'reach';

    return 'target';
  }

  // Calculate recommendation statistics
  private static calculateRecommendationStats(
    recommendations: UniversityRecommendation[]
  ): RecommendationStats {
    const totalRecommendations = recommendations.length;
    const reachSchools = recommendations.filter(r => r.category === 'reach').length;
    const targetSchools = recommendations.filter(r => r.category === 'target').length;
    const safetySchools = recommendations.filter(r => r.category === 'safety').length;
    
    const averageMatchScore = totalRecommendations > 0
      ? Math.round(recommendations.reduce((sum, r) => sum + r.matchScore, 0) / totalRecommendations)
      : 0;

    return {
      totalRecommendations,
      reachSchools,
      targetSchools,
      safetySchools,
      averageMatchScore,
    };
  }

  // Get recommendations by category
  static async getRecommendationsByCategory(
    userId: string,
    category: 'reach' | 'target' | 'safety',
    limit: number = 10
  ): Promise<UniversityRecommendation[]> {
    const { recommendations } = await this.getRecommendations(userId, { limit: 50 });
    
    return recommendations
      .filter(r => r.category === category)
      .slice(0, limit);
  }

  // Get top recommendations
  static async getTopRecommendations(
    userId: string,
    limit: number = 10
  ): Promise<UniversityRecommendation[]> {
    const { recommendations } = await this.getRecommendations(userId, { limit });
    
    return recommendations.slice(0, limit);
  }
}
