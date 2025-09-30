import { type SchemaTypeDefinition } from 'sanity'
import portfolio from './schemas/portfolio'
import product from './schemas/product'
import photoCollection from './schemas/photos'
import season from './schemas/season'

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [portfolio, product, photoCollection, season],
}