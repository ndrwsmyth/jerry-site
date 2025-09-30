import NavBar from "@/components/NavBar";
import PortfolioGrid from "@/components/PortfolioGrid";
import { client } from "@/sanity/client";
import { groq } from "next-sanity";

// Enable Incremental Static Regeneration with a 1-hour cache
export const revalidate = 3600;

// Define the type for portfolio items from Sanity
interface PortfolioItem {
  _id: string;
  title: string;
  description?: string;
  slug: string;
  createdDate: string;
  imageUrl?: string;
  videoUrl?: string;
  videoThumbnailUrl?: string;
}

// Fetch portfolio items from Sanity
async function getPortfolioItems(): Promise<PortfolioItem[]> {
  const query = groq`*[_type == "portfolio"] | order(createdDate desc) {
    _id,
    title,
    description,
    "slug": slug.current,
    createdDate,
    "imageUrl": mainImage.asset->url,
    "videoUrl": mainVideo.asset->url,
    "videoThumbnailUrl": mainVideoThumbnail.asset->url
  }`;
  
  return client.fetch(query);
}

export default async function PortfolioPage() {
  const portfolioItems = await getPortfolioItems();
  
  return (
    <>
      <NavBar />
      <div className="pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-4xl font-bold mb-8">Portfolio</h1>
          {portfolioItems && portfolioItems.length > 0 ? (
            <PortfolioGrid items={portfolioItems.map((item: PortfolioItem) => ({
              id: item._id,
              title: item.title,
              description: item.description || "",
              imageUrl: item.imageUrl,
              videoUrl: item.videoUrl,
              videoThumbnailUrl: item.videoThumbnailUrl,
              slug: item.slug
            }))} />
          ) : (
            <p className="text-center text-gray-500">No portfolio items found. Add some in Sanity Studio!</p>
          )}
        </div>
      </div>
    </>
  );
} 