import { NextResponse } from "next/server";
import Stripe from "stripe";
import { writeClient } from "@/sanity/client";
import { revalidatePath } from "next/cache";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-07-30.basil", 
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 }
      );
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      );
    }

    // Handle the checkout.session.completed event
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      
      // Extract product ID and size from metadata
      const productId = session.metadata?.productId;
      const selectedSize = session.metadata?.selectedSize;
      
      if (!productId) {
        console.error("No productId found in session metadata");
        return NextResponse.json(
          { error: "Missing productId in metadata" },
          { status: 400 }
        );
      }

      console.log(`Processing order for product: ${productId}${selectedSize ? ` (Size: ${selectedSize})` : ''}`);

      try {
        // Deduct inventory in Sanity
        await deductInventory(productId);
        console.log(`Successfully deducted inventory for product: ${productId}`);
        
        // Add small delay to avoid race conditions
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Revalidate pages to show updated inventory (with error handling)
        try {
          revalidatePath('/shop');
          revalidatePath(`/shop/product/${productId}`);
          console.log('Successfully revalidated shop and product pages');
        } catch (revalidationError) {
          console.error('Revalidation failed, but continuing:', revalidationError);
          // Don't throw - inventory was already deducted successfully
        }
        
      } catch (error) {
        console.error("Failed to deduct inventory:", error);
        return NextResponse.json(
          { error: "Failed to update inventory" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

async function deductInventory(productId: string) {
  // First fetch current quantity
  const product = await writeClient.fetch(
    `*[_type == "product" && _id == $productId][0] {
      _id,
      quantityAvailable
    }`,
    { productId }
  );

  if (!product) {
    throw new Error(`Product not found: ${productId}`);
  }

  const currentQuantity = product.quantityAvailable || 0;
  const newQuantity = Math.max(0, currentQuantity - 1);

  // Prepare update data
  const updateData: {
    quantityAvailable: number;
    availableForCheckout?: boolean;
  } = { quantityAvailable: newQuantity };
  
  // If stock goes to 0, mark as unavailable for checkout
  if (newQuantity === 0) {
    updateData.availableForCheckout = false;
    console.log(`Product ${productId} is now out of stock - marking as unavailable for checkout`);
  }

  // Update the quantity and availability in Sanity
  await writeClient
    .patch(productId)
    .set(updateData)
    .commit();

  console.log(`Inventory updated: ${productId} from ${currentQuantity} to ${newQuantity}`);
  if (newQuantity === 0) {
    console.log(`Product ${productId} automatically marked as unavailable for checkout`);
  }
} 