import { products } from "@/db/schema";
import { parseJsonArray, parseJsonObject } from "./format";

export type ProductRow = typeof products.$inferSelect;

export function productImage(p: ProductRow): string | null {
  return parseJsonArray(p.imagesJson)[0] ?? null;
}

export function productSpecs(p: ProductRow): Record<string, unknown> {
  return parseJsonObject(p.specsJson);
}
