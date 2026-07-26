<?php

namespace App\Http\Controllers\Api;

use App\Mail\WelcomeMail;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Validator;
use Spatie\Permission\Models\Role;

class UserController extends ApiController
{
    use \App\Traits\GeneratesSecurePassword;
    // Hiérarchie : les rôles qu'un rôle donné peut attribuer
    private const ASSIGNABLE_ROLES = [
        'administrateur' => ['administrateur', 'gestionnaire', 'agent'],
        'gestionnaire'   => ['agent'],
        'agent'          => [],
    ];


    private function canAssignRole(string $targetRole): bool
    {
        $currentRole = auth()->user()->getRoleNames()->first() ?? '';
        return in_array($targetRole, self::ASSIGNABLE_ROLES[$currentRole] ?? [], true);
    }

    private function canManageUser(User $target): bool
    {
        $me          = auth()->user();
        $currentRole = $me->getRoleNames()->first() ?? '';
        $targetRole  = $target->getRoleNames()->first() ?? '';

        if (!in_array($targetRole, self::ASSIGNABLE_ROLES[$currentRole] ?? [], true)) {
            return false;
        }

        // Gestionnaire : gère uniquement les agents de sa région
        if ($currentRole === 'gestionnaire') {
            $target->loadMissing('service.commune.departement');
            return optional($target->service?->commune?->departement)->region_id === $me->read_scope_id;
        }

        // Administrateur : gère tous les utilisateurs sans restriction
        return true;
    }
    public function index(Request $request): JsonResponse
    {
        $me          = auth()->user();
        $currentRole = $me->getRoleNames()->first() ?? '';

        $query = User::with(['service', 'roles']);

        // Gestionnaire : voit uniquement les agents de sa région
        if ($currentRole === 'gestionnaire') {
            $query->whereHas('roles', fn($q) => $q->where('name', 'agent'))
                ->whereHas('service', function($sq) use ($me) {
                    $sq->whereHas('commune.departement', fn($dq) => $dq->where('region_id', $me->read_scope_id));
                });
        }
        // Administrateur : voit tous les utilisateurs sans restriction

        if ($request->has('search')) $query->search($request->search);
        if ($request->has('service_id')) $query->byService($request->service_id);
        if ($request->has('is_active')) $query->where('is_active', $request->boolean('is_active'));

        return $this->paginatedResponse($query->orderBy('name')->paginate(min((int) $request->get('per_page', 15), 100)));
    }

