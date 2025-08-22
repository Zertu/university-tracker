# University Application Tracker

A comprehensive platform to help high school students manage their college application process, track deadlines, and stay organized throughout their university applications.

## Features

- **Application Management**: Track applications across multiple universities and application systems
- **Deadline Tracking**: Never miss important deadlines with visual alerts and calendar integration
- **Requirements Checklist**: Manage essays, recommendations, transcripts, and other requirements
- **Parent Dashboard**: Allow parents to monitor progress with read-only access
- **University Search**: Advanced filtering and comparison tools
- **Third-party Integration**: Connect with CommonApp and other application platforms

## Tech Stack

- **Frontend**: Next.js 15 with TypeScript and Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: SQLite with Prisma ORM
- **Authentication**: NextAuth.js
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up the database:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
src/
├── app/                 # Next.js app router pages
├── components/          # React components
│   └── layout/         # Layout components
├── lib/                # Utility functions and configurations
│   ├── prisma.ts       # Database client
│   ├── utils.ts        # General utilities
│   └── validations.ts  # Zod validation schemas
└── types/              # TypeScript type definitions
```

## Database Schema

The application uses a comprehensive database schema with the following main entities:

- **Users**: Student, parent, teacher, and admin accounts
- **Student Profiles**: Academic information and preferences
- **Universities**: Comprehensive university database
- **Applications**: Application tracking with status workflow
- **Requirements**: Individual requirement tracking per application
- **Integrations**: Third-party service connections
- **Notifications**: System alerts and reminders

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Database Commands

- `npx prisma studio` - Open Prisma Studio database browser
- `npx prisma generate` - Generate Prisma client
- `npx prisma db push` - Push schema changes to database
- `npx prisma db pull` - Pull schema from database

## License

This project is licensed under the MIT License.