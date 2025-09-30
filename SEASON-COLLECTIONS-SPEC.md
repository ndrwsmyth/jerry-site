# Season Collections Feature Specification

## Executive Summary

This specification outlines the implementation of seasonal collections for the Jerry Lester Studios shop page. Products will be organized under season headers (e.g., "GENESIS", "ANC"), with each product belonging to exactly one season. Seasons are managed through Sanity CMS and displayed as simple headers on the shop page.

---

## Table of Contents

1. [Requirements Overview](#requirements-overview)
2. [Data Model Changes](#data-model-changes)
3. [Component Architecture Changes](#component-architecture-changes)
4. [Data Flow Updates](#data-flow-updates)
5. [Migration Strategy](#migration-strategy)
6. [Implementation Phases](#implementation-phases)
7. [Testing Considerations](#testing-considerations)
8. [Edge Cases & Error Handling](#edge-cases--error-handling)

---

## Requirements Overview

### Functional Requirements

1. **Season Management**:
   - Content editors can create new seasons in Sanity Studio
   - Each season has a customizable title (e.g., "GENESIS", "ANC")
   - Seasons are automatically ordered by creation date (newest first)

2. **Product-Season Relationship**:
   - Every product must belong to exactly one season
   - Products cannot exist without a season assignment
   - Products cannot belong to multiple seasons

3. **Shop Page Display**:
   - Products grouped under season headers
   - Season title displayed as simple header
   - Products within each season sorted alphabetically
   - Existing available/unavailable product logic preserved

4. **No Additional Features**:
   - No filtering by season
   - No anchor links to seasons
   - No season detail pages
   - No archiving/hiding of old seasons

### Non-Functional Requirements

1. **Performance**: Maintain current ISR caching strategy (1-hour revalidation)
2. **SEO**: Preserve server-side rendering for all shop content
3. **Backwards Compatibility**: Handle existing products during migration
4. **Data Integrity**: Enforce required season relationship at schema level

---

## Data Model Changes

### 1. New Season Schema

**File**: `/src/sanity/schemas/season.ts`

```typescript
import { defineField, defineType } from 'sanity';

export default defineType({
  name: 'season',
  title: 'Season',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Season Title',
      type: 'string',
      validation: (Rule) => Rule.required().max(50),
      description: 'The display name for this season (e.g., "GENESIS", "ANC", "SPRING 2025")',
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'title',
        maxLength: 50,
      },
      validation: (Rule) => Rule.required(),
      description: 'URL-friendly version of the season title',
    }),
    defineField({
      name: 'createdAt',
      title: 'Creation Date',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
      validation: (Rule) => Rule.required(),
      description: 'Used for ordering seasons (newest first)',
    }),
  ],
  preview: {
    select: {
      title: 'title',
      createdAt: 'createdAt',
    },
    prepare(selection) {
      const { title, createdAt } = selection;
      const date = new Date(createdAt).toLocaleDateString();
      return {
        title: title,
        subtitle: `Created: ${date}`,
      };
    },
  },
  orderings: [
    {
      title: 'Creation Date, Newest',
      name: 'createdAtDesc',
      by: [{ field: 'createdAt', direction: 'desc' }],
    },
    {
      title: 'Creation Date, Oldest',
      name: 'createdAtAsc',
      by: [{ field: 'createdAt', direction: 'asc' }],
    },
    {
      title: 'Title, A-Z',
      name: 'titleAsc',
      by: [{ field: 'title', direction: 'asc' }],
    },
  ],
});
```

**Schema Fields**:
- `title` (string, required): Display name for the season
- `slug` (slug, required): URL-friendly identifier
- `createdAt` (datetime, required): Auto-populated creation timestamp

**Validation**:
- Title required, max 50 characters
- Slug auto-generated from title
- Creation date auto-populated

---

### 2. Updated Product Schema

**File**: `/src/sanity/schemas/product.ts`

**Add Season Reference Field**:

```typescript
defineField({
  name: 'season',
  title: 'Season',
  type: 'reference',
  to: [{ type: 'season' }],
  validation: (Rule) => Rule.required(),
  description: 'The season/collection this product belongs to',
  options: {
    disableNew: false, // Allow creating new season from product
  },
}),
```

**Field Configuration**:
- Type: `reference` (creates relationship to season document)
- Required: Yes (enforces every product has a season)
- Referenced Type: `season`
- Allows: Creating new season directly from product editor

**Placement**: Add this field after `name` and before `description` for logical grouping

---

### 3. Schema Type Registration

**File**: `/src/sanity/schemaTypes.ts`

```typescript
import { type SchemaTypeDefinition } from 'sanity';

import portfolioType from './schemas/portfolio';
import productType from './schemas/product';
import photosType from './schemas/photos';
import seasonType from './schemas/season'; // NEW

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [
    portfolioType,
    productType,
    photosType,
    seasonType, // NEW
  ],
};
```

---

### 4. Data Model Diagram

```
┌─────────────────────────────────────────┐
│           Season Document                │
│  ┌────────────────────────────────────┐  │
│  │ _id: string                        │  │
│  │ _type: "season"                    │  │
│  │ title: string (required)           │  │
│  │ slug: { current: string }          │  │
│  │ createdAt: datetime (required)     │  │
│  └────────────────────────────────────┘  │
└─────────────────┬───────────────────────┘
                  │
                  │ Referenced by (1:many)
                  │
┌─────────────────▼───────────────────────┐
│          Product Document                │
│  ┌────────────────────────────────────┐  │
│  │ _id: string                        │  │
│  │ _type: "product"                   │  │
│  │ name: string                       │  │
│  │ season: reference (required) ◄─────┼──┘
│  │ description: string                │
│  │ price: number                      │
│  │ availableForCheckout: boolean      │
│  │ quantityAvailable: number          │
│  │ ... (existing fields)              │
│  └────────────────────────────────────┘
└─────────────────────────────────────────┘
```

**Relationship Type**: One-to-Many
- One season can have many products
- Each product belongs to exactly one season
- Enforced by required reference field

---

## Component Architecture Changes

### 1. Updated Shop Page Component

**File**: `/src/app/shop/page.tsx`

**Current Structure**:
```typescript
// Fetches flat list of products
// Sorts by availability, then alphabetically
// Passes to ProductGrid
```

**New Structure**:
```typescript
// 1. Fetch all seasons (ordered by creation date)
// 2. For each season, fetch associated products
// 3. Sort products alphabetically within each season
// 4. Render SeasonSection components
```

**Updated GROQ Query**:

```typescript
const query = groq`*[_type == "season"] | order(createdAt desc) {
  _id,
  title,
  slug,
  createdAt,
  "products": *[_type == "product" && references(^._id)] {
    _id,
    name,
    description,
    price,
    availableForCheckout,
    quantityAvailable,
    "imageUrl": mainImage.asset->url
  } | order(name asc)
}`;
```

**Query Breakdown**:
1. `*[_type == "season"]` - Get all seasons
2. `| order(createdAt desc)` - Sort by creation date (newest first)
3. For each season, populate `products` array:
   - Filter: products that reference this season
   - Include: essential product fields
   - Sort: alphabetically by name

**Data Structure Returned**:

```typescript
type SeasonWithProducts = {
  _id: string;
  title: string;
  slug: { current: string };
  createdAt: string;
  products: Product[];
};
```

**Component JSX Structure**:

```tsx
export default async function ShopPage() {
  const seasons = await client.fetch<SeasonWithProducts[]>(query);

  return (
    <div className="min-h-screen bg-white">
      <NavBar />
      <main className="mx-auto max-w-7xl px-4 py-20">
        <h1 className="mb-12 text-4xl font-bold">Shop</h1>
        
        {seasons.map((season) => (
          <SeasonSection
            key={season._id}
            title={season.title}
            products={season.products}
          />
        ))}
      </main>
    </div>
  );
}

export const revalidate = 3600; // Preserve 1-hour cache
```

---

### 2. New SeasonSection Component

**File**: `/src/components/SeasonSection.tsx`

**Purpose**: Display season header and product grid for that season

**Type**: Server Component (no client-side interactivity needed)

```typescript
import ProductGrid from './ProductGrid';

type Product = {
  _id: string;
  name: string;
  description?: string;
  price: number;
  availableForCheckout?: boolean;
  quantityAvailable?: number;
  imageUrl?: string;
};

type SeasonSectionProps = {
  title: string;
  products: Product[];
};

export default function SeasonSection({ title, products }: SeasonSectionProps) {
  // Don't render if no products (future-proofing)
  if (!products || products.length === 0) {
    return null;
  }

  return (
    <section className="mb-16">
      {/* Season Header */}
      <h2 className="mb-8 text-3xl font-bold uppercase tracking-wide">
        {title}
      </h2>
      
      {/* Product Grid */}
      <ProductGrid products={products} />
    </section>
  );
}
```

**Styling Notes**:
- Simple header with consistent spacing
- Uppercase for season titles (matches screenshot aesthetic)
- Letter spacing for visual impact
- Bottom margin separates seasons
- Reuses existing ProductGrid component

**Props**:
- `title`: Season name to display
- `products`: Array of products for this season (pre-sorted alphabetically)

---

### 3. ProductGrid Component

**File**: `/src/components/ProductGrid.tsx`

**Changes Required**: NONE

**Rationale**:
- ProductGrid already accepts an array of products
- It handles empty states, animations, and responsive layout
- No awareness of seasons needed (receives pre-filtered list)
- Preserves all existing functionality (availability indicators, hover states, etc.)

**Current Signature**:
```typescript
type ProductGridProps = {
  products: Product[];
};
```

This remains unchanged. The grid simply receives a subset of products for each season.

---

### 4. Component Hierarchy Diagram

**Before**:
```
ShopPage (Server Component)
  ├─ NavBar
  └─ ProductGrid
      └─ products: Product[] (all products, sorted)
```

**After**:
```
ShopPage (Server Component)
  ├─ NavBar
  └─ For each season:
      └─ SeasonSection (Server Component)
          ├─ title: string
          └─ ProductGrid
              └─ products: Product[] (season's products, alphabetical)
```

**Key Changes**:
1. Shop page now iterates over seasons instead of flat product list
2. New intermediate SeasonSection component
3. ProductGrid receives filtered products per season
4. All components remain server components (no client-side state)

---

## Data Flow Updates

### Product Listing Flow (Updated)

```
1. User navigates to /shop
   ↓
2. Next.js checks cached page (1-hour TTL)
   ↓
3. If expired, fetch from Sanity CMS
   ↓
4. Execute GROQ query:
   - Fetch all seasons ordered by createdAt (desc)
   - For each season, fetch referenced products
   - Sort products alphabetically by name
   ↓
5. Transform data into SeasonWithProducts[]
   ↓
6. Render shop page:
   - For each season:
     a. Render season header
     b. Pass products to ProductGrid
   ↓
7. User sees products organized by season
```

### Data Fetching Comparison

**Before**:
```typescript
// Single query for all products
const products = await client.fetch(`
  *[_type == "product"] { ... }
`);

// Sort in JavaScript
const sorted = products.sort((a, b) => {
  // available first, then alphabetical
});

// Render single grid
<ProductGrid products={sorted} />
```

**After**:
```typescript
// Single query for seasons + their products
const seasons = await client.fetch(`
  *[_type == "season"] | order(createdAt desc) {
    ...,
    "products": *[_type == "product" && references(^._id)] {
      ...
    } | order(name asc)
  }
`);

// Render multiple grids (one per season)
{seasons.map(season => (
  <SeasonSection
    title={season.title}
    products={season.products}
  />
))}
```

**Performance Considerations**:
- Still a single query (no N+1 problem)
- Sorting handled by GROQ (faster than JavaScript)
- Response size similar to before
- Cache strategy unchanged (1-hour ISR)

---

## Migration Strategy

### Phase 1: Schema Deployment (No Breaking Changes)

**Step 1.1**: Add Season Schema
```bash
# Create new schema file
# Register in schemaTypes.ts
# Deploy to Sanity Studio
```

**Step 1.2**: Update Product Schema (Make Optional First)
```typescript
// Temporarily make season optional for migration
defineField({
  name: 'season',
  title: 'Season',
  type: 'reference',
  to: [{ type: 'season' }],
  validation: (Rule) => Rule.optional(), // TEMPORARY
}),
```

**Step 1.3**: Deploy Sanity Changes
```bash
pnpm sanity deploy
```

**Result**: New season type available, but not required yet

---

### Phase 2: Data Migration

**Step 2.1**: Create Default Season

In Sanity Studio:
1. Navigate to Seasons section
2. Create new season document:
   - Title: "GENERAL" (or "ARCHIVE", "LEGACY")
   - Slug: auto-generated
   - Creation date: auto-populated

**Step 2.2**: Assign Existing Products

Option A - Manual (Small Product Count):
1. Open each product in Sanity Studio
2. Select default season from dropdown
3. Publish

Option B - Automated (Large Product Count):

Create migration script: `/scripts/migrate-products-to-default-season.js`

```javascript
import { createClient } from '@sanity/client';

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
});

async function migrateProducts() {
  // 1. Get or create default season
  let defaultSeason = await client.fetch(
    `*[_type == "season" && title == "GENERAL"][0]`
  );
  
  if (!defaultSeason) {
    defaultSeason = await client.create({
      _type: 'season',
      title: 'GENERAL',
      slug: { current: 'general' },
      createdAt: new Date().toISOString(),
    });
    console.log('Created default season:', defaultSeason._id);
  }

  // 2. Find products without season
  const productsWithoutSeason = await client.fetch(
    `*[_type == "product" && !defined(season)]{ _id, name }`
  );
  
  console.log(`Found ${productsWithoutSeason.length} products to migrate`);

  // 3. Update each product
  for (const product of productsWithoutSeason) {
    await client
      .patch(product._id)
      .set({
        season: {
          _type: 'reference',
          _ref: defaultSeason._id,
        },
      })
      .commit();
    
    console.log(`✓ Migrated: ${product.name}`);
  }

  console.log('Migration complete!');
}

migrateProducts().catch(console.error);
```

Run migration:
```bash
node scripts/migrate-products-to-default-season.js
```

**Step 2.3**: Verify Migration

```javascript
// Check all products have seasons
const orphanedProducts = await client.fetch(
  `count(*[_type == "product" && !defined(season)])`
);

console.log(`Orphaned products: ${orphanedProducts}`); // Should be 0
```

---

### Phase 3: Enforce Required Relationship

**Step 3.1**: Update Product Schema
```typescript
// Make season required
defineField({
  name: 'season',
  title: 'Season',
  type: 'reference',
  to: [{ type: 'season' }],
  validation: (Rule) => Rule.required(), // NOW REQUIRED
}),
```

**Step 3.2**: Deploy Schema Update
```bash
pnpm sanity deploy
```

**Result**: All future products must have a season

---

### Phase 4: Frontend Implementation

**Step 4.1**: Create SeasonSection Component
```bash
# Create /src/components/SeasonSection.tsx
```

**Step 4.2**: Update Shop Page
```typescript
// Update /src/app/shop/page.tsx
// Replace flat product query with season-based query
// Update JSX to render SeasonSection components
```

**Step 4.3**: Test Locally
```bash
pnpm dev
# Verify season headers appear
# Verify products grouped correctly
# Verify alphabetical sorting within seasons
# Verify availability indicators still work
```

**Step 4.4**: Update Revalidation Logic

**File**: `/src/app/api/revalidate/route.ts`

No changes needed, but verify:
```typescript
if (documentType === 'product') {
  revalidatePath('/shop'); // Still works for products
}

// Add case for season changes
if (documentType === 'season') {
  revalidatePath('/shop');
}
```

**Step 4.5**: Update Webhook for Stripe

**File**: `/src/app/api/stripe-webhook/route.ts`

No changes needed - inventory deduction logic unchanged

---

### Phase 5: Deployment

**Step 5.1**: Test on Staging
- Verify all seasons display
- Test product purchasing flow (unchanged)
- Check mobile responsiveness
- Validate cache revalidation

**Step 5.2**: Deploy to Production
```bash
git add .
git commit -m "feat: add seasonal collections to shop page"
git push origin main
# Trigger production deployment
```

**Step 5.3**: Post-Deployment Verification
- Check production shop page
- Verify Sanity Studio season management
- Test product creation (season required)
- Monitor for errors

---

## Implementation Phases

### Phase 1: Backend Setup (1-2 hours)

**Tasks**:
- [ ] Create `/src/sanity/schemas/season.ts`
- [ ] Update `/src/sanity/schemaTypes.ts` to include season
- [ ] Update `/src/sanity/schemas/product.ts` (add season reference, optional)
- [ ] Deploy Sanity schema changes
- [ ] Test season creation in Sanity Studio

**Deliverables**:
- Season schema deployed
- Product schema updated (optional season field)

---

### Phase 2: Data Migration (30 minutes - 2 hours)

**Tasks**:
- [ ] Create default season in Sanity Studio
- [ ] Choose migration approach (manual vs scripted)
- [ ] If scripted: create migration script
- [ ] Run migration
- [ ] Verify all products have seasons
- [ ] Make season field required in product schema
- [ ] Deploy required schema update

**Deliverables**:
- All existing products assigned to seasons
- Season field now required

---

### Phase 3: Frontend Implementation (2-3 hours)

**Tasks**:
- [ ] Create `/src/components/SeasonSection.tsx`
- [ ] Update `/src/app/shop/page.tsx`:
  - [ ] Update GROQ query
  - [ ] Update component JSX
  - [ ] Test data fetching
- [ ] Update `/src/app/api/revalidate/route.ts` (add season case)
- [ ] Local testing:
  - [ ] Create test seasons
  - [ ] Assign products to different seasons
  - [ ] Verify display order
  - [ ] Test responsive layout
  - [ ] Verify product purchasing flow

**Deliverables**:
- SeasonSection component functional
- Shop page displays products grouped by season
- All existing functionality preserved

---

### Phase 4: Testing & QA (1-2 hours)

**Tasks**:
- [ ] Test season ordering (newest first)
- [ ] Test product sorting (alphabetical within seasons)
- [ ] Test empty season handling
- [ ] Test product availability indicators
- [ ] Test checkout flow (should be unchanged)
- [ ] Test cache revalidation on product update
- [ ] Test cache revalidation on season update
- [ ] Mobile responsive testing
- [ ] Cross-browser testing

**Deliverables**:
- QA checklist completed
- Bugs fixed

---

### Phase 5: Deployment (30 minutes)

**Tasks**:
- [ ] Final code review
- [ ] Update documentation (if needed)
- [ ] Deploy to production
- [ ] Monitor for errors
- [ ] Verify production shop page
- [ ] Test Sanity Studio in production

**Deliverables**:
- Feature live in production

---

## Testing Considerations

### Unit Testing Scenarios

**SeasonSection Component**:
```typescript
describe('SeasonSection', () => {
  it('renders season title', () => {
    // Test title display
  });

  it('renders ProductGrid with correct products', () => {
    // Test product passing
  });

  it('returns null when no products', () => {
    // Test empty state
  });

  it('applies correct styling classes', () => {
    // Test CSS classes
  });
});
```

### Integration Testing Scenarios

**Shop Page**:
```typescript
describe('ShopPage', () => {
  it('fetches seasons from Sanity', async () => {
    // Mock Sanity client
    // Verify query execution
  });

  it('displays seasons in creation date order', async () => {
    // Create mock seasons with different dates
    // Verify rendering order
  });

  it('displays products alphabetically within each season', async () => {
    // Create mock products
    // Verify sort order
  });

  it('handles empty seasons gracefully', async () => {
    // Mock season with no products
    // Verify no crash
  });
});
```

### End-to-End Testing Scenarios

**User Flows**:
1. Navigate to shop page
   - Verify seasons load
   - Verify products grouped correctly
   
2. Click product in specific season
   - Verify navigation works
   - Verify product detail loads
   
3. Complete purchase
   - Verify checkout flow unchanged
   - Verify inventory deduction
   - Verify cache revalidation

**Admin Flows**:
1. Create new season in Sanity
   - Verify season appears in shop page
   
2. Create product with season
   - Verify product appears under correct season
   
3. Update product's season
   - Verify product moves to new season on shop page
   
4. Update season title
   - Verify title change reflects on shop page

---

## Edge Cases & Error Handling

### Edge Case 1: Season with No Products

**Scenario**: Season exists but has no products assigned

**Current Behavior**: SeasonSection returns `null`, section not rendered

**Alternative**: Display "Coming Soon" message

**Recommendation**: Keep current behavior (don't render empty seasons)

---

### Edge Case 2: Product Without Season (Data Integrity)

**Scenario**: Product exists without season reference (should be impossible after migration)

**Prevention**:
- Required validation in Sanity schema
- Migration ensures all products have seasons

**Fallback** (defensive programming):
```typescript
// In GROQ query, filter out orphaned products
const seasons = await client.fetch(`
  *[_type == "season"] | order(createdAt desc) {
    ...,
    "products": *[_type == "product" && references(^._id) && defined(season)] {
      ...
    }
  }
`);
```

---

### Edge Case 3: Deleted Season (Orphaned Products)

**Scenario**: Editor deletes a season that has products

**Prevention**: Sanity Studio will warn about references

**Solution**: Before deleting season:
1. Reassign products to different season
2. Or delete products first

**Technical Implementation**: Add warning in Sanity schema:
```typescript
// In season schema
validation: (Rule) => 
  Rule.custom(async (value, context) => {
    const productCount = await context.getClient({ apiVersion: '2024-01-01' })
      .fetch(`count(*[_type == "product" && references($seasonId)])`, {
        seasonId: context.document._id
      });
    
    if (productCount > 0) {
      return `Cannot delete: ${productCount} products belong to this season`;
    }
    return true;
  })
```

---

### Edge Case 4: Very Long Season Titles

**Scenario**: Editor creates season with extremely long title

**Prevention**: Max length validation (50 characters)

**UI Handling**: 
```typescript
// In SeasonSection component
<h2 className="mb-8 text-3xl font-bold uppercase tracking-wide break-words">
  {title}
</h2>
```

**CSS**: Add `break-words` to prevent overflow

---

### Edge Case 5: Identical Season Titles

**Scenario**: Two seasons with same title (e.g., "SPRING 2025")

**Allowed**: Yes (slugs will differ)

**Recommendation**: Add helper text in Sanity Studio:
```typescript
description: 'The display name for this season. Can be reused, but unique titles recommended.'
```

---

### Error Handling: Sanity Fetch Failure

**Scenario**: Sanity API unavailable or returns error

**Current Behavior**: Next.js error boundary

**Enhanced Handling**:
```typescript
export default async function ShopPage() {
  try {
    const seasons = await client.fetch<SeasonWithProducts[]>(query);
    
    if (!seasons || seasons.length === 0) {
      return <EmptyShopState />;
    }
    
    return (
      // ... normal rendering
    );
  } catch (error) {
    console.error('Failed to fetch shop data:', error);
    return <ShopErrorState />;
  }
}
```

---

## API Impact Analysis

### Checkout API (`/api/checkout/route.ts`)

**Changes Required**: NONE

**Rationale**: 
- Checkout only needs product ID
- Season is not part of checkout flow
- Inventory management unchanged

---

### Stripe Webhook API (`/api/stripe-webhook/route.ts`)

**Changes Required**: NONE

**Rationale**:
- Webhook updates product inventory only
- Season relationship not affected by purchases
- Revalidation path `/shop` still correct

---

### Revalidation API (`/api/revalidate/route.ts`)

**Changes Required**: ADD season case

**Update**:
```typescript
if (documentType === 'product') {
  revalidatePath('/shop');
  if (body._id) {
    revalidatePath(`/shop/product/${body._id}`);
  }
}

// NEW: Handle season updates
if (documentType === 'season') {
  revalidatePath('/shop');
}
```

**Trigger Cases**:
- Season title updated → revalidate shop page
- Season created → revalidate shop page
- Season deleted → revalidate shop page

---

## Sanity Studio Customization

### Optional Enhancement: Season Preview in Product List

**File**: `/src/sanity/schemas/product.ts`

```typescript
preview: {
  select: {
    name: 'name',
    price: 'price',
    media: 'mainImage',
    seasonTitle: 'season.title', // NEW
  },
  prepare(selection) {
    const { name, price, media, seasonTitle } = selection;
    return {
      title: name,
      subtitle: `$${price} • ${seasonTitle || 'No Season'}`, // Show season
      media: media,
    };
  },
},
```

**Benefit**: Editors can see which season each product belongs to in list view

---

### Optional Enhancement: Season-Based Ordering in Product List

**File**: `/src/sanity/structure.ts`

```typescript
// Group products by season in studio
S.listItem()
  .title('Products by Season')
  .child(
    S.documentList()
      .title('Products')
      .filter('_type == "product"')
      .params({ seasonId: S.documentTypeListItem('season').getId() })
      .filter('_type == "product" && season._ref == $seasonId')
  ),
```

**Benefit**: Easier for editors to manage products within a season

---

## Documentation Updates

### Files to Update

1. **SHOP-PAGE-ARCHITECTURE.md**:
   - Add season schema to Data Schema section
   - Update Data Flow Architecture with season grouping
   - Add SeasonSection to Component Hierarchy
   - Update GROQ query examples

2. **README.md** (if exists):
   - Mention seasonal collections feature
   - Update content management instructions

3. **Migration Checklist** (create new file):
   - Step-by-step migration guide for future reference

---

## Success Metrics

### Post-Deployment Validation

**Functional**:
- [ ] All products visible on shop page
- [ ] Products grouped under correct seasons
- [ ] Seasons ordered by creation date (newest first)
- [ ] Products alphabetically sorted within seasons
- [ ] Checkout flow works for all products
- [ ] Inventory deduction works correctly

**Performance**:
- [ ] Page load time unchanged (< 3s)
- [ ] ISR caching working (1-hour revalidation)
- [ ] Sanity query response time acceptable (< 500ms)

**Content Management**:
- [ ] Editors can create new seasons
- [ ] Editors can assign products to seasons
- [ ] Editors can update season titles
- [ ] Product creation requires season selection
- [ ] Sanity Studio responsive and functional

---

## Future Enhancements (Out of Scope)

### Potential V2 Features

1. **Season Detail Pages**: `/shop/season/[slug]` with full collection view
2. **Season Descriptions**: Rich text field for collection stories
3. **Season Hero Images**: Visual banner for each collection
4. **Seasonal Filtering**: Allow users to toggle between seasons
5. **Archive Functionality**: Hide/show old seasons
6. **Season-Specific Styling**: Custom colors/themes per season
7. **Launch Dates**: Schedule season visibility
8. **Season Analytics**: Track sales per season

**Not Implementing Now**:
- Keeps initial scope manageable
- Can be added incrementally
- Gathers user feedback first

---

## Risk Assessment

### Low Risk
- ✅ Schema changes (additive, not breaking)
- ✅ Component creation (new code, no conflicts)
- ✅ Data migration (reversible, one-time operation)

### Medium Risk
- ⚠️ GROQ query changes (test thoroughly)
- ⚠️ Product purchasing flow (regression testing needed)

### Mitigation Strategies
- Comprehensive testing before deployment
- Staging environment validation
- Rollback plan (keep old shop page temporarily)
- Monitor error logs after deployment

---

## Rollback Plan

### If Critical Issues Arise

**Step 1**: Revert frontend changes
```bash
git revert <commit-hash>
git push origin main
```

**Step 2**: Keep Sanity schema changes
- Schema is backwards compatible
- Products will still have season references
- Won't break existing data

**Step 3**: Temporary fallback query
```typescript
// Fetch products directly (ignore seasons)
const products = await client.fetch(`
  *[_type == "product"] { ... }
`);
```

**Recovery Time**: < 10 minutes

---

## Conclusion

This specification provides a complete plan for implementing seasonal collections in the Jerry Lester Studios shop. Key characteristics:

**Simplicity**:
- Minimal schema changes
- Reuses existing components where possible
- No complex state management

**Data Integrity**:
- Required relationships enforced
- Migration ensures no orphaned products
- Validation prevents edge cases

**Performance**:
- Single query (no N+1 problem)
- Maintains ISR caching strategy
- Server-side rendering preserved

**Maintainability**:
- Clear component boundaries
- Comprehensive error handling
- Well-documented migration path

**Scalability**:
- Supports unlimited seasons
- Handles large product catalogs
- Future enhancement-friendly

---

**Document Version**: 1.0  
**Created**: September 30, 2025  
**Status**: Pending Approval  
**Estimated Implementation Time**: 6-9 hours
