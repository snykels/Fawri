# Salla Product Lister AI

## Overview

Salla Product Lister AI is a web application that automates creating product listings for the Salla e-commerce platform by analyzing product images using AI. Users upload front and back product images, the system processes them through OpenAI's GPT-4o vision model, and generates structured product data that can be exported as Excel files compatible with Salla's import format.

The application follows a three-step workflow: Configure (API key) → Upload (product images) → Generate (AI-powered listing data).

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state, React useState for local state
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS custom properties for theming
- **Build Tool**: Vite with React plugin

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript with ESM modules
- **API Structure**: RESTful endpoints under `/api` prefix
- **Image Processing**: Sharp library for resizing and preprocessing images before AI analysis
- **AI Integration**: OpenAI SDK for GPT-4o vision model calls
- **Excel Generation**: ExcelJS for creating Salla-compatible import files

### Data Flow
1. User uploads front/back product images via drag-and-drop interface
2. Images are converted to Base64 on the client
3. Server preprocesses images (resize to 1000x1000, white background fill)
4. Processed images sent to GPT-4o with specialized e-commerce prompt
5. AI returns structured JSON with product data
6. Data validated against Zod schema and returned to client
7. User can preview and download as Excel file

### Schema Design
- **Validation**: Zod schemas in `shared/schema.ts` for type-safe API contracts
- **Product Data Schema**: Defines fields like product_name, seo_title, marketing_description, category, brand, sku_barcode
- **Salla Excel Row Schema**: Maps AI output to Arabic column headers required by Salla import format

### Design System
- Fluent Design principles adapted for productivity-focused utility application
- RTL-ready with Cairo font for Arabic text support
- Light/dark theme toggle with localStorage persistence
- Professional minimalism prioritizing workflow clarity

## External Dependencies

### AI Services
- **OpenAI API**: GPT-4o vision model for analyzing product images and generating listing data
- User provides their own API key stored in localStorage

### Database
- **PostgreSQL**: Configured via Drizzle ORM (drizzle.config.ts references DATABASE_URL)
- **Session Storage**: connect-pg-simple for Express sessions
- Currently minimal database usage; schema file exists for future expansion

### Key NPM Packages
- `openai`: Official OpenAI SDK for API calls
- `sharp`: High-performance image processing
- `exceljs`: Excel file generation for Salla-compatible exports
- `drizzle-orm` / `drizzle-zod`: Database ORM and schema-to-Zod integration
- `@tanstack/react-query`: Data fetching and caching
- `zod`: Runtime type validation

### Build & Development
- Vite for frontend bundling with HMR
- esbuild for server bundling in production
- TypeScript with strict mode enabled