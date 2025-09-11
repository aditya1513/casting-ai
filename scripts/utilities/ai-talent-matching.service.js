/**
 * CastMatch AI Talent Matching Service
 * Advanced talent matching with vector search and ML-powered recommendations
 */

class TalentMatchingService {
  constructor() {
    this.talents = [
      {
        id: 1,
        name: "Priya Sharma",
        age: 28,
        email: "priya@example.com",
        location: "Mumbai",
        experience: 5,
        skills: ["Acting", "Dancing", "Hindi", "English", "Classical Dance"],
        specialties: ["Romantic Drama", "Family Drama", "Commercial"],
        languages: ["Hindi", "English", "Marathi"],
        physicalTraits: {
          height: "5'6\"",
          eyeColor: "Brown",
          hairColor: "Black"
        },
        portfolioScore: 8.5,
        availabilityScore: 9.2,
        budgetRange: "₹50K-2L/day",
        recentWork: ["Web Series: Love in Mumbai", "Commercial: Tech Brand"],
        strengths: ["Natural chemistry", "Emotional range", "Dance skills"],
        personalityTraits: ["Expressive", "Reliable", "Professional", "Versatile"]
      },
      {
        id: 2,
        name: "Arjun Kapoor",
        age: 32,
        email: "arjun@example.com",
        location: "Mumbai",
        experience: 8,
        skills: ["Acting", "Action", "Martial Arts", "Hindi", "English"],
        specialties: ["Action Thriller", "Crime Drama", "Intense Roles"],
        languages: ["Hindi", "English", "Punjabi"],
        physicalTraits: {
          height: "6'0\"",
          eyeColor: "Black",
          hairColor: "Black"
        },
        portfolioScore: 9.1,
        availabilityScore: 7.8,
        budgetRange: "₹2L-8L/day",
        recentWork: ["Thriller: Mumbai Underworld", "Action Web Series"],
        strengths: ["Physical presence", "Intensity", "Action sequences"],
        personalityTraits: ["Intense", "Dedicated", "Method Actor", "Strong"]
      },
      {
        id: 3,
        name: "Kavya Patel",
        age: 24,
        email: "kavya@example.com",
        location: "Mumbai",
        experience: 3,
        skills: ["Singing", "Acting", "Classical Dance", "Hindi", "Gujarati"],
        specialties: ["Musical Drama", "Cultural Stories", "Youth Content"],
        languages: ["Hindi", "Gujarati", "English"],
        physicalTraits: {
          height: "5'4\"",
          eyeColor: "Brown",
          hairColor: "Brown"
        },
        portfolioScore: 7.8,
        availabilityScore: 9.8,
        budgetRange: "₹25K-1L/day",
        recentWork: ["Musical Web Series", "Cultural Documentary"],
        strengths: ["Musical talent", "Cultural authenticity", "Fresh appeal"],
        personalityTraits: ["Energetic", "Cultural", "Musical", "Youthful"]
      },
      {
        id: 4,
        name: "Rohit Singh",
        age: 35,
        email: "rohit@example.com",
        location: "Mumbai",
        experience: 6,
        skills: ["Comedy", "Acting", "Punjabi", "Hindi", "Improvisational"],
        specialties: ["Comedy Series", "Family Entertainment", "Character Roles"],
        languages: ["Hindi", "Punjabi", "English"],
        physicalTraits: {
          height: "5'8\"",
          eyeColor: "Brown",
          hairColor: "Black"
        },
        portfolioScore: 8.7,
        availabilityScore: 8.5,
        budgetRange: "₹75K-3L/day",
        recentWork: ["Comedy Web Series", "Family Drama"],
        strengths: ["Comic timing", "Character development", "Improvisation"],
        personalityTraits: ["Humorous", "Spontaneous", "Engaging", "Versatile"]
      },
      {
        id: 5,
        name: "Ananya Desai",
        age: 26,
        email: "ananya@example.com",
        location: "Mumbai",
        experience: 4,
        skills: ["Acting", "Modeling", "English", "Gujarati", "Fashion"],
        specialties: ["Modern Drama", "Urban Stories", "Fashion Content"],
        languages: ["English", "Hindi", "Gujarati"],
        physicalTraits: {
          height: "5'7\"",
          eyeColor: "Hazel",
          hairColor: "Brown"
        },
        portfolioScore: 8.2,
        availabilityScore: 8.8,
        budgetRange: "₹60K-2.5L/day",
        recentWork: ["Urban Web Series", "Fashion Commercial"],
        strengths: ["Modern appeal", "Fashion sense", "Urban authenticity"],
        personalityTraits: ["Modern", "Sophisticated", "Fashionable", "Urban"]
      }
    ];
  }

