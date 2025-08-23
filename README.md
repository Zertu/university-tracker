# University Application Tracker

A comprehensive web application for managing university applications, tracking deadlines, and staying organized throughout the application process.

## Features

- **User Authentication**: Secure login/signup with NextAuth.js
- **Application Management**: Track applications to different universities
- **Deadline Tracking**: Never miss important application deadlines
- **University Database**: Comprehensive university information
- **Role-based Access**: Support for students, parents, and administrators
- **Real-time Notifications**: Stay updated on application status changes

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd university-tracker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file in the root directory:
   ```bash
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=23f5277f72b500978aeb4592fa4d640e1b4a070ed36d555757083a5f5eb974d6
   DATABASE_URL="file:./dev.db"
   ```

4. **Set up the database**
   ```bash
   npx prisma generate
   npx prisma migrate dev
   npx prisma db seed
   npx tsx scripts/create-test-user.ts
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

### Test Account

Use these credentials to test the application:
- **Email**: `test@example.com`
- **Password**: `password123`

## Troubleshooting

### Common Issues

1. **Infinite redirect loop on signin**
   - Solution: Follow the setup guide in `SETUP.md`
   - Ensure environment variables are properly configured

2. **Font loading errors**
   - Solution: The app uses system fonts as fallback
   - No action required - functionality is not affected

3. **Database connection issues**
   - Solution: Run `npx prisma studio` to check database
   - Reset database: `npm run db:reset`

### Detailed Setup Guide

For detailed setup instructions and troubleshooting, see [SETUP.md](./SETUP.md).

## Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS
- **Authentication**: NextAuth.js
- **Database**: SQLite with Prisma ORM
- **Deployment**: Vercel-ready

## Project Structure

```
src/
├── app/                 # Next.js app router pages
├── components/          # React components
├── lib/                 # Utility functions and services
├── types/               # TypeScript type definitions
└── middleware.ts        # Next.js middleware
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.