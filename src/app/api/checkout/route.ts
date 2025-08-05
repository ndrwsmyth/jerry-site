import { NextResponse } from "next/server";
import Stripe from "stripe";
import { client } from "@/sanity/client";
import { groq } from "next-sanity";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-07-30.basil",
});

export async function POST(request: Request) {
  try {
    const { productId, selectedSize } = await request.json();

    // Fetch product from Sanity with inventory check
    const product = await client.fetch(
      groq`*[_type == "product" && _id == $productId && availableForCheckout == true][0] {
        _id,
        name,
        description,
        price,
        quantityAvailable,
        "imageUrl": mainImage.asset->url
      }`,
      { productId }
    );

    if (!product) {
      return NextResponse.json(
        { error: "Product not found or not available for checkout" },
        { status: 404 }
      );
    }

    // Check inventory availability
    if (product.quantityAvailable <= 0) {
      return NextResponse.json(
        { error: "Product is out of stock" },
        { status: 400 }
      );
    }

    // Create Stripe checkout session with 30-minute expiration
    const productDescription = selectedSize 
      ? `${product.description || ""} - Size: ${selectedSize}`.trim()
      : product.description || "";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: selectedSize ? `${product.name} (${selectedSize})` : product.name,
              description: productDescription,
              images: product.imageUrl ? [product.imageUrl] : [],
            },
            unit_amount: Math.round(product.price * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      shipping_address_collection: {
        allowed_countries: ["US", "CA"],
      },
      success_url: `${request.headers.get("origin")}/shop/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.headers.get("origin")}/shop/product/${productId}`,
      expires_at: Math.floor(Date.now() / 1000) + (30 * 60), // 30 minutes from now
      metadata: {
        productId: product._id,
        selectedSize: selectedSize || "",
      },
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return NextResponse.json(
      { error: "Error creating checkout session" },
      { status: 500 }
    );
  }
} 