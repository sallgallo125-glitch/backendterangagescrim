<?php

namespace App\Services\Export;

use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Database\Eloquent\Collection;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PDFExportService
{
    public function generate(
        string $view,
        array  $data,
        string $filename
    ): \Illuminate\Http\Response {
        $fontDir = storage_path('fonts');
        if (!is_dir($fontDir)) {
            @mkdir($fontDir, 0775, true);
        }

        $pdf = Pdf::loadView($view, $data)
            ->setPaper('a4', 'landscape');

        return $pdf->download($filename . '_' . now()->format('Y-m-d') . '.pdf');
    }
}
