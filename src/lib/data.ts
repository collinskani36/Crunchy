export type Category = {
  id: string;
  name: string;
  emoji: string;
  gradient: string;
};

export type Food = {
  id: string;
  name: string;
  description: string;
  price: number;
  categoryId: string;
  emoji: string;
  gradient: string;
  rating: number;
  prepTime: string;
  popular?: boolean;
  tags?: string[];
  category_id?: string;
  image_url?: string | null;
  prep_time?: string | null;
  is_popular?: boolean;
  is_available?: boolean;
  created_at?: string;
  updated_at?: string;
};

export const categories: Category[] = [
  { id: "grill", name: "Grill", emoji: "🔥", gradient: "from-orange-500 to-red-500" },
  { id: "burgers", name: "Burgers", emoji: "🍔", gradient: "from-amber-500 to-orange-600" },
  { id: "pizza", name: "Pizza", emoji: "🍕", gradient: "from-red-500 to-rose-600" },
  { id: "chicken", name: "Chicken", emoji: "🍗", gradient: "from-yellow-500 to-orange-500" },
  { id: "healthy", name: "Healthy", emoji: "🥗", gradient: "from-green-500 to-emerald-600" },
  { id: "drinks", name: "Drinks", emoji: "🥤", gradient: "from-sky-500 to-blue-600" },
  { id: "desserts", name: "Desserts", emoji: "🍰", gradient: "from-pink-500 to-rose-500" },
  { id: "sides", name: "Sides", emoji: "🍟", gradient: "from-yellow-400 to-amber-500" },
];

