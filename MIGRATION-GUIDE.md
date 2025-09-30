# Season Collections Migration Guide

This guide walks you through migrating your existing products to the new seasonal collections system.

## Overview

The season collections feature groups products under season headers (e.g., "GENESIS", "ANC"). Every product must now belong to exactly one season.

## Migration Steps

### Step 1: Deploy Sanity Schema Changes

The schema changes have been made to your codebase. Deploy them to Sanity Studio:

```bash
pnpm sanity deploy
```

This will:
- Register the new `season` document type
- Add the `season` reference field to products
- Make the field required for all new/updated products

### Step 2: Create Your First Season

1. Open Sanity Studio (typically at `http://localhost:3000/studio`)

2. Navigate to the new "Seasons" section

3. Create a new season:
   - Click "Create new Season"
   - Enter a title (e.g., "GENERAL", "GENESIS", "ANC", or your collection name)
   - Click "Generate" next to Slug to auto-generate the URL slug
   - Publish the season

### Step 3: Assign Products to Seasons

1. In Sanity Studio, go to Products

2. Open each product and assign it to a season:
   - Select the season from the "Season" dropdown
   - Publish the product

3. Repeat for all existing products

Note: After deploying the schema, the season field is required. You must assign a season to each product before it can be published.

### Step 4: Create Additional Seasons

Create your seasonal collections as needed:

1. In Sanity Studio, go to Seasons
2. Create new seasons for your collections (e.g., "GENESIS", "ANC", "SPRING 2025")
3. Assign products to their appropriate seasons

### Step 5: Deploy Frontend Changes

The frontend code has been updated to display products grouped by season. Deploy your changes:

```bash
git add .
git commit -m "feat: add seasonal collections to shop page"
git push origin main
```

Your hosting provider should automatically deploy the changes.

## What Changed

### Schema Changes

**New Season Schema** (`/src/sanity/schemas/season.ts`):
- `title`: Display name for the season
- `slug`: URL-friendly identifier  
- `createdAt`: Auto-populated creation date for ordering

**Updated Product Schema** (`/src/sanity/schemas/product.ts`):
- Added required `season` reference field
- Products must now belong to exactly one season

### Frontend Changes

**New Component** (`/src/components/SeasonSection.tsx`):
- Displays season header and product grid
- Handles empty seasons gracefully

**Updated Shop Page** (`/src/app/shop/page.tsx`):
- Fetches seasons with their products
- Products sorted alphabetically within each season
- Seasons ordered by creation date (newest first)

**Updated Revalidation** (`/src/app/api/revalidate/route.ts`):
- Shop page now revalidates when seasons are created/updated

## Testing

After migration, verify:

1. All products appear on the shop page
2. Products are grouped under correct season headers
3. Seasons appear in the correct order (newest first)
4. Products are alphabetically sorted within seasons
5. Product checkout flow still works
6. Inventory management still works

## Troubleshooting

### Products not showing up on shop page

- Verify all products have a season assigned in Sanity Studio
- Check the browser console for errors
- Try clearing your browser cache

### "Season is required" error in Sanity Studio

- This is expected behavior after deploying the schema
- All products must have a season selected
- Complete the migration to assign seasons to all products

## Content Management Guide

### Creating a New Season

1. Go to Sanity Studio > Seasons
2. Click "Create new Season"
3. Enter a title (e.g., "WINTER 2026")
4. Generate the slug
5. Publish

The creation date will be auto-populated and used for ordering on the shop page.

### Adding Products to a Season

When creating or editing a product:
1. The "Season" field is required
2. Select from the dropdown or create a new season
3. Publish the product

### Reordering Seasons

Seasons are automatically ordered by creation date (newest first). To change the order, you can manually adjust the `createdAt` field in Sanity Studio if needed.

### Deleting a Season

Before deleting a season:
1. Reassign all its products to a different season
2. Sanity will warn you if products still reference the season
3. Only delete once all products have been moved

---

**Migration Checklist**:
- [ ] Deploy Sanity schema changes (`pnpm sanity deploy`)
- [ ] Create your first season in Sanity Studio
- [ ] Assign all existing products to seasons
- [ ] Create additional seasonal collections as needed
- [ ] Deploy frontend changes
- [ ] Test shop page functionality
- [ ] Test product checkout flow