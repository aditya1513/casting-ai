import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import prisma from '@/lib/prisma';

// GET /api/talents - Search and filter talents
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Extract query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const skills = searchParams.get('skills')?.split(',') || [];
    const location = searchParams.get('location') || '';
    const minAge = parseInt(searchParams.get('minAge') || '0');
    const maxAge = parseInt(searchParams.get('maxAge') || '100');
    const gender = searchParams.get('gender') || '';
    const availability = searchParams.get('availability') || '';
    
    const skip = (page - 1) * limit;

    // Build where clause for filtering
    const where: any = {
      role: 'ACTOR',
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { profile: { bio: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (location) {
      where.profile = {
        ...where.profile,
        location: { contains: location, mode: 'insensitive' }
      };
    }

    if (gender) {
      where.profile = {
        ...where.profile,
        gender: gender
      };
    }

    // Get talents with pagination
    const [talents, totalCount] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          profile: {
            select: {
              bio: true,
              experience: true,
              skills: true,
              location: true,
              gender: true,
              age: true,
              languages: true,
              height: true,
              weight: true,
              portfolio: true,
              achievements: true,
              availability: true,
              ratePerDay: true,
            }
          },
          mediaFiles: {
            select: {
              id: true,
              url: true,
              type: true,
              title: true,
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.user.count({ where })
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return NextResponse.json({
      success: true,
      data: talents,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
        hasNext,
        hasPrev
      }
    });

  } catch (error) {
    console.error('Error fetching talents:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch talents',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST /api/talents - Create talent profile (for actors)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const data = await request.json();
    const {
      bio,
      experience,
      skills,
      location,
      gender,
      age,
      languages,
      height,
      weight,
      portfolio,
      achievements,
      availability,
      ratePerDay
    } = data;

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: {
        profile: {
          upsert: {
            create: {
              bio,
              experience,
              skills,
              location,
              gender,
              age,
              languages,
              height,
              weight,
              portfolio,
              achievements,
              availability,
              ratePerDay
            },
            update: {
              bio,
              experience,
              skills,
              location,
              gender,
              age,
              languages,
              height,
              weight,
              portfolio,
              achievements,
              availability,
              ratePerDay
            }
          }
        }
      },
      include: {
        profile: true
      }
    });

    return NextResponse.json({
      success: true,
      data: updatedUser
    });

  } catch (error) {
    console.error('Error creating talent profile:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create talent profile',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PATCH /api/talents/[id] - Update talent profile
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const data = await request.json();
    const { id, ...updateData } = data;

    // Verify ownership
    const user = await prisma.user.findUnique({
      where: { id },
      select: { email: true }
    });

    if (user?.email !== session.user.email) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Update profile
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        profile: {
          update: updateData
        }
      },
      include: {
        profile: true,
        mediaFiles: true
      }
    });

    return NextResponse.json({
      success: true,
      data: updatedUser
    });

  } catch (error) {
    console.error('Error updating talent profile:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update talent profile',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}