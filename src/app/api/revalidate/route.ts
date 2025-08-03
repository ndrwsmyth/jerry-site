import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

// Secret token to secure the webhook
const REVALIDATION_TOKEN = process.env.REVALIDATION_TOKEN;

export async function POST(request: NextRequest) {
  try {
    // Get the request body
    const body = await request.json();
    
    // Verify the webhook token
    const token = request.headers.get('x-webhook-token');
    if (token !== REVALIDATION_TOKEN) {
      console.log('Invalid token received');
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }
    
    // Check which document was changed
    const documentType = body?._type;
    
    console.log(`Revalidation triggered for document type: ${documentType}`);
    
    // Revalidate appropriate paths based on document type
    if (documentType === 'product') {
      // Revalidate shop page and individual product pages
      revalidatePath('/shop');
      console.log('Shop page revalidated successfully');
      
      // If you have individual product pages, you might want to revalidate those too
      revalidatePath(`/shop/product/${body._id}`);
      console.log('Individual product page revalidated successfully');
    }
    
    // Handle portfolio content changes
    if (documentType === 'portfolio') {
      // Revalidate portfolio page
      revalidatePath('/portfolio');
      console.log('Portfolio page revalidated successfully');
      
      // If you have individual portfolio item pages, revalidate those too
      revalidatePath(`/portfolio/${body.slug?.current}`);
      console.log('Individual portfolio pages revalidated successfully');
    }

    // Handle photo collection changes
    if (documentType === 'photoCollection') {
      revalidatePath('/photos');
      console.log('Photos page revalidated successfully');
      
      revalidatePath(`/photos/${body.slug?.current}`);
      console.log('Individual photo collection page revalidated successfully');
    }
    
    return NextResponse.json({ revalidated: true, now: Date.now() });
  } catch (err) {
    console.error('Revalidation error:', err);
    return NextResponse.json({ message: 'Error revalidating' }, { status: 500 });
  }
} 