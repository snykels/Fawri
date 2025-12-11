# Salla Product Lister AI

## Overview

Salla Product Lister AI is a web application that automates creating product listings for the Salla e-commerce platform by analyzing product images using OCR (Tesseract.js) and barcode detection (jsQR). AI providers (OpenAI, Gemini, OpenRouter) serve as optional enhancement tools for content improvement.

The application follows a three-step workflow: Upload (product images) → Analyze (OCR + barcode detection) → Generate (optionally AI-enhanced product data).

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
- **Image Processing**: Sharp library for resizing and preprocessing images
- **OCR**: Tesseract.js for text extraction from product images
- **Barcode Detection**: jsQR for QR code and barcode scanning
- **AI Enhancement**: Optional - OpenAI, Gemini, or OpenRouter for content improvement
- **Excel Generation**: ExcelJS for creating Salla-compatible import files

### Data Flow
1. User uploads front/back product images via drag-and-drop interface
2. Images are converted to Base64 on the client
3. Server preprocesses images (resize to 1000x1000, white background fill)
4. OCR extracts text from both images using Tesseract.js
5. jsQR attempts barcode detection
6. Regex patterns extract specs (brand, model, RAM, storage, color)
7. Template-based Arabic product content is generated
8. If AI enhancement is enabled, AI verifies and improves the content
9. Data validated against Zod schema and returned to client
10. User can preview and download as Excel file

### Image Analysis Pipeline (server/image-analyzer.ts)
- `extractBarcodeFromImage`: Uses jsQR to detect QR codes
- `extractTextFromImage`: OCR using Tesseract.js with Arabic+English support
- `parseSpecsFromText`: Regex patterns for known brands, specs, barcodes
- `generateProductContent`: Template-based Arabic content generation
- `analyzeProductImages`: Orchestrates the full analysis workflow

### Schema Design
- **Validation**: Zod schemas in `shared/schema.ts` for type-safe API contracts
- **Product Data Schema**: product_name, seo_title, marketing_description, category, brand, sku_barcode
- **Analysis Result Schema**: barcode, modelNumber, brand, ram, storage, color, confidence
- **Salla Excel Row Schema**: Maps output to Arabic column headers for Salla import

### Design System
- Fluent Design principles adapted for productivity-focused utility application
- RTL-ready with Cairo font for Arabic text support
- Light/dark theme toggle with localStorage persistence
- Professional minimalism prioritizing workflow clarity

## External Dependencies

### AI Services (Optional Enhancement)
- **Gemini**: Via Replit AI Integrations (built-in credits, no API key needed)
- **OpenRouter**: Via Replit AI Integrations (built-in credits, no API key needed)
- **OpenAI**: Requires user's own API key

### Key NPM Packages
- `tesseract.js`: OCR text extraction
- `jsqr`: Barcode and QR code detection
- `pngjs`: PNG image parsing for jsQR
- `sharp`: High-performance image preprocessing
- `openai`: OpenAI SDK for GPT-4o calls
- `@google/genai`: Google Gemini SDK
- `exceljs`: Excel file generation
- `drizzle-orm` / `drizzle-zod`: Database ORM and schema integration
- `@tanstack/react-query`: Data fetching and caching
- `zod`: Runtime type validation

### Build & Development
- Vite for frontend bundling with HMR
- esbuild for server bundling in production
- TypeScript with strict mode enabled
- Express body limit set to 15MB for large base64 images
