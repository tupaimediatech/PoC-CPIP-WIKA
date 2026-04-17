<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\PersonalAccessToken;

class AuthController extends Controller
{
    private const MAX_SESSIONS = 3;

    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'     => 'required|string|max:255',
            'email'    => 'required|email|unique:users,email',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $user = User::create([
            'name'     => $data['name'],
            'email'    => $data['email'],
            'password' => Hash::make($data['password']),
        ]);

        [$plainToken, $expiresAt] = $this->issueToken($user, $request, remember: false);

        return response()->json([
            'user'       => $user->only('id', 'name', 'email', 'role'),
            'token'      => $plainToken,
            'expires_at' => $expiresAt?->toIso8601String(),
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email'       => 'required|email',
            'password'    => 'required|string',
            'remember'    => 'sometimes|boolean',
            'device_name' => 'sometimes|string|max:255',
        ]);

        $user = User::where('email', $data['email'])->first();

        if (!$user || !Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Email atau password salah.'],
            ]);
        }

        $this->pruneOldSessions($user);

        [$plainToken, $expiresAt] = $this->issueToken(
            user: $user,
            request: $request,
            remember: (bool) ($data['remember'] ?? false),
            deviceName: $data['device_name'] ?? null,
        );

        return response()->json([
            'user'       => $user->only('id', 'name', 'email', 'role'),
            'token'      => $plainToken,
            'expires_at' => $expiresAt?->toIso8601String(),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out successfully.']);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json(['user' => $request->user()->only('id', 'name', 'email', 'role')]);
    }

    public function sessions(Request $request): JsonResponse
    {
        $currentId = $request->user()->currentAccessToken()?->id;

        $sessions = $request->user()
            ->tokens()
            ->orderByDesc('last_used_at')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (PersonalAccessToken $t) => [
                'id'            => $t->id,
                'name'          => $t->name,
                'ip_address'    => $t->ip_address,
                'user_agent'    => $t->user_agent,
                'remember'      => (bool) $t->remember,
                'last_used_at'  => optional($t->last_used_at)->toIso8601String(),
                'created_at'    => optional($t->created_at)->toIso8601String(),
                'expires_at'    => optional($t->expires_at)->toIso8601String(),
                'is_current'    => $t->id === $currentId,
            ]);

        return response()->json(['data' => $sessions]);
    }

    public function revokeSession(Request $request, int $id): JsonResponse
    {
        $deleted = $request->user()->tokens()->whereKey($id)->delete();

        if (!$deleted) {
            return response()->json(['message' => 'Session tidak ditemukan.'], 404);
        }

        return response()->json(['message' => 'Session revoked.']);
    }

    /**
     * @return array{0: string, 1: ?Carbon}
     */
    private function issueToken(User $user, Request $request, bool $remember, ?string $deviceName = null): array
    {
        $device    = $deviceName ?: ($request->userAgent() ?: 'unknown');
        $expiresAt = $remember ? now()->addDays(30) : now()->addHours(12);

        $newToken = $user->createToken(
            name: $device,
            abilities: ['*'],
            expiresAt: $expiresAt,
        );

        $newToken->accessToken->forceFill([
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'remember'   => $remember,
        ])->save();

        return [$newToken->plainTextToken, $expiresAt];
    }

    private function pruneOldSessions(User $user): void
    {
        $keep = self::MAX_SESSIONS - 1; // make room for the new token

        $toDrop = $user->tokens()
            ->orderByDesc('last_used_at')
            ->orderByDesc('created_at')
            ->skip(max($keep, 0))
            ->take(PHP_INT_MAX)
            ->pluck('id');

        if ($toDrop->isNotEmpty()) {
            $user->tokens()->whereIn('id', $toDrop)->delete();
        }
    }
}
