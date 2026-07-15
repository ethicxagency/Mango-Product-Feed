import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useActionData, useLoaderData } from "@remix-run/react";

import { FeedForm } from "~/components/FeedForm";
import { getCurrentShop } from "~/lib/current-shop.server";
import { parseFeedForm } from "~/lib/parse-feed-form.server";
import { catalogFacetsRepository } from "~/repositories/catalog-facets.repository.server";
import { collectionRepository } from "~/repositories/collection.repository.server";
import { productRepository } from "~/repositories/product.repository.server";
import { tagRepository } from "~/repositories/tag.repository.server";
import { feedService } from "~/services/feed.service.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const shop = await getCurrentShop(request);
  const [collections, tags, vendors, productTypes, products] =
    await Promise.all([
      collectionRepository.listByShop(shop.id),
      tagRepository.listByShop(shop.id),
      catalogFacetsRepository.listVendors(shop.id),
      catalogFacetsRepository.listProductTypes(shop.id),
      productRepository.search(shop.id, ""),
    ]);

  return json({
    collections: collections.map((c) => ({ id: c.id, label: c.title })),
    tags: tags.map((t) => ({ id: t.id, label: t.name })),
    vendors,
    productTypes,
    products: products.map((p) => ({
      id: p.id,
      title: p.title || "(untitled product)",
      vendor: p.vendor,
    })),
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const shop = await getCurrentShop(request);
  const formData = await request.formData();
  const result = parseFeedForm(formData);

  if (!result.success || !result.data) {
    return json(
      { error: result.error ?? "Invalid form submission" },
      { status: 400 },
    );
  }

  const feed = await feedService.createFeed(
    shop.id,
    shop.currency,
    result.data,
  );
  return redirect(`/app/feeds/${feed.id}`);
}

export default function NewFeedPage() {
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  return (
    <FeedForm
      pageTitle="Create feed"
      submitLabel="Create feed"
      collections={data.collections}
      tags={data.tags}
      vendors={data.vendors}
      productTypes={data.productTypes}
      products={data.products}
      formError={actionData?.error ?? null}
    />
  );
}
