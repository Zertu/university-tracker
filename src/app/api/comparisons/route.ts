import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Validation schema for saving comparisons
const saveComparisonSchema = z.object({
  name: z.string().min(1, 'Comparison name is required').max(100, 'Name too long'),
  universityIds: z.array(z.string().cuid()).min(2, 'At least 2 universities required').max(5, 'Maximum 5 universities'),
  description: z.string().max(500, 'Description too long').optional(),
});

// GET - Get user's saved comparisons
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const comparisons = await prisma.savedComparison.findMany({
      where: { userId: session.user.id },
      include: {
        universities: {
          select: {
            id: true,
            name: true,
            city: true,
            state: true,
            country: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ comparisons });
  } catch (error) {
    console.error('Get saved comparisons error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Save a new comparison
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedInput = saveComparisonSchema.parse(body);

    // Check if universities exist
    const universities = await prisma.university.findMany({
      where: { id: { in: validatedInput.universityIds } },
      select: { id: true },
    });

    if (universities.length !== validatedInput.universityIds.length) {
      return NextResponse.json(
        { error: 'One or more universities not found' },
        { status: 404 }
      );
    }

    // Create saved comparison
    const savedComparison = await prisma.savedComparison.create({
      data: {
        name: validatedInput.name,
        description: validatedInput.description,
        userId: session.user.id,
        universities: {
          connect: validatedInput.universityIds.map(id => ({ id })),
        },
      },
      include: {
        universities: {
          select: {
            id: true,
            name: true,
            city: true,
            state: true,
            country: true,
          }
        }
      },
    });

    return NextResponse.json({ comparison: savedComparison }, { status: 201 });
  } catch (error) {
    console.error('Save comparison error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
