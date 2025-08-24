import { NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { withAuth } from '@/lib/auth'

const prisma = new PrismaClient()

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ noteId: string }> }
) {
  return withAuth(request, async (req, user) => {
    try {
      const resolvedParams = await params
      const { noteId } = resolvedParams

      // Find the note and verify it belongs to this parent
      const note = await prisma.parentNote.findUnique({
        where: { id: noteId },
        include: {
          application: {
            select: { studentId: true },
          },
        },
      })

      if (!note) {
        return Response.json(
          { error: 'Note not found' },
          { status: 404 }
        )
      }

      // Verify the note belongs to this parent
      if (note.parentId !== user.id) {
        return Response.json(
          { error: 'Forbidden - not authorized to delete this note' },
          { status: 403 }
        )
      }

      // Delete the note
      await prisma.parentNote.delete({
        where: { id: noteId },
      })

      return Response.json({ success: true })
    } catch (error) {
      console.error('Error deleting parent note:', error)
      return Response.json(
        { error: 'Failed to delete note' },
        { status: 500 }
      )
    }
  })
}