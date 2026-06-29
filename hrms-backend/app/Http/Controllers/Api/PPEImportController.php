<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Imports\PPEImport;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Maatwebsite\Excel\Facades\Excel;
use Illuminate\Support\Facades\Storage;

class PPEImportController extends Controller
{
    /**
     * Download import template
     * GET /api/ppe/import/template
     */
    public function downloadTemplate(): mixed
    {
        $templatePath = storage_path('app/public/templates/ppe_import_template.xlsx');

        // Generate template if not exists
        if (!file_exists($templatePath)) {
            $this->generateTemplate($templatePath);
        }

        return response()->download($templatePath, 'PPE_Import_Template.xlsx');
    }

    /**
     * Import PPE from Excel
     * POST /api/ppe/import
     */
    public function import(Request $request): JsonResponse
    {
        $request->validate([
            'file' => 'required|file|mimes:xlsx,xls,csv|max:10240',
        ]);

        $file = $request->file('file');

        // Get authenticated user info
        $importedBy = auth()->id() ?? auth('employee')->id();
        $importedByName = auth()->user()->first_name . ' ' . auth()->user()->last_name;

        try {
            $import = new PPEImport($importedBy, $importedByName);
            Excel::import($import, $file);

            $results = $import->getResults();

            return response()->json([
                'status' => 'success',
                'message' => 'Import completed',
                'data' => [
                    'total_rows' => $results['success_count'] + $results['fail_count'],
                    'success_count' => $results['success_count'],
                    'fail_count' => $results['fail_count'],
                    'errors' => $results['errors'],
                ],
            ]);
        } catch (\Maatwebsite\Excel\Validators\ValidationException $e) {
            $failures = $e->failures();
            $errors = [];
            foreach ($failures as $failure) {
                $errors[] = "Row {$failure->row()}: " . implode(', ', $failure->errors());
            }

            return response()->json([
                'status' => 'error',
                'message' => 'Validation failed',
                'errors' => $errors,
            ], 422);
        } catch (\Exception $e) {
            \Log::error('PPE Import error: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Import failed: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Generate Excel template
     */
    private function generateTemplate(string $path): void
    {
        $spreadsheet = new \PhpOffice\PhpSpreadsheet\Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();

        // Set title
        $sheet->setTitle('PPE Import Template');

        // Header styling
        $headerStyle = [
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF'], 'size' => 11],
            'fill' => ['fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID, 'startColor' => ['rgb' => '1976D2']],
            'alignment' => ['horizontal' => \PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER],
            'borders' => ['allBorders' => ['borderStyle' => \PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN]],
        ];

        // Required columns (must match import mapping)
        $headers = [
            'name',              // Required - Item name
            'code',              // Required - Unique code
            'category_code',     // Required - PPE category code (HEAD, EYE, EAR, RESP, HAND, FOOT, BODY, FALL, HIVIS)
            'size',              // Optional - Size
            'color',             // Optional - Color
            'material',          // Optional - Material
            'manufacturer',      // Optional - Manufacturer
            'model',             // Optional - Model number
            'serial_number',     // Optional - Serial number
            'location',          // Optional - Storage location
            'price',             // Optional - Purchase price
            'purchase_date',     // Optional - YYYY-MM-DD
            'supplier',          // Optional - Supplier name
            'description',       // Optional - Description
            'certification',     // Optional - Certification standard
            'certification_date', // Optional - YYYY-MM-DD
            'expiry_date',       // Optional - Expiry date YYYY-MM-DD
            'status',            // Optional - available, assigned, maintenance, write_off (default: available)
            'condition',         // Optional - good, fair, poor, damaged, expired (default: good)
        ];

        // Write headers
        $col = 'A';
        foreach ($headers as $i => $header) {
            $sheet->setCellValue($col . '1', $header);
            $sheet->getStyle($col . '1')->applyFromArray($headerStyle);
            $col++;
        }

        // Auto-size columns
        foreach (range('A', $col) as $column) {
            $sheet->getColumnDimension($column)->setAutoSize(true);
        }

        // Add example rows
        $examples = [
            ['Safety Helmet Pro', 'PPE-HELM-001', 'HEAD', 'L', 'White', 'ABS Plastic', '3M', 'X5000', 'SN123456', 'Building A - Floor 1', '150000', '2024-01-15', 'SafetyPro Inc.', 'Standard safety helmet with chin strap', 'ANSI Z89.1', '2024-01-15', '2027-01-15', 'available', 'good'],
            ['Safety Goggles Clear', 'PPE-GOGG-001', 'EYE', 'One Size', 'Clear', 'Polycarbonate', 'Honeywell', 'G200', 'SN789012', 'Building B - Floor 2', '85000', '2024-02-20', 'VisionSafe Ltd.', 'Anti-fog safety goggles', 'ANSI Z87.1', '2024-02-20', '2026-02-20', 'available', 'good'],
            ['Ear Plugs Disposable', 'PPE-EAR-001', 'EAR', 'One Size', 'Orange', 'Foam', 'Howard Leight', 'MAX-1', 'SN345678', 'Warehouse - Shelf R3', '5000', '2024-03-10', 'HearingPro Inc.', 'Disposable foam ear plugs NRR 33dB', '', '', '', 'available', 'good'],
            ['N95 Respirator Mask', 'PPE-RESP-001', 'RESP', 'One Size', 'White', 'Non-woven', '3M', '8210', 'SN901234', 'Medical Room', '25000', '2024-04-05', 'MedSupply Co.', 'N95 particulate respirator', 'NIOSH N95', '2024-04-05', '2026-04-05', 'available', 'good'],
            ['Safety Gloves Nitrile', 'PPE-GLV-001', 'HAND', 'M', 'Blue', 'Nitrile', 'Ansell', 'G80', 'SN567890', 'Production Area', '45000', '2024-05-12', 'GloveWorld', 'Chemical resistant nitrile gloves', '', '', '', 'available', 'good'],
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

        // Add instructions sheet
        $sheet2 = $spreadsheet->createSheet();
        $sheet2->setTitle('Instructions');

        $instructions = [
            ['PPE IMPORT INSTRUCTIONS', '', ''],
            ['', '', ''],
            ['Column', 'Required', 'Description / Valid Values'],
            ['name', 'YES', 'Item name (max 255 characters)'],
            ['code', 'YES', 'Unique item code (max 50 characters)'],
            ['category_code', 'YES', 'Category code: HEAD, EYE, EAR, RESP, HAND, FOOT, BODY, FALL, HIVIS'],
            ['size', 'NO', 'Size (e.g., S, M, L, XL, One Size)'],
            ['color', 'NO', 'Color of the item'],
            ['material', 'NO', 'Material composition'],
            ['manufacturer', 'NO', 'Manufacturer name'],
            ['model', 'NO', 'Model number/name'],
            ['serial_number', 'NO', 'Unique serial number'],
            ['location', 'NO', 'Storage location (e.g., Building A - Floor 1)'],
            ['price', 'NO', 'Purchase price (number only)'],
            ['purchase_date', 'NO', 'Date format: YYYY-MM-DD (e.g., 2024-01-15)'],
            ['supplier', 'NO', 'Supplier name'],
            ['description', 'NO', 'Item description'],
            ['certification', 'NO', 'Certification standard (e.g., ANSI Z89.1)'],
            ['certification_date', 'NO', 'Date format: YYYY-MM-DD'],
            ['expiry_date', 'NO', 'Date format: YYYY-MM-DD'],
            ['status', 'NO', 'available, assigned, maintenance, write_off (default: available)'],
            ['condition', 'NO', 'good, fair, poor, damaged, expired (default: good)'],
            ['', '', ''],
            ['NOTES:', '', ''],
            ['', '1.', 'Do NOT change the header row (Row 1)'],
            ['', '2.', 'Remove example rows before importing your data'],
            ['', '3.', 'category_code must match existing PPE categories'],
            ['', '4.', 'Dates must be in YYYY-MM-DD format'],
            ['', '5.', 'Save file as .xlsx format'],
        ];

        $row = 1;
        foreach ($instructions as $instruction) {
            $sheet2->setCellValue('A' . $row, $instruction[0]);
            $sheet2->setCellValue('B' . $row, $instruction[1]);
            $sheet2->setCellValue('C' . $row, $instruction[2]);
            if ($row === 1) {
                $sheet2->getStyle('A1')->setFont(['bold' => true, 'size' => 14]);
            }
            $row++;
        }

        $sheet2->getColumnDimension('A')->setWidth(20);
        $sheet2->getColumnDimension('B')->setWidth(15);
        $sheet2->getColumnDimension('C')->setWidth(70);

        // Set first sheet as active
        $spreadsheet->setActiveSheetIndex(0);

        // Save file
        $dir = dirname($path);
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        $writer = new \PhpOffice\PhpSpreadsheet\Writer\Xlsx($spreadsheet);
        $writer->save($path);
    }
}
