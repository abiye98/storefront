// ui/components/category-cards.tsx

import Link from "next/link";
import Image from "next/image";
import { executePublicGraphQL } from "@/lib/graphql";
import { MenuGetBySlugDocument } from "@/gql/graphql";
import { CACHE_PROFILES, applyCacheProfile } from "@/lib/cache-manifest";
import { cn } from "@/lib/utils";

interface CategoryCardsProps {
	channel: string;
}

interface Category {
	id: string;
	name: string;
	slug: string;
	description?: string | null;
	backgroundImage?: {
		url: string;
		alt?: string;
	} | null;
	products?: {
		totalCount: number;
	};
}

export const CategoryCards = async ({ channel }: CategoryCardsProps) => {
	"use cache";
	applyCacheProfile(CACHE_PROFILES.navigation);

	const result = await executePublicGraphQL(MenuGetBySlugDocument, {
		variables: { slug: "categories", channel },
		revalidate: 60 * 60, // 1 hour
	});

	if (!result.ok) {
		console.warn(`[CategoryCards] Failed to fetch categories for ${channel}:`, result.error.message);
		return (
			<div className="py-12 text-center">
				<p className="text-muted-foreground">Kategorien konnten nicht geladen werden.</p>
			</div>
		);
	}

	// Nur Category-Items aus dem Menu filtern
	const categories = result.data.menu?.items
		?.filter((item) => item.category)
		.map((item) => item.category) as Category[];

	if (!categories || categories.length === 0) {
		return (
			<div className="py-12 text-center">
				<p className="text-muted-foreground">Keine Kategorien gefunden.</p>
			</div>
		);
	}

	return (
		<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			{categories.map((category) => (
				<CategoryCard key={category.id} category={category} />
			))}
		</div>
	);
};

function CategoryCard({ category }: { category: Category }) {
	const productCount = category.products?.totalCount ?? 0;

	return (
		<Link
			href={`/default-channel/categories/${category.slug}`}
			className="group relative block overflow-hidden rounded-xl border bg-white transition-all hover:shadow-lg"
		>
			{/* Bild Container */}
			<div className="relative aspect-square overflow-hidden bg-secondary">
				{category.backgroundImage?.url ? (
					<Image
						src={category.backgroundImage.url}
						alt={category.backgroundImage.alt || category.name}
						fill
						sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 25vw"
						className="object-cover transition-transform duration-500 group-hover:scale-105"
					/>
				) : (
					<div className="from-primary/20 to-primary/5 flex h-full items-center justify-center bg-gradient-to-br">
						<span className="text-4xl opacity-50">📦</span>
					</div>
				)}

				{/* Overlay mit Produktanzahl */}
				<div className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2 py-1 text-xs text-white backdrop-blur-sm">
					{productCount} Produkte
				</div>
			</div>

			{/* Text Content */}
			<div className="p-4">
				<h3 className="line-clamp-1 text-lg font-semibold group-hover:text-primary">{category.name}</h3>
				{category.description && (
					<p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{category.description}</p>
				)}

				{/* Button */}
				<div className="mt-3 flex items-center text-sm font-medium text-primary">
					<span>Jetzt entdecken</span>
					<svg
						className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
					</svg>
				</div>
			</div>
		</Link>
	);
}
