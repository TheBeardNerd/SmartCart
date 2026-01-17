import { ProductSearch } from '@/components/product-search';
import { Hero } from '@/components/hero';
import { Features } from '@/components/features';

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <Hero />
      <section className="container mx-auto px-4 py-12">
        <h2 className="text-3xl font-bold mb-8 text-center">
          Find the Best Grocery Deals
        </h2>
        <ProductSearch />
      </section>
      <Features />
    </main>
  );
}
