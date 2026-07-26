<?php

namespace App\Services\Export;

use Carbon\Carbon;

class DateFilterService
{
    /**
     * Convertit un periodType + paramètres optionnels en [date_from, date_to].
     * Retourne null sur les deux champs si aucun filtre temporel n'est demandé.
     */
    public function resolve(string $periodType, array $params): array
    {
        $now = Carbon::now();

        return match ($periodType) {
            'last_24h'   => [$now->copy()->subDay()->toDateString(),         $now->toDateString()],
            'last_7d'    => [$now->copy()->subDays(7)->toDateString(),        $now->toDateString()],
            'last_30d'   => [$now->copy()->subDays(30)->toDateString(),       $now->toDateString()],
            'last_3m'    => [$now->copy()->subMonths(3)->toDateString(),      $now->toDateString()],
            'last_6m'    => [$now->copy()->subMonths(6)->toDateString(),      $now->toDateString()],
            'current_year'  => [Carbon::create($now->year, 1, 1)->toDateString(),  $now->toDateString()],
            'current_month' => [Carbon::create($now->year, $now->month, 1)->toDateString(), $now->toDateString()],
            'specific_month' => $this->resolveSpecificMonth($params),
            'custom'     => [$params['start_date'] ?? null, $params['end_date'] ?? null],
            default      => [null, null],
        };
    }

    public function label(string $periodType, array $params): string
    {
        return match ($periodType) {
            'last_24h'      => 'Dernières 24 heures',
            'last_7d'       => '7 derniers jours',
            'last_30d'      => '30 derniers jours',
            'last_3m'       => '3 derniers mois',
            'last_6m'       => '6 derniers mois',
            'current_year'  => 'Année en cours (' . now()->year . ')',
            'current_month' => 'Mois en cours',
            'specific_month' => $this->specificMonthLabel($params),
            'custom'        => 'Du ' . ($params['start_date'] ?? '—') . ' au ' . ($params['end_date'] ?? '—'),
            default         => 'Tous les enregistrements',
        };
    }

    private function resolveSpecificMonth(array $params): array
    {
        $month = (int) ($params['month'] ?? now()->month);
        $year  = (int) ($params['year']  ?? now()->year);
        $start = Carbon::create($year, $month, 1);
        return [$start->toDateString(), $start->copy()->endOfMonth()->toDateString()];
    }

    private function specificMonthLabel(array $params): string
    {
        $months = [
            1 => 'Janvier', 2 => 'Février', 3 => 'Mars', 4 => 'Avril',
            5 => 'Mai', 6 => 'Juin', 7 => 'Juillet', 8 => 'Août',
            9 => 'Septembre', 10 => 'Octobre', 11 => 'Novembre', 12 => 'Décembre',
        ];
        $month = (int) ($params['month'] ?? now()->month);
        $year  = (int) ($params['year']  ?? now()->year);
        return ($months[$month] ?? 'Mois inconnu') . ' ' . $year;
    }
}
