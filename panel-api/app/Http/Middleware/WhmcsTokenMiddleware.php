<?php
namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class WhmcsTokenMiddleware
{
    public function handle(Request $request, Closure $next)
    {
        $token = $request->header('X-WHMCS-Token') ?: $request->input('whmcs_token');
        $validToken = config('services.whmcs.secret_key');

        if (!$token || $token !== $validToken) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized - Invalid WHMCS token'
            ], 401);
        }

        return $next($request);
    }
}
