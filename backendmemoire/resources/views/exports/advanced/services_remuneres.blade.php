<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>{{ $titre }}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: DejaVu Sans, sans-serif; font-size: 9px; color: #1a202c; }

        /* ── En-tête institutionnel ── */
        .page-header { border-bottom: 3px solid #1B4332; margin-bottom: 10px; padding-bottom: 8px; }
        .page-header table { width: 100%; border-collapse: collapse; }
        .page-header .logo-cell { width: 70px; text-align: center; vertical-align: middle; }
        .page-header .logo-emblem {
            width: 52px; height: 52px; border-radius: 50%;
            background: #1B4332; color: #fff;
            text-align: center; line-height: 52px;
            font-size: 22px; font-weight: bold; display: inline-block;
        }
        .page-header .title-cell { vertical-align: middle; padding-left: 10px; }
        .page-header .inst { font-size: 8px; color: #4a5568; text-transform: uppercase; letter-spacing: 0.5px; }
        .page-header h1 { font-size: 14px; font-weight: bold; color: #1B4332; margin: 3px 0 2px; }
        .page-header h2 { font-size: 11px; color: #2d3748; }
        .page-header .meta-right { text-align: right; vertical-align: top; font-size: 8px; color: #718096; }

        /* ── Bandeau méta ── */
        .meta-band {
            background: #ECFDF5; border: 1px solid #A7F3D0;
            padding: 5px 8px; margin-bottom: 10px;
            font-size: 8px; color: #065F46;
        }
        .meta-band table { width: 100%; border-collapse: collapse; }
        .meta-band td { padding: 0 8px 0 0; }
        .meta-band strong { color: #1B4332; }
        .badge { background: #D1FAE5; color: #065F46; border: 1px solid #6EE7B7; padding: 1px 6px; border-radius: 3px; font-weight: bold; }

        /* ── Cartes synthèse ── */
        .summary { width: 100%; margin-bottom: 10px; border-collapse: collapse; }
        .summary td { text-align: center; padding: 6px 4px; background: #D9D9D9; border: 1px solid #CCCCCC; }
        .summary .num { font-size: 16px; font-weight: bold; color: #1B4332; display: block; }
        .summary .lbl { font-size: 7px; color: #4a5568; text-transform: uppercase; letter-spacing: 0.3px; }

        /* ── Titres de section ── */
        .section-title {
            background: #1B4332; color: #fff;
            padding: 4px 8px; font-size: 10px; font-weight: bold;
            margin: 10px 0 4px; letter-spacing: 0.3px;
        }

        /* ── Tableaux de données ── */
        table.data { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
        table.data thead th {
            background: #2D6A4F; color: #fff;
            padding: 5px 4px; text-align: left; font-size: 8px;
            border: 1px solid #1B4332;
        }
        table.data tbody td {
            padding: 4px; border: 1px solid #D1FAE5;
            font-size: 8px; vertical-align: top;
        }
        table.data tbody tr:nth-child(even) td { background: #FFFF00; }
        table.data tfoot td {
            background: #C6F6D5; color: #1B4332;
            font-weight: bold; font-size: 9px;
            padding: 5px 4px; border: 1px solid #A7F3D0;
        }

        /* ── Pied de page ── */
        .footer {
            margin-top: 14px; border-top: 1px solid #D1FAE5;
            padding-top: 5px; text-align: center;
            font-size: 7.5px; color: #a0aec0;
        }
        .empty { text-align: center; color: #a0aec0; padding: 20px; font-style: italic; }
    </style>
</head>
<body>

    {{-- En-tête institutionnel --}}
    <div class="page-header">
        <table>
            <tr>
                <td class="logo-cell">
                    <div class="logo-emblem">DSP</div>
                </td>
                <td class="title-cell">
                    <div class="inst">République du Sénégal — Ministère de l'Intérieur</div>
                    <h1>TERANGA GESCRIM</h1>
                    <h2>{{ $titre }}</h2>
                </td>
                <td class="meta-right">
                    Généré le : {{ $date_generation }}<br>
                    Agent : <strong>{{ $agent }}</strong>
                </td>
            </tr>
        </table>
    </div>

    {{-- Calculs globaux --}}
    @php
        $total        = $records->count();
        $montantTotal = $records->sum('montant');
        $montantMoyen = $total > 0 ? $montantTotal / $total : 0;
        $servicesActifs = $records->pluck('service_id')->filter()->unique()->count();
    @endphp

    {{-- Bandeau méta --}}
    <div class="meta-band">
        <table>
            <tr>
                <td><strong>Période :</strong> <span class="badge">{{ $period_label }}</span></td>
                <td><strong>Total prestations :</strong> {{ $total }}</td>
                <td><strong>Montant total :</strong> {{ number_format($montantTotal, 0, ',', ' ') }} FCFA</td>
                <td><strong>Services actifs :</strong> {{ $servicesActifs }}</td>
            </tr>
        </table>
    </div>

    {{-- Cartes de synthèse --}}
    <table class="summary">
        <tr>
            <td>
                <span class="num">{{ $total }}</span>
                <span class="lbl">Total prestations</span>
            </td>
            <td>
                <span class="num">{{ number_format($montantTotal, 0, ',', ' ') }}</span>
                <span class="lbl">Montant total FCFA</span>
            </td>
            <td>
                <span class="num">{{ number_format($montantMoyen, 0, ',', ' ') }}</span>
                <span class="lbl">Montant moyen FCFA</span>
            </td>
            <td>
                <span class="num">{{ $servicesActifs }}</span>
                <span class="lbl">Services actifs</span>
            </td>
        </tr>
    </table>

    {{-- Bloc 1 — Top 10 par libellé --}}
    @php
        $byLibelle = $records->groupBy('libelle')
                             ->map(fn($g) => ['count' => $g->count(), 'montant' => $g->sum('montant')])
                             ->sortByDesc(fn($v) => $v['count'])
                             ->take(10);
    @endphp
    <div class="section-title">TOP 10 PAR TYPE DE PRESTATION</div>
    @if($byLibelle->isEmpty())
        <p class="empty">Aucune donnée disponible.</p>
    @else
    <table class="data">
        <thead>
            <tr>
                <th width="40%">Prestation</th>
                <th width="13%">Nb</th>
                <th width="27%">Montant FCFA</th>
                <th width="20%">%</th>
            </tr>
        </thead>
        <tbody>
            @foreach($byLibelle as $libelle => $row)
            <tr>
                <td>{{ $libelle ?? 'Non renseigné' }}</td>
                <td style="text-align:center">{{ $row['count'] }}</td>
                <td style="text-align:right">{{ number_format($row['montant'], 0, ',', ' ') }}</td>
                <td style="text-align:center">
                    @if($total > 0){{ number_format($row['count'] / $total * 100, 1) }}%@else—@endif
                </td>
            </tr>
            @endforeach
        </tbody>
        <tfoot>
            <tr>
                <td>TOTAL (top 10)</td>
                <td style="text-align:center">{{ collect($byLibelle)->sum('count') }}</td>
                <td style="text-align:right">{{ number_format(collect($byLibelle)->sum('montant'), 0, ',', ' ') }}</td>
                <td style="text-align:center">—</td>
            </tr>
        </tfoot>
    </table>
    @endif

    {{-- Bloc 2 — Par mois --}}
    @php
        $moisLabels = [
            '01' => 'Janvier',   '02' => 'Février',   '03' => 'Mars',
            '04' => 'Avril',     '05' => 'Mai',        '06' => 'Juin',
            '07' => 'Juillet',   '08' => 'Août',       '09' => 'Septembre',
            '10' => 'Octobre',   '11' => 'Novembre',   '12' => 'Décembre',
        ];
        $byMois = [];
        foreach ($moisLabels as $num => $label) {
            $subset = $records->filter(function($r) use ($num) {
                $d = $r->date;
                if (!$d) return false;
                $parsed = $d instanceof \Carbon\Carbon ? $d : \Carbon\Carbon::parse($d);
                return $parsed->format('m') === $num;
            });
            $byMois[$num] = ['label' => $label, 'count' => $subset->count(), 'montant' => $subset->sum('montant')];
        }
    @endphp
    <div class="section-title">RÉPARTITION PAR MOIS</div>
    <table class="data">
        <thead>
            <tr>
                <th width="40%">Mois</th>
                <th width="20%">Nb Prestations</th>
                <th width="40%">Montant FCFA</th>
            </tr>
        </thead>
        <tbody>
            @foreach($byMois as $num => $row)
            @if($row['count'] > 0)
            <tr>
                <td>{{ $row['label'] }}</td>
                <td style="text-align:center">{{ $row['count'] }}</td>
                <td style="text-align:right">{{ number_format($row['montant'], 0, ',', ' ') }}</td>
            </tr>
            @endif
            @endforeach
        </tbody>
        <tfoot>
            <tr>
                <td>TOTAL</td>
                <td style="text-align:center">{{ $total }}</td>
                <td style="text-align:right">{{ number_format($montantTotal, 0, ',', ' ') }}</td>
            </tr>
        </tfoot>
    </table>

    {{-- Tableau détaillé --}}
    <div class="section-title">LISTE DES PRESTATIONS ({{ $total }})</div>

    @if($records->isEmpty())
        <p class="empty">Aucune prestation trouvée pour les critères sélectionnés.</p>
    @else
    <table class="data">
        <thead>
            <tr>
                <th width="3%">#</th>
                <th width="9%">Date</th>
                <th width="18%">Libellé</th>
                <th width="16%">Service</th>
                <th width="13%">Commune</th>
                <th width="13%">Montant FCFA</th>
                <th width="28%">Description</th>
            </tr>
        </thead>
        <tbody>
            @php $totalMontant = 0; @endphp
            @foreach($records as $index => $sr)
            @php $totalMontant += (float)($sr->montant ?? 0); @endphp
            <tr>
                <td style="text-align:center">{{ $index + 1 }}</td>
                <td>
                    @php
                        $d = $sr->date;
                        if ($d instanceof \Carbon\Carbon) {
                            echo $d->format('d/m/Y');
                        } elseif ($d) {
                            echo \Carbon\Carbon::parse($d)->format('d/m/Y');
                        } else {
                            echo '-';
                        }
                    @endphp
                </td>
                <td>{{ $sr->libelle ?? '-' }}</td>
                <td>{{ $sr->service->nom ?? '-' }}</td>
                <td>{{ $sr->commune->nom ?? '-' }}</td>
                <td style="text-align:right">{{ number_format((float)($sr->montant ?? 0), 0, ',', ' ') }}</td>
                <td>{{ \Illuminate\Support\Str::limit($sr->description ?? '-', 40) }}</td>
            </tr>
            @endforeach
        </tbody>
        <tfoot>
            <tr>
                <td colspan="5" style="text-align:right">TOTAL MONTANT</td>
                <td style="text-align:right">{{ number_format($totalMontant, 0, ',', ' ') }} FCFA</td>
                <td style="text-align:center">{{ $total }} prestation(s)</td>
            </tr>
        </tfoot>
    </table>
    @endif

    <div class="footer">
        <p>Teranga GESCRIM — Rapport confidentiel — Direction de la Sécurité Publique — Sénégal</p>
        <p>Généré le {{ $date_generation }} — Accès réservé au personnel autorisé</p>
    </div>
</body>
</html>
