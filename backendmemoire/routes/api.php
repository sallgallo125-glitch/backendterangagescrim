<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\Auth\AuthController;
use App\Http\Controllers\Api\RegionController;
use App\Http\Controllers\Api\DepartementController;
use App\Http\Controllers\Api\CommuneController;
use App\Http\Controllers\Api\ServiceController;
use App\Http\Controllers\Api\PersonnelController;
use App\Http\Controllers\Api\TypeInfractionController;
use App\Http\Controllers\Api\InfractionController;
use App\Http\Controllers\Api\AccidentController;
use App\Http\Controllers\Api\VictimeController;
use App\Http\Controllers\Api\ServiceRemunereController;
use App\Http\Controllers\Api\AmendePieceSaisieController;
use App\Http\Controllers\Api\ImmigrationClandestineController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\ExportController;
use App\Http\Controllers\Api\AdvancedExportController;
use App\Http\Controllers\Api\SyncController;
use App\Http\Controllers\Api\AuditLogController;
use App\Http\Controllers\Api\MediaController;
use App\Http\Controllers\Api\SearchController;
use App\Http\Controllers\Api\FullReportController;

/*
|--------------------------------------------------------------------------
| Routes API - Teranga GESCRIM
|--------------------------------------------------------------------------
| Toutes les routes sont préfixées par /api
| L'authentification JWT est requise sauf pour le login
|--------------------------------------------------------------------------
*/

// ========== Health check Railway ==========
Route::get('health', [\App\Http\Controllers\Api\HealthController::class, 'index']);





// ========== Authentification ==========
Route::prefix('auth')->group(function () {
    Route::post('login', [AuthController::class, 'login'])->middleware('throttle:10,1');
    Route::post('2fa/verify', [AuthController::class, 'verify2fa'])->middleware('throttle:5,1');
    Route::post('forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:5,1');
    Route::post('reset-password-confirm', [AuthController::class, 'resetPasswordConfirm'])->middleware('throttle:5,1');
    Route::middleware('auth:api')->group(function () {
        Route::post('logout', [AuthController::class, 'logout']);
        Route::post('refresh', [AuthController::class, 'refresh']);
        Route::get('me', [AuthController::class, 'me']);
        Route::put('profile', [AuthController::class, 'updateProfile']);
        Route::post('change-password', [AuthController::class, 'changePassword']);
        Route::post('reset-password/{target}', [AuthController::class, 'adminResetPassword'])->middleware('permission:users.update');
        // 2FA management
        Route::post('2fa/setup', [AuthController::class, 'setup2fa']);
        Route::post('2fa/enable', [AuthController::class, 'enable2fa']);
        Route::post('2fa/disable', [AuthController::class, 'disable2fa']);
        Route::post('2fa/admin-disable/{target}', [AuthController::class, 'adminDisable2fa']);
        Route::post('revoke-all-sessions/{target}', [AuthController::class, 'adminRevokeAllSessions'])->middleware('permission:users.update');
        Route::post('unlock/{target}', [AuthController::class, 'adminUnlockAccount'])->middleware('permission:users.update');
    });
});

