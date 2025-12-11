# Salla Product Lister AI

## Overview

Salla Product Lister AI is a web application that automates creating product listings for the Salla e-commerce platform. It uses Google Gemini AI exclusively with an OSINT-style (Product Intelligence Agent) methodology to analyze product images and extract complete, verified product data.

The application follows a streamlined workflow: Upload (front + back product images) → AI Analysis (OSINT methodology) → Download (Salla-compatible Excel file).

## User Preferences

Preferred communication style: Simple, everyday language (Arabic preferred).

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
- **Image Processing**: Sharp library for resizing and preprocessing images (1000x1000, white background)
- **AI Provider**: Google Gemini exclusively via Replit AI Integrations (no API key needed)
- **Excel Generation**: ExcelJS for creating Salla-compatible import files

### AI Analysis Workflow (OSINT Methodology)
The AI follows a 4-step Product Intelligence Agent workflow:

1. **Visual Analysis & OCR**: Extract text, logos, serial numbers, barcodes from images
2. **Initial Search Simulation**: Identify product name and brand using keyword matching
3. **Data Mining Loop**: 
   - Name → Model Number (MPN)
   - Model → Identifiers (ASIN, etc.)
   - Identifiers → Barcode (GTIN/EAN/UPC)
4. **Reverse Verification**: Verify barcode leads back to same product

### Data Flow
1. User uploads front/back product images via drag-and-drop interface
2. Images are converted to Base64 on the client
3. Server preprocesses images (resize to 1000x1000, white background fill)
4. Gemini AI analyzes images using OSINT methodology
5. AI extracts: product name, brand, category, barcode/MPN, descriptions
6. Data validated against Zod schema (all fields required, non-empty)
7. User previews data and downloads Salla-compatible Excel file

### Schema Design
- **Validation**: Zod schemas in `shared/schema.ts` with min(1) validators
- **Product Data Fields**: 
  - product_name (required)
  - seo_title (required)
  - marketing_description (required)
  - full_description (required)
  - category (required)
  - brand (required)
  - sku_barcode (required - barcode or MPN)

### Excel Export
- Uses exact Salla template format (`attached_assets/Salla_Products_Template_1765491101794.xlsx`)
- Removes row 1 (duplicate header) using `spliceRows(1, 1)`
- Appends products after header row with correct column mapping:
  - Column 1: النوع (منتج)
  - Column 2: اسم المنتج
  - Column 3: تصنيف المنتج
  - Column 8: الوصف
  - Column 10: رمز المنتج (SKU)
  - Column 20: الماركة
  - Column 21: عنوان SEO
  - Column 27: تفعيل

### Design System
- Fluent Design principles adapted for productivity-focused utility application
- RTL-ready with Cairo font for Arabic text support
- Light/dark theme toggle with localStorage persistence
- Professional minimalism prioritizing workflow clarity

## External Dependencies

### AI Service
- **Gemini**: Via Replit AI Integrations (built-in credits, no API key needed)

### Key NPM Packages
- `@google/genai`: Google Gemini SDK for AI analysis
- `sharp`: High-performance image preprocessing
- `exceljs`: Excel file generation with Salla template support
- `drizzle-zod`: Zod schema integration
- `@tanstack/react-query`: Data fetching and caching
- `zod`: Runtime type validation

### Build & Development
- Vite for frontend bundling with HMR
- esbuild for server bundling in production
- TypeScript with strict mode enabled
- Express body limit set to 15MB for large base64 images

## Recent Changes

- **Simplified to Gemini-only**: Removed OpenAI, OpenRouter, multi-provider support
- **OSINT methodology**: Updated AI prompt to follow Product Intelligence Agent workflow
- **Removed UI clutter**: No settings drawer, no analysis stages, no provider selection
- **Stricter validation**: All product fields require non-empty values
- **Excel template fix**: Properly removes row 1 and appends products correctly
