<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PPEItem;
use Illuminate\Http\Request;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Color;

class PPEExportController extends Controller
{
    public function export(Request $request)
    {
        try {
            // Build query
            $query = PPEItem::with(['category:id,name,code']);

            // Filter by date range (purchase_date)
            if ($request->filled('start_date')) {
                $query->whereDate('purchase_date', '>=', $request->start_date);
            }
            if ($request->filled('end_date')) {
                $query->whereDate('purchase_date', '<=', $request->end_date);
            }

            // Filter by created_at if purchase_date not set
            if (!$request->filled('start_date') && !$request->filled('end_date')) {
                if ($request->filled('created_from')) {
                    $query->whereDate('created_at', '>=', $request->created_from);
                }
                if ($request->filled('created_to')) {
                    $query->whereDate('created_at', '<=', $request->created_to);
                }
            }

            // Additional filters
            if ($request->filled('category_id')) {
                $query->where('category_id', $request->category_id);
            }
            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }
            if ($request->filled('condition')) {
                $query->where('condition', $request->condition);
            }
            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('code', 'like', "%{$search}%")
                        ->orWhere('serial_number', 'like', "%{$search}%");
                });
            }

            $items = $query->orderBy('name')->get();

            // Create Spreadsheet
            $spreadsheet = new Spreadsheet();

            // ==========================================
            // SHEET 1: PPE Data
            // ==========================================
            $sheet = $spreadsheet->getActiveSheet();
            $sheet->setTitle('PPE Data');

            // Title
            $sheet->mergeCells('A1:S1');
            $sheet->setCellValue('A1', 'PPE LIST REPORT');
            $sheet->getStyle('A1')->applyFromArray([
                'font' => ['bold' => true, 'size' => 16, 'color' => ['rgb' => '1A73E8']],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            ]);
            $sheet->getRowDimension(1)->setRowHeight(30);

            // Filter Info
            $row = 3;
            $filters = [];
            if ($request->filled('start_date') || $request->filled('end_date')) {
                $filters[] = 'Period: ' . ($request->start_date ?? '...') . ' → ' . ($request->end_date ?? '...');
            }
            if ($request->filled('category_id')) {
                $cat = \App\Models\PPECategory::find($request->category_id);
                $filters[] = 'Category: ' . ($cat->name ?? 'N/A');
            }
            if ($request->filled('status')) {
                $filters[] = 'Status: ' . ucfirst($request->status);
            }
            if ($request->filled('condition')) {
                $filters[] = 'Condition: ' . ucfirst($request->condition);
            }
            if (!empty($filters)) {
                $sheet->mergeCells("A{$row}:S{$row}");
                $sheet->setCellValue("A{$row}", 'Filters: ' . implode(' | ', $filters));
                $sheet->getStyle("A{$row}")->getFont()->setItalic(true)->setSize(10)->setColor(new Color('666666'));
                $row++;
            }

            // Export Info
            $sheet->mergeCells("A{$row}:S{$row}");
            $sheet->setCellValue("A{$row}", 'Exported: ' . now()->format('d M Y H:i') . ' | Total Items: ' . $items->count());
            $sheet->getStyle("A{$row}")->getFont()->setSize(9)->setColor(new Color('999999'));
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
                'Description',
                'Status',
                'Condition',
                'Holder',
                'Expiry Date'
            ];

            $headerStyle = [
                'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF'], 'size' => 10],
                'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '1A73E8']],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
                'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'CCCCCC']]],
            ];

            $col = 'A';
            foreach ($headers as $header) {
                $cell = $col . $row;
                $sheet->setCellValue($cell, $header);
                $sheet->getStyle($cell)->applyFromArray($headerStyle);
                $col++;
            }
            $sheet->getRowDimension($row)->setRowHeight(22);

            // Freeze header
            $freezeCell = 'A' . ($row + 1);
            $sheet->freezePane($freezeCell);

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
                    $item->description ?? '-',
                    ucfirst($item->status),
                    ucfirst($item->condition),
                    $item->current_holder_name ?? '-',
                    $item->expiry_date ? $item->expiry_date->format('d M Y') : '-',
                ];

                foreach ($data as $value) {
                    $cell = $col . $row;
                    $sheet->setCellValue($cell, $value);

                    $cellStyle = [
                        'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'DDDDDD']]],
                        'alignment' => ['vertical' => Alignment::VERTICAL_CENTER],
                    ];

                    // Status column coloring (P = column 16)
                    if ($col === 'P') {
                        $colors = [
                            'available' => 'C6EFCE',
                            'assigned' => 'BDD7EE',
                            'maintenance' => 'FFEB9C',
                            'write_off' => 'FFC7CE'
                        ];
                        $bgColor = $colors[$item->status] ?? 'FFFFFF';
                        $cellStyle['fill'] = ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => $bgColor]];
                    }

                    // Condition column coloring (Q = column 17)
                    if ($col === 'Q') {
                        $colors = [
                            'good' => 'C6EFCE',
                            'fair' => 'FFEB9C',
                            'poor' => 'FFC7CE',
                            'damaged' => 'FFC7CE',
                            'expired' => 'D9D9D9'
                        ];
                        $bgColor = $colors[$item->condition] ?? 'FFFFFF';
                        $cellStyle['fill'] = ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => $bgColor]];
                    }

                    $sheet->getStyle($cell)->applyFromArray($cellStyle);
                    $col++;
                }
                $sheet->getRowDimension($row)->setRowHeight(18);
                $row++;
            }

            // Auto-size columns
            foreach (range('A', 'S') as $col) {
                $sheet->getColumnDimension($col)->setAutoSize(true);
            }

            // Max width for description
            $sheet->getColumnDimension('O')->setWidth(30);

            // ==========================================
            // SHEET 2: Summary
            // ==========================================
            $sheet2 = $spreadsheet->createSheet();
            $sheet2->setTitle('Summary');

            // Title
            $sheet2->mergeCells('A1:B1');
            $sheet2->setCellValue('A1', 'PPE SUMMARY');
            $sheet2->getStyle('A1')->applyFromArray([
                'font' => ['bold' => true, 'size' => 14, 'color' => ['rgb' => '1A73E8']],
            ]);

            $summaryData = [
                ['', ''],
                ['Total PPE Items', $items->count()],
                ['', ''],
                ['BY STATUS:', ''],
                ['Available', $items->where('status', 'available')->count()],
                ['Assigned', $items->where('status', 'assigned')->count()],
                ['Maintenance', $items->where('status', 'maintenance')->count()],
                ['Write-off', $items->where('status', 'write_off')->count()],
                ['', ''],
                ['BY CONDITION:', ''],
                ['Good', $items->where('condition', 'good')->count()],
                ['Fair', $items->where('condition', 'fair')->count()],
                ['Poor', $items->where('condition', 'poor')->count()],
                ['Damaged', $items->where('condition', 'damaged')->count()],
                ['Expired', $items->where('condition', 'expired')->count()],
                ['', ''],
                ['BY CATEGORY:', ''],
            ];

            $categories = $items->groupBy('category_id');
            foreach ($categories as $catId => $catItems) {
                $catName = $catItems->first()->category->name ?? 'Unknown';
                $summaryData[] = [$catName, count($catItems)];
            }

            $r = 3;
            foreach ($summaryData as $data) {
                $sheet2->setCellValue('A' . $r, $data[0]);
                $sheet2->setCellValue('B' . $r, $data[1]);

                // Bold for section headers
                if (!empty($data[0]) && empty($data[1])) {
                    $sheet2->getStyle('A' . $r)->getFont()->setBold(true)->setColor(new Color('1A73E8'));
                }

                // Bold for total
                if ($r === 3) {
                    $sheet2->getStyle('A' . $r . ':B' . $r)->getFont()->setBold(true)->setSize(12);
                }

                $r++;
            }

            $sheet2->getColumnDimension('A')->setWidth(30);
            $sheet2->getColumnDimension('B')->setWidth(15);

            // Back to first sheet
            $spreadsheet->setActiveSheetIndex(0);

            // Save to temp file
            $tempDir = storage_path('app/temp');
            if (!is_dir($tempDir)) {
                mkdir($tempDir, 0755, true);
            }

            $fileName = 'PPE_Export_' . now()->format('Ymd_His') . '.xlsx';
            $filePath = $tempDir . '/' . $fileName;

            $writer = new Xlsx($spreadsheet);
            $writer->save($filePath);

            return response()->download($filePath, $fileName, [
                'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Access-Control-Allow-Origin' => '*',
                'Access-Control-Expose-Headers' => 'Content-Disposition',
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
