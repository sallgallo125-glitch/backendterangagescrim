<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>{{ $titre }}</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 10px; color: #1a202c; }
        h1 { text-align: center; color: #1a365d; font-size: 16px; margin: 0 0 4px; }
        h2 { text-align: center; color: #2d3748; font-size: 13px; margin: 0 0 4px; }
        .header { text-align: center; margin-bottom: 16px; padding-bottom: 10px; border-bottom: 2px solid #1a365d; }
        .header p { color: #718096; font-size: 9px; margin: 2px 0; }
        .meta { font-size: 8.5px; color: #4a5568; margin-bottom: 12px; }
        .meta span { margin-right: 16px; }
        .badge { display: inline-block; background: #ebf8ff; color: #2b6cb0; border: 1px solid #bee3f8; padding: 2px 6px; border-radius: 4px; font-size: 8px; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th { background-color: #1a365d; color: white; padding: 6px 5px; text-align: left; font-size: 9px; }
        td { padding: 5px; border-bottom: 1px solid #e2e8f0; font-size: 9px; vertical-align: top; }
        tr:nth-child(even) { background-color: #f7fafc; }
        .footer { text-align: center; margin-top: 20px; font-size: 8px; color: #a0aec0; border-top: 1px solid #e2e8f0; padding-top: 8px; }
        .total { font-weight: bold; background-color: #edf2f7; padding: 6px 5px; font-size: 10px; }
        .empty { text-align: center; color: #a0aec0; padding: 24px; font-style: italic; }
    </style>
</head>
<body>
    <div class="header">
        <h1>TERANGA GESCRIM</h1>
        <p>Direction de la Sécurité Publique — Sénégal</p>
        <h2>{{ $titre }}</h2>
        <p>Généré le : {{ $date_generation }}</p>
    </div>

    @php
        $dateFrom = $filters['date_from'] ?? null;
        $dateTo   = $filters['date_to']   ?? null;
        $annee    = $filters['annee']      ?? null;
    @endphp

    <div class="meta">
        @if($dateFrom && $dateTo && $dateFrom === $dateTo)
            <span><strong>Période :</strong> <span class="badge">{{ \Carbon\Carbon::parse($dateFrom)->format('d/m/Y') }}</span></span>
        @elseif($dateFrom || $dateTo)
            <span><strong>Du :</strong> {{ $dateFrom ? \Carbon\Carbon::parse($dateFrom)->format('d/m/Y') : '—' }}
            &nbsp;<strong>Au :</strong> {{ $dateTo ? \Carbon\Carbon::parse($dateTo)->format('d/m/Y') : '—' }}</span>
        @elseif($annee)
            <span><strong>Année :</strong> {{ $annee }}</span>
        @else
            <span><strong>Période :</strong> Tous les enregistrements</span>
        @endif
        <span><strong>Total :</strong> {{ $infractions->count() }} infraction(s)</span>
    </div>

    @if($infractions->isEmpty())
        <p class="empty">Aucune infraction trouvée pour les critères sélectionnés.</p>
    @else
    <table>
        <thead>
            <tr>
                <th>#</th>
                <th>Date</th>
                <th>Heure</th>
                <th>Lieu</th>
                <th>Commune</th>
                <th>Service</th>
                <th>Type</th>
                <th>Catégorie</th>
                <th>Issue</th>
            </tr>
        </thead>
        <tbody>
            @foreach($infractions as $index => $infraction)
            <tr>
                <td>{{ $index + 1 }}</td>
                <td>{{ $infraction->date?->format('d/m/Y') ?? ($infraction->annee ?? '-') }}</td>
                <td>{{ $infraction->heure ?? '-' }}</td>
                <td>{{ $infraction->lieu ?? '-' }}</td>
                <td>{{ $infraction->commune->nom ?? '-' }}</td>
                <td>{{ $infraction->service->nom ?? '-' }}</td>
                <td>{{ $infraction->typeInfraction->nom ?? '-' }}</td>
                <td>{{ $infraction->typeInfraction->categorieInfraction->nom ?? '-' }}</td>
                <td>{{ $infraction->issue ?? '-' }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>

    <p class="total">Total : {{ $infractions->count() }} infractions</p>
    @endif

    <div class="footer">
        <p>Teranga GESCRIM — Rapport confidentiel — {{ $date_generation }}</p>
        <p>Direction de la Sécurité Publique — Accès réservé au personnel autorisé</p>
    </div>
</body>
</html>
