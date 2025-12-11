# Design Guidelines: Salla Product Lister AI

## Design Approach

**System Selected:** Fluent Design System principles adapted for a productivity-focused data processing tool
**Rationale:** This is a utility-first application requiring clarity, efficiency, and professional polish. The interface prioritizes workflow completion over visual storytelling.

## Core Design Principles

1. **Workflow Clarity:** Visual hierarchy guides users through the three-step process (Configure → Upload → Generate)
2. **Data Confidence:** All generated data is visible for verification before download
3. **RTL-Ready:** Full support for Arabic text display with proper alignment and spacing
4. **Professional Minimalism:** Clean, distraction-free interface focused on task completion

## Typography System

**Font Family:** Inter for UI elements, Cairo for Arabic text support (both via Google Fonts)

**Hierarchy:**
- App Title: text-3xl font-bold (32px)
- Section Headers: text-xl font-semibold (20px)
- Form Labels: text-sm font-medium (14px)
- Body Text: text-base (16px)
- Helper Text: text-sm text-gray-600 (14px)
- Generated Data Preview: text-lg font-medium (18px)

## Layout System

**Spacing Primitives:** Use Tailwind units of 2, 4, 6, 8, and 12 for consistent rhythm
- Component padding: p-6 or p-8
- Section spacing: space-y-6 or space-y-8
- Form field gaps: gap-4
- Button padding: px-6 py-3

**Container Structure:**
- Max width: max-w-6xl mx-auto
- Page padding: px-6 py-8
- Card components: rounded-lg with appropriate padding

**Grid System:**
- Image upload area: 2-column grid (lg:grid-cols-2 gap-6)
- Configuration sidebar: Single column, sticky positioning
- Main content: Full-width with max-w-4xl for form elements

## Component Library

### Navigation/Header
- Fixed top bar with app title and settings icon
- Height: h-16
- Contains app branding and quick access to API key configuration

### Sidebar Configuration Panel
- Slide-out drawer from right side (or persistent left sidebar on desktop)
- Contains API key input field and optional CSV uploader
- Width: w-80 on desktop
- Includes clear visual indicator of configuration status (API key entered/not entered)

### Image Upload Cards
- Two side-by-side upload zones for Front and Back images
- Drag-and-drop target areas with dashed borders
- Height: min-h-80
- Visual states: empty, hover, uploaded
- Each shows image preview thumbnail after upload with filename and file size
- Remove/replace button overlaid on thumbnail

### Form Elements
- Input fields: Clean rectangular inputs with h-12, px-4
- File upload buttons: Prominent with upload icon
- Labels: Bold, positioned above inputs with mb-2
- All inputs have focus states with ring treatment

### Generated Data Preview Section
- Card layout displaying all extracted fields
- Two-column grid for field name/value pairs
- Highlighted SKU and Product Name with larger text
- JSON structure displayed in collapsible code block for transparency

### Action Buttons
- Primary CTA (Generate Listing): Large, prominent, px-8 py-4 text-lg
- Secondary action (Download Excel): px-6 py-3
- Disabled states clearly indicated
- Icon + text combination for clarity

### Status Indicators
- Loading spinner during AI processing
- Success/error alerts as toast notifications or inline messages
- Progress indication during image processing

### Excel Preview Table (Optional Enhancement)
- Compact table showing key fields that will be in Excel
- Scrollable if needed
- Arabic headers properly aligned RTL

## Workflow Layout

**Three-Zone Interface:**

1. **Top Configuration Bar:** Persistent API key status indicator, settings access
2. **Main Upload Area:** 
   - Instruction text at top explaining the two-image requirement
   - 2-column grid for Front/Back image uploads
   - Each upload card includes helpful label ("Front Image - Product Shot" / "Back Image - Specs & Barcode")
3. **Action Zone:** 
   - Generate button (disabled until both images uploaded)
   - Results appear below in expandable section
   - Download button appears after successful generation

## Animations

**Minimal & Purposeful:**
- Sidebar slide-in/out transition (300ms ease)
- Image upload fade-in after selection
- Loading spinner during AI processing
- Success state subtle scale animation on download button
- No scroll-triggered or decorative animations

## Accessibility

- All form inputs have associated labels
- File upload areas keyboard accessible
- Status messages announced to screen readers
- Focus indicators on all interactive elements
- Sufficient contrast ratios throughout
- RTL text direction properly handled via dir="rtl" on Arabic content

## Images

**No Hero Images Required** - This is a utility application where functional clarity trumps visual storytelling.

**Icon Usage:**
- Heroicons via CDN for UI icons
- Upload icon, settings icon, download icon, checkmark, error indicators
- 24px size for primary actions, 20px for secondary

## Responsive Behavior

- **Desktop (lg+):** Two-column image upload, sidebar persistent or drawer
- **Tablet (md):** Two-column maintained, sidebar becomes drawer
- **Mobile (base):** Single column stack, all cards full-width, drawer navigation

## Visual Polish Details

- Subtle shadows on cards: shadow-sm on default, shadow-md on hover
- Rounded corners: rounded-lg for cards, rounded-md for inputs
- Border treatment: Subtle borders on cards and inputs
- Upload zones: Thicker dashed borders (border-2 border-dashed)
- White space: Generous padding prevents cramped feeling
- Dividers: Subtle horizontal rules between major sections