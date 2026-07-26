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

    {{-- Bandeau méta --}}
    @php
        $total   = $records->count();
        $hommes  = $records->where('sexe', 'M')->count();
        $femmes  = $records->where('sexe', 'F')->count();
        $actifs  = $records->where('statut', 'actif')->count();
    @endphp
    <div class="meta-band">
        <table>
            <tr>
                <td><strong>Période :</strong> <span class="badge">{{ $period_label }}</span></td>
                <td><strong>Total agents :</strong> {{ $total }}</td>
                <td><strong>Hommes :</strong> {{ $hommes }}</td>
                <td><strong>Femmes :</strong> {{ $femmes }}</td>
                <td><strong>Actifs :</strong> {{ $actifs }}</td>
            </tr>
        </table>
    </div>

    {{-- Cartes de synthèse --}}
    <table class="summary">
        <tr>
            <td>
                <span class="num">{{ $total }}</span>
                <span class="lbl">Total agents</span>
            </td>
            <td>
                <span class="num">{{ $hommes }}</span>
                <span class="lbl">Hommes</span>
            </td>
            <td>
                <span class="num">{{ $femmes }}</span>
                <span class="lbl">Femmes</span>
            </td>
            <td>
                <span class="num">{{ $actifs }}</span>
                <span class="lbl">Actifs</span>
            </td>
        </tr>
    </table>

    {{-- Bloc 1 — Par grade --}}
    @php
        $byGrade = $records->groupBy('grade')->sortByDesc(fn($g) => $g->count());
    @endphp
    <div class="section-title">RÉPARTITION PAR GRADE</div>
    @if($byGrade->isEmpty())
        <p class="empty">Aucune donnée disponible.</p>
    @else
    <table class="data">
        <thead>
            <tr>
                <th width="35%">Grade</th>
                <th width="18%">Nb Agents</th>
                <th width="15%">Hommes</th>
                <th width="15%">Femmes</th>
                <th width="17%">%</th>
            </tr>
        </thead>
        <tbody>
            @foreach($byGrade as $grade => $gradeRecords)
            <tr>
                <td>{{ $grade ?? 'Non renseigné' }}</td>
                <td style="text-align:center">{{ $gradeRecords->count() }}</td>
                <td style="text-align:center">{{ $gradeRecords->where('sexe', 'M')->count() }}</td>
                <td style="text-align:center">{{ $gradeRecords->where('sexe', 'F')->count() }}</td>
                <td style="text-align:center">
                    @if($total > 0){{ number_format($gradeRecords->count() / $total * 100, 1) }}%@else—@endif
                </td>
            </tr>
            @endforeach
        </tbody>
        <tfoot>
            <tr>
                <td>TOTAL</td>
                <td style="text-align:center">{{ $total }}</td>
                <td style="text-align:center">{{ $hommes }}</td>
                <td style="text-align:center">{{ $femmes }}</td>
                <td style="text-align:center">100 %</td>
            </tr>
        </tfoot>
    </table>
    @endif

    {{-- Bloc 2 — Par statut --}}
    @php
        $byStatut = $records->groupBy('statut')->sortByDesc(fn($s) => $s->count());
        $statutLabels = [
            'actif'    => 'Actif',
            'inactif'  => 'Inactif',
            'suspendu' => 'Suspendu',
            'retraite' => 'Retraité',
        ];
    @endphp
    <div class="section-title">RÉPARTITION PAR STATUT</div>
    @if($byStatut->isEmpty())
        <p class="empty">Aucune donnée disponible.</p>
    @else
    <table class="data">
        <thead>
            <tr>
                <th width="55%">Statut</th>
                <th width="25%">Nb Agents</th>
                <th width="20%">%</th>
            </tr>
        </thead>
        <tbody>
            @foreach($byStatut as $statut => $statutRecords)
            <tr>
                <td>{{ $statutLabels[$statut] ?? ucfirst($statut) }}</td>
                <td style="text-align:center">{{ $statutRecords->count() }}</td>
                <td style="text-align:center">
                    @if($total > 0){{ number_format($statutRecords->count() / $total * 100, 1) }}%@else—@endif
                </td>
            </tr>
            @endforeach
        </tbody>
        <tfoot>
            <tr>
                <td>TOTAL</td>
                <td style="text-align:center">{{ $total }}</td>
                <td style="text-align:center">100 %</td>
            </tr>
        </tfoot>
    </table>
    @endif

    {{-- Tableau détaillé --}}
    <div class="section-title">LISTE DU PERSONNEL ({{ $total }})</div>

    @if($records->isEmpty())
        <p class="empty">Aucun agent trouvé pour les critères sélectionnés.</p>
    @else
    <table class="data">
        <thead>
            <tr>
                <th width="3%">#</th>
                <th width="10%">CCAP</th>
                <th width="18%">Nom &amp; Prénom</th>
                <th width="13%">Grade</th>
                <th width="5%">Sexe</th>
                <th width="10%">Statut</th>
                <th width="20%">Service</th>
                <th width="21%">Date entrée corps</th>
            </tr>
        </thead>
        <tbody>
            @foreach($records as $index => $p)
            <tr>
                <td style="text-align:center">{{ $index + 1 }}</td>
                <td>{{ $p->ccap ?? '-' }}</td>
                <td>{{ trim(($p->nom ?? '') . ' ' . ($p->prenom ?? '')) ?: '-' }}</td>
                <td>{{ $p->grade ?? '-' }}</td>
                <td style="text-align:center">{{ $p->sexe ?? '-' }}</td>
                <td>{{ $statutLabels[$p->statut] ?? ucfirst($p->statut ?? '-') }}</td>
                <td>{{ $p->service->nom ?? '-' }}</td>
                <td>{{ $p->date_entree_corps ? \Carbon\Carbon::parse($p->date_entree_corps)->format('d/m/Y') : '-' }}</td>
            </tr>
            @endforeach
        </tbody>
        <tfoot>
            <tr>
                <td colspan="7" style="text-align:right">TOTAL : {{ $total }} agent(s)</td>
                <td style="text-align:center">—</td>
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
