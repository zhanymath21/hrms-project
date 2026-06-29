<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PPEItem;
use App\Models\PPECategory;
use Illuminate\Http\Request;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Alignment;

class PPEExportController extends Controller
{
    /**
     * Export PPE list to Excel with date filters
     * GET /api/ppe/export
     * 
     * Query params:
     * - date_from: YYYY-MM-DD (filter purchase_date >=)
     * - date_to: YYYY-MM-DD (filter purchase_date <=)
     * - expiry_from: YYYY-MM-DD (filter expiry_date >=)
     * - expiry_to: YYYY-MM-DD (filter expiry_date <=)
     * - category_id: filter by category
     * - status: filter by status
     * - condition: filter by condition
     * - search: search by name/code
     */
    public function export(Request $request)
    {
        try {
            // Build query dengan filter
            $query = PPEItem::with(['category:id,name,code']);

            // Filter tanggal pembelian
            if ($request->filled('date_from')) {
                $query->whereDate('purchase_date', '>=', $request->date_from);
            }
            if ($request->filled('date_to')) {
                $query->whereDate('purchase_date', '<=', $request->date_to);
            }

            // Filter tanggal kadaluarsa
            if ($request->filled('expiry_from')) {
                $query->whereDate('expiry_date', '>=', $request->expiry_from);
            }
            if ($request->filled('expiry_to')) {
                $query->whereDate('expiry_date', '<=', $request->expiry_to);
            }

            // Filter created date
            if ($request->filled('created_from')) {
                $query->whereDate('created_at', '>=', $request->created_from);
            }
            if ($request->filled('created_to')) {
                $query->whereDate('created_at', '<=', $request->created_to);
            }

            // Filter lainnya
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
                        ->orWhere('serial_number', 'like', "%{$search}%")
                        ->orWhere('manufacturer', 'like', "%{$search}%");
                });
            }

            $items = $query->orderBy('name')->get();

            // Buat spreadsheet
            $spreadsheet = new Spreadsheet();

            // ========== SHEET 1: PPE DATA ==========
            $sheet = $spreadsheet->getActiveSheet();
            $sheet->setTitle('PPE List');

            // Title
            $sheet->mergeCells('A1:T1');
            $sheet->setCellValue('A1', 'PPE LIST REPORT');
            $sheet->getStyle('A1')->applyFromArray([
                'font' => ['bold' => true, 'size' => 16, 'color' => ['rgb' => '1976D2']],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            ]);

            // Filter info
            $row = 3;
            $filterInfo = [];
            if ($request->filled('date_from') || $request->filled('date_to')) {
                $filterInfo[] = 'Purchase Date: ' . ($request->date_from ?? 'All') . ' to ' . ($request->date_to ?? 'All');
            }
            if ($request->filled('expiry_from') || $request->filled('expiry_to')) {
                $filterInfo[] = 'Expiry Date: ' . ($request->expiry_from ?? 'All') . ' to ' . ($request->expiry_to ?? 'All');
            }
            if ($request->filled('category_id')) {
                $cat = PPECategory::find($request->category_id);
                $filterInfo[] = 'Category: ' . ($cat->name ?? 'N/A');
            }
            if ($request->filled('status')) {
                $filterInfo[] = 'Status: ' . $request->status;
            }
            if ($request->filled('condition')) {
                $filterInfo[] = 'Condition: ' . $request->condition;
            }

            if (!empty($filterInfo)) {
                $sheet->mergeCells('A3:T3');
                $sheet->setCellValue('A3', 'Filters: ' . implode(' | ', $filterInfo));
                $sheet->getStyle('A3')->getFont()->setItalic(true)->setSize(10);
                $row = 4;
            }

            // Export date
            $row += 1;
            $sheet->mergeCells('A' . $row . ':T' . $row);
            $sheet->setCellValue('A' . $row, 'Exported on: ' . now()->format('d M Y H:i:s') . ' | Total Items: ' . $items->count());
            $sheet->getStyle('A' . $row)->getFont()->setSize(9)->setColor(new \PhpOffice\PhpSpreadsheet\Style\Color('666666'));

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

            $col = 'A';
            foreach ($headers as $header) {
                $cell = $col . $row;
                $sheet->setCellValue($cell, $header);
                $sheet->getStyle($cell)->applyFromArray([
                    'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF'], 'size' => 10],
                    'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '1976D2']],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
                    'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]],
                ]);
                $col++;
            }
            $sheet->getRowDimension($row)->setRowHeight(25);

            // Data
            $row++;
            $no = 1;
            foreach ($items as $item) {
                $col = 'A';
                $data = [
                    $no++,
                    $item->name,
                    $item->code,
                    $item->category->name ?? '-',
                    $item->size,
                    $item->color,
                    $item->material,
                    $item->manufacturer,
                    $item->model,
                    $item->serial_number,
                    $item->location,
                    $item->price ? number_format($item->price, 0, ',', '.') : '-',
                    $item->purchase_date ? $item->purchase_date->format('d M Y') : '-',
                    $item->supplier,
                    $item->certification,
                    $item->certification_date ? $item->certification_date->format('d M Y') : '-',
                    $item->expiry_date ? $item->expiry_date->format('d M Y') : '-',
                    ucfirst($item->status),
                    ucfirst($item->condition),
                    $item->description,
                ];

                foreach ($data as $value) {
                    $cell = $col . $row;
                    $sheet->setCellValue($cell, $value);
                    $sheet->getStyle($cell)->applyFromArray([
                        'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]],
                        'alignment' => ['vertical' => Alignment::VERTICAL_CENTER],
                    ]);

                    // Warna untuk status
                    if ($col == 'R') { // Status column
                        $colors = [
                            'available' => 'C6EFCE',
                            'assigned' => 'BDD7EE',
                            'maintenance' => 'FFEB9C',
                            'write_off' => 'FFC7CE'
                        ];
                        $color = $colors[$item->status] ?? 'FFFFFF';
                        $sheet->getStyle($cell)->getFill()
                            ->setFillType(Fill::FILL_SOLID)
                            ->setStartColor(new \PhpOffice\PhpSpreadsheet\Style\Color($color));
                    }

                    // Warna untuk condition
                    if ($col == 'S') {
                        $colors = [
                            'good' => 'C6EFCE',
                            'fair' => 'FFEB9C',
                            'poor' => 'FFC7CE',
                            'damaged' => 'FFC7CE',
                            'expired' => 'D9D9D9'
                        ];
                        $color = $colors[$item->condition] ?? 'FFFFFF';
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
            $sheet->freezePane('A' . ($row - count($items) - 1));

            // ========== SHEET 2: SUMMARY ==========
            $sheet2 = $spreadsheet->createSheet();
            $sheet2->setTitle('Summary');

            // Summary stats
            $sheet2->setCellValue('A1', 'PPE SUMMARY REPORT');
            $sheet2->getStyle('A1')->applyFromArray([
                'font' => ['bold' => true, 'size' => 14, 'color' => ['rgb' => '1976D2']],
            ]);

            $summaryData = [
                ['', ''],
                ['Total PPE Items', $items->count()],
                ['', ''],
                ['By Status:', ''],
                ['Available', $items->where('status', 'available')->count()],
                ['Assigned', $items->where('status', 'assigned')->count()],
                ['Maintenance', $items->where('status', 'maintenance')->count()],
                ['Write-off', $items->where('status', 'write_off')->count()],
                ['', ''],
                ['By Condition:', ''],
                ['Good', $items->where('condition', 'good')->count()],
                ['Fair', $items->where('condition', 'fair')->count()],
                ['Poor', $items->where('condition', 'poor')->count()],
                ['Damaged', $items->where('condition', 'damaged')->count()],
                ['Expired', $items->where('condition', 'expired')->count()],
                ['', ''],
                ['By Category:', ''],
            ];

            // Category summary
            $categories = $items->groupBy('category_id');
            foreach ($categories as $catId => $catItems) {
                $catName = $catItems->first()->category->name ?? 'Unknown';
                $summaryData[] = [$catName, count($catItems)];
            }

            $r = 3;
            foreach ($summaryData as $data) {
                $sheet2->setCellValue('A' . $r, $data[0]);
                $sheet2->setCellValue('B' . $r, $data[1]);
                if (!empty($data[0]) && empty($data[1])) {
                    $sheet2->getStyle('A' . $r)->getFont()->setBold(true);
                }
                $r++;
            }

            $sheet2->getColumnDimension('A')->setWidth(30);
            $sheet2->getColumnDimension('B')->setWidth(15);

            // Set active sheet to first
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
