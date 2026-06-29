<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PPEItem;
use App\Models\PPECategory;
use Illuminate\Http\Request;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Writer\Csv;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Alignment;

class PPEExportController extends Controller
{
    /**
     * Export PPE list with date filters
     * GET /api/ppe/export?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD&format=xlsx
     */
    public function export(Request $request)
    {
        try {
            $query = PPEItem::with(['category:id,name,code']);

            // ✅ Filter by date range (menggunakan created_at)
            if ($request->filled('start_date')) {
                $query->whereDate('created_at', '>=', $request->start_date);
            }
            if ($request->filled('end_date')) {
                $query->whereDate('created_at', '<=', $request->end_date);
            }

            // Filter lainnya (opsional, bisa ditambah dari frontend nanti)
            if ($request->filled('category_id')) {
                $query->where('category_id', $request->category_id);
            }
            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }
            if ($request->filled('condition')) {
                $query->where('condition', $request->condition);
            }

            $items = $query->orderBy('name')->get();
            $format = $request->format ?? 'xlsx';

            // Buat spreadsheet
            $spreadsheet = new Spreadsheet();
            $sheet = $spreadsheet->getActiveSheet();
            $sheet->setTitle('PPE List');

            // Title
            $sheet->mergeCells('A1:T1');
            $sheet->setCellValue('A1', 'PPE LIST REPORT');
            $sheet->getStyle('A1')->applyFromArray([
                'font' => ['bold' => true, 'size' => 16, 'color' => ['rgb' => '1976D2']],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            ]);

            // Filter info & Export date
            $row = 3;
            if ($request->filled('start_date') || $request->filled('end_date')) {
                $dateInfo = 'Period: ' . ($request->start_date ?? 'All') . ' to ' . ($request->end_date ?? 'All');
                $sheet->mergeCells("A{$row}:T{$row}");
                $sheet->setCellValue("A{$row}", $dateInfo);
                $sheet->getStyle("A{$row}")->getFont()->setItalic(true)->setSize(10);
                $row++;
            }

            $sheet->mergeCells("A{$row}:T{$row}");
            $sheet->setCellValue("A{$row}", 'Exported: ' . now()->format('d M Y H:i:s') . ' | Total: ' . $items->count() . ' items');
            $sheet->getStyle("A{$row}")->getFont()->setSize(9)->setColor(new \PhpOffice\PhpSpreadsheet\Style\Color('666666'));
            $row += 2;

            // Headers
            $headers = [
                'No',
                'Name',
                'Code',
                'Category',
                'Size',
                'Color',
                'Material',
                'Manufacturer',
                'Model',
                'Serial Number',
                'Location',
                'Price',
                'Purchase Date',
                'Supplier',
                'Certification',
                'Certification Date',
                'Expiry Date',
                'Status',
                'Condition',
                'Description'
            ];

            $headerStyle = [
                'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF'], 'size' => 10],
                'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '1976D2']],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
                'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]],
            ];

            $col = 'A';
            foreach ($headers as $header) {
                $cell = $col . $row;
                $sheet->setCellValue($cell, $header);
                $sheet->getStyle($cell)->applyFromArray($headerStyle);
                $col++;
            }
            $sheet->getRowDimension($row)->setRowHeight(25);

            // Data
            $row++;
            foreach ($items as $index => $item) {
                $col = 'A';
                $data = [
                    $index + 1,
                    $item->name,
                    $item->code,
                    $item->category->name ?? '-',
                    $item->size ?? '-',
                    $item->color ?? '-',
                    $item->material ?? '-',
                    $item->manufacturer ?? '-',
                    $item->model ?? '-',
                    $item->serial_number ?? '-',
                    $item->location ?? '-',
                    $item->price ? number_format($item->price, 0, ',', '.') : '-',
                    $item->purchase_date ? $item->purchase_date->format('d M Y') : '-',
                    $item->supplier ?? '-',
                    $item->certification ?? '-',
                    $item->certification_date ? $item->certification_date->format('d M Y') : '-',
                    $item->expiry_date ? $item->expiry_date->format('d M Y') : '-',
                    ucfirst($item->status),
                    ucfirst($item->condition),
                    $item->description ?? '-',
                ];

                foreach ($data as $value) {
                    $cell = $col . $row;
                    $sheet->setCellValue($cell, $value);
                    $sheet->getStyle($cell)->applyFromArray([
                        'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]],
                        'alignment' => ['vertical' => Alignment::VERTICAL_CENTER],
                    ]);

                    // Color status column (R)
                    if ($col === 'R') {
                        $statusColors = [
                            'available' => 'C6EFCE',
                            'assigned' => 'BDD7EE',
                            'maintenance' => 'FFEB9C',
                            'write_off' => 'FFC7CE'
                        ];
                        $color = $statusColors[$item->status] ?? 'FFFFFF';
                        $sheet->getStyle($cell)->getFill()
                            ->setFillType(Fill::FILL_SOLID)
                            ->setStartColor(new \PhpOffice\PhpSpreadsheet\Style\Color($color));
                    }

                    // Color condition column (S)
                    if ($col === 'S') {
                        $conditionColors = [
                            'good' => 'C6EFCE',
                            'fair' => 'FFEB9C',
                            'poor' => 'FFC7CE',
                            'damaged' => 'FFC7CE',
                            'expired' => 'D9D9D9'
                        ];
                        $color = $conditionColors[$item->condition] ?? 'FFFFFF';
                        $sheet->getStyle($cell)->getFill()
                            ->setFillType(Fill::FILL_SOLID)
                            ->setStartColor(new \PhpOffice\PhpSpreadsheet\Style\Color($color));
                    }
                    $col++;
                }
                $sheet->getRowDimension($row)->setRowHeight(18);
                $row++;
            }

            // Auto-size columns
            foreach (range('A', 'T') as $col) {
                $sheet->getColumnDimension($col)->setAutoSize(true);
            }

            // Freeze header
            $sheet->freezePane('A' . ($row - count($items)));

            // Save to temp
            $tempDir = storage_path('app/temp');
            if (!is_dir($tempDir)) {
                mkdir($tempDir, 0755, true);
            }

            $fileName = 'PPE_Export_' . now()->format('Ymd_His') . '.' . $format;

            if ($format === 'csv') {
                $filePath = $tempDir . '/' . $fileName;
                $writer = new Csv($spreadsheet);
                $writer->save($filePath);
                $contentType = 'text/csv';
            } else {
                $filePath = $tempDir . '/' . $fileName;
                $writer = new Xlsx($spreadsheet);
                $writer->save($filePath);
                $contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            }

            return response()->download($filePath, $fileName, [
                'Content-Type' => $contentType,
            ])->deleteFileAfterSend(true);
        } catch (\Exception $e) {
            \Log::error('PPE Export error: ' . $e->getMessage());
            \Log::error($e->getTraceAsString());
            return response()->json([
                'status' => 'error',
                'message' => 'Export failed: ' . $e->getMessage(),
            ], 500);
        }
    }
}
