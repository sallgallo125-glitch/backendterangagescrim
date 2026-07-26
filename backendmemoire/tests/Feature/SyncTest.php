<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Service;
use App\Models\Commune;
use App\Models\Departement;
use App\Models\Region;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class SyncTest extends TestCase
{
    use RefreshDatabase;

    private User $agent;
    private string $token;
    private string $deviceId;
    private int $serviceId;
    private int $communeId;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\RolePermissionSeeder::class);

        $region = Region::factory()->create();
        $departement = Departement::factory()->create(['region_id' => $region->id]);
        $commune = Commune::factory()->create(['departement_id' => $departement->id]);
        $this->communeId = $commune->id;

        $service = Service::factory()->create(['commune_id' => $commune->id]);
        $this->serviceId = $service->id;

        $this->agent = User::factory()->create([
            'password' => Hash::make('password123'),
            'is_2fa_enabled' => false,
            'service_id' => $service->id,
            'read_scope_type' => 'COMMUNE',
            'read_scope_id' => $commune->id,
            'write_scope_type' => 'COMMUNE',
            'write_scope_id' => $commune->id,
        ]);
        $this->agent->assignRole('agent');

        $loginResponse = $this->postJson('/api/auth/login', [
            'email' => $this->agent->email,
            'password' => 'password123',
        ], ['X-Mobile-Client' => 'flutter']);

        $this->token = $loginResponse->json('data.access_token');
        $this->deviceId = $loginResponse->json('data.device_id') ?? hash('sha256', 'test');
    }

    private function headers(): array
    {
        return [
            'Authorization' => "Bearer {$this->token}",
            'X-Device-Id' => $this->deviceId,
            'X-Mobile-Client' => 'flutter',
        ];
    }

    public function test_sync_batch_creates_infractions(): void
    {
        $response = $this->postJson('/api/sync/batch', [
            'infractions' => [
                [
                    'local_id' => 'local_inf_1',
                    'date' => '2026-06-15',
                    'lieu' => 'Dakar Centre',
                    'commune_id' => $this->communeId,
                    'service_id' => $this->serviceId,
                    'description' => 'Test infraction sync',
                ],
            ],
        ], $this->headers());

        $response->assertStatus(200);
        $response->assertJsonStructure(['data' => ['synced_infractions']]);
        $this->assertDatabaseHas('infractions', [
            'local_id' => 'local_inf_1',
            'lieu' => 'Dakar Centre',
            'sync_status' => 'synced',
        ]);
    }

    public function test_sync_batch_creates_accidents(): void
    {
        $response = $this->postJson('/api/sync/batch', [
            'accidents' => [
                [
                    'local_id' => 'local_acc_1',
                    'date' => '2026-06-15',
                    'lieu' => 'Route Nationale 1',
                    'type' => 'corporel',
                    'commune_id' => $this->communeId,
                    'service_id' => $this->serviceId,
                ],
            ],
        ], $this->headers());

        $response->assertStatus(200);
        $response->assertJsonStructure(['data' => ['synced_accidents']]);
    }

    public function test_sync_batch_rejects_unauthorized_commune(): void
    {
        $otherRegion = Region::factory()->create();
        $otherDept = Departement::factory()->create(['region_id' => $otherRegion->id]);
        $otherCommune = Commune::factory()->create(['departement_id' => $otherDept->id]);

        $response = $this->postJson('/api/sync/batch', [
            'infractions' => [
                [
                    'local_id' => 'local_inf_unauth',
                    'date' => '2026-06-15',
                    'lieu' => 'Hors zone',
                    'commune_id' => $otherCommune->id,
                    'service_id' => $this->serviceId,
                ],
            ],
        ], $this->headers());

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertNotEmpty($data['errors']);
        $this->assertDatabaseMissing('infractions', ['local_id' => 'local_inf_unauth']);
    }

    public function test_sync_batch_prevents_mass_assignment(): void
    {
        $response = $this->postJson('/api/sync/batch', [
            'infractions' => [
                [
                    'local_id' => 'local_inf_ma',
                    'date' => '2026-06-15',
                    'lieu' => 'Test',
                    'commune_id' => $this->communeId,
                    'service_id' => $this->serviceId,
                    'user_id' => 9999,
                    'sync_status' => 'hacked',
                ],
            ],
        ], $this->headers());

        $response->assertStatus(200);
        $this->assertDatabaseMissing('infractions', ['user_id' => 9999]);
        $this->assertDatabaseMissing('infractions', ['sync_status' => 'hacked']);
    }

    public function test_sync_batch_is_idempotent(): void
    {
        $payload = [
            'infractions' => [
                [
                    'local_id' => 'local_inf_idem',
                    'date' => '2026-06-15',
                    'lieu' => 'Dakar',
                    'commune_id' => $this->communeId,
                    'service_id' => $this->serviceId,
                ],
            ],
        ];

        $this->postJson('/api/sync/batch', $payload, $this->headers());
        $this->postJson('/api/sync/batch', $payload, $this->headers());

        $this->assertEquals(1, \App\Models\Infraction::where('local_id', 'local_inf_idem')->count());
    }

    public function test_sync_batch_requires_authentication(): void
    {
        $response = $this->postJson('/api/sync/batch', [
            'infractions' => [],
        ]);
        $response->assertStatus(401);
    }
}
