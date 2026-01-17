export function Hero() {
  return (
    <div className="bg-gradient-to-r from-green-600 to-green-800 text-white">
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-5xl font-bold mb-6">
            Shop Smarter, Save More
          </h1>
          <p className="text-xl mb-8 text-green-100">
            Compare prices across multiple grocery stores and save 15-25% on every order.
            Smart shopping starts here.
          </p>
          <div className="flex gap-4 justify-center">
            <button className="bg-white text-green-700 px-8 py-3 rounded-lg font-semibold hover:bg-green-50 transition">
              Get Started Free
            </button>
            <button className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-green-700 transition">
              See How It Works
            </button>
          </div>
          <div className="mt-12 grid grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold">15-25%</div>
              <div className="text-green-100">Average Savings</div>
            </div>
            <div>
              <div className="text-4xl font-bold">&lt;60s</div>
              <div className="text-green-100">Order Time</div>
            </div>
            <div>
              <div className="text-4xl font-bold">10+</div>
              <div className="text-green-100">Partner Stores</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
