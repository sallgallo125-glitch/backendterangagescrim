<?php

namespace Database\Factories;

use App\Models\Departement;
use App\Models\Region;
use Illuminate\Database\Eloquent\Factories\Factory;

class DepartementFactory extends Factory
{
    protected $model = Departement::class;

    public function definition(): array
    {
        return [
            'nom' => $this->faker->unique()->city(),
            'code' => strtoupper($this->faker->unique()->lexify('???')),
            'region_id' => Region::factory(),
        ];
    }
}
