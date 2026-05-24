<?php
namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class WhmcsTokenMiddleware
{
    public function handle(Request $request, Closure $next)
    {
        // Rate limit: 60 requests per minute per IP
        $key = 'whmcs_rate_' . $request->ip();
        if (Cache::get($key, 0) > 60) {
            return response()->json(['success' => false, 'message' => 'Rate limit exceeded'], 429);
        }
        Cache::increment($key, 1);
        Cache::put($key, Cache::get($key), 60);

        $token = $request->header('X-WHMCS-Token') 
              ?? $request->input('whmcs_token');
        $validToken = config('services.whmcs.secret_key');

        if (!$token || !hash_equals($validToken, $token)) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized'
            ], 401);
        }

        return $next($request);
    }
}