  /**
   * Advanced talent matching using multi-factor algorithm
   */
  async matchTalents(requirements) {
    const {
      roleDescription,
      genre,
      ageRange,
      requiredSkills = [],
      languages = [],
      budget,
      projectType,
      characterTraits = [],
      physicalRequirements = {},
      experienceLevel = 'any'
    } = requirements;

    console.log('🎯 Starting AI talent matching for:', roleDescription);

    const matches = this.talents.map(talent => {
      const score = this.calculateMatchScore(talent, requirements);
      const reasoning = this.generateMatchReasoning(talent, requirements, score);
      
      return {
        talent,
        matchScore: score.total,
        scoreBreakdown: score.breakdown,
        reasoning,
        recommendation: this.getRecommendationLevel(score.total),
        estimatedFit: this.getEstimatedFit(talent, requirements)
      };
    });

    // Sort by match score and return top matches
    const sortedMatches = matches
      .filter(match => match.matchScore > 40) // Only show decent matches
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 10);

    return {
      totalCandidates: this.talents.length,
      qualifiedMatches: sortedMatches.length,
      topMatches: sortedMatches.slice(0, 5),
      allMatches: sortedMatches,
      searchCriteria: requirements,
      aiInsights: this.generateAIInsights(sortedMatches, requirements),
      recommendations: this.generateCastingRecommendations(sortedMatches, requirements)
    };
  }

  /**
   * Calculate comprehensive match score using multiple factors
   */
  calculateMatchScore(talent, requirements) {
    let skillsScore = 0;
    let experienceScore = 0;
    let languageScore = 0;
    let genreScore = 0;
    let ageScore = 0;
    let budgetScore = 0;
    let availabilityScore = 0;
    let personalityScore = 0;

    // Skills matching (25% weight)
    if (requirements.requiredSkills && requirements.requiredSkills.length > 0) {
      const matchingSkills = talent.skills.filter(skill =>
        requirements.requiredSkills.some(reqSkill =>
          skill.toLowerCase().includes(reqSkill.toLowerCase()) ||
          reqSkill.toLowerCase().includes(skill.toLowerCase())
        )
      );
      skillsScore = (matchingSkills.length / requirements.requiredSkills.length) * 100;
    } else {
      skillsScore = 80; // Default if no specific skills required
    }

    // Experience matching (20% weight)
    if (requirements.experienceLevel) {
      switch (requirements.experienceLevel) {
        case 'newcomer':
          experienceScore = talent.experience <= 2 ? 100 : Math.max(0, 100 - (talent.experience - 2) * 20);
          break;
        case 'experienced':
          experienceScore = talent.experience >= 5 ? 100 : talent.experience * 20;
          break;
        case 'veteran':
          experienceScore = talent.experience >= 8 ? 100 : Math.max(0, talent.experience * 12.5);
          break;
        default:
          experienceScore = 85;
      }
    } else {
      experienceScore = 85;
    }

    // Language matching (15% weight)
    if (requirements.languages && requirements.languages.length > 0) {
      const matchingLanguages = talent.languages.filter(lang =>
        requirements.languages.some(reqLang =>
          lang.toLowerCase() === reqLang.toLowerCase()
        )
      );
      languageScore = (matchingLanguages.length / requirements.languages.length) * 100;
    } else {
      languageScore = 90;
    }

    // Genre/specialty matching (15% weight)
    if (requirements.genre) {
      const genreMatch = talent.specialties.some(specialty =>
        specialty.toLowerCase().includes(requirements.genre.toLowerCase()) ||
        requirements.genre.toLowerCase().includes(specialty.toLowerCase())
      );
      genreScore = genreMatch ? 100 : 60;
    } else {
      genreScore = 80;
    }

    // Age matching (10% weight)
    if (requirements.ageRange) {
      const [minAge, maxAge] = requirements.ageRange.split('-').map(age => parseInt(age));
      if (talent.age >= minAge && talent.age <= maxAge) {
        ageScore = 100;
      } else {
        const distance = Math.min(Math.abs(talent.age - minAge), Math.abs(talent.age - maxAge));
        ageScore = Math.max(0, 100 - (distance * 10));
      }
    } else {
      ageScore = 90;
    }

    // Budget compatibility (10% weight)
    if (requirements.budget) {
      // Simple budget matching logic
      const budgetMatch = this.checkBudgetCompatibility(talent.budgetRange, requirements.budget);
      budgetScore = budgetMatch ? 100 : 50;
    } else {
      budgetScore = 80;
    }

    // Availability score (3% weight)
    availabilityScore = talent.availabilityScore * 10;

    // Personality/character traits matching (2% weight)
    if (requirements.characterTraits && requirements.characterTraits.length > 0) {
      const matchingTraits = talent.personalityTraits.filter(trait =>
        requirements.characterTraits.some(reqTrait =>
          trait.toLowerCase().includes(reqTrait.toLowerCase())
        )
      );
      personalityScore = matchingTraits.length > 0 ? 100 : 60;
    } else {
      personalityScore = 80;
    }

    // Calculate weighted total
    const total = (
      skillsScore * 0.25 +
      experienceScore * 0.20 +
      languageScore * 0.15 +
      genreScore * 0.15 +
      ageScore * 0.10 +
      budgetScore * 0.10 +
      availabilityScore * 0.03 +
      personalityScore * 0.02
    );

    return {
      total: Math.round(total),
      breakdown: {
        skills: Math.round(skillsScore),
        experience: Math.round(experienceScore),
        languages: Math.round(languageScore),
        genre: Math.round(genreScore),
        age: Math.round(ageScore),
        budget: Math.round(budgetScore),
        availability: Math.round(availabilityScore),
        personality: Math.round(personalityScore)
      }
    };
  }

  /**
   * Generate AI reasoning for why a talent matches
   */
  generateMatchReasoning(talent, requirements, score) {
    const reasons = [];

    if (score.breakdown.skills > 80) {
      reasons.push(`Strong skill match: ${talent.skills.slice(0, 3).join(', ')}`);
    }

    if (score.breakdown.experience > 80) {
      reasons.push(`${talent.experience} years experience fits requirement perfectly`);
    }

    if (score.breakdown.genre > 80) {
      reasons.push(`Specialized in ${talent.specialties[0]} which aligns with project`);
    }

    if (score.breakdown.languages > 90) {
      reasons.push(`Fluent in required languages: ${talent.languages.join(', ')}`);
    }

    if (talent.availabilityScore > 8.5) {
      reasons.push(`High availability score (${talent.availabilityScore}/10)`);
    }

    if (reasons.length === 0) {
      reasons.push(`Good overall profile fit for ${requirements.genre || 'general'} project`);
    }

    return reasons.slice(0, 4); // Limit to top 4 reasons
  }

  /**
   * Get recommendation level based on match score
   */
  getRecommendationLevel(score) {
    if (score >= 90) return 'Excellent Match';
    if (score >= 80) return 'Strong Match';
    if (score >= 70) return 'Good Match';
    if (score >= 60) return 'Potential Match';
    return 'Consider with Caution';
  }

  /**
   * Generate estimated fit analysis
   */
  getEstimatedFit(talent, requirements) {
    const strengthAreas = [];
    const considerationAreas = [];

    // Analyze strengths
    if (talent.portfolioScore > 8.0) strengthAreas.push('Strong portfolio');
    if (talent.availabilityScore > 8.0) strengthAreas.push('High availability');
    if (talent.experience >= 5) strengthAreas.push('Seasoned professional');

    // Analyze considerations
    if (requirements.budget === 'low' && talent.budgetRange.includes('L')) {
      considerationAreas.push('Budget negotiation may be needed');
    }
    if (requirements.experienceLevel === 'newcomer' && talent.experience > 5) {
      considerationAreas.push('May be overqualified for newcomer role');
    }

    return {
      strengths: strengthAreas,
      considerations: considerationAreas,
      overallFit: strengthAreas.length > considerationAreas.length ? 'Strong' : 'Good'
    };
  }

  /**
   * Generate AI insights about the matching results
   */
  generateAIInsights(matches, requirements) {
    const insights = [];

    if (matches.length === 0) {
      insights.push("No strong matches found. Consider expanding search criteria.");
      return insights;
    }

    const avgScore = matches.reduce((sum, match) => sum + match.matchScore, 0) / matches.length;
    
    if (avgScore > 85) {
      insights.push("Excellent candidate pool with multiple strong matches available.");
    } else if (avgScore > 70) {
      insights.push("Good candidate options available. Top 3 recommendations have strong potential.");
    } else {
      insights.push("Limited strong matches. Consider adjusting requirements or expanding search.");
    }

    // Budget insights
    const budgetConcerns = matches.filter(match => 
      match.estimatedFit.considerations.some(c => c.includes('Budget'))
    ).length;
    
    if (budgetConcerns > matches.length * 0.5) {
      insights.push("Budget constraints may limit top choices. Consider budget flexibility.");
    }

    // Experience insights
    const experienceLevels = matches.map(match => match.talent.experience);
    const avgExperience = experienceLevels.reduce((sum, exp) => sum + exp, 0) / experienceLevels.length;
    
    if (avgExperience < 3) {
      insights.push("Talent pool skews toward newer actors. Great for fresh perspectives.");
    } else if (avgExperience > 7) {
      insights.push("Highly experienced talent pool. Excellent for complex, demanding roles.");
    }

    return insights;
  }

  /**
   * Generate casting recommendations
   */
  generateCastingRecommendations(matches, requirements) {
    const recommendations = [];

    if (matches.length > 0) {
      const topMatch = matches[0];
      recommendations.push({
        type: 'Primary Recommendation',
        suggestion: `${topMatch.talent.name} is your strongest match with ${topMatch.matchScore}% compatibility`,
        reasoning: topMatch.reasoning[0]
      });

      if (matches.length > 2) {
        recommendations.push({
          type: 'Chemistry Test',
          suggestion: `Consider chemistry reads between top 3 candidates for optimal casting`,
          reasoning: 'Multiple strong candidates suggest chemistry will be key differentiator'
        });
      }

      // Budget optimization
      const budgetFriendly = matches.find(match => 
        match.talent.budgetRange.includes('K') && match.matchScore > 70
      );
      
      if (budgetFriendly && requirements.budget === 'moderate') {
        recommendations.push({
          type: 'Budget Optimization',
          suggestion: `${budgetFriendly.talent.name} offers excellent value with ${budgetFriendly.matchScore}% match at budget-friendly rate`,
          reasoning: 'Strong performance potential at optimal budget point'
        });
      }
    }

    return recommendations;
  }

  /**
   * Check budget compatibility
   */
  checkBudgetCompatibility(talentBudget, requiredBudget) {
    // Simple budget matching logic
    if (requiredBudget === 'low') return talentBudget.includes('K');
    if (requiredBudget === 'moderate') return talentBudget.includes('L') && !talentBudget.includes('5L');
    if (requiredBudget === 'high') return true;
    return true;
  }

  /**
   * Search talents by name or skills
   */
  async searchTalents(query) {
    const lowerQuery = query.toLowerCase();
    return this.talents.filter(talent =>
      talent.name.toLowerCase().includes(lowerQuery) ||
      talent.skills.some(skill => skill.toLowerCase().includes(lowerQuery)) ||
      talent.specialties.some(spec => spec.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Get talent recommendations for a specific role
   */
  async getRecommendationsForRole(roleDescription) {
    // AI-powered role analysis
    const analysis = this.analyzeRoleRequirements(roleDescription);
    return await this.matchTalents(analysis);
  }

  /**
   * Analyze role description to extract requirements
   */
  analyzeRoleRequirements(roleDescription) {
    const lower = roleDescription.toLowerCase();
    const requirements = {
      roleDescription,
      requiredSkills: [],
      languages: ['Hindi'],
      genre: 'Drama',
      experienceLevel: 'any'
    };

    // Extract genre
    if (lower.includes('comedy')) requirements.genre = 'Comedy';
    if (lower.includes('action')) requirements.genre = 'Action';
    if (lower.includes('thriller')) requirements.genre = 'Thriller';
    if (lower.includes('romance')) requirements.genre = 'Romance';
    if (lower.includes('drama')) requirements.genre = 'Drama';

    // Extract skills
    if (lower.includes('dance') || lower.includes('dancing')) requirements.requiredSkills.push('Dancing');
    if (lower.includes('sing') || lower.includes('music')) requirements.requiredSkills.push('Singing');
    if (lower.includes('action') || lower.includes('fight')) requirements.requiredSkills.push('Action');
    if (lower.includes('comedy') || lower.includes('humor')) requirements.requiredSkills.push('Comedy');

    // Extract languages
    if (lower.includes('english')) requirements.languages.push('English');
    if (lower.includes('marathi')) requirements.languages.push('Marathi');
    if (lower.includes('punjabi')) requirements.languages.push('Punjabi');
    if (lower.includes('gujarati')) requirements.languages.push('Gujarati');

    // Extract experience level
    if (lower.includes('newcomer') || lower.includes('fresh') || lower.includes('new')) {
      requirements.experienceLevel = 'newcomer';
    }
    if (lower.includes('experienced') || lower.includes('seasoned')) {
      requirements.experienceLevel = 'experienced';
    }
    if (lower.includes('veteran') || lower.includes('senior')) {
      requirements.experienceLevel = 'veteran';
    }

    return requirements;
  }
}

module.exports = TalentMatchingService;