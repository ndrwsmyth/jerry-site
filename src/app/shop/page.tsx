import NavBar from "@/components/NavBar";
import SeasonSection from "@/components/SeasonSection";
import { client } from "@/sanity/client";
import { groq } from "next-sanity";

// Enable Incremental Static Regeneration with a 1-hour cache
export const revalidate = 3600;

// Define the type for products from Sanity
interface Product {
  _id: string;
  name: string;
  description?: string;
  price: number;
  availableForCheckout?: boolean;
  imageUrl?: string;
}

// Define the type for seasons with products
interface SeasonWithProducts {
  _id: string;
  title: string;
  slug: { current: string };
  createdAt: string;
  products: Product[];
}

// Fetch seasons with their products from Sanity
async function getSeasonsWithProducts(): Promise<SeasonWithProducts[]> {
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
      "imageUrl": mainImage.asset->url
    } | order(name asc)
  }`;
  
  return client.fetch(query);
}

export default async function ShopPage() {
  const seasons = await getSeasonsWithProducts();

  return (
    <>
      <NavBar />
      <div className="min-h-screen pt-16">
        <div className="container mx-auto py-8 px-4">
          <h1 className="text-3xl font-bold text-center mb-12 uppercase">Shop</h1>
          
          {seasons.map((season) => (
            <SeasonSection
              key={season._id}
              title={season.title}
              products={season.products.map(product => ({
                id: product._id,
                name: product.name,
                description: product.description || '',
                price: product.price,
                imageUrl: product.imageUrl || '/images/placeholder.jpg',
                availableForCheckout: product.availableForCheckout
              }))}
            />
          ))}
        </div>
      </div>
    </>
  );
} 