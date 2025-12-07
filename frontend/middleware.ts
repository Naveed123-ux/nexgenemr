// middleware.ts

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

async function verifyRole(token: string) {
  try {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
    const response = await fetch(`${apiBaseUrl}/users/me/role`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    
    if (!response.ok) {
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error verifying role:', error);
    return null;
  }
}

export async function middleware(request: NextRequest) {
  console.log("Middleware triggered");
  const url = request.nextUrl.pathname;
  
  // Public routes that don't require authentication
  const publicRoutes = [
    "/patient/book-waitlist", // Waitlist booking page (token-based)
  ];
  
  // Check if the current path is a public route
  const isPublicRoute = publicRoutes.some(route => url.startsWith(route));
  
  if (isPublicRoute) {
    // Allow access to public routes without authentication
    return NextResponse.next();
  }
  
  const token = request.cookies.get("token")?.value;
  // console.log("Token from cookies:", token);
  if (!token) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }
  const verifiedToken = token && (await verifyRole(token));
  
  console.log("verifiedToken:",verifiedToken)
  if (!verifiedToken) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  const userRole = verifiedToken.role;
  // console.log("User role:", userRole);
  // Check for the highest privilege level first (superadmin)
  if (url.startsWith("/superadmin")) {
    if (userRole !== "Super_Admin") {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }
  }
  // Then check for the next role (admin)
  else if (url.startsWith("/hospital-admin")) {
    if (userRole !== "Hospital_Admin") {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }
  } else if (url.startsWith("/staff")) {
    if (userRole !== "Receptionist") {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }
  }

  // Then check for the next role (doctor)
  else if (url.startsWith("/doctor")) {
    if (userRole !== "Doctor") {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }
  }
  // And finally, the lowest privilege level (patient)
  else if (url.startsWith("/patient")) {
    if (userRole !== "Patient") {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }
  }

  return NextResponse.next();
}

// The matcher remains the same to catch all relevant paths
export const config = {
  matcher: [
    "/superadmin/:path*",
    "/hospital-admin/:path*",
    "/doctor/:path*",
    "/patient/:path*",
  ],
};
