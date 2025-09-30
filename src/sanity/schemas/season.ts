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
