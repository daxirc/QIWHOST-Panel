<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CustomerAuthMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (auth('sanctum')->check() && auth('sanctum')->user() instanceof \App\Models\Customer) {
            auth()->setUser(auth('sanctum')->user());
            return $next($request);
        }

        return response()->json([
            'message' => 'Unauthorized. Customer access required.'
        ], 401);
    }
}
