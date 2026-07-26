<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class RBACTest extends TestCase
{
    use RefreshDatabase;

    private User $superAdmin;
    private User $admin;
    private User $gestionnaire;
    private User $agent;
    private string $deviceId;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\RolePermissionSeeder::class);

        $this->superAdmin = User::factory()->create([
            'password' => Hash::make('password123'),
            'is_2fa_enabled' => false,
        ]);
        $this->superAdmin->assignRole('super_admin');

        $this->admin = User::factory()->create([
            'password' => Hash::make('password123'),
            'is_2fa_enabled' => false,
        ]);
        $this->admin->assignRole('admin');

        $this->gestionnaire = User::factory()->create([
            'password' => Hash::make('password123'),
            'is_2fa_enabled' => false,
        ]);
        $this->gestionnaire->assignRole('gestionnaire');

        $this->agent = User::factory()->create([
            'password' => Hash::make('password123'),
            'is_2fa_enabled' => false,
        ]);
        $this->agent->assignRole('agent');

        $this->deviceId = hash('sha256', 'test-user-agent');
    }

    private function loginAndGetHeaders(User $user, array $extraHeaders = []): array
    {
        $headers = array_merge(['X-Mobile-Client' => 'flutter'], $extraHeaders);
        $response = $this->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => 'password123',
        ], $headers);

        $token = $response->json('data.access_token');
        $deviceId = $response->json('data.device_id') ?? $this->deviceId;

        return [
            'Authorization' => "Bearer $token",
            'X-Device-Id' => $deviceId,
            'X-Mobile-Client' => 'flutter',
        ];
    }

    public function test_super_admin_can_access_audit_logs(): void
    {
        $headers = $this->loginAndGetHeaders($this->superAdmin);
        $response = $this->getJson('/api/audit-logs', $headers);
        $response->assertStatus(200);
    }

    public function test_agent_cannot_access_audit_logs(): void
    {
        $headers = $this->loginAndGetHeaders($this->agent);
        $response = $this->getJson('/api/audit-logs', $headers);
        $response->assertStatus(403);
    }

    public function test_agent_cannot_delete_infractions(): void
    {
        $headers = $this->loginAndGetHeaders($this->agent);
        $response = $this->deleteJson('/api/infractions/999', [], $headers);
        $response->assertStatus(403);
    }

    public function test_gestionnaire_can_create_infractions(): void
    {
        $headers = $this->loginAndGetHeaders($this->gestionnaire);
        $response = $this->postJson('/api/infractions', [
            'date' => '2026-06-15',
            'lieu' => 'Dakar',
            'type_infraction_id' => 1,
        ], $headers);
        $this->assertNotEquals(403, $response->status());
    }

    public function test_agent_cannot_create_users(): void
    {
        $headers = $this->loginAndGetHeaders($this->agent);
        $response = $this->postJson('/api/users', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'password123',
            'role' => 'agent',
        ], $headers);
        $response->assertStatus(403);
    }

    public function test_admin_can_view_users(): void
    {
        $headers = $this->loginAndGetHeaders($this->admin);
        $response = $this->getJson('/api/users', $headers);
        $response->assertStatus(200);
    }

    public function test_agent_cannot_access_parametrage(): void
    {
        $headers = $this->loginAndGetHeaders($this->agent);
        $response = $this->getJson('/api/regions', $headers);
        $response->assertStatus(403);
    }

    public function test_superviseur_can_view_dashboard(): void
    {
        $headers = $this->loginAndGetHeaders($this->gestionnaire);
        $response = $this->getJson('/api/dashboard/stats', $headers);
        $this->assertNotEquals(403, $response->status());
    }

    public function test_agent_cannot_send_notifications(): void
    {
        $headers = $this->loginAndGetHeaders($this->agent);
        $response = $this->postJson('/api/notifications/send', [
            'title' => 'Test',
            'body' => 'Test notification',
        ], $headers);
        $response->assertStatus(403);
    }

    public function test_admin_cannot_delete_users(): void
    {
        $headers = $this->loginAndGetHeaders($this->admin);
        $response = $this->deleteJson('/api/users/' . $this->agent->id, [], $headers);
        $response->assertStatus(403);
    }

    public function test_super_admin_has_all_permissions(): void
    {
        $this->assertTrue($this->superAdmin->hasAllPermissions([
            'users.view', 'users.create', 'users.update', 'users.delete',
            'infractions.view', 'infractions.create', 'infractions.update', 'infractions.delete',
            'parametrage.view', 'parametrage.create', 'parametrage.update', 'parametrage.delete',
            'audit.view', 'export.pdf', 'export.csv', 'import.data',
        ]));
    }

    public function test_agent_permissions_are_limited(): void
    {
        $this->assertTrue($this->agent->hasPermissionTo('infractions.view'));
        $this->assertTrue($this->agent->hasPermissionTo('infractions.create'));
        $this->assertFalse($this->agent->hasPermissionTo('infractions.delete'));
        $this->assertFalse($this->agent->hasPermissionTo('users.view'));
        $this->assertFalse($this->agent->hasPermissionTo('audit.view'));
        $this->assertFalse($this->agent->hasPermissionTo('parametrage.view'));
    }

    public function test_gestionnaire_can_manage_users_in_own_service(): void
    {
        $this->assertTrue($this->gestionnaire->hasPermissionTo('users.create'));
        $this->assertTrue($this->gestionnaire->hasPermissionTo('users.update'));
        $this->assertTrue($this->gestionnaire->hasPermissionTo('users.delete'));
    }

    public function test_superviseur_cannot_delete_anything(): void
    {
        $this->assertFalse($this->gestionnaire->hasPermissionTo('personnels.delete'));
        $this->assertFalse($this->agent->hasPermissionTo('infractions.delete'));
    }
}
