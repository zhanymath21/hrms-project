<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PPEItem;
use App\Models\PPECategory;
use App\Models\PPEHistory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\IOFactory;

class PPEImportController extends Controller
{
    /**
     * Download import template
     */
    public function downloadTemplate()
    {
        try {
            $spreadsheet = new Spreadsheet();
            $sheet = $spreadsheet->getActiveSheet();
            $sheet->setTitle('PPE Import Template');

            // Headers
            $headers = [
                'name',
                'code',
                'category_code',
                'size',
                'color',
                'material',
                'manufacturer',
                'model',
                'serial_number',
                'location',
                'price',
                'purchase_date',
                'supplier',
                'description',
                'certification',
                'certification_date',
                'expiry_date',
                'status',
                'condition'
            ];

            // Style header
            $headerStyle = [
                'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF'], 'size' => 11],
                'fill' => ['fillType' => 'solid', 'startColor' => ['rgb' => '1976D2']],
                'alignment' => ['horizontal' => 'center'],
            ];

            $col = 'A';
            foreach ($headers as $header) {
                $sheet->setCellValue($col . '1', $header);
                $sheet->getStyle($col . '1')->applyFromArray($headerStyle);
                $sheet->getColumnDimension($col)->setAutoSize(true);
                $col++;
            }

            // Example rows
            $examples = [
                ['Safety Helmet Pro', 'PPE-HELM-001', 'HEAD', 'L', 'White', 'ABS Plastic', '3M', 'X5000', 'SN123456', 'Building A - Floor 1', '150000', '2024-01-15', 'SafetyPro Inc.', 'Standard safety helmet', 'ANSI Z89.1', '2024-01-15', '2027-01-15', 'available', 'good'],
                ['Safety Goggles', 'PPE-GOGG-001', 'EYE', 'One Size', 'Clear', 'Polycarbonate', 'Honeywell', 'G200', 'SN789012', 'Building B', '85000', '2024-02-20', 'VisionSafe', 'Anti-fog goggles', 'ANSI Z87.1', '2024-02-20', '2026-02-20', 'available', 'good'],
            ];

            $row = 2;
            foreach ($examples as $example) {
                $col = 'A';
                foreach ($example as $value) {
                    $sheet->setCellValue($col . $row, $value);
                    $col++;
                }
                $row++;
            }

            // Output
            $writer = new Xlsx($spreadsheet);
            $fileName = 'PPE_Import_Template.xlsx';

            header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            header('Content-Disposition: attachment; filename="' . $fileName . '"');
            header('Cache-Control: max-age=0');

            $writer->save('php://output');
            exit;
        } catch (\Exception $e) {
            \Log::error('Template error: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Import PPE from Excel
     */
    public function import(Request $request): JsonResponse
    {
        $request->validate([
            'file' => 'required|file|mimes:xlsx,xls,csv|max:10240',
        ]);

        try {
            $file = $request->file('file');
            $spreadsheet = IOFactory::load($file->getPathname());
            $sheet = $spreadsheet->getActiveSheet();
            $rows = $sheet->toArray();

            // Remove header row
            $headers = array_shift($rows);

            $categories = PPECategory::pluck('id', 'code')->toArray();
            $successCount = 0;
            $failCount = 0;
            $errors = [];

            foreach ($rows as $index => $row) {
                // Skip empty rows
                if (empty($row[0]) || empty($row[1])) continue;

                try {
                    $categoryCode = strtoupper(trim($row[2] ?? ''));
                    $categoryId = $categories[$categoryCode] ?? null;

                    if (!$categoryId) {
                        $errors[] = "Row " . ($index + 2) . ": Category code '{$categoryCode}' not found";
                        $failCount++;
                        continue;
                    }

                    PPEItem::create([
                        'name' => trim($row[0] ?? ''),
                        'code' => strtoupper(trim($row[1] ?? '')),
                        'category_id' => $categoryId,
                        'size' => $row[3] ?? null,
                        'color' => $row[4] ?? null,
                        'material' => $row[5] ?? null,
                        'manufacturer' => $row[6] ?? null,
                        'model' => $row[7] ?? null,
                        'serial_number' => $row[8] ?? null,
                        'location' => $row[9] ?? null,
                        'price' => is_numeric($row[10] ?? '') ? (float) $row[10] : null,
                        'purchase_date' => $this->parseDate($row[11] ?? null),
                        'supplier' => $row[12] ?? null,
                        'description' => $row[13] ?? null,
                        'certification' => $row[14] ?? null,
                        'certification_date' => $this->parseDate($row[15] ?? null),
                        'expiry_date' => $this->parseDate($row[16] ?? null),
                        'status' => in_array($row[17] ?? '', ['available', 'assigned', 'maintenance', 'write_off']) ? $row[17] : 'available',
                        'condition' => in_array($row[18] ?? '', ['good', 'fair', 'poor', 'damaged', 'expired']) ? $row[18] : 'good',
                        'created_by' => auth()->id() ?? auth('employee')->id(),
                    ]);

                    $successCount++;
                } catch (\Exception $e) {
                    $errors[] = "Row " . ($index + 2) . ": " . $e->getMessage();
                    $failCount++;
                }
            }

            return response()->json([
                'status' => 'success',
                'message' => 'Import completed',
                'data' => [
                    'total_rows' => $successCount + $failCount,
                    'success_count' => $successCount,
                    'fail_count' => $failCount,
                    'errors' => $errors,
                ],
            ]);
        } catch (\Exception $e) {
            \Log::error('Import error: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Import failed: ' . $e->getMessage(),
            ], 500);
        }
    }

    private function parseDate($value): ?string
    {
        if (empty($value)) return null;
        try {
            if (is_numeric($value)) {
                return \PhpOffice\PhpSpreadsheet\Shared\Date::excelToDateTimeObject($value)->format('Y-m-d');
            }
            return date('Y-m-d', strtotime($value));
        } catch (\Exception $e) {
            return null;
        }
    }
}
