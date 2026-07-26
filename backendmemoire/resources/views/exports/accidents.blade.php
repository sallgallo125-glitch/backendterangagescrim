<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>{{ $titre }}</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 10px; color: #1a202c; }
        h1 { text-align: center; color: #742a2a; font-size: 16px; margin: 0 0 4px; }
        h2 { text-align: center; color: #2d3748; font-size: 13px; margin: 0 0 4px; }
        .header { text-align: center; margin-bottom: 16px; padding-bottom: 10px; border-bottom: 2px solid #742a2a; }
        .header p { color: #718096; font-size: 9px; margin: 2px 0; }
        .meta { font-size: 8.5px; color: #4a5568; margin-bottom: 12px; }
        .meta span { margin-right: 16px; }
        .badge { display: inline-block; background: #fff5f5; color: #c53030; border: 1px solid #feb2b2; padding: 2px 6px; border-radius: 4px; font-size: 8px; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th { background-color: #742a2a; color: white; padding: 6px 5px; text-align: left; font-size: 9px; }
        td { padding: 5px; border-bottom: 1px solid #e2e8f0; font-size: 9px; vertical-align: top; }
        tr:nth-child(even) { background-color: #fff5f5; }
        .footer { text-align: center; margin-top: 20px; font-size: 8px; color: #a0aec0; border-top: 1px solid #e2e8f0; padding-top: 8px; }
        .total { font-weight: bold; background-color: #fed7d7; padding: 6px 5px; font-size: 10px; }
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
    @endphp

    <div class="meta">
        @if($dateFrom && $dateTo && $dateFrom === $dateTo)
            <span><strong>Période :</strong> <span class="badge">{{ \Carbon\Carbon::parse($dateFrom)->format('d/m/Y') }}</span></span>
        @elseif($dateFrom || $dateTo)
            <span><strong>Du :</strong> {{ $dateFrom ? \Carbon\Carbon::parse($dateFrom)->format('d/m/Y') : '—' }}
            &nbsp;<strong>Au :</strong> {{ $dateTo ? \Carbon\Carbon::parse($dateTo)->format('d/m/Y') : '—' }}</span>
        @else
            <span><strong>Période :</strong> Tous les enregistrements</span>
        @endif
        @if(!empty($filters['type']))
            <span><strong>Type :</strong> {{ $filters['type'] }}</span>
        @endif
        <span><strong>Total :</strong> {{ $accidents->count() }} accident(s)</span>
    </div>

    @if($accidents->isEmpty())
        <p class="empty">Aucun accident trouvé pour les critères sélectionnés.</p>
    @else
    <table>
        <thead>
            <tr>
                <th>#</th>
                <th>Date</th>
                <th>Heure</th>
                <th>Type</th>
                <th>Lieu</th>
                <th>Commune</th>
                <th>Service</th>
                <th>Moyen</th>
                <th>Cause</th>
                <th>Victimes</th>
            </tr>
        </thead>
        <tbody>
            @foreach($accidents as $index => $accident)
            <tr>
                <td>{{ $index + 1 }}</td>
                <td>{{ $accident->date?->format('d/m/Y') ?? '-' }}</td>
                <td>{{ $accident->heure ?? '-' }}</td>
                <td>{{ $accident->type ?? '-' }}</td>
                <td>{{ $accident->lieu ?? '-' }}</td>
                <td>{{ $accident->commune->nom ?? '-' }}</td>
                <td>{{ $accident->service->nom ?? '-' }}</td>
                <td>{{ $accident->moyen ?? '-' }}</td>
                <td>{{ $accident->cause_probable ?? '-' }}</td>
                <td>{{ $accident->victimes->count() }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>

    <p class="total">Total : {{ $accidents->count() }} accidents</p>
    @endif

    <div class="footer">
        <p>Teranga GESCRIM — Rapport confidentiel — {{ $date_generation }}</p>
        <p>Direction de la Sécurité Publique — Accès réservé au personnel autorisé</p>
    </div>
</body>
</html>
