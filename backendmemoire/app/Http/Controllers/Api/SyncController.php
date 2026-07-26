<?php

namespace App\Http\Controllers\Api;

use App\Models\Infraction;
use App\Models\Accident;
use App\Models\AmendePieceSaisie;
use App\Models\ImmigrationClandestine;
use App\Models\ServiceRemunere;
use App\Models\Victime;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use OpenApi\Annotations as OA;

/**
 * Contrôleur pour la synchronisation offline.
 * Gère l'envoi par lot des données saisies hors ligne.
 */
class SyncController extends ApiController
{
    /**
     * @OA\Post(
     *     path="/api/sync/batch",
     *     tags={"Synchronisation"},
     *     summary="Synchroniser les données offline par lot",
     *     security={{"bearerAuth":{}}},
     *     @OA\Response(response=200, description="Synchronisation réussie")
     * )
     */
    public function batch(Request $request): JsonResponse
    {
        $user = auth()->user();

        $results = [
            'synced_infractions'      => [],
            'synced_accidents'        => [],
            'synced_amendes'          => [],
            'synced_immigrations'     => [],
            'synced_services_remuneres' => [],
            'errors'                  => [],
        ];

        DB::beginTransaction();
        try {
            // ── Infractions ──
            $infractionFields = ['type_infraction_id', 'service_id', 'annee', 'date', 'heure', 'lieu', 'commune_id', 'issue', 'type_drogue', 'unite', 'quantite', 'latitude', 'longitude', 'description', 'local_id', 'montant_amende', 'plaque_vehicule'];
            foreach ($request->input('infractions', []) as $data) {
                $data = Arr::only($data, array_merge($infractionFields, ['victimes']));
                if (empty($data['service_id'])) $data['service_id'] = $user->service_id;
                if (empty($data['service_id'])) { $results['errors'][] = 'Infraction ignorée : service_id manquant'; continue; }
                if (empty($data['type_infraction_id'])) { $results['errors'][] = 'Infraction ignorée : type_infraction_id manquant'; continue; }
                if (empty($data['commune_id'])) { $results['errors'][] = 'Infraction ignorée : commune_id manquant'; continue; }
                $localId = $data['local_id'] ?? null;
                $victimesData = $data['victimes'] ?? [];
                $data['user_id']     = $user->id;
                $data['sync_status'] = 'synced';
                $data['annee']       = date('Y', strtotime($data['date'] ?? now()));
                unset($data['victimes']);
                $record = Infraction::updateOrCreate(
                    ['local_id' => $localId, 'user_id' => $user->id],
                    $data
                );
                $results['synced_infractions'][] = ['local_id' => $localId, 'id' => $record->id];

                // Victimes liées : isolation via savepoint pour éviter la race condition delete/insert
                DB::statement('SAVEPOINT sp_victimes_inf_' . $record->id);
                Victime::where('infraction_id', $record->id)->delete();
                foreach ($victimesData as $v) {
                    $v['infraction_id'] = $record->id;
                    unset($v['accident_id'], $v['local_id'], $v['parent_local_id'], $v['parent_type'], $v['sync_status']);
                    $victimeValidator = Validator::make($v, [
                        'nom'        => 'nullable|string|max:255',
                        'prenom'     => 'nullable|string|max:255',
                        'sexe'       => 'nullable|in:M,F',
                        'age'        => 'nullable|integer|min:0|max:150',
                        'nationalite' => 'nullable|string|max:100',
                    ]);
                    if ($victimeValidator->fails()) {
                        \Illuminate\Support\Facades\Log::warning('SyncController: victime ignorée (infraction)', ['errors' => $victimeValidator->errors()->toArray(), 'local_id' => $localId]);
                        continue;
                    }
                    Victime::create($v);
                }
                DB::statement('RELEASE SAVEPOINT sp_victimes_inf_' . $record->id);
            }

            // ── Accidents ──
            $accidentFields = ['type', 'date', 'heure', 'lieu', 'commune_id', 'service_id', 'moyen', 'cause_probable', 'latitude', 'longitude', 'description', 'local_id'];
            foreach ($request->input('accidents', []) as $data) {
                $data = Arr::only($data, array_merge($accidentFields, ['victimes']));
                if (empty($data['service_id'])) $data['service_id'] = $user->service_id;
                if (empty($data['service_id'])) { $results['errors'][] = 'Accident ignoré : service_id manquant'; continue; }
                $localId = $data['local_id'] ?? null;
                $victimesData = $data['victimes'] ?? [];
                $data['user_id']     = $user->id;
                $data['sync_status'] = 'synced';
                unset($data['victimes']);
                $record = Accident::updateOrCreate(
                    ['local_id' => $localId, 'user_id' => $user->id],
                    $data
                );
                $results['synced_accidents'][] = ['local_id' => $localId, 'id' => $record->id];

                // Victimes liées : isolation via savepoint pour éviter la race condition delete/insert
                DB::statement('SAVEPOINT sp_victimes_acc_' . $record->id);
                Victime::where('accident_id', $record->id)->delete();
                foreach ($victimesData as $v) {
                    $v['accident_id'] = $record->id;
                    unset($v['infraction_id'], $v['local_id'], $v['parent_local_id'], $v['parent_type'], $v['sync_status']);
                    $victimeValidator = Validator::make($v, [
                        'nom'        => 'nullable|string|max:255',
                        'prenom'     => 'nullable|string|max:255',
                        'sexe'       => 'nullable|in:M,F',
                        'age'        => 'nullable|integer|min:0|max:150',
                        'nationalite' => 'nullable|string|max:100',
                    ]);
                    if ($victimeValidator->fails()) {
                        \Illuminate\Support\Facades\Log::warning('SyncController: victime ignorée (accident)', ['errors' => $victimeValidator->errors()->toArray(), 'local_id' => $localId]);
                        continue;
                    }
                    Victime::create($v);
                }
                DB::statement('RELEASE SAVEPOINT sp_victimes_acc_' . $record->id);
            }

            // ── Amendes ──
            $amendeFields = ['type', 'date', 'heure', 'lieu', 'commune_id', 'service_id', 'montant', 'description', 'plaque_immatriculation', 'local_id'];
            foreach ($request->input('amendes', []) as $data) {
                $data = Arr::only($data, $amendeFields);
                if (empty($data['service_id'])) $data['service_id'] = $user->service_id;
                $localId = $data['local_id'] ?? null;
                $data['user_id'] = $user->id;
                $record = AmendePieceSaisie::updateOrCreate(
                    ['local_id' => $localId, 'user_id' => $user->id],
                    $data
                );
                $results['synced_amendes'][] = ['local_id' => $localId, 'id' => $record->id];
            }

            // ── Immigrations ──
            $immigrationFields = ['date', 'heure', 'service_id', 'nombre_interpellation', 'nombre_hommes', 'nombre_femmes', 'nombre_enfants', 'nombre_maries', 'nombre_celibataires', 'nombre_senegalais', 'nombre_etrangers', 'zone_depart', 'zone_depart_lat', 'zone_depart_lng', 'zone_arrivee_prevue', 'zone_arrivee_lat', 'zone_arrivee_lng', 'local_id'];
            foreach ($request->input('immigrations', []) as $data) {
                $data = Arr::only($data, $immigrationFields);
                if (empty($data['service_id'])) {
                    $data['service_id'] = $user->service_id;
                }
                if (empty($data['service_id'])) {
                    $results['errors'][] = 'Immigration ignorée : service_id manquant';
                    continue;
                }
                $localId = $data['local_id'] ?? null;
                $data['user_id'] = $user->id;
                $record = ImmigrationClandestine::updateOrCreate(
                    ['local_id' => $localId, 'user_id' => $user->id],
                    $data
                );
                $results['synced_immigrations'][] = ['local_id' => $localId, 'id' => $record->id];
            }

            // ── Services rémunérés ──
            $serviceRemFields = ['date', 'heure', 'libelle', 'montant', 'service_id', 'commune_id', 'description', 'local_id'];
            foreach ($request->input('services_remuneres', []) as $data) {
                $data = Arr::only($data, $serviceRemFields);
                if (empty($data['service_id'])) $data['service_id'] = $user->service_id;
                if (empty($data['service_id'])) { $results['errors'][] = 'Service ignoré : service_id manquant'; continue; }
                $localId = $data['local_id'] ?? null;
                $data['user_id'] = $user->id;
                $record = ServiceRemunere::updateOrCreate(
                    ['local_id' => $localId, 'user_id' => $user->id],
                    $data
                );
                $results['synced_services_remuneres'][] = ['local_id' => $localId, 'id' => $record->id];
            }

            DB::commit();
            return $this->successResponse($results, 'Synchronisation réussie.');
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->errorResponse('Erreur de synchronisation: ' . $e->getMessage(), 500);
        }
    }

    /**
     * @OA\Get(
     *     path="/api/sync/status",
     *     tags={"Synchronisation"},
     *     summary="État de synchronisation",
     *     security={{"bearerAuth":{}}},
     *     @OA\Response(response=200, description="Statut de sync")
     * )
     */
    public function status(): JsonResponse
    {
        $data = [
            'pending_infractions'  => Infraction::pending()->count(),
            'pending_accidents'    => Accident::pending()->count(),
            'synced_infractions'   => Infraction::where('sync_status', 'synced')->count(),
            'synced_accidents'     => Accident::where('sync_status', 'synced')->count(),
        ];
        return $this->successResponse($data);
    }
}
