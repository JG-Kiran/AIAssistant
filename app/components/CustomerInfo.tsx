export default function CustomerInfo() {
  return (
    <section className="w-1/4 bg-white p-4 border-l border-gray-300">
      <h2 className="text-xl font-semibold mb-4">Customer Info</h2>
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-2">Product</h3>
        <ul className="list-disc pl-5 text-gray-700">
          <li>Product Name 1</li>
          <li>Product Details Line 2</li>
          <li>Product Details Line 3</li>
        </ul>
      </div>
      <div>
        <h3 className="text-lg font-medium mb-2">Pricing</h3>
        <ul className="list-disc pl-5 text-gray-700">
          <li>Price Detail 1</li>
          <li>Price Detail 2</li>
          <li>Price Detail 3</li>
        </ul>
      </div>
    </section>
  );
} 