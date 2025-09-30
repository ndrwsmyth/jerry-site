import ProductGrid from './ProductGrid';

type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  availableForCheckout?: boolean;
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