    public function show(User $user): JsonResponse
    {
        $user->load(['service', 'roles', 'permissions', 'personnel']);
        return $this->successResponse($user);
    }

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name'             => 'required|string|max:255',
            'email'            => 'required|email|unique:users,email',
            'telephone'        => 'nullable|string|max:20',
            'service_id'       => 'required_if:role,agent|nullable|exists:services,id',
            'role'             => 'required|string|exists:roles,name',
            'is_active'        => 'nullable|boolean',
            'read_scope_type'  => 'nullable|in:service,commune,departement,region,national',
            'read_scope_id'    => 'nullable|integer',
            'write_scope_type' => 'nullable|in:service,commune,departement,region,national',
            'write_scope_id'   => 'nullable|integer',
        ]);
        if ($validator->fails()) return $this->errorResponse('Erreur de validation', 422, $validator->errors());

        if (!$this->canAssignRole($request->role)) {
            return $this->errorResponse('Vous ne pouvez pas attribuer le rôle « ' . $request->role . ' ».', 403);
        }

        $me = auth()->user();
        // Gestionnaire : ne peut créer des agents que dans sa région
        if ($me->getRoleNames()->first() === 'gestionnaire') {
            if ($request->filled('service_id')) {
                $serviceRegion = \App\Models\Service::with('commune.departement')
                    ->find($request->service_id)?->commune?->departement?->region_id;
                if ($serviceRegion !== $me->read_scope_id) {
                    return $this->errorResponse('Vous ne pouvez créer des utilisateurs que dans votre région.', 403);
                }
            }
        }

        $plainPassword = $this->generateSecurePassword();

        $user = DB::transaction(function () use ($request, $plainPassword) {
            $user = User::create([
                'name'             => $request->name,
                'email'            => $request->email,
                'password'         => Hash::make($plainPassword),
                'telephone'        => $request->telephone,
                'service_id'       => $request->service_id,
                'is_active'        => $request->get('is_active', true),
                'read_scope_type'  => $request->read_scope_type,
                'read_scope_id'    => $request->read_scope_id,
                'write_scope_type' => $request->write_scope_type,
                'write_scope_id'   => $request->write_scope_id,
            ]);
            $user->assignRole($request->role);
            return $user;
        });

        Mail::to($user->email)->send(new WelcomeMail(
            userName:      $user->name,
            userEmail:     $user->email,
            plainPassword: $plainPassword,
            role:          $request->role,
        ));

        AuditLog::create([
            'user_id'    => auth()->id(),
            'action'     => 'user_created',
            'model_type' => User::class,
            'model_id'   => $user->id,
            'new_values' => ['name' => $user->name, 'email' => $user->email, 'role' => $request->role],
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
        ]);

        return $this->successResponse($user->load(['service', 'roles']), 'Utilisateur créé. Les identifiants ont été envoyés par email.', 201);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name'             => 'sometimes|string|max:255',
            'email'            => 'sometimes|email|unique:users,email,' . $user->id,
            'password'         => 'nullable|string|min:8',
            'telephone'        => 'nullable|string|max:20',
            'service_id'       => 'nullable|exists:services,id',
            'role'             => 'nullable|string|exists:roles,name',
            'is_active'        => 'nullable|boolean',
            'read_scope_type'  => 'nullable|in:service,commune,departement,region,national',
            'read_scope_id'    => 'nullable|integer',
            'write_scope_type' => 'nullable|in:service,commune,departement,region,national',
            'write_scope_id'   => 'nullable|integer',
        ]);
        if ($validator->fails()) return $this->errorResponse('Erreur de validation', 422, $validator->errors());

        if (!$this->canManageUser($user)) {
            return $this->errorResponse('Vous ne pouvez pas modifier cet utilisateur.', 403);
        }

        if ($request->filled('role') && !$this->canAssignRole($request->role)) {
            return $this->errorResponse('Vous ne pouvez pas attribuer le rôle « ' . $request->role . ' ».', 403);
        }

        $data = $request->except(['password', 'role']);
        if ($request->filled('password')) $data['password'] = Hash::make($request->password);

        $oldRole = $user->getRoleNames()->first();

        DB::transaction(function () use ($user, $data, $request, $oldRole) {
            $user->update($data);
            if ($request->filled('role')) {
                $user->syncRoles([$request->role]);
                if ($oldRole !== $request->role) {
                    app(\App\Services\DeviceSessionService::class)->revokeAll($user);
                    AuditLog::create([
                        'user_id'    => auth()->id(),
                        'action'     => 'role_changed',
                        'model_type' => User::class,
                        'model_id'   => $user->id,
                        'old_values' => ['role' => $oldRole],
                        'new_values' => ['role' => $request->role],
                        'ip_address' => request()->ip(),
                        'user_agent' => request()->userAgent(),
                    ]);
                }
            }
        });

        return $this->successResponse($user->load(['service', 'roles']), 'Utilisateur mis à jour.');
    }

    public function destroy(User $user): JsonResponse
    {
        if ($user->id === auth()->id()) {
            return $this->errorResponse('Vous ne pouvez pas supprimer votre propre compte.', 403);
        }

        if (!$this->canManageUser($user)) {
            return $this->errorResponse('Vous ne pouvez pas supprimer cet utilisateur.', 403);
        }

        AuditLog::create([
            'user_id'    => auth()->id(),
            'action'     => 'user_deleted',
            'model_type' => User::class,
            'model_id'   => $user->id,
            'old_values' => ['name' => $user->name, 'email' => $user->email],
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
        ]);

        $user->delete();
        return $this->successResponse(null, 'Utilisateur supprimé.');
    }

    // Lister les rôles disponibles
    public function roles(): JsonResponse
    {
        $roles = Role::all();
        return $this->successResponse($roles);
    }
}
