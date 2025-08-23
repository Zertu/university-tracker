import { NextRequest, NextResponse } from 'next/server';
import { ApplicationService } from '@/lib/services/application';
import { CreateApplicationSchema, ApplicationQuerySchema } from '@/lib/validations/application';
import { createStudentHandler } from '@/lib/api/middleware';

// GET /api/applications - Get all applications for the current student
export const GET = createStudentHandler(
  async (request, context, { auth, validated }) => {
    const result = await ApplicationService.getApplicationsByStudent(
      auth!.user.id,
      validated!.query
    );

    return NextResponse.json(result);
  },
  {
    validation: {
      query: ApplicationQuerySchema,
    },
    rateLimit: 'general',
    permission: {
      resource: 'application',
      action: 'read',
    },
  }
);

// POST /api/applications - Create a new application
export const POST = createStudentHandler(
  async (request, context, { auth, validated }) => {
    const application = await ApplicationService.createApplication(
      auth!.user.id,
      validated!.body
    );

    return NextResponse.json(application, { status: 201 });
  },
  {
    validation: {
      body: CreateApplicationSchema,
    },
    rateLimit: 'general',
    permission: {
      resource: 'application',
      action: 'create',
    },
  }
);