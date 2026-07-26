<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>{{ $titre }}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: DejaVu Sans, sans-serif; font-size: 9px; color: #1a202c; }

        .page-header { border-bottom: 3px solid #1B4332; margin-bottom: 10px; padding-bottom: 8px; }
        .page-header table { width: 100%; border-collapse: collapse; }
        .page-header .logo-cell { width: 70px; text-align: center; vertical-align: middle; }
        .page-header .logo-emblem { width: 52px; height: 52px; border-radius: 50%; background: #1B4332; color: #fff; text-align: center; line-height: 52px; font-size: 22px; font-weight: bold; display: inline-block; }
        .page-header .title-cell { vertical-align: middle; padding-left: 10px; }
        .page-header .inst { font-size: 8px; color: #4a5568; text-transform: uppercase; letter-spacing: 0.5px; }
        .page-header h1 { font-size: 14px; font-weight: bold; color: #1B4332; margin: 3px 0 2px; }
        .page-header h2 { font-size: 11px; color: #2d3748; }
        .page-header .meta-right { text-align: right; vertical-align: top; font-size: 8px; color: #718096; }

        .meta-band { background: #ECFDF5; border: 1px solid #A7F3D0; padding: 5px 8px; margin-bottom: 10px; font-size: 8px; color: #065F46; }
        .meta-band table { width: 100%; border-collapse: collapse; }
        .meta-band td { padding: 0 8px 0 0; }
        .meta-band strong { color: #1B4332; }
        .badge { background: #D1FAE5; color: #065F46; border: 1px solid #6EE7B7; padding: 1px 6px; border-radius: 3px; font-weight: bold; }

        .summary { width: 100%; margin-bottom: 10px; border-collapse: collapse; }
        .summary td { text-align: center; padding: 6px 4px; background: #D9D9D9; border: 1px solid #CCCCCC; }
        .summary .num { font-size: 16px; font-weight: bold; color: #1B4332; display: block; }
        .summary .lbl { font-size: 7px; color: #4a5568; text-transform: uppercase; letter-spacing: 0.3px; }
        .s-red  { background: #FFF5F5; } .s-red  .num { color: #C53030; }
        .s-orange { background: #FFFAF0; } .s-orange .num { color: #C05621; }
        .s-blue { background: #EBF8FF; } .s-blue  .num { color: #2B6CB0; }

        .section-title { background: #1B4332; color: #fff; padding: 4px 8px; font-size: 10px; font-weight: bold; margin: 10px 0 0; }
        .section-sub   { background: #2D6A4F; color: #fff; padding: 3px 8px; font-size: 9px; font-weight: bold; margin: 0 0 4px; }

        table.data { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
        table.data thead th { background: #2D6A4F; color: #fff; padding: 5px 4px; text-align: left; font-size: 8px; border: 1px solid #1B4332; }
        table.data tbody td { padding: 4px; border: 1px solid #D1FAE5; font-size: 8px; vertical-align: top; }
        table.data tbody tr:nth-child(odd) td  { background: #FFFF00; }
        table.data tbody tr:nth-child(even) td { background: #FFFFFF; }
        table.data tfoot td { background: #C6F6D5; color: #1B4332; font-weight: bold; font-size: 9px; padding: 5px 4px; border: 1px solid #A7F3D0; }

        table.stat { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
        table.stat thead th { background: #1B4332; color: #fff; padding: 4px 5px; text-align: center; font-size: 8px; border: 1px solid #1B4332; }
        table.stat tbody td { padding: 3px 5px; border: 1px solid #D1FAE5; font-size: 8px; text-align: center; }
        table.stat tbody tr:nth-child(odd) td  { background: #FFFF00; }
        table.stat tbody tr:nth-child(even) td { background: #FFFFFF; }
        table.stat tbody td:first-child { text-align: left; }
        table.stat tfoot td { background: #C6F6D5; color: #1B4332; font-weight: bold; font-size: 8px; padding: 4px 5px; border: 1px solid #A7F3D0; }

        .footer { margin-top: 14px; border-top: 1px solid #D1FAE5; padding-top: 5px; text-align: center; font-size: 7.5px; color: #a0aec0; }
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
        $total    = $records->count();
        $mortels  = $records->where('type', 'mortel')->count();
        $corpor   = $records->where('type', 'corporel')->count();
        $materiel = $records->where('type', 'matériel')->count();
        $victTot  = $records->sum(fn($a) => $a->victimes->count());
        $tues     = $records->sum(fn($a) => $a->victimes->where('statut_deces', true)->count());
        $bGraves  = $records->sum(fn($a) => $a->victimes->filter(fn($v) => !$v->statut_deces && in_array(mb_strtolower($v->gravite_blessures ?? ''), ['grave','graves','sérieux','serieux']))->count());
    @endphp

    <div class="meta-band">
        <table><tr>
            <td><strong>Période :</strong> <span class="badge">{{ $period_label }}</span></td>
            <td><strong>Total accidents :</strong> {{ $total }}</td>
            <td><strong>Total victimes :</strong> {{ $victTot }}</td>
            <td><strong>Tués :</strong> {{ $tues }}</td>
            <td><strong>Blessés graves :</strong> {{ $bGraves }}</td>
        </tr></table>
    </div>

    <table class="summary">
        <tr>
            <td class="s-red"><span class="num">{{ $mortels }}</span><span class="lbl">Accidents mortels</span></td>
            <td class="s-orange"><span class="num">{{ $corpor }}</span><span class="lbl">Accidents corporels</span></td>
            <td><span class="num">{{ $materiel }}</span><span class="lbl">Accidents matériels</span></td>
            <td class="s-red"><span class="num">{{ $tues }}</span><span class="lbl">Tués</span></td>
            <td class="s-orange"><span class="num">{{ $bGraves }}</span><span class="lbl">Blessés graves</span></td>
            <td class="s-blue"><span class="num">{{ $victTot }}</span><span class="lbl">Total victimes</span></td>
        </tr>
    </table>

    {{-- Blocs statistiques côte à côte --}}
    <table class="two-col">
      <tr>
        <td>
          <div class="section-sub">RÉPARTITION PAR TYPE</div>
          <table class="stat">
            <thead><tr><th>Type</th><th>Nb accidents</th><th>Tués</th><th>Victimes</th></tr></thead>
            <tbody>
              @foreach($records->groupBy('type') as $type => $items)
              <tr>
                <td>{{ ucfirst($type ?: 'Autre') }}</td>
                <td>{{ $items->count() }}</td>
                <td>{{ $items->sum(fn($a) => $a->victimes->where('statut_deces', true)->count()) }}</td>
                <td>{{ $items->sum(fn($a) => $a->victimes->count()) }}</td>
              </tr>
              @endforeach
            </tbody>
            <tfoot><tr><td>TOTAL</td><td>{{ $total }}</td><td>{{ $tues }}</td><td>{{ $victTot }}</td></tr></tfoot>
          </table>
        </td>
        <td>
          <div class="section-sub">RÉPARTITION PAR CAUSE PROBABLE</div>
          <table class="stat">
            <thead><tr><th>Cause</th><th>Nb</th><th>%</th></tr></thead>
            <tbody>
              @foreach($records->groupBy('cause_probable')->take(8) as $cause => $items)
              <tr>
                <td>{{ ucfirst($cause ?: 'Non précisée') }}</td>
                <td>{{ $items->count() }}</td>
                <td>{{ $total > 0 ? round($items->count()/$total*100,1) : 0 }}%</td>
              </tr>
              @endforeach
            </tbody>
          </table>
        </td>
      </tr>
    </table>

    {{-- Répartition mensuelle --}}
    @php
        $moisLabels = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
        $byMois = [];
        for ($m = 1; $m <= 12; $m++) {
            $n = $records->filter(fn($a) => $a->date && $a->date->month === $m)->count();
            if ($n > 0) $byMois[$moisLabels[$m-1]] = $n;
        }
    @endphp
    @if(!empty($byMois))
    <div class="section-sub">RÉPARTITION MENSUELLE</div>
    <table class="stat">
        <thead><tr>
            @foreach($byMois as $mois => $n)
            <th>{{ $mois }}</th>
            @endforeach
        </tr></thead>
        <tbody><tr>
            @foreach($byMois as $mois => $n)
            <td>{{ $n }}</td>
            @endforeach
        </tr></tbody>
    </table>
    @endif

    <div class="section-title">DÉTAIL DES ACCIDENTS ({{ $total }})</div>
    @if($records->isEmpty())
        <p class="empty">Aucun accident trouvé pour les critères sélectionnés.</p>
    @else
    <table class="data">
        <thead><tr>
            <th width="3%">#</th><th width="8%">Date</th><th width="6%">Heure</th>
            <th width="7%">Type</th><th width="13%">Lieu</th><th width="10%">Commune</th>
            <th width="10%">Service</th><th width="9%">Moyen</th>
            <th width="14%">Cause probable</th><th width="6%">Victimes</th><th width="14%">Description</th>
        </tr></thead>
        <tbody>
            @foreach($records as $i => $a)
            <tr>
                <td style="text-align:center">{{ $i + 1 }}</td>
                <td>{{ $a->date?->format('d/m/Y') ?? '-' }}</td>
                <td>{{ $a->heure ?? '-' }}</td>
                <td>{{ $a->type ?? '-' }}</td>
                <td>{{ $a->lieu ?? '-' }}</td>
                <td>{{ $a->commune->nom ?? '-' }}</td>
                <td>{{ $a->service->nom ?? '-' }}</td>
                <td>{{ $a->moyen ?? '-' }}</td>
                <td>{{ $a->cause_probable ?? '-' }}</td>
                <td style="text-align:center;font-weight:bold">{{ $a->victimes->count() }}</td>
                <td>{{ \Illuminate\Support\Str::limit($a->description ?? '-', 40) }}</td>
            </tr>
            @endforeach
        </tbody>
        <tfoot><tr>
            <td colspan="9" style="text-align:right">TOTAUX</td>
            <td style="text-align:center">{{ $victTot }}</td>
            <td></td>
        </tr></tfoot>
    </table>
    @endif

    <div class="footer">
        <p>Teranga GESCRIM — Rapport confidentiel — Direction de la Sécurité Publique — Sénégal</p>
        <p>Généré le {{ $date_generation }} — Accès réservé au personnel autorisé</p>
    </div>
</body>
</html>
