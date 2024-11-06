
// Handles login authentication logic
import { NextRequest, NextResponse } from 'next/server';

const { ADMIN_USERNAME, ADMIN_PASSWORD } = process.env;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ success: false, message: 'Username and password are required' }, { status: 400 });
    }

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      // Authentication successful
      return NextResponse.json({ success: true }, { status: 200 });
    } else {
      // Authentication failed
      return NextResponse.json({ success: false, message: 'Invalid credentials' }, { status: 401 });
    }
  } catch (error) {
    console.error('Error in POST /api/login:', error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Method not allowed' }, { status: 405 });
}