export const foods: Food[] = [
  { id: "f1", name: "Signature Flame Chicken", description: "Whole grilled chicken marinated in farm herbs, charred to perfection.", price: 18.5, categoryId: "grill", emoji: "🍗", gradient: "from-orange-500 to-red-600", rating: 4.9, prepTime: "25 min", popular: true, tags: ["Spicy", "Bestseller"], category_id: "grill", image_url: "https://example.com/f1.jpg", prep_time: "25 min", is_popular: true, is_available: true, created_at: "2023-01-01", updated_at: "2023-01-01" },
  { id: "f2", name: "Smoky BBQ Ribs", description: "Slow-smoked pork ribs glazed with house BBQ sauce.", price: 22.0, categoryId: "grill", emoji: "🥩", gradient: "from-red-600 to-amber-700", rating: 4.8, prepTime: "30 min", popular: true, tags: ["Spicy"], category_id: "grill", image_url: "https://example.com/f2.jpg", prep_time: "30 min", is_popular: true, is_available: true, created_at: "2023-01-01", updated_at: "2023-01-01" },
  { id: "f3", name: "Farm Double Burger", description: "Two beef patties, cheddar, caramelized onions, brioche bun.", price: 12.9, categoryId: "burgers", emoji: "🍔", gradient: "from-amber-500 to-orange-600", rating: 4.7, prepTime: "15 min", popular: true, tags: ["Classic"], category_id: "burgers", image_url: "https://example.com/f3.jpg", prep_time: "15 min", is_popular: true, is_available: true, created_at: "2023-01-01", updated_at: "2023-01-01" },
  { id: "f4", name: "Crispy Chicken Burger", description: "Buttermilk fried chicken, slaw, pickles, spicy mayo.", price: 10.5, categoryId: "burgers", emoji: "🍔", gradient: "from-yellow-500 to-orange-500", rating: 4.6, prepTime: "12 min", popular: false, tags: ["Crispy"], category_id: "burgers", image_url: "https://example.com/f4.jpg", prep_time: "12 min", is_popular: false, is_available: true, created_at: "2023-01-01", updated_at: "2023-01-01" },
  { id: "f5", name: "Margherita Classica", description: "San Marzano tomato, fior di latte, fresh basil, EVOO.", price: 13.0, categoryId: "pizza", emoji: "🍕", gradient: "from-red-500 to-rose-600", rating: 4.8, prepTime: "18 min", popular: true, tags: ["Classic"], category_id: "pizza", image_url: "https://example.com/f5.jpg", prep_time: "18 min", is_popular: true, is_available: true, created_at: "2023-01-01", updated_at: "2023-01-01" },
  { id: "f6", name: "Pepperoni Storm", description: "Loaded with spicy pepperoni and mozzarella.", price: 14.5, categoryId: "pizza", emoji: "🍕", gradient: "from-rose-600 to-red-700", rating: 4.7, prepTime: "18 min", popular: false, tags: ["Spicy"], category_id: "pizza", image_url: "https://example.com/f6.jpg", prep_time: "18 min", is_popular: false, is_available: true, created_at: "2023-01-01", updated_at: "2023-01-01" },
  { id: "f7", name: "Grilled Chicken Bowl", description: "Quinoa, kale, avocado, cherry tomato, lemon dressing.", price: 11.0, categoryId: "healthy", emoji: "🥗", gradient: "from-green-500 to-emerald-600", rating: 4.8, prepTime: "10 min", popular: true, tags: ["Healthy"], category_id: "healthy", image_url: "https://example.com/f7.jpg", prep_time: "10 min", is_popular: true, is_available: true, created_at: "2023-01-01", updated_at: "2023-01-01" },
  { id: "f8", name: "Buddha Veggie Bowl", description: "Roasted veg, chickpeas, tahini, brown rice.", price: 9.5, categoryId: "healthy", emoji: "🥙", gradient: "from-lime-500 to-green-600", rating: 4.6, prepTime: "10 min", popular: false, tags: ["Veggie"], category_id: "healthy", image_url: "https://example.com/f8.jpg", prep_time: "10 min", is_popular: false, is_available: true, created_at: "2023-01-01", updated_at: "2023-01-01" },
  { id: "f9", name: "Sticky Wings (10pc)", description: "Crispy wings tossed in honey-soy glaze.", price: 9.9, categoryId: "chicken", emoji: "🍗", gradient: "from-amber-500 to-orange-600", rating: 4.7, prepTime: "15 min", popular: true, tags: ["Crispy"], category_id: "chicken", image_url: "https://example.com/f9.jpg", prep_time: "15 min", is_popular: true, is_available: true, created_at: "2023-01-01", updated_at: "2023-01-01" },
  { id: "f10", name: "Spicy Korean Wings", description: "Double-fried wings, gochujang glaze, sesame.", price: 11.9, categoryId: "chicken", emoji: "🌶️", gradient: "from-red-500 to-orange-600", rating: 4.8, prepTime: "16 min", popular: false, tags: ["Spicy"], category_id: "chicken", image_url: "https://example.com/f10.jpg", prep_time: "16 min", is_popular: false, is_available: true, created_at: "2023-01-01", updated_at: "2023-01-01" },
  { id: "f11", name: "Fresh Mango Smoothie", description: "Alphonso mango, yogurt, honey.", price: 5.0, categoryId: "drinks", emoji: "🥭", gradient: "from-yellow-400 to-orange-500", rating: 4.7, prepTime: "5 min", popular: false, tags: ["Smoothie"], category_id: "drinks", image_url: "https://example.com/f11.jpg", prep_time: "5 min", is_popular: false, is_available: true, created_at: "2023-01-01", updated_at: "2023-01-01" },
  { id: "f12", name: "Cold Brew Coffee", description: "12-hour cold brewed, smooth and bold.", price: 4.5, categoryId: "drinks", emoji: "☕", gradient: "from-amber-700 to-stone-800", rating: 4.6, prepTime: "3 min", popular: false, tags: ["Coffee"], category_id: "drinks", image_url: "https://example.com/f12.jpg", prep_time: "3 min", is_popular: false, is_available: true, created_at: "2023-01-01", updated_at: "2023-01-01" },
  { id: "f13", name: "Molten Chocolate Cake", description: "Warm chocolate cake with a gooey center, vanilla ice cream.", price: 6.5, categoryId: "desserts", emoji: "🍫", gradient: "from-amber-800 to-stone-900", rating: 4.9, prepTime: "10 min", popular: true, tags: ["Chocolate"], category_id: "desserts", image_url: "https://example.com/f13.jpg", prep_time: "10 min", is_popular: true, is_available: true, created_at: "2023-01-01", updated_at: "2023-01-01" },
  { id: "f14", name: "Strawberry Cheesecake", description: "Creamy NY-style cheesecake with strawberry coulis.", price: 6.0, categoryId: "desserts", emoji: "🍰", gradient: "from-pink-500 to-rose-500", rating: 4.7, prepTime: "5 min", popular: false, tags: ["Cheesecake"], category_id: "desserts", image_url: "https://example.com/f14.jpg", prep_time: "5 min", is_popular: false, is_available: true, created_at: "2023-01-01", updated_at: "2023-01-01" },
  { id: "f15", name: "Truffle Fries", description: "Hand-cut fries, truffle oil, parmesan, parsley.", price: 5.5, categoryId: "sides", emoji: "🍟", gradient: "from-yellow-400 to-amber-500", rating: 4.8, prepTime: "8 min", popular: true, tags: ["Crispy"], category_id: "sides", image_url: "https://example.com/f15.jpg", prep_time: "8 min", is_popular: true, is_available: true, created_at: "2023-01-01", updated_at: "2023-01-01" },
  { id: "f16", name: "Onion Rings", description: "Beer-battered onion rings with chipotle dip.", price: 4.9, categoryId: "sides", emoji: "🧅", gradient: "from-amber-400 to-yellow-500", rating: 4.5, prepTime: "8 min", popular: false, tags: ["Crispy"], category_id: "sides", image_url: "https://example.com/f16.jpg", prep_time: "8 min", is_popular: false, is_available: true, created_at: "2023-01-01", updated_at: "2023-01-01" },
];

export function getFood(id: string) {
  return foods.find((f) => f.id === id);
}

export function formatPrice(n: number) {
  return `$${n.toFixed(2)}`;
}