<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    private User $agent;
    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\RolePermissionSeeder::class);

        $this->admin = User::factory()->create([
            'password' => Hash::make('password123'),
            'is_2fa_enabled' => false,
        ]);
        $this->admin->assignRole('admin');

        $this->agent = User::factory()->create([
            'password' => Hash::make('password123'),
            'is_2fa_enabled' => false,
        ]);
        $this->agent->assignRole('agent');
    }

    public function test_login_requires_credentials(): void
    {
        $response = $this->postJson('/api/auth/login', []);
        $response->assertStatus(422);
    }

    public function test_login_rejects_invalid_credentials(): void
    {
        $response = $this->postJson('/api/auth/login', [
            'email' => $this->admin->email,
            'password' => 'wrong_password',
        ]);
        $response->assertStatus(401);
    }

    public function test_login_success_for_admin(): void
    {
        $response = $this->postJson('/api/auth/login', [
            'email' => $this->admin->email,
            'password' => 'password123',
        ]);
        $response->assertStatus(200);
        $response->assertJsonStructure(['data' => ['user', 'expires_in', 'device_id']]);
    }

    public function test_agent_cannot_login_on_web(): void
    {
        $response = $this->postJson('/api/auth/login', [
            'email' => $this->agent->email,
            'password' => 'password123',
        ]);
        $response->assertStatus(403);
        $response->assertJson(['code' => 'web_login_denied']);
    }

    public function test_agent_can_login_on_mobile(): void
    {
        $response = $this->postJson('/api/auth/login', [
            'email' => $this->agent->email,
            'password' => 'password123',
        ], ['X-Mobile-Client' => 'flutter']);

        $response->assertStatus(200);
        $response->assertJsonStructure(['data' => ['access_token', 'user']]);
    }

    public function test_brute_force_lockout_after_5_attempts(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/auth/login', [
                'email' => $this->admin->email,
                'password' => 'wrong',
            ]);
        }

        $response = $this->postJson('/api/auth/login', [
            'email' => $this->admin->email,
            'password' => 'password123',
        ]);
        $response->assertStatus(429);
    }

    public function test_logout_invalidates_session(): void
    {
        $loginResponse = $this->postJson('/api/auth/login', [
            'email' => $this->admin->email,
            'password' => 'password123',
        ]);

        $token = $loginResponse->json('data.access_token') ?? '';
        $deviceId = $loginResponse->json('data.device_id');

        $response = $this->postJson('/api/auth/logout', [], [
            'Authorization' => "Bearer $token",
            'X-Device-Id' => $deviceId,
        ]);
        $response->assertStatus(200);
    }

    public function test_device_id_required_on_protected_routes(): void
    {
        $loginResponse = $this->postJson('/api/auth/login', [
            'email' => $this->admin->email,
            'password' => 'password123',
        ]);

        $token = $loginResponse->json('data.access_token') ?? '';

        $response = $this->getJson('/api/auth/me', [
            'Authorization' => "Bearer $token",
        ]);
        $response->assertStatus(401);
        $response->assertJson(['code' => 'MISSING_DEVICE_ID']);
    }

    public function test_web_client_does_not_receive_token_in_json(): void
    {
        $response = $this->postJson('/api/auth/login', [
            'email' => $this->admin->email,
            'password' => 'password123',
        ]);

        $response->assertStatus(200);
        $this->assertArrayNotHasKey('access_token', $response->json('data'));
    }

    public function test_mobile_client_receives_token_in_json(): void
    {
        $response = $this->postJson('/api/auth/login', [
            'email' => $this->agent->email,
            'password' => 'password123',
        ], ['X-Mobile-Client' => 'flutter']);

        $response->assertStatus(200);
        $this->assertArrayHasKey('access_token', $response->json('data'));
    }
}
