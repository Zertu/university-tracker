import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import RecommendationsList from '@/components/recommendations/recommendations-list';

interface CategoryPageProps {
  params: {
    category: string;
  };
}

const validCategories = ['reach', 'target', 'safety'];

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const category = params.category;
  
  if (!validCategories.includes(category)) {
    return {
      title: 'Not Found',
    };
  }

  const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
  
  return {
    title: `${categoryName} Schools | University Recommendations`,
    description: `View ${category} school recommendations based on your academic profile`,
  };
}

export default function CategoryRecommendationsPage({ params }: CategoryPageProps) {
  const category = params.category;
  
  if (!validCategories.includes(category)) {
    notFound();
  }

  const categoryName = category.charAt(0).toUpperCase() + category.slice(1);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{categoryName} Schools</h1>
          <p className="mt-2 text-gray-600">
            {category === 'reach' && 'Competitive schools that may be challenging to get into but are worth applying to.'}
            {category === 'target' && 'Schools that match well with your academic profile and admission chances.'}
            {category === 'safety' && 'Schools where you have a high likelihood of acceptance based on your profile.'}
          </p>
        </div>

        <RecommendationsList 
          category={category as 'reach' | 'target' | 'safety'}
          showFilters={false}
        />
      </div>
    </div>
  );
}

export function generateStaticParams() {
  return validCategories.map((category) => ({
    category,
  }));
}