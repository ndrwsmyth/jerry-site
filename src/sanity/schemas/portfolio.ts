import { Rule } from 'sanity'

const portfolioSchema = {
    name: 'portfolio',
    title: 'Portfolio',
    type: 'document',
    fields: [
      {
        name: 'title',
        title: 'Title',
        type: 'string',
        validation: (Rule: Rule) => Rule.required()
      },
      {
        name: 'slug',
        title: 'Slug',
        type: 'slug',
        options: {
          source: 'title',
          maxLength: 96,
        },
        validation: (Rule: Rule) => Rule.required()
      },
      {
        name: 'createdDate',
        title: 'Created Date',
        type: 'date',
        description: 'The date this portfolio item was created. Used for sorting on the portfolio page.',
        validation: (Rule: Rule) => Rule.required(),
        options: {
          dateFormat: 'YYYY-MM-DD'
        }
      },
      {
        name: 'description',
        title: 'Description',
        type: 'text'
      },
      {
        name: 'mainImage',
        title: 'Main Image',
        type: 'image',
        description: 'Main image for the portfolio item. Leave empty if using a video instead.',
        options: {
          hotspot: true,
        }
      },
      {
        name: 'mainVideo',
        title: 'Main Video',
        type: 'file',
        description: 'Main video for the portfolio item. Leave empty if using an image instead.',
        options: {
          accept: 'video/*'
        }
      },
      {
        name: 'mainVideoThumbnail',
        title: 'Main Video Thumbnail',
        type: 'image',
        description: 'Thumbnail for the main video (optional)',
        options: {
          hotspot: true,
        }
      },
      {
        name: 'content',
        title: 'Content Blocks',
        type: 'array',
        of: [
          {
            title: 'Text Block',
            type: 'object',
            name: 'textBlock',
            fields: [
              {
                name: 'content',
                title: 'Content',
                type: 'text'
              }
            ]
          },
          {
            title: 'Image Block',
            type: 'object',
            name: 'imageBlock',
            fields: [
              {
                name: 'image',
                title: 'Image',
                type: 'image',
                options: {
                  hotspot: true,
                }
              },
              {
                name: 'caption',
                title: 'Caption',
                type: 'string'
              }
            ]
          },
          {
            title: 'Video Block',
            type: 'object',
            name: 'videoBlock',
            fields: [
              {
                name: 'video',
                title: 'Video',
                type: 'file',
                description: 'Upload a video file',
                options: {
                  accept: 'video/*'
                }
              },
              {
                name: 'caption',
                title: 'Caption',
                type: 'string'
              },
              {
                name: 'autoPlay',
                title: 'Auto Play',
                type: 'boolean',
                description: 'Should the video auto-play when in view?',
                initialValue: false
              },
              {
                name: 'loop',
                title: 'Loop',
                type: 'boolean',
                description: 'Should the video loop?',
                initialValue: true
              },
              {
                name: 'muted',
                title: 'Muted',
                type: 'boolean',
                description: 'Should the video be muted by default?',
                initialValue: true
              },
              {
                name: 'thumbnail',
                title: 'Thumbnail',
                type: 'image',
                description: 'Optional thumbnail for the video',
                options: {
                  hotspot: true,
                }
              }
            ]
          }
        ]
      }
    ]
  }

export default portfolioSchema;