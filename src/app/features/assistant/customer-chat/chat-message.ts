export interface ChatProduct {
    id: number;
    name: string;
    skuId?: number;
    price?: number;
    originalPrice?: number;
    available?: number;
    image: string;
    quantity: number;
    variants: {
        id: number;
        label: string;
        price?: number;
        originalPrice?: number;
        available?: number;
    }[];
}
export interface ChatMessage {
    role: "user" | "assistant";
    text: string;
    products?: ChatProduct[];
    suggestions?: string[];
    cardType?: string;
    rows?: {
        title: string;
        detail: string;
    }[];
}
export function toChatProduct(value: unknown): ChatProduct | null {
    if (!value || typeof value !== "object")
        return null;
    const row = value as Record<string, unknown>;
    if (typeof row["id"] !== "number" || typeof row["name"] !== "string")
        return null;
    const skus = Array.isArray(row["skus"])
        ? (row["skus"] as Record<string, unknown>[])
        : [];
    const sku = skus.find((s) => s["is_default"] === true) || skus[0];
    const price = sku?.["effectivePrice"] ??
        sku?.["finalPrice"] ??
        sku?.["basePrice"] ??
        sku?.["price"];
    const base = sku?.["basePrice"] ?? sku?.["price"];
    const available = sku?.["available"] ?? sku?.["quantity"];
    const images = row["main_image"];
    return {
        id: row["id"],
        name: row["name"],
        skuId: typeof sku?.["id"] === "number" ? sku["id"] : undefined,
        price: typeof price === "number" ? price : undefined,
        originalPrice: typeof base === "number" ? base : undefined,
        available: typeof available === "number" ? available : undefined,
        image: Array.isArray(images) && typeof images[0] === "string"
            ? images[0]
            : "/images/product-placeholder.svg",
        quantity: 1,
        variants: skus.filter(s => typeof s['id'] === 'number').map(s => ({
            id: s['id'] as number, label: typeof s['sku'] === 'string' ? s['sku'] : 'SKU #' + s['id'],
            price: finiteNumber(s['effectivePrice'] ?? s['finalPrice'] ?? s['basePrice'] ?? s['price']),
            originalPrice: finiteNumber(s['basePrice'] ?? s['price']), available: finiteNumber(s['available'] ?? s['quantity']),
        })),
    };
}
function finiteNumber(value: unknown) { return typeof value === 'number' && Number.isFinite(value) ? value : undefined; }
