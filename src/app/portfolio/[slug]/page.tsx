import NavBar from "@/components/NavBar";
import Link from "next/link";
import { client } from "@/sanity/client";
import { groq } from "next-sanity";
import { notFound } from "next/navigation";
import ImageGallery from "@/components/ImageGallery";
import VideoPlayer from "@/components/VideoPlayer";
import { Metadata } from "next";

// Enable Incremental Static Regeneration with a 1-hour cache
export const revalidate = 3600;

// Define types for internal use only
type TextBlock = {
  _type: "textBlock";
  content: string;
};

type ImageBlock = {
  _type: "imageBlock";
  image: {
    asset: {
      url: string;
    };
  };
  caption: string;
};

type VideoBlock = {
  _type: "videoBlock";
  video: {
    asset: {
      _ref: string;
      url: string;
    };
  };
  thumbnail?: {
    asset: {
      url: string;
    };
  };
  caption: string;
  autoPlay: boolean;
  loop: boolean;
  muted: boolean;
};

type ContentBlock = TextBlock | ImageBlock | VideoBlock;

type PortfolioItem = {
  title: string;
  description: string;
  mainImage?: {
    asset: {
      url: string;
    };
  };
  mainVideo?: {
    asset: {
      _ref: string;
      url: string;
    };
  };
  mainVideoThumbnail?: {
    asset: {
      url: string;
    };
  };
  content: ContentBlock[];
};

// Fetch portfolio item from Sanity
async function getPortfolioItem(slug: string): Promise<PortfolioItem | null> {
  const query = groq`*[_type == "portfolio" && slug.current == $slug][0] {
    title,
    description,
    createdDate,
    "mainImage": mainImage.asset->{
      "url": url
    },
    "mainVideo": {
      "asset": {
        "_ref": mainVideo.asset._ref,
        "url": mainVideo.asset->url
      }
    },
    "mainVideoThumbnail": mainVideoThumbnail.asset->{
      "url": url
    },
    content[] {
      _type,
      content,
      "image": {
        "asset": {
          "url": image.asset->url
        }
      },
      caption,
      "video": {
        "asset": {
          "_ref": video.asset._ref,
          "url": video.asset->url
        }
      },
      "thumbnail": thumbnail.asset->{
        "url": url
      },
      autoPlay,
      loop,
      muted
    }
  }`;
  
  return client.fetch(query, { slug });
}

// Define the correct type for Next.js 15 params
type PageProps = {
  params: Promise<{ slug: string }>;
};

// Type for Sanity slug response
type SanitySlug = {
  slug: string;
};

// Generate static paths
export async function generateStaticParams() {
  const query = groq`*[_type == "portfolio"]{ "slug": slug.current }`;
  const slugs = await client.fetch(query);
  return slugs.map((slug: SanitySlug) => ({
    slug: slug.slug,
  }));
}

// Metadata generation
export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { slug } = await props.params;
  return {
    title: `Portfolio - ${slug}`,
  };
}

// Page component
export default async function Page(props: PageProps) {
  const { slug } = await props.params;
  const item = await getPortfolioItem(slug);

  if (!item) {
    notFound();
  }

  // Extract all images from the portfolio item
  const allImages = [
    ...(item.mainImage?.asset?.url ? [item.mainImage.asset.url] : []),
    ...(item.content?.filter((section: ContentBlock) => section._type === "imageBlock")
      .map((section: ImageBlock) => section.image?.asset?.url)
      .filter(Boolean) || [])
  ];

  const hasMainVideo = !!item.mainVideo?.asset?.url;

  return (
    <>
      <NavBar />
      <div className="pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Link href="/portfolio" className="text-blue-600 hover:underline mb-8 inline-block">
            ← BACK TO PORTFOLIO
          </Link>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Portfolio Media */}
            <div className="md:col-span-1">
              {hasMainVideo ? (
                <div className="mb-8">
                  <VideoPlayer 
                    video={item.mainVideo!}
                    thumbnail={item.mainVideoThumbnail}
                    autoPlay={true}
                    loop={true}
                    muted={true}
                  />
                </div>
              ) : allImages.length > 0 ? (
                <ImageGallery images={allImages} altText={item.title} />
              ) : (
                <div className="bg-gray-200 aspect-video flex items-center justify-center">
                  No media available
                </div>
              )}
              
              {/* Additional Video Content */}
              {item.content?.filter((section: ContentBlock) => 
                section._type === "videoBlock"
              ).map((section: VideoBlock, index: number) => (
                <div key={`video-${index}`} className="mt-8">
                  <VideoPlayer 
                    video={section.video}
                    thumbnail={section.thumbnail}
                    caption={section.caption}
                    autoPlay={section.autoPlay}
                    loop={section.loop}
                    muted={section.muted}
                  />
                </div>
              ))}
            </div>
            
            {/* Portfolio Info */}
            <div className="md:col-span-1">
              <h1 className="text-4xl font-bold uppercase mb-6">{item.title}</h1>
              <div className="prose max-w-none">
                <p className="text-lg mb-8 uppercase">{item.description}</p>

                {item.content?.filter((section: ContentBlock) => section._type === "textBlock")
                  .map((section: TextBlock, index: number) => (
                    <div key={index} className="mb-8">
                      <p className="uppercase">{section.content}</p>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 