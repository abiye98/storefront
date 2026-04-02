// ui/components/self-checkout-scanner.tsx

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/ui/components/ui/button";
import { Input } from "@/ui/components/ui/input";
import { ScanBarcode, QrCode, X, CheckCircle, XCircle, Loader2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface SelfCheckoutScannerProps {
	channel?: string;
}

interface ProductResult {
	id: string;
	slug: string;
	name: string;
}

export function SelfCheckoutScanner({ channel = "default-channel" }: SelfCheckoutScannerProps) {
	const router = useRouter();
	const [barcodeInput, setBarcodeInput] = useState("");
	const [isScanning, setIsScanning] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [showSuccess, setShowSuccess] = useState(false);
	const [showError, setShowError] = useState(false);
	const [errorMessage, setErrorMessage] = useState("");
	const [foundProduct, setFoundProduct] = useState<ProductResult | null>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const scannerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (isScanning && inputRef.current) {
			inputRef.current.focus();
		}
	}, [isScanning]);

	// Produkt über Saleor GraphQL anhand Barcode suchen
	const findProductByBarcode = useCallback(
		async (barcode: string): Promise<ProductResult | null> => {
			try {
				const response = await fetch("/api/graphql", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						query: `
            query GetProductByBarcode($barcode: String!, $channel: String!) {
              products(
                first: 1,
                channel: $channel,
                filter: {
                  search: $barcode
                }
              ) {
                edges {
                  node {
                    id
                    slug
                    name
                    attributes {
                      attribute {
                        slug
                      }
                      values {
                        name
                        slug
                      }
                    }
                  }
                }
              }
            }
          `,
						variables: {
							barcode: barcode,
							channel: channel,
						},
					}),
				});

				const result = await response.json();

				//   if (result..data?.products?.edges?.length > 0) {
				//     const product = result.data.products.edges[0].node;
				//     return {
				//       id: product.id,
				//       slug: product.slug,
				//       name: product.name,
				//     };
				//   }

				return null;
			} catch (error) {
				console.error("Error fetching product by barcode:", error);
				return null;
			}
		},
		[channel],
	);

	const handleBarcodeScan = useCallback(
		async (barcode: string) => {
			if (!barcode.trim()) return;

			setIsLoading(true);
			setFoundProduct(null);

			const product = await findProductByBarcode(barcode.trim());

			if (product) {
				setFoundProduct(product);
				setShowSuccess(true);
				setTimeout(() => setShowSuccess(false), 1500);

				setTimeout(() => {
					router.push(`/products/${product.slug}`);
				}, 800);
			} else {
				setErrorMessage(`Produkt mit Barcode ${barcode} nicht gefunden`);
				setShowError(true);
				setTimeout(() => setShowError(false), 2000);
			}

			setIsLoading(false);
			setBarcodeInput("");
		},
		[findProductByBarcode, router],
	);

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			handleBarcodeScan(barcodeInput);
		}
	};

	const handleManualSearch = () => {
		if (barcodeInput.trim()) {
			handleBarcodeScan(barcodeInput);
		}
	};

	return (
		<div className="mx-auto w-full max-w-2xl">
			<div
				ref={scannerRef}
				className={cn(
					"relative overflow-hidden rounded-2xl border-2 transition-all",
					isScanning
						? "bg-primary/5 border-primary shadow-lg"
						: "hover:border-primary/50 hover:bg-secondary/30 border-dashed border-muted",
				)}
			>
				<div className="cursor-pointer p-8 text-center" onClick={() => setIsScanning(true)}>
					{!isScanning ? (
						<>
							<div className="bg-primary/10 mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full">
								<ScanBarcode className="h-10 w-10 text-primary" />
							</div>
							<h3 className="text-xl font-semibold">Barcode oder QR-Code scannen</h3>
							<p className="mt-2 text-sm text-muted-foreground">
								Klicke hier zum Scannen oder gib den Barcode manuell ein
							</p>
							<div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
								<QrCode className="h-4 w-4" />
								<span>Unterstützt EAN-13, QR-Code, UPC-A</span>
							</div>
						</>
					) : (
						<div className="space-y-4 p-4">
							<div className="flex items-center gap-2">
								<ScanBarcode className="h-6 w-6 text-primary" />
								<Input
									ref={inputRef}
									type="text"
									placeholder="Barcode eingeben oder scannen..."
									value={barcodeInput}
									onChange={(e) => setBarcodeInput(e.target.value)}
									onKeyDown={handleKeyDown}
									className="flex-1 text-lg"
									autoFocus
									disabled={isLoading}
								/>
								<Button size="sm" onClick={handleManualSearch} disabled={isLoading || !barcodeInput.trim()}>
									{isLoading ? (
										<Loader2 className="h-4 w-4 animate-spin" />
									) : (
										<ArrowRight className="h-4 w-4" />
									)}
								</Button>
							</div>

							<Button
								size="sm"
								onClick={() => {
									setIsScanning(false);
									setBarcodeInput("");
									setFoundProduct(null);
								}}
								className="w-full"
							>
								<X className="mr-2 h-4 w-4" />
								Schließen
							</Button>
						</div>
					)}
				</div>

				{showSuccess && foundProduct && (
					<div className="bg-background/90 absolute inset-0 flex items-center justify-center backdrop-blur-sm animate-in fade-in zoom-in">
						<div className="text-center">
							<div className="mx-auto mb-3 rounded-full bg-green-500 p-3 text-white">
								<CheckCircle className="h-8 w-8" />
							</div>
							<p className="font-semibold text-green-600">Produkt gefunden!</p>
							<p className="text-sm text-muted-foreground">{foundProduct.name}</p>
							<p className="mt-1 text-xs text-muted-foreground">Weiterleitung zum Produkt...</p>
						</div>
					</div>
				)}

				{showError && (
					<div className="bg-background/90 absolute inset-0 flex items-center justify-center backdrop-blur-sm animate-in fade-in zoom-in">
						<div className="text-center">
							<div className="mx-auto mb-3 rounded-full bg-red-500 p-3 text-white">
								<XCircle className="h-8 w-8" />
							</div>
							<p className="font-semibold text-red-600">Produkt nicht gefunden</p>
							<p className="text-sm text-muted-foreground">{errorMessage}</p>
							<Button size="sm" className="mt-3" onClick={() => setShowError(false)}>
								Schließen
							</Button>
						</div>
					</div>
				)}
			</div>

			<div className="mt-4 text-center text-xs text-muted-foreground">
				<p>📱 Scanne den Barcode auf der Verpackung</p>
				<p className="mt-1">🔍 Unterstützte Formate: EAN-13, EAN-8, UPC-A, QR-Code</p>
			</div>
		</div>
	);
}
