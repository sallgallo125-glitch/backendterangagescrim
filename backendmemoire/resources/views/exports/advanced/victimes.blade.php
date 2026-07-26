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
        $total   = $records->count();
        $deces   = $records->where('statut_deces', true)->count();
        $graves  = $records->filter(fn($v) => !$v->statut_deces && in_array(mb_strtolower($v->gravite_blessures ?? ''), ['grave','graves','sérieux','serieux']))->count();
        $legers  = $records->filter(fn($v) => !$v->statut_deces && in_array(mb_strtolower($v->gravite_blessures ?? ''), ['léger','leger','légers','legers','mineur','mineurs']))->count();
        $indem   = $records->filter(fn($v) => !$v->statut_deces && !$v->gravite_blessures)->count();
        $blesses = $graves + $legers;
        $hommes  = $records->where('sexe', 'M')->count();
        $femmes  = $records->where('sexe', 'F')->count();
        $sexeNd  = $records->whereNotIn('sexe', ['M','F'])->count();
    @endphp

    {{-- Bandeau méta --}}
    <div class="meta-band">
        <table>
            <tr>
                <td><strong>Période :</strong> <span class="badge">{{ $period_label }}</span></td>
                <td><strong>Total victimes :</strong> {{ $total }}</td>
                <td><strong>Décédées :</strong> {{ $deces }}</td>
                <td><strong>Blessées :</strong> {{ $blesses }}</td>
                <td><strong>Indemnes :</strong> {{ $indem }}</td>
            </tr>
        </table>
    </div>

    {{-- Cartes de synthèse --}}
    <table class="summary">
        <tr>
            <td>
                <span class="num">{{ $total }}</span>
                <span class="lbl">Total victimes</span>
            </td>
            <td>
                <span class="num">{{ $deces }}</span>
                <span class="lbl">Décédées</span>
            </td>
            <td>
                <span class="num">{{ $blesses }}</span>
                <span class="lbl">Blessées</span>
            </td>
            <td>
                <span class="num">{{ $indem }}</span>
                <span class="lbl">Indemnes</span>
            </td>
        </tr>
    </table>

    {{-- Bloc 1 — Par gravité --}}
    <div class="section-title">RÉPARTITION PAR GRAVITÉ</div>
    <table class="data">
        <thead>
            <tr>
                <th width="50%">Gravité</th>
                <th width="30%">Nb Victimes</th>
                <th width="20%">%</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>Décédé(e)</td>
                <td style="text-align:center">{{ $deces }}</td>
                <td style="text-align:center">@if($total > 0){{ number_format($deces / $total * 100, 1) }}%@else—@endif</td>
            </tr>
            <tr>
                <td>Blessure grave</td>
                <td style="text-align:center">{{ $graves }}</td>
                <td style="text-align:center">@if($total > 0){{ number_format($graves / $total * 100, 1) }}%@else—@endif</td>
            </tr>
            <tr>
                <td>Blessure légère</td>
                <td style="text-align:center">{{ $legers }}</td>
                <td style="text-align:center">@if($total > 0){{ number_format($legers / $total * 100, 1) }}%@else—@endif</td>
            </tr>
            <tr>
                <td>Indemne</td>
                <td style="text-align:center">{{ $indem }}</td>
                <td style="text-align:center">@if($total > 0){{ number_format($indem / $total * 100, 1) }}%@else—@endif</td>
            </tr>
        </tbody>
        <tfoot>
            <tr>
                <td>TOTAL</td>
                <td style="text-align:center">{{ $total }}</td>
                <td style="text-align:center">100 %</td>
            </tr>
        </tfoot>
    </table>

    {{-- Bloc 2 — Par sexe --}}
    <div class="section-title">RÉPARTITION PAR SEXE</div>
    <table class="data">
        <thead>
            <tr>
                <th width="50%">Sexe</th>
                <th width="30%">Nb Victimes</th>
                <th width="20%">%</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>Masculin</td>
                <td style="text-align:center">{{ $hommes }}</td>
                <td style="text-align:center">@if($total > 0){{ number_format($hommes / $total * 100, 1) }}%@else—@endif</td>
            </tr>
            <tr>
                <td>Féminin</td>
                <td style="text-align:center">{{ $femmes }}</td>
                <td style="text-align:center">@if($total > 0){{ number_format($femmes / $total * 100, 1) }}%@else—@endif</td>
            </tr>
            <tr>
                <td>Non précisé</td>
                <td style="text-align:center">{{ $sexeNd }}</td>
                <td style="text-align:center">@if($total > 0){{ number_format($sexeNd / $total * 100, 1) }}%@else—@endif</td>
            </tr>
        </tbody>
        <tfoot>
            <tr>
                <td>TOTAL</td>
                <td style="text-align:center">{{ $total }}</td>
                <td style="text-align:center">100 %</td>
            </tr>
        </tfoot>
    </table>

    {{-- Bloc 3 — Top 10 nationalités --}}
    @php
        $byNat = $records->groupBy(fn($v) => $v->nationalite ?? 'Non renseignée')
                         ->map(fn($g) => $g->count())
                         ->sortDesc()
                         ->take(10);
    @endphp
    <div class="section-title">TOP 10 NATIONALITÉS</div>
    @if($byNat->isEmpty())
        <p class="empty">Aucune donnée disponible.</p>
    @else
    <table class="data">
        <thead>
            <tr>
                <th width="55%">Nationalité</th>
                <th width="25%">Nb Victimes</th>
                <th width="20%">%</th>
            </tr>
        </thead>
        <tbody>
            @foreach($byNat as $nat => $count)
            <tr>
                <td>{{ $nat }}</td>
                <td style="text-align:center">{{ $count }}</td>
                <td style="text-align:center">@if($total > 0){{ number_format($count / $total * 100, 1) }}%@else—@endif</td>
            </tr>
            @endforeach
        </tbody>
        <tfoot>
            <tr>
                <td>TOTAL (top 10)</td>
                <td style="text-align:center">{{ $byNat->sum() }}</td>
                <td style="text-align:center">—</td>
            </tr>
        </tfoot>
    </table>
    @endif

    {{-- Tableau détaillé --}}
    <div class="section-title">LISTE DES VICTIMES ({{ $total }})</div>

    @if($records->isEmpty())
        <p class="empty">Aucune victime trouvée pour les critères sélectionnés.</p>
    @else
    <table class="data">
        <thead>
            <tr>
                <th width="3%">#</th>
                <th width="18%">Nom &amp; Prénom</th>
                <th width="5%">Sexe</th>
                <th width="5%">Âge</th>
                <th width="13%">Nationalité</th>
                <th width="16%">Gravité blessures</th>
                <th width="8%">Décédé</th>
                <th width="32%">Lié à</th>
            </tr>
        </thead>
        <tbody>
            @foreach($records as $index => $v)
            <tr>
                <td style="text-align:center">{{ $index + 1 }}</td>
                <td>{{ trim(($v->nom ?? '') . ' ' . ($v->prenom ?? '')) ?: '-' }}</td>
                <td style="text-align:center">{{ $v->sexe ?? '-' }}</td>
                <td style="text-align:center">{{ $v->age ?? '-' }}</td>
                <td>{{ $v->nationalite ?? '-' }}</td>
                <td>{{ $v->gravite_blessures ?? 'Indemne' }}</td>
                <td style="text-align:center">{{ $v->statut_deces ? 'Oui' : 'Non' }}</td>
                <td>
                    @if($v->infraction_id)
                        Infraction #{{ $v->infraction_id }}
                    @elseif($v->accident_id)
                        Accident #{{ $v->accident_id }}
                    @else
                        —
                    @endif
                </td>
            </tr>
            @endforeach
        </tbody>
        <tfoot>
            <tr>
                <td colspan="6" style="text-align:right">TOTAL</td>
                <td style="text-align:center">{{ $deces }} décès</td>
                <td style="text-align:center">{{ $total }} victime(s)</td>
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
