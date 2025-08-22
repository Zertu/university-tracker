import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { withAuth } from '@/lib/auth'

const prisma = new PrismaClient()

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req, user) => {
    try {
      const { id: relationshipId } = await params

      // Find the relationship
      const relationship = await prisma.parentChildLink.findUnique({
        where: { id: relationshipId },
        include: {
          parent: { select: { id: true } },
          child: { select: { id: true } }
        }
      })

      if (!relationship) {
        return NextResponse.json(
          { error: 'Relationship not found' },
          { status: 404 }
        )
      }

      // Check if user has permission to delete this relationship
      const canDelete = 
        user.id === relationship.parentId || 
        user.id === relationship.childId

      if (!canDelete) {
        return NextResponse.json(
          { error: 'Permission denied' },
          { status: 403 }
        )
      }

      // Delete the relationship
      await prisma.parentChildLink.delete({
        where: { id: relationshipId }
      })

      return NextResponse.json({ 
        message: 'Relationship deleted successfully' 
      })
    } catch (error) {
      console.error('Relationship deletion error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  })
}