import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { ProfileService } from '@/lib/services/profile';
import { CreateStudentProfileSchema, UpdateStudentProfileSchema } from '@/lib/validations/profile';
import { z } from 'zod';

// GET /api/profile - Get current user's profile
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'student') {
      return NextResponse.json({ error: 'Only students can have academic profiles' }, { status: 403 });
    }

    const profile = await ProfileService.getProfileByUserId(session.user.id);
    
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Parse JSON fields for response
    const responseProfile = {
      ...profile,
      targetCountries: profile.targetCountries ? JSON.parse(profile.targetCountries) : [],
      intendedMajors: profile.intendedMajors ? JSON.parse(profile.intendedMajors) : [],
    };

    return NextResponse.json(responseProfile);
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/profile - Create a new profile
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'student') {
      return NextResponse.json({ error: 'Only students can create academic profiles' }, { status: 403 });
    }

    const body = await request.json();
    const data = CreateStudentProfileSchema.parse(body);

    const profile = await ProfileService.createProfile(session.user.id, data);

    // Parse JSON fields for response
    const responseProfile = {
      ...profile,
      targetCountries: profile.targetCountries ? JSON.parse(profile.targetCountries) : [],
      intendedMajors: profile.intendedMajors ? JSON.parse(profile.intendedMajors) : [],
    };

    return NextResponse.json(responseProfile, { status: 201 });
  } catch (error) {
    console.error('Error creating profile:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.issues },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      if (error.message.includes('already exists')) {
        return NextResponse.json(
          { error: error.message },
          { status: 409 }
        );
      }
      
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/profile - Update existing profile
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'student') {
      return NextResponse.json({ error: 'Only students can update academic profiles' }, { status: 403 });
    }

    const body = await request.json();
    const data = UpdateStudentProfileSchema.parse(body);

    const profile = await ProfileService.updateProfile(session.user.id, data);

    // Parse JSON fields for response
    const responseProfile = {
      ...profile,
      targetCountries: profile.targetCountries ? JSON.parse(profile.targetCountries) : [],
      intendedMajors: profile.intendedMajors ? JSON.parse(profile.intendedMajors) : [],
    };

    return NextResponse.json(responseProfile);
  } catch (error) {
    console.error('Error updating profile:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.issues },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/profile - Delete profile
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'student') {
      return NextResponse.json({ error: 'Only students can delete academic profiles' }, { status: 403 });
    }

    await ProfileService.deleteProfile(session.user.id);

    return NextResponse.json({ message: 'Profile deleted successfully' });
  } catch (error) {
    console.error('Error deleting profile:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}