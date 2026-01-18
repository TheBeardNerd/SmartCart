import { ProductSearch } from '@/components/product-search';
import { Hero } from '@/components/hero';
import { Features } from '@/components/features';
import { PersonalizedRecommendations } from '@/components/recommendations/personalized-recommendations';
import { ReorderReminders } from '@/components/recommendations/reorder-reminders';
import { DealAlerts } from '@/components/recommendations/deal-alerts';

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <Hero />

      {/* Personalized Sections */}
      <section className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <ReorderReminders />
          </div>
          <div>
            <DealAlerts />
          </div>
        </div>
      </section>

      {/* Product Search */}
      <section className="container mx-auto px-4 py-12">
        <h2 className="text-3xl font-bold mb-8 text-center">
          Find the Best Grocery Deals
        </h2>
        <ProductSearch />
      </section>

      {/* Personalized Recommendations */}
      <section className="container mx-auto px-4 py-12">
        <PersonalizedRecommendations limit={6} />
      </section>

      <Features />
    </main>
  );
}
