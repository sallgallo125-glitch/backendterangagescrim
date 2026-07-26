<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Models\Commune;
use App\Models\Departement;
use App\Models\Region;
use App\Models\Service;
use App\Models\Infraction;
use App\Models\TypeInfraction;
use App\Enums\ScopeType;

class TerritorialAccessTest extends TestCase
{
    use RefreshDatabase;

    protected $region;
    protected $departement;
    protected $commune1;
    protected $commune2;
    protected $service1;
    protected $service2;
    protected $typeInfraction;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->artisan('db:seed', ['--class' => 'RolePermissionSeeder']);
        
        $this->region = Region::create(['nom' => 'Dakar', 'code' => 'DK']);
        $this->departement = Departement::create(['nom' => 'Dakar', 'code' => 'DK', 'region_id' => $this->region->id]);
        
        $this->commune1 = Commune::create(['nom' => 'Plateau', 'code' => 'PL', 'departement_id' => $this->departement->id]);
        $this->commune2 = Commune::create(['nom' => 'Medina', 'code' => 'ME', 'departement_id' => $this->departement->id]);
        
        $this->service1 = Service::create(['nom' => 'Comm Plateau', 'type' => 'CC', 'commune_id' => $this->commune1->id]);
        $this->service2 = Service::create(['nom' => 'Comm Medina', 'type' => 'CC', 'commune_id' => $this->commune2->id]);
        
        $this->typeInfraction = TypeInfraction::factory()->create();
    }

    protected function createAgent($communeId)
    {
        $user = User::factory()->create([
            'read_scope_type' => ScopeType::COMMUNE,
            'read_scope_id' => $communeId,
            'write_scope_type' => ScopeType::COMMUNE,
            'write_scope_id' => $communeId,
        ]);
        $user->assignRole('agent');
        return $user;
    }

    public function test_lecture_hors_territoire_refusee()
    {
        $agentPlateau = $this->createAgent($this->commune1->id);
        
        // Infraction Plateau
        $infractionPlateau = Infraction::factory()->create(['commune_id' => $this->commune1->id, 'service_id' => $this->service1->id]);
        
        // Infraction Medina
        $infractionMedina = Infraction::factory()->create(['commune_id' => $this->commune2->id, 'service_id' => $this->service2->id]);
        
        $token = auth()->login($agentPlateau);
        
        // Liste filtrée
        $response = $this->withHeaders(['Authorization' => "Bearer $token"])->get('/api/infractions');
        
        $response->assertStatus(200);
        $this->assertCount(1, $response->json('data'));
        $this->assertEquals($infractionPlateau->id, $response->json('data.0.id'));
        
        // Show Medina interdit
        $response = $this->withHeaders(['Authorization' => "Bearer $token"])->get('/api/infractions/' . $infractionMedina->id);
        $response->assertStatus(403);
    }

    public function test_ecriture_hors_territoire_refusee()
    {
        $agentPlateau = $this->createAgent($this->commune1->id);
        $token = auth()->login($agentPlateau);
        
        // Créer Plateau OK
        $response = $this->withHeaders(['Authorization' => "Bearer $token"])->postJson('/api/infractions', [
            'type_infraction_id' => $this->typeInfraction->id,
            'service_id' => $this->service1->id,
            'annee' => date('Y'),
            'date' => date('Y-m-d'),
            'lieu' => 'Test',
            'commune_id' => $this->commune1->id,
            'issue' => 'Constatée',
        ]);
        
        $response->assertStatus(201);
        
        // Créer Medina KO
        $response = $this->withHeaders(['Authorization' => "Bearer $token"])->postJson('/api/infractions', [
            'type_infraction_id' => $this->typeInfraction->id,
            'service_id' => $this->service2->id,
            'annee' => date('Y'),
            'date' => date('Y-m-d'),
            'lieu' => 'Test',
            'commune_id' => $this->commune2->id,
            'issue' => 'Constatée',
        ]);
        
        $response->assertStatus(403);
        $this->assertStringContainsString('Accès territorial refusé', $response->json('message'));
    }

    public function test_dashboard_correctement_filtre()
    {
        $agentPlateau = $this->createAgent($this->commune1->id);
        
        Infraction::factory()->create(['commune_id' => $this->commune1->id, 'service_id' => $this->service1->id, 'annee' => date('Y')]);
        Infraction::factory()->create(['commune_id' => $this->commune2->id, 'service_id' => $this->service2->id, 'annee' => date('Y')]);
        
        $token = auth()->login($agentPlateau);
        
        $response = $this->withHeaders(['Authorization' => "Bearer $token"])->get('/api/dashboard/stats');
        
        $response->assertStatus(200);
        $this->assertEquals(1, $response->json('data.total_infractions'));
    }
}