// ========== Routes protégées par JWT ==========
Route::middleware(['auth:api', 'verify.device', 'mobile.agent_only'])->group(function () {

    // --- Subdivisions administratives (lecture = parametrage.view, écriture = super_admin uniquement) ---
    Route::prefix('regions')->group(function () {
        Route::get('/', [RegionController::class, 'index'])->middleware('permission:parametrage.view');
        Route::get('/all', [RegionController::class, 'all'])->middleware('permission:parametrage.view');
        Route::get('/{region}', [RegionController::class, 'show'])->middleware('permission:parametrage.view');
        Route::post('/', [RegionController::class, 'store'])->middleware('permission:parametrage.create');
        Route::put('/{region}', [RegionController::class, 'update'])->middleware('permission:parametrage.update');
        Route::delete('/{region}', [RegionController::class, 'destroy'])->middleware('permission:parametrage.delete');
    });

    Route::prefix('departements')->group(function () {
        Route::get('/', [DepartementController::class, 'index'])->middleware('permission:parametrage.view');
        Route::get('/all', [DepartementController::class, 'all'])->middleware('permission:parametrage.view');
        Route::get('/{departement}', [DepartementController::class, 'show'])->middleware('permission:parametrage.view');
        Route::post('/', [DepartementController::class, 'store'])->middleware('permission:parametrage.create');
        Route::put('/{departement}', [DepartementController::class, 'update'])->middleware('permission:parametrage.update');
        Route::delete('/{departement}', [DepartementController::class, 'destroy'])->middleware('permission:parametrage.delete');
    });

    Route::prefix('communes')->group(function () {
        Route::get('/', [CommuneController::class, 'index'])->middleware('permission:parametrage.view');
        Route::get('/all', [CommuneController::class, 'all'])->middleware('permission:parametrage.view');
        Route::get('/{commune}', [CommuneController::class, 'show'])->middleware('permission:parametrage.view');
        Route::post('/', [CommuneController::class, 'store'])->middleware('permission:parametrage.create');
        Route::put('/{commune}', [CommuneController::class, 'update'])->middleware('permission:parametrage.update');
        Route::delete('/{commune}', [CommuneController::class, 'destroy'])->middleware('permission:parametrage.delete');
    });

    Route::prefix('services')->group(function () {
        Route::get('/', [ServiceController::class, 'index'])->middleware('permission:parametrage.view');
        Route::get('/all', [ServiceController::class, 'all'])->middleware('permission:parametrage.view');
        Route::get('/{service}', [ServiceController::class, 'show'])->middleware('permission:parametrage.view');
        Route::post('/', [ServiceController::class, 'store'])->middleware('permission:parametrage.create');
        Route::put('/{service}', [ServiceController::class, 'update'])->middleware('permission:parametrage.update');
        Route::delete('/{service}', [ServiceController::class, 'destroy'])->middleware('permission:parametrage.delete');
    });

    // --- Personnel ---
    Route::get('personnels', [PersonnelController::class, 'index'])->middleware('permission:personnels.view');
    Route::get('personnels/{personnel}', [PersonnelController::class, 'show'])->middleware('permission:personnels.view');
    Route::post('personnels', [PersonnelController::class, 'store'])->middleware('permission:personnels.create');
    Route::put('personnels/{personnel}', [PersonnelController::class, 'update'])->middleware('permission:personnels.update');
    Route::delete('personnels/{personnel}', [PersonnelController::class, 'destroy'])->middleware('permission:personnels.delete');

    // --- Types et catégories d'infractions ---
    Route::prefix('categories-infractions')->group(function () {
        Route::get('/', [TypeInfractionController::class, 'categories']);
        Route::post('/', [TypeInfractionController::class, 'storeCategorie'])->middleware('permission:parametrage.create');
        Route::put('/{categorie}', [TypeInfractionController::class, 'updateCategorie'])->middleware('permission:parametrage.update');
        Route::delete('/{categorie}', [TypeInfractionController::class, 'destroyCategorie'])->middleware('permission:parametrage.delete');
    });

    Route::prefix('types-infractions')->group(function () {
        Route::get('/', [TypeInfractionController::class, 'index']);
        Route::post('/', [TypeInfractionController::class, 'store'])->middleware('permission:parametrage.create');
        Route::put('/{typeInfraction}', [TypeInfractionController::class, 'update'])->middleware('permission:parametrage.update');
        Route::delete('/{typeInfraction}', [TypeInfractionController::class, 'destroy'])->middleware('permission:parametrage.delete');
    });

    // --- Infractions ---
    Route::get('infractions', [InfractionController::class, 'index'])->middleware('permission:infractions.view');
    Route::get('infractions/{infraction}', [InfractionController::class, 'show'])->middleware('permission:infractions.view');
    Route::post('infractions', [InfractionController::class, 'store'])->middleware('permission:infractions.create');
    Route::put('infractions/{infraction}', [InfractionController::class, 'update'])->middleware('permission:infractions.update');
    Route::patch('infractions/{infraction}', [InfractionController::class, 'update'])->middleware('permission:infractions.update');
    Route::delete('infractions/{infraction}', [InfractionController::class, 'destroy'])->middleware('permission:infractions.delete');

    // --- Accidents ---
    Route::get('accidents', [AccidentController::class, 'index'])->middleware('permission:accidents.view');
    Route::get('accidents/{accident}', [AccidentController::class, 'show'])->middleware('permission:accidents.view');
    Route::post('accidents', [AccidentController::class, 'store'])->middleware('permission:accidents.create');
    Route::put('accidents/{accident}', [AccidentController::class, 'update'])->middleware('permission:accidents.update');
    Route::patch('accidents/{accident}', [AccidentController::class, 'update'])->middleware('permission:accidents.update');
    Route::delete('accidents/{accident}', [AccidentController::class, 'destroy'])->middleware('permission:accidents.delete');

    // --- Victimes ---
    Route::get('victimes', [VictimeController::class, 'index'])->middleware('permission:victimes.view');
    Route::get('victimes/{victime}', [VictimeController::class, 'show'])->middleware('permission:victimes.view');
    Route::post('victimes', [VictimeController::class, 'store'])->middleware('permission:victimes.create');
    Route::put('victimes/{victime}', [VictimeController::class, 'update'])->middleware('permission:victimes.update');
    Route::patch('victimes/{victime}', [VictimeController::class, 'update'])->middleware('permission:victimes.update');
    Route::delete('victimes/{victime}', [VictimeController::class, 'destroy'])->middleware('permission:victimes.delete');

    // --- Services rémunérés ---
    Route::get('services-remuneres', [ServiceRemunereController::class, 'index'])->middleware('permission:services-remuneres.view');
    Route::get('services-remuneres/{serviceRemunere}', [ServiceRemunereController::class, 'show'])->middleware('permission:services-remuneres.view');
    Route::post('services-remuneres', [ServiceRemunereController::class, 'store'])->middleware('permission:services-remuneres.create');
    Route::put('services-remuneres/{serviceRemunere}', [ServiceRemunereController::class, 'update'])->middleware('permission:services-remuneres.update');
    Route::patch('services-remuneres/{serviceRemunere}', [ServiceRemunereController::class, 'update'])->middleware('permission:services-remuneres.update');
    Route::delete('services-remuneres/{serviceRemunere}', [ServiceRemunereController::class, 'destroy'])->middleware('permission:services-remuneres.delete');

    // --- Amendes et pièces saisies ---
    Route::get('amendes-pieces-saisies', [AmendePieceSaisieController::class, 'index'])->middleware('permission:amendes.view');
    Route::get('amendes-pieces-saisies/{amendePieceSaisie}', [AmendePieceSaisieController::class, 'show'])->middleware('permission:amendes.view');
    Route::post('amendes-pieces-saisies', [AmendePieceSaisieController::class, 'store'])->middleware('permission:amendes.create');
    Route::put('amendes-pieces-saisies/{amendePieceSaisie}', [AmendePieceSaisieController::class, 'update'])->middleware('permission:amendes.update');
    Route::patch('amendes-pieces-saisies/{amendePieceSaisie}', [AmendePieceSaisieController::class, 'update'])->middleware('permission:amendes.update');
    Route::delete('amendes-pieces-saisies/{amendePieceSaisie}', [AmendePieceSaisieController::class, 'destroy'])->middleware('permission:amendes.delete');

    // --- Immigrations clandestines ---
    Route::get('immigrations-clandestines/{id}/media', fn(\Illuminate\Http\Request $r, $id) => app(MediaController::class)->index($r, 'immigrations-clandestines', $id));
    Route::post('immigrations-clandestines/{id}/media', fn(\Illuminate\Http\Request $r, $id) => app(MediaController::class)->store($r, 'immigrations-clandestines', $id));
    Route::get('immigrations-clandestines', [ImmigrationClandestineController::class, 'index'])->middleware('permission:immigrations.view');
    Route::get('immigrations-clandestines/{immigrationClandestine}', [ImmigrationClandestineController::class, 'show'])->middleware('permission:immigrations.view');
    Route::post('immigrations-clandestines', [ImmigrationClandestineController::class, 'store'])->middleware('permission:immigrations.create');
    Route::put('immigrations-clandestines/{immigrationClandestine}', [ImmigrationClandestineController::class, 'update'])->middleware('permission:immigrations.update');
    Route::patch('immigrations-clandestines/{immigrationClandestine}', [ImmigrationClandestineController::class, 'update'])->middleware('permission:immigrations.update');
    Route::delete('immigrations-clandestines/{immigrationClandestine}', [ImmigrationClandestineController::class, 'destroy'])->middleware('permission:immigrations.delete');

    // --- Notifications ---
    Route::prefix('notifications')->group(function () {
        Route::get('/',             [NotificationController::class, 'index']);
        Route::get('/unread-count', [NotificationController::class, 'unreadCount']);
        Route::get('/history',      [NotificationController::class, 'history'])->middleware('permission:notifications.send');
        Route::put('/read-all',     [NotificationController::class, 'markAllAsRead']);
        Route::put('/{notification}/read', [NotificationController::class, 'markAsRead']);
        Route::post('/send',        [NotificationController::class, 'send'])->middleware('permission:notifications.send');
        Route::get('/zone-data',    [NotificationController::class, 'zoneData'])->middleware('permission:notifications.send');
    });

    // --- Utilisateurs et rôles ---
    Route::prefix('users')->group(function () {
        Route::get('/',        [UserController::class, 'index'])->middleware('permission:users.view');
        Route::get('/{user}',  [UserController::class, 'show'])->middleware('permission:users.view');
        Route::post('/',       [UserController::class, 'store'])->middleware('permission:users.create');
        Route::put('/{user}',  [UserController::class, 'update'])->middleware('permission:users.update');
        Route::delete('/{user}', [UserController::class, 'destroy'])->middleware('permission:users.delete');
    });
    Route::get('roles', [UserController::class, 'roles'])->middleware('permission:users.view');

    // --- Dashboard et statistiques ---
    Route::prefix('dashboard')->middleware('permission:dashboard.view')->group(function () {
        Route::get('/stats', [DashboardController::class, 'stats']);
        Route::get('/infractions-par-region', [DashboardController::class, 'infractionsParRegion']);
        Route::get('/accidents-par-type', [DashboardController::class, 'accidentsParType']);
        Route::get('/tendances-mensuelles', [DashboardController::class, 'tendancesMensuelles']);
        Route::get('/infractions-par-type', [DashboardController::class, 'infractionsParType']);
        Route::get('/personnel-par-service', [DashboardController::class, 'personnelParService']);
        Route::get('/saisies-par-heure', [DashboardController::class, 'saisiesParHeure']);
    });

    // --- Export ---
    Route::prefix('export')->middleware('throttle:10,1')->group(function () {
        Route::get('/infractions/pdf', [ExportController::class, 'infrationsPdf'])->middleware('permission:export.pdf');
        Route::get('/infractions/csv', [ExportController::class, 'infractionsCsv'])->middleware('permission:export.csv');
        Route::get('/accidents/pdf',   [ExportController::class, 'accidentsPdf'])->middleware('permission:export.pdf');
        Route::get('/accidents/csv',   [ExportController::class, 'accidentsCsv'])->middleware('permission:export.csv');
        Route::post('/import/json',    [ExportController::class, 'importJson'])->middleware('permission:import.data');
    });

    // --- Export avancé (PDF/Word = export.pdf ; Excel = export.csv) ---
    // La vérification fine du format est faite dans AdvancedExportController::checkExportPermission()
    Route::post('/accidents/export',           [AdvancedExportController::class, 'accidents'])->middleware(['throttle:10,1', 'permission:export.pdf|export.csv']);
    Route::post('/infractions/export',         [AdvancedExportController::class, 'infractions'])->middleware(['throttle:10,1', 'permission:export.pdf|export.csv']);
    Route::post('/immigrations/export',        [AdvancedExportController::class, 'immigrations'])->middleware(['throttle:10,1', 'permission:export.pdf|export.csv']);
    Route::post('/amendes/export',             [AdvancedExportController::class, 'amendes'])->middleware(['throttle:10,1', 'permission:export.pdf|export.csv']);
    Route::post('/personnels/export',          [AdvancedExportController::class, 'personnels'])->middleware(['throttle:10,1', 'permission:export.pdf|export.csv']);
    Route::post('/victimes/export',            [AdvancedExportController::class, 'victimes'])->middleware(['throttle:10,1', 'permission:export.pdf|export.csv']);
    Route::post('/services-remuneres/export',  [AdvancedExportController::class, 'servicesRemuneres'])->middleware(['throttle:10,1', 'permission:export.pdf|export.csv']);

    // --- Rapport complet consolidé (un seul fichier avec toutes les données) ---
    Route::post('/export/full-report', [FullReportController::class, 'generate'])->middleware(['throttle:5,1', 'permission:export.pdf|export.csv']);

    // --- Synchronisation offline ---
    Route::prefix('sync')->group(function () {
        Route::post('/batch', [SyncController::class, 'batch'])->middleware('throttle:5,1');
        Route::get('/status', [SyncController::class, 'status']);
    });

    // --- Audit logs ---
    Route::prefix('audit-logs')->group(function () {
        Route::get('/', [AuditLogController::class, 'index'])->middleware('permission:audit.view');
        Route::get('/{auditLog}', [AuditLogController::class, 'show'])->middleware('permission:audit.view');
    });

    // --- Recherche globale ---
    Route::get('/search', [SearchController::class, 'search'])->middleware(['permission:infractions.view', 'throttle:30,1']);

    // --- Médias (polymorphique) ---
    // Téléchargement / suppression en premier pour éviter l'ambiguïté avec /{type}/{id}/media
    Route::get('/media/{id}/download', [MediaController::class, 'download']);
    Route::delete('/media/{id}', [MediaController::class, 'destroy']);
    // Upload / liste : POST|GET /api/{type}/{id}/media
    Route::get('/{type}/{id}/media', [MediaController::class, 'index'])
        ->where('type', 'infractions|accidents|personnels|victimes');
    Route::post('/{type}/{id}/media', [MediaController::class, 'store'])
        ->where('type', 'infractions|accidents|personnels|victimes');
});
