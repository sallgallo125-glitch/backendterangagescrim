<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Region;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use PHPUnit\Framework\Attributes\Test;

class RegionTest extends TestCase
{
    use RefreshDatabase;

    protected $user;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Créer un utilisateur pour les tests
        $this->user = User::factory()->create();
    }

    #[Test]
    public function it_can_list_regions()
    {
        // Créer quelques régions
        Region::create(['nom' => 'Dakar', 'code' => 'DK']);
        Region::create(['nom' => 'Thies', 'code' => 'TH']);

        $response = $this->actingAs($this->user, 'api')
            ->getJson('/api/regions');

        $response->assertStatus(200)
            ->assertJsonCount(2, 'data');
    }

    #[Test]
    public function it_can_create_a_region()
    {
        $data = [
            'nom' => 'Saint-Louis',
            'code' => 'SL'
        ];

        $response = $this->actingAs($this->user, 'api')
            ->postJson('/api/regions', $data);

        $response->assertStatus(201)
            ->assertJsonPath('data.nom', 'Saint-Louis');

        $this->assertDatabaseHas('regions', ['nom' => 'Saint-Louis']);
    }

    #[Test]
    public function it_requires_authentication()
    {
        $response = $this->getJson('/api/regions');

        $response->assertStatus(401);
    }
}
