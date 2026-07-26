<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>{{ $titre }}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: DejaVu Sans, sans-serif; font-size: 9px; color: #1a202c; }

        .page-header { border-bottom: 3px solid #1a365d; margin-bottom: 10px; padding-bottom: 8px; }
        .page-header table { width: 100%; border-collapse: collapse; }
        .page-header .logo-cell { width: 70px; text-align: center; vertical-align: middle; }
        .page-header .logo-emblem { width: 52px; height: 52px; border-radius: 50%; background: #1a365d; color: #fff; text-align: center; line-height: 52px; font-size: 22px; font-weight: bold; display: inline-block; }
        .page-header .title-cell { vertical-align: middle; padding-left: 10px; }
        .page-header .inst { font-size: 8px; color: #4a5568; text-transform: uppercase; letter-spacing: 0.5px; }
        .page-header h1 { font-size: 14px; font-weight: bold; color: #1a365d; margin: 3px 0 2px; }
        .page-header h2 { font-size: 11px; color: #2d3748; }
        .page-header .meta-right { text-align: right; vertical-align: top; font-size: 8px; color: #718096; }

        .meta-band { background: #EBF8FF; border: 1px solid #90CDF4; padding: 5px 8px; margin-bottom: 10px; font-size: 8px; color: #2B6CB0; }
        .meta-band table { width: 100%; border-collapse: collapse; }
        .meta-band td { padding: 0 8px 0 0; }
        .meta-band strong { color: #1a365d; }
        .badge { background: #BEE3F8; color: #2B6CB0; border: 1px solid #90CDF4; padding: 1px 6px; border-radius: 3px; font-weight: bold; }

        .summary { width: 100%; margin-bottom: 10px; border-collapse: collapse; }
        .summary td { text-align: center; padding: 5px 3px; background: #D9D9D9; border: 1px solid #CCCCCC; }
        .summary .num { font-size: 15px; font-weight: bold; color: #1a365d; display: block; }
        .summary .lbl { font-size: 7px; color: #4a5568; text-transform: uppercase; }

        .section-title { background: #1a365d; color: #fff; padding: 4px 8px; font-size: 10px; font-weight: bold; margin: 10px 0 0; }
        .section-sub   { background: #2C5282; color: #fff; padding: 3px 8px; font-size: 9px; font-weight: bold; margin: 0 0 4px; }

        table.data { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
        table.data thead th { background: #1a365d; color: #fff; padding: 5px 4px; text-align: left; font-size: 8px; border: 1px solid #1a365d; }
        table.data tbody td { padding: 4px; border: 1px solid #E2E8F0; font-size: 8px; vertical-align: top; }
        table.data tbody tr:nth-child(odd) td  { background: #FFFF00; }
        table.data tbody tr:nth-child(even) td { background: #FFFFFF; }
        table.data tbody tr.cat-row td { background: #D9D9D9; font-weight: bold; font-size: 8.5px; border: 1px solid #CCCCCC; }
        table.data tfoot td { background: #C6F6D5; color: #1a365d; font-weight: bold; font-size: 9px; padding: 5px 4px; border: 1px solid #A7F3D0; }

        table.stat { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
        table.stat thead th { background: #1a365d; color: #fff; padding: 4px 5px; text-align: center; font-size: 8px; border: 1px solid #1a365d; }
        table.stat tbody td { padding: 3px 5px; border: 1px solid #E2E8F0; font-size: 8px; text-align: center; }
        table.stat tbody tr:nth-child(odd) td  { background: #FFFF00; }
        table.stat tbody tr:nth-child(even) td { background: #FFFFFF; }
        table.stat tbody td:first-child { text-align: left; }
        table.stat tfoot td { background: #C6F6D5; color: #1a365d; font-weight: bold; font-size: 8px; padding: 4px 5px; border: 1px solid #A7F3D0; }

        .footer { margin-top: 14px; border-top: 1px solid #BEE3F8; padding-top: 5px; text-align: center; font-size: 7.5px; color: #a0aec0; }
        .empty { text-align: center; color: #a0aec0; padding: 20px; font-style: italic; }
        .two-col { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
        .two-col td { width: 50%; vertical-align: top; padding-right: 6px; }
        .two-col td:last-child { padding-right: 0; padding-left: 6px; }
    </style>
</head>
<body>

    <div class="page-header">
        <table><tr>
            <td class="logo-cell"><div class="logo-emblem">DSP</div></td>
            <td class="title-cell">
                <div class="inst">République du Sénégal — Ministère de l'Intérieur</div>
                <h1>TERANGA GESCRIM</h1>
                <h2>{{ $titre }}</h2>
            </td>
            <td class="meta-right">Généré le : {{ $date_generation }}<br>Agent : <strong>{{ $agent }}</strong></td>
        </tr></table>
    </div>

    @php
        $total   = $records->count();
        $deferes = $records->filter(fn($r) => str_contains(mb_strtolower($r->issue ?? ''), 'déféré'))->count();
        $gav     = $records->filter(fn($r) => str_contains(mb_strtolower($r->issue ?? ''), 'garde'))->count();
        $classes = $records->filter(fn($r) => str_contains(mb_strtolower($r->issue ?? ''), 'class'))->count();
        $byCat   = $records->groupBy(fn($r) => $r->typeInfraction?->categorieInfraction?->nom ?? 'Non classé');
    @endphp

    <div class="meta-band">
        <table><tr>
            <td><strong>Période :</strong> <span class="badge">{{ $period_label }}</span></td>
            <td><strong>Total infractions :</strong> {{ $total }}</td>
            <td><strong>Déférés :</strong> {{ $deferes }}</td>
            <td><strong>Garde à vue :</strong> {{ $gav }}</td>
            <td><strong>Classés :</strong> {{ $classes }}</td>
        </tr></table>
    </div>

    <table class="summary">
        <tr>
            @foreach($byCat->take(6) as $catNom => $catRecords)
            <td>
                <span class="num">{{ $catRecords->count() }}</span>
                <span class="lbl">{{ \Illuminate\Support\Str::limit($catNom, 20) }}</span>
            </td>
            @endforeach
        </tr>
    </table>

    <table class="two-col">
      <tr>
        <td>
          <div class="section-sub">RÉPARTITION PAR CATÉGORIE</div>
          <table class="stat">
            <thead><tr><th>Catégorie</th><th>Nb</th><th>%</th></tr></thead>
            <tbody>
              @foreach($byCat as $cat => $items)
              <tr>
                <td>{{ \Illuminate\Support\Str::limit($cat, 30) }}</td>
                <td>{{ $items->count() }}</td>
                <td>{{ $total > 0 ? round($items->count()/$total*100,1) : 0 }}%</td>
              </tr>
              @endforeach
            </tbody>
            <tfoot><tr><td>TOTAL</td><td>{{ $total }}</td><td>100%</td></tr></tfoot>
          </table>
        </td>
        <td>
          <div class="section-sub">RÉPARTITION PAR ISSUE</div>
          <table class="stat">
            <thead><tr><th>Issue</th><th>Nb</th><th>%</th></tr></thead>
            <tbody>
              @foreach($records->groupBy('issue') as $issue => $items)
              <tr>
                <td>{{ ucfirst($issue ?: 'Non précisée') }}</td>
                <td>{{ $items->count() }}</td>
                <td>{{ $total > 0 ? round($items->count()/$total*100,1) : 0 }}%</td>
              </tr>
              @endforeach
            </tbody>
            <tfoot><tr><td>TOTAL</td><td>{{ $total }}</td><td>100%</td></tr></tfoot>
          </table>
        </td>
      </tr>
    </table>

    <div class="section-title">DÉTAIL DES INFRACTIONS ({{ $total }})</div>
    @if($records->isEmpty())
        <p class="empty">Aucune infraction trouvée pour les critères sélectionnés.</p>
    @else
    <table class="data">
        <thead><tr>
            <th width="3%">#</th><th width="8%">Date</th><th width="5%">Heure</th>
            <th width="12%">Lieu</th><th width="9%">Commune</th><th width="12%">Service</th>
            <th width="12%">Type</th><th width="11%">Catégorie</th>
            <th width="8%">Issue</th><th width="20%">Description</th>
        </tr></thead>
        <tbody>
            @php $prevCat = null; @endphp
            @foreach($records as $i => $inf)
                @php $cat = $inf->typeInfraction?->categorieInfraction?->nom ?? 'Non classé'; @endphp
                @if($cat !== $prevCat)
                <tr class="cat-row"><td colspan="10">▶ {{ strtoupper($cat) }}</td></tr>
                @php $prevCat = $cat; @endphp
                @endif
                <tr>
                    <td style="text-align:center">{{ $i + 1 }}</td>
                    <td>{{ $inf->date?->format('d/m/Y') ?? ($inf->annee ?? '-') }}</td>
                    <td>{{ $inf->heure ?? '-' }}</td>
                    <td>{{ $inf->lieu ?? '-' }}</td>
                    <td>{{ $inf->commune->nom ?? '-' }}</td>
                    <td>{{ $inf->service->nom ?? '-' }}</td>
                    <td>{{ $inf->typeInfraction->nom ?? '-' }}</td>
                    <td>{{ $cat }}</td>
                    <td>{{ $inf->issue ?? '-' }}</td>
                    <td>{{ \Illuminate\Support\Str::limit($inf->description ?? '-', 50) }}</td>
                </tr>
            @endforeach
        </tbody>
        <tfoot><tr><td colspan="9" style="text-align:right">TOTAUX</td><td style="text-align:center">{{ $total }}</td></tr></tfoot>
    </table>
    @endif

    <div class="footer">
        <p>Teranga GESCRIM — Rapport confidentiel — Direction de la Sécurité Publique — Sénégal</p>
        <p>Généré le {{ $date_generation }} — Accès réservé au personnel autorisé</p>
    </div>
</body>
</html>
