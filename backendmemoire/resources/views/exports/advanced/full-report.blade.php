<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>{{ $titre }}</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 9px; color: #1a202c; margin: 0; padding: 0; }
        .header { text-align: center; padding-bottom: 10px; border-bottom: 2px solid #1B4332; margin-bottom: 12px; }
        .header h1 { color: #1B4332; font-size: 15px; margin: 0 0 3px; }
        .header h2 { color: #2d3748; font-size: 12px; margin: 0 0 3px; }
        .header p { color: #718096; font-size: 8px; margin: 2px 0; }
        .section-title { background: #1B4332; color: white; padding: 5px 8px; font-size: 10px; font-weight: bold; margin: 14px 0 6px; border-radius: 2px; }
        .meta { font-size: 8px; color: #4a5568; margin-bottom: 10px; }
        .meta strong { color: #2d3748; }
        .badge { background: #ECFDF5; color: #065F46; border: 1px solid #A7F3D0; padding: 1px 5px; border-radius: 3px; }
        table { width: 100%; border-collapse: collapse; margin-top: 4px; margin-bottom: 8px; }
        th { background-color: #2D6A4F; color: white; padding: 4px 3px; text-align: left; font-size: 7.5px; }
        td { padding: 3px; border-bottom: 1px solid #e2e8f0; font-size: 7.5px; vertical-align: top; }
        tr:nth-child(even) td { background-color: #F0FDF4; }
        .footer { text-align: center; margin-top: 18px; font-size: 7.5px; color: #a0aec0; border-top: 1px solid #e2e8f0; padding-top: 6px; }
        .count { font-size: 8px; color: #065F46; margin-bottom: 4px; }
        .empty { text-align: center; color: #a0aec0; padding: 12px; font-style: italic; font-size: 8px; }
        .summary { display: table; width: 100%; margin-bottom: 12px; }
        .summary-item { display: table-cell; text-align: center; padding: 6px; background: #F0FDF4; border: 1px solid #A7F3D0; }
        .summary-item .num { font-size: 14px; font-weight: bold; color: #1B4332; }
        .summary-item .lbl { font-size: 7px; color: #4a5568; }
    </style>
</head>
<body>
    <div class="header">
        <h1>TERANGA GESCRIM</h1>
        <p>Direction de la Sécurité Publique — Sénégal</p>
        <h2>{{ $titre }}</h2>
        <p>Généré le : {{ $date_generation }} — Agent : {{ $agent }}</p>
    </div>

    <div class="meta">
        <span><strong>Période :</strong> <span class="badge">{{ $period_label }}</span></span>
    </div>

    {{-- Résumé --}}
    <div class="summary">
        <div class="summary-item"><div class="num">{{ $data['infractions']->count() }}</div><div class="lbl">Infractions</div></div>
        <div class="summary-item"><div class="num">{{ $data['accidents']->count() }}</div><div class="lbl">Accidents</div></div>
        <div class="summary-item"><div class="num">{{ $data['immigrations']->count() }}</div><div class="lbl">Immigration</div></div>
        <div class="summary-item"><div class="num">{{ $data['personnel']->count() }}</div><div class="lbl">Personnel</div></div>
        <div class="summary-item"><div class="num">{{ $data['victimes']->count() }}</div><div class="lbl">Victimes</div></div>
        <div class="summary-item"><div class="num">{{ $data['amendes']->count() }}</div><div class="lbl">Amendes</div></div>
        <div class="summary-item"><div class="num">{{ $data['services']->count() }}</div><div class="lbl">Serv. Rém.</div></div>
    </div>

    {{-- Infractions --}}
    <div class="section-title">Infractions ({{ $data['infractions']->count() }})</div>
    @if($data['infractions']->isEmpty())
        <p class="empty">Aucune infraction.</p>
    @else
    <table>
        <thead><tr><th>#</th><th>Date</th><th>Lieu</th><th>Commune</th><th>Service</th><th>Type</th><th>Catégorie</th><th>Issue</th></tr></thead>
        <tbody>
            @foreach($data['infractions'] as $i => $inf)
            <tr>
                <td>{{ $i + 1 }}</td>
                <td>{{ $inf->date?->format('d/m/Y') ?? '-' }}</td>
                <td>{{ $inf->lieu ?? '-' }}</td>
                <td>{{ $inf->commune->nom ?? '-' }}</td>
                <td>{{ $inf->service->nom ?? '-' }}</td>
                <td>{{ $inf->typeInfraction->nom ?? '-' }}</td>
                <td>{{ $inf->typeInfraction->categorieInfraction->nom ?? '-' }}</td>
                <td>{{ $inf->issue ?? '-' }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>
    @endif

    {{-- Accidents --}}
    <div class="section-title">Accidents ({{ $data['accidents']->count() }})</div>
    @if($data['accidents']->isEmpty())
        <p class="empty">Aucun accident.</p>
    @else
    <table>
        <thead><tr><th>#</th><th>Date</th><th>Type</th><th>Lieu</th><th>Commune</th><th>Service</th><th>Moyen</th><th>Cause</th><th>Victimes</th></tr></thead>
        <tbody>
            @foreach($data['accidents'] as $i => $a)
            <tr>
                <td>{{ $i + 1 }}</td>
                <td>{{ $a->date?->format('d/m/Y') ?? '-' }}</td>
                <td>{{ $a->type ?? '-' }}</td>
                <td>{{ $a->lieu ?? '-' }}</td>
                <td>{{ $a->commune->nom ?? '-' }}</td>
                <td>{{ $a->service->nom ?? '-' }}</td>
                <td>{{ $a->moyen ?? '-' }}</td>
                <td>{{ $a->cause_probable ?? '-' }}</td>
                <td>{{ $a->victimes->count() }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>
    @endif

    {{-- Immigration --}}
    <div class="section-title">Immigration Clandestine ({{ $data['immigrations']->count() }})</div>
    @if($data['immigrations']->isEmpty())
        <p class="empty">Aucun dossier.</p>
    @else
    <table>
        <thead><tr><th>#</th><th>Date</th><th>Service</th><th>Total</th><th>Hommes</th><th>Femmes</th><th>Enfants</th><th>Sénégalais</th><th>Étrangers</th><th>Zone départ</th></tr></thead>
        <tbody>
            @foreach($data['immigrations'] as $i => $r)
            <tr>
                <td>{{ $i + 1 }}</td>
                <td>{{ $r->date?->format('d/m/Y') ?? '-' }}</td>
                <td>{{ $r->service->nom ?? '-' }}</td>
                <td>{{ $r->nombre_interpellation ?? 0 }}</td>
                <td>{{ $r->nombre_hommes ?? 0 }}</td>
                <td>{{ $r->nombre_femmes ?? 0 }}</td>
                <td>{{ $r->nombre_enfants ?? 0 }}</td>
                <td>{{ $r->nombre_senegalais ?? 0 }}</td>
                <td>{{ $r->nombre_etrangers ?? 0 }}</td>
                <td>{{ $r->zone_depart ?? '-' }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>
    @endif

    {{-- Personnel --}}
    <div class="section-title">Personnel ({{ $data['personnel']->count() }})</div>
    @if($data['personnel']->isEmpty())
        <p class="empty">Aucun personnel.</p>
    @else
    <table>
        <thead><tr><th>#</th><th>CCAP</th><th>Nom</th><th>Prénom</th><th>Grade</th><th>Service</th><th>Statut</th><th>Téléphone</th></tr></thead>
        <tbody>
            @foreach($data['personnel'] as $i => $p)
            <tr>
                <td>{{ $i + 1 }}</td>
                <td>{{ $p->ccap ?? '-' }}</td>
                <td>{{ $p->nom ?? '-' }}</td>
                <td>{{ $p->prenom ?? '-' }}</td>
                <td>{{ $p->grade ?? '-' }}</td>
                <td>{{ $p->service->nom ?? '-' }}</td>
                <td>{{ $p->statut ?? '-' }}</td>
                <td>{{ $p->telephone ?? '-' }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>
    @endif

    {{-- Victimes --}}
    <div class="section-title">Victimes ({{ $data['victimes']->count() }})</div>
    @if($data['victimes']->isEmpty())
        <p class="empty">Aucune victime.</p>
    @else
    <table>
        <thead><tr><th>#</th><th>Nom</th><th>Prénom</th><th>CIN/Passeport</th><th>Sexe</th><th>Âge</th><th>Nationalité</th><th>Gravité</th><th>État</th></tr></thead>
        <tbody>
            @foreach($data['victimes'] as $i => $v)
            <tr>
                <td>{{ $i + 1 }}</td>
                <td>{{ $v->nom ?? '-' }}</td>
                <td>{{ $v->prenom ?? '-' }}</td>
                <td>{{ $v->no_cin_passeport ?? '-' }}</td>
                <td>{{ $v->sexe ?? '-' }}</td>
                <td>{{ $v->age ?? '-' }}</td>
                <td>{{ $v->nationalite ?? '-' }}</td>
                <td>{{ $v->gravite_blessures ?? '-' }}</td>
                <td>{{ $v->etat_medical ?? '-' }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>
    @endif

    {{-- Amendes --}}
    <div class="section-title">Amendes & Pièces Saisies ({{ $data['amendes']->count() }})</div>
    @if($data['amendes']->isEmpty())
        <p class="empty">Aucune amende.</p>
    @else
    <table>
        <thead><tr><th>#</th><th>Date</th><th>Heure</th><th>Type</th><th>Service</th><th>Montant</th><th>Description</th></tr></thead>
        <tbody>
            @foreach($data['amendes'] as $i => $am)
            <tr>
                <td>{{ $i + 1 }}</td>
                <td>{{ $am->date?->format('d/m/Y') ?? '-' }}</td>
                <td>{{ $am->heure ?? '-' }}</td>
                <td>{{ $am->type ?? '-' }}</td>
                <td>{{ $am->service->nom ?? '-' }}</td>
                <td>{{ number_format((float)($am->montant ?? 0), 0, ',', ' ') }} FCFA</td>
                <td>{{ $am->description ?? '-' }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>
    @endif

    {{-- Services Rémunérés --}}
    <div class="section-title">Services Rémunérés ({{ $data['services']->count() }})</div>
    @if($data['services']->isEmpty())
        <p class="empty">Aucun service rémunéré.</p>
    @else
    <table>
        <thead><tr><th>#</th><th>Date</th><th>Heure</th><th>Libellé</th><th>Service</th><th>Montant</th><th>Description</th></tr></thead>
        <tbody>
            @foreach($data['services'] as $i => $sr)
            <tr>
                <td>{{ $i + 1 }}</td>
                <td>{{ $sr->date?->format('d/m/Y') ?? '-' }}</td>
                <td>{{ $sr->heure ?? '-' }}</td>
                <td>{{ $sr->libelle ?? '-' }}</td>
                <td>{{ $sr->service->nom ?? '-' }}</td>
                <td>{{ number_format((float)($sr->montant ?? 0), 0, ',', ' ') }} FCFA</td>
                <td>{{ $sr->description ?? '-' }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>
    @endif

    <div class="footer">
        <p>Teranga GESCRIM — Rapport confidentiel — {{ $date_generation }}</p>
        <p>Direction de la Sécurité Publique — Accès réservé au personnel autorisé</p>
    </div>
</body>
</html>
