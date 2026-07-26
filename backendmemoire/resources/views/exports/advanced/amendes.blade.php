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
        .summary .lbl { font-size: 7px; color: #4a5568; text-transform: uppercase; }

        .section-title { background: #1B4332; color: #fff; padding: 4px 8px; font-size: 10px; font-weight: bold; margin: 10px 0 0; }
        .section-sub   { background: #2D6A4F; color: #fff; padding: 3px 8px; font-size: 9px; font-weight: bold; margin: 0 0 4px; }

        table.data { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
        table.data thead th { background: #2D6A4F; color: #fff; padding: 5px 4px; text-align: left; font-size: 8px; border: 1px solid #1B4332; }
        table.data tbody td { padding: 4px; border: 1px solid #D1FAE5; font-size: 8px; vertical-align: middle; }
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
                <div class="inst">République du Sénégal — Direction de la Sécurité Publique</div>
                <h1>TERANGA GESCRIM</h1>
                <h2>{{ $titre }}</h2>
            </td>
            <td class="meta-right">Généré le : {{ $date_generation }}<br>Agent : <strong>{{ $agent }}</strong></td>
        </tr></table>
    </div>

    @php
        $total   = $records->count();
        $montant = (int) $records->sum('montant');
        $amendes = $records->where('type', 'Amende')->count();
        $saisies = $records->where('type', 'Pièce saisie')->count();
        $moisLabels = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
    @endphp

    <div class="meta-band">
        <table><tr>
            <td><strong>Période :</strong> <span class="badge">{{ $period_label }}</span></td>
            <td><strong>Total dossiers :</strong> {{ $total }}</td>
            <td><strong>Montant total :</strong> {{ number_format($montant, 0, ',', ' ') }} FCFA</td>
            <td><strong>Amendes :</strong> {{ $amendes }}</td>
            <td><strong>Pièces saisies :</strong> {{ $saisies }}</td>
        </tr></table>
    </div>

    <table class="summary">
        <tr>
            <td><span class="num">{{ $total }}</span><span class="lbl">Total dossiers</span></td>
            <td><span class="num">{{ number_format($montant, 0, ',', ' ') }}</span><span class="lbl">Montant FCFA</span></td>
            <td><span class="num">{{ $amendes }}</span><span class="lbl">Amendes</span></td>
            <td><span class="num">{{ $saisies }}</span><span class="lbl">Pièces saisies</span></td>
            <td><span class="num">{{ $total > 0 ? number_format((int)($montant/$total), 0, ',', ' ') : 0 }}</span><span class="lbl">Montant moyen</span></td>
        </tr>
    </table>

    <table class="two-col">
      <tr>
        <td>
          <div class="section-sub">RÉPARTITION PAR TYPE</div>
          <table class="stat">
            <thead><tr><th>Type</th><th>Nb</th><th>Montant (FCFA)</th><th>%</th></tr></thead>
            <tbody>
              @foreach($records->groupBy('type') as $type => $items)
              <tr>
                <td>{{ $type ?: 'Autre' }}</td>
                <td>{{ $items->count() }}</td>
                <td style="text-align:right">{{ number_format((int)$items->sum('montant'), 0, ',', ' ') }}</td>
                <td>{{ $total > 0 ? round($items->count()/$total*100,1) : 0 }}%</td>
              </tr>
              @endforeach
            </tbody>
            <tfoot><tr><td>TOTAL</td><td>{{ $total }}</td><td style="text-align:right">{{ number_format($montant, 0, ',', ' ') }}</td><td>100%</td></tr></tfoot>
          </table>
        </td>
        <td>
          <div class="section-sub">RÉPARTITION MENSUELLE</div>
          <table class="stat">
            <thead><tr><th>Mois</th><th>Nb</th><th>Montant (FCFA)</th></tr></thead>
            <tbody>
              @for ($m = 1; $m <= 12; $m++)
                @php $sub = $records->filter(fn($r) => $r->date && $r->date->month === $m); @endphp
                @if($sub->isNotEmpty())
                <tr>
                  <td>{{ $moisLabels[$m-1] }}</td>
                  <td>{{ $sub->count() }}</td>
                  <td style="text-align:right">{{ number_format((int)$sub->sum('montant'), 0, ',', ' ') }}</td>
                </tr>
                @endif
              @endfor
            </tbody>
            <tfoot><tr><td>TOTAL</td><td>{{ $total }}</td><td style="text-align:right">{{ number_format($montant, 0, ',', ' ') }}</td></tr></tfoot>
          </table>
        </td>
      </tr>
    </table>

    <div class="section-title">DÉTAIL DES AMENDES ET PIÈCES SAISIES ({{ $total }})</div>
    @if($records->isEmpty())
        <p class="empty">Aucun enregistrement trouvé pour les critères sélectionnés.</p>
    @else
    <table class="data">
        <thead><tr>
            <th width="3%">#</th><th width="8%">Date</th><th width="10%">Type</th>
            <th width="15%">Service</th><th width="10%">Commune</th>
            <th width="10%">Montant (FCFA)</th><th width="10%">Plaque</th><th width="34%">Description</th>
        </tr></thead>
        <tbody>
            @foreach($records as $i => $r)
            <tr>
                <td style="text-align:center">{{ $i + 1 }}</td>
                <td>{{ $r->date?->format('d/m/Y') ?? '-' }}</td>
                <td>{{ $r->type ?? '-' }}</td>
                <td>{{ $r->service->nom ?? '-' }}</td>
                <td>{{ $r->commune->nom ?? '-' }}</td>
                <td style="text-align:right;font-weight:bold">{{ number_format((int)($r->montant ?? 0), 0, ',', ' ') }}</td>
                <td>{{ $r->plaque_immatriculation ?? '-' }}</td>
                <td>{{ \Illuminate\Support\Str::limit($r->description ?? '-', 60) }}</td>
            </tr>
            @endforeach
        </tbody>
        <tfoot><tr>
            <td colspan="5" style="text-align:right">TOTAL</td>
            <td style="text-align:right">{{ number_format($montant, 0, ',', ' ') }}</td>
            <td colspan="2"></td>
        </tr></tfoot>
    </table>
    @endif

    <div class="footer">
        <p>Teranga GESCRIM — Rapport confidentiel — Direction de la Sécurité Publique — Sénégal</p>
        <p>Généré le {{ $date_generation }} — Accès réservé au personnel autorisé</p>
    </div>
</body>
</html>
