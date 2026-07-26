<?php

namespace Database\Factories;

use App\Models\Region;
use Illuminate\Database\Eloquent\Factories\Factory;

class RegionFactory extends Factory
{
    protected $model = Region::class;

    public function definition(): array
    {
        return [
            'nom' => $this->faker->unique()->city(),
            'code' => strtoupper($this->faker->unique()->lexify('??')),
        ];
    }
}
