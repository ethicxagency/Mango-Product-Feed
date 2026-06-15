import type { AiOptimizationType, Product } from "@prisma/client";
import prisma from "../db.server";
import { logSystemEvent } from "./system-log.server";

interface AiResult {
  output: string;
  model: string;
}

async function callAiPrompt(prompt: string): Promise<AiResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  if (!apiKey) {
    return {
      output: generateFallbackResponse(prompt),
      model: "fallback-local",
    };
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const output = data.choices?.[0]?.message?.content?.trim();
    if (!output) throw new Error("Empty AI response");

    return { output, model };
  } catch (error) {
    await logSystemEvent({
      level: "WARN",
      category: "ai",
      message: "AI provider failed, using fallback",
      metadata: {
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });
    return {
      output: generateFallbackResponse(prompt),
      model: "fallback-local",
    };
  }
}

function generateFallbackResponse(prompt: string): string {
  if (prompt.includes("title")) {
    return "Premium quality product — optimized for shopping feeds with clear keywords and brand mention.";
  }
  if (prompt.includes("description")) {
    return "Discover this high-quality product with detailed features, benefits, and specifications designed to improve click-through rates on product feeds.";
  }
  return "Review product data completeness: ensure GTIN, brand, category mapping, and image URLs are valid for better feed health.";
}

async function saveOptimization(
  productId: string,
  type: AiOptimizationType,
  input: string,
  result: AiResult,
) {
  return prisma.aiOptimization.create({
    data: {
      productId,
      type,
      input,
      output: result.output,
      model: result.model,
    },
  });
}

export async function optimizeProductTitle(product: Product) {
  const prompt = `Optimize this e-commerce product title for shopping feeds (max 150 chars). Keep brand and key attributes. Title: "${product.title}". Brand: "${product.brand}". Category: "${product.category}".`;
  const result = await callAiPrompt(prompt);

  await prisma.product.update({
    where: { id: product.id },
    data: { aiOptimizedTitle: result.output.slice(0, 150) },
  });

  await saveOptimization(product.id, "TITLE", product.title, result);
  return result.output;
}

export async function optimizeProductDescription(product: Product) {
  const prompt = `Write an SEO-friendly product description for shopping feeds (max 500 chars). Product: "${product.title}". Current description: "${product.description}". Brand: "${product.brand}".`;
  const result = await callAiPrompt(prompt);

  await prisma.product.update({
    where: { id: product.id },
    data: { aiOptimizedDescription: result.output.slice(0, 500) },
  });

  await saveOptimization(product.id, "DESCRIPTION", product.description, result);
  return result.output;
}

export async function generateFeedHealthSuggestions(product: Product) {
  const issues: string[] = [];
  if (!product.gtin) issues.push("missing GTIN");
  if (!product.brand) issues.push("missing brand");
  if (!product.imageUrl.startsWith("http")) issues.push("invalid image URL");
  if (!product.productUrl) issues.push("missing product URL");
  if (Number(product.price) <= 0) issues.push("invalid price");

  const prompt = `As a feed optimization expert, suggest 3 actionable improvements for this product feed item. Issues detected: ${issues.join(", ") || "none"}. Product: "${product.title}", SKU: "${product.sku}", category: "${product.category}".`;
  const result = await callAiPrompt(prompt);
  await saveOptimization(product.id, "HEALTH_SUGGESTION", product.title, result);
  return result.output;
}

export async function listAiOptimizations(productId: string) {
  return prisma.aiOptimization.findMany({
    where: { productId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}
