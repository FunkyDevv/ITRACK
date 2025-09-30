# I-TRACK - Professional Tracking System

## Overview

I-TRACK is a professional tracking system designed to streamline workflow management between supervisors and interns. The application provides role-based dashboards and authentication, enabling supervisors to manage teams and track progress while allowing interns to view tasks and submit progress reports.

The system is built as a full-stack web application with a React frontend and Express.js backend, featuring modern UI components, secure authentication, and database-driven data persistence.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **UI Framework**: Radix UI primitives with shadcn/ui component system
- **Styling**: Tailwind CSS with CSS custom properties for theming
- **Form Handling**: React Hook Form with Zod validation
- **Build Tool**: Vite for fast development and optimized builds

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Authentication**: Replit Auth integration with OpenID Connect
- **Session Management**: Express sessions with PostgreSQL store
- **Password Hashing**: bcrypt for secure password storage
- **API Design**: RESTful endpoints with JSON responses
- **Middleware**: Request logging, error handling, and authentication guards

### Data Layer
- **Database**: PostgreSQL with Neon serverless driver
- **ORM**: Drizzle ORM for type-safe database operations
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Connection Pooling**: Neon serverless connection pooling for scalability

### Authentication & Authorization
- **Primary Auth**: Replit Auth with OpenID Connect for seamless integration
- **Fallback Auth**: Traditional email/password authentication for supervisors
- **Role-Based Access**: Supervisor and intern roles with different permissions
- **Session Security**: Secure HTTP-only cookies with CSRF protection

### Project Structure
- **Monorepo**: Unified codebase with shared TypeScript types
- **Client**: React frontend in `/client` directory
- **Server**: Express backend in `/server` directory
- **Shared**: Common types and schemas in `/shared` directory
- **Path Aliases**: TypeScript path mapping for clean imports

## External Dependencies

### Authentication Services
- **Replit Auth**: Primary authentication provider using OpenID Connect
- **OpenID Client**: OAuth 2.0/OpenID Connect client library

### Database & Storage
- **Neon Database**: Serverless PostgreSQL hosting
- **Drizzle ORM**: TypeScript ORM with PostgreSQL dialect
- **Connect PG Simple**: PostgreSQL session store for Express

### UI & Styling
- **Radix UI**: Unstyled, accessible UI primitives
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library for consistent iconography
- **class-variance-authority**: Component variant management

### Development Tools
- **Vite**: Build tool and development server
- **TypeScript**: Static type checking
- **ESBuild**: Fast JavaScript bundler for production
- **PostCSS**: CSS processing with Tailwind and Autoprefixer

### Form & Data Management
- **React Hook Form**: Performant form library
- **Zod**: TypeScript-first schema validation
- **TanStack Query**: Server state synchronization
- **Date-fns**: Date manipulation utilities