<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RateLimitCustomerApi
{
    public function handle(Request $request, Closure $next): Response
    {
        // Rate limit customer API calls to prevent abuse
        $userId = auth()->id() ?? $request->ip() ?? 'global';
        $key = 'customer_api_' . $userId;

        if (RateLimiter::tooManyAttempts($key, 60)) {
            return response()->json([
                'success' => false,
                'message' => 'Too many requests. Please slow down.'
            ], 429);
        }

        RateLimiter::hit($key, 60);
        return $next($request);
    }
}
