export interface ChatProduct {
    id: number;
    name: string;
    description?: string;
    brand?:string; category?:string; productCode?:string; currency?:string;
    discount?:number; promotionStartAt?:string; promotionEndAt?:string;
    images?: string[];
    attributes?: {name: string; values: string[]}[];
    skuId?: number;
    price?: number;
    originalPrice?: number;
    available?: number;
    promotion?: string;
    image: string;
    quantity: number;
    variants: {
        id: number;
        label: string;
        price?: number;
        originalPrice?: number;
        available?: number;
        promotion?: string;
        discount?:number; promotionStartAt?:string; promotionEndAt?:string;
        attributes?: {name: string; values: string[]}[];
    }[];
}
export interface ChatMessage {
    voiceTurnId?: string;
    time?: string;
    role: "user" | "assistant";
    text: string;
    products?: ChatProduct[];
    productSort?: 'relevance' | 'price-asc' | 'price-desc' | 'name';
    inStockOnly?: boolean;
    suggestions?: string[];
    cardType?: string;
    data?: unknown;
    intent?: string;
    confirmationId?: string;
    confirmationParameters?: string;
    paymentOrderId?: number;
    orderId?: number;
    ordersList?: boolean;
    visualCandidates?: {productId: number; name: string; confidence: number}[];
    rows?: {
        title: string;
        detail: string;
        orderId?: number;
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
    const isDefault = (s: Record<string, unknown>) => s["is_default"] === true || s["isDefault"] === true;
    const inStock = (s: Record<string, unknown>) => (stock(s) ?? 0) > 0;
    const sku = skus.find(s=>s['id']===row['selectedSkuId']) || skus.find(s => isDefault(s) && inStock(s)) || skus.find(inStock) || skus.find(isDefault) || skus[0];
    const price = sku?.["effectivePrice"] ??
        sku?.["finalPrice"] ??
        sku?.["basePrice"] ??
        sku?.["price"];
    const base = sku?.["basePrice"] ?? sku?.["price"];
    const available = stock(sku);
    const images = row["images"] ?? row["main_image"];
    return {
        id: row["id"],
        name: row["name"],
        brand: string(row['brand']),category:string(row['category']),productCode:string(row['productCode']),currency:string(row['currency']),
        discount:finiteNumber(sku?.['discountAmount']),promotionStartAt:string(sku?.['promotionStartAt']),promotionEndAt:string(sku?.['promotionEndAt']),
        description: typeof row["description"] === "string" ? row["description"] : undefined,
        images: Array.isArray(images) ? images.filter((image): image is string => typeof image === "string") : [],
        attributes: attributes(sku),
        skuId: typeof sku?.["id"] === "number" ? sku["id"] : undefined,
        price: finiteNumber(price),
        originalPrice: finiteNumber(base),
        available: finiteNumber(available),
        promotion: promotionName(sku),
        image: Array.isArray(images) && typeof images[0] === "string"
            ? images[0]
            : "/images/product-placeholder.svg",
        quantity: 1,
        variants: skus.filter(s => typeof s['id'] === 'number').map(s => ({
            id: s['id'] as number, label: typeof s['sku'] === 'string' ? s['sku'] : 'SKU #' + s['id'],
            price: finiteNumber(s['effectivePrice'] ?? s['finalPrice'] ?? s['basePrice'] ?? s['price']),
            discount:finiteNumber(s['discountAmount']),promotionStartAt:string(s['promotionStartAt']),promotionEndAt:string(s['promotionEndAt']),
            promotion: promotionName(s), originalPrice: finiteNumber(s['basePrice'] ?? s['price']), available: stock(s), attributes: attributes(s),
        })),
    };
}
function finiteNumber(value: unknown) { return typeof value === 'number' && Number.isFinite(value) ? value : undefined; }

function promotionName(sku: Record<string, unknown> | undefined): string | undefined {
    return sku?.['hasPromotion'] === true && typeof sku['promotionName'] === 'string' ? sku['promotionName'] : undefined;
}

function stock(sku: Record<string, unknown> | undefined) {
    const inventory = sku?.['inventory'];
    const available = inventory && typeof inventory === 'object' ? (inventory as Record<string, unknown>)['availableQuantity'] : undefined;
    return finiteNumber(sku?.['available'] ?? available ?? sku?.['quantity']);
}
function attributes(sku: Record<string, unknown> | undefined): {name: string; values: string[]}[] {
    const rows = sku?.['attributes'];
    if (!Array.isArray(rows)) return [];
    return rows.filter(row => row && typeof row.name === 'string' && Array.isArray(row.attributes))
        .map(row => ({name: row.name, values: row.attributes.filter((v: Record<string, unknown>) => typeof v['value'] === 'string').map((v: Record<string, unknown>) => v['value'] as string)}));
}

function string(value:unknown){return typeof value==='string'&&value.trim()?value:undefined;}
