import { Rule } from 'sanity'

const productSchema = {
    name: 'product',
    title: 'Product',
    type: 'document',
    fields: [
      {
        name: 'name',
        title: 'Name',
        type: 'string',
        validation: (Rule: Rule) => Rule.required()
      },
      {
        name: 'season',
        title: 'Season',
        type: 'reference',
        to: [{ type: 'season' }],
        validation: (Rule: Rule) => Rule.required(),
        description: 'The season/collection this product belongs to',
        options: {
          disableNew: false,
        },
      },
      {
        name: 'slug',
        title: 'Slug',
        type: 'slug',
        options: {
          source: 'name',
          maxLength: 96,
        },
        validation: (Rule: Rule) => Rule.required()
      },
      {
        name: 'description',
        title: 'Description',
        type: 'text'
      },
      {
        name: 'price',
        title: 'Price',
        type: 'number',
        validation: (Rule: Rule) => Rule.required().min(0)
      },
      {
        name: 'availableForCheckout',
        title: 'Available for Checkout',
        type: 'boolean',
        description: 'Enable this to allow customers to purchase this product',
        initialValue: false
      },
      {
        name: 'quantityAvailable',
        title: 'Quantity Available',
        type: 'number',
        description: 'Number of items available for sale (set to 0 for out of stock)',
        initialValue: 0,
        validation: (Rule: Rule) => Rule.min(0).integer()
      },
      {
        name: 'sizing',
        title: 'Product Sizing',
        type: 'object',
        description: 'Configure sizing options for this product',
        fields: [
          {
            name: 'hasSizing',
            title: 'Has Size Options',
            type: 'boolean',
            description: 'Enable this if the product comes in different sizes',
            initialValue: false
          },
          {
            name: 'options',
            title: 'Size Options',
            type: 'array',
            of: [{ type: 'string' }],
            description: 'Add available sizes (e.g., Small, Medium, Large, XS, 32x34, etc.)',
            hidden: ({ parent }: { parent?: { hasSizing?: boolean } }) => !parent?.hasSizing
          }
        ]
      },
      {
        name: 'mainImage',
        title: 'Main Image',
        type: 'image',
        options: {
          hotspot: true,
        }
      },
      {
        name: 'details',
        title: 'Product Details',
        type: 'object',
        fields: [
          {
            name: 'detailedDescription',
            title: 'Detailed Description',
            type: 'text'
          },
          {
            name: 'features',
            title: 'Features',
            type: 'array',
            of: [{ type: 'string' }]
          },
          {
            name: 'images',
            title: 'Additional Images',
            type: 'array',
            of: [{ type: 'image', options: { hotspot: true }}]
          },
          {
            name: 'dimensions',
            title: 'Dimensions',
            type: 'object',
            fields: [
              { name: 'width', title: 'Width', type: 'string' },
              { name: 'depth', title: 'Depth', type: 'string' },
              { name: 'height', title: 'Height', type: 'string' },
              { name: 'weight', title: 'Weight', type: 'string' },
              { name: 'length', title: 'Length', type: 'string' },
              { name: 'inseam', title: 'Inseam', type: 'string' },
              { name: 'waist', title: 'Waist', type: 'string' },
              { name: 'rise', title: 'Rise', type: 'string' },
              { name: 'size', title: 'Size', type: 'string' },
              { name: 'legOpening', title: 'Leg Opening', type: 'string' },
              { name: 'armOpening', title: 'Arm Opening', type: 'string' },
              { name: 'shoulderToSleeve', title: 'Shoulder to Sleeve', type: 'string' }
            ]
          }
        ]
      }
    ]
  }

export default productSchema;