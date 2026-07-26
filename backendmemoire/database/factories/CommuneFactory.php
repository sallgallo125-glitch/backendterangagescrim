<?php

namespace Database\Factories;

use App\Models\Commune;
use App\Models\Departement;
use Illuminate\Database\Eloquent\Factories\Factory;

class CommuneFactory extends Factory
{
    protected $model = Commune::class;

    public function definition(): array
    {
        return [
            'nom' => $this->faker->unique()->city(),
            'code' => strtoupper($this->faker->unique()->lexify('????')),
            'departement_id' => Departement::factory(),
        ];
    }
}
