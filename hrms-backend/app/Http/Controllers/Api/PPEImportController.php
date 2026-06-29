<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PPEItem;
use App\Models\PPECategory;
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
            // Buat spreadsheet baru
            $spreadsheet = new Spreadsheet();
            $sheet = $spreadsheet->getActiveSheet();
            $sheet->setTitle('PPE Import');

            // Header kolom
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

            // Style untuk header
            $headerStyle = [
                'font' => [
                    'bold' => true,
                    'color' => ['rgb' => 'FFFFFF'],
                    'size' => 11,
                ],
                'fill' => [
                    'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                    'startColor' => ['rgb' => '1976D2'],
                ],
                'alignment' => [
                    'horizontal' => \PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER,
                    'vertical' => \PhpOffice\PhpSpreadsheet\Style\Alignment::VERTICAL_CENTER,
                ],
                'borders' => [
                    'allBorders' => [
                        'borderStyle' => \PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN,
                    ],
                ],
            ];

            // Tulis header
            $col = 'A';
            foreach ($headers as $header) {
                $cell = $col . '1';
                $sheet->setCellValue($cell, $header);
                $sheet->getStyle($cell)->applyFromArray($headerStyle);
                $sheet->getColumnDimension($col)->setAutoSize(true);
                $col++;
            }

            // Tinggi baris header
            $sheet->getRowDimension(1)->setRowHeight(25);

            // Freeze header row
            $sheet->freezePane('A2');

            // Data contoh
            $examples = [
                ['Safety Helmet Pro', 'PPE-HELM-001', 'HEAD', 'L', 'White', 'ABS Plastic', '3M', 'X5000', 'SN123456', 'Building A - Floor 1 - Cabinet 2', '150000', '2024-01-15', 'SafetyPro Inc.', 'Standard safety helmet with chin strap, suitable for construction', 'ANSI Z89.1', '2024-01-15', '2027-01-15', 'available', 'good'],
                ['Safety Goggles Clear', 'PPE-GOGG-001', 'EYE', 'One Size', 'Clear', 'Polycarbonate', 'Honeywell', 'G200', 'SN789012', 'Building B - Floor 2 - Lab', '85000', '2024-02-20', 'VisionSafe Ltd.', 'Anti-fog safety goggles for laboratory use', 'ANSI Z87.1', '2024-02-20', '2026-02-20', 'available', 'good'],
                ['Ear Plugs Disposable', 'PPE-EAR-001', 'EAR', 'One Size', 'Orange', 'Foam', 'Howard Leight', 'MAX-1', 'SN345678', 'Warehouse - Shelf R3', '5000', '2024-03-10', 'HearingPro Inc.', 'Disposable foam ear plugs NRR 33dB', '', '', '', 'available', 'good'],
                ['N95 Respirator Mask', 'PPE-RESP-001', 'RESP', 'One Size', 'White', 'Non-woven Fabric', '3M', '8210', 'SN901234', 'Medical Room - Cabinet A', '25000', '2024-04-05', 'MedSupply Co.', 'N95 particulate respirator mask for medical use', 'NIOSH N95', '2024-04-05', '2026-04-05', 'available', 'good'],
                ['Safety Gloves Nitrile', 'PPE-GLV-001', 'HAND', 'M', 'Blue', 'Nitrile', 'Ansell', 'G80', 'SN567890', 'Production Area - Station 3', '45000', '2024-05-12', 'GloveWorld Inc.', 'Chemical resistant nitrile gloves, powder-free', '', '', '', 'available', 'good'],
            ];

            // Tulis data contoh
            $row = 2;
            foreach ($examples as $example) {
                $col = 'A';
                foreach ($example as $value) {
                    $sheet->setCellValue($col . $row, $value);
                    $sheet->getStyle($col . $row)->getAlignment()->setVertical('center');
                    $col++;
                }
                $sheet->getRowDimension($row)->setRowHeight(20);
                $row++;
            }

            // Buat sheet instruksi
            $sheet2 = $spreadsheet->createSheet();
            $sheet2->setTitle('Instructions');

            $instructions = [
                ['PPE IMPORT INSTRUCTIONS', '', '', ''],
                ['', '', '', ''],
                ['COLUMN', 'REQUIRED', 'DESCRIPTION', 'VALID VALUES'],
                ['name', 'YES', 'Item name (max 255 characters)', 'Text'],
                ['code', 'YES', 'Unique item code (max 50 characters)', 'Text, no spaces recommended'],
                ['category_code', 'YES', 'PPE category code', 'HEAD, EYE, EAR, RESP, HAND, FOOT, BODY, FALL, HIVIS'],
                ['size', 'NO', 'Size of the item', 'S, M, L, XL, One Size, etc.'],
                ['color', 'NO', 'Color of the item', 'Text'],
                ['material', 'NO', 'Material composition', 'Text'],
                ['manufacturer', 'NO', 'Manufacturer name', 'Text'],
                ['model', 'NO', 'Model number/name', 'Text'],
                ['serial_number', 'NO', 'Unique serial number', 'Text'],
                ['location', 'NO', 'Storage location', 'e.g. Building A - Floor 1 - Cabinet 3'],
                ['price', 'NO', 'Purchase price (number only)', 'Number, e.g. 150000'],
                ['purchase_date', 'NO', 'Purchase date', 'YYYY-MM-DD, e.g. 2024-01-15'],
                ['supplier', 'NO', 'Supplier name', 'Text'],
                ['description', 'NO', 'Item description', 'Text'],
                ['certification', 'NO', 'Certification standard', 'e.g. ANSI Z89.1, NIOSH N95'],
                ['certification_date', 'NO', 'Certification date', 'YYYY-MM-DD'],
                ['expiry_date', 'NO', 'Expiry date', 'YYYY-MM-DD'],
                ['status', 'NO', 'Item status (default: available)', 'available, assigned, maintenance, write_off'],
                ['condition', 'NO', 'Item condition (default: good)', 'good, fair, poor, damaged, expired'],
                ['', '', '', ''],
                ['IMPORTANT NOTES:', '', '', ''],
                ['1.', 'Do NOT modify the header row (Row 1) in the PPE Import sheet', '', ''],
                ['2.', 'Delete example rows (Row 2-6) before importing your data', '', ''],
                ['3.', 'category_code MUST match one of the valid codes listed above', '', ''],
                ['4.', 'Dates must be in YYYY-MM-DD format (e.g. 2024-01-15)', '', ''],
                ['5.', 'Save the file as .xlsx format before importing', '', ''],
                ['6.', 'Empty optional columns will be ignored', '', ''],
            ];

            // Style untuk judul
            $sheet2->getStyle('A1')->getFont()->setBold(true)->setSize(16)->setColor(new \PhpOffice\PhpSpreadsheet\Style\Color('1976D2'));
            $sheet2->mergeCells('A1:D1');

            // Style untuk header instruksi
            $headerRowStyle = [
                'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
                'fill' => ['fillType' => 'solid', 'startColor' => ['rgb' => '1976D2']],
            ];
            $sheet2->getStyle('A3:D3')->applyFromArray($headerRowStyle);

            // Tulis instruksi
            $row = 1;
            foreach ($instructions as $line) {
                $sheet2->setCellValue('A' . $row, $line[0]);
                $sheet2->setCellValue('B' . $row, $line[1]);
                $sheet2->setCellValue('C' . $row, $line[2]);
                $sheet2->setCellValue('D' . $row, $line[3]);
                $row++;
            }

            // Lebar kolom
            $sheet2->getColumnDimension('A')->setWidth(20);
            $sheet2->getColumnDimension('B')->setWidth(15);
            $sheet2->getColumnDimension('C')->setWidth(55);
            $sheet2->getColumnDimension('D')->setWidth(30);

            // Highlight required columns
            $sheet2->getStyle('A4:A6')->getFont()->setBold(true)->setColor(new \PhpOffice\PhpSpreadsheet\Style\Color('FF0000'));
            $sheet2->getStyle('B4:B6')->getFont()->setBold(true)->setColor(new \PhpOffice\PhpSpreadsheet\Style\Color('FF0000'));

            // Kembali ke sheet pertama
            $spreadsheet->setActiveSheetIndex(0);

            // Simpan ke temporary file
            $tempDir = storage_path('app/temp');
            if (!is_dir($tempDir)) {
                mkdir($tempDir, 0755, true);
            }

            $fileName = 'PPE_Import_Template.xlsx';
            $filePath = $tempDir . '/' . $fileName;

            $writer = new Xlsx($spreadsheet);
            $writer->save($filePath);

            // Return file download dengan CORS headers
            return response()->download($filePath, $fileName, [
                'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Access-Control-Allow-Origin' => '*',
                'Access-Control-Expose-Headers' => 'Content-Disposition',
            ])->deleteFileAfterSend(true);
        } catch (\Exception $e) {
            \Log::error('Template download error: ' . $e->getMessage());
            \Log::error($e->getTraceAsString());

            return response()->json([
                'status' => 'error',
                'message' => 'Failed to generate template: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Import PPE from Excel file
     */
    public function import(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:xlsx,xls,csv|max:10240',
        ]);

        try {
            $file = $request->file('file');
            $spreadsheet = IOFactory::load($file->getPathname());
            $sheet = $spreadsheet->getActiveSheet();
            $rows = $sheet->toArray();

            if (count($rows) < 2) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'File is empty or has no data rows',
                ], 422);
            }

            // Remove header row
            $headers = array_shift($rows);

            $categories = PPECategory::pluck('id', 'code')->toArray();
            $employeeId = auth()->id() ?? auth('employee')->id();
            $successCount = 0;
            $failCount = 0;
            $errors = [];

            foreach ($rows as $index => $row) {
                // Skip completely empty rows
                $rowValues = array_filter($row, function ($val) {
                    return !is_null($val) && $val !== '';
                });
                if (empty($rowValues)) continue;

                // Skip if name or code is empty
                if (empty($row[0]) || empty($row[1])) continue;

                $rowNumber = $index + 2; // Excel row number (1-indexed + header)

                try {
                    // Validate category
                    $categoryCode = strtoupper(trim($row[2] ?? ''));
                    $categoryId = $categories[$categoryCode] ?? null;

                    if (!$categoryId) {
                        $errors[] = "Row {$rowNumber}: Category code '{$categoryCode}' not found. Valid codes: " . implode(', ', array_keys($categories));
                        $failCount++;
                        continue;
                    }

                    // Validate code uniqueness
                    $code = strtoupper(trim($row[1]));
                    if (PPEItem::where('code', $code)->exists()) {
                        $errors[] = "Row {$rowNumber}: Code '{$code}' already exists in database";
                        $failCount++;
                        continue;
                    }

                    // Validate serial number uniqueness if provided
                    if (!empty($row[8])) {
                        $serialNumber = trim($row[8]);
                        if (PPEItem::where('serial_number', $serialNumber)->exists()) {
                            $errors[] = "Row {$rowNumber}: Serial number '{$serialNumber}' already exists";
                            $failCount++;
                            continue;
                        }
                    }

                    // Validate status
                    $status = $row[17] ?? 'available';
                    if (!empty($status) && !in_array($status, ['available', 'assigned', 'maintenance', 'write_off'])) {
                        $errors[] = "Row {$rowNumber}: Invalid status '{$status}'. Using default 'available'";
                        $status = 'available';
                    }

                    // Validate condition
                    $condition = $row[18] ?? 'good';
                    if (!empty($condition) && !in_array($condition, ['good', 'fair', 'poor', 'damaged', 'expired'])) {
                        $errors[] = "Row {$rowNumber}: Invalid condition '{$condition}'. Using default 'good'";
                        $condition = 'good';
                    }

                    // Create PPE item
                    PPEItem::create([
                        'name' => trim($row[0]),
                        'code' => $code,
                        'category_id' => $categoryId,
                        'size' => !empty($row[3]) ? trim($row[3]) : null,
                        'color' => !empty($row[4]) ? trim($row[4]) : null,
                        'material' => !empty($row[5]) ? trim($row[5]) : null,
                        'manufacturer' => !empty($row[6]) ? trim($row[6]) : null,
                        'model' => !empty($row[7]) ? trim($row[7]) : null,
                        'serial_number' => !empty($row[8]) ? trim($row[8]) : null,
                        'location' => !empty($row[9]) ? trim($row[9]) : null,
                        'price' => !empty($row[10]) && is_numeric($row[10]) ? (float) $row[10] : null,
                        'purchase_date' => $this->parseDate($row[11] ?? null),
                        'supplier' => !empty($row[12]) ? trim($row[12]) : null,
                        'description' => !empty($row[13]) ? trim($row[13]) : null,
                        'certification' => !empty($row[14]) ? trim($row[14]) : null,
                        'certification_date' => $this->parseDate($row[15] ?? null),
                        'expiry_date' => $this->parseDate($row[16] ?? null),
                        'status' => $status,
                        'condition' => $condition,
                        'created_by' => $employeeId,
                    ]);

                    $successCount++;
                } catch (\Exception $e) {
                    \Log::error("Import row {$rowNumber} error: " . $e->getMessage());
                    $errors[] = "Row {$rowNumber}: " . $e->getMessage();
                    $failCount++;
                }
            }

            $totalRows = $successCount + $failCount;

            return response()->json([
                'status' => 'success',
                'message' => "Import completed! Success: {$successCount}, Failed: {$failCount}",
                'data' => [
                    'total_rows' => $totalRows,
                    'success_count' => $successCount,
                    'fail_count' => $failCount,
                    'errors' => $errors,
                ],
            ]);
        } catch (\Exception $e) {
            \Log::error('Import error: ' . $e->getMessage());
            \Log::error($e->getTraceAsString());

            return response()->json([
                'status' => 'error',
                'message' => 'Import failed: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Parse date from Excel or string format
     */
    private function parseDate($value): ?string
    {
        if (empty($value)) return null;

        try {
            // If numeric, it's an Excel date serial number
            if (is_numeric($value)) {
                $date = \PhpOffice\PhpSpreadsheet\Shared\Date::excelToDateTimeObject($value);
                return $date->format('Y-m-d');
            }

            // Try string date
            $timestamp = strtotime($value);
            if ($timestamp === false) return null;

            return date('Y-m-d', $timestamp);
        } catch (\Exception $e) {
            return null;
        }
    }
}
