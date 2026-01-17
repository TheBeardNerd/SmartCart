import { ShoppingCart, TrendingDown, Clock, Utensils } from 'lucide-react';

const features = [
  {
    icon: TrendingDown,
    title: 'Budget Optimizer',
    description: 'Achieve 15-25% savings through intelligent price comparison across all stores.',
    persona: 'Perfect for families looking to maximize their grocery budget',
  },
  {
    icon: Clock,
    title: 'Convenience Seeker',
    description: 'Complete grocery orders in under 60 seconds with AI-powered recommendations.',
    persona: 'Ideal for busy professionals who value their time',
  },
  {
    icon: ShoppingCart,
    title: 'Split-Cart Maximizer',
    description: 'Get the best price for each item across multiple stores with coordinated delivery.',
    persona: 'For strategic shoppers who want the absolute best deals',
  },
  {
    icon: Utensils,
    title: 'Meal Planner',
    description: 'Transform recipes into optimized shopping lists with nutritional tracking.',
    persona: 'Great for health-conscious shoppers and meal preppers',
  },
];

export function Features() {
  return (
    <section className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">Shop Your Way</h2>
          <p className="text-xl text-gray-600">
            SmartCart adapts to your unique shopping style and priorities
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition"
              >
                <div className="bg-green-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-green-700" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-600 mb-3">{feature.description}</p>
                <p className="text-sm text-green-600 font-medium">
                  {feature.persona}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
