<?php

namespace Database\Factories;

use App\Models\Service;
use App\Models\Commune;
use Illuminate\Database\Eloquent\Factories\Factory;

class ServiceFactory extends Factory
{
    protected $model = Service::class;

    public function definition(): array
    {
        return [
            'nom' => $this->faker->company(),
            'type' => $this->faker->randomElement(['commissariat', 'gendarmerie', 'poste_police']),
            'commune_id' => Commune::factory(),
            'adresse' => $this->faker->address(),
            'telephone' => $this->faker->phoneNumber(),
            'gere_immigration' => false,
        ];
    }
}
